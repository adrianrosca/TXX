# UI/UX Roadmap — TXX

## 1. MSS UI/UX Framework 1.0
Direktiv som hela avdelningen kan ta del av.
- Designprinciper och riktlinjer för MSS
- Komponentbibliotek (design tokens, typografi, färg, spacing)
- Interaktionsmönster (navigation, formulär, feedback, felhantering)
- Tillgänglighet (WCAG-krav anpassade för G/Y/R)
- Dokumentation: "så här jobbar vi med UI/UX i TXX"

## 2. MSS WPF UI Library 1.0
Delat komponentbibliotek i WPF.
- Baskomponenter (knappar, input, tabeller, paneler, kartvyer)
- Temahantering (light/dark, per nivå om relevant)
- Bindningar mot MVVM / Prism
- Paketerat som NuGet — körbart i G och Y
- PoC: ett par features implementerade mot lib:et

## 3. Utbildning
Utbilda teamet i det nya arbetssättet.
- UX-first workflow (8-fas livscykel)
- Penpot — verktyget vi designar i
- Design-to-dev handoff — hur specen levereras och tolkas
- Komponentbiblioteket — hur man använder och bidrar
- G/Y/R-medvetenhet — vad designern behöver veta om nivåerna

## 4. Underlag till teamen
Material vi kan skicka ut.
- Onboarding-dokument: "UI/UX i TXX — vad du behöver veta"
- Snabbreferens: designprinciper, komponentkatalog, do's & don'ts
- Processöversikt: från krav till godkänd design till implementation
- Mallar: kravbrief, designspec, handoff-checklista

## 5. Dragning för utvecklare
Presentation kring organisationsförändringarna.
- Varför UX-first? Problemet med dev-drivna UI-beslut
- Nya roller och ansvar (UX-lead, designers, dev guardrails)
- Workflow: vad förändras i vardagen för en utvecklare?
- Q&A / diskussion

## 6. Budget
Resursplanering.
- Penpot-licenser (self-hosted vs cloud?)
- Eventuell extern UX-kompetens (konsulter, utbildning)
- Tid: uppskattning per fas i roadmap
- Hårdvara/infra om Penpot self-hostas i Y/R

## 7. Teamets utveckling (1–2 år)
Var ska vi vara?
- **Nu:** Adrian + Nikki, rekryter växer in
- **6 mån:** Dedikerat UX-team (2–3 designers), etablerad workflow, framework 1.0 i bruk
- **1 år:** Alla features går genom UX-first, komponentbibliotek modigt, Y-level designers clearade
- **2 år:** Full kapacitet — design system, design ops, R-level coverage, mogen organisation

## 8. Workflow G → Y → R
Design som följer säkerhetsnivåerna.
- G: all design sker här — full UI med mockdata, fritt internet, alla verktyg
- Y: overlay-design — Y-clearade designers hanterar nivåspecifika features
- R: air-gapped — lokala verktyg, Penpot self-hosted, offlinepaket
- Designartefakter flödar G → Y → R (samma riktning som kod)
- Exportformat och handoff anpassat per nivå

## 9. Penpot-integration
Open source designverktyg som ersätter Figma i Y/R.
- Self-hosted instans för Y (och eventuellt R via air-gap-bundle)
- Plugin/export till WPF-komponentformat
- Integration med CI: design tokens → kod automatiskt
- Teamworkflow: branches, review, versionshantering av design

## 10. Designsystem & komponentkatalog
Levande referens.
- Storybook-liknande katalog för WPF-komponenter
- Design tokens synkade mellan Penpot och kod
- Versionerad — varje release av lib:et har matchande katalog
- Tillgänglig i G, med anpassad variant för Y/R

## 11. Mätning & kvalitet
Hur vet vi att det fungerar?
- Design compliance rate (% features som följer spec)
- UX-debt tracker (avvikelser som behöver åtgärdas)
- Feedback-loop: utvecklare → designer → förbättring
- Regelbundna UX-reviews / audits

---

## Prioritetsordning (förslag)

| Fas | Vad | När |
|-----|-----|-----|
| **Q2 2026** | Framework 1.0 draft, Penpot setup, utbildningsplan | Nu → Juni |
| **Q3 2026** | WPF UI Lib PoC, dragning utvecklare, underlag ut | Juli → Sep |
| **Q4 2026** | Lib 1.0 release, workflow G→Y aktiv, budget fastställd | Okt → Dec |
| **2027 H1** | Full UX-first i produktion, designsystem, R-coverage | Jan → Jun |
