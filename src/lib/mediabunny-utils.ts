import { FFmpeg } from "@ffmpeg/ffmpeg";
import { useTimelineStore } from "@/stores/timeline-store";
import { useMediaStore } from "@/stores/media-store";
import { Input, ALL_FORMATS, BlobSource, VideoSampleSink } from "mediabunny";

let ffmpeg: FFmpeg | null = null;

export const initFFmpeg = async (): Promise<FFmpeg> => {
  if (ffmpeg) return ffmpeg;

  ffmpeg = new FFmpeg();
  await ffmpeg.load(); // Use default config

  return ffmpeg;
};

export async function generateThumbnail({
  videoFile,
  timeInSeconds,
}: {
  videoFile: File;
  timeInSeconds: number;
}): Promise<string> {
  const input = new Input({
    source: new BlobSource(videoFile),
    formats: ALL_FORMATS,
  });

  try {
    const videoTrack = await input.getPrimaryVideoTrack();
    if (!videoTrack) {
      throw new Error("No video track found in the file");
    }

    // Check if we can decode this video
    const canDecode = await videoTrack.canDecode();
    if (!canDecode) {
      throw new Error("Video codec not supported for decoding");
    }

    const sink = new VideoSampleSink(videoTrack);

    const frame = await sink.getSample(timeInSeconds);

    if (!frame) {
      throw new Error("Could not get frame at specified time");
    }

    const canvas = document.createElement("canvas");
    canvas.width = 320;
    canvas.height = 240;
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      frame.close(); // Close frame before throwing
      throw new Error("Could not get canvas context");
    }

    try {
      frame.draw(ctx, 0, 0, 320, 240);
    } finally {
      // Always close the frame to release VideoFrame resources
      frame.close();
    }

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(URL.createObjectURL(blob));
          } else {
            reject(new Error("Failed to create thumbnail blob"));
          }
        },
        "image/jpeg",
        0.8
      );
    });
  } finally {
    // Always dispose the input to release internal resources
    input.dispose();
  }
}

export async function getVideoInfo({
  videoFile,
}: {
  videoFile: File;
}): Promise<{
  duration: number;
  width: number;
  height: number;
  fps: number;
}> {
  const input = new Input({
    source: new BlobSource(videoFile),
    formats: ALL_FORMATS,
  });

  try {
    const duration = await input.computeDuration();
    const videoTrack = await input.getPrimaryVideoTrack();

    if (!videoTrack) {
      throw new Error("No video track found in the file");
    }

    // Get frame rate from packet statistics
    const packetStats = await videoTrack.computePacketStats(100);
    const fps = packetStats.averagePacketRate;

    return {
      duration,
      width: videoTrack.displayWidth,
      height: videoTrack.displayHeight,
      fps,
    };
  } finally {
    // Always dispose the input to release internal resources
    input.dispose();
  }
}

