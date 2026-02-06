import { NextResponse } from "next/server";

export async function GET() {
  const upstream = await fetch(
    "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd",
    {
      cache: "no-store",
      next: { revalidate: 60 },
    }
  );

  if (!upstream.ok) {
    return NextResponse.json({ error: "Upstream failed" }, { status: 502 });
  }

  const data = await upstream.json();
  const priceUsd = Number(data.solana.usd);

  return NextResponse.json({ priceUsd });
}
