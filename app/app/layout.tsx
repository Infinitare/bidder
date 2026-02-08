import type { Metadata } from "next";
import { Geist, Space_Grotesk } from "next/font/google";
import { ReactNode } from "react";
import "./globals.css";
import QueryProvider from "@/components/provider/query-provider";
import { RpcProvider } from "@/components/provider/rpc-provider";
import WalletProvider from "@/components/provider/wallet-provider";
import ThemeProvider from "@/components/provider/theme-provider";
import { Toaster } from "sonner";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Bidder - Win it all",
  description:
    "Win the pot every 24 hours – completely on-chain and decentralized.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${spaceGrotesk.variable} ${geistSans.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            <WalletProvider>
              <RpcProvider>{children}</RpcProvider>
            </WalletProvider>
          </QueryProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
