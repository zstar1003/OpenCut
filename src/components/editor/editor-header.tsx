"use client";

import { Button } from "../ui/button";
import { ChevronDown, SquarePen, MessageCircle } from "lucide-react";
import { HeaderBase } from "../header-base";
import { useProjectStore } from "@/stores/project-store";
import { KeyboardShortcutsHelp } from "../keyboard-shortcuts-help";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { PanelPresetSelector } from "./panel-preset-selector";
import { ExportButton } from "./export-button";
import { ThemeToggle } from "../theme-toggle";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Input } from "../ui/input";

export function EditorHeader() {
  const { activeProject, renameProject } = useProjectStore();
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [isWechatDialogOpen, setIsWechatDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");

  const handleNameSave = async () => {
    if (activeProject && newName.trim() && newName !== activeProject.name) {
      try {
        await renameProject(activeProject.id, newName.trim());
        setIsRenameDialogOpen(false);
      } catch (error) {
        console.error("Failed to rename project:", error);
      }
    }
  };

  const openRenameDialog = () => {
    setNewName(activeProject?.name || "");
    setIsRenameDialogOpen(true);
  };

  const leftContent = (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="secondary"
            className="h-auto py-1.5 px-2.5 flex items-center justify-center"
          >
            <ChevronDown className="text-muted-foreground" />
            <span className="text-[0.85rem] mr-2">{activeProject?.name}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-40 z-100">
          <DropdownMenuItem
            className="flex items-center gap-1.5"
            onClick={openRenameDialog}
          >
            <SquarePen className="h-4 w-4" />
            重命名项目
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="flex items-center gap-1.5"
            onClick={() => setIsWechatDialogOpen(true)}
          >
            <MessageCircle className="h-4 w-4" />
            微信公众号
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>重命名项目</DialogTitle>
            <DialogDescription>
              请输入项目的新名称。
            </DialogDescription>
          </DialogHeader>
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="项目名称"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleNameSave();
              }
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRenameDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleNameSave}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isWechatDialogOpen} onOpenChange={setIsWechatDialogOpen}>
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle>微信公众号</DialogTitle>
            <DialogDescription>
              如有问题，可通过公众号联系开发者
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center py-4">
            <img
              src="/wechat.webp"
              alt="微信公众号二维码"
              className="w-48 h-48 object-contain rounded-lg"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );

  const rightContent = (
    <nav className="flex items-center gap-2">
      <PanelPresetSelector />
      <KeyboardShortcutsHelp />
      <ExportButton />
      <ThemeToggle />
    </nav>
  );

  return (
    <HeaderBase
      leftContent={leftContent}
      rightContent={rightContent}
      className="bg-background h-[3.2rem] px-3 items-center mt-0.5"
    />
  );
}
