export type GeocodeResult = { lat: number; lng: number };

const USER_AGENT =
  "AdotaPet/0.1 (Projeto Eng. Software Unisinos; rklauck@jungesbrothers.com)";

async function nominatim(query: string): Promise<GeocodeResult | null> {
  if (!query.trim()) return null;
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
      query,
    )}&format=json&limit=1&accept-language=pt-BR`;
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      next: { revalidate: 60 * 60 * 24 * 30 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Array<{ lat: string; lon: string }>;
    if (!data.length) return null;
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
}

export async function geocodeAddress(parts: {
  line?: string | null;
  number?: string | null;
  city: string;
  state: string;
  zip?: string | null;
}): Promise<GeocodeResult | null> {
  const queries: string[] = [];
  const cityState = `${parts.city}, ${parts.state}, Brazil`;

  if (parts.line) {
    queries.push(
      [
        parts.line,
        parts.number,
        parts.city,
        parts.state,
        "Brazil",
      ]
        .filter(Boolean)
        .join(", "),
    );
    queries.push(`${parts.line}, ${cityState}`);
  }
  if (parts.zip) queries.push(`${parts.zip}, ${cityState}`);
  queries.push(cityState);

  for (const q of queries) {
    const result = await nominatim(q);
    if (result) return result;
  }
  return null;
}

export async function geocode(query: string): Promise<GeocodeResult | null> {
  return nominatim(query);
}

export function toWktPoint({ lat, lng }: GeocodeResult): string {
  return `SRID=4326;POINT(${lng} ${lat})`;
}
