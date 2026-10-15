"use client";

import { useEffect, useState } from "react";
import { createPublicClient, http } from "viem";
import { formatEther } from "viem";
import { getNameOf, getText } from "@/lib/thirdweb/calls";
import { getActiveChain } from "@/lib/chains";

/**
 * Resolves the connected wallet's identity:
 *  - Bored ID (nameOf): if the wallet has a `.bored` name resolved, return it.
 *  - Avatar: text record "avatar" for the resolved name.
 *  - POL balance: native token balance of the wallet.
 *
 * If nameOf fails (e.g. data corrupted by a past V1 bug), the name is null.
 * Callers should handle the null case gracefully.
 */
export function useUserIdentity(address?: string) {
  const [boredId, setBoredId] = useState<string | null>(null);
  const [boredLoading, setBoredLoading] = useState(false);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);

  // Bored ID: reverse resolution + avatar.
  useEffect(() => {
    if (!address) {
      setBoredId(null);
      setAvatar(null);
      return;
    }
    let cancelled = false;
    setBoredLoading(true);
    getNameOf(address)
      .then(async (n) => {
        if (cancelled) return;
        // nameOf can return null if reverse was never set, or if the storage
        // was corrupted by the V1 assembly bug. In the latter case, Solidity's
        // decoder returns garbage (wrong-length string) which we catch here.
        const valid =
          n !== null &&
          typeof n === "string" &&
          n.length >= 1 &&
          n.length <= 64 &&
          /^[a-z0-9_-]*$/.test(n);
        setBoredId(valid ? n : null);
        if (valid && n) {
          const av = await getText(n, "avatar").catch(() => null);
          if (!cancelled) setAvatar(av ?? null);
        }
      })
      .catch(() => !cancelled && setBoredId(null))
      .finally(() => !cancelled && setBoredLoading(false));
    return () => {
      cancelled = true;
    };
  }, [address]);

  // POL balance.
  useEffect(() => {
    if (!address) {
      setBalance(null);
      return;
    }
    let cancelled = false;
    setBalanceLoading(true);
    const rpc = getActiveChain().rpcUrls.default.http[0];
    const publicClient = createPublicClient({ transport: http(rpc) });
    publicClient
      .getBalance({ address: address as `0x${string}` })
      .then((v) => !cancelled && setBalance(formatEther(v)))
      .catch(() => !cancelled && setBalance(null))
      .finally(() => !cancelled && setBalanceLoading(false));
    return () => {
      cancelled = true;
    };
  }, [address]);

  return { boredId, boredLoading, avatar, balance, balanceLoading };
}
