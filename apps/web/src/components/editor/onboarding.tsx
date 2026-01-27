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
        return "Welcome to OpenCut!";
      case 1:
        return "Getting Started";
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
              <Title title="Welcome to OpenCut!" />
              <Description>
                A free, open source video editor that runs entirely in your browser. No server processing needed.
              </Description>
            </div>
            <NextButton onClick={handleNext}>Next</NextButton>
          </div>
        );
      case 1:
        return (
          <div className="space-y-5">
            <div className="space-y-3">
              <Title title={getStepTitle()} />
              <Description>
                Import media files, edit your timeline, and use AI-powered captions - all processed locally on your device.
              </Description>
              <Description>
                Join our{" "}
                <a
                  href="https://discord.gg/zmR9N35cjK"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-foreground hover:text-foreground/80 underline"
                >
                  Discord
                </a>{" "}
                to share feedback.
              </Description>
            </div>
            <NextButton onClick={handleClose}>Get Started</NextButton>
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
