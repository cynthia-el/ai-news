import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "家居建材AI资讯 - 行业热点聚合",
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#f4f6f9]">
        <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 border-b border-slate-200/60">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-sm font-bold">
                AI
              </div>
              <span className="text-base font-semibold text-slate-900 tracking-tight">
                家居建材AI资讯
              </span>
            </a>
            <nav className="flex items-center gap-1">
              {[
                { href: '/', label: '首页' },
                { href: '/daily', label: '日报' },
                { href: '/agent', label: '接入' },
              ].map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100/80 transition"
                >
                  {item.label}
                </a>
              ))}
            </nav>
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="border-t border-slate-200/60 bg-white/60 backdrop-blur">
          <div className="max-w-7xl mx-auto px-6 py-8 flex items-center justify-between">
            <div className="text-sm text-slate-400">
              家居建材AI资讯 · AI驱动的行业信息聚合平台
            </div>
            <a
              href="/admin"
              className="text-xs text-slate-300 hover:text-slate-500 transition"
            >
              管理后台
            </a>
          </div>
        </footer>
      </body>
    </html>
  );
}
