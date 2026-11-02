import { NextResponse } from "next/server";
const officialStates = new Set([
  11, 12, 13, 14, 15, 16, 17, 21, 22, 23, 24, 25, 26, 27, 28, 29, 31, 32, 33,
  35, 41, 42, 43, 50, 51, 52, 53,
]);
export async function GET(
  _: Request,
  { params }: { params: Promise<{ state: string }> },
) {
  const { state } = await params;
  if (!officialStates.has(Number(state)))
    return NextResponse.json({ message: "UF inválida" }, { status: 400 });
  try {
    const r = await fetch(
      `https://servicodados.ibge.gov.br/api/v3/malhas/estados/${state}?formato=application/vnd.geo+json&qualidade=minima&intrarregiao=municipio`,
      { next: { revalidate: 86400 }, signal: AbortSignal.timeout(20000) },
    );
    if (!r.ok) throw Error();
    return NextResponse.json(await r.json(), {
      headers: { "Cache-Control": "public, max-age=86400" },
    });
  } catch {
    return NextResponse.json(
      {
        message:
          "A malha municipal do IBGE está indisponível. Tente novamente.",
      },
      { status: 502 },
    );
  }
}
