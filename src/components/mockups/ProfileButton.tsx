"use client";

import { useState } from "react";

/**
 * MOCKUP — Botón de acceso al perfil.
 *
 * Mismo patrón visual que el botón de logout de AuthGate, pero orientado al
 * perfil: muestra la PFP (avatar) y el nombre `pizza.bored`. Al pulsarlo abre
 * un dropdown de perfil (no funcional todavía, es una maqueta de UI).
 */
export default function ProfileButton({
  name = "pizza.bored",
  avatarUrl,
  address = "0x123456…abcd",
  onLogout,
  light = false,
}: {
  name?: string;
  avatarUrl?: string | null;
  address?: string;
  onLogout?: () => void;
  light?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* noop */
    }
  };

  return (
    <div className="relative">
      {/* Botón principal del perfil */}
      <button
        onClick={() => setOpen((o) => !o)}
        className={
          "group flex items-center gap-2.5 rounded-full border py-1.5 pl-1.5 pr-4 backdrop-blur transition " +
          (light
            ? "border-[#eadfd3] bg-white hover:bg-[#f7f1e9]"
            : "border-white/15 bg-white/5 hover:bg-white/10")
        }
      >
        {/* PFP (avatar) o fallback con inicial */}
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={name}
            className="h-8 w-8 rounded-full border object-cover"
          />
        ) : (
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#e1552b] to-[#f0aa50] text-sm font-black text-white">
            {name[0]?.toUpperCase() || "?"}
          </span>
        )}

        <span
          className={
            "max-w-[130px] truncate text-sm font-semibold " +
            (light ? "text-[#1c1917]" : "text-blue-300")
          }
        >
          {name}
        </span>

        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          className={"transition-transform " + (open ? "rotate-180" : "")}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M1 3l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Dropdown de perfil */}
      {open && (
        <div
          className={
            "absolute right-0 z-50 mt-2 w-72 overflow-hidden rounded-2xl border shadow-2xl " +
            (light
              ? "border-[#eadfd3] bg-[#ffffff]"
              : "border-white/15 bg-[#120b22]")
          }
        >
          {/* Cabecera con PFP grande + nombre */}
          <div
            className={
              "flex flex-col items-center border-b px-4 py-5 text-center " +
              (light ? "border-[#f0e7db]" : "border-white/10")
            }
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={name}
                className="h-16 w-16 rounded-full border-2 object-cover"
              />
            ) : (
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#e1552b] to-[#f0aa50] text-3xl font-black text-white">
                {name[0]?.toUpperCase() || "?"}
              </span>
            )}
            <div
              className={
                "mt-3 text-base font-extrabold " + (light ? "text-[#1c1917]" : "")
              }
            >
              {name}
            </div>
            <div
              className={
                "mt-1 font-mono text-xs " + (light ? "text-[#9a8f86]" : "text-gray-500")
              }
            >
              {address}
            </div>

            <button
              onClick={copy}
              className={
                "mt-3 rounded-full px-3 py-1.5 text-[11px] font-bold transition " +
                (light
                  ? "bg-[#1c1917] text-white hover:bg-[#333]"
                  : "bg-white/10 hover:bg-white/20")
              }
            >
              {copied ? "✓ Copied" : "Copy address"}
            </button>
          </div>

          {/* Acciones del perfil */}
          <div className="p-2 text-sm">
            <button
              className={
                "flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left font-semibold transition " +
                (light
                  ? "text-[#1c1917] hover:bg-[#f6f0e8]"
                  : "text-gray-200 hover:bg-white/10")
              }
            >
              <span className="w-5 text-center">👤</span> My profile
            </button>
            <button
              className={
                "flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left font-semibold transition " +
                (light
                  ? "text-[#1c1917] hover:bg-[#f6f0e8]"
                  : "text-gray-200 hover:bg-white/10")
              }
            >
              <span className="w-5 text-center">⚙️</span> Settings
            </button>
            <button
              onClick={onLogout}
              className={
                "flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left font-semibold transition " +
                (light
                  ? "text-[#e1552b] hover:bg-[#fdeee8]"
                  : "text-red-300 hover:bg-red-500/10")
              }
            >
              <span className="w-5 text-center">⏻</span> Log out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
