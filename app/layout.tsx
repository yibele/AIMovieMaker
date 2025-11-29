import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";

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
        <Toaster
          position="bottom-right"
          expand={false}
          richColors
          theme="system"
          toastOptions={{
            duration: 3000,
            classNames: {
              toast: 'bg-white dark:bg-slate-800 text-gray-900 dark:text-white border border-gray-200 dark:border-slate-600 shadow-lg',
              title: 'text-gray-900 dark:text-white font-medium',
              description: 'text-gray-600 dark:text-slate-300',
              error: 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200',
              success: 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200',
              info: 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200',
              warning: 'bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200',
            },
          }}
        />
      </body>
    </html>
  );
}

