"use client";

import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useReadContract } from "thirdweb/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUserIdentity } from "@/hooks/useUserIdentity";
import { boredRegistryContract } from "@/lib/thirdweb/contracts";
import {
  ONE_YEAR_SECONDS,
  formatToken,
  friendlyError,
  isValidLabel,
  parseLabel,
} from "@/lib/bored";
import AvatarSlider, { type AvatarOption } from "@/components/AvatarSlider";
import { AVATAR_OPTIONS, avatarSrc } from "@/lib/avatars";

const nativeSymbol = process.env.NEXT_PUBLIC_NATIVE_SYMBOL || "POL";

const TOTAL_STEPS = 3;

export default function OnboardingPage() {
  const { ready, authenticated, user, login, logout } = usePrivy();
  const { wallets } = useWallets();
  const ethWallet = wallets.find((w) => w.type === "ethereum");
  const address = ethWallet?.address ?? user?.wallet?.address;
  const { boredId } = useUserIdentity(address);
  const router = useRouter();

  const { data: nftBalance, isLoading: balanceLoading } = useReadContract({
    contract: boredRegistryContract(),
    method: "function balanceOf(address owner) view returns (uint256)",
    params: [address as `0x${string}`],
    queryOptions: { enabled: !!address },
  });
  const hasNft = nftBalance !== undefined && nftBalance > 0n;

  // Do not redirect while Privy is restoring a social session or creating the
  // embedded wallet. During that short window `authenticated` can be true but
  // `address` is still undefined; redirecting here races with /profile and
  // causes an onboarding <-> profile loop.
  useEffect(() => {
    if (ready && authenticated && address && !balanceLoading && hasNft) {
      router.replace("/profile");
    }
  }, [ready, authenticated, address, balanceLoading, hasNft, router]);

  const [step, setStep] = useState(0);
  const [raw, setRaw] = useState("");
  const [selectedImg, setSelectedImg] = useState<string | null>(null);
  const [minting, setMinting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const label = parseLabel(raw);
  const valid = isValidLabel(label);

  const { data: expiry, isLoading: expiryLoading } = useReadContract({
    contract: boredRegistryContract(),
    method: "function nameExpiry(string name) view returns (uint256)",
    params: [label],
    queryOptions: { enabled: valid },
  });
  const taken = expiry !== undefined && expiry !== null && BigInt(expiry) > 0n;

  const { data: priceWei, isLoading: priceLoading } = useReadContract({
    contract: boredRegistryContract(),
    method: "function price(string name, uint256 duration) view returns (uint256)",
    params: [label, BigInt(ONE_YEAR_SECONDS)],
    queryOptions: { enabled: valid && !taken && step >= 2 },
  });

  if (!ready) return <LoadingSplash />;
  if (!authenticated) return <Landing onLogin={login} />;
  if (!address || balanceLoading) return <LoadingSplash />;
  if (hasNft) return <LoadingSplash />;
  if (done) return <DoneScreen label={label} router={router} />;

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center px-6 py-14">
      <div className="absolute right-6 top-6 flex items-center gap-4">
        <StepDots current={step} total={TOTAL_STEPS} />
        <button onClick={logout} className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold transition hover:bg-white/10">Log out</button>
      </div>
      <div className="w-full max-w-lg">
        {step === 0 && (
          <NameStep raw={raw} setRaw={setRaw} valid={valid} taken={taken} expiryLoading={expiryLoading} label={label} onNext={() => setStep(1)} />
        )}
        {step === 1 && (
          <ImageStep selected={selectedImg} onSelect={setSelectedImg} onBack={() => setStep(0)} onNext={() => setStep(2)} />
        )}
        {step === 2 && (
          <ReviewStep label={label} selectedImg={selectedImg} priceEther={(priceWei !== undefined && priceWei !== null) ? formatToken(priceWei) : null} minting={minting} error={error} onBack={() => setStep(1)} onMint={async () => {
            if (!address || priceWei === undefined) return;
            setMinting(true); setError(null);
            try {
              // ── 1) Puja la imatge d'avatar escollida a IPFS (si n'hi ha) ──
              let imageIpfs: string | null = null;
              const imgSrc = avatarSrc(selectedImg);
              if (imgSrc) {
                const blob = await (await fetch(imgSrc)).blob();
                const fd = new FormData();
                fd.append("file", blob, imgSrc.split("/").pop() || "avatar.png");
                const up = await fetch("/api/ipfs/upload", { method: "POST", body: fd });
                const upData = await up.json();
                if (!up.ok) throw new Error(upData.error || "Failed to upload image");
                imageIpfs = `ipfs://${upData.IpfsHash}`;
              }

              // ── 2) Puja el JSON metadata (name + image) a IPFS ──
              let tokenIpfs: string | null = null;
              if (imageIpfs) {
                const meta = {
                  name: `${label}.bored`,
                  image: imageIpfs,
                  description: `Your .bored identity`,
                  external_url: `https://bored.works`,
                  attributes: [{ trait_type: "Name", value: label }],
                };
                const jr = await fetch("/api/ipfs/json", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ metadata: meta }),
                });
                const jd = await jr.json();
                if (!jr.ok) throw new Error(jd.error || "Failed to upload metadata");
                tokenIpfs = `ipfs://${jd.IpfsHash}`;
              }

              // ── 3) Mint (registerFor) ──
              const res = await fetch("/api/relay/register", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: label, user: address, duration: ONE_YEAR_SECONDS }),
              });
              const data = await res.json();
              if (!res.ok) throw new Error(data.error || "Relayer failed");

              // ── 4) Config complementària via relayer ──
              const forErrors: string[] = [];
              const calls: Record<string, unknown>[] = [
                { method: "setAddrFor", params: [label, address] },
                { method: "setNameForAddressFor", params: [label, address] },
              ];
              // Si tenim metadata a IPFS, l'enllacem al token (setTokenURIFor).
              if (tokenIpfs) {
                calls.push({ method: "setTokenURIFor", params: [label, tokenIpfs] });
              }
              for (const call of calls) {
                try {
                  const r = await fetch("/api/relay/for", {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(call),
                  });
                  const j = await r.json();
                  if (!r.ok) forErrors.push(`${call.method}: ${j.error}`);
                } catch (e: any) {
                  forErrors.push(`${call.method}: ${e?.message || "error"}`);
                }
              }

              if (forErrors.length > 0) {
                setError("Domain registered! But some config failed (you can fix it later):\n" + forErrors.join(" | "));
              }
              setDone(true);
            } catch (err) { setError(friendlyError(err)); }
            finally { setMinting(false); }
          }} />
        )}
      </div>
    </div>
  );
}

