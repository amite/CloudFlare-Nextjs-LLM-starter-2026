import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CF Next LLM Boilerplate",
  description: "Next.js boilerplate for Cloudflare Workers with LLM integration",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
