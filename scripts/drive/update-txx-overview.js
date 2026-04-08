/**
 * Updates the existing TXX overview presentation in-place.
 * Rebuilds slides 2, 4, 5, 6 with consistent pillar-based coloring and layout.
 *
 * Color key (by pillar):
 *   Blue   = Architecture
 *   Green  = UX / Design
 *   Yellow = AI Workflow
 *   Red    = Problems (slide 2 only)
 *
 * Box types:
 *   Concept boxes: colored fill + colored border  (pillars, layers, phases, deliverables)
 *   Info boxes:    white bg + colored left stripe  (facts, benefits, key points)
 */

import { google } from 'googleapis';
import { getAuthClient } from './client.js';

const PRES_ID = '1xF6tQkUiKGxsVVroGUslfR0HEoJwOsPIkH-QLROBvrQ';

const C = {
  TEXT:       { red: 0.122, green: 0.137, blue: 0.157 },
  MUTED:     { red: 0.388, green: 0.431, blue: 0.482 },
  SURFACE:   { red: 0.965, green: 0.973, blue: 0.980 },
  BORDER:    { red: 0.816, green: 0.843, blue: 0.871 },
  WHITE:     { red: 1, green: 1, blue: 1 },
  GREEN:     { red: 0.102, green: 0.498, blue: 0.216 },
  GREEN_BG:  { red: 0.863, green: 0.996, blue: 0.906 },
  GREEN_BD:  { red: 0.290, green: 0.761, blue: 0.420 },
  YELLOW:    { red: 0.490, green: 0.306, blue: 0 },
  YELLOW_BG: { red: 1, green: 0.973, blue: 0.773 },
  YELLOW_BD: { red: 0.831, green: 0.655, blue: 0.173 },
  RED:       { red: 0.812, green: 0.133, blue: 0.180 },
  RED_BG:    { red: 1, green: 0.922, blue: 0.914 },
  RED_BD:    { red: 1, green: 0.506, blue: 0.510 },
  BLUE:      { red: 0.035, green: 0.412, blue: 0.855 },
  BLUE_BG:   { red: 0.875, green: 0.937, blue: 1 },
  BLUE_BD:   { red: 0.329, green: 0.682, blue: 1 },
};

const pt  = n => n * 12700;
const in_ = n => n * 914400;

function rgb(c)       { return { rgbColor: c }; }
function textColor(c) { return { opaqueColor: rgb(c) }; }
function size(w, h)   { return { width: { magnitude: w, unit: 'EMU' }, height: { magnitude: h, unit: 'EMU' } }; }
function pos(x, y)    { return { translateX: x, translateY: y, scaleX: 1, scaleY: 1, unit: 'EMU' }; }

let _id = 8000;
function uid(p) { return `${p}_${_id++}`; }

const SLIDE_W = in_(10);
const MX = in_(0.5);
const MY = in_(0.4);

function addShape(id, sid, x, y, w, h, fill, border, bw = 0) {
  return [
    { createShape: { objectId: id, shapeType: 'RECTANGLE', elementProperties: { pageObjectId: sid, size: size(w, h), transform: pos(x, y) } } },
    { updateShapeProperties: { objectId: id, shapeProperties: {
      shapeBackgroundFill: fill ? { solidFill: { color: rgb(fill) } } : { propertyState: 'NOT_RENDERED' },
      outline: border ? { outlineFill: { solidFill: { color: rgb(border) } }, weight: { magnitude: bw || pt(1), unit: 'EMU' }, dashStyle: 'SOLID' } : { propertyState: 'NOT_RENDERED' },
    }, fields: 'shapeBackgroundFill,outline' } },
  ];
}

function addTextBox(id, sid, text, x, y, w, h, { size: fs = 11, bold = false, color = C.TEXT, align = 'START' } = {}) {
  return [
    { createShape: { objectId: id, shapeType: 'TEXT_BOX', elementProperties: { pageObjectId: sid, size: size(w, h), transform: pos(x, y) } } },
    { insertText: { objectId: id, text } },
    { updateTextStyle: { objectId: id, style: { fontSize: { magnitude: fs, unit: 'PT' }, bold, foregroundColor: textColor(color), fontFamily: 'Roboto' }, fields: 'fontSize,bold,foregroundColor,fontFamily' } },
    { updateParagraphStyle: { objectId: id, style: { alignment: align, lineSpacing: 100, spaceBelow: { magnitude: 0, unit: 'PT' } }, fields: 'alignment,lineSpacing,spaceBelow' } },
  ];
}

