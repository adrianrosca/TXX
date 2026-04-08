/**
 * Creates the TXX Management Overview presentation on Google Drive
 */

import { google } from 'googleapis';
import { getAuthClient } from './client.js';

let slides; // initialized in main()

// ── Palette ──────────────────────────────────────────────────────────────────
const C = {
  TEXT:       { red: 0.122, green: 0.137, blue: 0.157 },
  MUTED:     { red: 0.388, green: 0.431, blue: 0.482 },
  SURFACE:   { red: 0.965, green: 0.973, blue: 0.980 },
  BORDER:    { red: 0.816, green: 0.843, blue: 0.871 },
  WHITE:     { red: 1,     green: 1,     blue: 1     },
  DARK:      { red: 0.122, green: 0.137, blue: 0.157 },
  GREEN:     { red: 0.102, green: 0.498, blue: 0.216 },
  GREEN_BG:  { red: 0.863, green: 0.996, blue: 0.906 },
  GREEN_BD:  { red: 0.290, green: 0.761, blue: 0.420 },
  YELLOW:    { red: 0.490, green: 0.306, blue: 0     },
  YELLOW_BG: { red: 1,     green: 0.973, blue: 0.773 },
  YELLOW_BD: { red: 0.831, green: 0.655, blue: 0.173 },
  RED:       { red: 0.812, green: 0.133, blue: 0.180 },
  RED_BG:    { red: 1,     green: 0.922, blue: 0.914 },
  RED_BD:    { red: 1,     green: 0.506, blue: 0.510 },
  BLUE:      { red: 0.035, green: 0.412, blue: 0.855 },
  BLUE_BG:   { red: 0.875, green: 0.937, blue: 1     },
  BLUE_BD:   { red: 0.329, green: 0.682, blue: 1     },
};

// ── Unit helpers (Google Slides uses EMU: 1pt = 12700, 1inch = 914400) ───────
const pt  = n => n * 12700;
const in_ = n => n * 914400;

function rgb(c)       { return { rgbColor: c }; }
function textColor(c) { return { opaqueColor: rgb(c) }; }
function size(w, h)   { return { width: { magnitude: w, unit: 'EMU' }, height: { magnitude: h, unit: 'EMU' } }; }
function pos(x, y)    { return { translateX: x, translateY: y, scaleX: 1, scaleY: 1, unit: 'EMU' }; }

let _id = 2000;
function uid(prefix) { return `${prefix}_${_id++}`; }

// ── Request builders ─────────────────────────────────────────────────────────

function addShape(id, slideId, x, y, w, h, fillColor, borderColor, borderWidth = 0) {
  return [
    {
      createShape: {
        objectId: id,
        shapeType: 'RECTANGLE',
        elementProperties: { pageObjectId: slideId, size: size(w, h), transform: pos(x, y) },
      },
    },
    {
      updateShapeProperties: {
        objectId: id,
        shapeProperties: {
          shapeBackgroundFill: fillColor
            ? { solidFill: { color: rgb(fillColor) } }
            : { propertyState: 'NOT_RENDERED' },
          outline: borderColor
            ? { outlineFill: { solidFill: { color: rgb(borderColor) } }, weight: { magnitude: borderWidth || pt(1), unit: 'EMU' }, dashStyle: 'SOLID' }
            : { propertyState: 'NOT_RENDERED' },
        },
        fields: 'shapeBackgroundFill,outline',
      },
    },
  ];
}

function addTextBox(id, slideId, text, x, y, w, h, {
  size: fontSize = 11,
  bold = false,
  color = C.TEXT,
  align = 'START',
} = {}) {
  return [
    {
      createShape: {
        objectId: id,
        shapeType: 'TEXT_BOX',
        elementProperties: { pageObjectId: slideId, size: size(w, h), transform: pos(x, y) },
      },
    },
    { insertText: { objectId: id, text } },
    {
      updateTextStyle: {
        objectId: id,
        style: {
          fontSize: { magnitude: fontSize, unit: 'PT' },
          bold,
          foregroundColor: textColor(color),
          fontFamily: 'Roboto',
        },
        fields: 'fontSize,bold,foregroundColor,fontFamily',
      },
    },
    {
      updateParagraphStyle: {
        objectId: id,
        style: {
          alignment: align,
          lineSpacing: 100,
          spaceBelow: { magnitude: 0, unit: 'PT' },
        },
        fields: 'alignment,lineSpacing,spaceBelow',
      },
    },
  ];
}

