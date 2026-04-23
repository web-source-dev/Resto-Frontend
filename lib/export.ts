"use client";

export function toCSV<T extends Record<string, any>>(
  rows: T[],
  columns: { key: keyof T; header: string; map?: (v: any, row: T) => any }[]
): string {
  const head = columns.map((c) => csvField(c.header)).join(",");
  const body = rows
    .map((r) =>
      columns
        .map((c) => {
          const v = c.map ? c.map(r[c.key], r) : r[c.key];
          return csvField(v ?? "");
        })
        .join(",")
    )
    .join("\n");
  return head + "\n" + body;
}

function csvField(v: any): string {
  const s = String(v ?? "");
  if (s.includes(",") || s.includes("\n") || s.includes('"')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function downloadText(filename: string, content: string, mime = "text/csv") {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

export async function parseCSV(file: File): Promise<Record<string, string>[]> {
  const text = await file.text();
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];
  const headers = splitCSVLine(lines[0]);
  return lines.slice(1).map((line) => {
    const cells = splitCSVLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => (row[h.trim()] = (cells[i] ?? "").trim()));
    return row;
  });
}

function splitCSVLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cur += ch;
      }
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ",") {
        out.push(cur);
        cur = "";
      } else cur += ch;
    }
  }
  out.push(cur);
  return out;
}

export async function generateTableQRs(
  tables: { code: string; zone?: string }[],
  baseUrl: string,
  outletName: string
) {
  const QRCode = (await import("qrcode")).default;
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const cols = 3;
  const rows = 4;
  const cellW = (pageW - 20) / cols;
  const cellH = (pageH - 20) / rows;
  let i = 0;

  for (const t of tables) {
    const col = i % cols;
    const row = Math.floor(i / cols) % rows;
    if (i > 0 && col === 0 && row === 0) doc.addPage();
    const x = 10 + col * cellW;
    const y = 10 + row * cellH;

    const url = `${baseUrl}/qr/${encodeURIComponent(t.code)}`;
    const dataUrl = await QRCode.toDataURL(url, {
      errorCorrectionLevel: "H",
      margin: 1,
      width: 512,
    });

    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x + 2, y + 2, cellW - 4, cellH - 4, 3, 3);

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(outletName, x + cellW / 2, y + 8, { align: "center" });
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text("Scan to order", x + cellW / 2, y + 12, { align: "center" });
    doc.setTextColor(0);

    const qrSize = Math.min(cellW - 20, cellH - 34);
    doc.addImage(dataUrl, "PNG", x + (cellW - qrSize) / 2, y + 15, qrSize, qrSize);

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(t.code, x + cellW / 2, y + cellH - 8, { align: "center" });
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(120);
    if (t.zone) doc.text(t.zone, x + cellW / 2, y + cellH - 4, { align: "center" });
    doc.setTextColor(0);

    i++;
  }
  doc.save(`FlavorFlow-table-QRs-${Date.now()}.pdf`);
}

export async function generatePdfReceipt(order: any, outletName = "FlavorFlow") {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: [80, 200] });
  let y = 10;
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(outletName, 40, y, { align: "center" });
  y += 5;
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(`Order ${order.code}`, 40, y, { align: "center" });
  y += 4;
  doc.text(new Date(order.placedAt).toLocaleString(), 40, y, { align: "center" });
  y += 6;
  doc.line(5, y, 75, y);
  y += 4;

  for (const it of order.items ?? []) {
    doc.setFont("helvetica", "bold");
    doc.text(`${it.qty} × ${it.name}`, 5, y);
    doc.text(`Rs ${(it.price * it.qty).toLocaleString()}`, 75, y, { align: "right" });
    y += 4;
    if (it.mods?.length) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(7);
      doc.text(it.mods.join(", "), 8, y);
      doc.setFontSize(8);
      y += 3;
    }
  }

  y += 2;
  doc.line(5, y, 75, y);
  y += 4;
  doc.setFont("helvetica", "normal");
  row("Subtotal", `Rs ${order.subtotal?.toLocaleString() ?? 0}`);
  row("Tax", `Rs ${order.tax?.toLocaleString() ?? 0}`);
  row("Service", `Rs ${order.service?.toLocaleString() ?? 0}`);
  doc.setFont("helvetica", "bold");
  row("Total", `Rs ${order.total?.toLocaleString() ?? 0}`);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text("Thank you · come again!", 40, y, { align: "center" });
  doc.save(`receipt-${order.code?.replace("#", "")}.pdf`);

  function row(a: string, b: string) {
    doc.text(a, 5, y);
    doc.text(b, 75, y, { align: "right" });
    y += 4;
  }
}
