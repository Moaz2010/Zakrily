import type { Metadata, Viewport } from "next";
import "./globals.css";

const SITE_URL = "https://zakrily.iqraxis.com";
const TITLE = "ذاكريلي";
const DESCRIPTION =
  "منصة تعلم تفاعلية للصف الرابع الابتدائي — العلوم والرياضيات والإنجليزي، مشروحة بالعامية المصرية مع مدرّسة ذكية بترد على أسئلتك في أي وقت.";

export const metadata: Metadata = {
  // Resolves every relative URL below (icons, OG images) to an absolute one,
  // which Open Graph/Twitter unfurling requires — a relative path silently
  // fails to preview on most platforms.
  metadataBase: new URL(SITE_URL),
  title: { default: TITLE, template: `%s — ${TITLE}` },
  description: DESCRIPTION,
  applicationName: TITLE,
  keywords: [
    "ذاكريلي", "تعليم", "الصف الرابع الابتدائي", "مذاكرة", "علوم", "رياضيات",
    "انجليزي", "منهج مصري", "تعلم تفاعلي",
  ],
  authors: [{ name: TITLE }],
  manifest: "/manifest.json",
  // app/icon.png and app/apple-icon.png exist as Next.js file-convention
  // icons too, but this setup doesn't auto-emit <link> tags for them, so
  // they're declared explicitly here to guarantee they actually render.
  icons: {
    icon: [
      { url: "/icon.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    type: "website",
    locale: "ar_EG",
    url: SITE_URL,
    siteName: TITLE,
    title: TITLE,
    description: DESCRIPTION,
    // app/opengraph-image.png is auto-attached by the file convention;
    // no images[] entry needed here.
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    // app/twitter-image.png is auto-attached the same way.
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: "#1E5C4A",
  width: "device-width",
  initialScale: 1,
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
    <html lang="ar" dir="rtl">
      <body className="min-h-screen bg-gray-50 font-arabic antialiased">
        {children}
      </body>
    </html>
  );
}
