import { NextRequest, NextResponse } from "next/server";

/**
 * Puja un fitxer (imatge/metadata) a IPFS via Pinata i retorna el CID.
 *
 * Body: multipart/form-data amb un camp "file".
 * Response: { IpfsHash } amb el CID (format `ipfs://CID`).
 */
export async function POST(req: NextRequest) {
  try {
    const jwt = process.env.PINATA_JWT;
    if (!jwt) {
      return NextResponse.json({ error: "Pinata not configured (PINATA_JWT)" }, { status: 500 });
    }

    const formData = await req.formData();
    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

    // Pinata rep el body com a raw. Construïm el form amb el fitxer i pinataMetadata.
    const body = new FormData();
    body.append("file", file);
    body.append(
      "pinataMetadata",
      JSON.stringify({ name: file.name || "bored-upload" }),
    );

    const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
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
    return NextResponse.json({ error: err?.message || "Upload failed" }, { status: 500 });
  }
}
