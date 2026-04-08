/**
 * Appends slide 4 (SW review process diagram) to the existing presentation
 */

import { google } from 'googleapis';
import { getAuthClient } from './client.js';

const PRES_ID = '1xe9RJZevnefoDxz_hxFyGcy26CcPW0GAh1x_h6hywg0';
const auth    = await getAuthClient();
const gslides = google.slides({ version: 'v1', auth });

const pt  = n => n * 12700;
const in_ = n => n * 914400;

const C = {
  TEXT:      { red: 0.122, green: 0.137, blue: 0.157 },
  MUTED:     { red: 0.388, green: 0.431, blue: 0.482 },
  SURFACE:   { red: 0.965, green: 0.973, blue: 0.980 },
  BORDER:    { red: 0.816, green: 0.843, blue: 0.871 },
  GREEN:     { red: 0.102, green: 0.498, blue: 0.216 },
  GREEN_BG:  { red: 0.863, green: 0.996, blue: 0.906 },
  GREEN_BD:  { red: 0.290, green: 0.761, blue: 0.420 },
  YELLOW:    { red: 0.490, green: 0.306, blue: 0.000 },
  YELLOW_BG: { red: 1.000, green: 0.973, blue: 0.773 },
  YELLOW_BD: { red: 0.831, green: 0.655, blue: 0.173 },
  RED:       { red: 0.812, green: 0.133, blue: 0.180 },
  BLUE:      { red: 0.035, green: 0.412, blue: 0.855 },
  BLUE_BG:   { red: 0.875, green: 0.937, blue: 1.000 },
  BLUE_BD:   { red: 0.329, green: 0.682, blue: 1.000 },
};

let _n = 5000;
const uid = p => `${p}_${_n++}`;
const rgb = c => ({ rgbColor: c });
const tc  = c => ({ opaqueColor: rgb(c) });
const emu = (w, h) => ({ width: { magnitude: w, unit: 'EMU' }, height: { magnitude: h, unit: 'EMU' } });
const xfm = (x, y) => ({ scaleX: 1, scaleY: 1, shearX: 0, shearY: 0, translateX: x, translateY: y, unit: 'EMU' });

// ── Diagonal / straight line via rotated thin rectangle ───────────────────────
function line(sid, x1, y1, x2, y2, color, thickPt = 1.5) {
  const id = uid('ln');
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  const cos = dx / len, sin = dy / len;
  const thick = pt(thickPt);
  return [
    {
      createShape: {
        objectId: id, shapeType: 'RECTANGLE',
        elementProperties: {
          pageObjectId: sid,
          size: emu(Math.round(len), thick),
          transform: {
            scaleX: cos, scaleY: cos, shearX: -sin, shearY: sin,
            translateX: Math.round(x1 + sin * thick / 2),
            translateY: Math.round(y1 - cos * thick / 2),
            unit: 'EMU',
          },
        },
      },
    },
    {
      updateShapeProperties: {
        objectId: id,
        shapeProperties: {
          shapeBackgroundFill: { solidFill: { color: rgb(color) } },
          outline: { propertyState: 'NOT_RENDERED' },
        },
        fields: 'shapeBackgroundFill,outline',
      },
    },
  ];
}

// ── Rectangle ──────────────────────────────────────────────────────────────────
function rect(sid, x, y, w, h, fill, border, bwPt = 1.5) {
  const id = uid('rc');
  return [id, [
    {
      createShape: {
        objectId: id, shapeType: 'RECTANGLE',
        elementProperties: { pageObjectId: sid, size: emu(w, h), transform: xfm(x, y) },
      },
    },
    {
      updateShapeProperties: {
        objectId: id,
        shapeProperties: {
          shapeBackgroundFill: fill ? { solidFill: { color: rgb(fill) } } : { propertyState: 'NOT_RENDERED' },
          outline: border
            ? { outlineFill: { solidFill: { color: rgb(border) } }, weight: { magnitude: pt(bwPt), unit: 'EMU' }, dashStyle: 'SOLID' }
            : { propertyState: 'NOT_RENDERED' },
        },
        fields: 'shapeBackgroundFill,outline',
      },
    },
  ]];
}

// ── Text box ───────────────────────────────────────────────────────────────────
function text(sid, str, x, y, w, h, { fs = 10, bold = false, color = C.TEXT, align = 'START' } = {}) {
  const id = uid('tx');
  return [
    {
      createShape: {
        objectId: id, shapeType: 'TEXT_BOX',
        elementProperties: { pageObjectId: sid, size: emu(w, h), transform: xfm(x, y) },
      },
    },
    { insertText: { objectId: id, text: str } },
    {
      updateTextStyle: {
        objectId: id,
        style: { fontSize: { magnitude: fs, unit: 'PT' }, bold, foregroundColor: tc(color), fontFamily: 'Roboto' },
        fields: 'fontSize,bold,foregroundColor,fontFamily',
      },
    },
    { updateParagraphStyle: { objectId: id, style: { alignment: align }, fields: 'alignment' } },
  ];
}

