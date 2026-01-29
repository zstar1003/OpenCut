import { Button } from "@/components/ui/button";
import { PropertyGroup } from "../../properties-panel/property-item";
import { PanelBaseView as BaseView } from "@/components/editor/panel-base-view";
import { Language, LanguageSelect } from "@/components/language-select";
import { useState, useRef, useCallback } from "react";
import { extractTimelineAudio } from "@/lib/mediabunny-utils";
import { useTimelineStore } from "@/stores/timeline-store";
import { DEFAULT_TEXT_ELEMENT } from "@/constants/text-constants";
import { Loader2, Download, Cpu } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { TextElement } from "@/types/timeline";
import { useProjectStore } from "@/stores/project-store";

export const languages: Language[] = [
  { code: "chinese", name: "中文", flag: "CN" },
  { code: "english", name: "English", flag: "US" },
  { code: "japanese", name: "日本語", flag: "JP" },
  { code: "korean", name: "한국어", flag: "KR" },
  { code: "spanish", name: "Español", flag: "ES" },
  { code: "french", name: "Français", flag: "FR" },
  { code: "german", name: "Deutsch", flag: "DE" },
  { code: "russian", name: "Русский", flag: "RU" },
  { code: "portuguese", name: "Português", flag: "PT" },
  { code: "italian", name: "Italiano", flag: "IT" },
];

// Singleton for transcriber to avoid reloading
let transcriberInstance: any = null;
let transcriberLoading = false;
let transcriberLoadPromise: Promise<any> | null = null;
let currentModelId: string | null = null;

