import { NextRequest, NextResponse } from "next/server";

const PASAL_API = "https://pasal.id/api/v1";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") ?? "";
  const year = searchParams.get("year") ?? "";
  const status = searchParams.get("status") ?? "";
  const search = searchParams.get("search") ?? "";
  const page = parseInt(searchParams.get("page") ?? "1");
  const perPage = 24;

  try {
    const params = new URLSearchParams({ limit: String(perPage), offset: String((page - 1) * perPage) });
    if (type) params.set("type", type);
    if (year) params.set("year", year);
    if (status) params.set("status", status);

    const res = await fetch(`${PASAL_API}/laws?${params}`, {
      headers: { "User-Agent": "PasalChat/1.0" },
    });

    if (!res.ok) return NextResponse.json({ total: 0, laws: [] });

    const data = await res.json();
    let laws = (data.laws ?? data.results ?? []) as Array<{
      frbr_uri: string; title?: string; title_id?: string;
      status: string; year: number; number: string; type?: string;
      regulation_types?: { code: string };
    }>;

    // Filter by search client-side if needed
    if (search) {
      laws = laws.filter((l) =>
        (l.title ?? l.title_id ?? "").toLowerCase().includes(search.toLowerCase())
      );
    }

    return NextResponse.json({
      total: data.total ?? laws.length,
      page,
      laws: laws.map((l) => ({
        id: l.frbr_uri,
        title_id: l.title ?? l.title_id ?? "",
        status: l.status,
        year: l.year,
        number: l.number,
        frbr_uri: l.frbr_uri,
        regulation_types: l.regulation_types ?? { code: l.type ?? "" },
      })),
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
