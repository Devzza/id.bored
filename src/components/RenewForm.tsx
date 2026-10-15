"use client";

import { useReadContract } from "thirdweb/react";
import { useState } from "react";
import { useEmbeddedWallet } from "@/hooks/useEmbeddedWallet";
import { boredRegistryContract } from "@/lib/thirdweb/contracts";
import { renewNameGasless } from "@/lib/thirdweb/calls";
import {
  DURATION_OPTIONS,
  ONE_YEAR_SECONDS,
  formatExpiry,
  formatToken,
  friendlyError,
  isValidLabel,
  parseLabel,
} from "@/lib/bored";

const nativeSymbol = process.env.NEXT_PUBLIC_NATIVE_SYMBOL || "POL";
const explorerUrl = process.env.NEXT_PUBLIC_EXPLORER_URL || "";

export default function RenewForm() {
  const { wallet } = useEmbeddedWallet();
  const [raw, setRaw] = useState("");
  const [duration, setDuration] = useState<number>(ONE_YEAR_SECONDS);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const label = parseLabel(raw);
  const valid = isValidLabel(label);

  const { data: priceWei, isLoading: priceLoading } = useReadContract({
    contract: boredRegistryContract(),
    method: "function price(string name, uint256 duration) view returns (uint256)",
    params: [label, BigInt(duration)],
    queryOptions: { enabled: valid },
  });

  const { data: expiry } = useReadContract({
    contract: boredRegistryContract(),
    method: "function nameExpiry(string name) view returns (uint256)",
    params: [label],
    queryOptions: { enabled: valid },
  });

  const priceEther = priceWei !== undefined && priceWei !== null ? formatToken(priceWei) : null;
  const exists = expiry !== undefined && expiry !== null && BigInt(expiry) > 0n;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setDone(null);
    if (!valid || !wallet || priceWei === undefined) return;
    setBusy(true);
    try {
      const result = await renewNameGasless({
        label,
        duration,
      });
      setDone(result.txHash);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  const canSubmit = valid && !!wallet && priceWei !== undefined && !busy;

  return (
    <section className="card">
      <h2 className="text-xl font-bold">Renew your name</h2>
      <p className="mt-1 text-sm text-gray-400">
        Extend the validity of your <span className="text-blue-400">id.bored</span> name.
      </p>

      <form onSubmit={submit} className="mt-5 space-y-5">
        <div>
          <label className="label">Existing name</label>
          <div className="flex items-center overflow-hidden rounded-xl border border-white/15 bg-black/30 focus-within:ring-2 focus-within:ring-blue-500/30">
            <input
              className="min-w-0 flex-1 bg-transparent px-4 py-3 text-sm outline-none placeholder:text-gray-500"
              placeholder="yourname"
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
            />
            <span className="pr-4 text-sm font-semibold text-blue-400">.bored</span>
          </div>
          {exists && (
            <p className="mt-1.5 text-xs text-gray-400">
              Expires {formatExpiry(expiry as bigint)}.
            </p>
          )}
        </div>

        <div>
          <label className="label">Add duration</label>
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

        <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Renewal cost</span>
            <span className="font-mono font-semibold text-blue-300">
              {priceLoading ? "loading…" : priceEther ? `${priceEther} ${nativeSymbol}` : "—"}
            </span>
          </div>
        </div>

        <button type="submit" className="btn-primary w-full" disabled={!canSubmit}>
          {busy ? "Confirming…" : `Renew ${label || "…"}.bored`}
        </button>

        {done && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300">
            ✅ Name renewed successfully.
            {explorerUrl && (
              <a
                href={`${explorerUrl}/tx/${done}`}
                target="_blank"
                rel="noreferrer"
                className="ml-1 text-blue-400 underline"
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
    </section>
  );
}