export function Captions() {
  // Default to Chinese
  const [selectedCountry, setSelectedCountry] = useState("chinese");
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [modelProgress, setModelProgress] = useState<number>(0);
  const [isLoadingModel, setIsLoadingModel] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { insertTrackAt, addElementToTrack } = useTimelineStore();
  const activeProject = useProjectStore((s) => s.activeProject);

  // Use whisper-small - medium is too large for browser memory
  const modelId = "Xenova/whisper-small";

  // Track the highest progress value to prevent progress bar from going backwards
  const maxProgressRef = useRef(0);

  const loadTranscriber = useCallback(async () => {
    // If model changed, reset the instance
    if (currentModelId !== modelId) {
      transcriberInstance = null;
      transcriberLoadPromise = null;
      currentModelId = modelId;
    }

    if (transcriberInstance) {
      return transcriberInstance;
    }

    if (transcriberLoading && transcriberLoadPromise) {
      return transcriberLoadPromise;
    }

    transcriberLoading = true;
    setIsLoadingModel(true);
    maxProgressRef.current = 0;

    transcriberLoadPromise = (async () => {
      try {
        // 动态导入 transformers 库
        const transformersModule = await import("@xenova/transformers");
        const { pipeline, env } = transformersModule;

        // 配置 transformers.js 环境
        if (env) {
          // 禁用本地模型缓存检查，直接从 CDN 加载
          env.allowLocalModels = false;
          // 使用默认的 Hugging Face CDN
          env.useBrowserCache = true;
        }

        console.log("Loading Whisper model:", modelId);

        const transcriber = await pipeline(
          "automatic-speech-recognition",
          modelId,
          {
            progress_callback: (progress: any) => {
              if (progress.status === "downloading" || progress.status === "progress") {
                const percent = progress.progress || 0;
                // Only update if progress increased (prevents jumping backwards)
                if (percent > maxProgressRef.current) {
                  maxProgressRef.current = percent;
                  setModelProgress(Math.round(percent));
                }
              } else if (progress.status === "ready" || progress.status === "done") {
                maxProgressRef.current = 100;
                setModelProgress(100);
              }
            },
          }
        );

        transcriberInstance = transcriber;
        return transcriber;
      } catch (err) {
        transcriberLoading = false;
        transcriberLoadPromise = null;
        throw err;
      } finally {
        transcriberLoading = false;
        setIsLoadingModel(false);
      }
    })();

    return transcriberLoadPromise;
  }, [modelId]);

  const handleGenerateTranscript = async () => {
    try {
      setIsProcessing(true);
      setError(null);
      setModelProgress(0);

      setProcessingStep("正在加载 AI 模型...");
      const transcriber = await loadTranscriber();

      setProcessingStep("正在提取音频...");
      const audioBlob = await extractTimelineAudio();
      console.log("Audio blob size:", audioBlob.size, "bytes");

      // Create a blob URL for the audio
      const audioUrl = URL.createObjectURL(audioBlob);
      console.log("Audio URL created:", audioUrl);

      setProcessingStep("正在转录...");

      // Always pass the selected language explicitly for better accuracy
      console.log("Transcription language:", selectedCountry);

      // Pass the blob URL directly - let transformers.js handle the decoding
      const result = await transcriber(audioUrl, {
        return_timestamps: true,
        chunk_length_s: 30,
        stride_length_s: 5,
        language: selectedCountry, // Always specify language
        task: "transcribe",
      });

      // Revoke the blob URL
      URL.revokeObjectURL(audioUrl);

      console.log("Transcription completed:", result);

      const shortCaptions: Array<{
        text: string;
        startTime: number;
        duration: number;
      }> = [];

      let globalEndTime = 0;

      // Handle chunks with timestamps from transformers.js
      if (result.chunks && Array.isArray(result.chunks)) {
        for (const chunk of result.chunks) {
          const text = chunk.text?.trim();
          if (!text) continue;

          const startTime = chunk.timestamp?.[0] ?? globalEndTime;
          const endTime = chunk.timestamp?.[1] ?? startTime + 2;
          const duration = Math.max(0.8, endTime - startTime);

          // Split long chunks into smaller pieces (2-4 words)
          const words = text.split(/\s+/);
          const chunks: string[] = [];
          for (let i = 0; i < words.length; i += 3) {
            chunks.push(words.slice(i, i + 3).join(" "));
          }

          const chunkDuration = duration / chunks.length;
          let chunkStartTime = startTime;

          for (const chunkText of chunks) {
            let adjustedStartTime = chunkStartTime;
            if (adjustedStartTime < globalEndTime) {
              adjustedStartTime = globalEndTime;
            }

            shortCaptions.push({
              text: chunkText,
              startTime: adjustedStartTime,
              duration: Math.max(0.8, chunkDuration),
            });

            globalEndTime = adjustedStartTime + Math.max(0.8, chunkDuration);
            chunkStartTime += chunkDuration;
          }
        }
      } else if (result.text) {
        // Fallback for simple text output without timestamps
        const words = result.text.trim().split(/\s+/);
        const wordsPerChunk = 3;
        const defaultDuration = 2;

        for (let i = 0; i < words.length; i += wordsPerChunk) {
          const chunkText = words.slice(i, i + wordsPerChunk).join(" ");
          shortCaptions.push({
            text: chunkText,
            startTime: globalEndTime,
            duration: defaultDuration,
          });
          globalEndTime += defaultDuration;
        }
      }

      if (shortCaptions.length === 0) {
        throw new Error("未检测到音频中的语音");
      }

      // Create a single track for all captions
      const captionTrackId = insertTrackAt("text", 0);

      // Calculate y position for bottom center (standard subtitle position)
      const captionY = activeProject?.canvasSize?.height
        ? activeProject.canvasSize.height * 0.4 // ~90% from top, lower position
        : 350; // Default for 1080p canvas

      // Add all caption elements to the same track
      for (let index = 0; index < shortCaptions.length; index++) {
        const caption = shortCaptions[index];
        addElementToTrack(captionTrackId, {
          ...DEFAULT_TEXT_ELEMENT,
          name: `字幕 ${index + 1}`,
          content: caption.text,
          duration: caption.duration,
          startTime: caption.startTime,
          fontSize: 48,
          fontWeight: "bold",
          y: captionY,
          strokeColor: "#000000",
          strokeWidth: 2,
        } as TextElement);
      }

      console.log(
        `${shortCaptions.length} caption chunks added to timeline!`
      );
    } catch (error) {
      console.error("Transcription failed:", error);
      setError(
        error instanceof Error ? error.message : "发生了意外错误"
      );
    } finally {
      setIsProcessing(false);
      setProcessingStep("");
    }
  };

  return (
    <BaseView ref={containerRef} className="flex flex-col justify-between h-full">
      <div className="space-y-4">
        <PropertyGroup title="语言">
          <LanguageSelect
            selectedCountry={selectedCountry}
            onSelect={setSelectedCountry}
            containerRef={containerRef}
            languages={languages}
          />
        </PropertyGroup>

        <div className="p-3 bg-muted/50 rounded-md space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Cpu className="h-4 w-4" />
            <span>在浏览器本地运行</span>
          </div>
          <p className="text-xs text-muted-foreground">
            首次使用需下载约 500MB 的 AI 模型。模型会缓存在浏览器中，您的音频不会离开您的设备。
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {isLoadingModel && modelProgress > 0 && modelProgress < 100 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Download className="h-4 w-4" />
              <span>正在下载 AI 模型... {modelProgress}%</span>
            </div>
            <Progress value={modelProgress} className="h-2" />
          </div>
        )}

        <Button
          className="w-full"
          onClick={handleGenerateTranscript}
          disabled={isProcessing}
        >
          {isProcessing && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
          {isProcessing ? processingStep : "生成字幕"}
        </Button>
      </div>
    </BaseView>
  );
}
