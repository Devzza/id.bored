"use client";

import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useProfileData } from "@/hooks/useProfileData";

function ShortAddr({ address }: { address: string }) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export default function ProfilePage() {
  const [copied, setCopied] = useState(false);
  const { ready, authenticated, user, logout } = usePrivy();
  const { wallets } = useWallets();
  const ethWallet = wallets.find((w) => w.type === "ethereum");
  const address = ethWallet?.address ?? user?.wallet?.address;
  const router = useRouter();

  const data = useProfileData(address);

  // Quan l'usuari fa logout (o la sessió es perd), tornem a l'onboarding
  // en comptes de quedar-nos en "Loading…" per sempre.
  useEffect(() => {
    if (ready && !authenticated) {
      router.replace("/onboarding");
    }
  }, [ready, authenticated, router]);

  // Privy pot trigar un moment a restaurar el wallet embedded. Mirem fins i
  // quan ready && authenticated però address encara no ha carregat.
  if (!ready || (authenticated && !address)) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <p className="text-gray-400">Loading…</p>
      </div>
    );
  }

  if (!authenticated || !address) {
    return null; // l'efecte de dalt redirigeix a /onboarding
  }

  const expStr = data.expiry
    ? new Date(data.expiry * 1000).toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  // Avatar: utilitza la imatge de la metadata JSON del token (on-chain),
  // sinó la d'un text record "avatar", sinó l'inicial del nom.
  const preview = data.tokenImage ?? data.avatar;


  const handleCopy = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-6 py-10">
      {/* Top bar */}
      <div className="mb-12 flex items-center justify-between">
        <button
          onClick={() => router.push("/")}
          className="text-sm font-semibold text-blue-400 transition hover:text-blue-300"
        >
          ← Home
        </button>
        <div className="flex items-center gap-3">
          {data.polBalance !== null && (
            <span className="text-xs text-gray-500">
              {(Number(data.polBalance) / 1e18).toFixed(2)} POL
            </span>
          )}
          <button
            onClick={logout}
            className="rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-sm font-semibold transition hover:bg-white/10"
          >
            Log out
          </button>
        </div>
      </div>

      <section className="flex flex-col items-center text-center">
        {/* Avatar */}
        <div className="mx-auto flex h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 text-5xl font-black text-white shadow-lg shadow-blue-900/30">
          {data.loading ? (
            <span className="animate-pulse">…</span>
          ) : preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="avatar" className="h-full w-full object-cover" />
          ) : data.name ? (
            data.name[0]!.toUpperCase()
          ) : (
            address.slice(2, 4).toUpperCase()
          )}
        </div>

        {/* Name */}
        <h1 className="mt-5 text-4xl font-black tracking-tight">
          {data.tokenName ? (
            <span>{data.tokenName}</span>
          ) : data.name ? (
            <span>
              {data.name}
              <span className="text-blue-400">.bored</span>
            </span>
          ) : (
            <span className="text-gray-400">No id.bored yet</span>
          )}
        </h1>

        {data.name && expStr && (
          <p className="mt-1 text-sm text-gray-400">Expires {expStr}</p>
        )}

        {/* Address + copy */}
        <div className="mt-5 flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2">
          <span className="text-sm text-gray-300">
            <ShortAddr address={address} />
          </span>
          <button
            onClick={handleCopy}
            aria-label="Copy address"
            className="text-blue-400 transition hover:scale-110"
          >
            {copied ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            )}
          </button>
        </div>

        {/* Error / loading hints */}
        {data.error && (
          <p className="mt-3 text-xs text-red-400">⚠️ {data.error}</p>
        )}
        {!data.name && data.nftBalance && data.nftBalance > 0n && (
          <p className="mt-3 text-xs text-amber-400/80">
            You own a domain but reverse resolution isn't set.
          </p>
        )}
      </section>

      {/* My id.bored collection NFTs */}
      <section className="mt-10 w-full">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl font-bold">My id.bored</h2>
          {data.nfts.length > 0 && (
            <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-semibold">
              {data.nfts.length}
            </span>
          )}
        </div>

        {data.loading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : data.nfts.length === 0 ? (
          <p className="text-sm text-gray-500">
            No id.bored NFTs in this wallet yet.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {data.nfts.map((nft) => {
              const isImage = !!nft.image;
              return (
                <div
                  key={nft.tokenId.toString()}
                  className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]"
                >
                  <div className="aspect-square w-full overflow-hidden bg-black/30">
                    {isImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={nft.image!}
                        alt={nft.name || `id.bored #${nft.tokenId}`}
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-4xl font-black text-blue-400">
                        #
                      </div>
                    )}
                  </div>
                  <div className="p-2.5 text-center">
                    <p className="text-sm font-semibold">
                      {nft.name || `#${nft.tokenId.toString()}`}
                    </p>
                    {nft.uri && !isImage && (
                      <p className="mt-0.5 truncate text-[10px] text-gray-500">{nft.uri}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