function NameStep({ raw, setRaw, valid, taken, expiryLoading, label, onNext }: any) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-black">Choose your id.bored</h1>
        <p className="mt-1 text-sm text-gray-400">This will be your identity.</p>
      </div>
      <div>
        <label className="label">Name</label>
        <div className="flex items-center overflow-hidden rounded-xl border border-white/15 bg-black/30 focus-within:ring-2 focus-within:ring-blue-500/30">
          <input className="min-w-0 flex-1 bg-transparent px-4 py-3 text-lg outline-none placeholder:text-gray-500" placeholder="yourname" value={raw} onChange={(e) => setRaw(e.target.value)} maxLength={32} autoFocus />
          <span className="pr-4 text-sm font-semibold text-blue-400">.bored</span>
        </div>
        {raw.trim().length > 0 && valid && (
          <p className="mt-2 text-sm">{expiryLoading ? <span className="text-gray-500">Checking…</span> : taken ? <span className="text-red-400">{label}.bored is taken</span> : <span className="text-emerald-400">Available ✓</span>}</p>
        )}
        {raw.trim().length > 0 && !valid && <p className="mt-2 text-xs text-amber-400">3-32 chars: lowercase, numbers, dash, underscore.</p>}
      </div>
      <button onClick={onNext} disabled={!valid || taken} className="btn-primary w-full py-3 text-lg disabled:opacity-40">{valid && !taken ? `Continue with ${label}.bored` : "Enter a name"}</button>
    </div>
  );
}

