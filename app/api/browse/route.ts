import { NextRequest, NextResponse } from "next/server";
import supabase from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const year = searchParams.get("year");
  const status = searchParams.get("status");
  const search = searchParams.get("search");
  const page = parseInt(searchParams.get("page") ?? "1");
  const perPage = 24;

  let query = supabase
    .from("works")
    .select("id, title_id, status, year, number, frbr_uri, regulation_types(code)", { count: "exact" });

  if (type) query = query.eq("regulation_type_id", type);
  if (year) query = query.eq("year", parseInt(year));
  if (status) query = query.eq("status", status);
  if (search) query = query.ilike("title_id", `%${search}%`);

  const offset = (page - 1) * perPage;
  const { data, error, count } = await query
    .order("year", { ascending: false })
    .range(offset, offset + perPage - 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ total: count ?? 0, page, laws: data ?? [] });
}
