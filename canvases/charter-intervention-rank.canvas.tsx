import { useMemo, useState } from "cursor/canvas";
import { Callout, Divider, Grid, H1, H2, H3, Pill, Row, Stack, Stat, Table, Text } from "cursor/canvas";

type ToolKey =
  | "credit" | "rating" | "digital" | "policy"
  | "payment" | "odr" | "emi" | "outcomes"
  | "capital" | "schemes" | "lender" | "market"
  | "map" | "friction" | "scorecard" | "compliance";

type Tools = Record<ToolKey, number>;

type Raw = {
  id: string;
  name: string;
  icam: "Demo" | "Phase II" | "New candidate";
  delivery: number;
  add: number;
  problem: string;
  intervene: string;
  out: string;
  action: string;
  justify: string;
  sources: string;
  tools: Tools;
};

const TOOLS: { key: ToolKey; pillar: string; name: string; job: string }[] = [
  { key: "credit", pillar: "P1", name: "Credit Ki Kaksha", job: "Credit literacy, cash-flow management and documentation for lender assessment." },
  { key: "rating", pillar: "P1", name: "Rating Ki Kaksha", job: "Financial discipline, governance and rating-improvement clinics." },
  { key: "digital", pillar: "P1", name: "Digital Dost", job: "Application quality, document completion and follow-through." },
  { key: "policy", pillar: "P1", name: "Policy & program readiness", job: "Eligibility, documentation and voluntary registration for public programmes." },
  { key: "payment", pillar: "P2", name: "Cluster-led payment support", job: "Recurring delays, buyer friction and priority cases." },
  { key: "odr", pillar: "P2", name: "ODR recovery pathway", job: "Case preparation, mediation or conciliation, then the statutory route." },
  { key: "emi", pillar: "P2", name: "Business EMI protection", job: "Early-stage concept. Score the need to explore it, not a product launch." },
  { key: "outcomes", pillar: "P2", name: "Recovery & repayment outcomes", job: "Recovery days, case outcomes, recurring buyer friction and repayment continuity." },
  { key: "capital", pillar: "P3", name: "Capital pathways", job: "Working capital matched to the cash cycle; readiness for debt, equity, SME IPO or bonds." },
  { key: "schemes", pillar: "P3", name: "Policies & support", job: "Make central, state and sector support usable before an application is filed." },
  { key: "lender", pillar: "P3", name: "Lender pathways", job: "Enterprise readiness, then the right lender channel and product." },
  { key: "market", pillar: "P3", name: "Market access", job: "Buyer linkages and technology access that make revenue and creditworthiness visible." },
  { key: "map", pillar: "P4", name: "Cluster mapping", job: "Anchors, buyers, segments, technology gaps, cash cycles and shared constraints." },
  { key: "friction", pillar: "P4", name: "Readiness & friction research", job: "Where enterprises drop out of market, finance, payment and formalisation." },
  { key: "scorecard", pillar: "P4", name: "Scorecards & dashboards", job: "Capability, receivables, access, inclusion and growth outcomes." },
  { key: "compliance", pillar: "P4", name: "Compliance intelligence", job: "Registration and invoice-settlement disclosure, and the bottlenecks a statute does not remove." },
];

const P1: ToolKey[] = ["credit", "rating", "digital", "policy"];
const P2: ToolKey[] = ["payment", "odr", "emi", "outcomes"];
const P3: ToolKey[] = ["capital", "schemes", "lender", "market"];
const P4: ToolKey[] = ["map", "friction", "scorecard", "compliance"];
const FORCED = new Set(["fintech", "edtech", "cyber", "ghydrogen"]);

function mean(tools: Tools, keys: ToolKey[]) {
  return keys.reduce((sum, key) => sum + tools[key], 0) / 4;
}

function scoreAll(row: Raw) {
  const p1 = mean(row.tools, P1);
  const p2 = mean(row.tools, P2);
  const p3 = mean(row.tools, P3);
  const p4 = mean(row.tools, P4);
  const overall = p1 * 0.18 + p2 * 0.24 + p3 * 0.18 + p4 * 0.14 + row.delivery * 0.16 + row.add * 0.10;
  let tier = "Out of charter";
  if (!FORCED.has(row.id)) {
    if (overall >= 4) tier = "High";
    else if (overall >= 3) tier = "Medium";
    else if (overall >= 2) tier = "Watch";
  }
  const activate = TOOLS.filter((tool) => row.tools[tool.key] >= 4).map((tool) => tool.name);
  const later = TOOLS.filter((tool) => row.tools[tool.key] === 3).map((tool) => tool.name);
  const skip = TOOLS.filter((tool) => row.tools[tool.key] <= 2).map((tool) => tool.name);
  return { p1, p2, p3, p4, overall, tier, activate, later, skip };
}

