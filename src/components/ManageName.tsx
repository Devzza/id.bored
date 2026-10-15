"use client";

import { useReadContract } from "thirdweb/react";
import { useEffect, useState } from "react";
import { useEmbeddedWallet } from "@/hooks/useEmbeddedWallet";
import { boredRegistryContract } from "@/lib/thirdweb/contracts";
import { getResolve, getText, setAddrForGasless, setNameForAddressForGasless, setTextForGasless } from "@/lib/thirdweb/calls";
import { friendlyError, formatExpiry, isValidLabel, parseLabel, shortAddr } from "@/lib/bored";

const explorerUrl = process.env.NEXT_PUBLIC_EXPLORER_URL || "";

/**
 * Manage your `.bored`: address resolution (setAddr), reverse (setNameForAddress)
 * and avatar (setText). All writes go through the relayer (gasless).
 */
export default function ManageName() {
  const { wallet, address } = useEmbeddedWallet();
  const [raw, setRaw] = useState("");
  const [addrTarget, setAddrTarget] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const label = parseLabel(raw);
  const valid = isValidLabel(label);

  // Expiración -> saber si existe.
  const { data: expiry } = useReadContract({
    contract: boredRegistryContract(),
    method: "function nameExpiry(string name) view returns (uint256)",
    params: [label],
    queryOptions: { enabled: valid },
  });
  const exists = expiry !== undefined && expiry !== null && BigInt(expiry) > 0n;

  // Al cargar un nombre existente, rellena su resolución y avatar actuales.
  useEffect(() => {
    if (!valid || !exists) {
      setAddrTarget("");
      setAvatarUrl("");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const r = await getResolve(label);
        const a = await getText(label, "avatar");
        if (!cancelled) {
          setAddrTarget(r ?? "");
          setAvatarUrl(a ?? "");
        }
      } catch {
        /* noop */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [label, valid, exists]);

  const canWrite = valid && exists && !!wallet;

  async function saveAddr(e: React.FormEvent) {
    e.preventDefault();
    if (!canWrite || !wallet) return;
    setBusy("addr");
    setMsg(null);
    try {
      const result = await setAddrForGasless({
        label,
        target: (addrTarget || "").toLowerCase(),
      });
      setMsg({ ok: true, text: "Updated." + (explorerUrl ? ` Tx: ${result.txHash.slice(0, 12)}…` : "") });
    } catch (err) {
      setMsg({ ok: false, text: friendlyError(err) });
    } finally {
      setBusy(null);
    }
  }

  async function saveReverse(e: React.FormEvent) {
    e.preventDefault();
    if (!canWrite || !wallet) return;
    setBusy("reverse");
    setMsg(null);
    try {
      const result2 = await setNameForAddressForGasless({ label, user: address! });
      setMsg({
        ok: true,
        text: `Your wallet will now show as ${label}.bored.` +
          (explorerUrl ? ` Tx: ${result2.txHash.slice(0, 12)}…` : ""),
      });
    } catch (err) {
      setMsg({ ok: false, text: friendlyError(err) });
    } finally {
      setBusy(null);
    }
  }

  async function saveAvatar(e: React.FormEvent) {
    e.preventDefault();
    if (!canWrite || !wallet) return;
    setBusy("avatar");
    setMsg(null);
    try {
      const result3 = await setTextForGasless({
        label,
        key: "avatar",
        value: avatarUrl.trim(),
      });
      setMsg({ ok: true, text: "Saved." + (explorerUrl ? ` Tx: ${result3.txHash.slice(0, 12)}…` : "") });
    } catch (err) {
      setMsg({ ok: false, text: friendlyError(err) });
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="card">
      <h2 className="text-xl font-bold">Manage your name</h2>
      <p className="mt-1 text-sm text-gray-400">
        Set where your <span className="text-blue-400">.bored</span> points and its image.
      </p>

      {/* Name selector */}
      <div className="mt-5">
        <label className="label">Your name</label>
        <div className="flex items-center overflow-hidden rounded-xl border border-white/15 bg-black/30 focus-within:ring-2 focus-within:ring-blue-500/30">
          <input
            className="min-w-0 flex-1 bg-transparent px-4 py-3 text-sm outline-none placeholder:text-gray-500"
            placeholder="yourname"
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
          />
          <span className="pr-4 text-sm font-semibold text-blue-400">.bored</span>
        </div>
        {valid && !exists && (
          <p className="mt-1.5 text-xs text-amber-400">
            That name isn't registered yet.
          </p>
        )}
        {valid && exists && (
          <p className="mt-1.5 text-xs text-emerald-400/90">
            ✓ Registered — expires{" "}
            <span className="font-semibold text-white">{formatExpiry(expiry as bigint)}</span>
          </p>
        )}
      </div>

      {canWrite && (
        <div className="mt-5 space-y-5">
          {/* Resolution */}
          <form onSubmit={saveAddr} className="space-y-3">
            <div>
              <label className="label">Point to an address (resolution)</label>
              <input
                className="input"
                placeholder="0x… (empty = no resolution)"
                value={addrTarget}
                onChange={(e) => setAddrTarget(e.target.value)}
              />
              {addrTarget && (
                <p className="mt-1.5 text-xs text-gray-500">
                  {label}.bored will show instead of{" "}
                  <span className="font-mono">{shortAddr(addrTarget)}</span>.
                </p>
              )}
            </div>
            <button type="submit" className="btn-secondary w-full" disabled={busy !== null}>
              {busy === "addr" ? "Saving…" : "Save resolution"}
            </button>

            <button
              type="button"
              onClick={saveReverse}
              className="btn-primary w-full"
              disabled={busy !== null}
            >
              {busy === "reverse"
                ? "Setting up…"
                : `Show my wallet as ${label}.bored`}
            </button>
          </form>

          {/* Avatar */}
          <form onSubmit={saveAvatar} className="space-y-3 border-t border-white/10 pt-5">
            <label className="label">Avatar image</label>
            <div className="flex gap-3">
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-white/15 bg-black/30">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt="avatar" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-2xl">🖼️</div>
                )}
              </div>
              <input
                className="input flex-1"
                placeholder="https://… (image URL)"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
              />
            </div>
            <button type="submit" className="btn-secondary w-full" disabled={busy !== null}>
              {busy === "avatar" ? "Saving…" : "Save image"}
            </button>
          </form>
        </div>
      )}

      {msg && (
        <p
          className={`mt-4 rounded-xl p-3 text-sm ${
            msg.ok
              ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : "border border-red-500/30 bg-red-500/10 text-red-300"
          }`}
        >
          {msg.text}
        </p>
      )}
    </section>
  );
}
