"use client";

import { useReadContract } from "thirdweb/react";
import { useState } from "react";
import { useEmbeddedWallet } from "@/hooks/useEmbeddedWallet";
import { boredRegistryContract } from "@/lib/thirdweb/contracts";
import { registerName, setTextRecord } from "@/lib/thirdweb/calls";
import {
  DURATION_OPTIONS,
  ONE_YEAR_SECONDS,
  formatToken,
  friendlyError,
  isValidLabel,
  parseLabel,
} from "@/lib/bored";
import { getActiveChain } from "@/lib/chains";

const nativeSymbol = process.env.NEXT_PUBLIC_NATIVE_SYMBOL || "POL";
const explorerUrl = process.env.NEXT_PUBLIC_EXPLORER_URL || "";
const chain = getActiveChain();

// Image catalog (SVG placeholders). Real images will be uploaded to IPFS via Pinata.
const IMAGE_CATALOG = [
  { id: "default", label: "Classic", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><rect width="400" height="400" fill="#6d28d9"/><text x="200" y="220" text-anchor="middle" font-family="sans-serif" font-size="48" font-weight="bold" fill="white">id.bored</text></svg>` },
  { id: "ocean", label: "Ocean", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><rect width="400" height="400" fill="#0ea5e9"/><circle cx="200" cy="180" r="80" fill="#38bdf8" opacity="0.5"/><text x="200" y="230" text-anchor="middle" font-family="sans-serif" font-size="36" font-weight="bold" fill="white">id.bored</text></svg>` },
  { id: "sunset", label: "Sunset", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><rect width="400" height="400" fill="#dc2626"/><rect y="200" width="400" height="200" fill="#fbbf24"/><text x="200" y="260" text-anchor="middle" font-family="sans-serif" font-size="36" font-weight="bold" fill="white">id.bored</text></svg>` },
  { id: "space", label: "Space", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><rect width="400" height="400" fill="#1e1b4b"/><circle cx="250" cy="100" r="20" fill="#fde047"/><circle cx="100" cy="250" r="5" fill="white"/><text x="200" y="280" text-anchor="middle" font-family="sans-serif" font-size="36" font-weight="bold" fill="white">id.bored</text></svg>` },
  { id: "forest", label: "Forest", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><rect width="400" height="400" fill="#166534"/><polygon points="200,50 120,200 280,200" fill="#22c55e" opacity="0.7"/><text x="200" y="260" text-anchor="middle" font-family="sans-serif" font-size="36" font-weight="bold" fill="white">id.bored</text></svg>` },
];

export default function RegisterForm() {
  const { wallet, address } = useEmbeddedWallet();
  const [raw, setRaw] = useState("");
  const [duration, setDuration] = useState<number>(ONE_YEAR_SECONDS);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ hash: string; tokenId?: bigint } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedImg, setSelectedImg] = useState<string | null>(null);

  const label = parseLabel(raw);
  const valid = isValidLabel(label);

  // Live price
  const { data: priceWei, isLoading: priceLoading } = useReadContract({
    contract: boredRegistryContract(),
    method: "function price(string name, uint256 duration) view returns (uint256)",
    params: [label, BigInt(duration)],
    queryOptions: { enabled: valid },
  });

  const priceEther = priceWei !== undefined && priceWei !== null ? formatToken(priceWei) : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setDone(null);
    if (!valid || !wallet || !address || priceWei === undefined) return;
    setBusy(true);
    try {
      const receipt = await registerName({
        privyWallet: wallet,
        label,
        owner: address,
        duration,
        value: priceWei,
      });

      // If user picked an image, set it as avatar (works on V1 via text records)
      let tokenId: bigint | undefined;
      if (selectedImg) {
        try {
          const chosen = IMAGE_CATALOG.find((i) => i.id === selectedImg);
          if (chosen) {
            const dataUri = `data:image/svg+xml,${encodeURIComponent(chosen.svg)}`;
            await setTextRecord({
              privyWallet: wallet,
              label,
              key: "avatar",
              value: dataUri,
            });
            // TODO: upload SVG to IPFS via Pinata, then setTextRecord with ipfs:// URL
          }
        } catch {
          // non-fatal
        }
      }

      setDone({ hash: receipt.transactionHash, tokenId });
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  const canSubmit = valid && !!wallet && !!address && !!confirm && priceWei !== undefined && !busy;

  return (
    <section className="card">
      <h2 className="text-xl font-bold">Register your name</h2>
      <p className="mt-1 text-sm text-gray-400">
        Get your <span className="text-blue-400">id.bored</span>, your unique identity.
      </p>

      <form onSubmit={submit} className="mt-5 space-y-5">
        <div>
          <label className="label">Name</label>
          <div className="flex items-center overflow-hidden rounded-xl border border-white/15 bg-black/30 focus-within:ring-2 focus-within:ring-blue-500/30">
            <input
              className="min-w-0 flex-1 bg-transparent px-4 py-3 text-sm outline-none placeholder:text-gray-500"
              placeholder="yourname"
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              maxLength={32}
            />
            <span className="pr-4 text-sm font-semibold text-blue-400">.bored</span>
          </div>
          {raw.trim().length > 0 && !valid && (
            <p className="mt-1.5 text-xs text-amber-400">
              3–32 chars: lowercase letters, numbers, hyphens and underscores only.
            </p>
          )}
        </div>

        <div>
          <label className="label">Duration</label>
          <div className="flex flex-wrap gap-2">
            {DURATION_OPTIONS.map((o) => (
              <button
                key={o.seconds}
                type="button"
                onClick={() => setDuration(o.seconds)}
                className={`rounded-full border px-4 py-2 text-sm transition ${
                  duration === o.seconds
                    ? "border-blue-400 bg-blue-600/30 text-white"
                    : "border-white/10 bg-white/5 text-gray-300 hover:bg-white/10"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        {/* Image catalog — user picks before minting */}
        <div>
          <label className="label">Pick your image</label>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
            {IMAGE_CATALOG.map((img) => (
              <button
                key={img.id}
                type="button"
                onClick={() => setSelectedImg(img.id)}
                className={`relative overflow-hidden rounded-xl border-2 transition ${
                  selectedImg === img.id
                    ? "border-blue-400 ring-2 ring-blue-500/40"
                    : "border-white/10 hover:border-white/30"
                }`}
              >
                <img
                  src={`data:image/svg+xml,${encodeURIComponent(img.svg)}`}
                  alt={img.label}
                  className="aspect-square w-full object-cover"
                />
                <span className="absolute bottom-0 left-0 right-0 bg-black/60 py-1 text-center text-[10px] font-medium text-white">
                  {img.label}
                </span>
              </button>
            ))}
          </div>
          {selectedImg && (
            <p className="mt-1.5 text-xs text-blue-400">
              ✨ You picked: {IMAGE_CATALOG.find((i) => i.id === selectedImg)?.label}. It will be set as your avatar.
            </p>
          )}
        </div>

        <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Price</span>
            <span className="font-mono font-semibold text-blue-300">
              {priceLoading ? "loading…" : priceEther ? `${priceEther} ${nativeSymbol}` : "—"}
            </span>
          </div>
        </div>

        {valid && (
          <label className="flex items-center gap-2 text-sm text-gray-300">
            <input
              type="checkbox"
              checked={confirm}
              onChange={(e) => setConfirm(e.target.checked)}
              className="h-4 w-4 rounded accent-blue-500"
            />
            I confirm the payment of{" "}
            <span className="font-mono text-blue-300">
              {priceEther ? `${priceEther} ${nativeSymbol}` : "—"}
            </span>{" "}
            to register <span className="font-semibold">{label}.bored</span>.
          </label>
        )}

        <button type="submit" className="btn-primary w-full" disabled={!canSubmit}>
          {busy ? "Confirming…" : `Register ${label || "…"}.bored`}
        </button>

        {done && (
          <div className="space-y-1 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300">
            <p className="font-semibold">Done! {label}.bored is now registered.</p>
            {done.tokenId !== undefined && (
              <p>
                Token ID: <span className="font-mono">{done.tokenId.toString()}</span>
              </p>
            )}
            {explorerUrl && done.hash && (
              <a
                href={`${explorerUrl}/tx/${done.hash}`}
                target="_blank"
                rel="noreferrer"
                className="text-blue-400 underline"
              >
                View transaction
              </a>
            )}
          </div>
        )}

        {error && (
          <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
            {error}
          </p>
        )}
      </form>
      <p className="mt-3 text-[11px] text-gray-500">Network: {chain.name}</p>
    </section>
  );
}