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
    return { data: new Uint8Array(buf), type: ext === "jpeg" ? "jpg" : (ext as "jpg" | "png") };
  } catch {
    return null;
  }
}

// --- Contact line parsing → hyperlink-aware runs ---
type Seg = { text: string; href?: string };

function parseContactLine(raw: string): Seg[] {
  const emailRe = /[\w.+\-]+@[\w\-]+\.[a-z]{2,}/i;
  const urlRe = /https?:\/\/[^\s|,]+/i;
  const linkedinRe = /(?:www\.)?linkedin\.com\/in\/[^\s|,]+/i;

  const segs: Seg[] = [];
  const parts = raw.split(/\s*\|\s*/);
  parts.forEach((part, i) => {
    const p = part.trim();
    if (!p) return;
    if (i > 0) segs.push({ text: "   |   " });

    const email = p.match(emailRe)?.[0];
    const url = p.match(urlRe)?.[0];
    const li = p.match(linkedinRe)?.[0];

    if (email) {
      segs.push({ text: p, href: `mailto:${email}` });
    } else if (url) {
      segs.push({ text: p, href: url });
    } else if (li) {
      segs.push({ text: p, href: `https://${li.replace(/^https?:\/\//, "")}` });
    } else {
      segs.push({ text: p });
    }
  });
  return segs;
}

function contactRuns(raw: string) {
  return parseContactLine(raw).map((seg) => {
    const run = new TextRun({ text: seg.text, color: seg.href ? C.accentSoft : C.muted, size: 18, font: FONT });
    if (seg.href) {
      return new ExternalHyperlink({ children: [run], link: seg.href });
    }
    return run;
  });
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
      new TextRun({ text: stripBullet(text), size: 20, color: C.text, font: FONT }),
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
    children: [new TextRun({ text: text.trim(), size: 20, color: C.text, font: FONT })],
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
              transformation: { width: 108, height: 138 },
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
