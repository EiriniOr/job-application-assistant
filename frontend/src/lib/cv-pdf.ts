// Client-side PDF generation — mirrors cv-docx.ts design
import jsPDF from "jspdf";
import { saveAs } from "file-saver";

// ─── Design tokens ────────────────────────────────────────────────────────────
type RGB = [number, number, number];
const C: Record<string, RGB> = {
  name:       [30,  27,  75],
  accent:     [79,  70,  229],
  accentSoft: [129, 140, 248],
  text:       [17,  24,  39],
  sub:        [55,  65,  81],
  muted:      [107, 114, 128],
  border:     [199, 210, 254],
};

const MARGIN = 18;
const PAGE_W = 210;
const PAGE_H = 297;
const CONTENT_W = PAGE_W - 2 * MARGIN;

// Convert pt to mm
const pt = (pts: number) => pts * 0.352778;

// ─── Section header detection (mirrors cv-docx.ts) ────────────────────────────
const SECTION_WORDS = new Set([
  "summary", "profile", "profil", "sammanfattning", "professional summary",
  "experience", "erfarenhet", "work experience", "arbetslivserfarenhet",
  "professional experience", "work history",
  "education", "utbildning", "academic background",
  "skills", "färdigheter", "kompetenser", "tekniska färdigheter", "technical skills",
  "core competencies", "key skills",
  "certifications", "certifikat", "certificates", "licenses",
  "projects", "projekt", "key projects",
  "languages", "språk", "references", "referenser",
  "awards", "achievements", "honors", "publications",
  "volunteer", "volunteering", "interests", "hobbies", "extracurricular",
]);

function isSectionHeader(line: string): boolean {
  const t = line.trim();
  const lower = t.toLowerCase().replace(/[:\-–—]+$/, "").trim();
  if (SECTION_WORDS.has(lower)) return true;
  if (t.length >= 3 && t.length <= 50 && t === t.toUpperCase() && /^[A-ZÅÄÖ\s&/()]+$/.test(t)) return true;
  return false;
}

function isBullet(line: string): boolean {
  return /^[\s]*[-•·*◦▪▸–—]\s/.test(line) || /^[\s]*\d+\.\s/.test(line);
}

function stripBullet(line: string): string {
  return line.trim().replace(/^[-•·*◦▪▸–—]\s+/, "").replace(/^\d+\.\s+/, "");
}

// ─── Inline URL segmentation ──────────────────────────────────────────────────
interface Seg { text: string; href?: string }

const LINK_RE =
  /([\w.+\-]+@[\w\-]+\.[a-z]{2,}|https?:\/\/[^\s,;>)]+|(?:www\.|linkedin\.com\/in\/|github\.com\/)[^\s,;|>)]+)/gi;

function segmentize(text: string): Seg[] {
  const segs: Seg[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  LINK_RE.lastIndex = 0;
  while ((m = LINK_RE.exec(text)) !== null) {
    if (m.index > last) segs.push({ text: text.slice(last, m.index) });
    const raw = m[0];
    const href = raw.includes("@") && !raw.startsWith("http")
      ? `mailto:${raw}`
      : raw.startsWith("http") ? raw : `https://${raw}`;
    segs.push({ text: raw, href });
    last = m.index + raw.length;
  }
  if (last < text.length) segs.push({ text: text.slice(last) });
  return segs;
}

// ─── Photo extraction from .docx ──────────────────────────────────────────────
interface PdfPhoto {
  dataUrl: string;
  imgType: "JPEG" | "PNG";
  wMm: number;
  hMm: number;
}

async function extractPdfPhoto(blob: Blob, maxWMm = 30, maxHMm = 40): Promise<PdfPhoto | null> {
  try {
    const { default: JSZip } = await import("jszip");
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const images = Object.keys(zip.files).filter(
      (n) => n.startsWith("word/media/") && /\.(png|jpg|jpeg)$/i.test(n)
    );
    if (!images.length) return null;

    let best = images[0], bestSize = 0;
    for (const name of images) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sz = (zip.files[name] as any)._data?.uncompressedSize ?? 0;
      if (sz > bestSize) { bestSize = sz; best = name; }
    }

    const buf = await zip.files[best].async("arraybuffer");
    const ext = best.split(".").pop()?.toLowerCase() ?? "jpg";
    const mimeType = ext === "png" ? "image/png" : "image/jpeg";
    const imgType: "PNG" | "JPEG" = ext === "png" ? "PNG" : "JPEG";
    const data = new Uint8Array(buf as ArrayBuffer);

    // Get natural dimensions
    const dims = await new Promise<{ w: number; h: number }>((resolve) => {
      const b = new Blob([data], { type: mimeType });
      const url = URL.createObjectURL(b);
      const img = new Image();
      img.onload = () => { URL.revokeObjectURL(url); resolve({ w: img.naturalWidth, h: img.naturalHeight }); };
      img.onerror = () => { URL.revokeObjectURL(url); resolve({ w: 100, h: 100 }); };
      img.src = url;
    });

    const pxToMm = 25.4 / 96;
    const scale = Math.min(maxWMm / (dims.w * pxToMm), maxHMm / (dims.h * pxToMm), 1);
    const wMm = dims.w * pxToMm * scale;
    const hMm = dims.h * pxToMm * scale;

    const base64 = btoa(Array.from(data, (d) => String.fromCharCode(d)).join(""));
    const dataUrl = `data:${mimeType};base64,${base64}`;

    return { dataUrl, imgType, wMm, hMm };
  } catch {
    return null;
  }
}

