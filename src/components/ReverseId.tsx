"use client";

import { useEffect, useState } from "react";
import { isAddress } from "viem";
import { useEmbeddedWallet } from "@/hooks/useEmbeddedWallet";
import { getNameOf } from "@/lib/thirdweb/calls";
import { shortAddr } from "@/lib/bored";

/**
 * Bored ID — resolución inversa.
 * Dada una dirección, muestra su nombre `.bored` (nameOf). Por defecto usa la
 * dirección de la wallet conectada: así el usuario ve su identidad en vez de
 * una ristra de números.
 */
export default function ReverseId() {
  const { address: connectedAddress } = useEmbeddedWallet();
  const [value, setValue] = useState(connectedAddress || "");
  const [name, setName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showInput, setShowInput] = useState(false);

  useEffect(() => {
    if (connectedAddress) setValue(connectedAddress);
  }, [connectedAddress]);

  useEffect(() => {
    if (!value || !isAddress(value)) {
      setName(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getNameOf(value)
      .then((n) => !cancelled && setName(n))
      .catch(() => !cancelled && setName(null))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [value]);

  const validAddr = !!value && isAddress(value);

  return (
    <section className="card">
      <h2 className="text-xl font-bold">Tu Bored ID</h2>
      <p className="mt-1 text-sm text-gray-400">
        En lugar de mostrar <span className="font-mono">0x1234…abcd</span>, muestra{" "}
        <span className="text-blue-400">tu-nombre.bored</span>.
      </p>

      <div className="mt-5 flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/20 p-3">
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-wide text-gray-500">Dirección</div>
          <div className="truncate font-mono text-sm" title={value}>
            {validAddr ? shortAddr(value) : "—"}
          </div>
        </div>
        <span
          className={`chip ${
            loading
              ? "bg-gray-500/20 text-gray-300"
              : name
              ? "bg-blue-600/30 text-blue-300"
              : "bg-gray-500/20 text-gray-400"
          }`}
        >
          {loading ? "…" : name ? <span>{name}.bored ✓</span> : "sin Bored ID"}
        </span>
      </div>

      <button
        onClick={() => setShowInput((s) => !s)}
        className="mt-3 text-xs text-blue-400 underline hover:text-blue-300"
      >
        {showInput ? "Ocultar" : "Buscar otra dirección"}
      </button>

      {showInput && (
        <input
          className="input mt-3"
          placeholder="0x…"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      )}

      {name && validAddr && (
        <p className="mt-3 rounded-xl border border-blue-500/30 bg-blue-600/10 p-3 text-sm">
          Este identificador se muestra como{" "}
          <span className="font-semibold text-blue-300">{name}.bored</span> en lugar de{" "}
          {shortAddr(value)}.
        </p>
      )}
    </section>
  );
}
