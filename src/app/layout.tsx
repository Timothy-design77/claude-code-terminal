import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Claude Terminal",
  description: "Connect to Claude via n8n webhook",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
