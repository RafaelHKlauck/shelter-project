export type GeocodeResult = { lat: number; lng: number };

const USER_AGENT = "AdotaPet/0.1 (https://github.com/unisinos; contato@example.com)";

export async function geocode(query: string): Promise<GeocodeResult | null> {
  if (!query.trim()) return null;
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&accept-language=pt-BR`;
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

export function toWktPoint({ lat, lng }: GeocodeResult): string {
  return `SRID=4326;POINT(${lng} ${lat})`;
}
