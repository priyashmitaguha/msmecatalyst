#!/usr/bin/env python3
"""Build the Cluster Selection Brief from the two canvases.

Word is the editable master. The PDF is a WeasyPrint print of the same blocks.
Scores are recomputed in charter_intervention_scores.py. Do not hand-edit the outputs.
"""

from __future__ import annotations

import json
from pathlib import Path

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_LINE_SPACING
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor
from weasyprint import HTML

from charter_intervention_scores import TOOL_KEYS, rank_rows

ROOT = Path(__file__).resolve().parent
CANVAS_A = ROOT / "canvases" / "new-industry-cluster-map.canvas.tsx"
CANVAS_B = ROOT / "canvases" / "charter-intervention-rank.canvas.tsx"
DOCX_PATH = ROOT / "Industry-Types-and-Clusters.docx"
PDF_PATH = ROOT / "Industry-Types-and-Clusters.pdf"

DATE = "5 November 2026"
FOOTER = f"MSME Catalyst · Cluster selection brief · {DATE}"
NAVY = RGBColor(0x0B, 0x25, 0x45)
NAVY_HEX = "0B2545"
ZEBRA = "F4F7FB"

STR_FIELDS = [
    "id", "name", "funded", "participants", "participantKind", "ancillaries",
    "activity", "geo", "mode", "icam", "why", "hs4", "exportFy25", "exportUnits",
    "turnover", "turnSplit", "employees", "vintage", "large", "expLarge",
    "med200", "expMed200", "med100", "expMed100", "small", "micro", "mfi",
    "lending", "insurance", "vcpe", "bandNote",
]

FIELD_LABELS = [
    ("id", "Id"),
    ("name", "Industry"),
    ("funded", "Funded or newly gated wave"),
    ("participants", "Participants"),
    ("participantKind", "What was counted"),
    ("ancillaries", "Ancillaries (the MSME ring)"),
    ("activity", "Activity (manufacturing vs services)"),
    ("geo", "Geography"),
    ("mode", "Mode"),
    ("icam", "ICAM status"),
    ("fit", "Cluster-shape fit (1–5)"),
    ("why", "Why this fit"),
    ("hs4", "HS-4 / services note"),
    ("exportFy25", "FY2024–25 export"),
    ("exportUnits", "Exporting units"),
    ("turnover", "Gross turnover"),
    ("turnSplit", "Domestic vs export turnover"),
    ("employees", "Employees"),
    ("vintage", "Vintage of the wave"),
    ("large", "Large, above ₹500 crore (count)"),
    ("expLarge", "Export-ready, Large"),
    ("med200", "Medium, ₹200–500 crore (count)"),
    ("expMed200", "Export-ready, Medium ₹200–500"),
    ("med100", "Medium, ₹100–200 crore (count)"),
    ("expMed100", "Export-ready, Medium ₹100–200"),
    ("small", "Small, ₹10–100 crore (count)"),
    ("micro", "Micro, at or below ₹10 crore (count)"),
    ("mfi", "MFI on Micro"),
    ("lending", "Specific lending programmes"),
    ("insurance", "Specific insurance coverage"),
    ("vcpe", "Venture capital and private equity"),
    ("bandNote", "Band method"),
]

TOOL_NAME = {
    "credit": "Credit Ki Kaksha",
    "rating": "Rating Ki Kaksha",
    "digital": "Digital Dost",
    "policy": "Policy & program readiness",
    "payment": "Cluster-led payment support",
    "odr": "ODR recovery pathway",
    "emi": "Business EMI protection",
    "outcomes": "Recovery & repayment outcomes",
    "capital": "Capital pathways",
    "schemes": "Policies & support",
    "lender": "Lender pathways",
    "market": "Market access",
    "map": "Cluster mapping",
    "friction": "Readiness & friction research",
    "scorecard": "Scorecards & dashboards",
    "compliance": "Compliance intelligence",
}

TOOL_JOB = {
    "credit": "Credit literacy, cash-flow management and documentation for lender assessment.",
    "rating": "Financial discipline, governance and rating-improvement clinics.",
    "digital": "Application quality, document completion and follow-through.",
    "policy": "Eligibility, documentation and voluntary registration for public programmes.",
    "payment": "Recurring delays, buyer friction and priority cases.",
    "odr": "Case preparation, mediation or conciliation, then the statutory route.",
    "emi": "Early-stage concept. Score the need to explore it, not a product launch.",
    "outcomes": "Recovery days, case outcomes, recurring buyer friction and repayment continuity.",
    "capital": "Working capital matched to the cash cycle; readiness for debt, equity, SME IPO or bonds.",
    "schemes": "Make central, state and sector support usable before an application is filed.",
    "lender": "Enterprise readiness, then the right lender channel and product.",
    "market": "Buyer linkages and technology access that make revenue and creditworthiness visible.",
    "map": "Anchors, buyers, segments, technology gaps, cash cycles and shared constraints.",
    "friction": "Where enterprises drop out of market, finance, payment and formalisation.",
    "scorecard": "Capability, receivables, access, inclusion and growth outcomes.",
    "compliance": "Registration and invoice-settlement disclosure, and the bottlenecks a statute does not remove.",
}

PILLAR_OF = {}
for key in TOOL_KEYS[0:4]:
    PILLAR_OF[key] = "P1"
for key in TOOL_KEYS[4:8]:
    PILLAR_OF[key] = "P2"
for key in TOOL_KEYS[8:12]:
    PILLAR_OF[key] = "P3"
for key in TOOL_KEYS[12:16]:
    PILLAR_OF[key] = "P4"

ICAM_ORDER = {"New candidate": 0, "Phase II": 1, "Demo": 2}