// ─── PDF Writer ───────────────────────────────────────────────────────────────
class PDFWriter {
  doc: jsPDF;
  y: number;

  constructor() {
    this.doc = new jsPDF({ format: "a4", unit: "mm" });
    this.y = MARGIN;
  }

  private ensureSpace(needed: number) {
    if (this.y + needed > PAGE_H - MARGIN) {
      this.doc.addPage();
      this.y = MARGIN;
    }
  }

  private rgb(c: RGB) {
    this.doc.setTextColor(c[0], c[1], c[2]);
  }

  /** Render a line of segments (inline links). Returns final x. */
  private drawSegs(segs: Seg[], x: number, defaultColor: RGB, fontSize: number): number {
    let cx = x;
    const fhMm = pt(fontSize);
    for (const seg of segs) {
      this.rgb(seg.href ? C.accentSoft : defaultColor);
      this.doc.text(seg.text, cx, this.y);
      const w = this.doc.getTextWidth(seg.text);
      if (seg.href) {
        this.doc.link(cx, this.y - fhMm * 1.1, w, fhMm * 1.4, { url: seg.href });
      }
      cx += w;
    }
    return cx;
  }

  /** Contact line — splits on | and renders with inline links. */
  contactLine(raw: string) {
    this.doc.setFontSize(8.5);
    this.doc.setFont("helvetica", "normal");
    const lineH = pt(8.5) * 1.55;
    this.ensureSpace(lineH);

    const parts = raw.split(/\s*\|\s*/);
    let x = MARGIN;
    parts.forEach((part, i) => {
      if (i > 0) {
        this.rgb(C.muted);
        this.doc.text("  |  ", x, this.y);
        x += this.doc.getTextWidth("  |  ");
      }
      x = this.drawSegs(segmentize(part.trim()), x, C.muted, 8.5);
    });
    this.y += lineH;
  }

  /** Section header with thin underline. */
  sectionHeader(text: string) {
    const clean = text.trim().toUpperCase().replace(/[:\-–—]+$/, "");
    this.doc.setFontSize(10);
    this.doc.setFont("helvetica", "bold");
    this.ensureSpace(pt(10) * 3);
    this.y += pt(10) * 1.2; // spacing before
    this.rgb(C.accent);
    this.doc.text(clean, MARGIN, this.y);
    this.y += pt(10) * 0.6;
    // Thin border
    this.doc.setDrawColor(C.border[0], C.border[1], C.border[2]);
    this.doc.setLineWidth(0.2);
    this.doc.line(MARGIN, this.y, PAGE_W - MARGIN, this.y);
    this.y += pt(10) * 0.5;
  }

  /** Horizontal divider in accent. */
  divider() {
    this.y += 3;
    this.doc.setDrawColor(C.accent[0], C.accent[1], C.accent[2]);
    this.doc.setLineWidth(0.5);
    this.doc.line(MARGIN, this.y, PAGE_W - MARGIN, this.y);
    this.y += 3;
  }

