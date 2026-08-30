import type { Metadata, Viewport } from "next";

import "./globals.css";
import "./components.css";
import "./touch.css";

export const metadata: Metadata = {
  title: "Reality Bridge | GenLayer StudioNet",
  description:
    "A real-world prediction and elimination game settled by GenLayer validator consensus on StudioNet.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f3f4ef",
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