SOURCES = [
    "Canvas A, new-industry-cluster-map.canvas.tsx. This is the industry register for this brief: participants, geography, activity, turnover shape, export mix and the finance stack.",
    "Canvas B, charter-intervention-rank.canvas.tsx. Tool scores, delivery, additionality, the action line, and the per-industry justify and sources fields.",
    "MSME Catalyst charter brochure, 17 October 2026. A Capability Centre does not lend, underwrite, adjudicate, allocate leads, or operate an ODR platform.",
    "ICAM v4, Chapter 8 (the Capability Centre) and Chapter 18 (digital members and partners). Closed demo list: defence, drones, appliances (white goods and furniture), food. Closed Phase II list: electronics, ev, solar, it, healthtech, edtech, logistics, fintech. Technical textiles are the new textile wave. The older textiles and apparel demonstration is not a 31st row.",
    "TradeStat and DGCIS. Merchandise values. TradeStat publishes values, not exporter counts. FY2024–25 merchandise exports: USD 437.42 billion.",
    "PIB, FY2024–25 services exports: USD 383.51 billion. Services sit in the services account. They have no HSN.",
    "PIB and DGCIS, FY2024–25 goods: electronics USD 38.58 billion; engineering USD 116.67 billion; pharma USD 30.47 billion.",
    "EPCMD and DGCIS: medical devices exports USD 4.02 billion in FY2024–25. Healthtech must not be added to this figure.",
    "Pharmexcil: bulk drugs USD 4.87 billion; AYUSH and herbals USD 688.89 million. These are not the medical-device number.",
    "CLE and IBEF: leather, footwear and goods export ₹48,667 crore; sector turnover about ₹1.62 lakh crore; about 42 lakh employees; about 15,000 footwear units; 2,868 CLE members. Members and units are different counts.",
    "MeitY and Rajya Sabha: electronics production ₹11.32 lakh crore; export ₹3.26 lakh crore (about 29 percent export and 71 percent domestic); more than 300 mobile units; about 25 lakh jobs. PLI LSEM: 1,30,330 direct jobs to June 2025; 32 LSEM companies. Smartphones of about USD 24.84 billion sit inside HS 8517 as 85171300.",
    "PIB defence. Production ₹1,50,590 crore (9 August 2025). Export ₹23,622 crore (about 16 percent export and 84 percent domestic). 1,762 export authorisations. Exporter count up 17.4 percent, with no headcount published. About 16,000 MSMEs, and 788 licences to 462 companies, are not the same population. iDEX, February 2025: 619 startups and MSMEs, 430 contracts.",
    "India Semiconductor Mission: 10 plants, six states, about ₹1.6 lakh crore committed capital expenditure. That figure is capex, not turnover.",
    "CII and IBEF medical devices: about 700 manufacturers, about 90 percent described as MSME, market ₹1.02 lakh crore in FY2023–24. About 4,000 CDSCO licensed manufacturing sites are a second population and are not added to the 700.",
    "ASI FY2024–25 persons engaged in factories: food 23.61 lakh, textiles 17.57 lakh, motor vehicles 14.80 lakh, pharma 10.92 lakh. Do not add ASI to ASUSE or to a scheme-impact estimate.",
    "DPIIT and PIB: PLI has 806 approvals across 14 sectors.",
    "MoFPI. PMFME: 1,72,707 approved and 59,202 formalised as on 31 December 2025; seed capital reached 3,76,326 SHG members. PLI food: 70 MSMEs directly and 40 contract manufacturers; scheme sales ₹3,80,350 crore. The two schemes are not one loan book.",
    "PLI Auto: 82 applicants, 278 units; determined sales ₹32,879 crore and 48,974 jobs to 30 September 2025. FAME-II outlay ₹6,559 crore. PM E-DRIVE ₹10,900 crore from 1 October 2024.",
    "Drone PLI: 23 firms; combined sales ₹319 crore in FY2021–22 (PIB, 6 July 2022). PIB, 26 July 2024: 48 manufacturing companies with type-certified models. Do not borrow the Namo Drone Didi SHG population into this row.",
    "PLI White Goods: 84 companies; intended investment ₹10,478 crore. The Noida–Hapur annex of about 4,500 MSMEs is the cohort used for the white-goods row.",
    "ALMM: 100 manufacturers and 123 units listed at about 100 GW. That is a module list, not a cluster census of installers.",
    "Toys. HS 9503: USD 169.46 million in FY2024–25. Chapter 95 as a whole: USD 570.95 million. The toy row uses 9503. Chapter 95 is wider.",
    "National Technical Textiles Mission: technical-textile exports ₹24,732.68 crore in FY2024–25.",
    "Gazette of India, S.O. 1364(E), 21 March 2025, in force 1 April 2025. Micro at or below ₹10 crore (investment ceiling ₹2.5 crore). Small ₹10–100 crore (investment ceiling ₹25 crore). Medium is split: ₹100–200 crore and ₹200–500 crore (investment ceiling ₹125 crore). Large is above ₹500 crore and is outside MSME. The old ₹50–200 slice is remapped: ₹50–100 sits inside Small and ₹100–200 inside Medium.",
    "S.O. 2119(E), as amended. Udyam turnover excludes exports, so a heavy exporter can sit in a lower Udyam class than the gross bands used here.",
    "Horizontal credit instruments, named where a row uses them: CGTMSE (a credit guarantee, not insurance), MUDRA, TReDS, SIDBI, and ECGC where the firm itself exports. Business EMI protection is a need to explore. It is not a product the centre sells.",
    "Lines that are not used as the industry’s own export. HS 8802 is aircraft, not small satellites. HS 8507 is mostly lead-acid batteries, not advanced chemistry cells. HS 2207 is not the ethanol-blending story. Farm-machinery export is not agri-tech turnover.",
]


def extract_array(text: str, const_name: str):
    marker = text.find(f"const {const_name}")
    if marker < 0:
        raise SystemExit(f"missing const {const_name}")
    eq = text.find("= [", marker)
    if eq < 0:
        raise SystemExit(f"missing '= [' after {const_name}")
    end = text.find("\n];", eq)
    if end < 0:
        raise SystemExit(f"missing newline-]; close after {const_name}")
    blob = text[eq + 2 : end] + "]"
    return json.loads(blob)


def load():
    industries = extract_array(CANVAS_A.read_text(encoding="utf-8"), "INDUSTRIES")
    raw = extract_array(CANVAS_B.read_text(encoding="utf-8"), "RAW")
    if len(industries) < 20:
        raise SystemExit(f"industry count {len(industries)} is below 20")
    if len(raw) != 31 or len(industries) != 31:
        raise SystemExit(f"expected 31 and 31, got industries {len(industries)} and rank rows {len(raw)}")
    for row in industries:
        for field in STR_FIELDS:
            value = row.get(field, "")
            if not isinstance(value, str) or not value.strip():
                raise SystemExit(f"{row.get('id')} empty field {field}")
        if not isinstance(row.get("fit"), (int, float)):
            raise SystemExit(f"{row['id']} missing fit")
        pct = row.get("bandPct") or []
        if len(pct) != 5 or sum(pct) != 100:
            raise SystemExit(f"{row['id']} bandPct {pct}")
    for row in raw:
        if set(row.get("tools") or {}) != set(TOOL_KEYS):
            raise SystemExit(f"{row.get('id')} does not have the 16 tools")
        for field in ("justify", "sources", "problem", "intervene", "out", "action", "name"):
            if not str(row.get(field, "")).strip():
                raise SystemExit(f"{row.get('id')} empty {field}")
    by_id = {row["id"]: row for row in industries}
    if set(by_id) != {row["id"] for row in raw}:
        raise SystemExit("Canvas A and Canvas B ids differ")
    ranked = rank_rows(raw)
    for row in ranked:
        row["industry"] = by_id[row["id"]]
    return industries, ranked


