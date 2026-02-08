"use client";

import {
  ConnectionProvider,
  WalletProvider as BaseWalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { ReactNode, useMemo } from "react";
import "@solana/wallet-adapter-react-ui/styles.css";

export default function WalletProvider({ children }: { children: ReactNode }) {
  const wallets = useMemo(() => [], []);

  return (
    <ConnectionProvider
      endpoint={process.env.NEXT_PUBLIC_SOLANA_RPC_URL!}
      config={{
        commitment: "processed",
      }}
    >
      <BaseWalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </BaseWalletProvider>
    </ConnectionProvider>
  );
}
