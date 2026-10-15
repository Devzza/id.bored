import { getContract } from "thirdweb";
import { defineChain } from "thirdweb/chains";
import { client } from "./client";
import { getActiveChain } from "../chains";
import type { Chain as ThirdwebChain } from "thirdweb/chains";
import BoredDomainsAbi from "../../abi/BoredDomainsV0.json";

/**
 * Config for the BoredDomains contract (BoredDomainsV0 / V2).
 *
 * The contract address is defined via NEXT_PUBLIC_BORED_DOMAINS_ADDRESS.
 * The ABI is the full merged interface from the Foundry compilation.
 *
 * IMPORTANT (RPC): we pass the direct network RPC to thirdweb instead of
 * relying on the gateway — the gateway returns "Unauthorized" for some
 * testnets with these clientIds. Direct RPC makes reads/writes work.
 */

/** Address of the deployed BoredDomains contract. */
export const boredDomainsAddress =
  process.env.NEXT_PUBLIC_BORED_DOMAINS_ADDRESS ||
  "0xb49059c50869b8ce11cD2002b79ffEa31A16A9df";

/** Whether we're running against the zero placeholder address (no contract deployed). */
export const isPlaceholder =
  boredDomainsAddress === "0x0000000000000000000000000000000000000000";

/**
 * Active chain converted to thirdweb's Chain type, but with a direct RPC
 * URL instead of relying on thirdweb's gateway.
 */
const active = getActiveChain();
export const activeChain: ThirdwebChain = defineChain({
  id: active.id,
  name: active.name,
  rpc: active.rpcUrls.default.http[0],
  nativeCurrency: active.nativeCurrency,
  blockExplorers: active.blockExplorers?.default
    ? [{ name: active.blockExplorers.default.name, url: active.blockExplorers.default.url }]
    : [],
  ...(active.testnet ? { testnet: true as const } : {}),
});

/** Returns the BoredDomains contract instance for thirdweb hooks. */
export function boredDomainsContract() {
  return getContract({
    client,
    chain: activeChain,
    address: boredDomainsAddress,
    abi: BoredDomainsAbi as any,
  });
}

/** @deprecated alias — prefer boredDomainsContract() */
export const boredRegistryContract = boredDomainsContract;