function slideTitle(sid, title, sub = null) {
  const R = [];
  R.push(...addTextBox(uid('t'), sid, title, MX, MY, SLIDE_W - MX * 2, in_(0.7), { size: 28, bold: true, color: C.TEXT }));
  if (sub) R.push(...addTextBox(uid('s'), sid, sub, MX, MY + in_(0.72), SLIDE_W - MX * 2, in_(0.3), { size: 12, color: C.MUTED }));
  R.push(...addShape(uid('r'), sid, MX, MY + in_(1.08), SLIDE_W - MX * 2, pt(1.5), C.BORDER, null));
  return R;
}

// ── Info box: white bg + colored left stripe + subtle bottom border ──────────
function infoBox(sid, x, y, w, h, stripeColor) {
  return [
    ...addShape(uid('ib'), sid, x, y, w, h, C.WHITE, C.BORDER, pt(1)),
    ...addShape(uid('st'), sid, x, y, pt(4), h, stripeColor, null),
  ];
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 2 — Problem vs Solution
//   Problems = info boxes (red stripe)
//   Solutions = info boxes, colored by pillar they solve
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

  R.push(...addTextBox(uid('l'), sid, 'IDAG', lx, cY, colW, in_(0.25), { size: 9, bold: true, color: C.RED }));
  R.push(...addTextBox(uid('l'), sid, 'MED TXX', rx, cY, colW, in_(0.25), { size: 9, bold: true, color: C.BLUE }));

  const startY = cY + in_(0.35);

  R.push(...addTextBox(uid('a'), sid, '→', MX + colW + in_(0.08), startY + cardH + in_(0.02), in_(0.45), in_(0.5),
    { size: 22, bold: true, color: C.BLUE, align: 'CENTER' }));

  // Problems — all red (pain points)
  const problems = [
    { title: 'Dubbelarbete',                    body: 'Samma funktionalitet byggs och underhålls tre gånger' },
    { title: 'Inkonsekvent UX',                 body: 'Varje team tolkar krav på sitt sätt — olika upplevelser' },
    { title: 'Verktygsglapp i begränsade miljöer', body: 'Utvecklare utan AI-stöd i den mest komplexa miljön' },
  ];
  // Solutions — colored by which pillar solves them
  const solutions = [
    { title: 'En kodbas',        body: 'G bygger grunden, Y och R lägger till — inget dubbelarbete',   stripe: C.BLUE,   tc: C.BLUE },   // Architecture
    { title: 'Designstyrd UX',   body: 'Godkänd design innan en rad kod skrivs — konsekvent upplevelse', stripe: C.GREEN,  tc: C.GREEN },  // UX
    { title: 'AI på alla nivåer', body: 'Lokala LLM-modeller ger alla utvecklare samma AI-stöd',        stripe: C.YELLOW, tc: C.YELLOW }, // AI
  ];

  problems.forEach((p, i) => {
    const cy = startY + i * (cardH + cardG);
    R.push(...infoBox(sid, lx, cy, colW, cardH, C.RED));
    R.push(...addTextBox(uid('t'), sid, p.title, lx + in_(0.2), cy + in_(0.12), colW - in_(0.4), in_(0.3),
      { size: 12, bold: true, color: C.RED }));
    R.push(...addTextBox(uid('b'), sid, p.body, lx + in_(0.2), cy + in_(0.48), colW - in_(0.4), in_(0.45),
      { size: 10, color: C.TEXT }));
  });

  solutions.forEach((s, i) => {
    const cy = startY + i * (cardH + cardG);
    R.push(...infoBox(sid, rx, cy, colW, cardH, s.stripe));
    R.push(...addTextBox(uid('t'), sid, s.title, rx + in_(0.2), cy + in_(0.12), colW - in_(0.4), in_(0.3),
      { size: 12, bold: true, color: s.tc }));
    R.push(...addTextBox(uid('b'), sid, s.body, rx + in_(0.2), cy + in_(0.48), colW - in_(0.4), in_(0.45),
      { size: 10, color: C.TEXT }));
  });

  return R;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 4 — Deliverables (concept boxes — colored fill + border by pillar)
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
      name: 'TXX UI Framework 1.0',                                          // Green = UX/Design
      fill: C.GREEN_BG, bd: C.GREEN_BD, tc: C.GREEN,
      desc: 'Enhetligt komponentbibliotek och designsystem',
      items: 'Design tokens  ·  Komponentbibliotek  ·  Responsiva mallar  ·  XAML-resurser',
    },
    {
      name: 'TXX WPF UI Library 1.0',                                        // Blue = Architecture
      fill: C.BLUE_BG, bd: C.BLUE_BD, tc: C.BLUE,
      desc: 'WPF-applikation med modulär arkitektur',
      items: 'Prism-moduler  ·  MVVM-mönster  ·  Regionbaserad komposition  ·  Async-mönster',
    },
    {
      name: 'TXX Core Library 1.0',                                          // Blue = Architecture
      fill: C.BLUE_BG, bd: C.BLUE_BD, tc: C.BLUE,
      desc: 'Delad kärna med domänmodeller och applikationslogik',
      items: 'Clean architecture  ·  DI-baserad komposition  ·  Vertikala feature-skivor  ·  EF Core 8',
    },
    {
      name: 'TXX AI Workflow 1.0',                                           // Yellow = AI
      fill: C.YELLOW_BG, bd: C.YELLOW_BD, tc: C.YELLOW,
      desc: 'AI-verktygskedja för utvecklarproduktivitet',
      items: 'Lokal LLM (Ollama)  ·  IDE-integration  ·  RAG-pipeline  ·  Modellhantering',
    },
  ];

  deliverables.forEach((d, i) => {
    const cy = cY + i * (cardH + cardG);
    // Concept box — colored fill + colored border
    R.push(...addShape(uid('c'), sid, MX, cy, fullW, cardH, d.fill, d.bd, pt(1)));
    // Name
    R.push(...addTextBox(uid('n'), sid, d.name, MX + in_(0.15), cy + in_(0.12), in_(3.2), in_(0.3),
      { size: 13, bold: true, color: d.tc }));
    // Description
    R.push(...addTextBox(uid('d'), sid, d.desc, MX + in_(0.15), cy + in_(0.48), in_(3.2), in_(0.3),
      { size: 9, color: C.MUTED }));
    // Items on right
    R.push(...addTextBox(uid('i'), sid, d.items, MX + in_(3.5), cy + in_(0.18), fullW - in_(3.7), in_(0.55),
      { size: 9, color: C.TEXT }));
  });

  return R;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 5 — G/Y/R Model
