# TXX — Sammanfattning

## Övergripande beskrivning

- Studien undersöker hur TXX-utvecklingen kan effektiviseras över alla tre säkerhetsnivåer (G, Y, R)
- Syftet är att minska dubbelarbete, korta ledtider och ge utvecklare bättre verktyg — även i de mest restriktiva miljöerna
- Förbättringarna täcker tre områden: systemarkitektur, UX-process och AI-stöd för utvecklare
- Arbetet är i studiefas — vi tar fram förslag och underlag, inte färdiga lösningar

## Leverabler

- Lösningsstruktur med separerade projekt per nivå
- Tre separata repon (G, Y, R) med envägssynk
- CI/CD-pipeline per nivå med tester och säkerhetsskanningar
- Definierad UX-process med godkännandesteg och överlämningsmallar
- XAXA-uppsättning för R-nivån
- Överföringspaket för luftgap med källkod, beroenden, AI-modeller och dokumentation

## GFE:er

- Server för XAXA i R-miljö
- Luftgapad server för R-repot och CI/CD
- Intern server för Y-repot
- Godkända överföringsmedia för Y → R
- Lokala dokumentationsspeglar

## Förutsättningar

- Tre separata nätverksmiljöer finns tillgängliga (öppen, begränsad, luftgapad)
- Utvecklare har rätt säkerhetsklassning per nivå
- .NET används som plattform
- UX-designer finns tillgängliga med rätt behörighet per nivå
- Godkännandeprocess finns för beroenden och verktyg på Y- och R-nivå
- Fysisk överföringsprocess mellan Y och R är etablerad

## Sammanfattning & Lägesbild

- **Tid:** Studien är i arkitektur- och strategifasen — grunddokument är framtagna
- **Scope:** Tre områden (arkitektur, UX-process, AI-arbetsflöde) med totalt 12 styrdokument
- **Resurs:** Kräver arkitekt(er) med tillgång till alla nivåer och UX-designer per nivå
- **Beroenden:** Tillgång till luftgapad R-miljö, godkännande av AI-verktyg på Y-nivå
- **Nuvarande fokus:** Arkitektur och processer dokumenteras — ingen implementering påbörjad

## Resultat / Delavstämning / Beslut

- **Resultat:** Arkitekturplan framtagen som beskriver hur nivåerna byggs, synkas och driftsätts
- **Delavstämning:** Rekommenderas att stämma av:
  - Val av plattform och ramverk
  - Repostrategi (tre repon med envägssynk)
  - UX-process och godkännandesteg
- **Beslut att fatta:**
  - Hur nivåerna ska sättas ihop (vid bygge eller vid körning)
  - Val av designverktyg
  - Val av LLM-modell för R

## Genomförd verksamhet (senaste månaden)

- Definierat G/Y/R-nivåer och vad som får finnas var
- Utformat lösningsstruktur med separation per nivå
- Dokumenterat hur nivåerna sätts ihop till en applikation
- Framtagit repostrategi med synkflöde och överföringspaket
- Tagit fram CI/CD-pipeline för alla tre nivåer
- Fastställt UX-process med designsteg och överlämning till utvecklare
- Utrett AI-strategi per nivå och XAXA-uppsättning för R

## Planerad verksamhet (kommande månaden)

- Sätta upp G-repot med grundläggande struktur och attrappimplementationer
- Proof-of-concept för att sätta ihop G → Y → R
- Välja och sätta upp designverktyg
- Påbörja första UX-designcykeln för en pilotfunktion
- Utvärdera LLM-modeller för R-miljön
- Testköra XAXA-uppsättning i simulerad R-miljö

## Behov av hjälp / inriktning

- **Inriktningsbeslut:** Hur ska nivåerna sättas ihop (vid bygge eller vid körning)?
- **Diskussion:** Vilka designverktyg uppfyller kraven på offlinestöd och komponentbibliotek?
- **Diskussion:** Godkännandeprocess för AI-verktyg på Y-nivå — vilka kriterier och vem beslutar?
- **Hjälp:** Tillgång till R-miljö för tidig validering av överföringsprocessen

## Identifierade risker / hinder

- Överföring mellan nivåer är manuell och långsam — kan bli en flaskhals
- Begränsad tillgång till säkerhetsklarad personal, särskilt för R
- R-miljön är isolerad — verktyg och beroenden kan bli föråldrade mellan överföringar
- Kod flödar bara åt ett håll — synkproblem kan uppstå mellan nivåerna
