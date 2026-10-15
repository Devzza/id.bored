"use client";

import { useEffect, useState } from "react";
import { isAddress, toWei } from "thirdweb/utils";
import { useEmbeddedWallet } from "@/hooks/useEmbeddedWallet";
import { getResolve, getNameOf, transferNative } from "@/lib/thirdweb/calls";
import { friendlyError, isValidLabel, parseLabel, shortAddr } from "@/lib/bored";

const nativeSymbol = process.env.NEXT_PUBLIC_NATIVE_SYMBOL || "POL";
const explorerUrl = process.env.NEXT_PUBLIC_EXPLORER_URL || "";

/**
 * Send native tokens (POL).
 * Destination can be an address (0x…) or an id.bored name, resolved via
 * the registry. If you enter an address, we also look up its reverse
 * resolution (id.bored) and show it.
 */
export default function TransferForm() {
  const { wallet, address } = useEmbeddedWallet();
  const [dest, setDest] = useState("");
  const [amount, setAmount] = useState("");
  const [resolvedDest, setResolvedDest] = useState<string | null>(null);
  const [destName, setDestName] = useState<string | null>(null); // reverse: address → id.bored
  const [resolving, setResolving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Is the destination an address or a name?
  const isAddr = isAddress(dest);
  const rawLabel = parseLabel(dest);
  const isName =
    dest.trim().length > 0 &&
    !isAddr &&
    (dest.toLowerCase().includes(".bored") || isValidLabel(rawLabel));

  // Resolve name → address (when user types a .bored name)
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!isName) {
        setResolvedDest(null);
        return;
      }
      setResolving(true);
      setResolvedDest(null);
      try {
        const r = await getResolve(rawLabel);
        if (!cancelled) setResolvedDest(r);
      } catch {
        if (!cancelled) setResolvedDest(null);
      } finally {
        if (!cancelled) setResolving(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [dest, isName, rawLabel]);

  // Reverse look up: address → id.bored (when user types an address)
  useEffect(() => {
    let cancelled = false;
    if (!isAddr) {
      setDestName(null);
      return;
    }
    getNameOf(dest)
      .then((n) => { if (!cancelled) setDestName(n); })
      .catch(() => { if (!cancelled) setDestName(null); });
    return () => { cancelled = true; };
  }, [dest, isAddr]);

  // Amount in wei
  const amountWei = (() => {
    const a = parseFloat(amount);
    if (!isNaN(a) && a > 0) {
      try { return toWei(amount); } catch { return undefined; }
    }
    return undefined;
  })();

  const target = isName ? resolvedDest || null : isAddr ? dest : null;
  const canSend = !!wallet && !!target && amountWei !== undefined && !busy && amountWei > 0n;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setDone(null);
    if (!wallet || !target || amountWei === undefined) return;
    setBusy(true);
    try {
      const receipt = await transferNative({ privyWallet: wallet, to: target, value: amountWei });
      setDone(receipt.transactionHash);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card">
      <h2 className="text-xl font-bold">Send {nativeSymbol}</h2>
      <p className="mt-1 text-sm text-gray-400">
        Send tokens to an address or an <span className="text-blue-400">id.bored</span>.
      </p>

      <form onSubmit={submit} className="mt-5 space-y-5">
        {/* Destination */}
        <div>
          <label className="label">Recipient</label>
          <input
            className="input"
            placeholder="0x… or name.bored"
            value={dest}
            onChange={(e) => setDest(e.target.value)}
          />
          {isName && (
            <div className="mt-1.5 text-xs">
              {resolving ? (
                <span className="text-gray-500">Resolving {rawLabel}.bored…</span>
              ) : resolvedDest ? (
                <span className="text-emerald-400">
                  👉 {rawLabel}.bored → <span className="font-mono">{shortAddr(resolvedDest)}</span>
                </span>
              ) : (
                <span className="text-amber-400">
                  {rawLabel}.bored has no address configured yet.
                </span>
              )}
            </div>
          )}
          {isAddr && (
            <div className="mt-1.5 text-xs">
              <span className="text-gray-500">
                Sending to <span className="font-mono">{shortAddr(dest)}</span>
              </span>
              {destName && (
                <span className="ml-2 text-blue-400 font-semibold">
                  · {destName}.bored
                </span>
              )}
            </div>
          )}
        </div>

        {/* Amount */}
        <div>
          <label className="label">Amount ({nativeSymbol})</label>
          <input
            className="input"
            type="number"
            min="0"
            step="any"
            inputMode="decimal"
            placeholder="0.0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>

        <button type="submit" className="btn-primary w-full" disabled={!canSend}>
          {busy
            ? "Sending…"
            : !target
            ? "Enter a valid destination"
            : `Send ${amount || "0"} ${nativeSymbol}`}
        </button>

        {done && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300">
            ✅ Transaction sent successfully.
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
      <p className="mt-3 text-[11px] text-gray-500">
        {address ? (
          <>
            Your address: <span className="font-mono">{shortAddr(address)}</span>
          </>
        ) : (
          "Connect to send."
        )}
      </p>
    </section>
  );
}