// ── Labeled box ────────────────────────────────────────────────────────────────
function labelBox(sid, title, sub, x, y, w, h, fill, border, titleColor = C.TEXT) {
  const [, rr] = rect(sid, x, y, w, h, fill, border);
  return [
    ...rr,
    ...text(sid, title, x, y + in_(0.06), w, in_(0.28), { fs: 10, bold: true, color: titleColor, align: 'CENTER' }),
    ...(sub ? text(sid, sub, x, y + in_(0.33), w, in_(0.2), { fs: 8, color: C.MUTED, align: 'CENTER' }) : []),
  ];
}

// ══════════════════════════════════════════════════════════════════════════════
function buildSlide4(sid) {
  const R = [];
  const W = in_(10), MX = in_(0.45), MY = in_(0.18);

  // Title + rule
  R.push(...text(sid, 'Mjukvarugranskningsprocess', MX, MY, W - MX * 2, in_(0.48), { fs: 22, bold: true }));
  R.push(...line(sid, MX, MY + in_(0.52), W - MX, MY + in_(0.52), C.BORDER, 0.8));

  // Legend (top right)
  const lx = in_(7.65), ly = in_(0.75), lw = in_(2.1), lh = in_(1.25);
  const [, lr] = rect(sid, lx, ly, lw, lh, C.SURFACE, C.BORDER, 0.8);
  R.push(...lr);
  [
    'CRP  =  Change Request',
    'swPR  =  SW Program Review',
    'swPDR  =  SW Prelim. Design Review',
    'swAR  =  SW Architecture Review',
    'swCDR  =  SW Critical Design Review',
  ].forEach((s, i) => R.push(...text(sid, s, lx + in_(0.1), ly + in_(0.1) + i * in_(0.21), lw - in_(0.2), in_(0.2), { fs: 8, color: C.MUTED })));

  // ── Section 1: Input flow ──────────────────────────────────────────────────
  const s1y = in_(0.75), bH = in_(0.55), bW = in_(1.05);

  R.push(...labelBox(sid, 'CRP', 'högnivå krav', MX, s1y, bW, bH, C.YELLOW_BG, C.YELLOW_BD, C.YELLOW));

  const aY = s1y + bH / 2, oX = MX + bW + in_(0.18), oW = in_(1.1);
  R.push(...line(sid, MX + bW, aY, oX, aY, C.MUTED, 1.2));
  R.push(...text(sid, '›', oX - in_(0.08), aY - in_(0.16), in_(0.18), in_(0.32), { fs: 14, bold: true, color: C.MUTED, align: 'CENTER' }));
  R.push(...labelBox(sid, 'Överlämning', 'Starg Ctx', oX, s1y + in_(0.05), oW, bH - in_(0.1), C.SURFACE, C.BORDER));

  const oCX = oX + oW / 2, oBot = s1y + bH, forkY = oBot + in_(0.15);
  R.push(...line(sid, oCX, oBot, oCX, forkY, C.MUTED, 1.2));

  const pW = in_(1.0), pGap = in_(0.14);
  const pLX = oCX - pW - pGap / 2, pRX = oCX + pGap / 2;
  const pLCX = pLX + pW / 2, pRCX = pRX + pW / 2;
  const pY = forkY + in_(0.15), pH = in_(0.38);

  R.push(...line(sid, pLCX, forkY, pRCX, forkY, C.MUTED, 1.2));
  R.push(...line(sid, pLCX, forkY, pLCX, pY, C.MUTED, 1.2));
  R.push(...line(sid, pRCX, forkY, pRCX, pY, C.MUTED, 1.2));

  R.push(...labelBox(sid, 'swUI-PDR', null, pLX, pY, pW, pH, C.BLUE_BG, C.BLUE_BD, C.BLUE));
  R.push(...text(sid, '↔', pLX + pW, pY + in_(0.06), pGap, pH, { fs: 12, bold: true, color: C.BLUE, align: 'CENTER' }));
  R.push(...labelBox(sid, 'swDev-PDR', null, pRX, pY, pW, pH, C.BLUE_BG, C.BLUE_BD, C.BLUE));

  // ── Section 2: Timeline ────────────────────────────────────────────────────
  const tlY = in_(2.22), tlL = MX, tlR = in_(7.55);
  R.push(...line(sid, tlL, tlY, tlR, tlY, C.TEXT, 2));
  R.push(...text(sid, '→', tlR - in_(0.05), tlY - in_(0.17), in_(0.22), in_(0.34), { fs: 15, bold: true, color: C.TEXT, align: 'CENTER' }));
  R.push(...text(sid, '×', tlR + in_(0.13), tlY - in_(0.16), in_(0.22), in_(0.32), { fs: 13, bold: true, color: C.RED, align: 'CENTER' }));

  const ms = [
    { label: 'swPR',  x: in_(1.2),  hi: false },
    { label: 'swPDR', x: in_(2.55), hi: true  },
    { label: 'swAR',  x: in_(4.5),  hi: false },
    { label: 'swCDR', x: in_(6.6),  hi: false },
  ];
  ms.forEach(m => {
    R.push(...line(sid, m.x, tlY - pt(9), m.x, tlY + pt(9), C.TEXT, 2));
    R.push(...text(sid, m.label, m.x - in_(0.32), tlY + in_(0.08), in_(0.64), in_(0.22),
      { fs: 9, bold: m.hi, color: m.hi ? C.BLUE : C.TEXT, align: 'CENTER' }));
  });

  // UX review + demo
  const uxX = in_(4.95), uxY = tlY + in_(0.28), uxW = in_(1.45), uxH = in_(0.38);
  R.push(...labelBox(sid, 'UX review + demo', null, uxX, uxY, uxW, uxH, C.GREEN_BG, C.GREEN_BD, C.GREEN));
  R.push(...line(sid, uxX + uxW / 2, uxY, uxX + uxW / 2, tlY, C.GREEN_BD, 0.8));

  // Arrows from PDR boxes to swPDR
  R.push(...line(sid, pLCX, pY + pH, ms[1].x, tlY, C.MUTED, 0.8));
  R.push(...line(sid, pRCX, pY + pH, ms[1].x, tlY, C.MUTED, 0.8));

  // ── Section 3: Swim lanes ──────────────────────────────────────────────────
  const divY = tlY + in_(0.82);
  R.push(...line(sid, 0, divY, W, divY, C.BORDER, 0.5));

  const lStart = in_(1.5), lEnd = in_(9.25), xX = lEnd + in_(0.08);
  const cxS = in_(4.4), cxE = in_(5.8);

  const ly1 = divY + in_(0.42);
  const ly2 = divY + in_(1.0);
  const ly3 = divY + in_(1.55);

  R.push(...text(sid, 'Teknisk\nLedning', in_(0.05), ly1 - in_(0.15), in_(1.35), in_(0.42), { fs: 9, bold: true, color: C.TEXT }));
  R.push(...text(sid, 'UI/UX',           in_(0.05), ly2 - in_(0.12), in_(1.35), in_(0.26), { fs: 9, bold: true, color: C.BLUE }));
  R.push(...text(sid, 'Team',            in_(0.05), ly3 - in_(0.12), in_(1.35), in_(0.26), { fs: 9, bold: true, color: C.GREEN }));

  // Teknisk Ledning — straight
  R.push(...line(sid, lStart, ly1, lEnd, ly1, C.TEXT, 1.5));
  R.push(...text(sid, '×', xX, ly1 - in_(0.13), in_(0.2), in_(0.26), { fs: 13, bold: true, color: C.RED }));

  // UI/UX — crosses down to ly3
  R.push(...line(sid, lStart, ly2, cxS, ly2, C.BLUE, 2));
  R.push(...line(sid, cxS, ly2, cxE, ly3, C.BLUE, 2));
  R.push(...line(sid, cxE, ly3, lEnd, ly3, C.BLUE, 2));
  R.push(...text(sid, '×', xX, ly3 - in_(0.13), in_(0.2), in_(0.26), { fs: 13, bold: true, color: C.RED }));

  // Team — crosses up to ly2
  R.push(...line(sid, lStart, ly3, cxS, ly3, C.GREEN, 2));
  R.push(...line(sid, cxS, ly3, cxE, ly2, C.GREEN, 2));
  R.push(...line(sid, cxE, ly2, lEnd, ly2, C.GREEN, 2));
  R.push(...text(sid, '×', xX, ly2 - in_(0.13), in_(0.2), in_(0.26), { fs: 13, bold: true, color: C.RED }));

  return R;
}

// ── Run ────────────────────────────────────────────────────────────────────────
const slideId = uid('s4sl');

await gslides.presentations.batchUpdate({
  presentationId: PRES_ID,
  requestBody: { requests: [{ createSlide: { objectId: slideId, slideLayoutReference: { predefinedLayout: 'BLANK' } } }] },
});

const pd = await gslides.presentations.get({ presentationId: PRES_ID });
const newSlide = pd.data.slides[pd.data.slides.length - 1];
const delReqs = (newSlide.pageElements || []).map(el => ({ deleteObject: { objectId: el.objectId } }));
if (delReqs.length) {
  await gslides.presentations.batchUpdate({ presentationId: PRES_ID, requestBody: { requests: delReqs } });
}

const all = buildSlide4(slideId);
for (let i = 0; i < all.length; i += 50) {
  await gslides.presentations.batchUpdate({
    presentationId: PRES_ID,
    requestBody: { requests: all.slice(i, i + 50) },
  });
}

console.log(`Done: https://docs.google.com/presentation/d/${PRES_ID}/edit`);
