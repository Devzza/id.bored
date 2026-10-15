import { NextRequest, NextResponse } from "next/server";

/**
 * Puja un JSON de metadata (per al tokenURI) a IPFS via Pinata i retorna el CID.
 *
 * Body: JSON { metadata: {...} } — es serialitza i es puja com a application/json.
 * Response: { IpfsHash }
 */
export async function POST(req: NextRequest) {
  try {
    const jwt = process.env.PINATA_JWT;
    if (!jwt) {
      return NextResponse.json({ error: "Pinata not configured (PINATA_JWT)" }, { status: 500 });
    }

    const { metadata } = await req.json().catch(() => ({ metadata: null }));
    if (!metadata || typeof metadata !== "object") {
      return NextResponse.json({ error: "Missing metadata object" }, { status: 400 });
    }

    // Construïm un form amb el JSON com a fitxer text.
    const body = new FormData();
    body.append(
      "file",
      new File([JSON.stringify(metadata)], "metadata.json", { type: "application/json" }),
    );
    body.append(
      "pinataMetadata",
      JSON.stringify({ name: "bored-metadata.json" }),
    );

    const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
      method: "POST",
      headers: { Authorization: `Bearer ${jwt}` },
      body,
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      return NextResponse.json(
        { error: data?.error || `Pinata failed (${res.status})` },
        { status: 502 },
      );
    }

    return NextResponse.json({ IpfsHash: data.IpfsHash });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "JSON upload failed" }, { status: 500 });
  }
}
