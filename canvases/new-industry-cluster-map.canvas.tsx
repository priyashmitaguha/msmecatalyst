import { useMemo, useState } from "cursor/canvas";
import { BarChart, Callout, Divider, Grid, H1, H2, H3, Pill, Row, Stack, Stat, Table, Text } from "cursor/canvas";

type Industry = {
  id: string;
  name: string;
  funded: string;
  participants: string;
  participantKind: string;
  ancillaries: string;
  activity: "Manufacturing" | "Services" | "Both";
  geo: string;
  mode: "Traditional" | "Digital" | "Hybrid";
  icam: "Demo" | "Phase II" | "New candidate";
  fit: number;
  why: string;
  hs4: string;
  exportFy25: string;
  exportUnits: string;
  turnover: string;
  turnSplit: string;
  employees: string;
  vintage: string;
  large: string;
  expLarge: string;
  med200: string;
  expMed200: string;
  med100: string;
  expMed100: string;
  small: string;
  micro: string;
  mfi: string;
  lending: string;
  insurance: string;
  vcpe: string;
  bandNote: string;
  bandPct: number[];
};

const INDUSTRIES: Industry[] = [
  {
    "id": "medtech",
    "name": "Medical devices",
    "funded": "Medical Devices Rules phased by risk class through 2020–23 · PLI MedTech 2020 (outlay ₹3,420 crore) · medical device parks · AMTZ Vizag 2017 · National Medical Devices Policy 2023",
    "participants": "About 700 manufacturers (CII/IBEF). Separately, about 4,000 CDSCO licensed manufacturing sites. These units are not added together.",
    "participantKind": "Manufacturers, with licensed sites stated as a second population",
    "ancillaries": "Moulds, sterile pack, instruments, disposables, sub-assemblies and test labs around licensed MSME sites — not the hospital chain and not the 28 PLI principals",
    "activity": "Manufacturing",
    "geo": "AMTZ Visakhapatnam spoke; Greater Noida and the Kanchipuram licensed-site belt; other parks in Madhya Pradesh and Tamil Nadu. State split of the 4,000 sites is not published.",
    "mode": "Hybrid",
    "icam": "New candidate",
    "fit": 5,
    "why": "Thick MSME manufacturer tail, park belts, and hospital or PSU offtake a centre can sit beside without becoming the park.",
    "hs4": "9018, 9019, 9021, 9022. IVD reagents often sit in 3822 or 3002. EPCMD’s $4.02 bn is its medtech basket, not a proved sum of these headings.",
    "exportFy25": "USD 4.02 billion, FY2024–25, EPCMD / DGCIS medtech basket (PIB segment total USD 4,014 million is the same release rounded).",
    "exportUnits": "Not a TradeStat count. Proxy: licensed manufacturers who hold an IEC, uncounted. Do not treat 700 or 4,000 as exporters.",
    "turnover": "Market about ₹1.02 lakh crore in FY2023–24 (CII/IBEF). CDSCO does not keep a central production census. FY2024–25 gross turnover is n.p.",
    "turnSplit": "Export USD 4.02 billion in FY2024–25 against an FY2024 market of ₹1.02 lakh crore. Treat export as about one-third of that earlier market, not as a reconciled FY2024–25 turnover split. Domestic residual is reconstructed.",
    "employees": "n.p. A 1.5 million job figure in secondary commentary is a projection, not a headcount.",
    "vintage": "2017 (AMTZ as the first park-scale gate); licensing wave 2020; PLI approvals from 2021.",
    "large": "70",
    "expLarge": "40 reconstructed among the ~70 non-MSME names — not a TradeStat census",
    "med200": "35",
    "expMed200": "12 reconstructed",
    "med100": "63",
    "expMed100": "18 reconstructed",
    "small": "280",
    "micro": "252",
    "bandPct": [
      10,
      5,
      9,
      40,
      36
    ],
    "bandNote": "Universe: the CII/IBEF ~700 manufacturers, of which about 90% are described as MSME. The ~4,000 licensed sites are not this pyramid. Reconstructed gross-turnover counts, not a GSTN or MCA census. Aligned to Gazette S.O. 1364(E), 21 March 2025, in force 1 April 2025: Micro ≤ ₹10 crore (investment ceiling ≤ ₹2.5 crore), Small ₹10–100 crore (investment ≤ ₹25 crore), Medium ₹100–200 crore and ₹200–500 crore (investment ≤ ₹125 crore), Large > ₹500 crore (outside MSME). The old ₹50–200 slice is remapped: ₹50–100 sits in Small and ₹100–200 in Medium. Udyam turnover excludes exports (S.O. 2119(E) as amended), so a heavy exporter can sit in a lower Udyam class than these gross bands. Unit share is not turnover share. Export-ready counts are not a TradeStat exporter census.",
    "mfi": "Thin. MUDRA and CGTMSE exist. There is no sector NBFC-MFI book for a licensed device site. SHG and NABARD are not the operating channel.",
    "lending": "Horizontal, for an eligible MSME: CGTMSE (a guarantee, not insurance), MUDRA, TReDS, SIDBI, and ECGC where the firm itself exports. Sector: PLI MedTech is an incentive on eligible sales for 28 approved applicants, not a loan to the MSME ring. Park allotment and state medical-device schemes are the usable files. No dedicated MSME device term-loan product was verified.",
    "insurance": "ECGC for the exporter. Product liability and recall are the covers buyers expect; penetration is n.p. Fire and marine are commercial. Hospital and PSU receivables are uninsured. CGTMSE is not a cover.",
    "vcpe": "Moderate on scaled device and diagnostics companies. Thin to none on the mould, pack and disposable MSME ring. Digital-health venture funds are a different industry."
  },
  {
    "id": "semi",
    "name": "Semiconductors & OSAT ancillaries",
    "funded": "India Semiconductor Mission, 2021 · DLI for design · fiscal support for one fab, OSAT/ATMP and a compound fab. MeitY, September 2025: 1 fab, 8 OSAT/ATMP, 1 compound, 23 design-linked applicants.",
    "participants": "10 approved plants across six states. Separately, 23 design-linked applicants. Ancillary workshops are not yet a published census.",
    "participantKind": "Approved plants and design-linked applicants — two units, not added",
    "ancillaries": "Specialty gases, chemicals, cleanroom trades, jigs, packaging and facilities MSMEs around Sanand and Dholera once a fab offtakes — not the fab itself",
    "activity": "Manufacturing",
    "geo": "Sanand and Dholera in Gujarat, plus the other approved-plant states. No dense MSME belt yet.",
    "mode": "Hybrid",
    "icam": "New candidate",
    "fit": 3,
    "why": "The plant is the anchor. The ancillary ring a centre would enrol is still thin and has no fab offtake to stand on.",
    "hs4": "8541, 8542. Do not quote the electronics-goods basket as OSAT exports.",
    "exportFy25": "n.p. for this cohort. ISM figures are capacity and committed capex, not sales.",
    "exportUnits": "n.a. as a TradeStat count. The 10 plants are not an exporter census.",
    "turnover": "n.p. ISM committed support is about ₹1.6 lakh crore of capex, not turnover.",
    "turnSplit": "Capex is not sales. Treat current ancillary activity as domestic until a fab offtakes. No export share is stated.",
    "employees": "n.p. for the ancillary ring. Plant payrolls are not the cohort.",
    "vintage": "2021 (ISM approvals). Design-linked certificates are the same wave.",
    "large": "10",
    "expLarge": "n.a. as exporters — plants are anchors, not the MSME export count",
    "med200": "8",
    "expMed200": "n.a. as exporters",
    "med100": "15",
    "expMed100": "n.a. as exporters",
    "small": "40",
    "micro": "80",
    "bandPct": [
      7,
      5,
      10,
      26,
      52
    ],
    "bandNote": "Universe: a reconstructed ancillary ring of about 150 units around the approved plants, plus the plants themselves in Large. This is a shape sketch, not a factory census. Reconstructed gross-turnover counts, not a GSTN or MCA census. Aligned to Gazette S.O. 1364(E), 21 March 2025, in force 1 April 2025: Micro ≤ ₹10 crore (investment ceiling ≤ ₹2.5 crore), Small ₹10–100 crore (investment ≤ ₹25 crore), Medium ₹100–200 crore and ₹200–500 crore (investment ≤ ₹125 crore), Large > ₹500 crore (outside MSME). The old ₹50–200 slice is remapped: ₹50–100 sits in Small and ₹100–200 in Medium. Udyam turnover excludes exports (S.O. 2119(E) as amended), so a heavy exporter can sit in a lower Udyam class than these gross bands. Unit share is not turnover share. Export-ready counts are not a TradeStat exporter census.",
    "mfi": "None typical. Project finance and venture on design houses. No NBFC-MFI or SHG channel.",
    "lending": "Horizontal, for an eligible MSME: CGTMSE (a guarantee, not insurance), MUDRA, TReDS, SIDBI, and ECGC where the firm itself exports. Sector: ISM and DLI are fiscal support to approved applicants, not an MSME working-capital line. No dedicated ancillary-MSME product.",
    "insurance": "Construction all-risk and erection on the plants. The ancillary ring has ordinary fire and workmen covers. Receivables from a fab do not exist yet, so they are not insured.",
    "vcpe": "Deep on the approved groups and on a few design startups. None on the cleanroom-trade MSME."
  },
  {
    "id": "toys",
    "name": "Toys (modern + GI/artisan)",
    "funded": "Toys (Quality Control) Order, 2020, effective 1 January 2021 · basic customs duty on 9503 raised to 60% in February 2020 and 70% in March 2023 · 19 SFURTI toy clusters · design support to 26 clusters · DPIIT toy-startup recognition",
    "participants": "DPIIT deck: 21,000+ Udyam MSMEs, and 1,800+ BIS licences including foreign licences. June 2025 reporting of BIS: 1,640 licences (1,165 non-electronic, 475 electric). Licences and Udyam registrations are not added.",
    "participantKind": "Udyam registrations, with BIS licences as a separate unit",
    "ancillaries": "Moulds, paint, packaging, wood and GI artisan spokes (Channapatna and others) plus small electric-toy units that still lack a BIS file",
    "activity": "Manufacturing",
    "geo": "About 50 clusters cited by DPIIT. Koppal hub; NCR and Greater Noida toy park; Channapatna; Maharashtra units. A centre is a hub plus spokes, not one park.",
    "mode": "Traditional",
    "icam": "New candidate",
    "fit": 5,
    "why": "A thick micro tail, named belts, and a QCO that already knocked small units out of the market.",
    "hs4": "9503. Chapter 95 is wider (games and sports requisites) and must not be quoted as toy exports.",
    "exportFy25": "HS 9503 USD 169.46 million, FY2024–25, DGCIS. Chapter 95 was USD 570.95 million in the same year and is a different basket.",
    "exportUnits": "n.p. TradeStat has no exporter count. BIS licensees are not exporters. Goods made only for export sit outside the QCO.",
    "turnover": "n.p. No official gross-turnover census for the toy cohort in the series used.",
    "turnSplit": "Export of HS 9503 is known. Domestic turnover is n.p., so no percentage split is stated. Most units sell domestically.",
    "employees": "n.p.",
    "vintage": "2020 duty change; licensing wave from 1 January 2021.",
    "large": "15",
    "expLarge": "8 reconstructed named exporters",
    "med200": "40",
    "expMed200": "10 reconstructed",
    "med100": "120",
    "expMed100": "25 reconstructed",
    "small": "2800",
    "micro": "18025",
    "bandPct": [
      0,
      0,
      1,
      13,
      86
    ],
    "bandNote": "Universe: the 21,000+ Udyam registrations, not the 1,640 BIS licences. Most of this pyramid is Micro. QCO drop-outs may already have left Udyam. Reconstructed gross-turnover counts, not a GSTN or MCA census. Aligned to Gazette S.O. 1364(E), 21 March 2025, in force 1 April 2025: Micro ≤ ₹10 crore (investment ceiling ≤ ₹2.5 crore), Small ₹10–100 crore (investment ≤ ₹25 crore), Medium ₹100–200 crore and ₹200–500 crore (investment ≤ ₹125 crore), Large > ₹500 crore (outside MSME). The old ₹50–200 slice is remapped: ₹50–100 sits in Small and ₹100–200 in Medium. Udyam turnover excludes exports (S.O. 2119(E) as amended), so a heavy exporter can sit in a lower Udyam class than these gross bands. Unit share is not turnover share. Export-ready counts are not a TradeStat exporter census.",
    "mfi": "Active on the artisan and SFURTI spokes: MUDRA, PMEGP, state cooperative and PM Vishwakarma-type artisan channels, and some SHG craft finance. Not an NBFC-MFI book for an electric-toy factory.",
    "lending": "Horizontal, for an eligible MSME: CGTMSE (a guarantee, not insurance), MUDRA, TReDS, SIDBI, and ECGC where the firm itself exports. Sector: SFURTI is grant infrastructure in 19 clusters, not a revolving loan. No toy-specific NBFC scheme was verified. PM Vishwakarma where the unit is an artisan.",
    "insurance": "Product liability matters because the user is a child; penetration n.p. Fire and stock are commercial. ECGC only for the small exporting set. Marketplace receivables are largely uninsured.",
    "vcpe": "Thin. DPIIT startup recognition is a certificate, not capital. No visible PE book on the artisan or small-factory ring."
  },
  {
    "id": "footwear",
    "name": "Footwear (non-leather + sports)",
    "funded": "Indian Footwear and Leather Development Programme · BIS quality orders on footwear from 2020–21 · CLE cluster work in the established belts. The new gate is non-leather and sports footwear plus the BIS file, not the age of the tannery.",
    "participants": "About 15,000 footwear units (CLE/IBEF). CLE membership is 2,868 and is a different population. Do not add them.",
    "participantKind": "Footwear manufacturing units",
    "ancillaries": "Soles, lasts, uppers, synthetic components, packaging and job-work units in the belt — not the brand and not the tannery if it is outside the non-leather cohort",
    "activity": "Manufacturing",
    "geo": "Ambur–Ranipet in Tamil Nadu, and Agra. Other CLE belts exist; year-1 is one of these two.",
    "mode": "Traditional",
    "icam": "New candidate",
    "fit": 5,
    "why": "A thick small-factory tail in two tight belts, with brand and export-house offtake.",
    "hs4": "6402, 6403, 6404, 6405. CLE’s published export is leather plus footwear plus goods, wider than non-leather footwear.",
    "exportFy25": "CLE/IBEF: leather, footwear and leather goods exports ₹48,667 crore in FY2024–25. That basket is wider than this cohort.",
    "exportUnits": "Not a TradeStat count. CLE’s 2,868 members are a membership proxy, not exporters and not the 15,000 units.",
    "turnover": "CLE/IBEF sector turnover about ₹1.62 lakh crore, leather plus footwear plus goods. Not a non-leather-only census.",
    "turnSplit": "Export ₹48,667 crore against sector turnover about ₹1.62 lakh crore is about 30% export and 70% domestic, on the CLE basket. The non-leather cohort is not split out.",
    "employees": "CLE/IBEF: about 42 lakh people in the leather and footwear sector. Not a footwear-only headcount.",
    "vintage": "2020–21, when BIS footwear quality orders and the non-leather/sports push tightened the file a small unit must hold.",
    "large": "40",
    "expLarge": "25 reconstructed from CLE’s exporting members — membership is not this count",
    "med200": "80",
    "expMed200": "30 reconstructed",
    "med100": "180",
    "expMed100": "50 reconstructed",
    "small": "4200",
    "micro": "10500",
    "bandPct": [
      0,
      1,
      1,
      28,
      70
    ],
    "bandNote": "Universe: about 15,000 footwear units (CLE/IBEF). Shares are a reconstructed shape of that count. Reconstructed gross-turnover counts, not a GSTN or MCA census. Aligned to Gazette S.O. 1364(E), 21 March 2025, in force 1 April 2025: Micro ≤ ₹10 crore (investment ceiling ≤ ₹2.5 crore), Small ₹10–100 crore (investment ≤ ₹25 crore), Medium ₹100–200 crore and ₹200–500 crore (investment ≤ ₹125 crore), Large > ₹500 crore (outside MSME). The old ₹50–200 slice is remapped: ₹50–100 sits in Small and ₹100–200 in Medium. Udyam turnover excludes exports (S.O. 2119(E) as amended), so a heavy exporter can sit in a lower Udyam class than these gross bands. Unit share is not turnover share. Export-ready counts are not a TradeStat exporter census.",
    "mfi": "Active in the Agra and Ambur micro and job-work tail: MUDRA, NBFC micro loans and local chit or cooperative channels are in daily use. They do not cover a brand receivable.",
    "lending": "Horizontal, for an eligible MSME: CGTMSE (a guarantee, not insurance), MUDRA, TReDS, SIDBI, and ECGC where the firm itself exports. Sector: Footwear-specific credit-linked files (FPS-type bank sanction) stall after eligibility. IFLADP is a development programme, not a substitute for the sanction file. No evidence the brand pays on TReDS at the job-work tier.",
    "insurance": "ECGC for exporters. Fire and marine commercial. Brand goods-receipt receivables are uninsured. Product liability for sports footwear is commercial and patchy. CGTMSE is not a cover.",
    "vcpe": "Thin on the job-work and sole unit. Moderate only where a brand has raised growth capital. That capital does not reach the belt."
  },
  {
    "id": "battery",
    "name": "ACC batteries & pack assembly",
    "funded": "PLI Advanced Chemistry Cell, 2021, awarded to a handful of gigafactory applicants. Pack, BMS and recycling sit outside that award.",
    "participants": "A handful of PLI-ACC plants (public awards are on the order of four principal beneficiaries). Pack and BMS MSMEs are not in that list and are not counted here as plants.",
    "participantKind": "PLI-ACC beneficiary plants. The MSME ring is a separate, uncounted population.",
    "ancillaries": "Pack assembly, battery-management electronics, casings, testing, collection and authorised recycling MSMEs — not the four cell plants",
    "activity": "Manufacturing",
    "geo": "Wherever the awarded cell plants sit, plus existing pack shops in the Pune, NCR and southern auto-electronics belts. The ring is not the plant campus.",
    "mode": "Hybrid",
    "icam": "New candidate",
    "fit": 5,
    "why": "The cell plant is an anchor. Pack, BMS and recycling MSMEs are a thick enough ring, with OEM goods-receipt offtake, to form a centre.",
    "hs4": "Do not use 8507 as this cohort’s export. 8507 is mostly lead-acid. ACC cells and packs are an 8-digit distinction this desk did not pull.",
    "exportFy25": "n.p. for ACC packs. Do not substitute the 8507 line.",
    "exportUnits": "n.a. as a TradeStat count. Domestic OEM offtake is the buyer.",
    "turnover": "n.p. PLI-ACC committed investment is capex of the plants, not pack-MSME sales.",
    "turnSplit": "Treat as domestic. Offtake is the OEM goods-receipt, not a merchandise export line.",
    "employees": "n.p. for the pack ring. Do not quote motor-vehicle ASI employment (14.80 lakh) as this cohort.",
    "vintage": "2021 (PLI-ACC awards). Pack shops are older; the new offtake is the cell plant.",
    "large": "6",
    "expLarge": "4 reconstructed — the awarded plants, domestic offtake, not exporters",
    "med200": "15",
    "expMed200": "5 reconstructed domestic OEM suppliers",
    "med100": "40",
    "expMed100": "8 reconstructed domestic OEM suppliers",
    "small": "250",
    "micro": "489",
    "bandPct": [
      1,
      2,
      5,
      31,
      61
    ],
    "bandNote": "Universe: a reconstructed pack, BMS and recycling ring of about 800 units. The awarded plants sit in Large and are not the cohort. Reconstructed gross-turnover counts, not a GSTN or MCA census. Aligned to Gazette S.O. 1364(E), 21 March 2025, in force 1 April 2025: Micro ≤ ₹10 crore (investment ceiling ≤ ₹2.5 crore), Small ₹10–100 crore (investment ≤ ₹25 crore), Medium ₹100–200 crore and ₹200–500 crore (investment ≤ ₹125 crore), Large > ₹500 crore (outside MSME). The old ₹50–200 slice is remapped: ₹50–100 sits in Small and ₹100–200 in Medium. Udyam turnover excludes exports (S.O. 2119(E) as amended), so a heavy exporter can sit in a lower Udyam class than these gross bands. Unit share is not turnover share. Export-ready counts are not a TradeStat exporter census.",
    "mfi": "Thin. MUDRA or CGTMSE may touch a micro pack shop. There is no sector MFI. The working-capital need is a bank line against OEM receipts.",
    "lending": "Horizontal, for an eligible MSME: CGTMSE (a guarantee, not insurance), MUDRA, TReDS, SIDBI, and ECGC where the firm itself exports. Sector: PLI-ACC is not a lending programme for the pack MSME. Vehicle NBFCs finance the vehicle, not the pack shop. No dedicated pack-MSME line was verified.",
    "insurance": "Product liability and transit for lithium packs are commercial and often missing at MSME scale. OEM receivables are uninsured. Fire is material because of the chemistry. ECGC is largely n.a. while offtake is domestic.",
    "vcpe": "Deep on the cell and OEM climate investors. Thin to none on the pack and BMS MSME."
  },
  {
    "id": "ewaste",
    "name": "E-waste & circular electronics",
    "funded": "E-Waste (Management) Rules, 2022, with EPR and CPCB authorisation. Informal belts pre-date the rules; the gate is the authorisation.",
    "participants": "CPCB lists authorised recyclers and producers under EPR. The count of authorised recyclers is a regulatory list. Informal units in Seelampur and Moradabad are a much larger, unregistered population and are not added to the authorised list.",
    "participantKind": "CPCB authorisations, with informal units named as a separate population",
    "ancillaries": "Collection, dismantling, sorting and repair shops in the informal belt that could be brought to an authorisation — not the brand that files the EPR return",
    "activity": "Manufacturing",
    "geo": "Seelampur (Delhi) and Moradabad, with smaller belts in other cities. Tight enough for a hub-and-spoke once units are formal.",
    "mode": "Traditional",
    "icam": "New candidate",
    "fit": 5,
    "why": "A thick informal micro tail in named lanes, with brand EPR as the offtake, if the centre first gets units authorised.",
    "hs4": "No clean FY25 export line. Scrap and recovered metal cross several headings and are not this cohort’s sales.",
    "exportFy25": "n.p. Offtake is domestic EPR and brand buy-back.",
    "exportUnits": "n.a. as exporters. Authorised recyclers are a domestic regulatory list.",
    "turnover": "n.p.",
    "turnSplit": "Treat as domestic. The buyer is the brand’s EPR obligation and the local scrap trade.",
    "employees": "n.p. Informal employment is large and uncounted in ASI.",
    "vintage": "2022 (E-Waste Management Rules). The lanes are older.",
    "large": "12",
    "expLarge": "n.a. as exporters — domestic EPR offtake",
    "med200": "25",
    "expMed200": "n.a. as exporters",
    "med100": "60",
    "expMed100": "n.a. as exporters",
    "small": "900",
    "micro": "7003",
    "bandPct": [
      0,
      0,
      1,
      11,
      88
    ],
    "bandNote": "Universe: a reconstructed ~8,000 units in the known informal belts plus authorised recyclers in the upper bands. Not a CPCB extract. Reconstructed gross-turnover counts, not a GSTN or MCA census. Aligned to Gazette S.O. 1364(E), 21 March 2025, in force 1 April 2025: Micro ≤ ₹10 crore (investment ceiling ≤ ₹2.5 crore), Small ₹10–100 crore (investment ≤ ₹25 crore), Medium ₹100–200 crore and ₹200–500 crore (investment ≤ ₹125 crore), Large > ₹500 crore (outside MSME). The old ₹50–200 slice is remapped: ₹50–100 sits in Small and ₹100–200 in Medium. Udyam turnover excludes exports (S.O. 2119(E) as amended), so a heavy exporter can sit in a lower Udyam class than these gross bands. Unit share is not turnover share. Export-ready counts are not a TradeStat exporter census.",
    "mfi": "Active on the informal micro tail in Seelampur and Moradabad: local micro-lenders and some NBFC-MFI household loans. That credit is not a recycler term loan and does not survive an authorisation process by itself.",
    "lending": "Horizontal, for an eligible MSME: CGTMSE (a guarantee, not insurance), MUDRA, TReDS, SIDBI, and ECGC where the firm itself exports. Sector: no MSME e-waste term-loan product verified. EPR credit is the brand’s compliance cost, not a loan to the dismantler. SIDBI green lines, where offered, sit above this tail.",
    "insurance": "Pollution liability and workmen cover are the gap. Fire is commercial. There is no receivable to insure until an invoice exists. CGTMSE is not a cover.",
    "vcpe": "Moderate on a few organised recyclers. None on the informal lane."
  },
  {
    "id": "dc-ancillary",
    "name": "Data-centre ancillaries",
    "funded": "State data-centre policies from about 2020 (Uttar Pradesh, Maharashtra, Tamil Nadu and others) and the national data-centre push. The operator is not the cohort.",
    "participants": "Public counts are of operating and announced campuses, not of vendors. Vendor population is n.p.",
    "participantKind": "No official vendor census. Campuses are a different unit and are not used as the participant count.",
    "ancillaries": "Electrical panels, precision cooling, racks, fire suppression, fit-out and facilities MSMEs selling to the campus operator",
    "activity": "Both",
    "geo": "Navi Mumbai, Chennai, Hyderabad, Noida and Bengaluru campus clusters. Vendors are wider than the campus fence.",
    "mode": "Hybrid",
    "icam": "New candidate",
    "fit": 3,
    "why": "Offtake is visible, but the anchor is the campus operator and the MSME ring is not a tight factory belt.",
    "hs4": "No single heading. Electrical and cooling goods fall under 8537, 8415 and others. Do not assign an export value.",
    "exportFy25": "n.p. Campus offtake is domestic.",
    "exportUnits": "n.a. as exporters.",
    "turnover": "n.p. Announced campus capex is not vendor sales.",
    "turnSplit": "Treat as domestic. The buyer is the data-centre operator.",
    "employees": "n.p. for vendors. Campus headcount is not the ring.",
    "vintage": "2020, when state data-centre policies and hyperscale announcements created a vendor wave.",
    "large": "20",
    "expLarge": "n.a. as exporters — domestic campus offtake",
    "med200": "30",
    "expMed200": "n.a. as exporters",
    "med100": "50",
    "expMed100": "n.a. as exporters",
    "small": "400",
    "micro": "700",
    "bandPct": [
      2,
      3,
      4,
      33,
      58
    ],
    "bandNote": "Universe: a reconstructed ~1,200 vendors. Not a ministry list. Reconstructed gross-turnover counts, not a GSTN or MCA census. Aligned to Gazette S.O. 1364(E), 21 March 2025, in force 1 April 2025: Micro ≤ ₹10 crore (investment ceiling ≤ ₹2.5 crore), Small ₹10–100 crore (investment ≤ ₹25 crore), Medium ₹100–200 crore and ₹200–500 crore (investment ≤ ₹125 crore), Large > ₹500 crore (outside MSME). The old ₹50–200 slice is remapped: ₹50–100 sits in Small and ₹100–200 in Medium. Udyam turnover excludes exports (S.O. 2119(E) as amended), so a heavy exporter can sit in a lower Udyam class than these gross bands. Unit share is not turnover share. Export-ready counts are not a TradeStat exporter census.",
    "mfi": "Thin. MUDRA does not fund a panel shop’s retention cycle. No sector MFI.",
    "lending": "Horizontal, for an eligible MSME: CGTMSE (a guarantee, not insurance), MUDRA, TReDS, SIDBI, and ECGC where the firm itself exports. Sector: none for the vendor. Infrastructure finance sits with the campus.",
    "insurance": "Contractors’ all-risk during fit-out. Retention and milestone receivables from the operator are uninsured. Fire is the operator’s cover.",
    "vcpe": "Deep in data-centre infrastructure funds. None on the panel and fit-out MSME."
  },
  {
    "id": "charging",
    "name": "EV charging infrastructure",
    "funded": "FAME-II charging outlay (₹912.50 crore sanctioned for charging under that scheme) · PM E-DRIVE from 1 October 2024, ₹10,900 crore, with a charging-infrastructure component · public guidelines treat charging as an unlicensed activity.",
    "participants": "Charge-point operators and a long tail of electricians and small assemblers. No official enterprise census. FAME-II disclosed sanctioned charger counts by category, which are assets, not firms.",
    "participantKind": "No enterprise census. Charger counts are assets and are not used as the firm count.",
    "ancillaries": "Local electricians, panel builders, small EVSE assemblers and maintenance MSEs — not the charge-point operator and not the DISCOM",
    "activity": "Both",
    "geo": "Installation is pan-India along highways and cities. Assembly and panel work concentrates in the NCR, Pune and Gujarat electrical belts.",
    "mode": "Hybrid",
    "icam": "New candidate",
    "fit": 4,
    "why": "Visible DISCOM and fleet offtake, and a real installer tail, but the tail is spread along roads rather than one lane.",
    "hs4": "8504 and 8537 cover parts of EVSE. There is no clean FY25 export line for Indian chargers in the series used.",
    "exportFy25": "n.p. Treat deployment as domestic.",
    "exportUnits": "n.a. as exporters.",
    "turnover": "n.p. Subsidy outlays are not installer turnover.",
    "turnSplit": "Treat as domestic. The payer is the CPO, the fleet, or the DISCOM programme.",
    "employees": "n.p.",
    "vintage": "2019 FAME-II charging sanctions; the sharper installer wave is PM E-DRIVE from October 2024.",
    "large": "15",
    "expLarge": "n.a. as exporters — domestic CPO offtake",
    "med200": "25",
    "expMed200": "n.a. as exporters",
    "med100": "60",
    "expMed100": "n.a. as exporters",
    "small": "700",
    "micro": "1700",
    "bandPct": [
      1,
      1,
      2,
      28,
      68
    ],
    "bandNote": "Universe: a reconstructed ~2,500 assemblers, panel shops and installer firms. Charger asset counts are not this pyramid. Reconstructed gross-turnover counts, not a GSTN or MCA census. Aligned to Gazette S.O. 1364(E), 21 March 2025, in force 1 April 2025: Micro ≤ ₹10 crore (investment ceiling ≤ ₹2.5 crore), Small ₹10–100 crore (investment ≤ ₹25 crore), Medium ₹100–200 crore and ₹200–500 crore (investment ≤ ₹125 crore), Large > ₹500 crore (outside MSME). The old ₹50–200 slice is remapped: ₹50–100 sits in Small and ₹100–200 in Medium. Udyam turnover excludes exports (S.O. 2119(E) as amended), so a heavy exporter can sit in a lower Udyam class than these gross bands. Unit share is not turnover share. Export-ready counts are not a TradeStat exporter census.",
    "mfi": "Thin. A micro electrician may use MUDRA. The CPO’s project finance is not an MFI product.",
    "lending": "Horizontal, for an eligible MSME: CGTMSE (a guarantee, not insurance), MUDRA, TReDS, SIDBI, and ECGC where the firm itself exports. Sector: PM E-DRIVE and FAME-II are subsidies on charging assets, paid through programme agencies, not a loan to the electrician. No MSME EVSE line verified.",
    "insurance": "Public liability at the charger and workmen cover for installers are the gap. CPO receivables to a small assembler are uninsured. ECGC is n.a. for domestic installs.",
    "vcpe": "Moderate on charge-point operators. None on the electrician."
  },
  {
    "id": "techtex",
    "name": "Technical textiles & MMF",
    "funded": "National Technical Textiles Mission, 2020, outlay ₹1,480 crore, extended to 31 March 2026 · GREAT startup grants (24 startups, up to ₹50 lakh) · PLI Textiles notified 24 September 2021, outlay ₹10,683 crore · 8 QCOs on 68 items",
    "participants": "24 GREAT startups and 30 PLI textile companies that had commenced production are scheme lists. They are not the mill and converter population, and they are not added to each other.",
    "participantKind": "Scheme participants (startups and PLI companies), not a mill census",
    "ancillaries": "Independent coaters, nonwoven units and converters selling to auto, medical, infrastructure or defence buyers — not the 30 PLI companies and not a commodity powerloom",
    "activity": "Manufacturing",
    "geo": "Surat, Panipat, Coimbatore and other MMF centres. GREAT startups are scattered, including Bengaluru. No official district census of technical-textile units.",
    "mode": "Traditional",
    "icam": "New candidate",
    "fit": 4,
    "why": "Real buyer industries and a converter tail inside old textile towns, but the technical-textile firm is not yet separated from the commodity mill.",
    "hs4": "5603, 5903, 5911, selected 5407 and 5512. The Ministry’s technical-textile total is its own definition, not one heading.",
    "exportFy25": "₹24,732.68 crore in FY2024–25, Ministry of Textiles technical-textile series, up from ₹21,407.36 crore in FY2023–24. Not the same as RMG (USD 15.99 billion) or the USD 6 billion man-made-fibre textile line.",
    "exportUnits": "n.p. The Ministry publishes the value, not an exporter count.",
    "turnover": "n.p. for technical textiles as a product class. ASI FY2024–25 textile-factory employment is 17.57 lakh persons and is all textiles.",
    "turnSplit": "Exports are known. Domestic turnover of the technical subset is n.p., so no share is stated.",
    "employees": "n.p. for the subset. ASI FY2024–25: 17.57 lakh persons in textile factories, which is the parent industry, not this cohort. NTTM training of more than 1,000 persons is not employment.",
    "vintage": "2020 (NTTM). PLI performance years start after a two-year gestation.",
    "large": "40",
    "expLarge": "20 reconstructed — PLI and larger exporters, not a census",
    "med200": "60",
    "expMed200": "15 reconstructed",
    "med100": "150",
    "expMed100": "25 reconstructed",
    "small": "900",
    "micro": "1850",
    "bandPct": [
      1,
      2,
      5,
      30,
      62
    ],
    "bandNote": "Universe: a reconstructed ~3,000 converters and specialised mills. The 24 startups and 30 PLI companies are inside the upper bands, not the whole pyramid. Reconstructed gross-turnover counts, not a GSTN or MCA census. Aligned to Gazette S.O. 1364(E), 21 March 2025, in force 1 April 2025: Micro ≤ ₹10 crore (investment ceiling ≤ ₹2.5 crore), Small ₹10–100 crore (investment ≤ ₹25 crore), Medium ₹100–200 crore and ₹200–500 crore (investment ≤ ₹125 crore), Large > ₹500 crore (outside MSME). The old ₹50–200 slice is remapped: ₹50–100 sits in Small and ₹100–200 in Medium. Udyam turnover excludes exports (S.O. 2119(E) as amended), so a heavy exporter can sit in a lower Udyam class than these gross bands. Unit share is not turnover share. Export-ready counts are not a TradeStat exporter census.",
    "mfi": "Thin for a converter. A micro weaver in the same town may use MUDRA. NABARD is relevant only for a rural producer, not for a specified-fabric supplier.",
    "lending": "Horizontal, for an eligible MSME: CGTMSE (a guarantee, not insurance), MUDRA, TReDS, SIDBI, and ECGC where the firm itself exports. Sector: NTTM and GREAT are grants. PLI Textiles is an incentive for companies that clear an investment threshold. TUFS-successor status for new cases was not confirmed, so it is not listed as open. No micro-converter loan product.",
    "insurance": "ECGC for exporters. Fire and machinery for mills. Product liability where the cloth is protective or medical. Receivables from an auto or defence buyer are uninsured.",
    "vcpe": "The 24 GREAT startups are grant-funded (approved cost ₹12.16 crore, of which the Government of India share was ₹10.79 crore), which is not venture capital. PE that exists sits with larger MMF players, not the converter."
  },
  {
    "id": "space",
    "name": "Space components & small-sat",
    "funded": "IN-SPACe, 2020 · space-sector reforms opening private participation · production-linked and technology funds are not an MSME scheme. iDEX overlaps defence space and is not this cohort.",
    "participants": "IN-SPACe authorisations and a short list of private launch and satellite firms. Component MSMEs are n.p. Do not add authorisations to firms.",
    "participantKind": "Authorisations and known private space firms. Not a component census.",
    "ancillaries": "Precision machining, composites, harness and electronics job-shops that could sell to a private satellite firm or to ISRO’s vendor list — not ISRO and not the launch company",
    "activity": "Both",
    "geo": "Bengaluru and Hyderabad, with a thin scatter in Ahmedabad and Thiruvananthapuram. Not a single lane.",
    "mode": "Hybrid",
    "icam": "New candidate",
    "fit": 4,
    "why": "A real component craft exists in two cities, but offtake is still ISRO and a few private primes, and the MSME list is thin.",
    "hs4": "Do not use 8802. That is aircraft. Small-sat and components are not a single FY25 heading in the series used.",
    "exportFy25": "n.p. for this cohort.",
    "exportUnits": "n.a. ISRO and IN-SPACe authorisations are not exporters.",
    "turnover": "n.p.",
    "turnSplit": "Treat as domestic. The buyer is ISRO or a private prime.",
    "employees": "n.p.",
    "vintage": "2020 (IN-SPACe and the private-participation reform).",
    "large": "8",
    "expLarge": "n.a. as exporters — domestic ISRO and prime offtake",
    "med200": "12",
    "expMed200": "n.a. as exporters",
    "med100": "20",
    "expMed100": "n.a. as exporters",
    "small": "80",
    "micro": "130",
    "bandPct": [
      3,
      5,
      8,
      32,
      52
    ],
    "bandNote": "Universe: a reconstructed ~250 firms including primes in Large. Shape sketch, not an IN-SPACe extract. Reconstructed gross-turnover counts, not a GSTN or MCA census. Aligned to Gazette S.O. 1364(E), 21 March 2025, in force 1 April 2025: Micro ≤ ₹10 crore (investment ceiling ≤ ₹2.5 crore), Small ₹10–100 crore (investment ≤ ₹25 crore), Medium ₹100–200 crore and ₹200–500 crore (investment ≤ ₹125 crore), Large > ₹500 crore (outside MSME). The old ₹50–200 slice is remapped: ₹50–100 sits in Small and ₹100–200 in Medium. Udyam turnover excludes exports (S.O. 2119(E) as amended), so a heavy exporter can sit in a lower Udyam class than these gross bands. Unit share is not turnover share. Export-ready counts are not a TradeStat exporter census.",
    "mfi": "None typical. Banks, grants and venture only.",
    "lending": "Horizontal, for an eligible MSME: CGTMSE (a guarantee, not insurance), MUDRA, TReDS, SIDBI, and ECGC where the firm itself exports. Sector: IN-SPACe authorisation is a gate, not a loan. No MSME space-component line verified.",
    "insurance": "Launch and in-orbit covers sit with the prime. The machine shop’s fire and workmen covers are ordinary. Milestone receivables from ISRO are uninsured.",
    "vcpe": "Moderate on a few private space firms. None on the machine shop."
  },
  {
    "id": "ghydrogen",
    "name": "Green hydrogen ancillaries",
    "funded": "National Green Hydrogen Mission, 2023. Incentives and offtake sit with energy and industrial groups.",
    "participants": "Mission awards are to large sponsors. An ancillary MSME census is n.p.",
    "participantKind": "Awarded sponsors. Not an MSME count.",
    "ancillaries": "Possible later: skid fabrication, valves, electrical balance. That ring is not observable as a cohort today. The electrolyser plant is not the cohort.",
    "activity": "Manufacturing",
    "geo": "Coastal and refinery states where sponsors have announced plants. Pan-India announcements, no MSME belt.",
    "mode": "Hybrid",
    "icam": "New candidate",
    "fit": 3,
    "why": "Capital-heavy anchors. No MSME buyer book and no belt a centre could open.",
    "hs4": "No cohort heading. Do not borrow industrial-gas or electrical headings as hydrogen exports.",
    "exportFy25": "n.p.",
    "exportUnits": "n.a.",
    "turnover": "n.p. Mission outlay and plant capex are not sales.",
    "turnSplit": "Treat as domestic project offtake if and when equipment is sold. No split is stated.",
    "employees": "n.p.",
    "vintage": "2023 (National Green Hydrogen Mission).",
    "large": "15",
    "expLarge": "n.a. as exporters",
    "med200": "10",
    "expMed200": "n.a. as exporters",
    "med100": "10",
    "expMed100": "n.a. as exporters",
    "small": "30",
    "micro": "55",
    "bandPct": [
      13,
      8,
      8,
      25,
      46
    ],
    "bandNote": "Universe: a reconstructed sketch of about 120 possible vendors and sponsors. It is a ceiling, not a census, and it is not a cohort. Reconstructed gross-turnover counts, not a GSTN or MCA census. Aligned to Gazette S.O. 1364(E), 21 March 2025, in force 1 April 2025: Micro ≤ ₹10 crore (investment ceiling ≤ ₹2.5 crore), Small ₹10–100 crore (investment ≤ ₹25 crore), Medium ₹100–200 crore and ₹200–500 crore (investment ≤ ₹125 crore), Large > ₹500 crore (outside MSME). The old ₹50–200 slice is remapped: ₹50–100 sits in Small and ₹100–200 in Medium. Udyam turnover excludes exports (S.O. 2119(E) as amended), so a heavy exporter can sit in a lower Udyam class than these gross bands. Unit share is not turnover share. Export-ready counts are not a TradeStat exporter census.",
    "mfi": "None typical.",
    "lending": "Horizontal, for an eligible MSME: CGTMSE (a guarantee, not insurance), MUDRA, TReDS, SIDBI, and ECGC where the firm itself exports. Sector: NGHM incentives are for the sponsor. No MSME hydrogen product.",
    "insurance": "Construction and marine covers sit on the project. Nothing cohort-specific.",
    "vcpe": "Deep on sponsor balance sheets and climate platforms. None on a vendor ring that is not there."
  },
  {
    "id": "ethanol",
    "name": "Ethanol, biofuels & SAF feedstock",
    "funded": "National Policy on Biofuels, 2018 · ethanol blended petrol programme accelerated toward 20% · interest subvention on distillery capacity · SAF is a later refinery topic, not an MSME plant",
    "participants": "Distilleries and grain or molasses plants are a few hundred large units. FPO and feedstock collection points are a different and much larger population. They are not added.",
    "participantKind": "Distillery plants, with FPO collection stated separately",
    "ancillaries": "FPO and farmer collection, residue aggregation and local transport — not the OMC and not the distillery",
    "activity": "Manufacturing",
    "geo": "Uttar Pradesh, Maharashtra, Karnataka and Bihar distillery belts for the plants. Collection is district-wide. A centre would have to pick one feedstock belt.",
    "mode": "Traditional",
    "icam": "New candidate",
    "fit": 3,
    "why": "The plant is an anchor and the OMC is the buyer. The micro tail is real but spread across districts.",
    "hs4": "Do not use 2207 as the ethanol-blending story. OMC offtake is domestic blending, not that export line.",
    "exportFy25": "n.p. for the blending programme.",
    "exportUnits": "n.a. as exporters.",
    "turnover": "n.p. for the FPO ring. Distillery capex under interest subvention is not FPO turnover.",
    "turnSplit": "Treat as domestic. The buyer is the oil marketing company.",
    "employees": "n.p. for collection. Distillery ASI employment is not the micro ring.",
    "vintage": "2018 policy, with the sharp capacity wave from about 2021 as the 20% blend target hardened.",
    "large": "80",
    "expLarge": "n.a. as exporters — OMC domestic offtake",
    "med200": "40",
    "expMed200": "n.a. as exporters",
    "med100": "80",
    "expMed100": "n.a. as exporters",
    "small": "600",
    "micro": "4200",
    "bandPct": [
      2,
      1,
      1,
      12,
      84
    ],
    "bandNote": "Universe: a reconstructed ~5,000 collection and aggregation units, with distilleries placed in Large. Not an OMCs vendor extract. Reconstructed gross-turnover counts, not a GSTN or MCA census. Aligned to Gazette S.O. 1364(E), 21 March 2025, in force 1 April 2025: Micro ≤ ₹10 crore (investment ceiling ≤ ₹2.5 crore), Small ₹10–100 crore (investment ≤ ₹25 crore), Medium ₹100–200 crore and ₹200–500 crore (investment ≤ ₹125 crore), Large > ₹500 crore (outside MSME). The old ₹50–200 slice is remapped: ₹50–100 sits in Small and ₹100–200 in Medium. Udyam turnover excludes exports (S.O. 2119(E) as amended), so a heavy exporter can sit in a lower Udyam class than these gross bands. Unit share is not turnover share. Export-ready counts are not a TradeStat exporter census.",
    "mfi": "Active on the micro collection tail: NABARD, FPO credit and SHG linkage in the feedstock districts. That is not distillery finance.",
    "lending": "Horizontal, for an eligible MSME: CGTMSE (a guarantee, not insurance), MUDRA, TReDS, SIDBI, and ECGC where the firm itself exports. Sector: NABARD and FPO credit, Agriculture Infrastructure Fund for aggregation. Interest subvention on distilleries is the anchor’s scheme. AgriSURE is equity or blended capital, not an MFI loan.",
    "insurance": "PMFBY insures the crop, not the collector’s receivable. Fire and boiler sit on the distillery. FPO receivables from a distillery or OMC agent are largely uninsured.",
    "vcpe": "Thin on the FPO. Distillery and SAF projects use project finance and strategic capital."
  },
  {
    "id": "nutra",
    "name": "Nutraceuticals & AYUSH manufacturing",
    "funded": "FSSAI nutraceutical and health-supplement rules · AYUSH manufacturing licensing · PLI food’s millet and health-food window from 2021 · Pharmexcil’s AYUSH and herbals export line",
    "participants": "Licensed AYUSH and nutraceutical manufacturers. A single official count combining both regimes was not found, so none is stated as a census. Pharmexcil members are a third, export-oriented list.",
    "participantKind": "Licensed manufacturers under FSSAI and AYUSH regimes — counts not merged",
    "ancillaries": "Extractors, packers, printers and small formulators — not the hospital and not the pharmacy chain",
    "activity": "Manufacturing",
    "geo": "Himachal (Baddi and surrounds), Uttarakhand, Gujarat and Maharashtra health-product belts. Not one park.",
    "mode": "Hybrid",
    "icam": "New candidate",
    "fit": 4,
    "why": "Licensed manufacturers with a domestic brand and export buyer, in known belts, but the two regulators mean the list is split.",
    "hs4": "2106, 3003, 1302 and parts of 3004. Do not use HS 3004 pharmaceutical exports (inside the USD 30.47 billion drugs line) as this cohort.",
    "exportFy25": "Pharmexcil, 14 June 2025: AYUSH and herbals USD 688.89 million. That is the herbal and AYUSH line, not all nutraceuticals.",
    "exportUnits": "Pharmexcil membership is a proxy, not a TradeStat exporter count, and it is not all manufacturers.",
    "turnover": "n.p. as a combined gross turnover. Do not reuse the medical-device market or the pharma export total.",
    "turnSplit": "The AYUSH and herbals export is known. Domestic turnover is n.p., so no percentage is stated. Brand sales are mostly domestic.",
    "employees": "n.p. ASI FY2024–25 pharma-factory employment is 10.92 lakh and is the parent drug industry, not this cohort.",
    "vintage": "2021, when FSSAI’s health-supplement enforcement and the PLI millet and health-food window overlapped.",
    "large": "30",
    "expLarge": "15 reconstructed from the exporting Pharmexcil-visible set",
    "med200": "50",
    "expMed200": "12 reconstructed",
    "med100": "120",
    "expMed100": "20 reconstructed",
    "small": "700",
    "micro": "1300",
    "bandPct": [
      1,
      2,
      6,
      32,
      59
    ],
    "bandNote": "Universe: a reconstructed ~2,200 licensed manufacturers. Not an FSSAI extract and not added to AYUSH licences. Reconstructed gross-turnover counts, not a GSTN or MCA census. Aligned to Gazette S.O. 1364(E), 21 March 2025, in force 1 April 2025: Micro ≤ ₹10 crore (investment ceiling ≤ ₹2.5 crore), Small ₹10–100 crore (investment ≤ ₹25 crore), Medium ₹100–200 crore and ₹200–500 crore (investment ≤ ₹125 crore), Large > ₹500 crore (outside MSME). The old ₹50–200 slice is remapped: ₹50–100 sits in Small and ₹100–200 in Medium. Udyam turnover excludes exports (S.O. 2119(E) as amended), so a heavy exporter can sit in a lower Udyam class than these gross bands. Unit share is not turnover share. Export-ready counts are not a TradeStat exporter census.",
    "mfi": "Thin. A micro herbal unit may use MUDRA. The licensed factory is a bank file. No sector MFI.",
    "lending": "Horizontal, for an eligible MSME: CGTMSE (a guarantee, not insurance), MUDRA, TReDS, SIDBI, and ECGC where the firm itself exports. Sector: AYUSH and FSSAI schemes and the PLI food health window for firms that qualify. PLI is not the micro formulator’s loan. No dedicated nutraceutical MSME line verified.",
    "insurance": "Product liability and recall are the gap. ECGC for the AYUSH exporter. Brand and modern-trade receivables are uninsured. Clinical-trial cover is n.a. for a supplement unit.",
    "vcpe": "Moderate on branded AYUSH and consumer-health companies. Thin on the contract packer."
  },
  {
    "id": "agritech",
    "name": "Agri-tech & farm machinery digital",
    "funded": "Digital agriculture and farm-mechanisation schemes through the 2020s · AgriSURE blended and equity capital · custom-hiring and drone-adjacent mechanisation. Startup India certificates are not machinery output.",
    "participants": "DPIIT-recognised agri startups are a certificate count. Farm-machinery MSMEs are a factory population. The two are not added.",
    "participantKind": "Startup certificates and, separately, machinery MSMEs",
    "ancillaries": "Custom-hiring centres, implement dealers and small machinery fabricators — not the FPO’s buyer and not the tractor OEM",
    "activity": "Both",
    "geo": "Punjab, western Uttar Pradesh, Maharashtra and Karnataka machinery belts, plus a pan-India startup layer that is not a belt.",
    "mode": "Hybrid",
    "icam": "New candidate",
    "fit": 3,
    "why": "Fabricators sit in real belts, but the digital cohort is pan-India and farm-machinery exports are the wrong turnover.",
    "hs4": "8432 and 8433 are farm machinery. They are not agri-tech startup turnover and are not quoted as this cohort’s export.",
    "exportFy25": "n.p. for agri-tech startups. Machinery HS lines are a different industry.",
    "exportUnits": "n.a. for the startup cohort. An EPC machinery list would measure factories, not apps.",
    "turnover": "n.p. Do not use farm-machinery exports as startup turnover.",
    "turnSplit": "Treat the service cohort as domestic. Machinery exports, if used at all, belong to a different profile.",
    "employees": "n.p.",
    "vintage": "2020–21, when digital agriculture schemes and startup recognition scaled together.",
    "large": "20",
    "expLarge": "n.a. as exporters for the digital cohort",
    "med200": "30",
    "expMed200": "n.a. as exporters for the digital cohort",
    "med100": "80",
    "expMed100": "Domestic offtake via state mechanisation and FPOs for fabricators",
    "small": "900",
    "micro": "2470",
    "bandPct": [
      1,
      1,
      2,
      26,
      70
    ],
    "bandNote": "Universe: a reconstructed ~3,500 startups and small fabricators. Certificates and factories are mixed only in this shape sketch and are labelled as such. Reconstructed gross-turnover counts, not a GSTN or MCA census. Aligned to Gazette S.O. 1364(E), 21 March 2025, in force 1 April 2025: Micro ≤ ₹10 crore (investment ceiling ≤ ₹2.5 crore), Small ₹10–100 crore (investment ≤ ₹25 crore), Medium ₹100–200 crore and ₹200–500 crore (investment ≤ ₹125 crore), Large > ₹500 crore (outside MSME). The old ₹50–200 slice is remapped: ₹50–100 sits in Small and ₹100–200 in Medium. Udyam turnover excludes exports (S.O. 2119(E) as amended), so a heavy exporter can sit in a lower Udyam class than these gross bands. Unit share is not turnover share. Export-ready counts are not a TradeStat exporter census.",
    "mfi": "Active at the custom-hiring and micro-fabricator end through NABARD, MUDRA and FPO credit. The venture-funded startup is outside that channel.",
    "lending": "Horizontal, for an eligible MSME: CGTMSE (a guarantee, not insurance), MUDRA, TReDS, SIDBI, and ECGC where the firm itself exports. Sector: NABARD, Agriculture Infrastructure Fund, custom-hiring credit, AgriSURE (equity and blended, not MFI). No single agri-tech MSME term loan.",
    "insurance": "Equipment and cattle or crop covers are not the startup’s receivable cover. PMFBY is farm cover. Custom-hiring receivables are uninsured.",
    "vcpe": "Moderate private agri venture plus AgriSURE at the startup end. Thin on the fabricator."
  },
  {
    "id": "avgc",
    "name": "AVGC-XR",
    "funded": "AVGC promotion task force, 2022 · state AVGC policies (Karnataka, Telangana, Maharashtra and others) · DPIIT startup certificates in animation, VFX, gaming and comics",
    "participants": "DPIIT certificates and state-policy applicant lists. A studio census is n.p. Freelancers are not firms and are not added.",
    "participantKind": "Startup certificates. Not a studio census.",
    "ancillaries": "Small studios and vendor benches selling to a publisher or a production house — not the platform and not the college",
    "activity": "Services",
    "geo": "Bengaluru, Hyderabad, Mumbai, Pune. Chapter 18 virtual work, with a few studio buildings. Not a factory belt.",
    "mode": "Digital",
    "icam": "New candidate",
    "fit": 3,
    "why": "Buyer delays exist, but the cohort is digital and pan-city, not a physical centre.",
    "hs4": "No HSN — services",
    "exportFy25": "n.p. as a cohort line. It sits, unseparated, inside India’s services exports of USD 383.51 billion in FY2024–25 (PIB).",
    "exportUnits": "n.p. Services exports are not a TradeStat exporter file.",
    "turnover": "n.p.",
    "turnSplit": "Treat recorded studio sales as mixed. No official domestic-versus-export split for the MSME bench.",
    "employees": "n.p. Task-force job claims are not an ASI count.",
    "vintage": "2022 (national AVGC task force and the state-policy wave).",
    "large": "25",
    "expLarge": "n.p. — services, no TradeStat exporter count",
    "med200": "40",
    "expMed200": "n.p.",
    "med100": "80",
    "expMed100": "n.p.",
    "small": "1500",
    "micro": "6355",
    "bandPct": [
      0,
      1,
      1,
      19,
      79
    ],
    "bandNote": "Universe: a reconstructed ~8,000 studios and small vendor firms. Freelancers are excluded. Not a DPIIT extract. Reconstructed gross-turnover counts, not a GSTN or MCA census. Aligned to Gazette S.O. 1364(E), 21 March 2025, in force 1 April 2025: Micro ≤ ₹10 crore (investment ceiling ≤ ₹2.5 crore), Small ₹10–100 crore (investment ≤ ₹25 crore), Medium ₹100–200 crore and ₹200–500 crore (investment ≤ ₹125 crore), Large > ₹500 crore (outside MSME). The old ₹50–200 slice is remapped: ₹50–100 sits in Small and ₹100–200 in Medium. Udyam turnover excludes exports (S.O. 2119(E) as amended), so a heavy exporter can sit in a lower Udyam class than these gross bands. Unit share is not turnover share. Export-ready counts are not a TradeStat exporter census.",
    "mfi": "None typical. Freelancers are not an MFI book. Studios use banks or nothing.",
    "lending": "Horizontal, for an eligible MSME: CGTMSE (a guarantee, not insurance), MUDRA, TReDS, SIDBI, and ECGC where the firm itself exports. Sector: state AVGC incentives are subsidies or space, not a receivable line. No MSME production-finance product verified.",
    "insurance": "Professional indemnity and production insurance exist commercially and are rare at the small studio. Client receivables are uninsured. ECGC is a poor fit for a services invoice.",
    "vcpe": "Moderate venture capital on gaming and a few studios. None on the vendor bench."
  },
  {
    "id": "geospatial",
    "name": "Geospatial & drones-as-a-service",
    "funded": "Geospatial guidelines liberalised in 2021 · Drone Rules, 2021, for the aircraft the service uses · survey and mapping tenders on GeM. Manufacturing of drones is the separate demo row.",
    "participants": "DPIIT certificates and GeM-registered survey vendors. Remote-pilot certificates (16,000 as of the 26 July 2024 PIB) are people, not firms.",
    "participantKind": "Service firms and certificates. Pilot certificates are not enterprises.",
    "ancillaries": "Small survey and mapping firms and drone-service operators — not the drone manufacturer and not the government buyer",
    "activity": "Services",
    "geo": "Pan-India project work. Firms cluster lightly in Bengaluru, Hyderabad and Delhi. Not a belt.",
    "mode": "Digital",
    "icam": "New candidate",
    "fit": 3,
    "why": "GeM and infrastructure buyers are visible, but the firms are a virtual layer on top of the drone demo, not a second centre.",
    "hs4": "No HSN — services",
    "exportFy25": "n.p. Domestic GeM and project offtake. Do not use drone-goods headings.",
    "exportUnits": "n.a.",
    "turnover": "n.p.",
    "turnSplit": "Treat as domestic.",
    "employees": "n.p. Remote-pilot certificates are not jobs in this row.",
    "vintage": "2021 (geospatial guidelines and Drone Rules).",
    "large": "10",
    "expLarge": "n.a. as exporters",
    "med200": "15",
    "expMed200": "n.a. as exporters",
    "med100": "40",
    "expMed100": "n.a. as exporters",
    "small": "400",
    "micro": "1035",
    "bandPct": [
      1,
      1,
      2,
      27,
      69
    ],
    "bandNote": "Universe: a reconstructed ~1,500 survey and drone-service firms. Pilot certificates are excluded. Reconstructed gross-turnover counts, not a GSTN or MCA census. Aligned to Gazette S.O. 1364(E), 21 March 2025, in force 1 April 2025: Micro ≤ ₹10 crore (investment ceiling ≤ ₹2.5 crore), Small ₹10–100 crore (investment ≤ ₹25 crore), Medium ₹100–200 crore and ₹200–500 crore (investment ≤ ₹125 crore), Large > ₹500 crore (outside MSME). The old ₹50–200 slice is remapped: ₹50–100 sits in Small and ₹100–200 in Medium. Udyam turnover excludes exports (S.O. 2119(E) as amended), so a heavy exporter can sit in a lower Udyam class than these gross bands. Unit share is not turnover share. Export-ready counts are not a TradeStat exporter census.",
    "mfi": "None typical.",
    "lending": "Horizontal, for an eligible MSME: CGTMSE (a guarantee, not insurance), MUDRA, TReDS, SIDBI, and ECGC where the firm itself exports. Sector: none. GeM is a buyer channel, not a loan. Drone PLI closed and belonged to manufacturers.",
    "insurance": "DGCA third-party liability sits on the operator. Professional indemnity for a bad survey is rare. Government-tender receivables are uninsured.",
    "vcpe": "Thin. A few drone-service startups have raised rounds. The survey shop has not."
  },
  {
    "id": "cyber",
    "name": "Cybersecurity services",
    "funded": "CERT-In directions, 2022 · public-sector security audits · DPDP Act rules raise demand. None of these create an MSME factory cluster.",
    "participants": "CERT-In empanelled auditors are a list. DPIIT cyber startups are another. They are not added.",
    "participantKind": "Empanelled auditors and startup certificates",
    "ancillaries": "Small audit and managed-service firms. They are vendors to banks and government, and they are also the kind of firm that should be a member, not a centre cohort.",
    "activity": "Services",
    "geo": "Bengaluru, Hyderabad, NCR, Pune. Virtual delivery. No belt.",
    "mode": "Digital",
    "icam": "New candidate",
    "fit": 3,
    "why": "A services market with no physical MSME ring a Capability Centre should enrol.",
    "hs4": "No HSN — services",
    "exportFy25": "n.p. inside services exports of USD 383.51 billion, FY2024–25. Not separable here.",
    "exportUnits": "n.p.",
    "turnover": "n.p.",
    "turnSplit": "n.p. Do not invent a split.",
    "employees": "n.p.",
    "vintage": "2022 (CERT-In directions).",
    "large": "30",
    "expLarge": "n.p. — services",
    "med200": "40",
    "expMed200": "n.p.",
    "med100": "80",
    "expMed100": "n.p.",
    "small": "900",
    "micro": "2950",
    "bandPct": [
      1,
      1,
      2,
      22,
      74
    ],
    "bandNote": "Universe: a reconstructed ~4,000 service firms. Not an empanelment extract. Reconstructed gross-turnover counts, not a GSTN or MCA census. Aligned to Gazette S.O. 1364(E), 21 March 2025, in force 1 April 2025: Micro ≤ ₹10 crore (investment ceiling ≤ ₹2.5 crore), Small ₹10–100 crore (investment ≤ ₹25 crore), Medium ₹100–200 crore and ₹200–500 crore (investment ≤ ₹125 crore), Large > ₹500 crore (outside MSME). The old ₹50–200 slice is remapped: ₹50–100 sits in Small and ₹100–200 in Medium. Udyam turnover excludes exports (S.O. 2119(E) as amended), so a heavy exporter can sit in a lower Udyam class than these gross bands. Unit share is not turnover share. Export-ready counts are not a TradeStat exporter census.",
    "mfi": "None typical.",
    "lending": "Horizontal, for an eligible MSME: CGTMSE (a guarantee, not insurance), MUDRA, TReDS, SIDBI, and ECGC where the firm itself exports. Sector: none. These firms are often the delivery partner, not the borrower the centre was built for.",
    "insurance": "Professional indemnity and cyber cover are the firm’s own product market as well as its need. Client receivables are uninsured.",
    "vcpe": "Moderate on product startups. The audit shop is bootstrapped. Either way this is not a cluster PE gap the centre should fill."
  },
  {
    "id": "specialty-steel",
    "name": "Specialty steel (MSME conversion)",
    "funded": "PLI Specialty Steel, 2021. The incentive is on the melt shop and the large processor. MSME conversion and rerolling is the ring.",
    "participants": "PLI Specialty Steel applicants are a short approved list. Rerollers and converters are a different population and are not added to it.",
    "participantKind": "PLI applicants, with rerollers uncounted",
    "ancillaries": "Rerollers, pickling, cutting and component forgers who could move into a specialty grade — not the melt shop",
    "activity": "Manufacturing",
    "geo": "Jamshedpur, Hazira, Dolvi and the older rerolling clusters of Bhavnagar, Mandi Gobindgarh and Raipur. The PLI plant and the reroller are not in the same lane.",
    "mode": "Traditional",
    "icam": "New candidate",
    "fit": 3,
    "why": "Anchors are capital-heavy. The MSME conversion tail is real and scattered, and it is not the PLI unit.",
    "hs4": "7208, 7209, 7210, 7225 and related flat and alloy headings. Engineering-goods exports of USD 116.67 billion are not this line.",
    "exportFy25": "n.p. as a specialty-steel MSME line. The parent engineering-goods total is USD 116.67 billion, FY2024–25, and is too wide to use.",
    "exportUnits": "n.p.",
    "turnover": "n.p. for the MSME conversion ring. PLI investment is the plant’s capex.",
    "turnSplit": "n.p. Do not apply the engineering-goods export share to rerollers.",
    "employees": "n.p. for the ring.",
    "vintage": "2021 (PLI Specialty Steel).",
    "large": "25",
    "expLarge": "10 reconstructed large mills — domestic and export, not a census",
    "med200": "40",
    "expMed200": "8 reconstructed",
    "med100": "80",
    "expMed100": "12 reconstructed",
    "small": "250",
    "micro": "205",
    "bandPct": [
      4,
      7,
      13,
      42,
      34
    ],
    "bandNote": "Universe: a reconstructed ~600 rerollers and converters. PLI plants sit in Large. Reconstructed gross-turnover counts, not a GSTN or MCA census. Aligned to Gazette S.O. 1364(E), 21 March 2025, in force 1 April 2025: Micro ≤ ₹10 crore (investment ceiling ≤ ₹2.5 crore), Small ₹10–100 crore (investment ≤ ₹25 crore), Medium ₹100–200 crore and ₹200–500 crore (investment ≤ ₹125 crore), Large > ₹500 crore (outside MSME). The old ₹50–200 slice is remapped: ₹50–100 sits in Small and ₹100–200 in Medium. Udyam turnover excludes exports (S.O. 2119(E) as amended), so a heavy exporter can sit in a lower Udyam class than these gross bands. Unit share is not turnover share. Export-ready counts are not a TradeStat exporter census.",
    "mfi": "None typical. Rerollers use bank cash credit. MFI products do not fund a heat.",
    "lending": "Horizontal, for an eligible MSME: CGTMSE (a guarantee, not insurance), MUDRA, TReDS, SIDBI, and ECGC where the firm itself exports. Sector: PLI Specialty Steel is the plant’s incentive. No MSME conversion loan verified.",
    "insurance": "Fire, marine and boiler on the mill. Receivables from an auto or project buyer are uninsured. ECGC only if the reroller itself exports.",
    "vcpe": "None on the reroller. Strategic capital sits on the listed steel groups."
  },
  {
    "id": "api",
    "name": "Bulk drugs & KSMs / APIs",
    "funded": "PLI Bulk Drugs, 2020, for KSMs, drug intermediates and APIs · bulk-drug parks. The formulation MSME is a different industry.",
    "participants": "PLI Bulk Drugs approvals are a short list of plants. Bulk-drug manufacturing units in the older clusters are a larger population and are not added to the approval list.",
    "participantKind": "PLI approvals, with cluster units uncounted separately",
    "ancillaries": "Intermediates, solvents, job-work and utilities MSMEs around a bulk-drug park — not the fermentation or reactor plant",
    "activity": "Manufacturing",
    "geo": "Hyderabad, Visakhapatnam, Ankleshwar, Vapi and the bulk-drug parks. Plants dominate.",
    "mode": "Hybrid",
    "icam": "New candidate",
    "fit": 3,
    "why": "The park and the reactor are the anchor. The MSME ring is thinner than the policy story and is environmentally gated.",
    "hs4": "2933, 2941 and related organic headings. Pharmexcil’s bulk-drug export is the right basket. Do not use the full drugs-and-pharmaceuticals USD 30.47 billion.",
    "exportFy25": "Pharmexcil, 14 June 2025: bulk drugs USD 4.87 billion. Formulations are outside this figure.",
    "exportUnits": "Pharmexcil membership is a proxy, not a TradeStat count.",
    "turnover": "n.p. as MSME-ring turnover. PLI sales are beneficiary sales of approved plants.",
    "turnSplit": "Bulk-drug export USD 4.87 billion is official. Domestic residual of plant turnover is n.p., so no percentage is stated.",
    "employees": "ASI FY2024–25 pharma factories: 10.92 lakh persons. That is formulations plus bulk drugs, not the ancillary ring.",
    "vintage": "2020 (PLI Bulk Drugs). Parks follow the same wave.",
    "large": "40",
    "expLarge": "25 reconstructed from the exporting bulk-drug set",
    "med200": "70",
    "expMed200": "20 reconstructed",
    "med100": "140",
    "expMed100": "30 reconstructed",
    "small": "550",
    "micro": "700",
    "bandPct": [
      3,
      5,
      9,
      36,
      47
    ],
    "bandNote": "Universe: a reconstructed ~1,500 bulk-drug and intermediate units. PLI plants are in Large. Not a Pharmexcil extract. Reconstructed gross-turnover counts, not a GSTN or MCA census. Aligned to Gazette S.O. 1364(E), 21 March 2025, in force 1 April 2025: Micro ≤ ₹10 crore (investment ceiling ≤ ₹2.5 crore), Small ₹10–100 crore (investment ≤ ₹25 crore), Medium ₹100–200 crore and ₹200–500 crore (investment ≤ ₹125 crore), Large > ₹500 crore (outside MSME). The old ₹50–200 slice is remapped: ₹50–100 sits in Small and ₹100–200 in Medium. Udyam turnover excludes exports (S.O. 2119(E) as amended), so a heavy exporter can sit in a lower Udyam class than these gross bands. Unit share is not turnover share. Export-ready counts are not a TradeStat exporter census.",
    "mfi": "None typical. Pollution-control and working-capital finance is a bank file.",
    "lending": "Horizontal, for an eligible MSME: CGTMSE (a guarantee, not insurance), MUDRA, TReDS, SIDBI, and ECGC where the firm itself exports. Sector: PLI Bulk Drugs is an incentive to approved applicants. Park plots are allotments, not loans. No micro-intermediate MFI channel.",
    "insurance": "Pollution liability, fire and marine. Product liability on an API is commercial. Plant receivables are uninsured. ECGC for the exporter of record, who is usually the plant.",
    "vcpe": "Thin on the job-work unit. Strategic and PE capital appears on larger pharma groups, which are the anchor."
  },
  {
    "id": "electronics",
    "name": "Mobile & electronics manufacturing",
    "funded": "National Policy on Electronics, 2019 · PLI Large-Scale Electronics, 2020, 32 beneficiary companies · SPECS · later component incentives. Phase II: do not treat the assembly wave as undiscovered.",
    "participants": "32 PLI LSEM companies. More than 300 mobile manufacturing units (MeitY). Units are not enterprises, and neither count is the MSME component ring.",
    "participantKind": "PLI companies and manufacturing units — not the supplier census",
    "ancillaries": "Tool rooms, moulders, metal and plastic parts, and component MSMEs selling to an assembler — not Foxconn, Dixon, Tata Electronics or the other PLI principals",
    "activity": "Manufacturing",
    "geo": "Noida–Greater Noida, Sriperumbudur–Oragadam, Sri City. The ring, if dense, is in those catchments.",
    "mode": "Hybrid",
    "icam": "Phase II",
    "fit": 4,
    "why": "Phase II assembly is already known. The uncounted supplier ring in two or three belts is the only centre question, and it is not yet listed.",
    "hs4": "8517. Smartphones at 8-digit 85171300 sit inside 8517. MeitY’s wider electronics basket is not one heading.",
    "exportFy25": "DGCIS principal commodity electronic goods: USD 38.58 billion, FY2024–25. MeitY: electronics exports about ₹3.26 lakh crore; mobile phones about ₹2 lakh crore. Smartphones about USD 24.84 billion are the 85171300 line inside 8517.",
    "exportUnits": "n.p. Export growth is concentrated in the PLI assembly tier. That is not an MSME exporter count.",
    "turnover": "MeitY production, not a turnover census: electronics goods ₹11.32 lakh crore in FY2024–25. Mobile phones ₹5.45 lakh crore. PLI cumulative production is a different, multi-year series (₹8.45 lakh crore to June 2025 in the 23 July 2025 PIB).",
    "turnSplit": "MeitY, same release family: exports about ₹3.26 lakh crore against production ₹11.32 lakh crore, about 29% export and 71% domestic. This is a ratio of two MeitY estimates, not a GSTN split. The MSME ring’s own split is n.p.",
    "employees": "MeitY: about 25 lakh electronics jobs. PLI LSEM direct jobs 1,30,330 to June 2025. Scheme jobs are not industry employment, and neither figure is the supplier ring.",
    "vintage": "2019–20 (NPE and PLI). The component-tier push is later and thinner.",
    "large": "80",
    "expLarge": "The 32 PLI companies dominate exports — they are not the MSME export-ready count",
    "med200": "120",
    "expMed200": "40 reconstructed component exporters",
    "med100": "300",
    "expMed100": "80 reconstructed",
    "small": "3500",
    "micro": "8000",
    "bandPct": [
      1,
      1,
      2,
      29,
      67
    ],
    "bandNote": "Universe: a reconstructed ~12,000 suppliers in the three assembly catchments. The 300 manufacturing units are not this pyramid. Reconstructed gross-turnover counts, not a GSTN or MCA census. Aligned to Gazette S.O. 1364(E), 21 March 2025, in force 1 April 2025: Micro ≤ ₹10 crore (investment ceiling ≤ ₹2.5 crore), Small ₹10–100 crore (investment ≤ ₹25 crore), Medium ₹100–200 crore and ₹200–500 crore (investment ≤ ₹125 crore), Large > ₹500 crore (outside MSME). The old ₹50–200 slice is remapped: ₹50–100 sits in Small and ₹100–200 in Medium. Udyam turnover excludes exports (S.O. 2119(E) as amended), so a heavy exporter can sit in a lower Udyam class than these gross bands. Unit share is not turnover share. Export-ready counts are not a TradeStat exporter census.",
    "mfi": "Thin. MUDRA may touch a micro packer. A tool room selling to an EMS company needs a bank line or TReDS.",
    "lending": "Horizontal, for an eligible MSME: CGTMSE (a guarantee, not insurance), MUDRA, TReDS, SIDBI, and ECGC where the firm itself exports. Sector: PLI LSEM is not open to this ring. TReDS works only if the assembler onboards the supplier. No component-MSME scheme was the centre’s to run.",
    "insurance": "ECGC where the MSME itself exports, which is rare. The principal carries marine cover on imported inputs. Supplier receivables are uninsured.",
    "vcpe": "Deep at the assembler and a few listed EMS companies. None on the tool room."
  },
  {
    "id": "ev",
    "name": "EV vehicles & auto-tech components",
    "funded": "FAME-II, ended 31 March 2024, ₹6,559 crore reimbursed to OEMs · PM E-DRIVE, 1 October 2024 to 31 March 2026, ₹10,900 crore · PLI Auto, 15 September 2021, outlay ₹25,938 crore, 82 applicants as on 30 November 2025. Phase II.",
    "participants": "82 PLI Auto applicants and 278 manufacturing units as on 30 November 2025. FAME and PM E-DRIVE OEM registrations are a different list. ACMA’s 1,100 members are the wider component industry, not an EV-only census. None of these are added together.",
    "participantKind": "PLI applicants and units. OEM registrations and ACMA members are separate.",
    "ancillaries": "Tier-2 and Tier-3 part makers pulled into a 50% domestic-value-addition part — excluding the pack and BMS ring, which has its own row, and excluding the OEM",
    "activity": "Manufacturing",
    "geo": "Pune–Chakan–Talegaon, Hosur–Krishnagiri, Sriperumbudur, Manesar–Bawal, Sanand, Pithampur. Phase II belts, not a new discovery.",
    "mode": "Hybrid",
    "icam": "Phase II",
    "fit": 3,
    "why": "The vehicle OEM is the anchor. The component belt is real, but the pack row is the better new centre and this row should not be opened beside it.",
    "hs4": "8703 is all passenger cars, not EV-only. 8708 is parts. Do not quote either heading as EV export.",
    "exportFy25": "n.p. for EV-only. ACMA component exports were USD 22.9 billion in FY2024–25 and include conventional parts. They are not this row’s figure.",
    "exportUnits": "n.p.",
    "turnover": "n.p. for EV-only. PLI Auto determined sales were ₹32,879 crore cumulative to 30 September 2025, which is scheme sales, not industry turnover. ACMA’s ₹6.73 lakh crore is the wider component industry.",
    "turnSplit": "Treat the EV OEM wave as domestic. The buyer incentive is FAME and PM E-DRIVE. No export share is stated.",
    "employees": "PLI Auto: 48,974 scheme jobs to 30 September 2025. ASI FY2024–25 motor-vehicle factories: 14.80 lakh persons, the parent industry. ACMA’s undated 1.5 million direct-job statement is not pinned to this row.",
    "vintage": "2019 FAME-II; PLI performance from FY2023–24. The supplier population is older than the wave.",
    "large": "35",
    "expLarge": "Domestic offtake — n.a. as an EV exporter census",
    "med200": "50",
    "expMed200": "Domestic OEM suppliers, count n.p.",
    "med100": "120",
    "expMed100": "Domestic OEM suppliers, count n.p.",
    "small": "1200",
    "micro": "2595",
    "bandPct": [
      1,
      1,
      3,
      30,
      65
    ],
    "bandNote": "Universe: a reconstructed ~4,000 EV-linked component firms. ACMA’s 1,100 members are not this pyramid. Pack and BMS units are excluded; they sit on the battery row. Reconstructed gross-turnover counts, not a GSTN or MCA census. Aligned to Gazette S.O. 1364(E), 21 March 2025, in force 1 April 2025: Micro ≤ ₹10 crore (investment ceiling ≤ ₹2.5 crore), Small ₹10–100 crore (investment ≤ ₹25 crore), Medium ₹100–200 crore and ₹200–500 crore (investment ≤ ₹125 crore), Large > ₹500 crore (outside MSME). The old ₹50–200 slice is remapped: ₹50–100 sits in Small and ₹100–200 in Medium. Udyam turnover excludes exports (S.O. 2119(E) as amended), so a heavy exporter can sit in a lower Udyam class than these gross bands. Unit share is not turnover share. Export-ready counts are not a TradeStat exporter census.",
    "mfi": "Thin. A micro job-shop may use MUDRA. It is not the cluster’s financing system.",
    "lending": "Horizontal, for an eligible MSME: CGTMSE (a guarantee, not insurance), MUDRA, TReDS, SIDBI, and ECGC where the firm itself exports. Sector: PLI Auto and PM E-DRIVE are not loans to the Tier-3 shop. TReDS where the OEM onboards the supplier. Vehicle NBFCs finance the buyer of the vehicle.",
    "insurance": "ECGC for a component exporter in the wider ACMA sense. EV-OEM receivables are uninsured. Product liability sits with the OEM.",
    "vcpe": "Deep on OEM and Tier-1 EV platforms. Thin on the Tier-3 machinist. The pack row is where the MSME capital gap is sharper."
  },
  {
    "id": "solar",
    "name": "Solar PV modules & BOS",
    "funded": "ALMM order, 2 January 2019; first module list 10 March 2021 · PLI high-efficiency modules, tranche I three bidders and tranche II eleven · cell ALMM from 2025–26. Phase II.",
    "participants": "100 ALMM manufacturers and 123 units at the 100 GW announcement, up from 21 manufacturers in 2021. PLI bidders are a subset. Installers and BOS MSMEs are a different population and are not added.",
    "participantKind": "ALMM manufacturers. Installers are a separate, uncounted service population.",
    "ancillaries": "Balance-of-system fabricators, structures, cables, and O&M MSMEs — not the module gigafactory and not the rooftop app",
    "activity": "Manufacturing",
    "geo": "Module capacity is concentrated in Gujarat, with large lines also in Tamil Nadu, Telangana and elsewhere. BOS fabrication is wider. Projects in Rajasthan are generation, not manufacturing.",
    "mode": "Hybrid",
    "icam": "Phase II",
    "fit": 4,
    "why": "Phase II module plants are anchors. BOS and O&M MSMEs are the ring, thinner than the GW headlines and more geographically spread.",
    "hs4": "8541. Cells, wafers and modules split at 8-digit. This desk did not pull the FY25 8-digit export.",
    "exportFy25": "n.p. as a clean module line in the DGCIS principal-commodity release used here. ALMM capacity is not exports.",
    "exportUnits": "n.p. ALMM enlistment is not an exporter count.",
    "turnover": "n.p. Enlisted capacity crossed 100 GW and was later reported near 145 GW. Capacity is not sales. PLI installed capacity as on 30 June 2025 was about 18.5 GW modules under the scheme, which is also capacity.",
    "turnSplit": "n.p. Do not convert GW into a domestic-export split.",
    "employees": "n.p.",
    "vintage": "2021 (first ALMM list and the PLI awards).",
    "large": "40",
    "expLarge": "Domestic and some module exports — exporter count n.p.",
    "med200": "30",
    "expMed200": "n.p.",
    "med100": "80",
    "expMed100": "n.p.",
    "small": "1500",
    "micro": "4350",
    "bandPct": [
      1,
      0,
      1,
      25,
      73
    ],
    "bandNote": "Universe: a reconstructed ~6,000 BOS, structure and O&M firms, with ALMM manufacturers in the upper bands. Installer micro-enterprises inflate Micro and are a service tail, labelled as such. Reconstructed gross-turnover counts, not a GSTN or MCA census. Aligned to Gazette S.O. 1364(E), 21 March 2025, in force 1 April 2025: Micro ≤ ₹10 crore (investment ceiling ≤ ₹2.5 crore), Small ₹10–100 crore (investment ≤ ₹25 crore), Medium ₹100–200 crore and ₹200–500 crore (investment ≤ ₹125 crore), Large > ₹500 crore (outside MSME). The old ₹50–200 slice is remapped: ₹50–100 sits in Small and ₹100–200 in Medium. Udyam turnover excludes exports (S.O. 2119(E) as amended), so a heavy exporter can sit in a lower Udyam class than these gross bands. Unit share is not turnover share. Export-ready counts are not a TradeStat exporter census.",
    "mfi": "Thin on the fabricator. A rooftop installer sometimes uses MUDRA. That installer is not the manufacturing cohort.",
    "lending": "Horizontal, for an eligible MSME: CGTMSE (a guarantee, not insurance), MUDRA, TReDS, SIDBI, and ECGC where the firm itself exports. Sector: IREDA and bank project finance serve plants and power projects. PLI is the awarded manufacturer’s incentive. No BOS-MSME line verified.",
    "insurance": "Marine, erection all-risk and performance covers sit on the project. Fabricator receivables from an EPC are uninsured. ECGC if the module maker exports.",
    "vcpe": "Deep on listed and sponsored module makers. None on the structure fabricator."
  },
  {
    "id": "it",
    "name": "IT services & GCCs",
    "funded": "State GCC and IT policies through the 2010s and the post-2018 scale-up of global capability centres. Phase II. This is a member industry, not a factory cluster.",
    "participants": "NASSCOM member lists and state IT-park tenant lists. GCC announcements are a third count. None is an MSME census, and they are not added.",
    "participantKind": "Association and tenant lists. Not a firm census of an MSME ring.",
    "ancillaries": "Facilities, staffing and small vendor firms around a campus. They are a weak ring. The GCC itself is the anchor and often the right member, not the cohort.",
    "activity": "Services",
    "geo": "Bengaluru, Hyderabad, Pune, NCR, Chennai. Virtual delivery. Chapter 18.",
    "mode": "Digital",
    "icam": "Phase II",
    "fit": 3,
    "why": "Large, digital, and already a Phase II relationship. No factory cash-cycle cohort.",
    "hs4": "No HSN — services",
    "exportFy25": "n.p. as a GCC-only line. India’s services exports were USD 383.51 billion in FY2024–25 (PIB). IT is a large part of that account and is not restated here as a cohort figure.",
    "exportUnits": "n.p. No TradeStat file for services.",
    "turnover": "n.p. in this register. Industry association toplines are not an MSME-ring turnover.",
    "turnSplit": "Services exports dominate the GCC. The vendor ring, if any, is domestic. No split is calculated.",
    "employees": "n.p. here. Association employment headlines are the sector, not a vendor ring.",
    "vintage": "The GCC scale-up from about 2018 is the wave inside a much older IT industry. Phase II, not a new discovery.",
    "large": "200",
    "expLarge": "n.p. — services",
    "med200": "150",
    "expMed200": "n.p.",
    "med100": "300",
    "expMed100": "n.p.",
    "small": "4000",
    "micro": "10350",
    "bandPct": [
      1,
      1,
      2,
      27,
      69
    ],
    "bandNote": "Universe: a reconstructed ~15,000 campus vendors and small tech firms. This shape is weak and is labelled reconstructed. It is not NASSCOM membership. Reconstructed gross-turnover counts, not a GSTN or MCA census. Aligned to Gazette S.O. 1364(E), 21 March 2025, in force 1 April 2025: Micro ≤ ₹10 crore (investment ceiling ≤ ₹2.5 crore), Small ₹10–100 crore (investment ≤ ₹25 crore), Medium ₹100–200 crore and ₹200–500 crore (investment ≤ ₹125 crore), Large > ₹500 crore (outside MSME). The old ₹50–200 slice is remapped: ₹50–100 sits in Small and ₹100–200 in Medium. Udyam turnover excludes exports (S.O. 2119(E) as amended), so a heavy exporter can sit in a lower Udyam class than these gross bands. Unit share is not turnover share. Export-ready counts are not a TradeStat exporter census.",
    "mfi": "None typical.",
    "lending": "Horizontal, for an eligible MSME: CGTMSE (a guarantee, not insurance), MUDRA, TReDS, SIDBI, and ECGC where the firm itself exports. Sector: none for a GCC. The GCC is a buyer and a member.",
    "insurance": "Professional indemnity is standard at the GCC and rare at a tiny vendor. Vendor receivables are uninsured.",
    "vcpe": "Deep public markets and private equity on IT and GCC sponsors. None on the facilities vendor."
  },
  {
    "id": "healthtech",
    "name": "Healthtech & care delivery",
    "funded": "Telemedicine practice guidelines, 2020 · Ayushman Bharat Digital Mission health accounts and registries · state care-delivery contracts. Phase II. Not medical devices.",
    "participants": "DPIIT healthtech certificates and empanelled care providers are different lists. They are not the 700 device manufacturers and are not added to them.",
    "participantKind": "Startup certificates and empanelled providers. Not device manufacturers.",
    "ancillaries": "Small diagnostic collection points, home-care agencies and clinic groups — not the hospital chain and not the device factory",
    "activity": "Services",
    "geo": "Metro delivery, pan-India apps. No factory belt. Do not site this at AMTZ.",
    "mode": "Digital",
    "icam": "Phase II",
    "fit": 3,
    "why": "Care-delivery MSMEs exist, but they are a service layer. Device manufacturing is a different, higher-scoring row.",
    "hs4": "No HSN — services. Do not reuse medtech HS 90 or the USD 4.02 billion device export.",
    "exportFy25": "n.p. Do not double-count medtech USD 4.02 billion.",
    "exportUnits": "n.a.",
    "turnover": "n.p.",
    "turnSplit": "Treat as domestic. The payer is a hospital, an insurer or a public scheme.",
    "employees": "n.p.",
    "vintage": "2020 (telemedicine guidelines and the digital-health stack).",
    "large": "40",
    "expLarge": "n.a. as exporters",
    "med200": "60",
    "expMed200": "n.a. as exporters",
    "med100": "150",
    "expMed100": "n.a. as exporters",
    "small": "1500",
    "micro": "3250",
    "bandPct": [
      1,
      1,
      3,
      30,
      65
    ],
    "bandNote": "Universe: a reconstructed ~5,000 care-delivery and healthtech firms. Device manufacturers are excluded. Reconstructed gross-turnover counts, not a GSTN or MCA census. Aligned to Gazette S.O. 1364(E), 21 March 2025, in force 1 April 2025: Micro ≤ ₹10 crore (investment ceiling ≤ ₹2.5 crore), Small ₹10–100 crore (investment ≤ ₹25 crore), Medium ₹100–200 crore and ₹200–500 crore (investment ≤ ₹125 crore), Large > ₹500 crore (outside MSME). The old ₹50–200 slice is remapped: ₹50–100 sits in Small and ₹100–200 in Medium. Udyam turnover excludes exports (S.O. 2119(E) as amended), so a heavy exporter can sit in a lower Udyam class than these gross bands. Unit share is not turnover share. Export-ready counts are not a TradeStat exporter census.",
    "mfi": "Thin. A micro collection centre may use MUDRA. The funded healthtech company does not.",
    "lending": "Horizontal, for an eligible MSME: CGTMSE (a guarantee, not insurance), MUDRA, TReDS, SIDBI, and ECGC where the firm itself exports. Sector: healthcare NBFCs and hospital-equipment finance exist and usually serve the chain, not the collection point. No centre should originate them.",
    "insurance": "Clinical and professional covers sit with the provider. Scheme and insurer payouts to a small centre are uninsured receivables. This is not product-liability cover for a device.",
    "vcpe": "Deep on healthtech platforms. Thin on the collection point."
  },
  {
    "id": "edtech",
    "name": "Education technology & skilling",
    "funded": "Skill India and apprenticeship schemes · the 2020 remote-learning wave · National Education Policy skilling chapters. Phase II, and a delivery partner rather than a cohort.",
    "participants": "DPIIT edtech certificates and NSDC training partners are different lists. They are not added.",
    "participantKind": "Startup certificates and training-partner empanelments",
    "ancillaries": "Training partners and content vendors. The college or the sector skill council is the partner, not the MSME cohort.",
    "activity": "Services",
    "geo": "Pan-India and online. No belt.",
    "mode": "Digital",
    "icam": "Phase II",
    "fit": 3,
    "why": "A delivery partner for apprenticeship inside a real cluster, not a cluster of its own.",
    "hs4": "No HSN — services",
    "exportFy25": "n.p. inside services exports of USD 383.51 billion. Not separable here.",
    "exportUnits": "n.p.",
    "turnover": "n.p.",
    "turnSplit": "Treat as domestic.",
    "employees": "n.p. Placement claims are not employment in a cohort.",
    "vintage": "2020 (remote-learning scale-up inside an older training industry).",
    "large": "20",
    "expLarge": "n.a. as exporters",
    "med200": "30",
    "expMed200": "n.a. as exporters",
    "med100": "50",
    "expMed100": "n.a. as exporters",
    "small": "700",
    "micro": "2200",
    "bandPct": [
      1,
      1,
      2,
      23,
      73
    ],
    "bandNote": "Universe: a reconstructed ~3,000 training and edtech firms. Not an NSDC extract. Reconstructed gross-turnover counts, not a GSTN or MCA census. Aligned to Gazette S.O. 1364(E), 21 March 2025, in force 1 April 2025: Micro ≤ ₹10 crore (investment ceiling ≤ ₹2.5 crore), Small ₹10–100 crore (investment ≤ ₹25 crore), Medium ₹100–200 crore and ₹200–500 crore (investment ≤ ₹125 crore), Large > ₹500 crore (outside MSME). The old ₹50–200 slice is remapped: ₹50–100 sits in Small and ₹100–200 in Medium. Udyam turnover excludes exports (S.O. 2119(E) as amended), so a heavy exporter can sit in a lower Udyam class than these gross bands. Unit share is not turnover share. Export-ready counts are not a TradeStat exporter census.",
    "mfi": "None typical. Fee-financing NBFCs lend to learners, not to a training-partner’s receivable.",
    "lending": "Horizontal, for an eligible MSME: CGTMSE (a guarantee, not insurance), MUDRA, TReDS, SIDBI, and ECGC where the firm itself exports. Sector: scheme training contracts are grants or outcome payments. They are not a cluster loan. Learner NBFCs are out of charter.",
    "insurance": "Liability for a training centre is commercial. Outcome-payment receivables are uninsured.",
    "vcpe": "Was deep on consumer edtech platforms and has since concentrated. None of it is a training-partner book the centre should intermediate."
  },
  {
    "id": "logistics",
    "name": "E-commerce logistics & warehousing",
    "funded": "GST and e-way bill from 2017 · the e-commerce warehouse wave through 2020 · Open Network for Digital Commerce is a later rail. Phase II, with a Bhiwandi-type annex already the delivery form.",
    "participants": "Warehouse counts and transporter registrations are different units. Fleet owners are a third. They are not added. No single official firm census.",
    "participantKind": "No single census. Transporters, warehouses and fleet owners are separate units.",
    "ancillaries": "Last-mile fleet owners, small warehouses and loaders — not the platform and not the 3PL major",
    "activity": "Services",
    "geo": "Bhiwandi, Bilaspur–Gurugram, Hoskote and Sriperumbudur warehouse belts. Last-mile riders are city-wide.",
    "mode": "Hybrid",
    "icam": "Phase II",
    "fit": 4,
    "why": "Thick micro fleet tail and named warehouse belts, with platform payment as the offtake. Already the shape of an annex, not a new discovery.",
    "hs4": "No HSN — services",
    "exportFy25": "n.p. Domestic. Do not use merchandise export totals.",
    "exportUnits": "n.a.",
    "turnover": "n.p. GMV of e-commerce is not fleet turnover.",
    "turnSplit": "Treat as domestic.",
    "employees": "n.p. Platform rider counts are not fleet-owner enterprises.",
    "vintage": "2017–2020 (e-way bill and the warehouse build-out). Phase II.",
    "large": "40",
    "expLarge": "n.a. as exporters",
    "med200": "60",
    "expMed200": "n.a. as exporters",
    "med100": "150",
    "expMed100": "n.a. as exporters",
    "small": "4000",
    "micro": "15750",
    "bandPct": [
      0,
      0,
      1,
      20,
      79
    ],
    "bandNote": "Universe: a reconstructed ~20,000 fleet owners and small warehouses in the major belts. Riders who are not enterprises are excluded. Reconstructed gross-turnover counts, not a GSTN or MCA census. Aligned to Gazette S.O. 1364(E), 21 March 2025, in force 1 April 2025: Micro ≤ ₹10 crore (investment ceiling ≤ ₹2.5 crore), Small ₹10–100 crore (investment ≤ ₹25 crore), Medium ₹100–200 crore and ₹200–500 crore (investment ≤ ₹125 crore), Large > ₹500 crore (outside MSME). The old ₹50–200 slice is remapped: ₹50–100 sits in Small and ₹100–200 in Medium. Udyam turnover excludes exports (S.O. 2119(E) as amended), so a heavy exporter can sit in a lower Udyam class than these gross bands. Unit share is not turnover share. Export-ready counts are not a TradeStat exporter census.",
    "mfi": "Active on the last-mile micro fleet: vehicle NBFCs, MUDRA and some NBFC-MFI household top-ups. That credit is the EMI the payment delay then breaks.",
    "lending": "Horizontal, for an eligible MSME: CGTMSE (a guarantee, not insurance), MUDRA, TReDS, SIDBI, and ECGC where the firm itself exports. Sector: vehicle NBFCs are the real product for a small fleet. They are not a Catalyst loan. No e-commerce-MSME guarantee beyond CGTMSE was verified.",
    "insurance": "Vehicle, goods-in-transit and warehouse covers are commercial and uneven at the micro fleet. Platform payouts are uninsured. ECGC is n.a.",
    "vcpe": "Deep on platforms and large 3PLs. None on the fleet owner."
  },
  {
    "id": "fintech",
    "name": "Fintech & BC-agent networks",
    "funded": "Business-correspondent guidelines · UPI scale-up · Account Aggregator, 2021. Phase II. The firms are capital providers or agents, not a borrowing cluster.",
    "participants": "RBI-regulated fintechs and BC networks are different regulatory populations. Agent headcount is people, not enterprises. They are not added.",
    "participantKind": "Regulated entities and agent networks — agents are not enterprises",
    "ancillaries": "None that a Capability Centre should enrol. The BC agent is a distribution point. The fintech is a member or a lender.",
    "activity": "Services",
    "geo": "Pan-India agents. Firms in Mumbai, Bengaluru and NCR. No factory belt.",
    "mode": "Digital",
    "icam": "Phase II",
    "fit": 3,
    "why": "A delivery and capital rail for the five centres, not a cohort.",
    "hs4": "No HSN — services",
    "exportFy25": "n.p. Do not place this inside merchandise trade.",
    "exportUnits": "n.a.",
    "turnover": "n.p. Payment value and credit books are not MSME turnover.",
    "turnSplit": "n.a. This is not a goods cohort.",
    "employees": "n.p. Agent counts are not employment in a cluster.",
    "vintage": "The agent model is older. The wave used here is the Account Aggregator framework from 2021, inside Phase II.",
    "large": "40",
    "expLarge": "n.a.",
    "med200": "30",
    "expMed200": "n.a.",
    "med100": "50",
    "expMed100": "n.a.",
    "small": "400",
    "micro": "1480",
    "bandPct": [
      2,
      1,
      3,
      20,
      74
    ],
    "bandNote": "Universe: a reconstructed ~2,000 fintech enterprises. BC agents are excluded because they are not the firm. Reconstructed gross-turnover counts, not a GSTN or MCA census. Aligned to Gazette S.O. 1364(E), 21 March 2025, in force 1 April 2025: Micro ≤ ₹10 crore (investment ceiling ≤ ₹2.5 crore), Small ₹10–100 crore (investment ≤ ₹25 crore), Medium ₹100–200 crore and ₹200–500 crore (investment ≤ ₹125 crore), Large > ₹500 crore (outside MSME). The old ₹50–200 slice is remapped: ₹50–100 sits in Small and ₹100–200 in Medium. Udyam turnover excludes exports (S.O. 2119(E) as amended), so a heavy exporter can sit in a lower Udyam class than these gross bands. Unit share is not turnover share. Export-ready counts are not a TradeStat exporter census.",
    "mfi": "The NBFC-MFI is often the regulated entity itself. That is the opposite of a borrower cohort. Do not code the MFI as the micro tail of this row.",
    "lending": "These entities originate or distribute MUDRA, microfinance and business loans. They are not the borrowers. Listing CGTMSE here would invert the charter.",
    "insurance": "They distribute covers. They are not the uninsured MSME receivable.",
    "vcpe": "Deep. Fintechs are capitalled firms and capital providers. That depth is a reason to invite them as members, not to open a centre."
  },
  {
    "id": "drones",
    "name": "Drones & drone components",
    "funded": "Drone Rules, 2021 · PLI for drones and components, notified 30 September 2021, outlay ₹120 crore, performance years through FY2023–24 · import restriction on complete drones. Demonstration cluster: do not relaunch.",
    "participants": "PLI second provisional list, 6 July 2022: 12 drone makers and 11 component makers. PIB, 26 July 2024: 48 companies making type-certified models; 70 models; 116 remote-pilot training organisations. A later parliamentary reply: 96 type certificates and 10,208 registered type-certified drones as of September 2024. Aircraft, models, companies and training firms are not added.",
    "participantKind": "Manufacturers of type-certified models, with PLI beneficiaries as a subset",
    "ancillaries": "The 11 component firms on the 2022 list and later airframe, composite and electronics suppliers. Training organisations are not the manufacturing cohort.",
    "activity": "Manufacturing",
    "geo": "The 2022 list was already split across Bengaluru, Chennai, Noida, Gurugram, Mumbai, Pune, Hyderabad, Roorkee and Belagavi. No single belt.",
    "mode": "Hybrid",
    "icam": "Demo",
    "fit": 3,
    "why": "A real licensing wave and a small-firm list, too scattered and too small for a new centre. The demo, if it continues, is an attachment.",
    "hs4": "8806 for unmanned aircraft. Components are not in 8806.",
    "exportFy25": "n.p. The last official sales figure found is the PLI list’s own turnover, not an export line.",
    "exportUnits": "n.p.",
    "turnover": "Combined sales of the 23 PLI-list firms: ₹88 crore in FY2020–21 and ₹319 crore unaudited in FY2021–22. No FY2024–25 industry turnover. Do not substitute a private market-size estimate.",
    "turnSplit": "n.p. The FY2021–22 figure is total sales of 23 firms, with no export split.",
    "employees": "n.p. Remote-pilot certificates are pilots, not factory jobs.",
    "vintage": "2021 (Drone Rules and the PLI). The PLI window has closed.",
    "large": "2",
    "expLarge": "n.p.",
    "med200": "4",
    "expMed200": "n.p.",
    "med100": "10",
    "expMed100": "n.p.",
    "small": "80",
    "micro": "304",
    "bandPct": [
      0,
      1,
      3,
      20,
      76
    ],
    "bandNote": "Universe: a reconstructed ~400 manufacturers and component workshops, including uncertified shops in Micro. The 23 PLI firms are the upper end. FY2021–22 sales of ₹319 crore across 23 firms are the only official size evidence and are not a band. Reconstructed gross-turnover counts, not a GSTN or MCA census. Aligned to Gazette S.O. 1364(E), 21 March 2025, in force 1 April 2025: Micro ≤ ₹10 crore (investment ceiling ≤ ₹2.5 crore), Small ₹10–100 crore (investment ≤ ₹25 crore), Medium ₹100–200 crore and ₹200–500 crore (investment ≤ ₹125 crore), Large > ₹500 crore (outside MSME). The old ₹50–200 slice is remapped: ₹50–100 sits in Small and ₹100–200 in Medium. Udyam turnover excludes exports (S.O. 2119(E) as amended), so a heavy exporter can sit in a lower Udyam class than these gross bands. Unit share is not turnover share. Export-ready counts are not a TradeStat exporter census.",
    "mfi": "None typical for manufacturing. Namo Drone Didi uses SHGs for agricultural drone services, which is not this manufacturing row.",
    "lending": "Horizontal, for an eligible MSME: CGTMSE (a guarantee, not insurance), MUDRA, TReDS, SIDBI, and ECGC where the firm itself exports. Sector: PLI disbursement of about ₹98.32 crore was reported to Parliament. It is a closed incentive, not a loan. No cluster lending scheme.",
    "insurance": "DGCA third-party liability sits on the operator. Hull and product liability for the manufacturer are commercial. No penetration figure.",
    "vcpe": "Narrow and real at the top: a few manufacturers raised venture capital and ideaForge is listed. The component MSME on the 2022 list is not in that market."
  },
  {
    "id": "defence",
    "name": "Defence manufacturing (private)",
    "funded": "iDEX, April 2018 · positive indigenisation lists (five lists, more than 5,500 items) · licensing simplification · defence corridors in Uttar Pradesh and Tamil Nadu. Demonstration cluster: do not relaunch.",
    "participants": "About 16,000 MSMEs is an ecosystem description. Separately, 788 industrial licences to 462 companies. iDEX, February 2025: 619 startups and MSMEs and 430 contracts. These three populations are not added.",
    "participantKind": "Ecosystem MSME description, licence-holders, and iDEX participants — three units",
    "ancillaries": "Machining, fabrication and subsystem MSMEs that hold a DPSU or private-prime purchase order — not the 16 DPSUs and not an iDEX slide with no order",
    "activity": "Manufacturing",
    "geo": "Bengaluru, Hyderabad, Pune, and the Tamil Nadu and Uttar Pradesh corridors. Vendor density inside each is not published as one map.",
    "mode": "Hybrid",
    "icam": "Demo",
    "fit": 5,
    "why": "A thick described MSME vendor base in a few cities, with DPSU offtake. The demo already exists, so the form is an attachment.",
    "hs4": "No single heading. Chapter 93 understates the trade because subsystems and dual-use parts dominate. The operational definition is the export authorisation, not a customs heading.",
    "exportFy25": "₹23,622 crore in FY2024–25 (PIB, about USD 2.76 billion). Private sector ₹15,233 crore; DPSUs ₹8,389 crore.",
    "exportUnits": "1,762 export authorisations in FY2024–25, against 1,507 the year before. Authorisations are not exporters. The primary PIB says the exporter count grew 17.4% and does not state the headcount.",
    "turnover": "Official defence production ₹1,50,590 crore in FY2024–25 (PIB, 9 August 2025). A later speech says ₹1.54 lakh crore; this register uses ₹1,50,590 crore. DPSUs and other PSUs about 77%; private sector 23%. Production is not MSME turnover.",
    "turnSplit": "Exports ₹23,622 crore are 15.7% of production ₹1,50,590 crore. That is a production-to-export ratio for the whole industry, including DPSUs, not an MSME turnover split. Domestic share of that ratio is the residual 84%.",
    "employees": "n.p. for the vendor tier.",
    "vintage": "2018 (iDEX). Licensing liberalisation and the positive lists are the same late-2010s wave. The vendor population is older.",
    "large": "80",
    "expLarge": "Exporter headcount n.p. Authorisations in FY25 were 1,762, which is not this cell",
    "med200": "120",
    "expMed200": "n.p. — authorisations are not a turnover band",
    "med100": "300",
    "expMed100": "n.p.",
    "small": "3500",
    "micro": "12000",
    "bandPct": [
      0,
      1,
      2,
      22,
      75
    ],
    "bandNote": "Universe: the descriptive ~16,000 MSMEs, reconstructed into bands. It is not a licence census. The 462 licensed companies are a different population and sit conceptually in the upper bands without being forced to equal 462. Reconstructed gross-turnover counts, not a GSTN or MCA census. Aligned to Gazette S.O. 1364(E), 21 March 2025, in force 1 April 2025: Micro ≤ ₹10 crore (investment ceiling ≤ ₹2.5 crore), Small ₹10–100 crore (investment ≤ ₹25 crore), Medium ₹100–200 crore and ₹200–500 crore (investment ≤ ₹125 crore), Large > ₹500 crore (outside MSME). The old ₹50–200 slice is remapped: ₹50–100 sits in Small and ₹100–200 in Medium. Udyam turnover excludes exports (S.O. 2119(E) as amended), so a heavy exporter can sit in a lower Udyam class than these gross bands. Unit share is not turnover share. Export-ready counts are not a TradeStat exporter census.",
    "mfi": "None typical. A DPSU vendor’s buyer is a public enterprise. MFI, SHG and NABARD rural products do not match the contract.",
    "lending": "Horizontal, for an eligible MSME: CGTMSE (a guarantee, not insurance), MUDRA, TReDS, SIDBI, and ECGC where the firm itself exports. Sector: iDEX grants up to ₹1.5 crore; ADITI and TDF are grants, not working capital. ₹449.62 crore was allocated to iDEX including ADITI for 2025–26. Bank finance against a defence contract where the bank will lend.",
    "insurance": "ECGC for the exporter of record. Contractual transit and product covers. Milestone receivables are uninsured. No MSME-wide defence cover verified.",
    "vcpe": "Selective on startups with a contract. The iDEX grant is not venture capital. The machine shop on a DPSU order is a bank file."
  },
  {
    "id": "appliances",
    "name": "White goods (AC, LED) & furniture",
    "funded": "PLI White Goods, 2021, 84 companies, stated intended investment ₹10,478 crore. Demonstration cluster, with a Noida–Hapur annex. Furniture is the MSME twin in the same geography, not a second PLI.",
    "participants": "84 PLI White Goods companies. The Noida–Hapur annex is described at about 4,500 MSMEs. Those are the cohort. The 84 are not added to the 4,500.",
    "participantKind": "Annex MSMEs. PLI companies are a separate anchor list.",
    "ancillaries": "Sheet-metal, plastic, fan, LED-module and furniture job-workers selling to a brand — not the PLI principal",
    "activity": "Manufacturing",
    "geo": "Noida–Hapur annex, about 4,500 MSMEs. Other white-goods plants sit in the south and west and are not this annex.",
    "mode": "Traditional",
    "icam": "Demo",
    "fit": 5,
    "why": "A counted MSME annex, brand goods-receipt offtake, and an existing attachment point. Not a new park.",
    "hs4": "8415, 9403, 8539 and related. A single FY25 export line for this annex was not separated from engineering goods.",
    "exportFy25": "n.p. for the annex. Engineering goods USD 116.67 billion are too wide. Domestic brand offtake is the buyer.",
    "exportUnits": "n.a. as an annex exporter census. Brands export; job-workers mostly do not.",
    "turnover": "n.p. for the 4,500. PLI intended investment of ₹10,478 crore is capex of the 84 companies, not annex turnover.",
    "turnSplit": "Treat the annex as domestic. The buyer is the brand’s goods-receipt.",
    "employees": "n.p. for the annex.",
    "vintage": "2021 (PLI White Goods). The Noida–Hapur furniture and component belt is older; the annex is the delivery form.",
    "large": "25",
    "expLarge": "Domestic brand offtake — n.a. as exporters",
    "med200": "40",
    "expMed200": "n.a. as exporters",
    "med100": "120",
    "expMed100": "n.a. as exporters",
    "small": "1400",
    "micro": "2915",
    "bandPct": [
      0,
      1,
      3,
      31,
      65
    ],
    "bandNote": "Universe: the Noida–Hapur annex of about 4,500 MSMEs. The 84 PLI companies are not this pyramid. Reconstructed gross-turnover counts, not a GSTN or MCA census. Aligned to Gazette S.O. 1364(E), 21 March 2025, in force 1 April 2025: Micro ≤ ₹10 crore (investment ceiling ≤ ₹2.5 crore), Small ₹10–100 crore (investment ≤ ₹25 crore), Medium ₹100–200 crore and ₹200–500 crore (investment ≤ ₹125 crore), Large > ₹500 crore (outside MSME). The old ₹50–200 slice is remapped: ₹50–100 sits in Small and ₹100–200 in Medium. Udyam turnover excludes exports (S.O. 2119(E) as amended), so a heavy exporter can sit in a lower Udyam class than these gross bands. Unit share is not turnover share. Export-ready counts are not a TradeStat exporter census.",
    "mfi": "Thin. MUDRA reaches a micro furniture unit. A job-worker on a brand schedule needs a bank line. No sector MFI.",
    "lending": "Horizontal, for an eligible MSME: CGTMSE (a guarantee, not insurance), MUDRA, TReDS, SIDBI, and ECGC where the firm itself exports. Sector: PLI White Goods is the 84 companies’ incentive. TReDS if the brand onboards the job-worker. No annex-specific loan.",
    "insurance": "Fire and marine commercial. Brand GRN receivables are uninsured. Product liability sits with the brand. ECGC is the brand’s cover when the brand exports.",
    "vcpe": "Moderate on a few branded appliance companies. None on the furniture and sheet-metal MSME."
  },
  {
    "id": "food",
    "name": "Food processing (PLI wave)",
    "funded": "PLI food processing, approved 31 March 2021, outlay ₹10,900 crore · PMFME, outlay ₹10,000 crore · PM Kisan SAMPADA. Demonstration cluster: attach, do not open a second park.",
    "participants": "PLI food: 70 MSMEs directly enrolled and 40 contract manufacturers, inside a beneficiary sales figure that is mostly large firms. PMFME, 31 December 2025: 1,72,707 micro enterprises approved and 59,202 formalised. ASI 2022–23: 42,801 registered food-processing factories. These populations are not added.",
    "participantKind": "PLI beneficiaries, PMFME micro units, and ASI factories — three units",
    "ancillaries": "Micro units and FPOs supplying a processor, plus small packers in the demo belt — not the PLI champion and not the mega food park operator",
    "activity": "Manufacturing",
    "geo": "The demo belt, not all 726 ODOP districts. Registered factories in ASI 2022–23 concentrate in Andhra Pradesh (12.68%), Tamil Nadu (11.67%), Telangana (8.65%), Punjab (8.08%) and Maharashtra (6.59%). The attachment uses the belt the demo already chose.",
    "mode": "Traditional",
    "icam": "Demo",
    "fit": 5,
    "why": "The deepest micro tail in the register, with retail and quick-commerce offtake, and a demo already standing. The centre attaches.",
    "hs4": "Not one heading. NIC division 10. DGCIS cereal preparations were USD 3.1 billion in FY2024–25 and are only one slice. Do not use them as processed-food exports.",
    "exportFy25": "n.p. as a single FY2024–25 processed-food level in the MoFPI table consulted, which ends at USD 10,881.81 million of processed-food exports in FY2023–24. The FY25 share of processed food in agri-exports was stated at 20.4% without a level this register will back-calculate.",
    "exportUnits": "n.p. APEDA exporter registers are product-specific and are not the PMFME list.",
    "turnover": "GVA, which is not turnover, ₹2.24 lakh crore in 2023–24 (MoFPI; the annual-report table is at constant 2011–12 prices). PLI beneficiary sales ₹3,80,350 crore are scheme sales of approved firms, not micro turnover. PMFME evaluation: average beneficiary turnover about 1.7 times, with no baseline level.",
    "turnSplit": "n.p. for FY25. FY24 processed-food exports USD 10.88 billion sit inside agri-food exports of USD 46.44 billion in the MoFPI table. No FY25 percentage is computed.",
    "employees": "ASI FY2024–25 food factories: 23.61 lakh persons. ASI 2022–23 registered food processing was 22.96 lakh persons engaged. ASUSE 2022–23: 46.57 lakh workers in unincorporated food processing. Do not add the surveys. PMFME evaluation: more than 2.8 lakh opportunities, a scheme-impact estimate.",
    "vintage": "2020 PMFME; PLI approved 31 March 2021. The units are older than the schemes. This is a formalisation and incentive wave.",
    "large": "30",
    "expLarge": "Domestic retail and some export houses — exporter count n.p.",
    "med200": "50",
    "expMed200": "n.p.",
    "med100": "120",
    "expMed100": "n.p.",
    "small": "1500",
    "micro": "4300",
    "bandPct": [
      0,
      1,
      2,
      25,
      72
    ],
    "bandNote": "Universe: a reconstructed demo-belt cohort of about 6,000 units, not the national 1.73 lakh PMFME approvals and not the 42,801 ASI factories. National figures stay in the participant field. Reconstructed gross-turnover counts, not a GSTN or MCA census. Aligned to Gazette S.O. 1364(E), 21 March 2025, in force 1 April 2025: Micro ≤ ₹10 crore (investment ceiling ≤ ₹2.5 crore), Small ₹10–100 crore (investment ≤ ₹25 crore), Medium ₹100–200 crore and ₹200–500 crore (investment ≤ ₹125 crore), Large > ₹500 crore (outside MSME). The old ₹50–200 slice is remapped: ₹50–100 sits in Small and ₹100–200 in Medium. Udyam turnover excludes exports (S.O. 2119(E) as amended), so a heavy exporter can sit in a lower Udyam class than these gross bands. Unit share is not turnover share. Export-ready counts are not a TradeStat exporter census.",
    "mfi": "Active. PMFME is a credit-linked subsidy through banks. Seed capital reached 3,76,326 SHG members (₹1,282.99 crore) as on 31 December 2025. NABARD and the state rural livelihood missions are in the same districts. NBFC-MFIs are a parallel micro channel, not the scheme administrator.",
    "lending": "Horizontal, for an eligible MSME: CGTMSE (a guarantee, not insurance), MUDRA, TReDS, SIDBI, and ECGC where the firm itself exports. Sector: PMFME credit-linked subsidy. As on 30 June 2025, 1,44,517 loans sanctioned, amount ₹11,501.79 crore. PLI food is the large-firm incentive (investment reported ₹9,032 crore; sales ₹3,80,350 crore; employment 3,40,116 direct and indirect). Do not mix the two into one loan.",
    "insurance": "Product liability and stock once the unit leaves the kitchen. PMFBY covers the farmer, not the processor. Cold-chain and fire covers are commercial. Retail and quick-commerce receivables are uninsured. No PMFME-specific cover was identified.",
    "vcpe": "Moderate to deep on packaged-food brands and PLI companies. None on the micro unit. Brand deals are not access for the approved PMFME list."
  }
];


