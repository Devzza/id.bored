"use client";

import { useEffect, useState } from "react";
import { createPublicClient, http, parseAbi } from "viem";
import { getActiveChain } from "@/lib/chains";

/**
 * Minimal profile data pulled straight from the .bored contract via viem
 * (no thirdweb SDK in the hot path — avoids the crash / ABI issues).
 *
 * Reads:
 *  - nftBalance (balanceOf)
 *  - name (nameOf, reverse resolution)
 *  - tokenId (tokenIdOf)
 *  - tokenURI (for the NFT image/metadata)
 *  - resolve (where the name points)
 *  - avatar (text record)
 *  - expiry (nameExpiry)
 *  - polBalance (native balance)
 */
export interface ProfileData {
  loading: boolean;
  error: string | null;
  nftBalance: bigint | null;
  name: string | null;
  tokenId: bigint | null;
  tokenUri: string | null;
  tokenName: string | null; // name del JSON metadata del tokenURI
  tokenImage: string | null; // imatge del JSON metadata
  resolve: string | null;
  avatar: string | null;
  expiry: number | null; // unix seconds
  polBalance: bigint | null;
  nfts: { tokenId: bigint; name: string | null; image: string | null; uri: string | null }[];
}

const ABI = parseAbi([
  "function balanceOf(address owner) view returns (uint256)",
  "function nameOf(address addr) view returns (string)",
  "function tokenIdOf(string name) view returns (uint256)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function resolve(string name) view returns (address)",
  "function text(string name, string key) view returns (string)",
  "function nameExpiry(string name) view returns (uint256)",
  "function totalSupply() view returns (uint256)",
  "function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)",
]);

/**
 * Resol un IPFS (ipfs://CID o CID solt) a una URL HTTP llegible via gateway.
 */
function ipfsGateway(url: string): string {
  const clean = url.trim();
  if (clean.startsWith("ipfs://")) {
    return `https://gateway.pinata.cloud/ipfs/${clean.slice(7)}`;
  }
  if (/^[a-zA-Z0-9]{46}$/.test(clean)) {
    return `https://gateway.pinata.cloud/ipfs/${clean}`;
  }
  return clean;
}

/**
 * Descarrega la metadata (JSON) apuntada pel tokenURI i n'extreu name + image.
 * Si el tokenURI apunta directament a una imatge (no JSON), ho detecta pel MIME.
 */
async function resolveNftMetadata(
  uri: string | null,
): Promise<{ name: string | null; image: string | null }> {
  if (!uri) return { name: null, image: null };
  // Imatge directa (data:/http amb extensió d'imatge) — retornem com a image.
  if (uri.startsWith("data:image")) return { name: null, image: uri };
  if (/^https?:\/\/.*\.(png|jpe?g|webp|gif|svg)(\?.*)?$/i.test(uri)) {
    return { name: null, image: uri };
  }
  // Cas IPFS: intentem descarregar com a JSON.
  try {
    const gw = ipfsGateway(uri);
    const res = await fetch(gw);
    if (!res.ok) return { name: null, image: gw };
    const text = await res.text();
    let json: any;
    try {
      json = JSON.parse(text);
    } catch {
      // No és JSON — probablement una imatge directa a IPFS.
      return { name: null, image: gw };
    }
    const name = typeof json.name === "string" ? json.name : null;
    const rawImage = typeof json.image === "string" ? json.image : null;
    const image = rawImage ? ipfsGateway(rawImage) : null;
    return { name, image };
  } catch {
    return { name: null, image: uri };
  }
}