def joined(keys):
    return ", ".join(TOOL_NAME[key] for key in keys) if keys else "None"


def call_line(row):
    return (
        f"Activate: {joined(row['activate'])}. "
        f"Later: {joined(row['later'])}. "
        f"Skip: {joined(row['skip'])}."
    )


def band_share(row):
    labels = ["Large", "Medium ₹200–500", "Medium ₹100–200", "Small", "Micro"]
    pct = row["bandPct"]
    return "; ".join(f"{label} {pct[i]}%" for i, label in enumerate(labels))


class Brief:
    def __init__(self):
        self.blocks = []

    def h(self, level, text, profile=False):
        self.blocks.append(("h", level, text, profile))

    def p(self, text):
        self.blocks.append(("p", text))

    def ul(self, items):
        self.blocks.append(("ul", items))

    def table(self, headers, rows, font=8):
        self.blocks.append(("table", headers, rows, font))

    def note(self, text):
        self.blocks.append(("note", text))


def build_brief(industries, ranked):
    by_id = {row["id"]: row for row in ranked}
    new = [row for row in industries if row["icam"] == "New candidate"]
    phase = [row for row in industries if row["icam"] == "Phase II"]
    demo = [row for row in industries if row["icam"] == "Demo"]
    priority = sorted(
        [row for row in new if row["fit"] >= 4],
        key=lambda row: (-row["fit"], row["name"]),
    )
    register = sorted(industries, key=lambda row: (ICAM_ORDER[row["icam"]], -row["fit"], row["name"]))
    high = [row for row in ranked if row["tier"] == "High"]
    rest = [row for row in ranked if row["tier"] != "High"]
    activity = {label: sum(1 for row in industries if row["activity"] == label) for label in ("Manufacturing", "Services", "Both")}

    brief = Brief()
    brief.note("INDIA CLUSTER ACCELERATION MISSION")
    brief.h(1, "Cluster Selection Brief")
    brief.p(
        "Three sections. Section 1 records who sits in each industry. "
        "Section 2 scores the sixteen brochure tools. Section 3 picks five year-1 vehicles. "
        "Rank is not the pick."
    )
    brief.p(
        f"MSME Catalyst · Working paper for Gate-1 Capability Centre selection · {DATE} · "
        "Sources are the two canvases named in section 1.7, plus the official series listed there. "
        "Word is the master. The PDF is the print copy. Desk date is 5 November 2026 (Asia/Kolkata). "
        "The export year is FY2024–25."
    )
    brief.table(
        ["Section", "Question", "Source"],
        [
            ["1. Identified clusters", "Who is in the industry, and does it have a cluster shape?", "Canvas A. Fit is the cluster-shape score, 1 to 5."],
            ["2. Charter rank", "How badly does this industry need the sixteen tools?", "Canvas B. Overall is the charter score. It is not fit."],
            ["3. Year-1 pick", "Where does one year of centre capacity go?", "Both canvases. Five vehicles. Three new centres and two attachments."],
        ],
        font=9,
    )
    brief.p(
        "Cluster-shape fit and the charter score are kept apart on purpose. A thick Micro and Small tail can still be a poor charter fit, "
        "and a high charter score can still be delivered as an attachment to a centre that already exists. "
        "Fintech, edtech, cybersecurity and green hydrogen are out of charter even when the arithmetic would leave them on Watch."
    )

    brief.h(1, "1. Identified clusters, methodology and data")
    brief.h(2, "1.1 Methodology")
    brief.p(
        "The universe is 31 industry types that were funded or newly gated between 2011 and 2026. "
        "The ids are stable. They are the same on both canvases. This paper does not add a 32nd type, and it does not reopen the older textiles and apparel demonstration as a separate row. "
        "Technical textiles are the new textile wave."
    )
    brief.p(
        "ICAM status is a closed list, not a judgement made in this paper. "
        f"Demonstration ({len(demo)}): defence, drones, white goods and furniture, and food. "
        f"Named Phase II ({len(phase)}): electronics, electric vehicles, solar, IT and ITeS, healthtech, edtech, logistics, and fintech. "
        f"Everything else is a new candidate ({len(new)}). "
        "A demonstration or a named Phase II type is not briefed as a new discovery. Where one of those types is still the right year-1 use of the charter, the form is an attachment."
    )
    brief.p(
        "Participants are a unit of count, and the unit is named on each row. A member list, a licence list, a scheme-approval list and a factory list are not added together. "
        "Geography is the belt a centre could actually sit in. Mode is Traditional, Digital or Hybrid. "
        "Activity is Manufacturing, Services, or Both. It is not a manufacturing-versus-export flag. Export is a separate field."
    )
    brief.p(
        "Ancillaries are the MSME ring around the anchor: the pack assembler, the mould shop, the converter, the authorised recycler, the installer. "
        "The centre serves that ring. It does not serve the PLI plant, the fab, the OEM, the DPSU, the hospital chain or the data-centre operator as the cohort."
    )

    brief.h(2, "1.2 How the numbers were built")
    brief.ul([
        "TradeStat and DGCIS publish export values. They do not publish a count of exporters. Where an exporter headcount is not in a primary release, the cell says n.p.",
        "Size bands follow Gazette S.O. 1364(E), 21 March 2025, in force 1 April 2025. Micro is at or below ₹10 crore. Small is ₹10–100 crore. Medium is split into ₹100–200 crore and ₹200–500 crore. Large is above ₹500 crore and sits outside MSME. Investment ceilings are ₹2.5 crore, ₹25 crore and ₹125 crore.",
        "The old single ₹50–200 crore slice is remapped. ₹50–100 sits inside Small. ₹100–200 sits inside Medium.",
        "Udyam turnover excludes exports under S.O. 2119(E) as amended. A heavy exporter can therefore sit in a lower Udyam class than the gross band used here. The bands in this paper are gross-turnover shapes.",
        "Export-ready counts are attempted only for Large, Medium ₹200–500 and Medium ₹100–200. Where the count is not published, the cell is n.p. or n.a. Small and Micro do not carry an export-ready column.",
        "Unit share is not turnover share. A bar that is 70 percent Micro can still be a small share of sales.",
        "Services have no HSN. Their exports sit in the services account (USD 383.51 billion in FY2024–25), not in a TradeStat goods line.",
        "Each row carries four finance lines: MFI on the Micro band, specific lending programmes, specific insurance, and venture capital or private equity. CGTMSE is a guarantee. It is not insurance. Business EMI protection is a need to explore. It is not a product.",
        "Vintage is the date of the new wave (the scheme, the rule, the gate), not the age of the oldest firm. Capacity and capital expenditure are not sales. The semiconductor ₹1.6 lakh crore is committed capex and is labelled that way.",
        "Band counts are reconstructed and say so in the band method. They are not a GSTN extract and not an MCA census. Official published figures stay in the participant, turnover, export and employee fields.",
    ])

    brief.h(2, "1.3 Snapshot")
    brief.table(
        ["Item", "Figure"],
        [
            ["Industry types", "31"],
            ["New candidates", str(len(new))],
            ["New candidates with cluster-shape fit 4 or 5", str(len(priority))],
            ["Named Phase II", str(len(phase))],
            ["Demonstration", str(len(demo))],
            ["Activity", f"Manufacturing {activity['Manufacturing']}; Services {activity['Services']}; Both {activity['Both']}"],
            ["Merchandise exports, FY2024–25", "USD 437.42 billion (PIB / DGCIS)"],
            ["Services exports, FY2024–25", "USD 383.51 billion (PIB)"],
            ["Electronics goods exports, FY2024–25", "USD 38.58 billion"],
            ["Medical device exports, FY2024–25", "USD 4.02 billion (EPCMD / DGCIS)"],
            ["PLI approvals", "806 across 14 sectors"],
        ],
        font=9,
    )
    brief.p(
        "The medtech export and the electronics export are official goods values. "
        "They are not a count of firms, and they are not added to each other. "
        "Healthtech services are a different row and do not reuse the USD 4.02 billion."
    )

    brief.h(2, "1.4 Cluster-shape rule")
    brief.p(
        "Fit, scored 1 to 5 on Canvas A, asks whether a Capability Centre has a cohort to stand in. "
        "A type clears the shape test when three things are true together: a thick Micro and Small tail, a visible offtake (a buyer who pays an invoice), and a geography tight enough to staff. "
        "A single plant, a fab, a melt shop or a hydrogen facility is an anchor. It can pull a map. It is not itself the cluster. "
        "A digital type (IT, AVGC, geospatial, cybersecurity, edtech, fintech, healthtech) is a Chapter 18 member or delivery partner, not a park."
    )
    brief.p(
        "Fit does not enter the charter formula. A fit of 5 can still be a reserve or an attachment. A fit of 3 can still score High on tools and still be the wrong year-1 centre. Section 3 uses both numbers and does not average them."
    )

    brief.h(2, "1.5 Priority new candidates (fit 4 or 5)")
    brief.p(
        f"{len(priority)} new candidates clear fit 4 or 5. Demonstration and Phase II rows are left out of these four tables even when their fit is high. "
        "Charter rank is section 2. These tables answer only the cluster-shape question."
    )
    brief.h(3, "Identity, export and scale")
    brief.table(
        ["Type", "Fit", "HS-4", "FY25 export", "Participants", "Gross turnover", "Employees", "Vintage"],
        [
            [
                row["name"], str(row["fit"]), row["hs4"], row["exportFy25"], row["participants"],
                row["turnover"], row["employees"], row["vintage"],
            ]
            for row in priority
        ],
        font=7,
    )
    brief.h(3, "Activity, turnover split, Micro and MFI")
    brief.table(
        ["Type", "Activity", "Domestic vs export", "Micro ≤ ₹10 cr", "MFI on Micro"],
        [[row["name"], row["activity"], row["turnSplit"], row["micro"], row["mfi"]] for row in priority],
        font=7,
    )
    brief.h(3, "Upper bands and export-ready counts")
    brief.table(
        ["Type", "Large > ₹500", "Medium ₹200–500", "Medium ₹100–200", "Small ₹10–100"],
        [
            [
                row["name"],
                f"{row['large']} · export-ready {row['expLarge']}",
                f"{row['med200']} · export-ready {row['expMed200']}",
                f"{row['med100']} · export-ready {row['expMed100']}",
                row["small"],
            ]
            for row in priority
        ],
        font=7,
    )
    brief.p("Export-ready cells are n.p. where no primary count was found. They are not inferred from the export value.")
    brief.h(3, "Lending, insurance and venture capital")
    brief.table(
        ["Type", "Lending programmes", "Insurance cover", "VC / PE"],
        [[row["name"], row["lending"], row["insurance"], row["vcpe"]] for row in priority],
        font=7,
    )

    brief.h(2, "1.6 Full register — all 31 types")
    brief.p(
        "Sorted as new candidates, then named Phase II, then demonstration, and within each group by cluster-shape fit and then by name. "
        "Every Canvas A field is in the table. Fit in this section is the cluster-shape score. It is not the charter score in section 2."
    )
    for row in register:
        brief.h(3, f"{row['name']}  ·  {row['icam']}  ·  fit {row['fit']}", profile=True)
        fields = [[label, str(row[key])] for key, label in FIELD_LABELS]
        fields.append(["Unit share of the reconstructed pyramid", band_share(row) + ". Share of units, not share of turnover."])
        brief.table(["Field", "Value"], fields, font=8)

    brief.h(2, "1.7 Data references")
    brief.p(
        "Official numbers below stay official. Reconstructed band counts and export-ready counts stay inside the row that labels them. "
        "A source is added when a row uses a series. None of the official series below is dropped to shorten the page."
    )
    brief.ul([f"{i}. {text}" for i, text in enumerate(SOURCES, start=1)])

    brief.h(1, "2. Charter alignment ranking")
    brief.h(2, "2.1 The sixteen tools")
    brief.p(
        "The brochure of 17 October 2026 organises the work in four pillars. "
        "Pillar 1 is enterprise readiness before a file reaches a lender. "
        "Pillar 2 is the cash cycle after an invoice exists: payment friction, recovery and repayment continuity. "
        "Pillar 3 is capital, schemes, the lender route and market access. "
        "Pillar 4 is the intelligence the centre keeps: the map, the drop-off, the scorecard and compliance. "
        "The enterprise stage the centre is built for is the MSME that already sells, or is ready to sell, into a named offtake. "
        "The Gate-1 delivery test is whether that work can be stood up in year 1 as a new centre or as an attachment, without the centre becoming a lender, an insurer, a court or a lead allocator."
    )
    brief.table(
        ["Pillar", "Tool", "Brochure job"],
        [[PILLAR_OF[key], TOOL_NAME[key], TOOL_JOB[key]] for key in TOOL_KEYS],
        font=8,
    )

    brief.h(2, "2.2 Scoring method")
    brief.p(
        "Each tool is scored 1 to 5. A score of 4 or 5 is Activate in year 1. A score of 3 is Later. A score of 1 or 2 is Skip. "
        "A High-need industry may still Skip tools. Business EMI protection is scored as the need to explore a cover for the instalment, not as a product to launch."
    )
    brief.p(
        "A pillar score is the mean of its four tools. "
        "Overall = P1 × 18% + P2 × 24% + P3 × 18% + P4 × 14% + delivery × 16% + additionality × 10%. "
        "Delivery asks whether a year-1 centre, or an attachment to a demo or annex that already exists, can actually be formed. "
        "Additionality asks what the centre would add that the scheme, the council or the buyer does not already do."
    )
    brief.table(
        ["Overall", "Tier", "Reading"],
        [
            ["4.00 and above", "High", "Year-1 intervene, or attach. Rank still does not decide the five."],
            ["3.00 to below 4.00", "Medium", "Next wave or Phase II. Not a year-1 centre."],
            ["2.00 to below 3.00", "Watch", "Absorb, map only, or wait for offtake."],
            ["Below 2.00", "Out of charter", "Not a cohort."],
        ],
        font=9,
    )
    brief.p(
        "After the arithmetic, four types are forced Out of charter: fintech, edtech, cybersecurity and green hydrogen. "
        "Their tool scores are still printed, so a reader can see the arithmetic that was overridden."
    )

    brief.h(2, "2.3 Ranked list")
    brief.p("Need is the overall score, to three decimals. Activate is the count of tools scored 4 or 5. ICAM status is repeated so a High demonstration is not misread as a new centre.")
    brief.table(
        ["Rank", "Industry", "Need", "Tier", "ICAM", "P1", "P2", "P3", "P4", "Activate", "Action"],
        [
            [
                str(row["rank"]),
                row["name"],
                f"{row['overall']:.3f}",
                row["tier"],
                row["icam"],
                f"{row['p1']:.2f}",
                f"{row['p2']:.2f}",
                f"{row['p3']:.2f}",
                f"{row['p4']:.2f}",
                str(len(row["activate"])),
                row["action"],
            ]
            for row in ranked
        ],
        font=7,
    )

    brief.h(2, "2.4 What changes once the tools are scored")
    brief.ul([
        f"Medical devices leads, at {by_id['medtech']['overall']:.3f}. Every tool is 4 or 5. Business EMI protection is 4 and is an explore, not a product.",
        f"Footwear is second, at {by_id['footwear']['overall']:.3f}. The Focus Product Scheme file and the lender route weigh as much as the ODR pathway. A recovery cell without a sanction path leaves the scheme unused.",
        f"Pack, BMS and recycling is {by_id['battery']['overall']:.3f}. Food processing is {by_id['food']['overall']:.3f}. They sit together just above 4.3. Food takes the attachment because the food demonstration already exists. Pack and BMS is the new centre because additionality is 5: nobody is running that MSME ring.",
        f"White goods and furniture is fifth, at {by_id['appliances']['overall']:.3f}, and attaches to the Noida–Hapur annex of about 4,500 MSMEs. It is above the two reserves.",
        f"Logistics ({by_id['logistics']['overall']:.3f}) and toys ({by_id['toys']['overall']:.3f}) stay High. They are reserves, not year-1 centres, unless a sixth slot is funded.",
        f"Nutraceuticals ({by_id['nutra']['overall']:.3f}) and electronics components ({by_id['electronics']['overall']:.3f}) sit just below High. They are the top of the next wave.",
        "E-waste is Medium. Mapping, Digital Dost and CPCB compliance intelligence Activate. ODR and Business EMI protection Skip until the unit is formal enough to hold a receivable.",
        "Semiconductor ancillaries are Watch. Only cluster mapping and friction research Activate, and only until a fab offtake exists. The plants themselves are not the cohort.",
        "Fintech, edtech, cybersecurity and green hydrogen are Out of charter by rule. Green hydrogen’s arithmetic is also below 2. The other three are excluded even where a pillar would have left them on Watch.",
    ])

    brief.h(2, "2.5 Tool heat — High-need types")
    brief.p("Scores are 1 to 5. The table is split so a page can hold it. High-need here means the tier, including the two reserves.")
    brief.h(3, "Pillars 1 and 2")
    brief.table(
        ["Industry", "Credit", "Rating", "Digital", "Policy", "Payment", "ODR", "EMI", "Outcomes"],
        [
            [
                row["name"],
                str(row["tools"]["credit"]), str(row["tools"]["rating"]), str(row["tools"]["digital"]), str(row["tools"]["policy"]),
                str(row["tools"]["payment"]), str(row["tools"]["odr"]), str(row["tools"]["emi"]), str(row["tools"]["outcomes"]),
            ]
            for row in high
        ],
        font=8,
    )
    brief.h(3, "Pillars 3 and 4")
    brief.table(
        ["Industry", "Capital", "Schemes", "Lender", "Market", "Map", "Friction", "Scorecard", "Compliance"],
        [
            [
                row["name"],
                str(row["tools"]["capital"]), str(row["tools"]["schemes"]), str(row["tools"]["lender"]), str(row["tools"]["market"]),
                str(row["tools"]["map"]), str(row["tools"]["friction"]), str(row["tools"]["scorecard"]), str(row["tools"]["compliance"]),
            ]
            for row in high
        ],
        font=8,
    )

    brief.h(2, "2.6 Playbook — every High-need type")
    brief.p("One sub-section per High-need type, in rank order. Why these scores is the justify field. Corroborating sources is the sources field. Neither is a restatement of the problem line.")
    for row in high:
        write_play(brief, row)

    brief.h(2, "2.7 Medium, Watch and Out of charter")
    brief.p(
        "This is the evidence trail for types that are not year-1 High. It is not a second ranking. "
        "The summary repeats rank, need and action so a reader can find the row, and the narrative under each name is the reason."
    )
    brief.table(
        ["Rank", "Industry", "Need", "Tier", "ICAM", "Action"],
        [
            [str(row["rank"]), row["name"], f"{row['overall']:.3f}", row["tier"], row["icam"], row["action"]]
            for row in rest
        ],
        font=7,
    )
    for row in rest:
        write_play(brief, row)

    brief.h(1, "3. Recommendation: five clusters to pick")
    brief.p(
        "Pick is not rank. Rank says how badly the charter is needed. Pick says where one year of centre capacity goes. "
        "The rule is: start from the highest need scores, then choose the delivery form the brochure allows. "
        "A new Capability Centre is opened only where no ICAM vehicle exists. An attachment is used where a demonstration or an annex is already designed."
    )
    brief.p(
        f"Food ({by_id['food']['overall']:.3f}) and pack, BMS and recycling ({by_id['battery']['overall']:.3f}) are the close pair. "
        "Food is the attachment. Pack and BMS is the new centre. White goods is fifth on need and is still inside the five because the annex can take the work. "
        "Logistics and toys remain High and stay in reserve."
    )
    brief.table(
        ["Pick", "Cluster", "Need (rank)", "Form", "Where", "Charter emphasis"],
        [
            [
                "1",
                "Medical devices",
                f"{by_id['medtech']['overall']:.3f} (rank {by_id['medtech']['rank']})",
                "New Capability Centre",
                "AMTZ Visakhapatnam spoke, or Greater Noida / Kanchipuram. One belt.",
                "Licence and lender files, hospital and PSU recovery files, CDSCO compliance intelligence.",
            ],
            [
                "2",
                "Footwear (non-leather and sports)",
                f"{by_id['footwear']['overall']:.3f} (rank {by_id['footwear']['rank']})",
                "New Capability Centre",
                "Ambur–Ranipet, or Agra. One belt.",
                "Focus Product Scheme and CLE files, the lender route, and brand ODR.",
            ],
            [
                "3",
                "Food processing (PLI wave)",
                f"{by_id['food']['overall']:.3f} (rank {by_id['food']['rank']})",
                "Attach to the existing food demonstration",
                "Inside the food demo. No second park.",
                "Retail and quick-commerce payment cell, FPO Credit Kaksha, unused-scheme desk.",
            ],
            [
                "4",
                "ACC pack, BMS and recycling",
                f"{by_id['battery']['overall']:.3f} (rank {by_id['battery']['rank']})",
                "New Capability Centre",
                "The MSME pack, BMS and recycling ring. Not the PLI-ACC plants.",
                "Map the ring, OEM goods-receipt receivables, working capital matched to cell-to-pack.",
            ],
            [
                "5",
                "White goods and furniture",
                f"{by_id['appliances']['overall']:.3f} (rank {by_id['appliances']['rank']})",
                "Attach to the existing annex",
                "Noida–Hapur annex, about 4,500 MSMEs.",
                "Brand goods-receipt ODR, and BIS Rating Kaksha, on the annex buyer panel.",
            ],
        ],
        font=7,
    )
    brief.p("Year-1 slate at a glance: three new centres (medical devices, footwear, pack and BMS) and two attachments (food, white goods).")

    write_pick(brief, by_id["medtech"], "1", "New Capability Centre",
               "AMTZ Visakhapatnam spoke, or the Greater Noida / Kanchipuram licensed-site belt. Pick one belt in the first month. Do not staff both.",
               "This is the highest charter need, and there is no ICAM vehicle to attach to. Every tool is Activate. The cohort is the licensed MSME device maker, not the hospital and not the PLI principal. The 700 manufacturers and the 4,000 licensed sites stay as two populations.",
               [
                   "Days 1–30. Choose the belt. Build the working list from licensed MSME sites in that belt only. Keep the CII figure of about 700 manufacturers and the CDSCO figure of about 4,000 sites in separate columns.",
                   "Days 31–60. Stand up the lender file: Credit Kaksha on the cash cycle, Rating Kaksha on the quality-system papers a buyer asks for, and Digital Dost on a complete CDSCO and bank pack. Policy readiness covers the park and PLI windows that actually apply to an MSME, and says clearly which windows do not.",
                   "Days 61–90. Open the payment and recovery file for hospital and PSU buyers where the MSME holds the invoice. Prepare cases. Do not run the ODR platform and do not allocate leads. Write the EMI note as an explore. Compliance intelligence lists the licence conditions that a statute will not clear for the firm.",
               ])
    write_pick(brief, by_id["footwear"], "2", "New Capability Centre",
               "Ambur–Ranipet, or Agra. Pick one belt. The other belt is a later spoke, not a second centre.",
               "Footwear is second because the scheme file and the bank file are as important as the brand dispute. The Focus Product Scheme dies when a sanction is not followed through. Footwear is not on the demonstration list and not on the named Phase II list, so the form is a new centre. The cohort is the footwear unit, about 15,000, not the 2,868 CLE members.",
               [
                   "Days 1–30. Choose Ambur–Ranipet or Agra with the state association. Write down the unit universe and the CLE member list as different counts. Do not treat members as the census.",
                   "Days 31–60. Make the Focus Product Scheme and the related CLE instruments usable: eligibility, the papers, and the lender route after a sanction so the approval does not stop at the letter.",
                   "Days 61–90. Payment cell and ODR case preparation for brand goods-receipt delays, limited to micro and small units that hold a formal invoice. Rating Kaksha on the buyer’s quality file. EMI remains an explore.",
               ])
    write_pick(brief, by_id["food"], "3", "Attach to the existing food demonstration",
               "Inside the food demonstration that ICAM already designed. No second park and no new nodal agency.",
               "Food’s need is 4.350, a tenth behind pack and BMS. The demonstration already exists, so year-1 capacity attaches instead of opening a centre. The measurable gap is public: 1,72,707 PMFME approvals and 59,202 formalised, as on 31 December 2025. The payment job is the retail and quick-commerce invoice, which is a different cash cycle from a kitchen that has never invoiced.",
               [
                   "Days 1–30. Sit in the existing demo. Take the approval-to-formalisation gap as the friction list. Do not build a parallel helpdesk to the state nodal agency.",
                   "Days 31–60. Credit Kaksha for the FPO and the micro unit that has a buyer, and a scheme desk that tells a unit which of PMFME and PLI food actually applies. PLI food is not the micro unit’s scheme.",
                   "Days 61–90. Payment cell only for units that invoice retail or quick commerce. Case preparation for those receivables. Leave units with no formal invoice on the formalisation desk.",
               ])
    write_pick(brief, by_id["battery"], "4", "New Capability Centre",
               "The MSME ring that packs cells, builds battery-management systems and recycles. Not the PLI-ACC cell plants.",
               "Need is 4.360 and additionality is 5. The cell plants are anchors with their own incentive. The charter gap is the ring around them: mapping who is real, matching working capital to the cell-to-pack cycle, and preparing OEM goods-receipt cases. HS 8507 is not this industry’s export story and is not used.",
               [
                   "Days 1–30. Map pack, BMS and recycling MSMEs in the belts that actually supply the plants. Put the awarded cell plants in a separate anchor column and leave them out of the cohort.",
                   "Days 31–60. Working-capital pathway matched to the cell-to-pack cycle, and the lender file that follows. Scheme usability for the instruments an MSME packer can actually file.",
                   "Days 61–90. Payment cell and ODR case preparation on OEM goods-receipt delays. Compliance intelligence on waste and recycling authorisations for the recycling side of the ring. Do not brief a TradeStat 8507 number as ACC exports.",
               ])
    write_pick(brief, by_id["appliances"], "5", "Attach to the existing annex",
               "The Noida–Hapur annex, about 4,500 MSMEs, and the buyer panel that annex already has.",
               "White goods is fifth, at 4.165, still above logistics and toys. The demonstration and the annex exist, so the form is an attachment. The work is BIS and energy-rating discipline, and brand goods-receipt delay. Relaunching the demonstration as a new discovery would ignore the annex.",
               [
                   "Days 1–30. Use the annex list. Separate the 84 PLI White Goods companies from the MSME cohort of about 4,500. Confirm which of the 4,500 invoice a brand.",
                   "Days 31–60. Rating Kaksha on BIS and energy-rating files. Credit Kaksha and Digital Dost so the rating file and the bank file are the same pack.",
                   "Days 61–90. Payment cell and ODR case preparation on brand goods-receipts, using the annex buyer panel. Do not administer PLI White Goods and do not plan another industrial estate.",
               ])

    brief.h(2, "What not to pick in year 1")
    brief.ul([
        "No centre on a green-hydrogen plant, a bulk-drug or API plant, a semiconductor fab, or a specialty-steel melt shop. Those are anchors. A one-page map is the most they get.",
        "No fintech, edtech or cybersecurity cluster. Invite firms from those types in as members or delivery partners of the five vehicles.",
        "Do not relaunch the five demonstration sectors, or the named Phase II list, as new discoveries. Food and white goods are inside the five only as attachments.",
        "E-waste, nutraceuticals and electronics components are the next mapping and Phase II wave. E-waste does not get an ODR cell until the unit is formal.",
        "Semiconductor ancillaries get mapping and friction research around Sanand and Dholera, and nothing else, until a fab offtake is real.",
        "Logistics (the Bhiwandi annex) and toys (the Koppal hub and the artisan spokes) are High-need reserves. They become centres only if a sixth slot is funded.",
    ])

    brief.h(2, "Edit log")
    brief.p("Blank for Gate-1 markup. Word is the master. Reprint the PDF after an edit; do not mark the PDF as the source.")
    brief.table(
        ["Date", "Section / cluster", "Change made", "Source", "Initials"],
        [["", "", "", "", ""] for _ in range(6)],
        font=9,
    )
    brief.p(f"{FOOTER}. Fit and the charter score are separate. Reconstructed counts are labelled in each band method.")
    return brief


