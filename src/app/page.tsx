"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { nanoid } from "nanoid";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // 客户端重定向到新项目
    const projectId = nanoid();
    router.replace(`/editor/${projectId}`);
  }, [router]);

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-background">
      <div className="text-muted-foreground">正在加载...</div>
    </div>
  );
}
