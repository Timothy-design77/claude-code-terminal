import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Space Flight Simulator",
  description: "2D space flight simulator with orbital mechanics",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
