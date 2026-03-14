import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FraudGuard AI - Real-Time Fraud Detection",
  description: "Professional fraud detection system for monitoring financial transactions",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
