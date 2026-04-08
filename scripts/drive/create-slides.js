/**
 * Creates the UX-first presentation as a Google Slides deck on Drive
 */

import { google } from 'googleapis';
import { getAuthClient } from './client.js';

let slides, drive; // initialized in main()

// ── Palette ──────────────────────────────────────────────────────────────────
const C = {
  TEXT:      { red: 0.122, green: 0.137, blue: 0.157 },
  MUTED:     { red: 0.388, green: 0.431, blue: 0.482 },
  SURFACE:   { red: 0.965, green: 0.973, blue: 0.980 },
  BORDER:    { red: 0.816, green: 0.843, blue: 0.871 },
  WHITE:     { red: 1,     green: 1,     blue: 1     },
  GREEN:     { red: 0.102, green: 0.498, blue: 0.216 },
  GREEN_BG:  { red: 0.863, green: 0.996, blue: 0.906 },
  GREEN_BD:  { red: 0.290, green: 0.761, blue: 0.420 },
  YELLOW:    { red: 0.490, green: 0.306, blue: 0 },
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

function rgb(c)      { return { rgbColor: c }; }
function solidFill(c){ return { solidFill: { color: rgb(c) } }; }   // for shape fills
function textColor(c){ return { opaqueColor: rgb(c) }; }            // for text foregroundColor

function size(w, h) { return { width: { magnitude: w, unit: 'EMU' }, height: { magnitude: h, unit: 'EMU' } }; }
function pos(x, y)  { return { translateX: x, translateY: y, scaleX: 1, scaleY: 1, unit: 'EMU' }; }

let _idCounter = 1000;
function uid(prefix) { return `${prefix}_${_idCounter++}`; }

// ── Request builders ──────────────────────────────────────────────────────────

function addSlide(slideId, layoutRef = 'BLANK') {
  return {
    insertText: undefined,
    createSlide: {
      objectId: slideId,
      slideLayoutReference: { predefinedLayout: layoutRef },
    },
  };
}

function deleteAllSlideElements(slideId) {
  // handled after creation by reading existing elements
  return null;
}

function addShape(id, slideId, x, y, w, h, fillColor, borderColor, borderWidth = 0) {
  const reqs = [
    {
      createShape: {
        objectId: id,
        shapeType: 'RECTANGLE',
        elementProperties: {
          pageObjectId: slideId,
          size: size(w, h),
          transform: pos(x, y),
        },
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
            ? {
                outlineFill: { solidFill: { color: rgb(borderColor) } },
                weight: { magnitude: borderWidth || pt(1), unit: 'EMU' },
                dashStyle: 'SOLID',
              }
            : { propertyState: 'NOT_RENDERED' },
        },
        fields: 'shapeBackgroundFill,outline',
      },
    },
  ];
  return reqs;
}

function addTextBox(id, slideId, text, x, y, w, h, {
  size: fontSize = 11,
  bold = false,
  color = C.TEXT,
  align = 'START',
  valign = 'TOP',
  wrap = true,
} = {}) {
  return [
    {
      createShape: {
        objectId: id,
        shapeType: 'TEXT_BOX',
        elementProperties: {
          pageObjectId: slideId,
          size: size(w, h),
          transform: pos(x, y),
        },
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
        style: { alignment: align },
        fields: 'alignment',
      },
    },
  ];
}

// ── Slide builders ────────────────────────────────────────────────────────────

const SLIDE_W = in_(10);
const SLIDE_H = in_(5.625);

// margins
const MX = in_(0.5);
const MY = in_(0.4);

function slideTitle(slideId, title, sub = null) {
  const reqs = [];
  const tid = uid('title');
  reqs.push(...addTextBox(tid, slideId, title, MX, MY, SLIDE_W - MX * 2, in_(0.7), {
    size: 28, bold: true, color: C.TEXT,
  }));
  if (sub) {
    const sid = uid('sub');
    reqs.push(...addTextBox(sid, slideId, sub, MX, MY + in_(0.72), SLIDE_W - MX * 2, in_(0.3), {
      size: 12, color: C.MUTED,
    }));
  }
  // rule
  const rid = uid('rule');
  reqs.push(...addShape(rid, slideId, MX, MY + in_(1.08), SLIDE_W - MX * 2, pt(1.5), C.BORDER, null));
  return reqs;
}

