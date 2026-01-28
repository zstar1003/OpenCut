"use client";

import { Dialog, DialogContent, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { ArrowRightIcon } from "lucide-react";
import { useState, useEffect } from "react";

export function Onboarding() {
  const [step, setStep] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem("hasSeenOnboarding");
    if (!hasSeenOnboarding) {
      setIsOpen(true);
    }
  }, []);

  const handleNext = () => {
    setStep(step + 1);
  };

  const handleClose = () => {
    setIsOpen(false);
    localStorage.setItem("hasSeenOnboarding", "true");
  };

  const getStepTitle = () => {
    switch (step) {
      case 0:
        return "欢迎使用 OpenCut！";
      case 1:
        return "开始使用";
      default:
        return "OpenCut";
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case 0:
        return (
          <div className="space-y-5">
            <div className="space-y-3">
              <Title title="欢迎使用 OpenCut！" />
              <Description>
                一款免费的开源视频编辑器，完全在浏览器中运行。无需服务器处理。
              </Description>
            </div>
            <NextButton onClick={handleNext}>下一步</NextButton>
          </div>
        );
      case 1:
        return (
          <div className="space-y-5">
            <div className="space-y-3">
              <Title title={getStepTitle()} />
              <Description>
                导入媒体文件、编辑时间轴、使用 AI 驱动的字幕功能 - 所有处理都在您的设备本地完成。
              </Description>
              <Description>
                加入我们的{" "}
                <a
                  href="https://discord.gg/zmR9N35cjK"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-foreground hover:text-foreground/80 underline"
                >
                  Discord
                </a>{" "}
                分享反馈。
              </Description>
            </div>
            <NextButton onClick={handleClose}>开始使用</NextButton>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px] !outline-none pt-2">
        <DialogTitle>
          <span className="sr-only">{getStepTitle()}</span>
        </DialogTitle>
        {renderStepContent()}
      </DialogContent>
    </Dialog>
  );
}

function Title({ title }: { title: string }) {
  return <h2 className="text-lg md:text-xl font-bold">{title}</h2>;
}

function Description({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-muted-foreground">{children}</p>
  );
}

function NextButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <Button onClick={onClick} variant="default" className="w-full">
      {children}
      <ArrowRightIcon className="w-4 h-4" />
    </Button>
  );
}