// ── Slide dimensions & margins ───────────────────────────────────────────────
const SLIDE_W = in_(10);
const SLIDE_H = in_(5.625);
const MX = in_(0.5);
const MY = in_(0.4);

function slideTitle(slideId, title, sub = null) {
  const reqs = [];
  reqs.push(...addTextBox(uid('t'), slideId, title, MX, MY, SLIDE_W - MX * 2, in_(0.7), {
    size: 28, bold: true, color: C.TEXT,
  }));
  if (sub) {
    reqs.push(...addTextBox(uid('s'), slideId, sub, MX, MY + in_(0.72), SLIDE_W - MX * 2, in_(0.3), {
      size: 12, color: C.MUTED,
    }));
  }
  reqs.push(...addShape(uid('r'), slideId, MX, MY + in_(1.08), SLIDE_W - MX * 2, pt(1.5), C.BORDER, null));
  return reqs;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 1 — Title
// ═══════════════════════════════════════════════════════════════════════════════
function buildSlide1(sid) {
  const R = [];
  // Dark background
  R.push(...addShape(uid('bg'), sid, 0, 0, SLIDE_W, SLIDE_H, C.DARK, null));
  // Title
  R.push(...addTextBox(uid('t'), sid, 'TXX — Framtidens\nutvecklingsplattform',
    MX, in_(1.2), SLIDE_W - MX * 2, in_(1.2), { size: 36, bold: true, color: C.WHITE, align: 'CENTER' }));
  // Subtitle — well below title
  R.push(...addTextBox(uid('s'), sid, 'En kodbas. Tre säkerhetsnivåer. Moderna verktyg.',
    MX, in_(2.8), SLIDE_W - MX * 2, in_(0.4), { size: 16, color: C.BORDER, align: 'CENTER' }));
  // Blue rule
  R.push(...addShape(uid('r'), sid, in_(3.5), in_(3.4), in_(3), pt(2), C.BLUE, null));
  // G/Y/R dots
  const dotY = in_(3.7), dotS = in_(0.22), dotG = in_(0.12);
  const dotStartX = in_(5) - (dotS * 3 + dotG * 2) / 2;
  R.push(...addShape(uid('dg'), sid, dotStartX, dotY, dotS, dotS, C.GREEN, null));
  R.push(...addShape(uid('dy'), sid, dotStartX + dotS + dotG, dotY, dotS, dotS, C.YELLOW, null));
  R.push(...addShape(uid('dr'), sid, dotStartX + (dotS + dotG) * 2, dotY, dotS, dotS, C.RED, null));
  // Date
  R.push(...addTextBox(uid('d'), sid, 'April 2026',
    in_(7), in_(4.9), in_(2.5), in_(0.3), { size: 10, color: C.MUTED, align: 'END' }));
  return R;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 2 — Problem vs Solution
// ═══════════════════════════════════════════════════════════════════════════════
function buildSlide2(sid) {
  const R = [];
  R.push(...slideTitle(sid, 'Utmaningen: tre miljöer, tre siloer',
    'Idag byggs varje säkerhetsnivå separat — med separata kodbasar, verktyg och processer'));

  const cY = MY + in_(1.25);
  const colW = in_(4.1);
  const cardH = in_(1.05);
  const cardG = in_(0.12);
  const lx = MX;
  const rx = MX + colW + in_(0.6);

  // Column labels
  R.push(...addTextBox(uid('l'), sid, 'IDAG', lx, cY, colW, in_(0.25), { size: 9, bold: true, color: C.RED }));
  R.push(...addTextBox(uid('l'), sid, 'MED TXX', rx, cY, colW, in_(0.25), { size: 9, bold: true, color: C.GREEN }));

  const problems = [
    { title: 'Dubbelarbete',             body: 'Samma funktionalitet byggs och underhålls tre gånger' },
    { title: 'Inkonsekvent UX',          body: 'Varje team tolkar krav på sitt sätt — olika upplevelser' },
    { title: 'Verktygsglapp i R-miljö',  body: 'Utvecklare utan AI-stöd i den mest komplexa miljön' },
  ];
  const solutions = [
    { title: 'En kodbas',       body: 'G bygger grunden, Y och R lägger till — inget dubbelarbete' },
    { title: 'Designstyrd UX',  body: 'Godkänd design innan en rad kod skrivs — konsekvent upplevelse' },
    { title: 'AI på alla nivåer', body: 'Lokala LLM-modeller ger R-utvecklare samma AI-stöd' },
  ];

  const startY = cY + in_(0.35);

  // Arrow between columns — vertically centered
  R.push(...addTextBox(uid('a'), sid, '→', MX + colW + in_(0.08), startY + cardH + in_(0.02), in_(0.45), in_(0.5),
    { size: 22, bold: true, color: C.BLUE, align: 'CENTER' }));

  problems.forEach((p, i) => {
    const cy = startY + i * (cardH + cardG);
    R.push(...addShape(uid('c'), sid, lx, cy, colW, cardH, C.RED_BG, C.RED_BD, pt(1)));
    R.push(...addTextBox(uid('t'), sid, p.title, lx + in_(0.18), cy + in_(0.12), colW - in_(0.35), in_(0.3),
      { size: 12, bold: true, color: C.RED }));
    R.push(...addTextBox(uid('b'), sid, p.body, lx + in_(0.18), cy + in_(0.48), colW - in_(0.35), in_(0.45),
      { size: 10, color: C.TEXT }));
  });

  solutions.forEach((s, i) => {
    const cy = startY + i * (cardH + cardG);
    R.push(...addShape(uid('c'), sid, rx, cy, colW, cardH, C.GREEN_BG, C.GREEN_BD, pt(1)));
    R.push(...addTextBox(uid('t'), sid, s.title, rx + in_(0.18), cy + in_(0.12), colW - in_(0.35), in_(0.3),
      { size: 12, bold: true, color: C.GREEN }));
    R.push(...addTextBox(uid('b'), sid, s.body, rx + in_(0.18), cy + in_(0.48), colW - in_(0.35), in_(0.45),
      { size: 10, color: C.TEXT }));
  });

  return R;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 3 — Three Strategic Pillars
// ═══════════════════════════════════════════════════════════════════════════════
function buildSlide3(sid) {
  const R = [];
  R.push(...slideTitle(sid, 'Tre strategiska pelare',
    'TXX vilar på tre sammanhängande förbättringsområden'));

  const cY = MY + in_(1.25);
  const colW = in_(2.8);
  const colG = in_(0.15);
  const cardH = in_(2.8);

  const pillars = [
    {
      symbol: '{ }', title: 'Flernivå-arkitektur',
      fill: C.BLUE_BG, bd: C.BLUE_BD, tc: C.BLUE,
      items: [
        'G/Y/R-nivåer i en lösning',
        'DI-baserad sammansättning',
        'Envägsflöde: G → Y → R',
        'Samma tester på alla nivåer',
      ],
    },
    {
      symbol: '◆', title: 'Design före kod',
      fill: C.GREEN_BG, bd: C.GREEN_BD, tc: C.GREEN,
      items: [
        'Prototyp godkänd innan utveckling',
        'Designsystem med tokens och mallar',
        'Utvecklare bygger mot spec',
        'Konsekvent UX i hela systemet',
      ],
    },
    {
      symbol: '⚡', title: 'AI-assisterat arbetsflöde',
      fill: C.YELLOW_BG, bd: C.YELLOW_BD, tc: C.YELLOW,
      items: [
        'Molnbaserad AI på G och Y',
        'Lokal LLM i luftgapad R-miljö',
        'RAG-pipeline mot kodbasen',
        'AI-stöd även utan internet',
      ],
    },
  ];

  pillars.forEach((p, i) => {
    const cx = MX + i * (colW + colG);
    R.push(...addShape(uid('c'), sid, cx, cY, colW, cardH, p.fill, p.bd, pt(1)));
    R.push(...addTextBox(uid('i'), sid, p.symbol, cx, cY + in_(0.12), colW, in_(0.4),
      { size: 20, bold: true, color: p.tc, align: 'CENTER' }));
    R.push(...addTextBox(uid('t'), sid, p.title, cx + in_(0.15), cY + in_(0.55), colW - in_(0.3), in_(0.35),
      { size: 14, bold: true, color: p.tc, align: 'CENTER' }));
    R.push(...addTextBox(uid('b'), sid, p.items.map(x => `–  ${x}`).join('\n'),
      cx + in_(0.2), cY + in_(1.0), colW - in_(0.4), in_(1.6),
      { size: 11, color: C.TEXT }));
  });

  return R;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 4 — Deliverables
// ═══════════════════════════════════════════════════════════════════════════════
function buildSlide4(sid) {
  const R = [];
  R.push(...slideTitle(sid, 'Leverabler: vad som byggs',
    'Fyra paket som tillsammans bildar den nya plattformen'));

  const cY = MY + in_(1.25);
  const fullW = SLIDE_W - MX * 2;
  const cardH = in_(0.88);
  const cardG = in_(0.12);

  const deliverables = [
    {
      name: 'TXX UI Framework 1.0', stripe: C.BLUE,
      desc: 'Enhetligt komponentbibliotek och designsystem',
      items: 'Design tokens  ·  Nivåanpassade mallar  ·  Gemensamma komponenter  ·  XAML-resurser',
    },
    {
      name: 'TXX WPF UI Library 1.0', stripe: C.BLUE,
      desc: 'WPF-applikation med modulär arkitektur',
      items: 'Prism-moduler  ·  MVVM-mönster  ·  Regionbaserad komposition  ·  Async-mönster',
    },
    {
      name: 'TXX Core Library 1.0', stripe: C.GREEN,
      desc: 'Delad kärna med domänmodeller och applikationslogik',
      items: 'Clean architecture  ·  DI-baserad nivåkomposition  ·  Vertikala feature-skivor  ·  EF Core 8',
    },
    {
      name: 'TXX AI Workflow 1.0', stripe: C.YELLOW,
      desc: 'AI-verktygskedja för alla säkerhetsnivåer',
      items: 'Lokal LLM (Ollama)  ·  IDE-integration  ·  RAG-pipeline  ·  Luftgapsöverföring',
    },
  ];

  deliverables.forEach((d, i) => {
    const cy = cY + i * (cardH + cardG);
    R.push(...addShape(uid('c'), sid, MX, cy, fullW, cardH, C.SURFACE, C.BORDER, pt(1)));
    // Colored left stripe
    R.push(...addShape(uid('s'), sid, MX, cy, pt(5), cardH, d.stripe, null));
    // Name
    R.push(...addTextBox(uid('n'), sid, d.name, MX + in_(0.18), cy + in_(0.12), in_(3.2), in_(0.3),
      { size: 13, bold: true, color: d.stripe }));
    // Description
    R.push(...addTextBox(uid('d'), sid, d.desc, MX + in_(0.18), cy + in_(0.48), in_(3.2), in_(0.3),
      { size: 9, color: C.MUTED }));
    // Items on right — wider area, vertically centered
    R.push(...addTextBox(uid('i'), sid, d.items, MX + in_(3.5), cy + in_(0.18), fullW - in_(3.7), in_(0.55),
      { size: 9, color: C.TEXT }));
  });

  return R;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 5 — G/Y/R Overlay Model
// ═══════════════════════════════════════════════════════════════════════════════
function buildSlide5(sid) {
  const R = [];
  R.push(...slideTitle(sid, 'En kodbas — tre nivåer',
    'Varje nivå bygger på den föregående utan att ändra den'));

  const cY = MY + in_(1.35);
  const diagramW = in_(5.0);
  const rightX = MX + diagramW + in_(0.4);
  const rightW = SLIDE_W - rightX - MX;

  // Layered boxes (bottom-up: G largest, R smallest, offset right and up)
  const layers = [
    { label: 'G — Arkitekturellt ramverk',  sub: 'Fullständigt UI, mockdata, alla kontrakt',       fill: C.GREEN_BG,  bd: C.GREEN_BD,  tc: C.GREEN,  x: MX,            y: cY + in_(2.4), w: in_(4.8), h: in_(1.0) },
    { label: 'Y — Begränsad nivå',          sub: 'Riktiga integrationer och Y-data',               fill: C.YELLOW_BG, bd: C.YELLOW_BD, tc: C.YELLOW, x: MX + in_(0.25), y: cY + in_(1.4), w: in_(4.3), h: in_(0.85) },
    { label: 'R — Hemlig nivå',             sub: 'Hemliga komponenter och R-data',                  fill: C.RED_BG,    bd: C.RED_BD,    tc: C.RED,    x: MX + in_(0.5),  y: cY + in_(0.5), w: in_(3.8), h: in_(0.75) },
  ];

  // Draw bottom-up so G is behind
  for (let i = 0; i < layers.length; i++) {
    const l = layers[i];
    R.push(...addShape(uid('l'), sid, l.x, l.y, l.w, l.h, l.fill, l.bd, pt(1)));
    R.push(...addTextBox(uid('t'), sid, l.label, l.x + in_(0.15), l.y + in_(0.08), l.w - in_(0.3), in_(0.28),
      { size: 11, bold: true, color: l.tc }));
    R.push(...addTextBox(uid('s'), sid, l.sub, l.x + in_(0.15), l.y + in_(0.38), l.w - in_(0.3), in_(0.28),
      { size: 9, color: C.MUTED }));
  }

  // Flow label under diagram
  R.push(...addTextBox(uid('f'), sid, 'G  →  Y  →  R  =  Komplett applikation',
    MX, cY + in_(3.55), diagramW, in_(0.3),
    { size: 11, bold: true, color: C.BLUE, align: 'CENTER' }));

  // Right side — key points
  const rh = in_(0.82);
  const rg = in_(0.12);

  const points = [
    { text: 'Kod flödar G → Y → R\n— aldrig uppåt',               tc: C.GREEN, fill: C.GREEN_BG, bd: C.GREEN_BD },
    { text: 'G-tester passerar\npå alla nivåer',                    tc: C.BLUE,  fill: C.BLUE_BG,  bd: C.BLUE_BD },
    { text: 'Inga hemligheter\nexponeras i G-nivån',                tc: C.BLUE,  fill: C.BLUE_BG,  bd: C.BLUE_BD },
    { text: 'DI ersätter implementationer\n— aldrig kontrakt',      tc: C.GREEN, fill: C.GREEN_BG, bd: C.GREEN_BD },
  ];

  points.forEach((p, i) => {
    const py = cY + in_(0.15) + i * (rh + rg);
    R.push(...addShape(uid('p'), sid, rightX, py, rightW, rh, p.fill, p.bd, pt(1)));
    R.push(...addTextBox(uid('t'), sid, p.text, rightX + in_(0.15), py + in_(0.12), rightW - in_(0.3), rh - in_(0.24),
      { size: 10, bold: true, color: p.tc }));
  });

  return R;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 6 — Benefits & Impact
// ═══════════════════════════════════════════════════════════════════════════════
function buildSlide6(sid) {
  const R = [];
  R.push(...slideTitle(sid, 'Förväntade effekter',
    'Konkreta vinster från de tre pelarna'));

  const cY = MY + in_(1.3);
  const colW = in_(4.15);
  const colG = in_(0.5);
  const cardH = in_(1.05);
  const cardG = in_(0.12);

  const benefits = [
    // Left column
    [
      { icon: '1×',  title: 'Mindre dubbelarbete',     body: 'En kodbas istället för tre — funktionalitet byggs en gång',             fill: C.GREEN_BG, bd: C.GREEN_BD, tc: C.GREEN },
      { icon: '10×', title: 'Lägre felkostnad',        body: 'Fel fångas i design, inte i produktion — tidig feedback sparar pengar',  fill: C.GREEN_BG, bd: C.GREEN_BD, tc: C.GREEN },
      { icon: 'UX',  title: 'Konsekvent UX',           body: 'Godkänd design garanterar samma upplevelse i hela systemet',             fill: C.BLUE_BG,  bd: C.BLUE_BD,  tc: C.BLUE },
    ],
    // Right column
    [
      { icon: '→',   title: 'Kortare ledtider',        body: 'Tydliga specifikationer — utvecklare kan köra direkt utan tolkning',     fill: C.BLUE_BG,  bd: C.BLUE_BD,  tc: C.BLUE },
      { icon: 'AI',  title: 'AI i alla miljöer',       body: 'R-utvecklare får AI-stöd trots luftgap — högre produktivitet',           fill: C.YELLOW_BG, bd: C.YELLOW_BD, tc: C.YELLOW },
      { icon: '∞',   title: 'Framtidssäkrad plattform', body: 'Modern arkitektur och verktygskedja som växer med organisationen',      fill: C.GREEN_BG, bd: C.GREEN_BD, tc: C.GREEN },
    ],
  ];

  benefits.forEach((col, ci) => {
    const cx = MX + ci * (colW + colG);
    col.forEach((b, ri) => {
      const cy = cY + ri * (cardH + cardG);
      R.push(...addShape(uid('c'), sid, cx, cy, colW, cardH, b.fill, b.bd, pt(1)));
      // Icon
      R.push(...addTextBox(uid('i'), sid, b.icon, cx + in_(0.12), cy + in_(0.12), in_(0.7), in_(0.6),
        { size: 24, bold: true, color: b.tc, align: 'CENTER' }));
      // Title
      R.push(...addTextBox(uid('t'), sid, b.title, cx + in_(0.9), cy + in_(0.1), colW - in_(1.05), in_(0.3),
        { size: 12, bold: true, color: b.tc }));
      // Body
      R.push(...addTextBox(uid('b'), sid, b.body, cx + in_(0.9), cy + in_(0.48), colW - in_(1.05), in_(0.45),
        { size: 9, color: C.TEXT }));
    });
  });

  return R;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 7 — Next Steps
// ═══════════════════════════════════════════════════════════════════════════════
function buildSlide7(sid) {
  const R = [];
  R.push(...slideTitle(sid, 'Vägen framåt',
    'Studien är klar — nästa steg mot implementering'));

  const cY = MY + in_(1.25);
  const phaseW = in_(2.7);
  const phaseH = in_(2.2);
  const phaseG = in_(0.2);

  const phases = [
    {
      num: '1', title: 'Grundläggning', fill: C.GREEN_BG, bd: C.GREEN_BD, tc: C.GREEN,
      items: ['Sätta upp G-repo med grundstruktur', 'Välja designverktyg', 'Utvärdera LLM-modeller för R'],
    },
    {
      num: '2', title: 'Proof of Concept', fill: C.BLUE_BG, bd: C.BLUE_BD, tc: C.BLUE,
      items: ['G → Y → R sammansättning', 'Första UX-designcykel (pilot)', 'Testköra Ollama i simulerad R-miljö'],
    },
    {
      num: '3', title: 'Pilotfunktion', fill: C.YELLOW_BG, bd: C.YELLOW_BD, tc: C.YELLOW,
      items: ['En feature genom hela kedjan', 'Validera process och arkitektur', 'Återkoppling och justering'],
    },
  ];

  phases.forEach((p, i) => {
    const cx = MX + i * (phaseW + phaseG);
    R.push(...addShape(uid('c'), sid, cx, cY, phaseW, phaseH, p.fill, p.bd, pt(1)));
    // Phase number badge
    R.push(...addShape(uid('n'), sid, cx + in_(0.12), cY + in_(0.12), in_(0.35), in_(0.35), p.tc, null));
    R.push(...addTextBox(uid('nt'), sid, p.num, cx + in_(0.12), cY + in_(0.14), in_(0.35), in_(0.3),
      { size: 14, bold: true, color: C.WHITE, align: 'CENTER' }));
    // Title
    R.push(...addTextBox(uid('t'), sid, p.title, cx + in_(0.55), cY + in_(0.14), phaseW - in_(0.7), in_(0.3),
      { size: 14, bold: true, color: p.tc }));
    // Items
    R.push(...addTextBox(uid('b'), sid, p.items.map(x => `–  ${x}`).join('\n'),
      cx + in_(0.2), cY + in_(0.6), phaseW - in_(0.4), phaseH - in_(0.7),
      { size: 11, color: C.TEXT }));

    // Arrow between phases
    if (i < phases.length - 1) {
      R.push(...addTextBox(uid('a'), sid, '→', cx + phaseW, cY + in_(0.85), phaseG, in_(0.4),
        { size: 18, bold: true, color: C.MUTED, align: 'CENTER' }));
    }
  });

  // Bottom banner — decisions needed
  const bannerY = cY + phaseH + in_(0.2);
  R.push(...addShape(uid('b'), sid, MX, bannerY, SLIDE_W - MX * 2, in_(0.7), C.BLUE_BG, C.BLUE_BD, pt(1)));
  R.push(...addTextBox(uid('bt'), sid, 'Behov av inriktning', MX + in_(0.2), bannerY + in_(0.06), in_(2), in_(0.25),
    { size: 10, bold: true, color: C.BLUE }));
  R.push(...addTextBox(uid('bb'), sid,
    'Sammansättning vid bygge eller körning?  ·  Val av designverktyg  ·  Godkännandeprocess för AI på Y-nivå',
    MX + in_(0.2), bannerY + in_(0.32), SLIDE_W - MX * 2 - in_(0.4), in_(0.3),
    { size: 9, color: C.TEXT }));

  return R;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Creating TXX overview presentation…');
  const auth = await getAuthClient();
  slides = google.slides({ version: 'v1', auth });

  // 1. Create blank presentation
  const pres = await slides.presentations.create({
    requestBody: { title: 'TXX — Framtidens utvecklingsplattform' },
  });
  const presId = pres.data.presentationId;
  console.log(`Created: https://docs.google.com/presentation/d/${presId}/edit`);

  // 2. Get the default slide
  const presData = await slides.presentations.get({ presentationId: presId });
  const defaultSlideId = presData.data.slides[0].objectId;

  // 3. Create 6 additional slides (7 total)
  const slideIds = [defaultSlideId];
  const createReqs = [];
  for (let i = 1; i <= 6; i++) {
    const sid = uid('slide');
    slideIds.push(sid);
    createReqs.push({
      createSlide: { objectId: sid, insertionIndex: i, slideLayoutReference: { predefinedLayout: 'BLANK' } },
    });
  }

  await slides.presentations.batchUpdate({
    presentationId: presId,
    requestBody: { requests: createReqs },
  });

  // 4. Remove default placeholder elements from all slides
  const freshData = await slides.presentations.get({ presentationId: presId });
  const deleteReqs = [];
  for (const slide of freshData.data.slides) {
    for (const el of (slide.pageElements || [])) {
      deleteReqs.push({ deleteObject: { objectId: el.objectId } });
    }
  }
  if (deleteReqs.length) {
    await slides.presentations.batchUpdate({
      presentationId: presId,
      requestBody: { requests: deleteReqs },
    });
  }

  // 5. Build all slide content
  const builders = [buildSlide1, buildSlide2, buildSlide3, buildSlide4, buildSlide5, buildSlide6, buildSlide7];
  const allRequests = builders.flatMap((fn, i) => fn(slideIds[i]));

  // 6. Batch in chunks of 50
  const CHUNK = 50;
  for (let i = 0; i < allRequests.length; i += CHUNK) {
    await slides.presentations.batchUpdate({
      presentationId: presId,
      requestBody: { requests: allRequests.slice(i, i + CHUNK) },
    });
  }

  console.log(`\nDone! Open in Google Slides:`);
  console.log(`https://docs.google.com/presentation/d/${presId}/edit`);
}

main().catch(err => {
  console.error(err?.response?.data?.error || err.message);
  process.exit(1);
});
