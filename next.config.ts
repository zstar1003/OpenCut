import type { NextConfig } from "next";

const isGitHubPages = process.env.GITHUB_PAGES === "true";

const nextConfig: NextConfig = {
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  reactStrictMode: true,
  productionBrowserSourceMaps: true,
  // GitHub Pages 需要静态导出，其他环境使用 standalone
  output: isGitHubPages ? "export" : "standalone",
  // GitHub Pages 部署时需要设置 basePath（如果不是自定义域名）
  basePath: isGitHubPages ? process.env.NEXT_PUBLIC_BASE_PATH || "" : "",
  assetPrefix: isGitHubPages ? process.env.NEXT_PUBLIC_BASE_PATH || "" : "",
  // 为 SPA 路由添加 trailingSlash
  trailingSlash: isGitHubPages,
  images: {
    // 静态导出不支持图片优化，需要使用 unoptimized
    unoptimized: isGitHubPages,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "api.iconify.design",
      },
      {
        protocol: "https",
        hostname: "api.simplesvg.com",
      },
      {
        protocol: "https",
        hostname: "api.unisvg.com",
      },
    ],
  },
  // 配置 webpack 以支持 @xenova/transformers
  webpack: (config, { isServer }) => {
    // 在服务端排除 onnxruntime-web
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        "onnxruntime-web": "onnxruntime-web",
        sharp: "sharp",
      });
    }

    // 添加对 WebAssembly 的支持
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };

    // 忽略一些不需要的警告
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      crypto: false,
    };

    return config;
  },
  // 允许跨域加载 ONNX 模型
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
          {
            key: "Cross-Origin-Embedder-Policy",
            value: "require-corp",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
