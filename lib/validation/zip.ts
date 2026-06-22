export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export function formatZip(zip: string): string {
  const d = onlyDigits(zip).slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

export function isValidZip(zip: string): boolean {
  return onlyDigits(zip).length === 8;
}

export type ViaCepResult = {
  logradouro: string;
  bairro: string;
  localidade: string;
  uf: string;
};

export async function fetchCep(zip: string): Promise<ViaCepResult | null> {
  const d = onlyDigits(zip);
  if (d.length !== 8) return null;
  try {
    const res = await fetch(`https://viacep.com.br/ws/${d}/json/`, {
      next: { revalidate: 60 * 60 * 24 * 30 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.erro) return null;
    return {
      logradouro: data.logradouro ?? "",
      bairro: data.bairro ?? "",
      localidade: data.localidade ?? "",
      uf: data.uf ?? "",
    };
  } catch {
    return null;
  }
}
