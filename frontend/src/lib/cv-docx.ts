import {
  AlignmentType,
  BorderStyle,
  Document,
  ExternalHyperlink,
  ImageRun,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from "docx";
import { saveAs } from "file-saver";

// --- Design tokens ---
const C = {
  name: "1E1B4B",       // deep indigo
  accent: "4F46E5",     // indigo-600
  accentSoft: "818CF8", // indigo-400
  text: "111827",       // gray-900
  sub: "374151",        // gray-700
  muted: "6B7280",      // gray-500
  border: "C7D2FE",     // indigo-200
  white: "FFFFFF",
};

const FONT = "Calibri";

// --- Known section headers (EN + SV) ---
const SECTION_WORDS = new Set([
  "summary", "profile", "profil", "sammanfattning", "professional summary",
  "experience", "erfarenhet", "work experience", "arbetslivserfarenhet",
  "professional experience", "work history",
  "education", "utbildning", "academic background",
  "skills", "färdigheter", "kompetenser", "tekniska färdigheter", "technical skills",
  "core competencies", "key skills",
  "certifications", "certifikat", "certificates", "licenses",
  "projects", "projekt", "key projects",
  "languages", "språk",
  "references", "referenser",
  "awards", "achievements", "honors",
  "publications", "volunteer", "volunteering",
  "interests", "hobbies", "extracurricular",
]);

function isSectionHeader(line: string): boolean {
  const t = line.trim();
  const lower = t.toLowerCase().replace(/[:\-–—]+$/, "").trim();
  if (SECTION_WORDS.has(lower)) return true;
  // All-caps short line (e.g. "ERFARENHET", "TECHNICAL SKILLS")
  if (
    t.length >= 3 &&
    t.length <= 50 &&
    t === t.toUpperCase() &&
    /^[A-ZÅÄÖ\s&/()]+$/.test(t)
  ) return true;
  return false;
}

function isBullet(line: string): boolean {
  return /^[\s]*[-•·*◦▪▸–—]\s/.test(line) || /^[\s]*\d+\.\s/.test(line);
}

function stripBullet(line: string): string {
  return line.trim().replace(/^[-•·*◦▪▸–—]\s+/, "").replace(/^\d+\.\s+/, "");
}

// --- Photo extraction from .docx (ZIP) ---
interface Photo {
  data: Uint8Array;
  type: "jpg" | "png";
  width: number;  // display pixels, aspect-ratio preserved
  height: number;
}

async function getImageDisplaySize(
  data: Uint8Array,
  type: string,
  maxW = 110,
  maxH = 150
): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const blob = new Blob([data.buffer as ArrayBuffer], { type: `image/${type}` });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight);
      resolve({
        width: Math.round(img.naturalWidth * scale),
        height: Math.round(img.naturalHeight * scale),
      });
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve({ width: maxW, height: maxH }); };
    img.src = url;
  });
}

async function extractPhoto(blob: Blob): Promise<Photo | null> {
  try {
    const { default: JSZip } = await import("jszip");
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const images = Object.keys(zip.files).filter(
      (n) => n.startsWith("word/media/") && /\.(png|jpg|jpeg)$/i.test(n)
    );
    if (!images.length) return null;

    // Pick largest image (most likely the photo, not an icon)
    let best = images[0];
    let bestSize = 0;
    for (const name of images) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sz = (zip.files[name] as any)._data?.uncompressedSize ?? 0;
      if (sz > bestSize) { bestSize = sz; best = name; }
    }
    const buf = await zip.files[best].async("arraybuffer");
    const ext = best.split(".").pop()?.toLowerCase() ?? "jpg";
    const type = ext === "jpeg" ? "jpg" : (ext as "jpg" | "png");
    const data = new Uint8Array(buf as ArrayBuffer);
    const { width, height } = await getImageDisplaySize(data, type);
    return { data, type, width, height };
  } catch {
    return null;
  }
}

// --- Inline URL detection — works on any string ---
type Seg = { text: string; href?: string };

// Matches: emails, https:// URLs, linkedin.com/in/*, github.com/*, www.* URLs
const LINK_RE =
  /([\w.+\-]+@[\w\-]+\.[a-z]{2,}|https?:\/\/[^\s,;>)]+|(?:www\.|linkedin\.com\/in\/|github\.com\/)[^\s,;|>)]+)/gi;

function segmentizeText(text: string): Seg[] {
  const segs: Seg[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  LINK_RE.lastIndex = 0;
  while ((match = LINK_RE.exec(text)) !== null) {
    if (match.index > last) segs.push({ text: text.slice(last, match.index) });
    const raw = match[0];
    let href: string;
    if (raw.includes("@") && !raw.startsWith("http")) href = `mailto:${raw}`;
    else if (raw.startsWith("http")) href = raw;
    else href = `https://${raw}`;
    segs.push({ text: raw, href });
    last = match.index + raw.length;
  }
  if (last < text.length) segs.push({ text: text.slice(last) });
  return segs;
}

function makeRuns(
  text: string,
  opts: { size: number; color: string; bold?: boolean }
): (TextRun | ExternalHyperlink)[] {
  return segmentizeText(text).map((seg) => {
    const run = new TextRun({
      text: seg.text,
      color: seg.href ? C.accentSoft : opts.color,
      size: opts.size,
      bold: opts.bold,
      font: FONT,
      ...(seg.href ? { underline: {} } : {}),
    });
    return seg.href
      ? new ExternalHyperlink({ children: [run], link: seg.href })
      : run;
  });
}

function contactRuns(raw: string): (TextRun | ExternalHyperlink)[] {
  // Split on | first so separators are preserved as plain text
  const parts = raw.split(/\s*\|\s*/);
  const out: (TextRun | ExternalHyperlink)[] = [];
  parts.forEach((part, i) => {
    if (i > 0) out.push(new TextRun({ text: "   |   ", color: C.muted, size: 18, font: FONT }));
    out.push(...makeRuns(part.trim(), { size: 18, color: C.muted }));
  });
  return out;
}

// --- Paragraph builders ---
function nameParagraph(name: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text: name, bold: true, size: 56, color: C.name, font: FONT })],
    spacing: { after: 80 },
  });
}

