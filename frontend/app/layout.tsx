import type { Metadata } from "next";
import { Noto_Sans_Arabic } from "next/font/google";
import "./globals.css";

// Arabic-first font — Noto Sans Arabic covers the full Arabic Unicode block.
const notoSansArabic = Noto_Sans_Arabic({
  subsets: ["arabic"],
  variable: "--font-arabic",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ذاكريلي",
  description: "منصة تعلم تفاعلية — الصف الرابع الابتدائي",
};

// RTL RULES enforced from FE-01:
//   dir="rtl" lang="ar" on <html> is immovable.
//   Tailwind spacing: ms-/me-/ps-/pe- only. Never ml-/mr-/pl-/pr-.
//   Alignment: text-start / text-end. Never text-left / text-right.
//   Direction icons (arrows, chevrons): add [transform:scaleX(-1)] in RTL.
//   Flag those spots with a "RTL: mirror icon" comment when introduced.
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" className={notoSansArabic.variable}>
      <body className="min-h-screen bg-gray-50 font-[family-name:var(--font-arabic)] antialiased">
        {children}
      </body>
    </html>
  );
}
