import {
  Input,
  ALL_FORMATS,
  BlobSource,
  CanvasSink,
  WrappedCanvas,
} from "mediabunny";

interface VideoSinkData {
  input: Input;
  sink: CanvasSink;
  // 缓存最近获取的帧，避免重复请求相同时间点
  cachedFrame: WrappedCanvas | null;
  cachedTime: number;
}

export class VideoCache {
  private sinks = new Map<string, VideoSinkData>();
  private initPromises = new Map<string, Promise<void>>();
  // 防止并发请求导致的问题
  private pendingRequests = new Map<string, Promise<WrappedCanvas | null>>();

  async getFrameAt(
    mediaId: string,
    file: File,
    time: number
  ): Promise<WrappedCanvas | null> {
    await this.ensureSink(mediaId, file);

    const sinkData = this.sinks.get(mediaId);
    if (!sinkData) return null;

    // 如果缓存的帧仍然有效，直接返回
    if (
      sinkData.cachedFrame &&
      this.isFrameValid(sinkData.cachedFrame, time)
    ) {
      return sinkData.cachedFrame;
    }

    // 创建请求 key，用于防止并发重复请求
    const requestKey = `${mediaId}-${Math.floor(time * 30)}`; // 按30fps量化时间

    // 如果已有相同请求在进行中，等待它完成
    const pendingRequest = this.pendingRequests.get(requestKey);
    if (pendingRequest) {
      return pendingRequest;
    }

    // 创建新请求
    const request = this.fetchFrame(sinkData, time, requestKey);
    this.pendingRequests.set(requestKey, request);

    try {
      return await request;
    } finally {
      this.pendingRequests.delete(requestKey);
    }
  }

  private async fetchFrame(
    sinkData: VideoSinkData,
    time: number,
    _requestKey: string
  ): Promise<WrappedCanvas | null> {
    try {
      // 使用 getCanvas 直接获取指定时间的帧
      // 这比使用迭代器更简单、更可靠
      const frame = await sinkData.sink.getCanvas(time);

      if (frame) {
        sinkData.cachedFrame = frame;
        sinkData.cachedTime = time;
        return frame;
      }
    } catch (error) {
      console.warn("Failed to get video frame:", error);
    }

    return null;
  }

  private isFrameValid(frame: WrappedCanvas, time: number): boolean {
    // 检查请求的时间是否在帧的有效范围内
    return time >= frame.timestamp && time < frame.timestamp + frame.duration;
  }

  private async ensureSink(mediaId: string, file: File): Promise<void> {
    if (this.sinks.has(mediaId)) return;

    if (this.initPromises.has(mediaId)) {
      await this.initPromises.get(mediaId);
      return;
    }

    const initPromise = this.initializeSink(mediaId, file);
    this.initPromises.set(mediaId, initPromise);

    try {
      await initPromise;
    } finally {
      this.initPromises.delete(mediaId);
    }
  }

  private async initializeSink(mediaId: string, file: File): Promise<void> {
    try {
      const input = new Input({
        source: new BlobSource(file),
        formats: ALL_FORMATS,
      });

      const videoTrack = await input.getPrimaryVideoTrack();
      if (!videoTrack) {
        input.dispose();
        throw new Error("No video track found");
      }

      const canDecode = await videoTrack.canDecode();
      if (!canDecode) {
        input.dispose();
        throw new Error("Video codec not supported for decoding");
      }

      // 使用更大的 pool 来提高性能
      const sink = new CanvasSink(videoTrack, {
        poolSize: 5,
        fit: "contain",
      });

      this.sinks.set(mediaId, {
        input,
        sink,
        cachedFrame: null,
        cachedTime: -1,
      });
    } catch (error) {
      console.error(`Failed to initialize video sink for ${mediaId}:`, error);
      throw error;
    }
  }

  async clearVideo(mediaId: string): Promise<void> {
    const sinkData = this.sinks.get(mediaId);
    if (sinkData) {
      // Dispose the input to release all internal resources
      try {
        sinkData.input.dispose();
      } catch {
        // Ignore errors during cleanup
      }

      this.sinks.delete(mediaId);
    }

    this.initPromises.delete(mediaId);

    // 清理所有相关的 pending requests
    for (const key of this.pendingRequests.keys()) {
      if (key.startsWith(`${mediaId}-`)) {
        this.pendingRequests.delete(key);
      }
    }
  }

  async clearAll(): Promise<void> {
    // 先清理所有 pending requests
    this.pendingRequests.clear();

    const clearPromises = Array.from(this.sinks.keys()).map((mediaId) =>
      this.clearVideo(mediaId)
    );
    await Promise.all(clearPromises);
  }

  getStats() {
    return {
      totalSinks: this.sinks.size,
      pendingRequests: this.pendingRequests.size,
      cachedFrames: Array.from(this.sinks.values()).filter(
        (s) => s.cachedFrame
      ).length,
    };
  }
}

export const videoCache = new VideoCache();
