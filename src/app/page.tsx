"use client";

import Link from "next/link";

export default function Home() {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6 text-center">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(124,58,237,0.2)_0%,transparent_60%)]" />

      <div className="relative z-10 flex max-w-2xl flex-col items-center">
        {/* Logo / Title */}
        <h1 className="text-6xl font-black tracking-tight sm:text-7xl">
          bored<span className="gradient-text">.works</span>
        </h1>
        <p className="mt-4 max-w-md text-lg text-gray-300">
          Your identity on <span className="font-semibold text-blue-400">.bored</span>.
          One name, everywhere.
        </p>

        {/* CTA */}
        <div className="mt-10 flex gap-4">
          <Link
            href="/onboarding"
            className="rounded-full bg-blue-600 px-10 py-3.5 font-bold text-white shadow-xl shadow-blue-900/40 transition hover:scale-105 active:scale-95"
          >
            Claim your id.bored
          </Link>
          <Link
            href="/profile"
            className="rounded-full border border-white/20 bg-white/5 px-8 py-3.5 font-semibold text-white transition hover:bg-white/10"
          >
            My profile
          </Link>
        </div>

        {/* Feature pills */}
        <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-6 text-left">
            <div className="text-2xl">👤</div>
            <h3 className="mt-2 font-semibold">Your identity</h3>
            <p className="mt-1 text-xs text-gray-400">
              Replace your wallet address with a name. Send and receive with id.bored.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-6 text-left">
            <div className="text-2xl">🎨</div>
            <h3 className="mt-2 font-semibold">Your style</h3>
            <p className="mt-1 text-xs text-gray-400">
              Pick an avatar image, set your profile, make it yours.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-6 text-left">
            <div className="text-2xl">🔗</div>
            <h3 className="mt-2 font-semibold">Your network</h3>
            <p className="mt-1 text-xs text-gray-400">
              Point your id.bored to any wallet. Resolve across apps.
            </p>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-14 text-xs text-gray-500">
          <p>
            bored<span className="text-blue-400">.works</span> &middot; Polygon Amoy testnet
          </p>
        </footer>
      </div>
    </main>
  );
}