function ImageStep({ selected, onSelect, onBack, onNext }: any) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-black">Pick your avatar</h1>
        <p className="mt-1 text-sm text-gray-400">
          Choose your character silhouette. Use the arrows, keyboard or swipe.
        </p>
      </div>

      <AvatarSlider options={AVATAR_OPTIONS} selected={selected} onSelect={onSelect} />

      <div className="flex gap-3">
        <button onClick={onBack} className="btn-secondary flex-1 py-3">← Back</button>
        <button onClick={onNext} disabled={!selected} className="btn-primary flex-1 py-3 disabled:opacity-40">{selected ? "Continue" : "Pick one"}</button>
      </div>
    </div>
  );
}

function ReviewStep({ label, selectedImg, priceEther, minting, error, onBack, onMint }: any) {
  const preview = avatarSrc(selectedImg);
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-black">Review & confirm</h1>
        <p className="mt-1 text-sm text-gray-400">Everything is ready.</p>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 space-y-4">
        <div className="flex items-center justify-between"><span className="text-gray-400">Name</span><span className="text-lg font-bold">{label}.bored</span></div>
        <div className="h-px bg-white/10" />
        <div className="flex items-center justify-between"><span className="text-gray-400">Avatar</span>
          <div className="flex items-center gap-2">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt={selectedImg} className="h-10 w-10 rounded-lg object-contain" />
            ) : (
              <span className="text-sm text-gray-500">Default</span>
            )}
          </div>
        </div>
        <div className="h-px bg-white/10" />
        <div className="flex items-center justify-between text-lg"><span className="text-gray-400">Total</span><span className="font-mono font-bold text-blue-300">{priceEther ? `${priceEther} ${nativeSymbol}` : "—"}</span></div>
        <p className="text-[11px] text-gray-500">Gas sponsored by bored.works. Wallet + reverse resolution set automatically.</p>
      </div>
      {error && <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
      <div className="flex gap-3">
        <button onClick={onBack} className="btn-secondary flex-1 py-3" disabled={minting}>← Edit</button>
        <button onClick={onMint} disabled={minting} className="btn-primary flex-1 py-3 text-lg disabled:opacity-40">{minting ? "Registering…" : `Register ${label}.bored`}</button>
      </div>
    </div>
  );
}

function StepDots({ current, total }: { current: number; total: number }) {
  return <div className="flex gap-1.5">{Array.from({ length: total }, (_, i) => <div key={i} className={`h-2 w-2 rounded-full transition ${i <= current ? "bg-blue-500" : "bg-white/20"}`} />)}</div>;
}

function LoadingSplash() {
  return <div className="flex min-h-dvh items-center justify-center"><p className="text-gray-400">Loading…</p></div>;
}

function Landing({ onLogin }: { onLogin: () => void }) {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6 text-center">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(59,130,246,0.2)_0%,transparent_60%)]" />
      <div className="relative z-10 flex max-w-md flex-col items-center">
        <h1 className="text-5xl font-black tracking-tight">bored<span className="gradient-text">.works</span></h1>
        <p className="mt-4 text-gray-300">Your identity on <span className="font-semibold text-blue-400">.bored</span>.</p>
        <button onClick={onLogin} className="mt-8 rounded-full bg-blue-600 px-10 py-3.5 font-bold text-white shadow-xl shadow-blue-900/40 transition hover:scale-105 active:scale-95">Get started</button>
        <p className="mt-4 text-xs text-gray-500">Sign in with email or Google.</p>
      </div>
    </div>
  );
}

function DoneScreen({ label, router }: { label: string; router: ReturnType<typeof useRouter> }) {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6 text-center">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(59,130,246,0.2)_0%,transparent_60%)]" />
      <div className="relative z-10 flex max-w-md flex-col items-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/15 text-5xl">🎉</div>
        <h1 className="mt-6 text-4xl font-black tracking-tight"><span className="gradient-text">{label}.bored</span> is yours!</h1>
        <p className="mt-3 text-gray-300">Your wallet is linked and your avatar is set. You're ready.</p>
        <button onClick={() => router.push("/profile")} className="mt-8 rounded-full bg-blue-600 px-10 py-3.5 font-bold text-white shadow-xl shadow-blue-900/40 transition hover:scale-105 active:scale-95">Set up my profile →</button>
      </div>
    </div>
  );
}