// ─── SLIDE 1: Processen ───────────────────────────────────────────────────────

function buildSlide1(slideId) {
  const reqs = [];
  reqs.push(...slideTitle(slideId, 'Hur processen ser ut — och hur den borde se ut'));

  const contentY = MY + in_(1.2);
  const boxH = in_(0.75);
  const arrowW = in_(0.4);

  // ── NU row ──
  const nuLabelId = uid('nu');
  reqs.push(...addTextBox(nuLabelId, slideId, 'NU', MX, contentY, in_(0.5), in_(0.3), {
    size: 9, bold: true, color: C.RED,
  }));

  const nuY = contentY + in_(0.32);
  const boxes = [
    { label: 'Krav',         sub: null,                    fill: C.SURFACE, bd: C.BORDER, tc: C.TEXT },
    { label: 'Design',       sub: null,                    fill: C.SURFACE, bd: C.BORDER, tc: C.TEXT },
    { label: 'Utveckling',   sub: null,                    fill: C.SURFACE, bd: C.BORDER, tc: C.TEXT },
    { label: 'Reaktiv UI/UX',sub: 'Efterhandsgranskning',  fill: C.RED_BG,  bd: C.RED_BD, tc: C.RED  },
  ];

  const totalW = SLIDE_W - MX * 2;
  const numArrows = boxes.length - 1;
  const boxW = (totalW - arrowW * numArrows) / boxes.length;

  boxes.forEach((b, i) => {
    const bx = MX + i * (boxW + arrowW);
    const bid = uid('box');
    reqs.push(...addShape(bid, slideId, bx, nuY, boxW, boxH, b.fill, b.bd, pt(1.5)));
    const btid = uid('bt');
    reqs.push(...addTextBox(btid, slideId, b.label, bx, nuY + in_(0.18), boxW, in_(0.3), {
      size: 12, bold: true, color: b.tc, align: 'CENTER',
    }));
    if (b.sub) {
      const bsid = uid('bs');
      reqs.push(...addTextBox(bsid, slideId, b.sub, bx, nuY + in_(0.48), boxW, in_(0.22), {
        size: 9, color: C.MUTED, align: 'CENTER',
      }));
    }
    if (i < boxes.length - 1) {
      const aid = uid('arr');
      reqs.push(...addTextBox(aid, slideId, '→', bx + boxW, nuY + in_(0.22), arrowW, in_(0.3), {
        size: 16, bold: true, color: C.RED, align: 'CENTER',
      }));
    }
  });

  // NU callout
  const ncid = uid('nc');
  reqs.push(...addTextBox(ncid, slideId,
    '⚠  UI/UX kommer för sent — dyrt att rätta',
    MX + (boxW + arrowW) * 3, nuY + boxH + in_(0.05),
    boxW, in_(0.25), { size: 9, color: C.RED, align: 'CENTER' }));

  // ── BÄTTRE row ──
  const divId = uid('div');
  const divY = nuY + boxH + in_(0.52);
  reqs.push(...addShape(divId, slideId, MX, divY, SLIDE_W - MX * 2, pt(1), C.BORDER, null));

  const betLabelId = uid('bet');
  reqs.push(...addTextBox(betLabelId, slideId, 'BÄTTRE', MX, divY + in_(0.12), in_(0.8), in_(0.28), {
    size: 9, bold: true, color: C.GREEN,
  }));

  const betY = divY + in_(0.42);
  const comboW = boxW * 2 + arrowW;

  // Krav
  const kbid = uid('kb'); const kbtid = uid('kbt');
  reqs.push(...addShape(kbid, slideId, MX, betY, boxW, boxH, C.SURFACE, C.BORDER, pt(1.5)));
  reqs.push(...addTextBox(kbtid, slideId, 'Krav', MX, betY + in_(0.22), boxW, in_(0.3), {
    size: 12, bold: true, color: C.TEXT, align: 'CENTER',
  }));

  // Arrow
  const a1id = uid('a1');
  reqs.push(...addTextBox(a1id, slideId, '→', MX + boxW, betY + in_(0.22), arrowW, in_(0.3), {
    size: 16, bold: true, color: C.GREEN, align: 'CENTER',
  }));

  // UI/UX ↔ Design combo box
  const cbx = MX + boxW + arrowW;
  const cbid = uid('cb'); const cbtid = uid('cbt'); const cbsid = uid('cbs');
  reqs.push(...addShape(cbid, slideId, cbx, betY, comboW, boxH, C.BLUE_BG, C.BLUE_BD, pt(2)));
  reqs.push(...addTextBox(cbtid, slideId, 'UI/UX  ↔  Design', cbx, betY + in_(0.15), comboW, in_(0.35), {
    size: 14, bold: true, color: C.BLUE, align: 'CENTER',
  }));
  reqs.push(...addTextBox(cbsid, slideId, 'Iterativt — innan kod skrivs', cbx, betY + in_(0.5), comboW, in_(0.22), {
    size: 9, color: C.MUTED, align: 'CENTER',
  }));

  // Arrow
  const a2id = uid('a2');
  reqs.push(...addTextBox(a2id, slideId, '→', cbx + comboW, betY + in_(0.22), arrowW, in_(0.3), {
    size: 16, bold: true, color: C.GREEN, align: 'CENTER',
  }));

  // Utveckling box
  const devX = cbx + comboW + arrowW;
  const dbid = uid('db'); const dbtid = uid('dbt'); const dbsid = uid('dbs');
  reqs.push(...addShape(dbid, slideId, devX, betY, boxW, boxH, C.GREEN_BG, C.GREEN_BD, pt(1.5)));
  reqs.push(...addTextBox(dbtid, slideId, 'Utveckling', devX, betY + in_(0.15), boxW, in_(0.3), {
    size: 12, bold: true, color: C.GREEN, align: 'CENTER',
  }));
  reqs.push(...addTextBox(dbsid, slideId, 'Tydlig spec', devX, betY + in_(0.45), boxW, in_(0.22), {
    size: 9, color: C.MUTED, align: 'CENTER',
  }));

  // BÄTTRE callout
  const bcid = uid('bc');
  reqs.push(...addTextBox(bcid, slideId,
    '✓  Alla frågor besvarade innan första raden kod',
    cbx, betY + boxH + in_(0.05), comboW + boxW + arrowW, in_(0.25),
    { size: 9, color: C.GREEN, align: 'CENTER' }));

  return reqs;
}

