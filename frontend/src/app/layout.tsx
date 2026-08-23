import type { Metadata } from "next";
import { ProofPlayAuthProvider } from "@/components/ProofPlayAuthProvider";
import { Providers } from "@/components/Providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "ProofPlay | Base Sepolia + GenLayer",
  description: "A test-USDC football prediction prototype resolved by a GenLayer Intelligent Contract on Studionet.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <Providers>
          <ProofPlayAuthProvider>{children}</ProofPlayAuthProvider>
        </Providers>
      </body>
    </html>
  );
}
