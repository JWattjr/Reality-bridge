import type { Metadata } from "next";
import { EvmWalletProvider } from "@/components/EvmWalletProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "ProofPlay | Head-to-Head Football Tickets",
  description: "A six-pick football prediction duel on Base Sepolia, resolved by a GenLayer Intelligent Contract on Studionet.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <EvmWalletProvider>{children}</EvmWalletProvider>
      </body>
    </html>
  );
}
