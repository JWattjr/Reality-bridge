import type { Metadata } from "next";
import { Nunito, Balsamiq_Sans } from "next/font/google";
import { ProofPlayAuthProvider } from "@/components/ProofPlayAuthProvider";
import { Providers } from "@/components/Providers";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800", "900"],
});

const balsamiq = Balsamiq_Sans({
  variable: "--font-balsamiq",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "ProofPlay X Cup | Football Predictions",
  description: "A minimal USDT-backed football prediction game with match and PvP leaderboards.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${nunito.variable} ${balsamiq.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>
          <ProofPlayAuthProvider>{children}</ProofPlayAuthProvider>
        </Providers>
      </body>
    </html>
  );
}
