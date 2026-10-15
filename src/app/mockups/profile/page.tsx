"use client";

import ProfileButton from "@/components/mockups/ProfileButton";

/**
 * MOCKUP de UI — Página de vista previa del botón de acceso al perfil.
 * Muestra cómo se vería el botón (PFP + pizza.bored) en distintas variantes
 * y estados. Sin lógica real todavía.
 */
export default function MockupsProfilePage() {
  return (
    <div className="mx-auto min-h-dvh max-w-3xl px-6 py-14">
      <header className="mb-12 text-center">
        <span className="chip border border-blue-500/40 bg-blue-600/20 text-blue-300">
          Mockup · perfil
        </span>
        <h1 className="mt-4 text-4xl font-black">
          Botón de <span className="gradient-text">acceso al perfil</span>
        </h1>
        <p className="mx-auto mt-2 max-w-lg text-sm text-gray-400">
          Cómo se vería el botón de perfil (como el de logout, pero mostrando tu PFP y{" "}
          <span className="font-semibold text-blue-400">pizza.bored</span>) en la barra
          superior de la app.
        </p>
      </header>

      {/* Barra simulando la parte superior de una sección logueada */}
      <div className="flex flex-wrap items-center gap-10 rounded-3xl border border-white/10 bg-white/[0.03] p-8">
        {/* Variante 1: con PFP de imagen */}
        <div>
          <p className="mb-3 text-[11px] uppercase tracking-wide text-gray-500">con PFP (avatar)</p>
          <ProfileButton
            name="pizza.bored"
            address="0x1234567890abcdef"
            avatarUrl="/pizza.jpg"
          />
        </div>

        {/* Variante 2: sin PFP (fallback con inicial) */}
        <div>
          <p className="mb-3 text-[11px] uppercase tracking-wide text-gray-500">sin PFP (fallback)</p>
          <ProfileButton
            name="pizza.bored"
            address="0x1234567890abcdef"
            onLogout={() => alert("logout (mock)")}
          />
        </div>
      </div>

      <p className="mt-8 text-center text-xs text-gray-500">
        Botón cerrado → click → abre dropdown con PFP grande, nombre, dirección y acciones.
      </p>
    </div>
  );
}