def write_play(brief, row):
    ind = row["industry"]
    brief.h(
        3,
        f"{row['rank']}. {row['name']}  ·  {row['overall']:.3f}  ·  {row['tier']}",
        profile=True,
    )
    brief.table(
        ["Field", "Value"],
        [
            ["ICAM status", row["icam"]],
            ["Cluster-shape fit (not the charter score)", f"{ind['fit']} — {ind['why']}"],
            ["Activity and geography", f"{ind['activity']}. {ind['geo']}"],
            ["Delivery (1–5)", str(row["delivery"])],
            ["Additionality (1–5)", str(row["add"])],
            ["Pillars", f"P1 {row['p1']:.2f}; P2 {row['p2']:.2f}; P3 {row['p3']:.2f}; P4 {row['p4']:.2f}"],
            ["Measurable problem", row["problem"]],
            ["Tool-level intervention", row["intervene"]],
            ["Outside the charter", row["out"]],
            ["Recommended action", row["action"]],
        ],
        font=8,
    )
    brief.p(call_line(row))
    brief.p("Why these scores. " + row["justify"])
    brief.p("Corroborating sources. " + row["sources"])


def write_pick(brief, row, number, form, where, why, days):
    ind = row["industry"]
    brief.h(2, f"Pick {number}. {row['name']}")
    brief.table(
        ["Field", "Value"],
        [
            ["Need and rank", f"{row['overall']:.3f}, rank {row['rank']}, tier {row['tier']}"],
            ["ICAM status", row["icam"]],
            ["Delivery form", form],
            ["Where", where],
            ["Geography on the register", ind["geo"]],
            ["Participants", ind["participants"]],
            ["FY2024–25 export", ind["exportFy25"]],
            ["HS-4", ind["hs4"]],
            ["Why this pick", why],
            ["Measurable problem", row["problem"]],
            ["Outside the charter", row["out"]],
        ],
        font=8,
    )
    brief.p(call_line(row))
    brief.p("First 90 days.")
    brief.ul(days)


