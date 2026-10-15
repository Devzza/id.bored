"use client";

import { useEffect, useState } from "react";
import { useReadContract } from "thirdweb/react";
import { boredRegistryContract } from "@/lib/thirdweb/contracts";
import { getResolve } from "@/lib/thirdweb/calls";
import {
  formatExpiry,
  shortAddr,
  parseLabel,
  isValidLabel,
} from "@/lib/bored";

/**
 * Buscar un nombre `.bored`.
 * Muestra si está registrado (nameExpiry > 0), cuándo expira y a qué
 * dirección resuelve (resolve — puede no estar configurado).
 */
export default function Lookup() {
  const [raw, setRaw] = useState("");
  const [queryLabel, setQueryLabel] = useState("");
  const [resolved, setResolved] = useState<string | null>(null);
  const [resolveLoading, setResolveLoading] = useState(false);

  const label = parseLabel(queryLabel);
  const valid = isValidLabel(label);

  const { data: expiry } = useReadContract({
    contract: boredRegistryContract(),
    method: "function nameExpiry(string name) view returns (uint256)",
    params: [label],
    queryOptions: { enabled: valid },
  });

  // La resolución puede revertir si no está configurada -> la capturamos.
  useEffect(() => {
    if (!valid) {
      setResolved(null);
      return;
    }
    let cancelled = false;
    setResolveLoading(true);
    getResolve(label)
      .then((r) => !cancelled && setResolved(r))
      .catch(() => !cancelled && setResolved(null))
      .finally(() => !cancelled && setResolveLoading(false));
    return () => {
      cancelled = true;
    };
  }, [label, valid]);

  const looked = queryLabel.trim().length > 0;
  const isRegistered = expiry !== undefined && expiry !== null && BigInt(expiry) > 0n;

  return (
    <section className="card">
      <h2 className="text-xl font-bold">Look up a name</h2>
      <p className="mt-1 text-sm text-gray-400">
        Check if it exists, when it expires, and what address it points to.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setQueryLabel(raw);
        }}
        className="mt-5 flex gap-2"
      >
        <div className="flex flex-1 items-center overflow-hidden rounded-xl border border-white/15 bg-black/30 focus-within:ring-2 focus-within:ring-blue-500/30">
          <input
            className="min-w-0 flex-1 bg-transparent px-4 py-3 text-sm outline-none placeholder:text-gray-500"
            placeholder="yourname"
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
          />
          <span className="pr-4 text-sm font-semibold text-blue-400">.bored</span>
        </div>
        <button type="submit" className="btn-primary" disabled={!isValidLabel(parseLabel(raw))}>
          Buscar
        </button>
      </form>

      {looked && valid && (
        <div className="mt-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-lg font-bold text-blue-300">
              {label}.<span className="text-blue-500">bored</span>
            </span>
            {isRegistered ? (
              <span className="chip bg-emerald-500/20 text-emerald-300">Registered</span>
            ) : (
              <span className="chip bg-amber-500/20 text-amber-300">Available</span>
            )}
          </div>

          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-black/20 p-3">
              <dt className="label">Expiry</dt>
              <dd className="font-mono text-sm">{formatExpiry(expiry as bigint | undefined)}</dd>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/20 p-3">
              <dt className="label">Resolves to</dt>
              <dd className="font-mono text-sm">
                {resolveLoading ? (
                  <span className="text-gray-500">…</span>
                ) : resolved ? (
                  shortAddr(resolved)
                ) : (
                  <span className="text-gray-500">—</span>
                )}
              </dd>
            </div>
          </dl>
        </div>
      )}
    </section>
  );
}
