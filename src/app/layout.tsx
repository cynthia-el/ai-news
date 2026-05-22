import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "家居建材资讯 - 行业热点聚合",
  description: "AI驱动的家居建材行业资讯聚合平台，自动采集、智能分类、精选推荐",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className="h-full antialiased"
    >
      <body className="min-h-full flex bg-white">
        <Sidebar />
        <div className="flex-1 flex flex-col ml-52">
          <main className="flex-1">{children}</main>
          <footer className="border-t border-slate-100">
            <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
              <div className="text-[11px] text-slate-400">
                家居建材资讯 · 智能行业信息聚合平台
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