//   Layers = concept boxes (G/Y/R colored by restriction level)
//   Key points = info boxes (all Blue — architecture facts)
// ═══════════════════════════════════════════════════════════════════════════════
function buildSlide5(sid) {
  const R = [];
  R.push(...slideTitle(sid, 'En kodbas — tre nivåer',
    'Varje nivå bygger på den föregående utan att ändra den'));

  const cY = MY + in_(1.35);
  const diagramW = in_(5.0);
  const rightX = MX + diagramW + in_(0.4);
  const rightW = SLIDE_W - rightX - MX;

  // Concept boxes — layers (G/Y/R use their own restriction-level colors)
  const layers = [
    { label: 'G — Arkitekturellt ramverk',  sub: 'Fullständigt UI, mockdata, alla kontrakt',       fill: C.GREEN_BG,  bd: C.GREEN_BD,  tc: C.GREEN,  x: MX,            y: cY + in_(2.4), w: in_(4.8), h: in_(1.0) },
    { label: 'Y — Begränsad nivå',          sub: 'Riktiga integrationer och operativ data',        fill: C.YELLOW_BG, bd: C.YELLOW_BD, tc: C.YELLOW, x: MX + in_(0.25), y: cY + in_(1.4), w: in_(4.3), h: in_(0.85) },
    { label: 'R — Mest restriktiv nivå',    sub: 'Komplett funktionalitet och skyddad data',       fill: C.RED_BG,    bd: C.RED_BD,    tc: C.RED,    x: MX + in_(0.5),  y: cY + in_(0.5), w: in_(3.8), h: in_(0.75) },
  ];

  for (const l of layers) {
    R.push(...addShape(uid('l'), sid, l.x, l.y, l.w, l.h, l.fill, l.bd, pt(1)));
    R.push(...addTextBox(uid('t'), sid, l.label, l.x + in_(0.15), l.y + in_(0.08), l.w - in_(0.3), in_(0.28),
      { size: 11, bold: true, color: l.tc }));
    R.push(...addTextBox(uid('s'), sid, l.sub, l.x + in_(0.15), l.y + in_(0.38), l.w - in_(0.3), in_(0.28),
      { size: 9, color: C.MUTED }));
  }

  R.push(...addTextBox(uid('f'), sid, 'G  →  Y  →  R  =  Komplett applikation',
    MX, cY + in_(3.55), diagramW, in_(0.3),
    { size: 11, bold: true, color: C.BLUE, align: 'CENTER' }));

  // Info boxes — all architecture points → all Blue
  const rh = in_(0.82);
  const rg = in_(0.12);

  const points = [
    'Kod flödar G → Y → R\n— aldrig uppåt',
    'G-tester passerar\npå alla nivåer',
    'Inga känsliga detaljer\nexponeras i G-nivån',
    'DI ersätter implementationer\n— aldrig kontrakt',
  ];

  points.forEach((text, i) => {
    const py = cY + in_(0.15) + i * (rh + rg);
    R.push(...infoBox(sid, rightX, py, rightW, rh, C.BLUE));
    R.push(...addTextBox(uid('t'), sid, text, rightX + in_(0.18), py + in_(0.12), rightW - in_(0.35), rh - in_(0.24),
      { size: 10, bold: true, color: C.BLUE }));
  });

  return R;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 6 — Benefits (info boxes, colored by pillar)
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
    [                                                                                             // Left column
      { icon: '1×',  title: 'Mindre dubbelarbete',      body: 'En kodbas istället för tre — funktionalitet byggs en gång',             stripe: C.BLUE,   tc: C.BLUE },   // Architecture
      { icon: '10×', title: 'Lägre felkostnad',         body: 'Fel fångas i design, inte i produktion — tidig feedback sparar pengar',  stripe: C.GREEN,  tc: C.GREEN },  // UX
      { icon: 'UX',  title: 'Konsekvent UX',            body: 'Godkänd design garanterar samma upplevelse i hela systemet',             stripe: C.GREEN,  tc: C.GREEN },  // UX
    ],
    [                                                                                             // Right column
      { icon: '→',   title: 'Kortare ledtider',         body: 'Tydliga specifikationer — utvecklare kan köra direkt utan tolkning',     stripe: C.GREEN,  tc: C.GREEN },  // UX
      { icon: 'AI',  title: 'AI i alla miljöer',        body: 'Utvecklare får AI-stöd i alla miljöer — även offline',                   stripe: C.YELLOW, tc: C.YELLOW }, // AI
      { icon: '∞',   title: 'Framtidssäkrad plattform', body: 'Modern arkitektur och verktygskedja som växer med organisationen',       stripe: C.BLUE,   tc: C.BLUE },   // Architecture
    ],
  ];

  benefits.forEach((col, ci) => {
    const cx = MX + ci * (colW + colG);
    col.forEach((b, ri) => {
      const cy = cY + ri * (cardH + cardG);
      R.push(...infoBox(sid, cx, cy, colW, cardH, b.stripe));
      R.push(...addTextBox(uid('i'), sid, b.icon, cx + in_(0.15), cy + in_(0.12), in_(0.65), in_(0.6),
        { size: 24, bold: true, color: b.tc, align: 'CENTER' }));
      R.push(...addTextBox(uid('t'), sid, b.title, cx + in_(0.9), cy + in_(0.1), colW - in_(1.05), in_(0.3),
        { size: 12, bold: true, color: b.tc }));
      R.push(...addTextBox(uid('b'), sid, b.body, cx + in_(0.9), cy + in_(0.48), colW - in_(1.05), in_(0.45),
        { size: 9, color: C.TEXT }));
    });
  });

  return R;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const auth = await getAuthClient();
  const sl = google.slides({ version: 'v1', auth });

  console.log('Reading presentation…');
  const pres = await sl.presentations.get({ presentationId: PRES_ID });
  const slideIds = pres.data.slides.map(s => s.objectId);

  // Slides to rebuild: 2 (index 1), 4 (index 3), 5 (index 4), 6 (index 5)
  const toRebuild = [
    { index: 1, builder: buildSlide2 },
    { index: 3, builder: buildSlide4 },
    { index: 4, builder: buildSlide5 },
    { index: 5, builder: buildSlide6 },
  ];

  for (const { index, builder } of toRebuild) {
    const sid = slideIds[index];
    const slide = pres.data.slides[index];
    const label = `Slide ${index + 1}`;

    const delReqs = (slide.pageElements || []).map(el => ({ deleteObject: { objectId: el.objectId } }));
    if (delReqs.length) {
      console.log(`${label}: deleting ${delReqs.length} elements…`);
      await sl.presentations.batchUpdate({ presentationId: PRES_ID, requestBody: { requests: delReqs } });
    }

    _id = 8000 + index * 500;  // ensure unique IDs per slide
    const reqs = builder(sid);
    console.log(`${label}: creating ${reqs.length} requests…`);
    const CHUNK = 50;
    for (let i = 0; i < reqs.length; i += CHUNK) {
      await sl.presentations.batchUpdate({ presentationId: PRES_ID, requestBody: { requests: reqs.slice(i, i + CHUNK) } });
    }
    console.log(`${label}: done`);
  }

  console.log(`\nUpdated: https://docs.google.com/presentation/d/${PRES_ID}/edit`);
}

main().catch(err => {
  console.error(err?.response?.data?.error || err.message);
  process.exit(1);
});
