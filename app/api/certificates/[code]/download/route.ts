import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { renderCertificatePdf } from "@/lib/volunteering/certificate-pdf";

export const runtime = "nodejs";

/**
 * Baixa de novo um certificado do próprio usuário: gera um link assinado de 1 hora
 * para o arquivo do bucket privado. Se o PDF não chegou a ser salvo, gera agora.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  // RLS: só encontra certificados do próprio usuário
  const { data: cert } = await supabase
    .from("volunteer_certificates")
    .select("*")
    .eq("code", code.toUpperCase())
    .maybeSingle();
  if (!cert) return NextResponse.json({ error: "Certificado não encontrado." }, { status: 404 });

  let path = cert.file_path;
  if (!path) {
    const origin = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin;
    const pdf = await renderCertificatePdf(cert, `${origin.replace(/\/$/, "")}/certificates/${cert.code}`);
    path = `${user.id}/${cert.code}.pdf`;
    const { error } = await supabase.storage
      .from("certificates")
      .upload(path, pdf, { contentType: "application/pdf", upsert: true });
    if (error) return NextResponse.json({ error: "Não foi possível gerar o PDF." }, { status: 500 });
    await supabase.rpc("attach_certificate_file", { p_certificate_id: cert.id, p_file_path: path });
  }

  const { data: signed, error } = await supabase.storage.from("certificates").createSignedUrl(path, 60 * 60);
  if (error || !signed) return NextResponse.json({ error: "Não foi possível gerar o link." }, { status: 500 });
  return NextResponse.redirect(signed.signedUrl);
}
