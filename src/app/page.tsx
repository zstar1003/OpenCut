"use client";

import { useEffect } from "react";

export default function Home() {
  useEffect(() => {
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

    // 检查是否有 404.html 的重定向路径
    const search = window.location.search;
    if (search && search[1] === "/") {
      // 解析 404.html 重定向的路径
      const decoded = search
        .slice(1)
        .split("&")
        .map((s) => s.replace(/~and~/g, "&"))
        .join("?");

      // 重定向到 /editor/new，让编辑器处理项目加载
      // 同时在 URL 中保存原始项目 ID
      const match = decoded.match(/^\/editor\/(.+)$/);
      if (match && match[1] && match[1] !== "new") {
        // 存储项目 ID 到 sessionStorage，让编辑器加载
        sessionStorage.setItem("pendingProjectId", match[1]);
      }

      // 跳转到静态生成的 /editor/new 页面
      window.location.replace(`${basePath}/editor/new`);
      return;
    }

    // 没有重定向参数，跳转到新项目
    window.location.replace(`${basePath}/editor/new`);
  }, []);

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-background">
      <div className="text-muted-foreground">正在加载...</div>
    </div>
  );
}