type FilterId = "all" | "new" | "fit45" | "icam" | "mfg" | "svc" | "both" | "digital" | "hybrid";

const FILTERS: { id: FilterId; label: string }[] = [
  { id: "all", label: "All 31" },
  { id: "new", label: "New cluster candidates" },
  { id: "fit45", label: "Fit 4–5" },
  { id: "icam", label: "Already in ICAM" },
  { id: "mfg", label: "Manufacturing" },
  { id: "svc", label: "Services" },
  { id: "both", label: "Both" },
  { id: "digital", label: "Digital" },
  { id: "hybrid", label: "Hybrid" },
];

function passes(row: Industry, filter: FilterId) {
  if (filter === "new") return row.icam === "New candidate";
  if (filter === "fit45") return row.fit >= 4;
  if (filter === "icam") return row.icam !== "New candidate";
  if (filter === "mfg") return row.activity === "Manufacturing";
  if (filter === "svc") return row.activity === "Services";
  if (filter === "both") return row.activity === "Both";
  if (filter === "digital") return row.mode === "Digital";
  if (filter === "hybrid") return row.mode === "Hybrid";
  return true;
}

export default function IndustryTypesAndClusters() {
  const [filter, setFilter] = useState<FilterId>("all");
  const [view, setView] = useState<"bands" | "split" | "finance" | "cluster">("bands");
  const [selectedId, setSelectedId] = useState("medtech");
  const rows = useMemo(() => INDUSTRIES.filter((row) => passes(row, filter)), [filter]);
  const selected = INDUSTRIES.find((row) => row.id === selectedId) ?? rows[0];
  const priority = INDUSTRIES.filter((row) => row.icam === "New candidate" && row.fit >= 4);

  return (
    <Stack gap={20}>
      <Stack gap={6}>
        <H1>Industry types and clusters</H1>
        <Text tone="secondary">
          Firm size, vintage and HS-4 exports for 31 industry types funded or newly gated between 2011 and 2026. Fit is the ICAM cluster-shape score. It is not the charter score.
        </Text>
      </Stack>
      <Grid columns={4} gap={12}>
        <Stat value="31" label="Industry types" />
        <Stat value="$437.4 bn" label="Merchandise exports, FY2024–25" />
        <Stat value="$4.02 bn" label="Medtech exports, FY2024–25" />
        <Stat value="$38.6 bn" label="Electronics goods exports, FY2024–25" />
      </Grid>
      <Callout tone="warning">
        Official series are named in each row. Size-band counts, export-ready counts and domestic residuals are reconstructed. Bands follow S.O. 1364(E) from 1 April 2025. Udyam turnover excludes exports, so a heavy exporter can sit in a lower Udyam class than these gross bands. Unit share is not turnover share. TradeStat publishes values, not exporter counts.
      </Callout>
      <H2>New candidates with fit 4 or 5</H2>
      <Text tone="secondary" size="small">
        These are the cluster-shaped new types. Demo and Phase II rows are excluded here even when their fit is high. Charter rank is a different canvas.
      </Text>
      <Table
        headers={["Type", "Fit", "Activity", "Vintage", "FY25 export", "Participants"]}
        columnAlign={["left", "right", "left", "left", "left", "left"]}
        rows={priority.map((row) => [row.name, String(row.fit), row.activity, row.vintage, row.exportFy25, row.participants])}
        striped
      />
      <H3>Unit share of reconstructed gross-turnover bands</H3>
      <Text tone="secondary" size="small">
        Share of units, not share of turnover. Source: reconstructed pyramids on this canvas, S.O. 1364(E) bands.
      </Text>
      <BarChart
        horizontal
        stacked
        normalized
        height={360}
        valueSuffix="%"
        categories={priority.map((row) => row.name)}
        series={[
          { name: "Large > ₹500 cr", data: priority.map((row) => row.bandPct[0]), tone: "info" },
          { name: "Medium ₹200–500 cr", data: priority.map((row) => row.bandPct[1]), tone: "neutral" },
          { name: "Medium ₹100–200 cr", data: priority.map((row) => row.bandPct[2]) },
          { name: "Small ₹10–100 cr", data: priority.map((row) => row.bandPct[3]), tone: "success" },
          { name: "Micro ≤ ₹10 cr", data: priority.map((row) => row.bandPct[4]), tone: "warning" },
        ]}
      />
      <Divider />
      <H2>Full register</H2>
      <Row gap={8} wrap>
        {FILTERS.map((item) => (
          <Pill key={item.id} active={filter === item.id} onClick={() => setFilter(item.id)}>
            {item.label}
          </Pill>
        ))}
      </Row>
      <Row gap={8} wrap>
        <Pill active={view === "bands"} onClick={() => setView("bands")}>MSME bands</Pill>
        <Pill active={view === "split"} onClick={() => setView("split")}>Domestic vs export</Pill>
        <Pill active={view === "finance"} onClick={() => setView("finance")}>MFI, lending, insurance, VC-PE</Pill>
        <Pill active={view === "cluster"} onClick={() => setView("cluster")}>Cluster fields</Pill>
      </Row>
      <Row gap={6} wrap>
        {rows.map((row) => (
          <Pill key={row.id} size="sm" active={selected?.id === row.id} onClick={() => setSelectedId(row.id)}>
            {row.name}
          </Pill>
        ))}
      </Row>
      {view === "bands" && (
        <Table
          headers={["Type", "Fit", "Large", "Med 200–500", "Med 100–200", "Small", "Micro"]}
          columnAlign={["left", "right", "right", "right", "right", "right", "right"]}
          rows={rows.map((row) => [row.name, String(row.fit), row.large, row.med200, row.med100, row.small, row.micro])}
          striped
          stickyHeader
        />
      )}
      {view === "split" && (
        <Table
          headers={["Type", "Turnover", "Domestic vs export", "FY25 export"]}
          rows={rows.map((row) => [row.name, row.turnover, row.turnSplit, row.exportFy25])}
          striped
          stickyHeader
        />
      )}
      {view === "finance" && (
        <Table
          headers={["Type", "MFI on Micro", "Lending", "Insurance", "VC / PE"]}
          rows={rows.map((row) => [row.name, row.mfi, row.lending, row.insurance, row.vcpe])}
          striped
          stickyHeader
        />
      )}
      {view === "cluster" && (
        <Table
          headers={["Type", "ICAM", "Activity", "Mode", "Geography", "Ancillaries"]}
          rows={rows.map((row) => [row.name, row.icam, row.activity, row.mode, row.geo, row.ancillaries])}
          striped
          stickyHeader
        />
      )}
      {selected && (
        <Stack gap={8}>
          <H2>{selected.name}</H2>
          <Text>{selected.why}</Text>
          <Table
            headers={["Field", "Value"]}
            rows={[
              ["Funded", selected.funded],
              ["Vintage", selected.vintage],
              ["Participants", selected.participants],
              ["What was counted", selected.participantKind],
              ["Activity", selected.activity],
              ["Mode", selected.mode],
              ["Geography", selected.geo],
              ["ICAM", selected.icam],
              ["Fit (cluster shape, 1–5)", String(selected.fit)],
              ["HS-4", selected.hs4],
              ["FY2024–25 export", selected.exportFy25],
              ["Exporting units", selected.exportUnits],
              ["Gross turnover", selected.turnover],
              ["Domestic vs export", selected.turnSplit],
              ["Employees", selected.employees],
              ["Large > ₹500 cr", selected.large],
              ["Export-ready in Large", selected.expLarge],
              ["Medium ₹200–500 cr", selected.med200],
              ["Export-ready in ₹200–500", selected.expMed200],
              ["Medium ₹100–200 cr", selected.med100],
              ["Export-ready in ₹100–200", selected.expMed100],
              ["Small ₹10–100 cr", selected.small],
              ["Micro ≤ ₹10 cr", selected.micro],
              ["MFI on Micro", selected.mfi],
              ["Lending", selected.lending],
              ["Insurance", selected.insurance],
              ["VC / PE", selected.vcpe],
              ["Ancillaries", selected.ancillaries],
              ["Band method", selected.bandNote],
            ]}
            striped
          />
        </Stack>
      )}
      <Text tone="tertiary" size="small">
        Closing rule: a centre needs a thick Micro and Small tail, visible offtake and a tight geography. Medtech, footwear, toys, e-waste and pack assembly clear that shape test as new candidates. Fabs, hydrogen plants and cell plants are anchors, not cohorts. Fit is not the charter rank.
      </Text>
    </Stack>
  );
}
