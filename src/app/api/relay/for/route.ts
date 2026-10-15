import { NextRequest, NextResponse } from "next/server";
import {
  createWalletClient,
  createPublicClient,
  http,
  encodeFunctionData,
  parseAbi,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { getActiveChain } from "@/lib/chains";

const ABI = parseAbi([
  "function setAddrFor(string name, address target)",
  "function setTextFor(string name, string key, string value)",
  "function setNameForAddressFor(string name, address user)",
  "function setTokenURIFor(string name, string uri)",
]);

type ForMethod = "setAddrFor" | "setTextFor" | "setNameForAddressFor" | "setTokenURIFor";

const METHOD_MAP: Record<ForMethod, { payable: boolean }> = {
  setAddrFor: { payable: false },
  setTextFor: { payable: false },
  setNameForAddressFor: { payable: false },
  setTokenURIFor: { payable: false },
};

export async function POST(req: NextRequest) {
  try {
    const { method, params } = await req.json();
    if (!method || !params) {
      return NextResponse.json({ error: "Missing method or params" }, { status: 400 });
    }
    if (!METHOD_MAP[method as ForMethod]) {
      return NextResponse.json({ error: `Method '${method}' not supported` }, { status: 400 });
    }

    const pkRaw = (process.env.RELAYER_PRIVATE_KEY || "").replace(/^0x/, "");
    if (!pkRaw || pkRaw.length !== 64) {
      return NextResponse.json({ error: "Relayer not configured" }, { status: 500 });
    }

    const registryAddress = (process.env.NEXT_PUBLIC_BORED_DOMAINS_ADDRESS || process.env.NEXT_PUBLIC_REGISTRY_ADDRESS) as `0x${string}`;
    if (!registryAddress) return NextResponse.json({ error: "Contract not configured (NEXT_PUBLIC_BORED_DOMAINS_ADDRESS)" }, { status: 500 });

    const account = privateKeyToAccount(`0x${pkRaw}`);
    const chain = getActiveChain();
    const rpc = chain.rpcUrls.default.http[0];

    const walletClient = createWalletClient({ account, chain, transport: http(rpc) });
    const publicClient = createPublicClient({ chain, transport: http(rpc) });

    const data = encodeFunctionData({ abi: ABI, functionName: method, args: params });

    const tx = await walletClient.sendTransaction({ to: registryAddress, data, value: 0n });

    // Wait for confirmation
    await publicClient.waitForTransactionReceipt({ hash: tx });

    return NextResponse.json({ success: true, txHash: tx, relayer: account.address, method });
  } catch (err: any) {
    console.error("Relayer for error:", err);
    return NextResponse.json({ error: err?.message || "Relayer transaction failed" }, { status: 500 });
  }
}