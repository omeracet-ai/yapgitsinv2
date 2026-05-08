import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import SentryInit from "@/components/SentryInit";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Yapgitsin Admin",
  description: "Yapgitsin Yönetim Paneli",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className={`${geistSans.variable} ${geistMono.variable} h-full`}>
      <body className="h-full bg-gray-50 text-gray-900">
        <SentryInit />
        {children}
      </body>
    </html>
  );
}
