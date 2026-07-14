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
  metadataBase: new URL("https://one-more-control.culaliya.chatgpt.site"),
  title: {
    default: "ONE MORE CONTROL",
    template: "%s — ONE MORE CONTROL",
  },
  description:
    "A scientific reasoning game where you win by choosing the experiment that proves you wrong.",
  icons: {
    icon: "/favicon.png",
  },
  openGraph: {
    title: "ONE MORE CONTROL",
    description:
      "Three plausible answers. One experiment that matters.",
    type: "website",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "ONE MORE CONTROL — Three plausible answers. One experiment that matters.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ONE MORE CONTROL",
    description:
      "A scientific reasoning game where you win by choosing the experiment that proves you wrong.",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        {children}
      </body>
    </html>
  );
}