def set_run(run, size=11, bold=False, color=None, italic=False):
    run.font.name = "Calibri"
    run._element.rPr.rFonts.set(qn("w:eastAsia"), "Calibri")
    run.font.size = Pt(size)
    run.bold = bold
    run.italic = italic
    if color is not None:
        run.font.color.rgb = color


def shade(cell, fill):
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), fill)
    tc_pr.append(shd)


def set_cell(cell, text, size, bold, color, fill):
    cell.text = ""
    paragraph = cell.paragraphs[0]
    paragraph.paragraph_format.space_before = Pt(0)
    paragraph.paragraph_format.space_after = Pt(0)
    paragraph.paragraph_format.line_spacing = 1.0
    run = paragraph.add_run("" if text is None else str(text))
    set_run(run, size=size, bold=bold, color=color)
    shade(cell, fill)
    tc_pr = cell._tc.get_or_add_tcPr()
    margins = OxmlElement("w:tcMar")
    for edge in ("top", "left", "bottom", "right"):
        node = OxmlElement(f"w:{edge}")
        node.set(qn("w:w"), "40")
        node.set(qn("w:type"), "dxa")
        margins.append(node)
    tc_pr.append(margins)


def prevent_row_split(row):
    tr_pr = row._tr.get_or_add_trPr()
    cant = OxmlElement("w:cantSplit")
    tr_pr.append(cant)


