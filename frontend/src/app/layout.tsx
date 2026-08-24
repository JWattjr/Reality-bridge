import type { Metadata } from "next";
import { ProofPlayAuthProvider } from "@/components/ProofPlayAuthProvider";
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
        <ProofPlayAuthProvider>{children}</ProofPlayAuthProvider>
      </body>
    </html>
  );
}