  /** Bullet point. */
  bullet(text: string) {
    this.doc.setFontSize(9);
    this.doc.setFont("helvetica", "normal");
    const lineH = pt(9) * 1.5;
    const indentX = MARGIN + 4;
    const bulletW = this.doc.getTextWidth("•  ");
    const textW = CONTENT_W - 4 - bulletW;
    const lines = this.doc.splitTextToSize(stripBullet(text), textW) as string[];
    this.ensureSpace(lines.length * lineH);

    this.rgb(C.accent);
    this.doc.text("•", indentX, this.y);
    this.rgb(C.text);
    this.doc.text(lines, indentX + bulletW, this.y);
    this.y += lines.length * lineH;
  }

  /** Role/company line (bold). */
  roleLine(text: string) {
    this.doc.setFontSize(9.5);
    this.doc.setFont("helvetica", "bold");
    const lineH = pt(9.5) * 1.5;
    const lines = this.doc.splitTextToSize(text.trim(), CONTENT_W) as string[];
    this.ensureSpace(lines.length * lineH + 2);
    this.y += 2;
    this.rgb(C.sub);
    this.doc.text(lines, MARGIN, this.y);
    this.y += lines.length * lineH;
  }

  /** Body paragraph. Inline links on single-line segments; wraps long text. */
  contentParagraph(text: string) {
    this.doc.setFontSize(9);
    this.doc.setFont("helvetica", "normal");
    const lineH = pt(9) * 1.5;
    const segs = segmentize(text.trim());
    const hasLinks = segs.some((s) => s.href);

    if (hasLinks) {
      // Render inline — single logical line (may overflow on very long lines)
      this.ensureSpace(lineH);
      this.drawSegs(segs, MARGIN, C.text, 9);
      this.y += lineH;
    } else {
      const lines = this.doc.splitTextToSize(text.trim(), CONTENT_W) as string[];
      this.ensureSpace(lines.length * lineH);
      this.rgb(C.text);
      this.doc.text(lines, MARGIN, this.y);
      this.y += lines.length * lineH;
    }
  }
}

// ─── Main export ──────────────────────────────────────────────────────────────
export async function generateBeautifulCVPdf(
  text: string,
  opts: { originalDocxBlob?: Blob | null } = {}
): Promise<Blob> {
  const photo = opts.originalDocxBlob ? await extractPdfPhoto(opts.originalDocxBlob) : null;
  const w = new PDFWriter();
  const rawLines = text.split("\n");
  let idx = 0;

  // Parse name + contact block
  const nameLine = rawLines[idx]?.trim() ?? "";
  idx++;
  const contactLines: string[] = [];
  while (idx < rawLines.length) {
    const l = rawLines[idx].trim();
    if (!l) { idx++; break; }
    if (isSectionHeader(l)) break;
    contactLines.push(l);
    idx++;
  }
  while (idx < rawLines.length && !rawLines[idx].trim()) idx++;

  // ── Header ──
  const photoX = PAGE_W - MARGIN - (photo?.wMm ?? 0);
  const photoTopY = w.y;
  if (photo) {
    w.doc.addImage(photo.dataUrl, photo.imgType, photoX, photoTopY, photo.wMm, photo.hMm);
  }

  // Name
  w.doc.setFontSize(22);
  w.doc.setFont("helvetica", "bold");
  w.doc.setTextColor(C.name[0], C.name[1], C.name[2]);
  w.doc.text(nameLine, MARGIN, w.y);
  w.y += pt(22) * 1.3;

  // Contact lines
  for (const line of contactLines) w.contactLine(line);

  // Ensure we clear the photo
  if (photo) w.y = Math.max(w.y, photoTopY + photo.hMm + 3);

  w.divider();

  // ── Body ──
  while (idx < rawLines.length) {
    const t = rawLines[idx].trim();
    idx++;
    if (!t) continue;

    if (isSectionHeader(t)) {
      w.sectionHeader(t);
    } else if (isBullet(t)) {
      w.bullet(t);
    } else if (t.includes("|") && !t.startsWith("|") && t.split("|").length <= 4) {
      w.roleLine(t);
    } else {
      w.contentParagraph(t);
    }
  }

  return w.doc.output("blob");
}

export async function downloadBeautifulCVAsPdf(
  text: string,
  opts: { originalDocxBlob?: Blob | null; companyName?: string } = {}
): Promise<void> {
  const blob = await generateBeautifulCVPdf(text, opts);
  const slug = opts.companyName?.replace(/\s+/g, "_") ?? "CV";
  saveAs(blob, `CV_${slug}.pdf`);
}
