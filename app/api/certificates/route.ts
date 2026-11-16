import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { certificateSchema } from "@/lib/volunteering/schemas";
import { friendlyError } from "@/lib/volunteering/errors";
import { renderCertificatePdf } from "@/lib/volunteering/certificate-pdf";

export const runtime = "nodejs";

const SIGNED_URL_TTL = 60 * 60; // RNF16: link assinado válido por 1 hora

/**
 * UC10 — Emitir certificado de horas.
 * 1) issue_certificate soma as horas (RN12) e grava o registro com o código (RN16)
 * 2) o PDF é gerado aqui e salvo no bucket privado `certificates`
 * 3) devolve um link assinado de 1 hora
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Entre na sua conta para emitir o certificado." }, { status: 401 });

  const parsed = certificateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });
  }

  const { data: cert, error } = await supabase.rpc("issue_certificate", {
    p_shelter_id: parsed.data.shelter_id,
    p_from: parsed.data.from,
    p_to: parsed.data.to,
  });
  if (error || !cert) {
    return NextResponse.json({ error: friendlyError(error) }, { status: 422 });
  }

  const origin = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin;
  const verifyUrl = `${origin.replace(/\/$/, "")}/certificates/${cert.code}`;
  const pdf = await renderCertificatePdf(cert, verifyUrl);

  const path = `${user.id}/${cert.code}.pdf`;
  const { error: uploadError } = await supabase.storage
    .from("certificates")
    .upload(path, pdf, { contentType: "application/pdf", upsert: false });
  if (uploadError) {
    return NextResponse.json(
      { error: "O certificado foi registrado, mas não conseguimos salvar o PDF. Tente baixar de novo pelo perfil.", code: cert.code },
      { status: 500 },
    );
  }
  await supabase.rpc("attach_certificate_file", { p_certificate_id: cert.id, p_file_path: path });

  const { data: signed } = await supabase.storage.from("certificates").createSignedUrl(path, SIGNED_URL_TTL);

  return NextResponse.json({
    code: cert.code,
    total_minutes: cert.total_minutes,
    url: signed?.signedUrl ?? null,
    verify_url: verifyUrl,
  });
}
