"use client";

import { useWallets } from "@privy-io/react-auth";
import type { ConnectedWallet } from "@privy-io/react-auth";

/**
 * Devuelve el wallet embedded (ethereum) de Privy ya conectado y su dirección.
 * Fuente fiable justo después de un login OAuth.
 */
export function useEmbeddedWallet(): {
  wallet?: ConnectedWallet;
  address?: string;
} {
  const { wallets } = useWallets();
  const ethWallet = wallets.find((w) => w.type === "ethereum");
  return { wallet: ethWallet, address: ethWallet?.address };
}
