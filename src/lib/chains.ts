import { defineChain } from "viem";
import type { Chain as ViemChain } from "viem";

/**
 * Redes de bored.works.
 *
 * La default es **Polygon Amoy testnet (80002)** para desarrollo. También
 * están disponibles ApeChain (testnet/mainnet) y Polygon mainnet.
 *
 * Un `Chain` de viem es exactamente lo que espera Privy en `supportedChains`
 * y lo que thirdweb acepta en `defineChain` (convertimos con cast en
 * contracts.ts, igual que en endless-fall).
 */

/** Polygon Amoy testnet (default mientras construimos). */
export const amoyTestnet: ViemChain = defineChain({
  id: 80002,
  name: "Polygon Amoy Testnet",
  nativeCurrency: { name: "Polygon", symbol: "POL", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://polygon-amoy-bor-rpc.publicnode.com"] },
    public: { http: ["https://polygon-amoy-bor-rpc.publicnode.com"] },
  },
  blockExplorers: {
    default: { name: "Amoy Explorer", url: "https://amoy.polygonscan.com" },
  },
  testnet: true,
});

/** Polygon mainnet. */
export const polygon: ViemChain = defineChain({
  id: 137,
  name: "Polygon",
  nativeCurrency: { name: "Polygon", symbol: "POL", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://polygon-rpc.com"] },
    public: { http: ["https://polygon-rpc.com"] },
  },
  blockExplorers: {
    default: { name: "Polygonscan", url: "https://polygonscan.com" },
  },
});

/** ApeChain testnet (Curtis). */
export const apeChainTestnet: ViemChain = defineChain({
  id: 33111,
  name: "ApeChain Curtis Testnet",
  nativeCurrency: { name: "ApeCoin", symbol: "APE", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.curtis.apechain.com"] },
    public: { http: ["https://rpc.curtis.apechain.com"] },
  },
  blockExplorers: {
    default: { name: "Curtis Explorer", url: "https://explorer.curtis.apechain.com" },
  },
  testnet: true,
});

/** ApeChain mainnet. */
export const apeChain: ViemChain = defineChain({
  id: 33139,
  name: "ApeChain",
  nativeCurrency: { name: "ApeCoin", symbol: "APE", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.apechain.com"] },
    public: { http: ["https://rpc.apechain.com"] },
  },
  blockExplorers: {
    default: { name: "ApeScan", url: "https://apescan.io" },
  },
});

/**
 * La cadena activa en runtime, leída de NEXT_PUBLIC_CHAIN.
 * Valores: "amoy" (default) | "polygon" | "apechain-testnet" | "apechain".
 */
export function getActiveChain(): ViemChain {
  const which = process.env.NEXT_PUBLIC_CHAIN || "amoy";
  switch (which) {
    case "polygon":
      return polygon;
    case "apechain-testnet":
      return apeChainTestnet;
    case "apechain":
      return apeChain;
    default:
      return amoyTestnet;
  }
}

/** Nombre legible de la red activa. */
export function getNetworkName(chain: ViemChain): string {
  return chain.name;
}