def add_page_field(paragraph):
    run = paragraph.add_run()
    begin = OxmlElement("w:fldChar")
    begin.set(qn("w:fldCharType"), "begin")
    instr = OxmlElement("w:instrText")
    instr.set(qn("xml:space"), "preserve")
    instr.text = " PAGE "
    end = OxmlElement("w:fldChar")
    end.set(qn("w:fldCharType"), "end")
    run._r.append(begin)
    run._r.append(instr)
    run._r.append(end)
    set_run(run, size=8, color=NAVY)


def render_docx(brief):
    doc = Document()
    normal = doc.styles["Normal"]
    normal.font.name = "Calibri"
    normal.font.size = Pt(11)
    normal.font.color.rgb = RGBColor(0x1A, 0x1A, 0x1A)
    section = doc.sections[0]
    section.page_width = Cm(21.0)
    section.page_height = Cm(29.7)
    section.left_margin = Cm(1.4)
    section.right_margin = Cm(1.4)
    section.top_margin = Cm(1.5)
    section.bottom_margin = Cm(1.6)
    footer = section.footer.paragraphs[0]
    footer.alignment = WD_ALIGN_PARAGRAPH.LEFT
    run = footer.add_run(FOOTER + " · ")
    set_run(run, size=8, color=NAVY)
    add_page_field(footer)
    sizes = {1: 16, 2: 13, 3: 11}
    for kind, *rest in brief.blocks:
        if kind == "h":
            level, text, profile = rest
            paragraph = doc.add_heading(text, level=level)
            paragraph.paragraph_format.space_before = Pt(12 if level < 3 else 8)
            paragraph.paragraph_format.space_after = Pt(4)
            if profile:
                paragraph.paragraph_format.page_break_before = True
            for run in paragraph.runs:
                set_run(run, size=sizes[level], bold=True, color=NAVY)
        elif kind == "p":
            paragraph = doc.add_paragraph()
            paragraph.paragraph_format.space_after = Pt(6)
            paragraph.paragraph_format.space_before = Pt(0)
            paragraph.paragraph_format.line_spacing_rule = WD_LINE_SPACING.SINGLE
            set_run(paragraph.add_run(rest[0]), size=11)
        elif kind == "note":
            paragraph = doc.add_paragraph()
            paragraph.paragraph_format.space_after = Pt(2)
            set_run(paragraph.add_run(rest[0]), size=9, bold=True, color=NAVY)
        elif kind == "ul":
            for item in rest[0]:
                paragraph = doc.add_paragraph(style="List Bullet")
                paragraph.paragraph_format.space_after = Pt(2)
                set_run(paragraph.add_run(item), size=10)
        elif kind == "table":
            headers, rows, font = rest
            table = doc.add_table(rows=1 + len(rows), cols=len(headers))
            table.style = "Table Grid"
            table.autofit = True
            tbl_pr = table._tbl.tblPr
            width = OxmlElement("w:tblW")
            width.set(qn("w:w"), "5000")
            width.set(qn("w:type"), "pct")
            tbl_pr.append(width)
            for index, header in enumerate(headers):
                set_cell(table.rows[0].cells[index], header, font, True, RGBColor(255, 255, 255), NAVY_HEX)
            header_pr = table.rows[0]._tr.get_or_add_trPr()
            repeat = OxmlElement("w:tblHeader")
            header_pr.append(repeat)
            prevent_row_split(table.rows[0])
            for r_index, row in enumerate(rows):
                fill = ZEBRA if r_index % 2 else "FFFFFF"
                for c_index, value in enumerate(row):
                    set_cell(table.rows[r_index + 1].cells[c_index], value, font, False, None, fill)
                prevent_row_split(table.rows[r_index + 1])
            doc.add_paragraph().paragraph_format.space_after = Pt(4)
    doc.core_properties.title = "Cluster Selection Brief"
    doc.core_properties.subject = "MSME Catalyst Gate-1 Capability Centre selection"
    doc.core_properties.category = "India Cluster Acceleration Mission"
    doc.save(DOCX_PATH)


