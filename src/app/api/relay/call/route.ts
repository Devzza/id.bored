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

/// Contract ABI fragments for relayable functions
const ABI = parseAbi([
  "function renewFor(string name, uint256 duration) payable",
  "function price(string name, uint256 duration) view returns (uint256)",
]);

type RelayMethod = "renew";

const METHOD_MAP: Record<RelayMethod, { payable: boolean; fn: string }> = {
  renew: { payable: true, fn: "renewFor" },
};

export async function POST(req: NextRequest) {
  try {
    const { method, params, value } = await req.json();

    if (!method || !params) {
      return NextResponse.json({ error: "Missing method or params" }, { status: 400 });
    }

    if (!METHOD_MAP[method as RelayMethod]) {
      return NextResponse.json({ error: `Method '${method}' not supported for relay` }, { status: 400 });
    }

    const pkRaw = (process.env.RELAYER_PRIVATE_KEY || "").replace(/^0x/, "");
    if (!pkRaw || pkRaw.length !== 64) {
      return NextResponse.json({ error: "Relayer not configured (add RELAYER_PRIVATE_KEY to .env)" }, { status: 500 });
    }

    const registryAddress = (process.env.NEXT_PUBLIC_BORED_DOMAINS_ADDRESS || process.env.NEXT_PUBLIC_REGISTRY_ADDRESS) as `0x${string}`;
    if (!registryAddress) {
      return NextResponse.json({ error: "Contract not configured (NEXT_PUBLIC_BORED_DOMAINS_ADDRESS)" }, { status: 500 });
    }

    const account = privateKeyToAccount(`0x${pkRaw}`);
    const chain = getActiveChain();
    const rpc = chain.rpcUrls.default.http[0];

    const walletClient = createWalletClient({ account, chain, transport: http(rpc) });
    const publicClient = createPublicClient({ chain, transport: http(rpc) });

    let txValue = 0n;
    const fnName = METHOD_MAP[method as RelayMethod].fn;

    // For renew, look up the price automatically
    if (method === "renew") {
      const [name, duration] = params as [string, number];
      const price = await publicClient.readContract({
        address: registryAddress,
        abi: ABI,
        functionName: "price",
        args: [name, BigInt(duration)],
      });
      txValue = price;
    }

    // If caller explicitly passes a value, override (e.g. for custom amounts)
    if (value !== undefined && value !== null) {
      txValue = BigInt(value);
    }

    const data = encodeFunctionData({
      abi: ABI,
      functionName: fnName as "renewFor",
      args: params,
    });

    const tx = await walletClient.sendTransaction({
      to: registryAddress,
      data,
      value: txValue,
    });

    // Wait for confirmation
    await publicClient.waitForTransactionReceipt({ hash: tx });

    return NextResponse.json({
      success: true,
      txHash: tx,
      relayer: account.address,
      method,
    });
  } catch (err: any) {
    console.error("Relayer call error:", err);
    return NextResponse.json(
      { error: err?.message || "Relayer transaction failed" },
      { status: 500 }
    );
  }
}