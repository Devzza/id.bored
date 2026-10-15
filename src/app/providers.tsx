"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { ThirdwebProvider } from "thirdweb/react";
import {
  amoyTestnet,
  apeChain,
  apeChainTestnet,
  polygon,
  getActiveChain,
} from "@/lib/chains";

/**
 * Providers globales: Privy (login social + wallet embedded) + thirdweb.
 *
 * Usa el MISMO App ID de Privy que endless-fall, así un usuario que entre
 * aquí con su email/Google tiene la MISMA wallet que en el otro proyecto.
 * Las config de registro y de wallet embedded se mantienen idénticas.
 */
export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
      config={{
        // Redes soportadas. Amoy (testnet) es la default.
        supportedChains: [amoyTestnet, polygon, apeChainTestnet, apeChain],
        defaultChain: getActiveChain(),

        loginMethods: ["email", "google", "twitter", "wallet"],

        // UX para normies: login social primero.
        appearance: {
          theme: "dark",
          accentColor: "#7c3aed",
          showWalletLoginFirst: false,
        },

        embeddedWallets: {
          ethereum: {
            createOnLogin: "all-users", // Wallet invisible para todo el que entra
          },
        },
      }}
    >
      <ThirdwebProvider>{children}</ThirdwebProvider>
    </PrivyProvider>
  );
}
