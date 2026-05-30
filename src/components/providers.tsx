"use client";

import { WalletProvider } from "@/lib/wallet";
import { StoreProvider } from "@/lib/store";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WalletProvider>
      <StoreProvider>{children}</StoreProvider>
    </WalletProvider>
  );
}
