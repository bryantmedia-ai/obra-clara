import QRCode from "qrcode";

export function receptionLink(orderId: string) {
  return "https://obra-clara-comprador.vercel.app/recepcion/" + encodeURIComponent(orderId);
}

// PDF uses built-in Helvetica with WinAnsi encoding and a vector QR for printing.
export function escrowOrderPdf(input: {id: string; project: string; product: string; quantity: number; total: string; supplier: string}) {
  const link = receptionLink(input.id);
  const qr = QRCode.create(link, {errorCorrectionLevel: "M"}).modules;
  const escape = (value: string) => Array.from(value, c => {
    const code = c.charCodeAt(0);
    if (code > 255) return "?";
    if (code > 126 || code < 32) return "\\" + code.toString(8).padStart(3, "0");
    return "()\\".includes(c) ? "\\" + c : c;
  }).join("");
  const lines = [
    [755, 22, "Obra Clara | Orden de compra"],
    [722, 11, input.id],
    [692, 17, input.project],
    [658, 12, "Proveedor: " + input.supplier],
    [635, 12, input.quantity + " × " + input.product],
    [612, 12, "Total reservado: " + input.total],
    [565, 14, "Registrar recepción"],
    [544, 10, "Hacé clic acá o escaneá el QR impreso."],
  ] as const;
  const text = lines.map(([y, size, line]) => `BT /F1 ${size} Tf 54 ${y} Td (${escape(line)}) Tj ET`);
  const scale = 3;
  for (let y = 0; y < qr.size; y++) {
    for (let x = 0; x < qr.size; x++) {
      if (qr.get(y, x)) text.push(`${66 + x * scale} ${508 - (y + 1) * scale} ${scale} ${scale} re f`);
    }
  }
  const stream = text.join("\n") + "\n";
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R /Annots [6 0 R] >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}endstream`,
    `<< /Type /Annot /Subtype /Link /Rect [54 536 335 581] /Border [0 0 0] /A << /S /URI /URI (${escape(link)}) >> >>`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = objects.map((object, index) => {
    const offset = pdf.length;
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
    return offset;
  });
  const start = pdf.length;
  return pdf + `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n` +
    offsets.map(offset => `${String(offset).padStart(10, "0")} 00000 n \n`).join("") +
    `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${start}\n%%EOF\n`;
}
