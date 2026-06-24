import type { Database } from "@/lib/supabase/types";

type Species = Database["public"]["Enums"]["animal_species"];
type Size = Database["public"]["Enums"]["animal_size"];

export const SPECIES_LABEL: Record<Species, string> = {
  dog: "Cachorro",
  cat: "Gato",
  other: "Outro",
};

export const SIZE_LABEL: Record<Size, string> = {
  small: "Pequeno",
  medium: "Médio",
  large: "Grande",
};

export const SPECIES_OPTIONS: Array<{ value: Species; label: string }> = [
  { value: "dog", label: "Cachorro" },
  { value: "cat", label: "Gato" },
  { value: "other", label: "Outro" },
];

export const SIZE_OPTIONS: Array<{ value: Size; label: string }> = [
  { value: "small", label: "Pequeno" },
  { value: "medium", label: "Médio" },
  { value: "large", label: "Grande" },
];

export function ageLabelMonths(months: number): string {
  if (months < 12) return `${months} ${months === 1 ? "mês" : "meses"}`;
  const years = Math.floor(months / 12);
  return `${years} ${years === 1 ? "ano" : "anos"}`;
}
