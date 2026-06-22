import { NextResponse, type NextRequest } from "next/server";
import { geocode } from "@/lib/geo/geocode";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q");
  if (!q) return NextResponse.json({ error: "missing q" }, { status: 400 });
  const result = await geocode(q);
  if (!result) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(result);
}
