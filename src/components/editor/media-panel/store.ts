import {
  CaptionsIcon,
  VideoIcon,
  LucideIcon,
  TypeIcon,
  SettingsIcon,
} from "lucide-react";
import { create } from "zustand";

export type Tab =
  | "media"
  | "text"
  | "captions"
  | "settings";

export const tabs: { [key in Tab]: { icon: LucideIcon; label: string } } = {
  media: {
    icon: VideoIcon,
    label: "媒体",
  },
  text: {
    icon: TypeIcon,
    label: "文字",
  },
  captions: {
    icon: CaptionsIcon,
    label: "字幕",
  },
  settings: {
    icon: SettingsIcon,
    label: "设置",
  },
};

interface MediaPanelStore {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  highlightMediaId: string | null;
  requestRevealMedia: (mediaId: string) => void;
  clearHighlight: () => void;
}

export const useMediaPanelStore = create<MediaPanelStore>((set) => ({
  activeTab: "media",
  setActiveTab: (tab) => set({ activeTab: tab }),
  highlightMediaId: null,
  requestRevealMedia: (mediaId) =>
    set({ activeTab: "media", highlightMediaId: mediaId }),
  clearHighlight: () => set({ highlightMediaId: null }),
}));