export function useProfileData(address?: string): ProfileData {
  const [state, setState] = useState<ProfileData>({
    loading: !!address,
    error: null,
    nftBalance: null,
    name: null,
    tokenId: null,
    tokenUri: null,
    tokenName: null,
    tokenImage: null,
    resolve: null,
    avatar: null,
    expiry: null,
    polBalance: null,
    nfts: [],
  });

  useEffect(() => {
    if (!address) {
      setState({
        loading: false,
        error: null,
        nftBalance: null,
        name: null,
        tokenId: null,
        tokenUri: null,
        tokenName: null,
        tokenImage: null,
        resolve: null,
        avatar: null,
        expiry: null,
        polBalance: null,
        nfts: [],
      });
      return;
    }

    let cancelled = false;
    const chain = getActiveChain();
    const rpc = chain.rpcUrls.default.http[0];
    const registryAddress = process.env.NEXT_PUBLIC_BORED_DOMAINS_ADDRESS as `0x${string}`;

    async function load() {
      const client = createPublicClient({
        chain,
        transport: http(rpc),
      });
      const addr = address as `0x${string}`;

      try {
        const [balance, name] = await Promise.all([
          client.readContract({ address: registryAddress, abi: ABI, functionName: "balanceOf", args: [addr] }).catch(() => 0n),
          client.readContract({ address: registryAddress, abi: ABI, functionName: "nameOf", args: [addr] }).catch(() => ""),
        ]);

        const validName =
          typeof name === "string" &&
          name.length >= 1 &&
          name.length <= 64 &&
          /^[a-z0-9_-]+$/.test(name);
        const finalName = validName ? name : null;

        // Fetch the rest in parallel (only if a name exists).
        let tokenId: bigint | null = null;
        let tokenUri: string | null = null;
        let tokenName: string | null = null;
        let tokenImage: string | null = null;
        let resolve: string | null = null;
        let avatar: string | null = null;
        let expiry: number | null = null;

        if (finalName) {
          const n = finalName;
          const [tId, res, av, exp] = await Promise.all([
            client.readContract({ address: registryAddress, abi: ABI, functionName: "tokenIdOf", args: [n] }).catch(() => 0n),
            client.readContract({ address: registryAddress, abi: ABI, functionName: "resolve", args: [n] }).catch(() => null),
            client.readContract({ address: registryAddress, abi: ABI, functionName: "text", args: [n, "avatar"] }).catch(() => ""),
            client.readContract({ address: registryAddress, abi: ABI, functionName: "nameExpiry", args: [n] }).catch(() => 0n),
          ]);

          tokenId = tId && tId > 0n ? tId : null;
          if (tokenId) {
            const uri = await client
              .readContract({ address: registryAddress, abi: ABI, functionName: "tokenURI", args: [tokenId] })
              .catch(() => "");
            tokenUri = typeof uri === "string" && uri ? uri : null;
            const meta = await resolveNftMetadata(tokenUri);
            tokenName = meta.name;
            tokenImage = meta.image;
          }
          resolve = res ? (res as string) : null;
          // Avatar: accept a local URL (/avatars/..), a data URI, or http(s).
          const avStr = typeof av === "string" ? av : "";
          avatar = avStr && (avStr.startsWith("/avatar") || avStr.startsWith("data:image") || avStr.startsWith("http")) ? avStr : null;
          expiry = exp ? Number(exp) : null;
        }

        const pol = await client.getBalance({ address: addr }).catch(() => null);

        // ---- List all collection NFTs owned by this wallet (enumerable) ----
        const nfts: ProfileData["nfts"] = [];
        const count = balance ?? 0n;
        for (let i = 0n; i < count; i++) {
          const ownerTokenId = await client
            .readContract({ address: registryAddress, abi: ABI, functionName: "tokenOfOwnerByIndex", args: [addr, i] })
            .catch(() => 0n);
          if (!ownerTokenId || ownerTokenId === 0n) continue;
          const uriRaw = await client
            .readContract({ address: registryAddress, abi: ABI, functionName: "tokenURI", args: [ownerTokenId] })
            .catch(() => "");
          const uri = typeof uriRaw === "string" && uriRaw ? uriRaw : null;
          const meta = await resolveNftMetadata(uri);
          nfts.push({
            tokenId: ownerTokenId,
            name: meta.name,
            image: meta.image,
            uri,
          });
        }

        if (!cancelled) {
          setState({
            loading: false,
            error: null,
            nftBalance: balance,
            name: finalName,
            tokenId,
            tokenUri,
            tokenName,
            tokenImage,
            resolve,
            avatar,
            expiry,
            polBalance: pol,
            nfts,
          });
        }
      } catch (e: any) {
        if (!cancelled) {
          setState((s) => ({ ...s, loading: false, error: e?.message || "Failed to load" }));
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [address]);

  return state;
}
