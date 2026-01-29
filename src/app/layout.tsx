import { ThemeProvider } from "next-themes";
import "./globals.css";
import { Toaster } from "../components/ui/sonner";
import { TooltipProvider } from "../components/ui/tooltip";
import { StorageProvider } from "../components/storage-provider";
import { ScenesMigrator } from "../components/providers/migrators/scenes-migrator";
import { baseMetaData } from "./metadata";
import { defaultFont } from "../lib/font-config";
import Script from "next/script";

export const metadata = baseMetaData;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        {/* GitHub Pages SPA 重定向处理脚本 */}
        <Script id="spa-redirect" strategy="beforeInteractive">
          {`
            (function() {
              var redirect = sessionStorage.redirect;
              delete sessionStorage.redirect;
              if (redirect && redirect !== location.href) {
                history.replaceState(null, null, redirect);
              }
              // 处理 404.html 的重定向
              var l = window.location;
              if (l.search[1] === '/') {
                var decoded = l.search.slice(1).split('&').map(function(s) {
                  return s.replace(/~and~/g, '&')
                }).join('?');
                window.history.replaceState(null, null,
                  l.pathname.slice(0, -1) + decoded + l.hash
                );
              }
            })();
          `}
        </Script>
      </head>
      <body className={`${defaultFont.className} font-sans antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="dark">
          <TooltipProvider>
            <StorageProvider>
              <ScenesMigrator>{children}</ScenesMigrator>
            </StorageProvider>
            <Toaster />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