// ─── SLIDE 2: Kostnad ─────────────────────────────────────────────────────────

function buildSlide2(slideId) {
  const reqs = [];
  reqs.push(...slideTitle(slideId,
    'Ju senare felet hittas, desto dyrare att rätta',
    'En ändring i designfasen kostar bråkdelen av en ändring i kod'));

  const contentY = MY + in_(1.25);
  const maxH     = in_(3.2);
  const barW     = in_(1.2);
  const barGap   = in_(0.8);
  const baseY    = contentY + maxH;

  const bars = [
    { mult: '1×',   label: 'I design',     sub: 'Flytta en ruta i prototypen',        ratio: 0.14, fill: C.GREEN_BG,  bd: C.GREEN_BD, tc: C.GREEN  },
    { mult: '10×',  label: 'I kod',        sub: 'Refaktorera komponenter',             ratio: 0.45, fill: C.YELLOW_BG, bd: C.YELLOW_BD,tc: C.YELLOW },
    { mult: '100×', label: 'I produktion', sub: 'Felanalys, hotfix, regressionstest',  ratio: 1.0,  fill: C.RED_BG,    bd: C.RED_BD,   tc: C.RED    },
  ];

  bars.forEach((b, i) => {
    const bx = MX + i * (barW + barGap);
    const bh = Math.round(maxH * b.ratio);
    const by = baseY - bh;

    const bid = uid('bar');
    reqs.push(...addShape(bid, slideId, bx, by, barW, bh, b.fill, b.bd, pt(1.5)));

    const bmid = uid('bm');
    reqs.push(...addTextBox(bmid, slideId, b.mult, bx, by + in_(0.08), barW, in_(0.4), {
      size: 20, bold: true, color: b.tc, align: 'CENTER',
    }));
    const blid = uid('bl');
    reqs.push(...addTextBox(blid, slideId, b.label, bx, baseY + in_(0.08), barW, in_(0.28), {
      size: 11, bold: true, color: C.TEXT, align: 'CENTER',
    }));
    const bsid = uid('bs');
    reqs.push(...addTextBox(bsid, slideId, b.sub, bx, baseY + in_(0.38), barW, in_(0.3), {
      size: 8, color: C.MUTED, align: 'CENTER',
    }));
  });

  // Insight cards (right side)
  const cx = MX + in_(4.2);
  const cw = SLIDE_W - cx - MX;
  const ch = in_(0.9);
  const cg = in_(0.15);

  const insights = [
    { fill: C.RED_BG,   bd: C.RED_BD,   tc: C.RED,   title: 'Utan UX-first',
      body: 'Utvecklare tolkar vaga krav. Stakeholders säger "det var inte det vi menade" — arbetet börjar om.' },
    { fill: C.RED_BG,   bd: C.RED_BD,   tc: C.RED,   title: 'Omarbetning är det största slöseriet',
      body: 'Kod som kastas kostar mer än kod som aldrig skrivs. Varje omarbetningssprint är en sprint utan nytt värde.' },
    { fill: C.GREEN_BG, bd: C.GREEN_BD, tc: C.GREEN, title: 'Lösningen: fånga det i design',
      body: 'Prototyper är billiga att ändra. En godkänd design innan kod skrivs eliminerar den dyraste kategorin av fel.' },
  ];

  insights.forEach((ins, i) => {
    const iy = contentY + i * (ch + cg);
    const iid = uid('ins');
    reqs.push(...addShape(iid, slideId, cx, iy, cw, ch, ins.fill, ins.bd, pt(1.5)));
    const itid = uid('it');
    reqs.push(...addTextBox(itid, slideId, ins.title, cx + in_(0.15), iy + in_(0.08), cw - in_(0.3), in_(0.28), {
      size: 11, bold: true, color: ins.tc,
    }));
    const ibid = uid('ib');
    reqs.push(...addTextBox(ibid, slideId, ins.body, cx + in_(0.15), iy + in_(0.38), cw - in_(0.3), in_(0.48), {
      size: 9, color: C.TEXT,
    }));
  });

  return reqs;
}

