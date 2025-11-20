import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { AppHeader } from "@/components/app-header";
import "./globals.css";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "超级待办清单 - Next.js Todo App",
  description: "一个炫酷的待办事项管理应用，助你高效完成任务",
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  display: "swap",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="dark">
      <body className={`${geistSans.className} antialiased bg-slate-950 text-white`}>
        <AppHeader />
        {children}
      </body>
    </html>
  );
}