const RAW: Raw[] = [
  {
    "id": "medtech",
    "name": "Medical devices",
    "icam": "New candidate",
    "delivery": 5,
    "add": 5,
    "problem": "Hospital, PSU and OEM payables run long, and most of the ~700 manufacturers fail CDSCO, BIS and lender files.",
    "intervene": "Year 1, at one park spoke: Credit Kaksha, Rating Kaksha, Digital Dost and programme files on CDSCO/BIS/lender packs; a payment cell and ODR case-prep on hospital and PSU invoices; capital and lender route after the file exists; GeM and hospital-chain linkage; map the 4,000 sites against the 700 manufacturers; compliance intel on CDSCO. EMI is explored, not sold.",
    "out": "Do not finance park buildings, run the PLI plant, or become a notified body.",
    "action": "Year-1 Capability Centre — first new cluster",
    "tools": {
      "credit": 5,
      "rating": 5,
      "digital": 5,
      "policy": 5,
      "payment": 5,
      "odr": 5,
      "emi": 4,
      "outcomes": 5,
      "capital": 5,
      "schemes": 5,
      "lender": 5,
      "market": 5,
      "map": 5,
      "friction": 4,
      "scorecard": 3,
      "compliance": 5
    },
    "sources": "CII/IBEF: ~700 manufacturers, ~90% MSME, market ₹1.02 lakh crore FY24. Department of Pharmaceuticals / DGCIS: medtech exports USD 4.02 billion FY25; CDSCO licensed manufacturers about 4,108 and no central production census. PLI MedTech: 28 applicants, outlay ₹3,420 crore. Brochure, 17 October 2026.",
    "justify": "P1 5.00 — credit 5 Activate, rating 5 Activate, digital 5 Activate, policy 5 Activate. CII’s MSME share plus CDSCO and BIS gates make every readiness tool a year-1 file, not a poster. P2 4.75 — payment 5 Activate, odr 5 Activate, emi 4 Activate, outcomes 5 Activate. Hospital, PSU and OEM payables are the brochure receivables case. EMI is 4 because formal bank EMIs already sit on those invoices; it is a concept to explore, not a product. P3 5.00 — capital 5 Activate, schemes 5 Activate, lender 5 Activate, market 5 Activate. Park allotment, PLI and GeM pathways exist and are hard to use. ECGC covers HS 90 exporters. The MSME ring does not see device-company private equity. P4 4.25 — map 5 Activate, friction 4 Activate, scorecard 3 Later, compliance 5 Activate. About 4,000 licensed sites versus about 700 manufacturers is an unmapped registry. Compliance intel leads. The scorecard stays Later until the spoke cohort is opted in. Delivery 5 — Parks already exist at Vizag, Greater Noida and Kanchipuram, so a desk can attach in year 1. Additionality 5 — Parks and PLI do not run Kaksha or ODR. That is the gap."
  },
  {
    "id": "semi",
    "name": "Semiconductors & OSAT ancillaries",
    "icam": "New candidate",
    "delivery": 2,
    "add": 2,
    "problem": "There is no MSME invoice book to repair until a fab offtakes; the register of ancillaries does not exist.",
    "intervene": "This year, only a map of possible ancillaries around Sanand and Dholera and a friction note on who cannot yet sell. Do not staff Kaksha or ODR.",
    "out": "Do not build a fab, staff a plant, or treat design-linked winners as a cluster.",
    "action": "Watch — mapping and friction only",
    "tools": {
      "credit": 3,
      "rating": 2,
      "digital": 3,
      "policy": 3,
      "payment": 2,
      "odr": 2,
      "emi": 2,
      "outcomes": 2,
      "capital": 2,
      "schemes": 2,
      "lender": 2,
      "market": 2,
      "map": 5,
      "friction": 4,
      "scorecard": 2,
      "compliance": 3
    },
    "sources": "MeitY, September 2025: 1 fab, 8 OSAT/ATMP, 1 compound fab, 23 design-linked applicants. ISM: 10 plants, six states, about ₹1.6 lakh crore committed capex. Brochure, 17 October 2026.",
    "justify": "P1 2.75 — credit 3 Later, rating 2 Skip, digital 3 Later, policy 3 Later. Any future ancillary will need files, but there is no thick tail to teach this year, so readiness stays Later or Skip. P2 2.00 — payment 2 Skip, odr 2 Skip, emi 2 Skip, outcomes 2 Skip. No recurring MSME buyer delay to staff. All four receivables tools Skip. P3 2.00 — capital 2 Skip, schemes 2 Skip, lender 2 Skip, market 2 Skip. ISM money is on the plant. It is not a scheme-usability job for a ring that is not selling. P4 3.50 — map 5 Activate, friction 4 Activate, scorecard 2 Skip, compliance 3 Later. Mapping and friction research are the only Activate tools, until the first fab offtake names a vendor list. A scorecard would be empty. Delivery 2 — No MSME offtake and no belt that can hold a centre. Additionality 2 — ISM and the state industrial corporations already run the plant interface."
  },
  {
    "id": "toys",
    "name": "Toys (modern + GI/artisan)",
    "icam": "New candidate",
    "delivery": 4,
    "add": 5,
    "problem": "BIS files stop small units selling, and brand or marketplace payments are slow where an invoice exists.",
    "intervene": "If a sixth slot is funded: Digital Dost and programme files for BIS, compliance intel, Credit Kaksha on the micro tail, and a payment cell only for formal brand invoices. Do not open another toy park.",
    "out": "Do not relaunch SFURTI as a new park or staff a tool room the ministry already funds.",
    "action": "High-need reserve — not year-1 unless a sixth slot",
    "tools": {
      "credit": 5,
      "rating": 3,
      "digital": 5,
      "policy": 5,
      "payment": 4,
      "odr": 4,
      "emi": 3,
      "outcomes": 4,
      "capital": 3,
      "schemes": 4,
      "lender": 3,
      "market": 4,
      "map": 4,
      "friction": 5,
      "scorecard": 3,
      "compliance": 5
    },
    "sources": "DGCIS: HS 9503 USD 169.46 million and chapter 95 USD 570.95 million, FY25. DPIIT: QCO from 1 January 2021, 21,000+ Udyam MSMEs, 1,800+ BIS licences, 19 SFURTI clusters. Brochure, 17 October 2026.",
    "justify": "P1 4.50 — credit 5 Activate, rating 3 Later, digital 5 Activate, policy 5 Activate. The QCO is a documented file failure, so Credit Kaksha, Digital Dost and programme files Activate. Rating Kaksha is Later: many units are still informal. P2 3.75 — payment 4 Activate, odr 4 Activate, emi 3 Later, outcomes 4 Activate. Brand and marketplace delays are real where the invoice is formal, so the payment cell and ODR Activate. EMI is Later: bank EMIs are not yet the typical stress on an artisan spoke. P3 3.50 — capital 3 Later, schemes 4 Activate, lender 3 Later, market 4 Activate. Scheme usability is the BIS and SFURTI file, not a missing PLI. Lender route is Later until the file exists. Buyer linkage to organised retail is Activate. P4 4.25 — map 4 Activate, friction 5 Activate, scorecard 3 Later, compliance 5 Activate. Friction research on who the QCO shut, and compliance intel, are the lead. The scorecard waits for an opted-in Koppal-plus-spoke cohort. Delivery 4 — Koppal plus SFURTI spokes can host a hub-and-spoke desk. It is not already built. Additionality 5 — Nineteen SFURTI clusters do not run Kaksha or a payment cell. A second park would add nothing."
  },
  {
    "id": "footwear",
    "name": "Footwear (non-leather + sports)",
    "icam": "New candidate",
    "delivery": 5,
    "add": 5,
    "problem": "Brand and export-house goods-receipt delays, and credit-linked footwear files that die at bank sanction.",
    "intervene": "Year-1 centre in Ambur–Ranipet or Agra: programme files and Digital Dost so the footwear scheme reaches sanction; Credit Kaksha and Rating Kaksha; payment cell and ODR on brand invoices; lender route after the file; ECGC where the unit exports.",
    "out": "Do not build a footwear park or route units to a preferred lender.",
    "action": "Year-1 Capability Centre",
    "tools": {
      "credit": 5,
      "rating": 4,
      "digital": 5,
      "policy": 5,
      "payment": 5,
      "odr": 5,
      "emi": 4,
      "outcomes": 5,
      "capital": 5,
      "schemes": 5,
      "lender": 5,
      "market": 4,
      "map": 4,
      "friction": 5,
      "scorecard": 4,
      "compliance": 4
    },
    "sources": "CLE/IBEF: about 15,000 footwear units, 2,868 CLE members, sector turnover about ₹1.62 lakh crore, exports ₹48,667 crore, about 42 lakh workers, FY25 basket. BIS footwear quality orders from 2020–21. Brochure, 17 October 2026.",
    "justify": "P1 4.75 — credit 5 Activate, rating 4 Activate, digital 5 Activate, policy 5 Activate. The sanction file is the failure mode, so Credit Kaksha, Digital Dost and programme files are 5. Rating Kaksha is 4 because units that already bill a brand have books worth a clinic. P2 4.75 — payment 5 Activate, odr 5 Activate, emi 4 Activate, outcomes 5 Activate. Brand and export-house GRN delays are formal enough for a payment cell and ODR. EMI is 4: explore it where a bank EMI already sits on those invoices. P3 4.75 — capital 5 Activate, schemes 5 Activate, lender 5 Activate, market 4 Activate. Scheme usability and the lender route are as important as ODR, because the credit-linked scheme dies at sanction. Market access is 4, not 5: CLE already convenes buyers. P4 4.25 — map 4 Activate, friction 5 Activate, scorecard 4 Activate, compliance 4 Activate. Friction research on the sanction wall is Activate. The belt is known, so mapping is 4 rather than a blank-sheet 5. Delivery 5 — Ambur–Ranipet and Agra are existing factory belts a desk can enter in year 1. Additionality 5 — CLE and IFLADP do not run ODR or a sanction clinic."
  },
  {
    "id": "battery",
    "name": "ACC pack, BMS & recycling",
    "icam": "New candidate",
    "delivery": 4,
    "add": 5,
    "problem": "OEM goods-receipt cycles strand working capital in the pack and BMS shop, and the ring around the cell plants is unmapped.",
    "intervene": "New centre on the MSME ring only: map pack, BMS and authorised recyclers; payment cell and ODR on OEM GRNs; working capital matched to the cell-to-pack cycle; Credit Kaksha once the buyer is named.",
    "out": "Do not run a PLI-ACC plant or treat the four beneficiaries as the cohort.",
    "action": "Year-1 Capability Centre",
    "tools": {
      "credit": 4,
      "rating": 4,
      "digital": 4,
      "policy": 4,
      "payment": 5,
      "odr": 5,
      "emi": 4,
      "outcomes": 5,
      "capital": 5,
      "schemes": 4,
      "lender": 4,
      "market": 4,
      "map": 5,
      "friction": 5,
      "scorecard": 4,
      "compliance": 3
    },
    "sources": "PLI-ACC awards, 2021, a small set of gigafactory beneficiaries. HS 8507 is the wrong export line (mostly lead-acid). Brochure, 17 October 2026. Motor-vehicle ASI employment is 14.80 lakh and is not this ring.",
    "justify": "P1 4.00 — credit 4 Activate, rating 4 Activate, digital 4 Activate, policy 4 Activate. The ring is formal enough for all four readiness tools at 4, once a buyer code exists. It is not a nano cohort. P2 4.75 — payment 5 Activate, odr 5 Activate, emi 4 Activate, outcomes 5 Activate. OEM GRN delay is the cash cycle. Payment cell, ODR and outcome tracking Activate. EMI is 4 because those shops already service bank EMIs against the same receipts. P3 4.25 — capital 5 Activate, schemes 4 Activate, lender 4 Activate, market 4 Activate. Working capital mismatched to cell-to-pack inventory is the capital pathway. PLI-ACC is the anchor’s scheme, so scheme usability is 4, not a claim that Catalyst runs PLI. P4 4.25 — map 5 Activate, friction 5 Activate, scorecard 4 Activate, compliance 3 Later. Mapping the ring, and the friction of who never gets a vendor code, are 5. Compliance on waste and transport rules is Later relative to the cash cycle. Delivery 4 — The OEM belts are real. The centre itself is new, so delivery is 4 not 5. Additionality 5 — Nobody runs Kaksha or ODR on pack MSMEs. The PLI programme runs the plants."
  },
  {
    "id": "ewaste",
    "name": "E-waste & circular electronics",
    "icam": "New candidate",
    "delivery": 3,
    "add": 5,
    "problem": "Units cannot invoice a brand until they hold a CPCB authorisation, so there is no formal receivable to recover.",
    "intervene": "Map Seelampur and Moradabad. Digital Dost and compliance intel on the CPCB file. Programme files and a buyer link to an authorised channel. Skip ODR and EMI until an invoice exists.",
    "out": "Do not run an EPR exchange or set up as a recycler.",
    "action": "Next mapping / Phase II wave",
    "tools": {
      "credit": 4,
      "rating": 2,
      "digital": 5,
      "policy": 4,
      "payment": 3,
      "odr": 2,
      "emi": 1,
      "outcomes": 3,
      "capital": 3,
      "schemes": 4,
      "lender": 3,
      "market": 4,
      "map": 5,
      "friction": 5,
      "scorecard": 3,
      "compliance": 5
    },
    "sources": "E-Waste (Management) Rules, 2022. Informal concentration in Seelampur and Moradabad is the cluster geography used by CPCB and state boards; a public unit census was not used. Brochure, 17 October 2026.",
    "justify": "P1 3.75 — credit 4 Activate, rating 2 Skip, digital 5 Activate, policy 4 Activate. Digital Dost and programme files Activate because the authorisation file is the drop-off. Rating Kaksha Skips: books are not there yet. Credit Kaksha is 4 for the micro tail that already uses informal credit. P2 2.25 — payment 3 Later, odr 2 Skip, emi 1 Skip, outcomes 3 Later. Payment support is Later. ODR Skips and EMI Skips until the unit is formal and an invoice exists. P3 3.50 — capital 3 Later, schemes 4 Activate, lender 3 Later, market 4 Activate. Scheme usability is the EPR and authorisation route. Market access is the link to an authorised recycler or brand channel. Capital and lender routes wait on the file. P4 4.50 — map 5 Activate, friction 5 Activate, scorecard 3 Later, compliance 5 Activate. Mapping, friction research and CPCB compliance intel are the year-1 tools if this wave is staffed. The scorecard is Later. Delivery 3 — Formalisation has to come before a centre can hold a cohort. Delivery is 3. Additionality 5 — Nobody else runs a file clinic on the informal lane. Brand EPR portals do not."
  },
  {
    "id": "dc-ancillary",
    "name": "Data-centre ancillaries",
    "icam": "New candidate",
    "delivery": 3,
    "add": 3,
    "problem": "Operator retention and milestone payments, once a vendor invoice exists, with no map of who the vendors are.",
    "intervene": "Later wave: map vendors around one campus cluster and open a payment cell only where invoices are formal. Do not staff a centre in year 1.",
    "out": "Do not develop a data-centre park or raise infrastructure capital.",
    "action": "Next mapping / Phase II wave",
    "tools": {
      "credit": 3,
      "rating": 3,
      "digital": 3,
      "policy": 3,
      "payment": 4,
      "odr": 3,
      "emi": 3,
      "outcomes": 3,
      "capital": 4,
      "schemes": 3,
      "lender": 3,
      "market": 3,
      "map": 4,
      "friction": 3,
      "scorecard": 3,
      "compliance": 3
    },
    "sources": "State data-centre policies from 2020 onward. No official vendor census. Campus capex is not sales. Brochure, 17 October 2026.",
    "justify": "P1 3.00 — credit 3 Later, rating 3 Later, digital 3 Later, policy 3 Later. Readiness tools are Later. The ring is not yet listed, so a classroom has no roll. P2 3.25 — payment 4 Activate, odr 3 Later, emi 3 Later, outcomes 3 Later. The payment cell is Activate where a formal vendor invoice is stuck in operator retention. ODR and EMI are Later until that invoice is the norm. P3 3.25 — capital 4 Activate, schemes 3 Later, lender 3 Later, market 3 Later. Working capital against retention is the capital need. There is no sector scheme to make usable. P4 3.25 — map 4 Activate, friction 3 Later, scorecard 3 Later, compliance 3 Later. Mapping is the only strong research tool. A scorecard before the map would invent a cohort. Delivery 3 — A spoke beside one campus is possible after the map. It is not year-1. Additionality 3 — Operators already qualify their vendors. Cash-flow work would be new, but only after the list exists."
  },
  {
    "id": "charging",
    "name": "EV charging infrastructure",
    "icam": "New candidate",
    "delivery": 3,
    "add": 4,
    "problem": "Small assemblers and electricians wait on charge-point operators, and the PM E-DRIVE file does not reach them.",
    "intervene": "Next wave, not year 1: map one assembly belt, Credit Kaksha and programme files for the installer, payment cell on CPO invoices, lender route after the file.",
    "out": "Do not become a charge-point operator or allocate DISCOM sites.",
    "action": "Next mapping / Phase II wave",
    "tools": {
      "credit": 4,
      "rating": 3,
      "digital": 4,
      "policy": 4,
      "payment": 4,
      "odr": 3,
      "emi": 3,
      "outcomes": 3,
      "capital": 4,
      "schemes": 4,
      "lender": 4,
      "market": 4,
      "map": 4,
      "friction": 4,
      "scorecard": 3,
      "compliance": 3
    },
    "sources": "PM E-DRIVE guidelines, 30 September 2024, outlay ₹10,900 crore. FAME-II charging allocation ₹912.50 crore; charging described as unlicensed. Brochure, 17 October 2026.",
    "justify": "P1 3.75 — credit 4 Activate, rating 3 Later, digital 4 Activate, policy 4 Activate. Credit Kaksha, Digital Dost and programme files Activate for the installer who cannot complete a subsidy or vendor file. Rating is Later. P2 3.25 — payment 4 Activate, odr 3 Later, emi 3 Later, outcomes 3 Later. CPO payment delays justify a payment cell. ODR and EMI are Later until invoices are formal and bank EMIs are common. P3 4.00 — capital 4 Activate, schemes 4 Activate, lender 4 Activate, market 4 Activate. All four capital and market tools are 4: the scheme exists, the bank product is ordinary MSME credit, and the CPO is a named buyer. P4 3.50 — map 4 Activate, friction 4 Activate, scorecard 3 Later, compliance 3 Later. The installer ring is unmapped, and the drop-off is the programme file. Scorecard and a heavy compliance tool are Later. Delivery 3 — Pan-India installs mean the centre has to pick one belt first. Delivery is 3. Additionality 4 — The subsidy programme does not run a payment cell for the electrician."
  },
  {
    "id": "techtex",
    "name": "Technical textiles & MMF",
    "icam": "New candidate",
    "delivery": 4,
    "add": 4,
    "problem": "Converters fail buyer specifications and QCOs, and wait on auto, medical and defence invoices, while the firm list is still mixed up with commodity mills.",
    "intervene": "Next wave: map who actually makes technical textiles in one town, then Credit Kaksha, Rating Kaksha, a payment cell and compliance intel on the QCO. Do not send a powerloom into PLI.",
    "out": "Do not run an R&D project the textile research associations already own, or relaunch the apparel demo.",
    "action": "Next mapping / Phase II wave",
    "tools": {
      "credit": 4,
      "rating": 4,
      "digital": 3,
      "policy": 4,
      "payment": 4,
      "odr": 4,
      "emi": 3,
      "outcomes": 3,
      "capital": 4,
      "schemes": 3,
      "lender": 3,
      "market": 4,
      "map": 5,
      "friction": 4,
      "scorecard": 3,
      "compliance": 4
    },
    "sources": "Ministry of Textiles: NTTM 2020, ₹1,480 crore; technical-textile exports ₹24,732.68 crore in FY25; 24 GREAT startups; 8 QCOs on 68 items. PLI Textiles, 24 September 2021, ₹10,683 crore, 30 companies commenced production. ASI FY25 textile factories 17.57 lakh persons. Brochure, 17 October 2026.",
    "justify": "P1 3.75 — credit 4 Activate, rating 4 Activate, digital 3 Later, policy 4 Activate. Credit and rating clinics fit a mill that already has books. Programme files Activate so units are not pointed at PLI or GREAT by mistake. Digital Dost is Later. P2 3.50 — payment 4 Activate, odr 4 Activate, emi 3 Later, outcomes 3 Later. Buyer invoices in auto and medical supply are formal enough for a payment cell and ODR. EMI and outcome tracking are Later until the cohort is separated from commodity trade. P3 3.50 — capital 4 Activate, schemes 3 Later, lender 3 Later, market 4 Activate. Working capital and a buyer link Activate. The live schemes are the wrong window for a small converter, so scheme usability is Later. P4 4.00 — map 5 Activate, friction 4 Activate, scorecard 3 Later, compliance 4 Activate. Mapping is 5 because the export number does not name the firms. QCO compliance intel is Activate. The scorecard waits. Delivery 4 — Surat, Panipat or Coimbatore can host a desk once the cohort is cut. Delivery is 4. Additionality 4 — NTTM and the research associations own R&D and testing. They do not own the receivable."
  },
  {
    "id": "space",
    "name": "Space components & small-sat",
    "icam": "New candidate",
    "delivery": 2,
    "add": 2,
    "problem": "Component shops do not yet have a private offtake list, so there is no invoice cohort.",
    "intervene": "Map Bengaluru and Hyderabad job-shops that already machine for ISRO. Stop there this year.",
    "out": "Do not bid a satellite, seek an IN-SPACe authorisation for the centre, or use HS 8802 as evidence.",
    "action": "Watch — mapping and friction only",
    "tools": {
      "credit": 3,
      "rating": 2,
      "digital": 3,
      "policy": 3,
      "payment": 2,
      "odr": 2,
      "emi": 2,
      "outcomes": 2,
      "capital": 3,
      "schemes": 3,
      "lender": 2,
      "market": 2,
      "map": 5,
      "friction": 4,
      "scorecard": 2,
      "compliance": 3
    },
    "sources": "IN-SPACe established 2020. HS 8802 is aircraft and is the wrong line (DGCIS quarterly reviews list 8802 among top headings for other reasons). Brochure, 17 October 2026.",
    "justify": "P1 2.75 — credit 3 Later, rating 2 Skip, digital 3 Later, policy 3 Later. Files will matter later. There is no thick tail, so readiness stays Later or Skip. P2 2.00 — payment 2 Skip, odr 2 Skip, emi 2 Skip, outcomes 2 Skip. ISRO milestones are not an MSME receivable book the centre can staff. Receivables tools Skip. P3 2.50 — capital 3 Later, schemes 3 Later, lender 2 Skip, market 2 Skip. IN-SPACe is a gate for the prime, not a scheme for the shop. Capital and scheme tools stay Later; lender and market Skip. P4 3.50 — map 5 Activate, friction 4 Activate, scorecard 2 Skip, compliance 3 Later. Only mapping and friction Activate, to see whether a vendor ring exists before anyone promises a centre. Delivery 2 — No MSME offtake large enough for a year-1 desk. Additionality 2 — ISRO vendor development and IN-SPACe already occupy the official door."
  },
  {
    "id": "ghydrogen",
    "name": "Green hydrogen ancillaries",
    "icam": "New candidate",
    "delivery": 1,
    "add": 1,
    "problem": "There is no MSME invoice or file cohort. The mission funds plants.",
    "intervene": "None in year 1. An optional one-page map of announced plants is the most the charter allows.",
    "out": "Do not open a centre, staff an electrolyser plant, or treat the sponsor as an anchor for a cohort that does not exist.",
    "action": "Out of cluster charter — anchor, not cohort",
    "tools": {
      "credit": 2,
      "rating": 2,
      "digital": 2,
      "policy": 2,
      "payment": 2,
      "odr": 1,
      "emi": 1,
      "outcomes": 2,
      "capital": 2,
      "schemes": 2,
      "lender": 2,
      "market": 2,
      "map": 3,
      "friction": 3,
      "scorecard": 2,
      "compliance": 2
    },
    "sources": "National Green Hydrogen Mission, 2023. No MSME vendor census in the releases used. Brochure, 17 October 2026.",
    "justify": "P1 2.00 — credit 2 Skip, rating 2 Skip, digital 2 Skip, policy 2 Skip. No micro or small tail to teach. Readiness tools Skip. P2 1.50 — payment 2 Skip, odr 1 Skip, emi 1 Skip, outcomes 2 Skip. No MSME receivable. ODR and EMI Skip. P3 2.00 — capital 2 Skip, schemes 2 Skip, lender 2 Skip, market 2 Skip. Capital pathways belong to the sponsor. They are out of the charter for a centre. P4 2.50 — map 3 Later, friction 3 Later, scorecard 2 Skip, compliance 2 Skip. A map of plants could be done later as a one-pager. It is not staffed. Friction research has nothing to drop out of yet. Delivery 1 — No cluster vehicle. Additionality 1 — The mission and the sponsors are the programme. Catalyst would add a second announcement, not a tool."
  },
  {
    "id": "ethanol",
    "name": "Ethanol, biofuels & SAF feedstock",
    "icam": "New candidate",
    "delivery": 3,
    "add": 3,
    "problem": "FPO and collection units drop out of feedstock supply because the aggregation file and the payment from the plant are weak.",
    "intervene": "Not year 1. In one belt: Credit Kaksha and NABARD or FPO scheme files, then a buyer link to the distillery. Skip ODR until invoices are formal.",
    "out": "Do not finance a distillery or run the blending programme.",
    "action": "Next mapping / Phase II wave",
    "tools": {
      "credit": 4,
      "rating": 3,
      "digital": 3,
      "policy": 4,
      "payment": 3,
      "odr": 2,
      "emi": 2,
      "outcomes": 3,
      "capital": 4,
      "schemes": 4,
      "lender": 4,
      "market": 4,
      "map": 4,
      "friction": 4,
      "scorecard": 3,
      "compliance": 3
    },
    "sources": "National Policy on Biofuels, 2018, and the ethanol blending programme. HS 2207 is not the offtake. NABARD and AIF are the micro channels. Brochure, 17 October 2026.",
    "justify": "P1 3.50 — credit 4 Activate, rating 3 Later, digital 3 Later, policy 4 Activate. Credit Kaksha and programme files Activate because FPO paperwork is the drop-off. Rating and Digital Dost are Later. P2 2.50 — payment 3 Later, odr 2 Skip, emi 2 Skip, outcomes 3 Later. Payment from the plant is a Later watch. ODR and EMI Skip: many collection relationships are not formal invoices with a bank EMI underneath. P3 4.00 — capital 4 Activate, schemes 4 Activate, lender 4 Activate, market 4 Activate. NABARD, FPO credit and AIF are real products a centre could make usable, and the distillery is a named buyer. All four P3 tools are 4. P4 3.50 — map 4 Activate, friction 4 Activate, scorecard 3 Later, compliance 3 Later. The collection ring is unmapped at belt level. Scorecard and a compliance clinic are Later. Delivery 3 — A belt has to be chosen. National blending is not a site. Delivery is 3. Additionality 3 — OMCs and NABARD already have schemes. A centre would only add file completion, and only in one belt."
  },
  {
    "id": "nutra",
    "name": "Nutraceuticals & AYUSH manufacturing",
    "icam": "New candidate",
    "delivery": 4,
    "add": 3,
    "problem": "FSSAI and AYUSH files fail, and brand or export-house payments follow only after the licence is current.",
    "intervene": "Next wave, not the year-1 five: Digital Dost and compliance intel on the two licences, then a payment cell on brand invoices in one belt (Baddi or Gujarat).",
    "out": "Do not double-count medical-device exports or open a second pharma cluster.",
    "action": "Next mapping / Phase II wave",
    "tools": {
      "credit": 4,
      "rating": 4,
      "digital": 5,
      "policy": 5,
      "payment": 4,
      "odr": 4,
      "emi": 3,
      "outcomes": 4,
      "capital": 4,
      "schemes": 4,
      "lender": 4,
      "market": 4,
      "map": 4,
      "friction": 4,
      "scorecard": 3,
      "compliance": 5
    },
    "sources": "Pharmexcil, 14 June 2025: AYUSH and herbals USD 688.89 million. Drugs and pharmaceuticals exports USD 30.47 billion are a different basket. ASI FY25 pharma factories 10.92 lakh persons, parent industry only. Brochure, 17 October 2026.",
    "justify": "P1 4.50 — credit 4 Activate, rating 4 Activate, digital 5 Activate, policy 5 Activate. Digital Dost and programme files are 5 because applications die on FSSAI and AYUSH completeness. Credit and rating clinics are 4 for licensed units that already have books. P2 3.75 — payment 4 Activate, odr 4 Activate, emi 3 Later, outcomes 4 Activate. Brand invoices are formal enough for a payment cell, ODR and outcome tracking. EMI is Later until those EMIs are shown to sit on the same invoices. P3 4.00 — capital 4 Activate, schemes 4 Activate, lender 4 Activate, market 4 Activate. Scheme, lender and buyer tools are all usable once the licence is current. Private equity is on the brand, so the MSME packer still needs the bank route. P4 4.00 — map 4 Activate, friction 4 Activate, scorecard 3 Later, compliance 5 Activate. Compliance intel is the lead. Mapping is 4 because the belts are known but the two licence lists are not joined. The scorecard is Later. Delivery 4 — Baddi, Uttarakhand or a Gujarat belt can hold a desk. Delivery is 4. Additionality 3 — Regulators and Pharmexcil already exist. Additionality is 3: the centre only wins if it completes files they do not complete."
  },
  {
    "id": "agritech",
    "name": "Agri-tech & farm machinery digital",
    "icam": "New candidate",
    "delivery": 3,
    "add": 3,
    "problem": "Custom-hiring and small fabricators fall out of state mechanisation files, and startup turnover is mistaken for machinery exports.",
    "intervene": "Not year 1. In one machinery belt: programme files and Credit Kaksha for custom-hiring units, and a buyer link to the state scheme. Skip ODR.",
    "out": "Do not quote HS 8432 exports as agri-tech revenue or fund a tractor OEM.",
    "action": "Next mapping / Phase II wave",
    "tools": {
      "credit": 4,
      "rating": 3,
      "digital": 4,
      "policy": 4,
      "payment": 3,
      "odr": 2,
      "emi": 2,
      "outcomes": 3,
      "capital": 3,
      "schemes": 4,
      "lender": 3,
      "market": 4,
      "map": 4,
      "friction": 4,
      "scorecard": 3,
      "compliance": 3
    },
    "sources": "AgriSURE is equity or blended capital, not an MFI loan. Farm-machinery headings 8432 and 8433 are excluded from this cohort’s export. Brochure, 17 October 2026.",
    "justify": "P1 3.75 — credit 4 Activate, rating 3 Later, digital 4 Activate, policy 4 Activate. Credit Kaksha, Digital Dost and programme files Activate for the custom-hiring file. Rating is Later. P2 2.50 — payment 3 Later, odr 2 Skip, emi 2 Skip, outcomes 3 Later. Payment friction is Later. ODR and EMI Skip because many hires are not formal enough, and bank EMIs are not the documented stress. P3 3.50 — capital 3 Later, schemes 4 Activate, lender 3 Later, market 4 Activate. Scheme usability and a state or FPO buyer link are 4. The lender route waits on the file. Venture capital is on the startup, not the fabricator. P4 3.50 — map 4 Activate, friction 4 Activate, scorecard 3 Later, compliance 3 Later. Mapping has to separate certificates from factories before any scorecard. Friction research on scheme drop-off is Activate. Delivery 3 — A belt can be chosen, but the digital layer is not a place. Delivery is 3. Additionality 3 — State mechanisation missions and NABARD already fund the asset. The file clinic is the only add."
  },
  {
    "id": "avgc",
    "name": "AVGC-XR",
    "icam": "New candidate",
    "delivery": 2,
    "add": 2,
    "problem": "Small studios wait on publisher payments, but the work is not a physical cluster and invoices are often informal.",
    "intervene": "Map only. Do not open a studio campus or a training college.",
    "out": "Do not become a delivery college or a production house.",
    "action": "Watch — mapping and friction only",
    "tools": {
      "credit": 3,
      "rating": 2,
      "digital": 3,
      "policy": 2,
      "payment": 3,
      "odr": 2,
      "emi": 2,
      "outcomes": 2,
      "capital": 2,
      "schemes": 2,
      "lender": 2,
      "market": 3,
      "map": 4,
      "friction": 4,
      "scorecard": 2,
      "compliance": 2
    },
    "sources": "AVGC task force, 2022. Services exports USD 383.51 billion, PIB FY25, are the parent account, not this cohort. No HSN. Brochure, 17 October 2026.",
    "justify": "P1 2.50 — credit 3 Later, rating 2 Skip, digital 3 Later, policy 2 Skip. Readiness is Later at best. There is no public-programme file that is the bottleneck for the bench. P2 2.25 — payment 3 Later, odr 2 Skip, emi 2 Skip, outcomes 2 Skip. Payment delay is Later. ODR and EMI Skip because many engagements have no formal invoice and no bank EMI. P3 2.25 — capital 2 Skip, schemes 2 Skip, lender 2 Skip, market 3 Later. Venture capital does not reach the bench, and there is no lender product the centre can open this year. Tools stay Skip or Later. P4 3.00 — map 4 Activate, friction 4 Activate, scorecard 2 Skip, compliance 2 Skip. Only a map and a friction note on informal contracts Activate. A scorecard would not have a cohort. Delivery 2 — Chapter 18. No year-1 building. Additionality 2 — State AVGC policies and colleges already offer space and courses."
  },
  {
    "id": "geospatial",
    "name": "Geospatial & drones-as-a-service",
    "icam": "New candidate",
    "delivery": 2,
    "add": 2,
    "problem": "Tender payments are slow, and the service firms are too scattered to be a centre distinct from the drone demo.",
    "intervene": "Map service firms only so they are not double-counted as drone manufacturers. No centre.",
    "out": "Do not relaunch the drone demonstration cluster under a services name.",
    "action": "Watch — mapping and friction only",
    "tools": {
      "credit": 3,
      "rating": 2,
      "digital": 3,
      "policy": 3,
      "payment": 2,
      "odr": 2,
      "emi": 2,
      "outcomes": 2,
      "capital": 2,
      "schemes": 2,
      "lender": 2,
      "market": 3,
      "map": 4,
      "friction": 4,
      "scorecard": 2,
      "compliance": 3
    },
    "sources": "Geospatial guidelines, 2021. DGCA PIB, 26 July 2024: 16,000 remote pilot certificates are people, not firms. Services have no HSN. Brochure, 17 October 2026.",
    "justify": "P1 2.75 — credit 3 Later, rating 2 Skip, digital 3 Later, policy 3 Later. Programme files for GeM are Later. There is no thick factory tail. P2 2.00 — payment 2 Skip, odr 2 Skip, emi 2 Skip, outcomes 2 Skip. Government payment delay is real and still Skip for a centre: the firms are not a cluster that can hold a recovery cell. P3 2.25 — capital 2 Skip, schemes 2 Skip, lender 2 Skip, market 3 Later. No sector lender product. Market access to GeM is Later, not a year-1 staffing. P4 3.25 — map 4 Activate, friction 4 Activate, scorecard 2 Skip, compliance 3 Later. Mapping and friction Activate only to keep this row from being merged into the drone demo. Delivery 2 — Chapter 18. Delivery is 2. Additionality 2 — The drone demo, if attached, already covers the aircraft. A second vehicle adds nothing."
  },
  {
    "id": "cyber",
    "name": "Cybersecurity services",
    "icam": "New candidate",
    "delivery": 2,
    "add": 1,
    "problem": "There is no factory cash-cycle cohort. The firms are prospective members.",
    "intervene": "Invite empanelled firms as members inside the five year-1 vehicles. Do not open a cyber cluster.",
    "out": "Out of cluster charter. Do not staff a security operations centre.",
    "action": "Out of cluster charter — member / partner",
    "tools": {
      "credit": 3,
      "rating": 2,
      "digital": 3,
      "policy": 2,
      "payment": 3,
      "odr": 2,
      "emi": 2,
      "outcomes": 2,
      "capital": 2,
      "schemes": 2,
      "lender": 2,
      "market": 3,
      "map": 3,
      "friction": 3,
      "scorecard": 2,
      "compliance": 3
    },
    "sources": "CERT-In directions, 2022. Services exports USD 383.51 billion, PIB FY25, are not this cohort. Brochure, 17 October 2026. Forced out of charter regardless of the arithmetic.",
    "justify": "P1 2.50 — credit 3 Later, rating 2 Skip, digital 3 Later, policy 2 Skip. A file clinic is not the failure mode. Tools stay Later or Skip. P2 2.25 — payment 3 Later, odr 2 Skip, emi 2 Skip, outcomes 2 Skip. Client payment delays exist and still do not justify a recovery cell for a virtual, member-type cohort. P3 2.25 — capital 2 Skip, schemes 2 Skip, lender 2 Skip, market 3 Later. No sector scheme whose usability is Catalyst’s job. These firms sell to the banks the centre would otherwise convene. P4 2.75 — map 3 Later, friction 3 Later, scorecard 2 Skip, compliance 3 Later. Mapping would only produce a membership list. It is Later, not a centre. Delivery 2 — No physical cohort. Additionality 1 — The type is a delivery partner. Additionality of a centre is 1. Forced out of charter."
  },
  {
    "id": "specialty-steel",
    "name": "Specialty steel (MSME conversion)",
    "icam": "New candidate",
    "delivery": 2,
    "add": 2,
    "problem": "The PLI sits on the melt shop. Rerollers do not have a specialty-grade buyer file, and a centre would be mistaken for a steel project.",
    "intervene": "Map rerollers who already sell a specialty grade. Do not open a centre.",
    "out": "Do not open a centre on a melt shop or administer PLI Specialty Steel.",
    "action": "Watch — mapping and friction only",
    "tools": {
      "credit": 3,
      "rating": 3,
      "digital": 3,
      "policy": 3,
      "payment": 3,
      "odr": 2,
      "emi": 2,
      "outcomes": 2,
      "capital": 3,
      "schemes": 3,
      "lender": 3,
      "market": 2,
      "map": 4,
      "friction": 4,
      "scorecard": 2,
      "compliance": 3
    },
    "sources": "PLI Specialty Steel, 2021. Engineering goods USD 116.67 billion, PIB FY25, are not this cohort. Brochure, 17 October 2026.",
    "justify": "P1 3.00 — credit 3 Later, rating 3 Later, digital 3 Later, policy 3 Later. Readiness is Later. The failure is not a missing classroom; it is the absence of a grade and a buyer. P2 2.25 — payment 3 Later, odr 2 Skip, emi 2 Skip, outcomes 2 Skip. Mill payment cycles are Later. ODR and EMI Skip for a cohort the centre is not opening. P3 2.75 — capital 3 Later, schemes 3 Later, lender 3 Later, market 2 Skip. PLI is the anchor’s scheme. Market access Skips because Catalyst must not become a grade-development consultant to a melt shop. P4 3.25 — map 4 Activate, friction 4 Activate, scorecard 2 Skip, compliance 3 Later. Only mapping and friction Activate, to see whether any reroller is actually in specialty grades. Delivery 2 — No year-1 vehicle that is not the plant. Additionality 2 — The PLI programme and the steel companies already run this."
  },
  {
    "id": "api",
    "name": "Bulk drugs & KSMs / APIs",
    "icam": "New candidate",
    "delivery": 2,
    "add": 2,
    "problem": "The incentive and the plot sit with the plant. A centre on the reactor would duplicate PLI.",
    "intervene": "Map intermediate MSMEs around one park only. Do not staff Kaksha for the PLI applicant.",
    "out": "Do not open a centre on a bulk-drug plant or run the park.",
    "action": "Watch — mapping and friction only",
    "tools": {
      "credit": 3,
      "rating": 3,
      "digital": 3,
      "policy": 3,
      "payment": 3,
      "odr": 2,
      "emi": 2,
      "outcomes": 2,
      "capital": 3,
      "schemes": 3,
      "lender": 3,
      "market": 2,
      "map": 4,
      "friction": 4,
      "scorecard": 2,
      "compliance": 3
    },
    "sources": "Pharmexcil, 14 June 2025: bulk drugs USD 4.87 billion. PLI Bulk Drugs, 2020. ASI FY25 pharma factories 10.92 lakh persons, parent industry. Drugs and pharmaceuticals exports USD 30.47 billion are the wider basket. Brochure, 17 October 2026.",
    "justify": "P1 3.00 — credit 3 Later, rating 3 Later, digital 3 Later, policy 3 Later. Regulatory files are real and still Later: the firms that hold them are the plants, which are out of cohort. P2 2.25 — payment 3 Later, odr 2 Skip, emi 2 Skip, outcomes 2 Skip. Plant payment terms are not an MSME ODR book this year. ODR and EMI Skip. P3 2.75 — capital 3 Later, schemes 3 Later, lender 3 Later, market 2 Skip. PLI and the park are the anchor’s scheme. Market access Skips so the centre is not pulled into selling intermediates. P4 3.25 — map 4 Activate, friction 4 Activate, scorecard 2 Skip, compliance 3 Later. Mapping and friction on who around the park is actually an MSME Activate. A scorecard does not. Delivery 2 — The vehicle on the ground is the park. A second desk has nowhere to stand that is not the plant. Additionality 2 — PLI and the park authority already run the official relationship."
  },
  {
    "id": "electronics",
    "name": "Mobile & electronics manufacturing",
    "icam": "Phase II",
    "delivery": 4,
    "add": 4,
    "problem": "Assembler payment terms hit the uncounted tool room, and firms are sent toward a PLI they cannot enter.",
    "intervene": "Next mapping wave: count non-PLI suppliers in Noida or Sriperumbudur, then a payment cell and programme files that keep them out of the wrong scheme.",
    "out": "Do not treat ₹5.45 lakh crore of mobile production as the cohort, and do not relaunch Phase II assembly as a new discovery.",
    "action": "Next mapping / Phase II wave",
    "tools": {
      "credit": 4,
      "rating": 3,
      "digital": 4,
      "policy": 5,
      "payment": 5,
      "odr": 4,
      "emi": 3,
      "outcomes": 4,
      "capital": 4,
      "schemes": 3,
      "lender": 4,
      "market": 4,
      "map": 5,
      "friction": 4,
      "scorecard": 3,
      "compliance": 3
    },
    "sources": "MeitY / PIB, 23 July 2025: production ₹11.32 lakh crore, exports about ₹3.26 lakh crore, mobile production ₹5.45 lakh crore, mobile exports about ₹2 lakh crore, 300+ units, about 25 lakh jobs, PLI LSEM 1,30,330 direct jobs to June 2025, 32 beneficiaries. DGCIS electronic goods USD 38.58 billion FY25. Brochure, 17 October 2026.",
    "justify": "P1 4.00 — credit 4 Activate, rating 3 Later, digital 4 Activate, policy 5 Activate. Programme files are 5 so a moulder is not coached into PLI LSEM. Credit Kaksha and Digital Dost are 4. Rating is Later until the ring is listed. P2 4.00 — payment 5 Activate, odr 4 Activate, emi 3 Later, outcomes 4 Activate. Assembler payment terms are the cash cycle, so the payment cell, ODR and outcome tracking Activate. EMI is Later. P3 3.75 — capital 4 Activate, schemes 3 Later, lender 4 Activate, market 4 Activate. Working capital, the bank or TReDS route, and a vendor-code link are 4. Scheme usability is Later because the live PLI is the anchor’s. P4 3.75 — map 5 Activate, friction 4 Activate, scorecard 3 Later, compliance 3 Later. Mapping is 5. The drop-off from vendor-code lists is friction research at 4. Scorecard and compliance wait. Delivery 4 — The belts are real and Phase II infrastructure exists. A supplier desk would be new. Delivery is 4. Additionality 4 — MeitY and the assemblers already run the principal. They do not run receivables for the tool room. Additionality is 4, not 5, because the phase is already open."
  },
  {
    "id": "ev",
    "name": "EV vehicles & auto-tech components",
    "icam": "Phase II",
    "delivery": 4,
    "add": 2,
    "problem": "OEM payment terms are real, and they are already the reason to open the pack centre rather than a second auto desk.",
    "intervene": "Do not staff a year-1 vehicle centre. If a Pune supplier desk opens later, it should be the pack and component ring, not the OEM.",
    "out": "Do not relaunch Phase II EV as a new cluster or run PLI Auto.",
    "action": "Next mapping / Phase II wave",
    "tools": {
      "credit": 3,
      "rating": 3,
      "digital": 3,
      "policy": 3,
      "payment": 4,
      "odr": 3,
      "emi": 3,
      "outcomes": 3,
      "capital": 3,
      "schemes": 3,
      "lender": 3,
      "market": 3,
      "map": 4,
      "friction": 3,
      "scorecard": 3,
      "compliance": 3
    },
    "sources": "PLI Auto: 82 applicants and 278 units as on 30 November 2025; determined sales ₹32,879 crore and 48,974 jobs to 30 September 2025; outlay ₹25,938 crore. FAME-II reimbursements ₹6,559 crore. PM E-DRIVE ₹10,900 crore from 1 October 2024. ASI FY25 motor vehicles 14.80 lakh persons. Brochure, 17 October 2026.",
    "justify": "P1 3.00 — credit 3 Later, rating 3 Later, digital 3 Later, policy 3 Later. Readiness tools are Later. The OEM and Tier-1 already have vendor development. P2 3.25 — payment 4 Activate, odr 3 Later, emi 3 Later, outcomes 3 Later. The payment cell is 4 because OEM cycles are real, and it should be run on the pack row rather than duplicated here. ODR, EMI and outcomes stay Later. P3 3.00 — capital 3 Later, schemes 3 Later, lender 3 Later, market 3 Later. PLI and the demand incentive are the anchor’s schemes. All four P3 tools stay Later so this row does not compete with the pack centre. P4 3.25 — map 4 Activate, friction 3 Later, scorecard 3 Later, compliance 3 Later. A map that points suppliers to the pack cohort, rather than a new scorecard, is the only Activate. Delivery 4 — The belts exist, so a desk could open. It should not, while the pack centre is the year-1 vehicle. Delivery stays 4 as a property of the belt, not as a decision to open. Additionality 2 — Prefer the pack and BMS sibling. Additionality of a second auto centre is 2."
  },
  {
    "id": "solar",
    "name": "Solar PV modules & BOS",
    "icam": "Phase II",
    "delivery": 4,
    "add": 3,
    "problem": "EPC payment terms hit BOS fabricators, and ALMM compliance is about to tighten for cells, but the fabricator list is not the ALMM list.",
    "intervene": "Phase II mapping of BOS fabricators in Gujarat. Programme files and compliance intel so a small fabricator is not sent into PLI. A payment cell only where the EPC invoice is formal.",
    "out": "Do not run a module plant or treat enlisted GW as a cluster.",
    "action": "Next mapping / Phase II wave",
    "tools": {
      "credit": 3,
      "rating": 3,
      "digital": 3,
      "policy": 4,
      "payment": 4,
      "odr": 3,
      "emi": 2,
      "outcomes": 3,
      "capital": 3,
      "schemes": 3,
      "lender": 3,
      "market": 3,
      "map": 4,
      "friction": 3,
      "scorecard": 3,
      "compliance": 4
    },
    "sources": "MNRE: ALMM from 21 manufacturers in 2021 to 100 manufacturers and 123 units at 100 GW. PLI tranches: 3 and 11 bidders. Installed PLI capacity about 18.5 GW modules as on 30 June 2025, which is capacity. Brochure, 17 October 2026.",
    "justify": "P1 3.25 — credit 3 Later, rating 3 Later, digital 3 Later, policy 4 Activate. Programme files are 4 so the fabricator is not pointed at PLI. The other readiness tools are Later: the micro installer is a different job. P2 3.00 — payment 4 Activate, odr 3 Later, emi 2 Skip, outcomes 3 Later. EPC delays justify a payment cell. ODR is Later. EMI Skips: the stress is inventory and the EPC, not a consumer EMI. P3 3.00 — capital 3 Later, schemes 3 Later, lender 3 Later, market 3 Later. IREDA and PLI are the plant’s channels. They are Later for this ring, not Activate. P4 3.50 — map 4 Activate, friction 3 Later, scorecard 3 Later, compliance 4 Activate. Mapping BOS separately from ALMM is Activate. Cell-ALMM compliance intel is Activate for manufacturers who are already mid-size; it is not a micro clinic. The scorecard is Later. Delivery 4 — Gujarat fabrication can host a spoke. Delivery is 4 and the decision is still not year 1. Additionality 3 — MNRE, SECI and IREDA already run the official door. Additionality is 3."
  },
  {
    "id": "it",
    "name": "IT services & GCCs",
    "icam": "Phase II",
    "delivery": 2,
    "add": 2,
    "problem": "There is no MSME factory cohort. Treating GCCs as a cluster would crowd out the year-1 five.",
    "intervene": "Invite GCCs as anchors or members inside a real cluster. Map campus vendors only if a host city asks. No centre.",
    "out": "Do not open an IT cluster or a GCC park.",
    "action": "Watch — mapping and friction only",
    "tools": {
      "credit": 3,
      "rating": 3,
      "digital": 3,
      "policy": 2,
      "payment": 2,
      "odr": 2,
      "emi": 2,
      "outcomes": 2,
      "capital": 2,
      "schemes": 2,
      "lender": 2,
      "market": 2,
      "map": 4,
      "friction": 4,
      "scorecard": 2,
      "compliance": 2
    },
    "sources": "PIB: services exports USD 383.51 billion, FY2024–25. No HSN. Phase II. Brochure, 17 October 2026.",
    "justify": "P1 2.75 — credit 3 Later, rating 3 Later, digital 3 Later, policy 2 Skip. Readiness tools are the wrong product for a GCC. They stay Later or Skip. P2 2.00 — payment 2 Skip, odr 2 Skip, emi 2 Skip, outcomes 2 Skip. GCC vendor payment is not a cluster recovery book. Receivables tools Skip. P3 2.00 — capital 2 Skip, schemes 2 Skip, lender 2 Skip, market 2 Skip. No scheme or lender pathway the centre should staff. The sector is a capitalled industry already. P4 3.00 — map 4 Activate, friction 4 Activate, scorecard 2 Skip, compliance 2 Skip. Mapping and a short friction note Activate only to stop this row being proposed as a centre. Delivery 2 — Chapter 18. Delivery is 2. Additionality 2 — Prefer any sibling that has a factory receivable. Additionality of an IT centre is 2."
  },
  {
    "id": "healthtech",
    "name": "Healthtech & care delivery",
    "icam": "Phase II",
    "delivery": 3,
    "add": 2,
    "problem": "Insurer and public-scheme payouts to small care units are slow, and this row is easily confused with medical devices.",
    "intervene": "Do not open a second health centre. If a device centre sees care-unit invoices, record them as out of cohort. Mapping only, to keep the rows apart.",
    "out": "Do not double-count device exports, finance a hospital, or relaunch Phase II healthtech as new.",
    "action": "Next mapping / Phase II wave",
    "tools": {
      "credit": 4,
      "rating": 3,
      "digital": 4,
      "policy": 3,
      "payment": 4,
      "odr": 3,
      "emi": 3,
      "outcomes": 3,
      "capital": 3,
      "schemes": 3,
      "lender": 3,
      "market": 3,
      "map": 4,
      "friction": 3,
      "scorecard": 3,
      "compliance": 3
    },
    "sources": "Telemedicine practice guidelines, 2020. Medtech exports USD 4.02 billion are a different row and are not used. Brochure, 17 October 2026.",
    "justify": "P1 3.50 — credit 4 Activate, rating 3 Later, digital 4 Activate, policy 3 Later. Credit Kaksha and Digital Dost are 4 for a small diagnostic unit’s lender file. Rating and programme files are Later. P2 3.25 — payment 4 Activate, odr 3 Later, emi 3 Later, outcomes 3 Later. The payment cell is 4 because insurer and scheme payouts recur. ODR and EMI are Later: many claims are not invoices in the MSME Act sense. P3 3.00 — capital 3 Later, schemes 3 Later, lender 3 Later, market 3 Later. Healthcare NBFCs are the chain’s product. The centre should not staff a lender route here while the device row is the year-1 health cohort. P4 3.25 — map 4 Activate, friction 3 Later, scorecard 3 Later, compliance 3 Later. Mapping Activate, only to prevent a merge with medical devices. Other research tools are Later. Delivery 3 — No belt that is not a hospital chain. Delivery is 3. Additionality 2 — Phase II health programmes and the hospital chains already exist. Additionality is 2."
  },
  {
    "id": "edtech",
    "name": "Education technology & skilling",
    "icam": "Phase II",
    "delivery": 2,
    "add": 1,
    "problem": "Training partners are how a centre delivers apprenticeships. They are not themselves the MSME cohort.",
    "intervene": "Use colleges and training partners inside the five year-1 vehicles. Do not score them as a sixth cluster.",
    "out": "Out of cluster charter. Do not open an edtech cluster or finance a college.",
    "action": "Out of cluster charter — delivery partner",
    "tools": {
      "credit": 3,
      "rating": 2,
      "digital": 3,
      "policy": 3,
      "payment": 2,
      "odr": 2,
      "emi": 2,
      "outcomes": 2,
      "capital": 2,
      "schemes": 3,
      "lender": 2,
      "market": 3,
      "map": 3,
      "friction": 3,
      "scorecard": 2,
      "compliance": 2
    },
    "sources": "Skill and apprenticeship programmes; remote-learning wave from 2020. Services account USD 383.51 billion, PIB FY25, is not this cohort. Brochure, 17 October 2026. Forced out of charter.",
    "justify": "P1 2.75 — credit 3 Later, rating 2 Skip, digital 3 Later, policy 3 Later. The brochure’s academic and apprenticeship function uses these partners. It does not enrol them as the cohort. Readiness tools stay Later or Skip. P2 2.00 — payment 2 Skip, odr 2 Skip, emi 2 Skip, outcomes 2 Skip. Outcome-payment delays are not the factory receivable the charter is built for. Receivables tools Skip. P3 2.50 — capital 2 Skip, schemes 3 Later, lender 2 Skip, market 3 Later. Scheme training contracts are Later at most. The centre must not become a placement agency. P4 2.50 — map 3 Later, friction 3 Later, scorecard 2 Skip, compliance 2 Skip. A map of partners is an operating list for the five vehicles, not a cluster scorecard. Delivery 2 — No belt. Additionality 1 — The type is the delivery partner. Additionality of a centre on edtech is 1. Forced out of charter."
  },
  {
    "id": "logistics",
    "name": "E-commerce logistics & warehousing",
    "icam": "Phase II",
    "delivery": 5,
    "add": 4,
    "problem": "Platform and 3PL payouts land after the vehicle EMI is due, for a micro fleet that already has a formal loan.",
    "intervene": "Reserve, not year 1: attach a payment cell to the Bhiwandi annex if a sixth slot is funded. Credit Kaksha on the EMI-versus-payout gap. Do not build a warehouse.",
    "out": "Do not become a 3PL, a fleet lessor, or a new Phase II discovery.",
    "action": "High-need reserve — not year-1 unless a sixth slot",
    "tools": {
      "credit": 4,
      "rating": 3,
      "digital": 4,
      "policy": 3,
      "payment": 5,
      "odr": 4,
      "emi": 4,
      "outcomes": 5,
      "capital": 4,
      "schemes": 3,
      "lender": 4,
      "market": 4,
      "map": 4,
      "friction": 4,
      "scorecard": 4,
      "compliance": 3
    },
    "sources": "E-way bill and warehouse geography (Bhiwandi and peer belts). No HSN. Vehicle NBFC and MUDRA use on micro fleets is the lending channel. Brochure, 17 October 2026.",
    "justify": "P1 3.50 — credit 4 Activate, rating 3 Later, digital 4 Activate, policy 3 Later. Credit Kaksha and Digital Dost Activate because the fleet owner’s loan file and e-way compliance fail together. Rating and programme files are Later. P2 4.50 — payment 5 Activate, odr 4 Activate, emi 4 Activate, outcomes 5 Activate. Platform payout versus a live vehicle EMI is the EMI-concept case, so payment, ODR, EMI explore and outcome tracking all Activate. P3 3.75 — capital 4 Activate, schemes 3 Later, lender 4 Activate, market 4 Activate. Working capital matched to the payout cycle, the vehicle-NBFC route, and a platform as the named buyer are 4. There is no sector scheme whose usability is the main job. P4 3.75 — map 4 Activate, friction 4 Activate, scorecard 4 Activate, compliance 3 Later. The belt can carry a scorecard in year 1 if the annex opens, so mapping, friction and the scorecard are 4. Compliance on e-way is Later relative to the cash cycle. Delivery 5 — A Bhiwandi-type annex is the delivery form already. Delivery is 5. Additionality 4 — Platforms do not run a fleet-owner recovery cell. Additionality is 4. It is still a reserve because the year-1 five are fuller factory cohorts."
  },
  {
    "id": "fintech",
    "name": "Fintech & BC-agent networks",
    "icam": "Phase II",
    "delivery": 1,
    "add": 1,
    "problem": "There is no borrowing cohort. Opening a fintech cluster would put the lender in the borrower’s seat.",
    "intervene": "Invite regulated lenders and BC networks as members inside the five vehicles. No centre.",
    "out": "Out of cluster charter. Do not allocate leads, rank lenders, or create a fintech cluster.",
    "action": "Out of cluster charter — member / partner",
    "tools": {
      "credit": 2,
      "rating": 2,
      "digital": 3,
      "policy": 2,
      "payment": 2,
      "odr": 1,
      "emi": 1,
      "outcomes": 2,
      "capital": 2,
      "schemes": 2,
      "lender": 2,
      "market": 2,
      "map": 3,
      "friction": 2,
      "scorecard": 2,
      "compliance": 2
    },
    "sources": "Account Aggregator, 2021. BC and NBFC-MFI frameworks. No HSN. Brochure, 17 October 2026: the platform does not lend or route MSMEs to a preferred lender. Forced out of charter.",
    "justify": "P1 2.25 — credit 2 Skip, rating 2 Skip, digital 3 Later, policy 2 Skip. Credit Kaksha is something these firms might help deliver. It is not a service they need as a cluster. Tools Skip or Later. P2 1.50 — payment 2 Skip, odr 1 Skip, emi 1 Skip, outcomes 2 Skip. ODR and EMI Skip. A lender’s collection book is not the charter’s recovery cell. P3 2.00 — capital 2 Skip, schemes 2 Skip, lender 2 Skip, market 2 Skip. Capital pathways are what the member provides after a file exists. The centre does not build that market as a cohort. P4 2.25 — map 3 Later, friction 2 Skip, scorecard 2 Skip, compliance 2 Skip. A map of willing member lenders is an operating list, Later, not a cluster study. Delivery 1 — No cluster vehicle. Additionality 1 — The type is a capital provider. Additionality of a centre is 1. Forced out of charter."
  },
  {
    "id": "drones",
    "name": "Drones & drone components",
    "icam": "Demo",
    "delivery": 4,
    "add": 3,
    "problem": "DGCA type-certification files, not a receivable book large enough to staff.",
    "intervene": "Attach file help to the existing demo if it is still live: Digital Dost, programme files and compliance intel. Do not open a new centre. Do not borrow Namo Drone Didi’s SHG population.",
    "out": "Do not relaunch the drone demonstration as a new discovery or run a training organisation.",
    "action": "Attach pillars to the existing demo",
    "tools": {
      "credit": 3,
      "rating": 2,
      "digital": 4,
      "policy": 4,
      "payment": 3,
      "odr": 2,
      "emi": 2,
      "outcomes": 2,
      "capital": 3,
      "schemes": 3,
      "lender": 2,
      "market": 3,
      "map": 4,
      "friction": 4,
      "scorecard": 2,
      "compliance": 4
    },
    "sources": "Drone Rules and PLI, 2021, outlay ₹120 crore. PIB, 6 July 2022: 23 beneficiaries, combined sales ₹319 crore in FY2021–22. PIB, 26 July 2024: 48 manufacturing companies, 70 type-certified models, 16,000 remote pilot certificates, 116 training organisations. Brochure, 17 October 2026.",
    "justify": "P1 3.25 — credit 3 Later, rating 2 Skip, digital 4 Activate, policy 4 Activate. Digital Dost and programme files Activate because the type certificate is the drop-off. Credit Kaksha is Later. Rating Skips: the firms are young and few. P2 2.25 — payment 3 Later, odr 2 Skip, emi 2 Skip, outcomes 2 Skip. There are not enough formal buyer invoices to staff ODR, EMI or a recovery score. The payment cell is Later. P3 2.75 — capital 3 Later, schemes 3 Later, lender 2 Skip, market 3 Later. PLI is closed. Lender route Skips. Capital and scheme tools are Later. Venture capital has already found the few primes. P4 3.50 — map 4 Activate, friction 4 Activate, scorecard 2 Skip, compliance 4 Activate. Mapping and friction on who never finishes certification Activate, plus compliance intel. A scorecard of a few dozen firms is Skip. Delivery 4 — The demo exists, so an attachment is plausible even though the firms are scattered. Delivery is 4. Additionality 3 — DGCA and the closed PLI already structure the industry. Catalyst would add file completion only. Additionality is 3."
  },
  {
    "id": "defence",
    "name": "Defence manufacturing (private)",
    "icam": "Demo",
    "delivery": 5,
    "add": 3,
    "problem": "DPSU milestone bills stick, and three different population numbers are briefed as if they were one cluster.",
    "intervene": "Attach to the existing demo, and only if a DPSU or prime opens its vendor list: Credit Kaksha, programme files, a payment cell and compliance intel on export authorisation. Do not relaunch the demo.",
    "out": "Do not bid a contract, grant an iDEX award, or treat 16,000 and 462 as the same count.",
    "action": "Attach pillars to the existing demo",
    "tools": {
      "credit": 4,
      "rating": 3,
      "digital": 3,
      "policy": 4,
      "payment": 4,
      "odr": 3,
      "emi": 2,
      "outcomes": 4,
      "capital": 3,
      "schemes": 3,
      "lender": 3,
      "market": 3,
      "map": 5,
      "friction": 4,
      "scorecard": 3,
      "compliance": 4
    },
    "sources": "PIB, 1 April 2025: exports ₹23,622 crore; 1,762 authorisations; exporter count up 17.4% with no headcount. PIB, 9 August 2025: production ₹1,50,590 crore. February 2025 iDEX note: 619 startups and MSMEs, 430 contracts. About 16,000 MSMEs; 788 licences to 462 companies. FY25 domestic contracts: 193 worth ₹2,09,050 crore, of which 177 worth ₹1,68,922 crore were domestic. Brochure, 17 October 2026.",
    "justify": "P1 3.50 — credit 4 Activate, rating 3 Later, digital 3 Later, policy 4 Activate. Credit Kaksha and programme files Activate for a vendor who cannot turn a milestone bill into a bank file. Rating and Digital Dost are Later. P2 3.25 — payment 4 Activate, odr 3 Later, emi 2 Skip, outcomes 4 Activate. The payment cell and outcome tracking Activate because milestone delay is structural. ODR is Later: many vendors sit outside the micro and small ceiling. EMI Skips; the instrument is the milestone, not a retail EMI. P3 3.00 — capital 3 Later, schemes 3 Later, lender 3 Later, market 3 Later. iDEX is a grant, not the scheme-usability job, and SIDM and the DPSU already run empanelment. P3 stays Later. P4 4.00 — map 5 Activate, friction 4 Activate, scorecard 3 Later, compliance 4 Activate. Mapping is 5 because the three population numbers cannot be one brief. Friction and export-authorisation compliance Activate. The scorecard is Later. Delivery 5 — The demo and the corridors exist. Delivery is 5 as an attachment, not as a new park. Additionality 3 — iDEX, SIDM and the corridors already occupy the ground. Catalyst adds the cash-flow file only. Additionality is 3."
  },
  {
    "id": "appliances",
    "name": "White goods & furniture",
    "icam": "Demo",
    "delivery": 5,
    "add": 4,
    "problem": "Brand goods-receipt delays, and BIS energy-rating or quality files, inside an annex of about 4,500 MSMEs.",
    "intervene": "Year-1 attachment to the Noida–Hapur annex: Rating Kaksha on BIS, a payment cell and ODR on brand GRNs, Credit Kaksha, and the lender route after the file. Do not relaunch the demo.",
    "out": "Do not administer PLI White Goods or build another industrial estate.",
    "action": "Year-1 attach pillars to the appliances annex",
    "tools": {
      "credit": 4,
      "rating": 5,
      "digital": 4,
      "policy": 3,
      "payment": 5,
      "odr": 5,
      "emi": 4,
      "outcomes": 4,
      "capital": 4,
      "schemes": 4,
      "lender": 4,
      "market": 3,
      "map": 4,
      "friction": 4,
      "scorecard": 3,
      "compliance": 3
    },
    "sources": "PLI White Goods: 84 companies, intended investment ₹10,478 crore. Noida–Hapur annex about 4,500 MSMEs, the cohort used for this row. Brochure, 17 October 2026.",
    "justify": "P1 4.00 — credit 4 Activate, rating 5 Activate, digital 4 Activate, policy 3 Later. Rating Kaksha is 5 because BIS and energy-rating files are the discipline a brand asks for. Credit Kaksha and Digital Dost are 4. Programme files are Later: PLI is the wrong window and should not be staffed as if it were theirs. P2 4.50 — payment 5 Activate, odr 5 Activate, emi 4 Activate, outcomes 4 Activate. Brand GRN delay is the same receivables logic as food. Payment cell, ODR and EMI-explore Activate. Outcome tracking is 4. P3 3.75 — capital 4 Activate, schemes 4 Activate, lender 4 Activate, market 3 Later. Working capital, scheme clarity, and the bank route are 4. Market access is Later: the annex already has a buyer panel. P4 3.50 — map 4 Activate, friction 4 Activate, scorecard 3 Later, compliance 3 Later. Mapping and friction on who in the 4,500 actually invoices the brand are 4. Scorecard and a new compliance stack are Later; BIS sits in Rating Kaksha. Delivery 5 — The annex exists. Delivery is 5. Additionality 4 — The annex and PLI do not run ODR or a rating clinic. Additionality is 4."
  },
  {
    "id": "food",
    "name": "Food processing (PLI wave)",
    "icam": "Demo",
    "delivery": 5,
    "add": 3,
    "problem": "Retail and quick-commerce payments, and PMFME or FPO files that stall, inside a demo that already exists.",
    "intervene": "Attach to the food demo: Credit Kaksha for the FPO and micro unit, programme files so PMFME reaches formalisation, a payment cell on retail and quick-commerce invoices, and a scheme desk. Do not open a second park.",
    "out": "Do not run PLI food, build a mega food park, or replace the state nodal agency.",
    "action": "Year-1 attach pillars to the food demo",
    "tools": {
      "credit": 5,
      "rating": 4,
      "digital": 4,
      "policy": 5,
      "payment": 5,
      "odr": 4,
      "emi": 4,
      "outcomes": 5,
      "capital": 4,
      "schemes": 5,
      "lender": 4,
      "market": 4,
      "map": 4,
      "friction": 5,
      "scorecard": 4,
      "compliance": 4
    },
    "sources": "MoFPI: PLI food outlay ₹10,900 crore; 70 MSMEs directly and 40 contract manufacturers; scheme sales ₹3,80,350 crore. PMFME: 1,72,707 approved and 59,202 formalised as on 31 December 2025; 3,76,326 SHG members. ASI FY25 food factories 23.61 lakh persons. PMFME evaluation, 31 March 2025: more than 2.8 lakh opportunities and about 1.7 times turnover. Brochure, 17 October 2026.",
    "justify": "P1 4.50 — credit 5 Activate, rating 4 Activate, digital 4 Activate, policy 5 Activate. Credit Kaksha and programme files are 5 because the scheme is credit-linked and the approval-to-formalisation gap is measured. Rating Kaksha is 4 for units that have left the kitchen and now face a buyer. Digital Dost is 4. P2 4.50 — payment 5 Activate, odr 4 Activate, emi 4 Activate, outcomes 5 Activate. Retail and quick-commerce invoices are the formal receivable, so the payment cell, ODR, EMI-explore and outcome tracking Activate. This is a different cash cycle from a kirana-only micro unit, and the demo has to select units that have those invoices. P3 4.25 — capital 4 Activate, schemes 5 Activate, lender 4 Activate, market 4 Activate. Scheme usability is 5. Capital, lender and buyer links are 4. PLI food is not the micro unit’s scheme, and the centre must say so. P4 4.25 — map 4 Activate, friction 5 Activate, scorecard 4 Activate, compliance 4 Activate. Friction research is 5 because 1,72,707 approved and 59,202 formalised are the drop-off. Mapping, the scorecard and FSSAI compliance are 4. Delivery 5 — The demo exists. Delivery is 5 as an attachment. Additionality 3 — The state nodal agency already runs PMFME. Catalyst adds the retail payment cell and the file standard, not a second helpdesk. Additionality is 3. Food still takes the attach slot because the demo is standing, while pack and BMS is the new centre."
  }
];


