"use client";

import { TabBar } from "./tabbar";
import { MediaView } from "./views/media";
import { useMediaPanelStore, Tab } from "./store";
import { TextView } from "./views/text";
import { Separator } from "@/components/ui/separator";
import { SettingsView } from "./views/settings";
import { Captions } from "./views/captions";

export function MediaPanel() {
  const { activeTab } = useMediaPanelStore();

  const viewMap: Record<Tab, React.ReactNode> = {
    media: <MediaView />,
    text: <TextView />,
    captions: <Captions />,
    settings: <SettingsView />,
  };

  return (
    <div className="h-full flex bg-panel">
      <TabBar />
      <Separator orientation="vertical" />
      <div className="flex-1 overflow-hidden">{viewMap[activeTab]}</div>
    </div>
  );
}
