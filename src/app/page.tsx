"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // 检查是否有 404.html 的重定向路径
    const search = window.location.search;
    if (search && search[1] === "/") {
      // 解析 404.html 重定向的路径
      const decoded = search
        .slice(1)
        .split("&")
        .map((s) => s.replace(/~and~/g, "&"))
        .join("?");

      // 使用客户端路由导航到目标路径
      router.replace(decoded);
      return;
    }

    // 没有重定向参数，跳转到新项目
    router.replace("/editor/new");
  }, [router]);

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-background">
      <div className="text-muted-foreground">正在加载...</div>
    </div>
  );
}