type TierFilter = "all" | "High" | "Medium" | "Watch" | "Out of charter";

export default function CharterInterventionRank() {
  const ranked = useMemo(() => {
    return RAW.map((row) => ({ ...row, ...scoreAll(row) }))
      .sort((a, b) => b.overall - a.overall || a.name.localeCompare(b.name));
  }, []);
  const [tier, setTier] = useState<TierFilter>("all");
  const [view, setView] = useState<"rank" | "heat" | "play">("rank");
  const [selectedId, setSelectedId] = useState("medtech");
  const shown = ranked.filter((row) => tier === "all" || row.tier === tier);
  const selected = ranked.find((row) => row.id === selectedId) ?? shown[0];
  const counts = {
    High: ranked.filter((row) => row.tier === "High").length,
    Medium: ranked.filter((row) => row.tier === "Medium").length,
    Watch: ranked.filter((row) => row.tier === "Watch").length,
    Out: ranked.filter((row) => row.tier === "Out of charter").length,
  };
  const high = ranked.filter((row) => row.tier === "High");

  return (
    <Stack gap={20}>
      <Stack gap={6}>
        <H1>Charter intervention rank</H1>
        <Text tone="secondary">
          Sixteen tools under four pillars. Overall = P1×18% + P2×24% + P3×18% + P4×14% + delivery×16% + additionality×10%. High at 4 or above. This is not the cluster-shape score.
        </Text>
      </Stack>
      <Grid columns={4} gap={12}>
        <Stat value={String(counts.High)} label="High" tone="success" />
        <Stat value={String(counts.Medium)} label="Medium" />
        <Stat value={String(counts.Watch)} label="Watch" tone="warning" />
        <Stat value={String(counts.Out)} label="Out of charter" />
      </Grid>
      <H2>The 16 tools</H2>
      <Table
        headers={["Pillar", "Tool", "Brochure job"]}
        rows={TOOLS.map((tool) => [tool.pillar, tool.name, tool.job])}
        striped
      />
      <Callout tone="info">
        4–5 is Activate, 3 is Later, 1–2 is Skip. A High-need cluster may still Skip tools. Business EMI protection is a concept to explore, not a product. Fintech, edtech, cybersecurity and green hydrogen are forced out of charter.
      </Callout>
      <Row gap={8} wrap>
        {(["all", "High", "Medium", "Watch", "Out of charter"] as TierFilter[]).map((item) => (
          <Pill key={item} active={tier === item} onClick={() => setTier(item)}>
            {item === "all" ? "All 31" : item}
          </Pill>
        ))}
      </Row>
      <Row gap={8} wrap>
        <Pill active={view === "rank"} onClick={() => setView("rank")}>Ranked list</Pill>
        <Pill active={view === "heat"} onClick={() => setView("heat")}>Tool heat (High-need)</Pill>
        <Pill active={view === "play"} onClick={() => setView("play")}>Tool playbook</Pill>
      </Row>
      {view === "rank" && (
        <Table
          headers={["Rank", "Industry", "Need", "Tier", "ICAM", "P1", "P2", "P3", "P4", "Activate", "Action"]}
          columnAlign={["right", "left", "right", "left", "left", "right", "right", "right", "right", "right", "left"]}
          rows={shown.map((row) => [
            String(ranked.findIndex((item) => item.id === row.id) + 1),
            row.name,
            row.overall.toFixed(3),
            row.tier,
            row.icam,
            row.p1.toFixed(2),
            row.p2.toFixed(2),
            row.p3.toFixed(2),
            row.p4.toFixed(2),
            String(row.activate.length),
            row.action,
          ])}
          striped
          stickyHeader
        />
      )}
      {view === "heat" && (
        <Stack gap={10}>
          <H3>P1 and P2</H3>
          <Table
            headers={["Industry", "Credit", "Rating", "Digital", "Policy", "Payment", "ODR", "EMI", "Outcomes"]}
            rows={high.map((row) => [
              row.name,
              String(row.tools.credit), String(row.tools.rating), String(row.tools.digital), String(row.tools.policy),
              String(row.tools.payment), String(row.tools.odr), String(row.tools.emi), String(row.tools.outcomes),
            ])}
            striped
          />
          <H3>P3 and P4</H3>
          <Table
            headers={["Industry", "Capital", "Schemes", "Lender", "Market", "Map", "Friction", "Scorecard", "Compliance"]}
            rows={high.map((row) => [
              row.name,
              String(row.tools.capital), String(row.tools.schemes), String(row.tools.lender), String(row.tools.market),
              String(row.tools.map), String(row.tools.friction), String(row.tools.scorecard), String(row.tools.compliance),
            ])}
            striped
          />
        </Stack>
      )}
      {view === "play" && (
        <Stack gap={8}>
          <Row gap={6} wrap>
            {shown.map((row) => (
              <Pill key={row.id} size="sm" active={selected?.id === row.id} onClick={() => setSelectedId(row.id)}>
                {row.name}
              </Pill>
            ))}
          </Row>
          {selected && (
            <Stack gap={8}>
              <H2>{selected.name}</H2>
              <Text weight="semibold">{selected.problem}</Text>
              <Text>{selected.intervene}</Text>
              <Table
                headers={["Tool", "Score", "Call"]}
                columnAlign={["left", "right", "left"]}
                rows={TOOLS.map((tool) => {
                  const value = selected.tools[tool.key];
                  const call = value >= 4 ? "Activate" : value === 3 ? "Later" : "Skip";
                  return [`${tool.pillar} · ${tool.name}`, String(value), call];
                })}
                striped
              />
              <Callout tone="info">{selected.justify}</Callout>
              <Text size="small" tone="secondary">{selected.sources}</Text>
              <Text size="small">Outside the charter: {selected.out}</Text>
              <Text size="small" weight="semibold">{selected.action}</Text>
            </Stack>
          )}
        </Stack>
      )}
      <Divider />
      <Text tone="tertiary" size="small">
        Scores are judgement on tool fit against the membership brochure of 17 October 2026, not a statutory index. Rank is not the year-1 pick. Medical devices leads. Footwear is second. Food attaches to the existing demo. Pack and BMS is the new centre beside it. White goods attaches to the annex. Logistics and toys stay High and wait unless a sixth slot is funded.
      </Text>
    </Stack>
  );
}