// Audio mixing for timeline - keeping FFmpeg for now due to complexity
// TODO: Replace with Mediabunny audio processing when implementing canvas preview
export const extractTimelineAudio = async (
  onProgress?: (progress: number) => void
): Promise<Blob> => {
  // Create fresh FFmpeg instance for this operation
  const ffmpeg = new FFmpeg();

  try {
    await ffmpeg.load();
  } catch (error) {
    console.error("Failed to load fresh FFmpeg instance:", error);
    throw new Error("无法初始化音频处理，请重试。");
  }

  const timeline = useTimelineStore.getState();
  const mediaStore = useMediaStore.getState();

  const tracks = timeline.tracks;
  const totalDuration = timeline.getTotalDuration();

  if (totalDuration === 0) {
    throw new Error("时间轴为空，没有可提取的音频。");
  }

  if (onProgress) {
    ffmpeg.on("progress", ({ progress }) => {
      onProgress(progress * 100);
    });
  }

  const audioElements: Array<{
    file: File;
    startTime: number;
    duration: number;
    trimStart: number;
    trimEnd: number;
    trackMuted: boolean;
  }> = [];

  for (const track of tracks) {
    if (track.muted) continue;

    for (const element of track.elements) {
      if (element.type === "media") {
        const mediaFile = mediaStore.mediaFiles.find(
          (m) => m.id === element.mediaId
        );
        if (!mediaFile) continue;

        if (mediaFile.type === "video" || mediaFile.type === "audio") {
          audioElements.push({
            file: mediaFile.file,
            startTime: element.startTime,
            duration: element.duration,
            trimStart: element.trimStart,
            trimEnd: element.trimEnd,
            trackMuted: track.muted || false,
          });
        }
      }
    }
  }

  if (audioElements.length === 0) {
    throw new Error("时间轴中没有包含音频的媒体文件。");
  }

  console.log(`Extracting audio from ${audioElements.length} element(s)`);

  const inputFiles: string[] = [];

  try {
    // Write all input files
    for (let i = 0; i < audioElements.length; i++) {
      const element = audioElements[i];
      const ext = element.file.name.split(".").pop() || "mp4";
      const inputName = `input_${i}.${ext}`;
      inputFiles.push(inputName);

      console.log(`Writing file: ${inputName} (${element.file.size} bytes)`);

      const arrayBuffer = await element.file.arrayBuffer();
      await ffmpeg.writeFile(inputName, new Uint8Array(arrayBuffer));
    }

    const outputName = "timeline_audio.wav";

    // For a single element, use simpler extraction
    if (audioElements.length === 1) {
      const element = audioElements[0];
      const actualStart = element.trimStart;
      const actualDuration = element.duration - element.trimStart - element.trimEnd;

      // Use 16kHz sample rate for Whisper compatibility
      const ffmpegArgs = [
        "-i", inputFiles[0],
        "-vn", // Ignore video
        "-ss", actualStart.toString(),
        "-t", actualDuration.toString(),
        "-acodec", "pcm_s16le",
        "-ar", "16000", // 16kHz for Whisper
        "-ac", "1", // Mono for Whisper
        outputName,
      ];

      console.log("FFmpeg args (single):", ffmpegArgs.join(" "));

      try {
        await ffmpeg.exec(ffmpegArgs);
      } catch (error) {
        console.error("FFmpeg execution failed:", error);
        throw new Error("音频提取失败。视频文件可能没有音轨或格式不支持。");
      }
    } else {
      // For multiple elements, use filter_complex
      const filterInputs: string[] = [];

      for (let i = 0; i < audioElements.length; i++) {
        const element = audioElements[i];
        const actualStart = element.trimStart;
        const actualDuration = element.duration - element.trimStart - element.trimEnd;
        const delayMs = Math.round(element.startTime * 1000);

        filterInputs.push(
          `[${i}:a]atrim=start=${actualStart}:duration=${actualDuration},asetpts=PTS-STARTPTS,adelay=${delayMs}|${delayMs}[a${i}]`
        );
      }

      const mixInputs = audioElements.map((_, i) => `[a${i}]`).join("");
      // Use 16kHz mono for Whisper compatibility
      const mixFilter = `${mixInputs}amix=inputs=${audioElements.length}:duration=longest:dropout_transition=2,aresample=16000,aformat=sample_fmts=s16:channel_layouts=mono[out]`;

      const complexFilter = [...filterInputs, mixFilter].join(";");

      const ffmpegArgs = [
        ...inputFiles.flatMap((name) => ["-i", name]),
        "-filter_complex", complexFilter,
        "-map", "[out]",
        "-t", totalDuration.toString(),
        "-c:a", "pcm_s16le",
        "-ar", "16000", // 16kHz for Whisper
        outputName,
      ];

      console.log("FFmpeg args (multi):", ffmpegArgs.join(" "));

      try {
        await ffmpeg.exec(ffmpegArgs);
      } catch (error) {
        console.error("FFmpeg execution failed:", error);
        throw new Error("音频混合失败。某些文件可能没有音轨或格式不支持。");
      }
    }

    // Read the output file
    let data: Uint8Array;
    try {
      data = await ffmpeg.readFile(outputName) as Uint8Array;
      console.log(`Audio extracted successfully: ${data.length} bytes`);
    } catch (readError) {
      console.error("Failed to read FFmpeg output:", readError);
      throw new Error("无法读取提取的音频文件。");
    }

    if (data.length < 100) {
      throw new Error("提取的音频文件太小，可能提取失败。");
    }

    const blob = new Blob([new Uint8Array(data)], { type: "audio/wav" });
    return blob;

  } finally {
    // Cleanup
    for (const inputFile of inputFiles) {
      try {
        await ffmpeg.deleteFile(inputFile);
      } catch {}
    }
    try {
      await ffmpeg.deleteFile("timeline_audio.wav");
    } catch {}
  }
};

const generateSilentAudio = async (durationSeconds: number): Promise<Blob> => {
  const ffmpeg = await initFFmpeg();
  const outputName = "silent.wav";

  try {
    await ffmpeg.exec([
      "-f",
      "lavfi",
      "-i",
      `anullsrc=channel_layout=stereo:sample_rate=44100`,
      "-t",
      durationSeconds.toString(),
      "-c:a",
      "pcm_s16le",
      outputName,
    ]);

    const data = await ffmpeg.readFile(outputName);
    const blob = new Blob([new Uint8Array(data as Uint8Array)], { type: "audio/wav" });

    return blob;
  } catch (error) {
    console.error("Failed to generate silent audio:", error);
    throw error;
  } finally {
    try {
      await ffmpeg.deleteFile(outputName);
    } catch (cleanupError) {
      // Silent cleanup
    }
  }
};
