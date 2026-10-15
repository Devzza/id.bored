"use client";

import { useReadContract } from "thirdweb/react";
import { useState } from "react";
import { useEmbeddedWallet } from "@/hooks/useEmbeddedWallet";
import { boredRegistryContract } from "@/lib/thirdweb/contracts";
import { registerName, setAddrName, setNameForAddress } from "@/lib/thirdweb/calls";
import {
  ONE_YEAR_SECONDS,
  formatToken,
  friendlyError,
  isValidLabel,
  parseLabel,
} from "@/lib/bored";

const nativeSymbol = process.env.NEXT_PUBLIC_NATIVE_SYMBOL || "POL";
const explorerUrl = process.env.NEXT_PUBLIC_EXPLORER_URL || "";

export type OnboardingStep = "pick" | "minting" | "done";

/**
 * Single onboarding modal.
 *
 * A freshly logged-in user (with no `.bored` yet) picks a name in one step.
 * On confirm it:
 *   1. mints: register(name, owner=wallet, duration)
 *   2. resolution: setAddr(name -> wallet)
 *   3. reverse resolution: setNameForAddress (wallet shows as name.bored)
 *
 * Everything runs inside the flow (in production the gas is sponsored by a
 * relayer; here we use Privy's embedded wallet).
 */
export default function OnboardingModal({
  onComplete,
}: {
  onComplete: (label: string, address: string) => void;
}) {
  const { wallet, address } = useEmbeddedWallet();
  const [raw, setRaw] = useState("");
  const [step, setStep] = useState<OnboardingStep>("pick");
  const [doneLabel, setDoneLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState("");

  const label = parseLabel(raw);
  const valid = isValidLabel(label);

  // Live availability: if expiry > 0, the name already exists.
  const { data: expiry, isLoading: expiryLoading } = useReadContract({
    contract: boredRegistryContract(),
    method: "function nameExpiry(string name) view returns (uint256)",
    params: [label],
    queryOptions: { enabled: valid },
  });
  const taken = expiry !== undefined && expiry !== null && BigInt(expiry) > 0n;

  // Live price (price(name, duration)).
  const { data: priceWei, isLoading: priceLoading } = useReadContract({
    contract: boredRegistryContract(),
    method: "function price(string name, uint256 duration) view returns (uint256)",
    params: [label, BigInt(ONE_YEAR_SECONDS)],
    queryOptions: { enabled: valid && !taken },
  });
  const priceEther = priceWei !== undefined && priceWei !== null ? formatToken(priceWei) : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || taken || !wallet || !address || priceWei === undefined) return;
    setError(null);
    setStep("minting");
    try {
      // 1) Mint
      await registerName({
        privyWallet: wallet,
        label,
        owner: address,
        duration: ONE_YEAR_SECONDS,
        value: priceWei,
      });
      // 2) Point the domain at the user's wallet
      await setAddrName({ privyWallet: wallet, label, target: address as `0x${string}` });
      // 3) Reverse resolution: the wallet shows as label.bored
      const reverse = await setNameForAddress({ privyWallet: wallet, label });

      setDoneLabel(label);
      setTxHash(reverse.transactionHash);
      setStep("done");
    } catch (err) {
      setError(friendlyError(err));
      setStep("pick");
    }
  }

  const canSubmit =
    valid && !taken && !!wallet && !!address && priceWei !== undefined && step === "pick";

  const short = address
    ? address.length > 10
      ? `${address.slice(0, 6)}…${address.slice(-4)}`
      : address
    : "…";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Dimmed background */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-white/15 bg-[#150d26] p-8 shadow-2xl">
        {/* "pick" step header */}
        {step === "pick" && (
          <>
            <div className="mb-1 text-center">
              <span className="chip border border-blue-500/40 bg-blue-600/20 text-blue-300">
                Welcome · pick your name
              </span>
            </div>
            <h2 className="mt-3 text-center text-3xl font-black">
              Your <span className="gradient-text">id.bored</span>
            </h2>
            <p className="mt-2 text-center text-sm text-gray-400">
              One name that represents you in the Bored Universe.
            </p>

            <form onSubmit={submit} className="mt-6 space-y-5">
              <div>
                <label className="label">Name</label>
                <div className="flex items-center overflow-hidden rounded-xl border border-white/15 bg-black/30 focus-within:ring-2 focus-within:ring-blue-500/30">
                  <input
                    className="min-w-0 flex-1 bg-transparent px-4 py-3.5 text-lg font-semibold outline-none placeholder:text-gray-600"
                    placeholder="pizza"
                    value={raw}
                    onChange={(e) => setRaw(e.target.value)}
                    maxLength={32}
                    autoFocus
                  />
                  <span className="pr-4 text-lg font-semibold text-blue-400">.bored</span>
                </div>

                {raw.trim().length > 0 && valid && (
                  <p className="mt-2 text-sm">
                    {expiryLoading ? (
                      <span className="text-gray-500">Checking…</span>
                    ) : taken ? (
                      <span className="text-red-400">
                        {label}.bored is taken. Try another one.
                      </span>
                    ) : (
                      <span className="text-emerald-400">
                        {label}.bored is available ✓
                      </span>
                    )}
                  </p>
                )}
                {raw.trim().length > 0 && !valid && (
                  <p className="mt-2 text-xs text-amber-400">
                    3 to 32 characters: lowercase, numbers, dash and underscore.
                  </p>
                )}
              </div>

              <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Price · 1 year</span>
                  <span className="font-mono font-semibold text-blue-300">
                    {priceLoading || expiryLoading
                      ? "calculating…"
                      : taken
                        ? "—"
                        : priceEther
                          ? `${priceEther} ${nativeSymbol}`
                          : "—"}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-gray-500">
                  Your name is created right now and your ID{" "}
                  <span className="font-mono text-blue-300">{short}</span> will show as{" "}
                  <span className="font-semibold">{label || "…"}.bored</span>.
                </p>
              </div>

              {error && (
                <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
                  {error}
                </p>
              )}

              <button
                type="submit"
                className="btn-primary w-full py-3.5 text-base"
                disabled={!canSubmit}
              >
                Get id.bored
              </button>
            </form>
          </>
        )}

        {/* Minting */}
        {step === "minting" && (
          <div className="flex flex-col items-center py-6 text-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500/30 border-t-blue-400" />
            <h2 className="mt-5 text-xl font-bold">Almost yours…</h2>
            <p className="mt-2 text-sm text-gray-400">
              Creating <span className="font-semibold text-blue-300">{label}.bored</span> and
              connecting it to your ID. One moment.
            </p>
          </div>
        )}

        {/* Done */}
        {step === "done" && (
          <div className="flex flex-col items-center py-2 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-3xl">
              🎉
            </div>
            <h2 className="mt-4 text-3xl font-black">
              {doneLabel}<span className="gradient-text">.bored</span>
            </h2>
            <p className="mt-1 font-mono text-sm text-gray-500">{short}</p>
            <p className="mt-4 max-w-xs text-sm text-gray-300">
              Your id is ready. From now on,{" "}
              <span className="font-semibold text-blue-300">{doneLabel}.bored</span> →
              <span className="font-mono text-blue-300">{short}</span>.
            </p>

            {explorerUrl && txHash && (
              <a
                href={`${explorerUrl}/tx/${txHash}`}
                target="_blank"
                rel="noreferrer"
                className="mt-3 text-xs text-blue-400 underline"
              >
                View transaction
              </a>
            )}

            <button
              onClick={() => onComplete(doneLabel, address!)}
              className="btn-primary mt-6 w-full py-3.5 text-base"
            >
              Enter {doneLabel}.bored
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
