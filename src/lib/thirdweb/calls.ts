/**
 * Llamadas al BoredRegistry con thirdweb v5.
 *
 * - Lecturas (readContract): price, nameExpiry, resolve, nameOf, tokenIdOf.
 * - Escrituras: register, renew (ambas payable, con sendTransaction desde el
 *   wallet embedded de Privy).
 */

import {
  prepareContractCall,
  prepareTransaction,
  readContract,
  sendTransaction,
} from "thirdweb";
import type { Account } from "thirdweb/wallets";
import { boredDomainsContract, boredDomainsAddress, activeChain } from "./contracts";
import { getPrivyAccount } from "./privyWallet";
import { client } from "./client";
import type { ConnectedWallet } from "@privy-io/react-auth";

/* ----------------------------- Lecturas ----------------------------- */

export async function getPrice(label: string, duration: number): Promise<bigint> {
  return readContract({
    contract: boredDomainsContract(),
    method: "function price(string name, uint256 duration) view returns (uint256)",
    params: [label, BigInt(duration)],
  });
}

export async function getNameExpiry(label: string): Promise<bigint> {
  return readContract({
    contract: boredDomainsContract(),
    method: "function nameExpiry(string name) view returns (uint256)",
    params: [label],
  });
}

export async function getResolve(label: string): Promise<string | null> {
  try {
    return await readContract({
      contract: boredDomainsContract(),
      method: "function resolve(string name) view returns (address)",
      params: [label],
    });
  } catch {
    return null;
  }
}

export async function getTokenId(label: string): Promise<bigint> {
  return readContract({
    contract: boredDomainsContract(),
    method: "function tokenIdOf(string name) view returns (uint256)",
    params: [label],
  });
}

export async function getNameOf(addr: string): Promise<string | null> {
  try {
    return await readContract({
      contract: boredDomainsContract(),
      method: "function nameOf(address addr) view returns (string)",
      params: [addr],
    });
  } catch {
    return null;
  }
}

/** Lee un record de texto (p. ej. `avatar`). */
export async function getText(
  label: string,
  key: string,
): Promise<string | null> {
  try {
    return await readContract({
      contract: boredDomainsContract(),
      method: "function text(string name, string key) view returns (string)",
      params: [label, key],
    });
  } catch {
    return null;
  }
}

/** Lee el tokenURI del NFT (metadatos ERC-721, útil para imagen). */
export async function getTokenUri(label: string): Promise<string | null> {
  try {
    const tokenId = await getTokenId(label);
    return await readContract({
      contract: boredDomainsContract(),
      method: "function tokenURI(uint256) view returns (string)",
      params: [tokenId],
    });
  } catch {
    return null;
  }
}

/* ----------------------------- Escrituras ----------------------------- */

/**
 * Registra un dominio `label` a nombre de `owner` durante `duration` (s).
 * Paga msg.value = precio. Devuelve la tx y el resultado.
 */
export async function registerName(options: {
  privyWallet: ConnectedWallet;
  label: string;
  owner: string;
  duration: number;
  value: bigint;
}) {
  const { privyWallet, label, owner, duration, value } = options;
  const account: Account = await getPrivyAccount(privyWallet);
  const contract = boredDomainsContract();

  const tx = prepareContractCall({
    contract,
    method: "function register(string name, address owner, uint256 duration) payable returns (uint256)",
    params: [label, owner, BigInt(duration)],
    value,
  });

  const receipt = await sendTransaction({ transaction: tx, account });
  return receipt;
}

/** Renueva un dominio ya existente. Paga msg.value = precio. */
export async function renewName(options: {
  privyWallet: ConnectedWallet;
  label: string;
  duration: number;
  value: bigint;
}) {
  const { privyWallet, label, duration, value } = options;
  const account: Account = await getPrivyAccount(privyWallet);
  const contract = boredDomainsContract();

  const tx = prepareContractCall({
    contract,
    method: "function renew(string name, uint256 duration) payable",
    params: [label, BigInt(duration)],
    value,
  });

  const receipt = await sendTransaction({ transaction: tx, account });
  return receipt;
}

/** Apunta un nombre a una dirección EVM (configura la resolución). */
export async function setAddrName(options: {
  privyWallet: ConnectedWallet;
  label: string;
  target: string;
}) {
  const { privyWallet, label, target } = options;
  const account: Account = await getPrivyAccount(privyWallet);
  const tx = prepareContractCall({
    contract: boredDomainsContract(),
    method: "function setAddr(string name, address target)",
    params: [label, target],
  });
  const receipt = await sendTransaction({ transaction: tx, account });
  return receipt;
}

