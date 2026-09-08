import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Accountability Tracker",
  description: "Track and review your digital usage",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}