import React from "react";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Agro AI Scheme — ರೈತ ಸೌಲಭ್ಯ ಮತ್ತು ಯೋಜನೆ ಮಾರ್ಗದರ್ಶಿ",
  description:
    "Independent farmer helper for Indian government schemes, crop insurance claims, land record checks, and benefit tracking.",
  manifest: "/manifest.json",
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="kn">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600&family=Inter:wght@400;500;600;700&family=Noto+Sans+Devanagari:wght@400;600;700&family=Noto+Sans+Kannada:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
