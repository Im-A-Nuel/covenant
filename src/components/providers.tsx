"use client";

import { WalletProvider } from "@/lib/wallet";
import { StoreProvider } from "@/lib/store";
import { ToastProvider } from "@/components/ui/toast";
import { ConfirmProvider } from "@/components/ui/confirm";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WalletProvider>
      <StoreProvider>
        <ToastProvider>
          <ConfirmProvider>{children}</ConfirmProvider>
        </ToastProvider>
      </StoreProvider>
    </WalletProvider>
  );
}
