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
          richColors={false}
          theme="system"
          toastOptions={{
            duration: 3000,
            error: {
              duration: 8000,
            },
            style: {
              background: 'hsl(var(--background))',
              border: '1px solid hsl(var(--border))',
              color: 'hsl(var(--foreground))',
              fontSize: '14px',
              borderRadius: '8px',
              padding: '12px 16px',
            },
            classNames: {
              toast: 'border-l-4',
              toastError: 'border-l-red-500',
              toastSuccess: 'border-l-green-500',
              toastInfo: 'border-l-blue-500',
              toastWarning: 'border-l-yellow-500',
            },
          }}
        />
      </body>
    </html>
  );
}

