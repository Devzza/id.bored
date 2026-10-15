"use client";

import { useState } from "react";
import AvatarSlider from "@/components/AvatarSlider";
import { AVATAR_OPTIONS, avatarIdFromSrc } from "@/lib/avatars";

const EXPLORER = process.env.NEXT_PUBLIC_EXPLORER_URL || "";

/**
 * "Manage my avatar" card shown on the profile for the name owner.
 *
 * Lets the owner pick a new avatar silhouette and writes the chosen public
 * URL on-chain via the relayer (gasless setTextFor). For now it's the
 * /avatars/ local URL; the on-chain story for NFTs comes later.
 */
export default function AvatarManager({
  name,
  currentSrc,
}: {
  name: string;
  currentSrc: string | null;
}) {
  const [selected, setSelected] = useState<string | null>(() =>
    avatarIdFromSrc(currentSrc),
  );
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const dirty = selected !== avatarIdFromSrc(currentSrc);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || !dirty || busy) return;
    setBusy(true);
    setMsg(null);
    try {
      const src = AVATAR_OPTIONS.find((o) => o.id === selected)?.src;
      if (!src) throw new Error("Bad avatar");

      const res = await fetch("/api/relay/for", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method: "setTextFor",
          params: [name, "avatar", src],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Relayer failed");

      setMsg({
        ok: true,
        text:
          "Avatar saved on-chain." +
          (EXPLORER ? ` ${EXPLORER}/tx/${data.txHash}` : ""),
      });
    } catch (err: any) {
      setMsg({ ok: false, text: err?.message || "Failed to save avatar" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card mt-10 w-full">
      <h2 className="text-xl font-bold">My avatar</h2>
      <p className="mt-1 text-sm text-gray-400">
        Pick a silhouette for <span className="text-blue-400">{name}.bored</span>.
        Gas is sponsored by bored.works.
      </p>

      <div className="mx-auto mt-5 max-w-xs">
        <AvatarSlider
          options={AVATAR_OPTIONS}
          selected={selected}
          onSelect={setSelected}
        />
      </div>

      <form onSubmit={save} className="mt-5">
        <button
          type="submit"
          disabled={!selected || !dirty || busy}
          className="btn-primary w-full"
        >
          {busy ? "Saving…" : dirty ? "Save avatar" : "Current avatar"}
        </button>
      </form>

      {msg && (
        <p
          className={`mt-3 rounded-xl p-3 text-sm ${
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
