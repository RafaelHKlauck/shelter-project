type PgError = { message?: string; code?: string } | null | undefined;

/**
 * As funções da escala levantam erros (P0001) já em português; esses vão direto
 * para a tela. Os demais viram uma mensagem genérica.
 */
export function friendlyError(error: PgError, fallback = "Não foi possível concluir a operação. Tente de novo."): string {
  if (!error) return fallback;
  if (error.code === "P0001" && error.message) return error.message;
  if (error.code === "42501") return "Você não tem permissão para fazer isso.";
  return fallback;
}