// ─── SLIDE 3: Överlämning ─────────────────────────────────────────────────────

function buildSlide3(slideId) {
  const reqs = [];
  reqs.push(...slideTitle(slideId,
    'Vad en godkänd design ger utvecklaren',
    'Svaret på alla frågor — innan de ens hinner ställas'));

  const contentY = MY + in_(1.25);
  const lw = in_(4.2);
  const cardH = in_(1.08);
  const cardG = in_(0.13);

  const deliverables = [
    { lbl: 'VISUELLT', title: 'Annoterade skärmar',
      items: ['Alla skärmar och tillstånd: tom, laddning, fel, ifylld', 'Exakta mått, typsnitt och färger från designsystemet', 'Responsivt beteende specificerat'] },
    { lbl: 'BETEENDE', title: 'Interaktionsspec',
      items: ['Vad händer vid varje klick, hover och scroll', 'Felhantering och kantfall definierade', 'Övergångar och laddningstillstånd'] },
    { lbl: 'TEKNIK',   title: 'Datakrav & komponenter',
      items: ['Vilka API-anrop skärmen behöver', 'Existerande komponenter som återanvänds', 'Nya komponenter med spec bifogad'] },
  ];

  deliverables.forEach((d, i) => {
    const cy = contentY + i * (cardH + cardG);
    const cid = uid('card');
    reqs.push(...addShape(cid, slideId, MX, cy, lw, cardH, C.SURFACE, C.BORDER, pt(1)));
    // blue left stripe
    const stid = uid('stripe');
    reqs.push(...addShape(stid, slideId, MX, cy, pt(5), cardH, C.BLUE, null));
    const ltid = uid('lbl');
    reqs.push(...addTextBox(ltid, slideId, d.lbl, MX + in_(0.18), cy + in_(0.06), lw - in_(0.25), in_(0.2), {
      size: 8, bold: true, color: C.BLUE,
    }));
    const ttid = uid('ttl');
    reqs.push(...addTextBox(ttid, slideId, d.title, MX + in_(0.18), cy + in_(0.26), lw - in_(0.25), in_(0.28), {
      size: 12, bold: true, color: C.TEXT,
    }));
    const btid = uid('body');
    reqs.push(...addTextBox(btid, slideId, d.items.map(x => `–  ${x}`).join('\n'),
      MX + in_(0.18), cy + in_(0.54), lw - in_(0.25), cardH - in_(0.6), {
        size: 9, color: C.MUTED,
      }));
  });

  // Right: outcomes
  const rx = MX + lw + in_(0.35);
  const rw = SLIDE_W - rx - MX;
  const rh = in_(0.78);
  const rg = in_(0.12);

  const outcomes = [
    { title: 'Utvecklaren kan köra direkt',    sub: 'Ingen tid spenderas på att tolka krav eller vänta på svar' },
    { title: 'Rätt sak byggs första gången',   sub: 'Specen är det kontrakt båda parter är överens om' },
    { title: 'Feedback sker i rätt fas',        sub: 'Stakeholders granskar prototypen — inte färdig kod' },
    { title: 'Konsekvent slutresultat',          sub: 'Designsystemet följs — inga enskilda tolkningar i koden' },
  ];

  outcomes.forEach((o, i) => {
    const oy = contentY + i * (rh + rg);
    const oid = uid('out');
    reqs.push(...addShape(oid, slideId, rx, oy, rw, rh, C.GREEN_BG, C.GREEN_BD, pt(1.5)));
    const otid = uid('ot');
    reqs.push(...addTextBox(otid, slideId, o.title, rx + in_(0.15), oy + in_(0.08), rw - in_(0.25), in_(0.28), {
      size: 11, bold: true, color: C.GREEN,
    }));
    const osid = uid('os');
    reqs.push(...addTextBox(osid, slideId, o.sub, rx + in_(0.15), oy + in_(0.38), rw - in_(0.25), in_(0.35), {
      size: 9, color: C.TEXT,
    }));
  });

  // Bottom statement
  const stmtY = contentY + 4 * (rh + rg) + in_(0.05);
  const sid = uid('stmt'); const stid2 = uid('stxt');
  reqs.push(...addShape(sid, slideId, rx, stmtY, rw, in_(0.55), C.BLUE_BG, C.BLUE_BD, pt(1.5)));
  reqs.push(...addTextBox(stid2, slideId,
    'Design är inte en kostnad — det är det billigaste sättet att testa en idé.',
    rx + in_(0.15), stmtY + in_(0.1), rw - in_(0.3), in_(0.38), {
      size: 10, bold: true, color: C.BLUE, align: 'CENTER',
    }));

  return reqs;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Creating presentation…');
  const auth = await getAuthClient();
  slides = google.slides({ version: 'v1', auth });
  drive = google.drive({ version: 'v3', auth });

  // 1. Create blank presentation
  const pres = await slides.presentations.create({
    requestBody: { title: 'UX-first — Varför design måste komma före kod' },
  });
  const presId = pres.data.presentationId;
  console.log(`Created: https://docs.google.com/presentation/d/${presId}/edit`);

  // 2. Get the default slide that's created automatically
  const presData = await slides.presentations.get({ presentationId: presId });
  const defaultSlideId = presData.data.slides[0].objectId;

  // 3. Add slides 2 and 3, then use default slide for slide 1
  const s2 = uid('slide');
  const s3 = uid('slide');

  const createRequests = [
    { createSlide: { objectId: s2, insertionIndex: 1, slideLayoutReference: { predefinedLayout: 'BLANK' } } },
    { createSlide: { objectId: s3, insertionIndex: 2, slideLayoutReference: { predefinedLayout: 'BLANK' } } },
  ];

  await slides.presentations.batchUpdate({
    presentationId: presId,
    requestBody: { requests: createRequests },
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

  // 6. Build all slide content
  const allRequests = [
    ...buildSlide1(defaultSlideId),
    ...buildSlide2(s2),
    ...buildSlide3(s3),
  ];

  // Batch in chunks of 50 to avoid API limits
  const CHUNK = 50;
  for (let i = 0; i < allRequests.length; i += CHUNK) {
    const chunk = allRequests.slice(i, i + CHUNK);
    await slides.presentations.batchUpdate({
      presentationId: presId,
      requestBody: { requests: chunk },
    });
  }

  console.log(`\nDone! Open in Google Slides:`);
  console.log(`https://docs.google.com/presentation/d/${presId}/edit`);
}

main().catch(err => {
  console.error(err?.response?.data?.error || err.message);
  process.exit(1);
});
