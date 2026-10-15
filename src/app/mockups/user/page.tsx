"use client";

import { useState } from "react";
import ProfileButton from "@/components/mockups/ProfileButton";

/**
 * MOCKUP — Perfil de pizza.bored con estética "coleccionable" tipo Azuki.
 * Fondo gris claro, acento amarillo suave (pizza), bordes negros gruesos tipo
 * manga / flat, SIN sombras ni glow. Estructura de tarjeta coleccionable con
 * banner "Bored ID #0001". Auto-contenido (no usa las clases oscuras globales).
 */
export default function MockupUserProfile() {
  const [copied, setCopied] = useState(false);
  const address = "0x1234567890abcdef";
  const name = "pizza.bored";

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
    // Fondo gris claro propio — oculta el body oscuro global.
    <div
      className="relative min-h-dvh overflow-hidden"
      style={{ backgroundColor: "#eceae9" }}
    >
      {/* Botón de perfil — esquina superior derecha (modo claro) */}
      <div className="absolute right-6 top-6 z-20">
        <ProfileButton
          name={name}
          address={address}
          avatarUrl="/pizza.jpg"
          light
          onLogout={() => alert("logout (mock)")}
        />
      </div>

      {/* Contenido del perfil */}
      <div className="relative z-10 mx-auto flex max-w-md flex-col items-center px-6 py-16">
        {/* ===== Tarjeta coleccionable estilo Azuki ===== */}
        <div
          className="w-full overflow-hidden rounded-2xl border-[3px] border-[#1c1917]"
          style={{ backgroundColor: "#f7f4ef" }}
        >
          {/* Banner superior "Bored ID" */}
          <div
            className="flex items-center justify-between border-b-[3px] border-[#1c1917] px-4 py-2"
            style={{ backgroundColor: "#d99a24" }}
          >
            <span className="text-[11px] font-black uppercase tracking-widest text-[#1c1917]">
              Bored ID
            </span>
            <span className="rounded-full border-2 border-[#1c1917] bg-[#f7f4ef] px-2.5 py-0.5 font-mono text-[11px] font-black text-[#1c1917]">
              #0001
            </span>
          </div>

          {/* PFP grande plana, sin glow */}
          <div className="flex flex-col items-center pt-8">
            <div
              className="rounded-full border-4 border-[#1c1917] bg-[#d99a24] p-1"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/pizza.jpg"
                alt={name}
                className="h-28 w-28 rounded-full border-2 border-[#1c1917] object-cover"
              />
            </div>

            {/* Nombre */}
            <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-[#1c1917]">
              pizza<span style={{ color: "#d99a24" }}>.</span>bored
            </h1>

            {/* Dirección + copiar */}
            <div
              className="mt-4 flex items-center gap-2 rounded-full border-2 border-[#1c1917] px-4 py-1.5"
              style={{ backgroundColor: "#ffffff" }}
            >
              <span className="font-mono text-sm font-semibold text-[#8a8378]">
                {address}
              </span>
              <button
                onClick={copy}
                className="rounded-full border-2 border-[#1c1917] bg-[#1c1917] px-2.5 py-1 text-[11px] font-bold text-white transition active:scale-95"
              >
                {copied ? "✓" : "⧉"}
              </button>
            </div>

            {/* Biografía */}
            <p className="mt-5 max-w-sm px-6 text-sm leading-relaxed text-[#6b6159]">
              Esta es la identidad{" "}
              <span className="font-bold text-[#1c1917]">pizza.bored</span> en
              bored.works. Un solo nombre que te representa.
            </p>

            {/* Stats */}
            <div className="mt-7 grid w-full grid-cols-3 gap-0 border-t-[3px] border-[#1c1917]">
              {[
                { n: "2041", l: "Followers" },
                { n: "2241", l: "Following" },
                { n: "3", l: "Links" },
              ].map((s) => (
                <div
                  key={s.l}
                  className="flex flex-col items-center border-r-[3px] border-[#1c1917] py-5 last:border-r-0"
                  style={{ backgroundColor: "#ffffff" }}
                >
                  <span className="text-2xl font-black text-[#1c1917]">
                    {s.n}
                  </span>
                  <span className="mt-0.5 text-[11px] font-bold uppercase tracking-wide text-[#9a8f86]">
                    {s.l}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Botón de acción */}
        <button
          className="mt-8 w-full rounded-full border-[3px] border-[#1c1917] bg-[#d99a24] py-3.5 text-base font-black text-[#1c1917] transition active:translate-y-0.5 active:shadow-none"
          style={{ boxShadow: "4px 4px 0 0 #1c1917" }}
        >
          Share profile
        </button>
      </div>
    </div>
  );
}
