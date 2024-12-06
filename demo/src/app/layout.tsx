import { Inter } from "next/font/google";

import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

const font = Inter({
  subsets: ["latin"],
  weight: "variable",
  variable: "--font-sans"
});

export const metadata: Metadata = {
  title: "HFTNN",
  description: "Harmonic Fourier Transform for Neural Networks",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full dark">
      <body
        className={`${font.variable} antialiased h-full`}
      >
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
