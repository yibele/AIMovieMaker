import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Mover Maker",
  description: "AIGC 画布创作工具",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased h-screen w-screen overflow-hidden">
        {children}
      </body>
    </html>
  );
}

