import { Document, Font, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { minutesToLabel } from "./time";

// sem hifenização automática (quebrava "volun-tariado")
Font.registerHyphenationCallback((word) => [word]);

export type CertificateData = {
  code: string;
  volunteer_name: string;
  cpf_masked: string | null;
  shelter_name: string;
  period_start: string; // YYYY-MM-DD
  period_end: string;
  total_minutes: number;
  shifts_count: number;
  issued_at: string;
};

const styles = StyleSheet.create({
  page: { padding: 56, fontFamily: "Helvetica", fontSize: 12, color: "#1f2937" },
  border: { flex: 1, borderWidth: 2, borderColor: "#2563eb", borderRadius: 8, padding: 40 },
  brand: { fontSize: 14, color: "#2563eb", fontFamily: "Helvetica-Bold", marginBottom: 32 },
  title: { fontSize: 24, fontFamily: "Helvetica-Bold", textAlign: "center", marginBottom: 28 },
  body: { fontSize: 14, lineHeight: 1.7, textAlign: "justify" },
  bold: { fontFamily: "Helvetica-Bold" },
  hours: { fontSize: 32, fontFamily: "Helvetica-Bold", textAlign: "center", color: "#2563eb", marginVertical: 24 },
  footer: { marginTop: "auto", borderTopWidth: 1, borderTopColor: "#d1d5db", paddingTop: 14, fontSize: 10, color: "#4b5563" },
  code: { fontFamily: "Courier-Bold", fontSize: 13, color: "#111827" },
});

function br(date: string): string {
  const [y, m, d] = date.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

function CertificateDocument({ data, verifyUrl }: { data: CertificateData; verifyUrl: string }) {
  return (
    <Document title={`Certificado ${data.code}`} author="AdotaPet" language="pt-BR">
      <Page size="A4" style={styles.page}>
        <View style={styles.border}>
          <Text style={styles.brand}>AdotaPet · Escala de voluntariado</Text>
          <Text style={styles.title}>Certificado de horas de voluntariado</Text>
          <Text style={styles.body}>
            Certificamos que <Text style={styles.bold}>{data.volunteer_name}</Text>
            {data.cpf_masked ? `, CPF ${data.cpf_masked},` : ""} atuou como voluntário(a) no{" "}
            <Text style={styles.bold}>{data.shelter_name}</Text> no período de{" "}
            <Text style={styles.bold}>{br(data.period_start)}</Text> a{" "}
            <Text style={styles.bold}>{br(data.period_end)}</Text>, com presença registrada pela coordenação em{" "}
            {data.shifts_count} {data.shifts_count === 1 ? "turno" : "turnos"}, totalizando:
          </Text>
          <Text style={styles.hours}>{minutesToLabel(data.total_minutes)}</Text>
          <Text style={styles.body}>
            As horas foram calculadas a partir dos horários de entrada e saída registrados em cada turno, arredondados
            para baixo em blocos de 15 minutos.
          </Text>
          <View style={styles.footer}>
            <Text>Emitido em {br(data.issued_at)}.</Text>
            <Text>
              Código de verificação: <Text style={styles.code}>{data.code}</Text>
            </Text>
            <Text>Confira a autenticidade em {verifyUrl}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}

/** RNF16: PDF A4 gerado no servidor. */
export async function renderCertificatePdf(data: CertificateData, verifyUrl: string): Promise<Buffer> {
  return renderToBuffer(<CertificateDocument data={data} verifyUrl={verifyUrl} />);
}