/** Fija un record de texto del nombre (p. ej. `avatar` = URL de imagen). */
export async function setTextRecord(options: {
  privyWallet: ConnectedWallet;
  label: string;
  key: string;
  value: string;
}) {
  const { privyWallet, label, key, value } = options;
  const account: Account = await getPrivyAccount(privyWallet);
  const tx = prepareContractCall({
    contract: boredDomainsContract(),
    method: "function setText(string name, string key, string value)",
    params: [label, key, value],
  });
  const receipt = await sendTransaction({ transaction: tx, account });
  return receipt;
}

/** Fija el tokenURI (imagen/metadata) del dominio. Solo el holder puede llamarlo (V3). */
export async function setDomainTokenURI(options: {
  privyWallet: ConnectedWallet;
  tokenId: bigint;
  uri: string;
}) {
  const { privyWallet, tokenId, uri } = options;
  const account: Account = await getPrivyAccount(privyWallet);
  const tx = prepareContractCall({
    contract: boredDomainsContract(),
    method: "function setTokenURI(uint256 tokenId, string uri)",
    params: [tokenId, uri],
  });
  const receipt = await sendTransaction({ transaction: tx, account });
  return receipt;
}

/**
 * Configura la resolución inversa: la wallet que llama (msg.sender) pasará a
 * mostrarse como `label.bored` (nameOf). Solo puede llamarlo el dueño del
 * nombre (o el owner del registry).
 */
export async function setNameForAddress(options: {
  privyWallet: ConnectedWallet;
  label: string;
}) {
  const { privyWallet, label } = options;
  const account: Account = await getPrivyAccount(privyWallet);
  const tx = prepareContractCall({
    contract: boredDomainsContract(),
    method: "function setNameForAddress(string name)",
    params: [label],
  });
  const receipt = await sendTransaction({ transaction: tx, account });
  return receipt;
}

/* ---------------- Transferencia nativa (POL) ---------------- */

/**
 * Envía tokens nativos a una dirección. No toca el contrato: es una transfer
 * directa desde el wallet de Privy.
 */
export async function transferNative(options: {
  privyWallet: ConnectedWallet;
  to: string;
  value: bigint;
}) {
  const { privyWallet, to, value } = options;
  const account: Account = await getPrivyAccount(privyWallet);
  const tx = prepareTransaction({
    to: to as `0x${string}`,
    value,
    client,
    chain: activeChain,
  });
  const receipt = await sendTransaction({ transaction: tx, account });
  return receipt;
}


/**
 * El holder del dominio cambia su tokenURI (imagen/metadata).
 * V3: disponible solo tras upgradear el proxy a BoredRegistryV3.
 */
export async function setTokenUri(options: {
  privyWallet: ConnectedWallet;
  tokenId: bigint;
  uri: string;
}) {
  const { privyWallet, tokenId, uri } = options;
  const account: Account = await getPrivyAccount(privyWallet);
  const tx = prepareContractCall({
    contract: boredDomainsContract(),
    method: "function setTokenURI(uint256 tokenId, string uri)",
    params: [tokenId, uri],
  });
  const receipt = await sendTransaction({ transaction: tx, account });
  return receipt;
}

/* ----------------------------- Relayer (gasless) ----------------------------- */

async function relayCall(method: string, params: any[], value?: bigint) {
  const res = await fetch("/api/relay/call", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ method, params, value: value?.toString() }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Relayer failed");
  return data as { success: boolean; txHash: string; relayer: string };
}

export async function renewNameGasless(options: { label: string; duration: number }) {
  const { label, duration } = options;
  return relayCall("renew", [label, BigInt(duration)]);
}

export async function setAddrNameGasless(options: { label: string; target: string }) {
  const { label, target } = options;
  return relayCall("setAddr", [label, target]);
}

export async function setTextRecordGasless(options: { label: string; key: string; value: string }) {
  const { label, key, value } = options;
  return relayCall("setText", [label, key, value]);
}

/* ----------------------------- Relayer *For (gasless) ----------------------------- */

async function relayForCall(method: string, params: any[]) {
  const res = await fetch("/api/relay/for", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ method, params }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Relayer failed");
  return data as { success: boolean; txHash: string; relayer: string };
}

export async function setAddrForGasless(options: { label: string; target: string }) {
  return relayForCall("setAddrFor", [options.label, options.target]);
}

export async function setTextForGasless(options: { label: string; key: string; value: string }) {
  return relayForCall("setTextFor", [options.label, options.key, options.value]);
}

export async function setNameForAddressForGasless(options: { label: string; user: string }) {
  return relayForCall("setNameForAddressFor", [options.label, options.user]);
}
