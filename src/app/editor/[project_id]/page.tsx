import EditorClient from "./editor-client";

// 为静态导出生成参数 - 返回空数组允许动态路由在客户端工作
export function generateStaticParams() {
  return [];
}

export default function EditorPage() {
  return <EditorClient />;
}
