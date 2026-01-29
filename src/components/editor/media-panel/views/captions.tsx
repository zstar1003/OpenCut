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

// 过滤无用字幕内容的函数
const filterCaptionText = (text: string): string | null => {
  if (!text) return null;

  const trimmed = text.trim();

  // 过滤太短的内容（单个字符或空白）
  if (trimmed.length < 2) return null;

  // 过滤音乐/视频元数据模式
  const metadataPatterns = [
    /^[\(（\[【]?(?:編曲|编曲|作詞|作词|作曲|字幕|翻译|翻譯|混音|制作|製作|监制|監制|配音|演唱|原唱|歌词|歌詞|MV|导演|導演|摄影|攝影|剪辑|剪輯)[:：]?.+[\)）\]】]?$/i,
    /^[\(（\[【].+[:：].+[\)）\]】]$/, // 括号内带冒号的内容
    /^(?:词|曲|编|混|制|唱)[:：]/,
    /^[A-Za-z\s]+[:：]/, // 英文名字后跟冒号
    /^♪+$|^♫+$|^🎵+$/, // 纯音乐符号
    /^\[.*\]$/, // 方括号内容 [Music] 等
    /^[\(（].*[\)）]$/, // 仅括号内容
  ];

  for (const pattern of metadataPatterns) {
    if (pattern.test(trimmed)) {
      console.log("Filtered metadata:", trimmed);
      return null;
    }
  }

  // 移除文本中的内嵌元数据（但保留其他内容）
  let cleaned = trimmed
    .replace(/[\(（\[【][^）\)】\]]*(?:編曲|编曲|作詞|作词|作曲|字幕|翻译|翻譯|混音|制作|製作)[^）\)】\]]*[\)）\]】]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  // 过滤清理后太短的内容
  if (cleaned.length < 2) return null;

  return cleaned;
};

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

  // 模型配置 - 使用 distil-whisper-large-v3（蒸馏版）
  // 准确度接近 large-v3，但体积更小（~750MB），适合浏览器运行
  const modelId = "Xenova/distil-whisper-large-v3";
  // 备用模型（如果内存不足则回退到更小的模型）
  const fallbackModelId = "Xenova/whisper-small";

  // Track the highest progress value to prevent progress bar from going backwards
  const maxProgressRef = useRef(0);

  const loadTranscriber = useCallback(async () => {
    // If model changed, reset the instance
    if (currentModelId !== modelId && currentModelId !== fallbackModelId) {
      transcriberInstance = null;
      transcriberLoadPromise = null;
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
          env.allowLocalModels = false;
          env.useBrowserCache = true;
        }

        const progressCallback = (progress: any) => {
          if (progress.status === "downloading" || progress.status === "progress") {
            const percent = progress.progress || 0;
            if (percent > maxProgressRef.current) {
              maxProgressRef.current = percent;
              setModelProgress(Math.round(percent));
            }
          } else if (progress.status === "ready" || progress.status === "done") {
            maxProgressRef.current = 100;
            setModelProgress(100);
          }
        };

        // 尝试加载模型，如果 HuggingFace 不可用则尝试 HF 镜像
        const tryLoadModel = async (model: string) => {
          // 首先尝试默认源（HuggingFace）
          try {
            console.log(`尝试从 HuggingFace 加载模型: ${model}`);
            if (env) {
              env.remoteHost = "https://huggingface.co";
              env.remotePathTemplate = "{model}/resolve/{revision}/";
            }
            return await pipeline("automatic-speech-recognition", model, {
              progress_callback: progressCallback,
            });
          } catch (hfError) {
            console.warn("HuggingFace 加载失败，尝试 HF 镜像...", hfError);

            // 尝试 HF 镜像（适用于中国大陆用户）
            try {
              maxProgressRef.current = 0;
              setModelProgress(0);
              if (env) {
                env.remoteHost = "https://hf-mirror.com";
                env.remotePathTemplate = "{model}/resolve/{revision}/";
              }
              console.log(`尝试从 HF 镜像加载模型: ${model}`);
              return await pipeline("automatic-speech-recognition", model, {
                progress_callback: progressCallback,
              });
            } catch (mirrorError) {
              console.warn("HF 镜像加载失败", mirrorError);
              throw mirrorError;
            }
          }
        };

        // 尝试加载主模型
        let transcriber;
        try {
          console.log("加载 ASR 模型:", modelId);
          transcriber = await tryLoadModel(modelId);
          currentModelId = modelId;
        } catch (primaryError) {
          // 如果主模型加载失败，尝试备用模型
          console.warn(`主模型 ${modelId} 加载失败，尝试备用模型...`, primaryError);
          maxProgressRef.current = 0;
          setModelProgress(0);

          try {
            console.log("加载备用模型:", fallbackModelId);
            transcriber = await tryLoadModel(fallbackModelId);
            currentModelId = fallbackModelId;
          } catch (fallbackError) {
            throw new Error(`模型加载失败。请检查网络连接，或尝试使用 VPN 访问。`);
          }
        }

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
  }, []);

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

      setProcessingStep("正在识别语音（这可能需要几分钟）...");

      console.log("Transcription model:", currentModelId, "language:", selectedCountry);

      // Whisper 模型参数
      const result = await transcriber(audioUrl, {
        return_timestamps: true,
        chunk_length_s: 30,
        stride_length_s: 5,
        language: selectedCountry,
        task: "transcribe",
      });

      // Revoke the blob URL
      URL.revokeObjectURL(audioUrl);

      console.log("Transcription completed:", result);

      setProcessingStep("正在生成字幕轨道...");

      const shortCaptions: Array<{
        text: string;
        startTime: number;
        duration: number;
      }> = [];

      let globalEndTime = 0;

      // Handle chunks with timestamps from transformers.js
      if (result.chunks && Array.isArray(result.chunks)) {
        for (const chunk of result.chunks) {
          const rawText = chunk.text?.trim();
          if (!rawText) continue;

          // 过滤无用内容
          const filteredText = filterCaptionText(rawText);
          if (!filteredText) continue;

          const startTime = chunk.timestamp?.[0] ?? globalEndTime;
          const endTime = chunk.timestamp?.[1] ?? startTime + 2;
          const duration = Math.max(0.8, endTime - startTime);

          // 对于中文，按字符分割；对于其他语言，按空格分割
          const isChinese = /[\u4e00-\u9fff]/.test(filteredText);
          let textChunks: string[] = [];

          if (isChinese) {
            // 中文：每 4-6 个字符一组
            const chars = filteredText.replace(/\s+/g, "");
            const chunkSize = 5;
            for (let i = 0; i < chars.length; i += chunkSize) {
              const chunk = chars.slice(i, i + chunkSize);
              if (chunk.length > 0) {
                textChunks.push(chunk);
              }
            }
          } else {
            // 其他语言：按空格分割，每 3 个词一组
            const words = filteredText.split(/\s+/);
            for (let i = 0; i < words.length; i += 3) {
              textChunks.push(words.slice(i, i + 3).join(" "));
            }
          }

          if (textChunks.length === 0) {
            textChunks = [filteredText];
          }

          const chunkDuration = duration / textChunks.length;
          let chunkStartTime = startTime;

          for (const chunkText of textChunks) {
            // 再次过滤每个小块
            const finalText = filterCaptionText(chunkText);
            if (!finalText) continue;

            let adjustedStartTime = chunkStartTime;
            if (adjustedStartTime < globalEndTime) {
              adjustedStartTime = globalEndTime;
            }

            shortCaptions.push({
              text: finalText,
              startTime: adjustedStartTime,
              duration: Math.max(0.8, chunkDuration),
            });

            globalEndTime = adjustedStartTime + Math.max(0.8, chunkDuration);
            chunkStartTime += chunkDuration;
          }
        }
      } else if (result.text) {
        // Fallback for simple text output without timestamps
        const filteredText = filterCaptionText(result.text);
        if (filteredText) {
          const isChinese = /[\u4e00-\u9fff]/.test(filteredText);
          const defaultDuration = 2;

          if (isChinese) {
            const chars = filteredText.replace(/\s+/g, "");
            const chunkSize = 5;
            for (let i = 0; i < chars.length; i += chunkSize) {
              const chunk = chars.slice(i, i + chunkSize);
              const finalText = filterCaptionText(chunk);
              if (finalText) {
                shortCaptions.push({
                  text: finalText,
                  startTime: globalEndTime,
                  duration: defaultDuration,
                });
                globalEndTime += defaultDuration;
              }
            }
          } else {
            const words = filteredText.split(/\s+/);
            for (let i = 0; i < words.length; i += 3) {
              const chunkText = words.slice(i, i + 3).join(" ");
              const finalText = filterCaptionText(chunkText);
              if (finalText) {
                shortCaptions.push({
                  text: finalText,
                  startTime: globalEndTime,
                  duration: defaultDuration,
                });
                globalEndTime += defaultDuration;
              }
            }
          }
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
            使用 distil-whisper-large-v3 模型（蒸馏版），准确度高且内存友好。首次使用需下载约 750MB 模型文件。支持 HF 镜像自动切换。
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