def render_html(brief):
    parts = [
        "<!DOCTYPE html><html lang='en'><head><meta charset='utf-8'>",
        f"<title>Cluster Selection Brief · {DATE}</title>",
        "<style>",
        "@page { size: A4; margin: 14mm 12mm 16mm 12mm;",
        f"@bottom-left {{ content: '{FOOTER}'; font-family: Calibri, Carlito, sans-serif; font-size: 8pt; color: #{NAVY_HEX}; }}",
        "@bottom-right { content: counter(page); font-family: Calibri, Carlito, sans-serif; font-size: 8pt; color: #" + NAVY_HEX + "; }}",
        "body { font-family: Calibri, Carlito, sans-serif; color: #1a1a1a; font-size: 10.5pt; line-height: 1.35; }",
        "h1 { color: #0B2545; font-size: 16pt; margin: 16px 0 6px; }",
        "h2 { color: #0B2545; font-size: 13pt; margin: 14px 0 4px; }",
        "h3 { color: #0B2545; font-size: 11pt; margin: 10px 0 4px; }",
        "h3.profile { break-before: page; }",
        "p { margin: 0 0 8px; }",
        ".kicker { color: #0B2545; font-size: 9pt; font-weight: 700; letter-spacing: 0.08em; margin: 0 0 4px; }",
        "ul { margin: 0 0 8px; padding-left: 18px; } li { margin: 0 0 3px; }",
        "table { border-collapse: collapse; width: 100%; margin: 4px 0 12px; }",
        "th { background: #0B2545; color: white; text-align: left; font-weight: 600; padding: 3px 5px; vertical-align: top; }",
        "td { padding: 3px 5px; vertical-align: top; border-bottom: 0.4pt solid #d5dde8; }",
        "tr:nth-child(even) td { background: #f4f7fb; }",
        "</style></head><body>",
    ]
    for kind, *rest in brief.blocks:
        if kind == "h":
            level, text, profile = rest
            cls = " class='profile'" if profile else ""
            parts.append(f"<h{level}{cls}>{escape(text)}</h{level}>")
        elif kind == "p":
            parts.append(f"<p>{escape(rest[0])}</p>")
        elif kind == "note":
            parts.append(f"<p class='kicker'>{escape(rest[0])}</p>")
        elif kind == "ul":
            parts.append("<ul>" + "".join(f"<li>{escape(item)}</li>" for item in rest[0]) + "</ul>")
        elif kind == "table":
            headers, rows, font = rest
            head = "".join(f"<th style='font-size:{font}pt'>{escape(cell)}</th>" for cell in headers)
            body = []
            for row in rows:
                body.append("<tr>" + "".join(f"<td style='font-size:{font}pt'>{escape(cell)}</td>" for cell in row) + "</tr>")
            parts.append(f"<table><thead><tr>{head}</tr></thead><tbody>{''.join(body)}</tbody></table>")
    parts.append("</body></html>")
    html = "".join(parts)
    HTML(string=html, base_url=str(ROOT)).write_pdf(PDF_PATH)
    return html


def escape(value):
    text = "" if value is None else str(value)
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )


def main():
    industries, ranked = load()
    brief = build_brief(industries, ranked)
    render_docx(brief)
    render_html(brief)
    print(f"parsed industries {len(industries)} rank rows {len(ranked)}")
    print("RANK")
    for row in ranked:
        print(f"{row['rank']:2} {row['overall']:.3f} {row['tier']:<16} {row['id']}")
    print(f"wrote {DOCX_PATH}")
    print(f"wrote {PDF_PATH}")


if __name__ == "__main__":
    main()
