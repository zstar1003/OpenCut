import { ThemeProvider } from "next-themes";
import "./globals.css";
import { Toaster } from "../components/ui/sonner";
import { TooltipProvider } from "../components/ui/tooltip";
import { StorageProvider } from "../components/storage-provider";
import { ScenesMigrator } from "../components/providers/migrators/scenes-migrator";
import { baseMetaData } from "./metadata";
import { defaultFont } from "../lib/font-config";

export const metadata = baseMetaData;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
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
