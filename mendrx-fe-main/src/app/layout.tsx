// File: src/app/layout.tsx
import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import Footer from "@/components/Footer";
import dynamic from "next/dynamic";
import { Suspense } from "react";
import { Providers } from "@/components/Providers";
import { Toaster } from "react-hot-toast";

const GoogleAnalytics = dynamic(() => import("@/components/GoogleAnalytics"), {
  ssr: false,
});

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "MendRx",
  description: "Elevate Your Practice with AI-Powered Precision",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          <div className="flex-grow">{children}</div>
          <Footer />
          <Suspense fallback={null}>
            <GoogleAnalytics />
          </Suspense>
          <Toaster position="top-center" />
        </Providers>
      </body>
    </html>
  );
}
