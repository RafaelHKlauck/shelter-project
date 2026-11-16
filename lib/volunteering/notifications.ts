type Payload = Record<string, unknown>;

export type NotificationText = { title: string; body: string; href?: string };

function s(p: Payload, key: string): string {
  const v = p[key];
  return typeof v === "string" ? v : "";
}

const REQUEST_KIND: Record<string, string> = {
  adoption: "adoção",
  volunteer: "voluntariado",
  supply: "doação",
};

/** Texto claro e curto para cada tipo de notificação do sino. */
export function describeNotification(kind: string, payload: Payload): NotificationText {
  const shift = s(payload, "shift_title");
  const shelter = s(payload, "shelter_name");
  const when = s(payload, "starts_at_label");
  const where = [shelter, when].filter(Boolean).join(" · ");

  switch (kind) {
    case "shift.enrolled":
      return { title: `Inscrição confirmada: ${shift}`, body: where, href: "/volunteering" };
    case "shift.waitlisted":
      return {
        title: `Você entrou na lista de espera: ${shift}`,
        body: `Posição ${payload.waitlist_position ?? "?"} na fila. ${where}`,
        href: "/volunteering",
      };
    case "shift.promoted":
      return { title: `Você conseguiu a vaga: ${shift}`, body: `Saiu da lista de espera e está confirmado. ${where}`, href: "/volunteering" };
    case "shift.cancelled":
      return { title: `Turno cancelado pelo abrigo: ${shift}`, body: where, href: "/volunteering" };
    case "shift.updated":
      return { title: `Turno alterado: ${shift}`, body: `Novo horário: ${where}`, href: "/volunteering" };
    case "shift.released":
      return { title: `A coordenação liberou sua vaga: ${shift}`, body: where, href: "/volunteering" };
    case "shift.reminder":
      return { title: `Lembrete: amanhã você tem ${shift}`, body: where, href: "/volunteering" };
    case "volunteer.blocked":
      return {
        title: `Inscrições bloqueadas no ${shelter}`,
        body: `Por três faltas seguidas sem justificativa, até ${s(payload, "blocked_until_label")}.`,
        href: "/volunteering",
      };
    case "volunteer.unblocked":
      return { title: `Bloqueio removido no ${shelter}`, body: "Você já pode se inscrever de novo.", href: "/volunteering" };
    case "request.created":
      return { title: `Nova solicitação de ${REQUEST_KIND[s(payload, "kind")] ?? "contato"}`, body: "", href: "/shelter-dashboard" };
    case "request.accepted":
      return {
        title: `Sua solicitação de ${REQUEST_KIND[s(payload, "kind")] ?? "contato"} foi aprovada`,
        body: s(payload, "kind") === "volunteer" ? "Você já pode ver a agenda de turnos." : "",
        href: s(payload, "kind") === "volunteer" ? "/volunteering" : "/messages",
      };
    case "request.rejected":
      return { title: `Sua solicitação de ${REQUEST_KIND[s(payload, "kind")] ?? "contato"} foi recusada`, body: "" };
    case "request.finalized":
      return { title: `Solicitação de ${REQUEST_KIND[s(payload, "kind")] ?? "contato"} finalizada`, body: "", href: "/profile" };
    default:
      return { title: "Nova notificação", body: "" };
  }
}