function contactParagraph(line: string): Paragraph {
  return new Paragraph({ children: contactRuns(line), spacing: { after: 50 } });
}

function divider(): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text: "" })],
    spacing: { before: 140, after: 0 },
    border: { bottom: { color: C.accent, space: 1, style: BorderStyle.SINGLE, size: 16 } },
  });
}

function sectionHeader(text: string): Paragraph {
  const clean = text.trim().toUpperCase().replace(/[:\-–—]+$/, "");
  return new Paragraph({
    children: [new TextRun({ text: clean, bold: true, size: 22, color: C.accent, font: FONT })],
    spacing: { before: 300, after: 80 },
    border: { bottom: { color: C.border, space: 1, style: BorderStyle.SINGLE, size: 6 } },
  });
}

function bulletParagraph(text: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({ text: "▸  ", color: C.accent, size: 20, bold: true, font: FONT }),
      ...makeRuns(stripBullet(text), { size: 20, color: C.text }),
    ],
    spacing: { after: 55 },
    indent: { left: 160 },
  });
}

function roleLine(text: string): Paragraph {
  // "Company | Role | 2020–2023" – render as bold company header
  return new Paragraph({
    children: [new TextRun({ text: text.trim(), bold: true, size: 20, color: C.sub, font: FONT })],
    spacing: { after: 40, before: 80 },
  });
}

function contentParagraph(text: string): Paragraph {
  return new Paragraph({
    children: makeRuns(text.trim(), { size: 20, color: C.text }),
    spacing: { after: 55 },
  });
}

const NO_BORDER = { style: BorderStyle.NONE, size: 0, color: C.white } as const;
const cellBorders = { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER };

// --- Main generator ---
export async function generateBeautifulCV(
  text: string,
  opts: { originalDocxBlob?: Blob | null; companyName?: string } = {}
): Promise<Blob> {
  const photo = opts.originalDocxBlob ? await extractPhoto(opts.originalDocxBlob) : null;

  const rawLines = text.split("\n");
  const body: (Paragraph | Table)[] = [];

  // --- Parse name + contact block ---
  let idx = 0;
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

  // --- Header: with or without photo ---
  if (photo) {
    const leftCell = new TableCell({
      children: [
        nameParagraph(nameLine),
        ...contactLines.map(contactParagraph),
      ],
      borders: cellBorders,
      width: { size: 72, type: WidthType.PERCENTAGE },
      verticalAlign: VerticalAlign.CENTER,
    });

    const photoCell = new TableCell({
      children: [
        new Paragraph({
          children: [
            new ImageRun({
              data: photo.data,
              transformation: { width: photo.width, height: photo.height },
              type: photo.type,
            }),
          ],
          alignment: AlignmentType.RIGHT,
        }),
      ],
      borders: cellBorders,
      width: { size: 28, type: WidthType.PERCENTAGE },
      verticalAlign: VerticalAlign.CENTER,
    });

    body.push(
      new Table({
        rows: [new TableRow({ children: [leftCell, photoCell] })],
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
          top: NO_BORDER, bottom: NO_BORDER,
          left: NO_BORDER, right: NO_BORDER,
        },
      })
    );
  } else {
    body.push(nameParagraph(nameLine));
    contactLines.forEach((l) => body.push(contactParagraph(l)));
  }

  body.push(divider());

  // --- Body sections ---
  while (idx < rawLines.length) {
    const line = rawLines[idx];
    const t = line.trim();
    idx++;

    if (!t) continue;

    if (isSectionHeader(t)) {
      body.push(sectionHeader(t));
    } else if (isBullet(t)) {
      body.push(bulletParagraph(t));
    } else if (t.includes("|") && !t.startsWith("|") && t.split("|").length <= 4) {
      body.push(roleLine(t));
    } else {
      body.push(contentParagraph(t));
    }
  }

  const doc = new Document({
    styles: {
      default: {
        document: { run: { font: FONT, size: 20, color: C.text } },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1020, right: 1020, bottom: 1020, left: 1020 },
          },
        },
        children: body,
      },
    ],
  });

  return Packer.toBlob(doc);
}

export async function downloadBeautifulCV(
  text: string,
  opts: { originalDocxBlob?: Blob | null; companyName?: string } = {}
): Promise<void> {
  const blob = await generateBeautifulCV(text, opts);
  const slug = opts.companyName?.replace(/\s+/g, "_") ?? "CV";
  saveAs(blob, `CV_${slug}.docx`);
}
