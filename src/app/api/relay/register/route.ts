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
  "function registerFor(string name, address user, uint256 duration) payable returns (uint256)",
  "function price(string name, uint256 duration) view returns (uint256)",
]);

export async function POST(req: NextRequest) {
  try {
    const { name, user, duration } = await req.json();

    if (!name || !user || !duration) {
      return NextResponse.json({ error: "Missing name, user, or duration" }, { status: 400 });
    }

    const pkRaw = (process.env.RELAYER_PRIVATE_KEY || "").replace(/^0x/, "");
    if (!pkRaw || pkRaw.length !== 64) {
      return NextResponse.json({ error: "Relayer not configured (add RELAYER_PRIVATE_KEY to .env)" }, { status: 500 });
    }

    const registryAddress = (process.env.NEXT_PUBLIC_BORED_DOMAINS_ADDRESS || process.env.NEXT_PUBLIC_REGISTRY_ADDRESS) as `0x${string}`;
    if (!registryAddress) {
      return NextResponse.json({ error: "Contract address not configured (NEXT_PUBLIC_BORED_DOMAINS_ADDRESS)" }, { status: 500 });
    }

    const account = privateKeyToAccount(`0x${pkRaw}`);
    const chain = getActiveChain();
    const rpc = chain.rpcUrls.default.http[0];

    const publicClient = createPublicClient({ chain, transport: http(rpc) });

    // Get current price from contract
    const price = await publicClient.readContract({
      address: registryAddress,
      abi: ABI,
      functionName: "price",
      args: [name, BigInt(duration)],
    });

    // Send registerFor with relayer wallet
    const walletClient = createWalletClient({
      account,
      chain,
      transport: http(rpc),
    });

    const data = encodeFunctionData({
      abi: ABI,
      functionName: "registerFor",
      args: [name, user, BigInt(duration)],
    });

    const tx = await walletClient.sendTransaction({
      to: registryAddress,
      data,
      value: price,
    });

    // Wait for confirmation
    await publicClient.waitForTransactionReceipt({ hash: tx });

    return NextResponse.json({
      success: true,
      txHash: tx,
      relayer: account.address,
    });
  } catch (err: any) {
    console.error("Relayer error:", err);
    return NextResponse.json(
      { error: err?.message || "Relayer transaction failed" },
      { status: 500 }
    );
  }
}