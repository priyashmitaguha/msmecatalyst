#!/usr/bin/env python3
"""Emit Canvas A and Canvas B from the 31-type register. Canvases are what the report parser reads."""

import json
from pathlib import Path

from charter_intervention_scores import (
    P1_KEYS,
    P2_KEYS,
    P3_KEYS,
    P4_KEYS,
    TOOL_KEYS,
    call_for,
    rank_rows,
    score_row,
)

ROOT = Path(__file__).resolve().parent
CANVAS_DIR = ROOT / "canvases"

BAND_RULE = (
    "Reconstructed gross-turnover counts, not a GSTN or MCA census. "
    "Aligned to Gazette S.O. 1364(E), 21 March 2025, in force 1 April 2025: "
    "Micro ≤ ₹10 crore (investment ceiling ≤ ₹2.5 crore), Small ₹10–100 crore (investment ≤ ₹25 crore), "
    "Medium ₹100–200 crore and ₹200–500 crore (investment ≤ ₹125 crore), Large > ₹500 crore (outside MSME). "
    "The old ₹50–200 slice is remapped: ₹50–100 sits in Small and ₹100–200 in Medium. "
    "Udyam turnover excludes exports (S.O. 2119(E) as amended), so a heavy exporter can sit in a lower Udyam class than these gross bands. "
    "Unit share is not turnover share. Export-ready counts are not a TradeStat exporter census."
)

H_LEND = (
    "Horizontal, for an eligible MSME: CGTMSE (a guarantee, not insurance), MUDRA, TReDS, SIDBI, and ECGC where the firm itself exports. "
)


def pcts(nums):
    total = sum(nums)
    raw = [n * 100.0 / total for n in nums]
    floors = [int(x) for x in raw]
    left = 100 - sum(floors)
    order = sorted(range(len(nums)), key=lambda i: (raw[i] - floors[i], nums[i]), reverse=True)
    for i in range(left):
        floors[order[i]] += 1
    return floors


def tools(*vals):
    if len(vals) != 16:
        raise ValueError(len(vals))
    return dict(zip(TOOL_KEYS, vals))


def justify(row, notes):
    scored = score_row(row)

    def leg(title, keys, note, avg):
        bits = ", ".join(f"{k} {row['tools'][k]} {call_for(row['tools'][k])}" for k in keys)
        return f"{title} {avg:.2f} — {bits}. {note}"

    return " ".join(
        [
            leg("P1", P1_KEYS, notes["p1"], scored["p1"]),
            leg("P2", P2_KEYS, notes["p2"], scored["p2"]),
            leg("P3", P3_KEYS, notes["p3"], scored["p3"]),
            leg("P4", P4_KEYS, notes["p4"], scored["p4"]),
            f"Delivery {row['delivery']} — {notes['delivery']}",
            f"Additionality {row['add']} — {notes['add']}",
        ]
    )


# counts: large, med200, med100, small, micro
def bands(counts, exp, universe):
    large, med200, med100, small, micro = counts
    if large + med200 + med100 + small + micro <= 0:
        raise ValueError(universe)
    return {
        "large": str(large),
        "expLarge": exp[0],
        "med200": str(med200),
        "expMed200": exp[1],
        "med100": str(med100),
        "expMed100": exp[2],
        "small": str(small),
        "micro": str(micro),
        "bandPct": pcts(counts),
        "bandNote": universe + " " + BAND_RULE,
    }


INDUSTRIES = []
RAWS = []


def add(ind, raw_notes):
    INDUSTRIES.append(ind)
    row = {
        "id": ind["id"],
        "name": raw_notes["name"],
        "icam": ind["icam"],
        "delivery": raw_notes["delivery"],
        "add": raw_notes["add"],
        "problem": raw_notes["problem"],
        "intervene": raw_notes["intervene"],
        "out": raw_notes["out"],
        "action": raw_notes["action"],
        "tools": raw_notes["tools"],
        "sources": raw_notes["sources"],
    }
    row["justify"] = justify(row, raw_notes["notes"])
    RAWS.append(row)


# ---------------------------------------------------------------------------
# 31 types. Order is the register order; rank is computed later.
# ---------------------------------------------------------------------------

add(
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
        **bands(
            (70, 35, 63, 280, 252),
            (
                "40 reconstructed among the ~70 non-MSME names — not a TradeStat census",
                "12 reconstructed",
                "18 reconstructed",
            ),
            "Universe: the CII/IBEF ~700 manufacturers, of which about 90% are described as MSME. The ~4,000 licensed sites are not this pyramid.",
        ),
        "mfi": "Thin. MUDRA and CGTMSE exist. There is no sector NBFC-MFI book for a licensed device site. SHG and NABARD are not the operating channel.",
        "lending": H_LEND + "Sector: PLI MedTech is an incentive on eligible sales for 28 approved applicants, not a loan to the MSME ring. Park allotment and state medical-device schemes are the usable files. No dedicated MSME device term-loan product was verified.",
        "insurance": "ECGC for the exporter. Product liability and recall are the covers buyers expect; penetration is n.p. Fire and marine are commercial. Hospital and PSU receivables are uninsured. CGTMSE is not a cover.",
        "vcpe": "Moderate on scaled device and diagnostics companies. Thin to none on the mould, pack and disposable MSME ring. Digital-health venture funds are a different industry.",
    },
    {
        "name": "Medical devices",
        "delivery": 5,
        "add": 5,
        "tools": tools(5, 5, 5, 5, 5, 5, 4, 5, 5, 5, 5, 5, 5, 4, 3, 5),
        "problem": "Hospital, PSU and OEM payables run long, and most of the ~700 manufacturers fail CDSCO, BIS and lender files.",
        "intervene": "Year 1, at one park spoke: Credit Kaksha, Rating Kaksha, Digital Dost and programme files on CDSCO/BIS/lender packs; a payment cell and ODR case-prep on hospital and PSU invoices; capital and lender route after the file exists; GeM and hospital-chain linkage; map the 4,000 sites against the 700 manufacturers; compliance intel on CDSCO. EMI is explored, not sold.",
        "out": "Do not finance park buildings, run the PLI plant, or become a notified body.",
        "action": "Year-1 Capability Centre — first new cluster",
        "sources": "CII/IBEF: ~700 manufacturers, ~90% MSME, market ₹1.02 lakh crore FY24. Department of Pharmaceuticals / DGCIS: medtech exports USD 4.02 billion FY25; CDSCO licensed manufacturers about 4,108 and no central production census. PLI MedTech: 28 applicants, outlay ₹3,420 crore. Brochure, 17 October 2026.",
        "notes": {
            "p1": "CII’s MSME share plus CDSCO and BIS gates make every readiness tool a year-1 file, not a poster.",
            "p2": "Hospital, PSU and OEM payables are the brochure receivables case. EMI is 4 because formal bank EMIs already sit on those invoices; it is a concept to explore, not a product.",
            "p3": "Park allotment, PLI and GeM pathways exist and are hard to use. ECGC covers HS 90 exporters. The MSME ring does not see device-company private equity.",
            "p4": "About 4,000 licensed sites versus about 700 manufacturers is an unmapped registry. Compliance intel leads. The scorecard stays Later until the spoke cohort is opted in.",
            "delivery": "Parks already exist at Vizag, Greater Noida and Kanchipuram, so a desk can attach in year 1.",
            "add": "Parks and PLI do not run Kaksha or ODR. That is the gap.",
        },
    },
)

add(
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
        **bands(
            (10, 8, 15, 40, 80),
            (
                "n.a. as exporters — plants are anchors, not the MSME export count",
                "n.a. as exporters",
                "n.a. as exporters",
            ),
            "Universe: a reconstructed ancillary ring of about 150 units around the approved plants, plus the plants themselves in Large. This is a shape sketch, not a factory census.",
        ),
        "mfi": "None typical. Project finance and venture on design houses. No NBFC-MFI or SHG channel.",
        "lending": H_LEND + "Sector: ISM and DLI are fiscal support to approved applicants, not an MSME working-capital line. No dedicated ancillary-MSME product.",
        "insurance": "Construction all-risk and erection on the plants. The ancillary ring has ordinary fire and workmen covers. Receivables from a fab do not exist yet, so they are not insured.",
        "vcpe": "Deep on the approved groups and on a few design startups. None on the cleanroom-trade MSME.",
    },
    {
        "name": "Semiconductors & OSAT ancillaries",
        "delivery": 2,
        "add": 2,
        "tools": tools(3, 2, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 5, 4, 2, 3),
        "problem": "There is no MSME invoice book to repair until a fab offtakes; the register of ancillaries does not exist.",
        "intervene": "This year, only a map of possible ancillaries around Sanand and Dholera and a friction note on who cannot yet sell. Do not staff Kaksha or ODR.",
        "out": "Do not build a fab, staff a plant, or treat design-linked winners as a cluster.",
        "action": "Watch — mapping and friction only",
        "sources": "MeitY, September 2025: 1 fab, 8 OSAT/ATMP, 1 compound fab, 23 design-linked applicants. ISM: 10 plants, six states, about ₹1.6 lakh crore committed capex. Brochure, 17 October 2026.",
        "notes": {
            "p1": "Any future ancillary will need files, but there is no thick tail to teach this year, so readiness stays Later or Skip.",
            "p2": "No recurring MSME buyer delay to staff. All four receivables tools Skip.",
            "p3": "ISM money is on the plant. It is not a scheme-usability job for a ring that is not selling.",
            "p4": "Mapping and friction research are the only Activate tools, until the first fab offtake names a vendor list. A scorecard would be empty.",
            "delivery": "No MSME offtake and no belt that can hold a centre.",
            "add": "ISM and the state industrial corporations already run the plant interface.",
        },
    },
)

add(
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
        **bands(
            (15, 40, 120, 2800, 18025),
            (
                "8 reconstructed named exporters",
                "10 reconstructed",
                "25 reconstructed",
            ),
            "Universe: the 21,000+ Udyam registrations, not the 1,640 BIS licences. Most of this pyramid is Micro. QCO drop-outs may already have left Udyam.",
        ),
        "mfi": "Active on the artisan and SFURTI spokes: MUDRA, PMEGP, state cooperative and PM Vishwakarma-type artisan channels, and some SHG craft finance. Not an NBFC-MFI book for an electric-toy factory.",
        "lending": H_LEND + "Sector: SFURTI is grant infrastructure in 19 clusters, not a revolving loan. No toy-specific NBFC scheme was verified. PM Vishwakarma where the unit is an artisan.",
        "insurance": "Product liability matters because the user is a child; penetration n.p. Fire and stock are commercial. ECGC only for the small exporting set. Marketplace receivables are largely uninsured.",
        "vcpe": "Thin. DPIIT startup recognition is a certificate, not capital. No visible PE book on the artisan or small-factory ring.",
    },
    {
        "name": "Toys (modern + GI/artisan)",
        "delivery": 4,
        "add": 5,
        "tools": tools(5, 3, 5, 5, 4, 4, 3, 4, 3, 4, 3, 4, 4, 5, 3, 5),
        "problem": "BIS files stop small units selling, and brand or marketplace payments are slow where an invoice exists.",
        "intervene": "If a sixth slot is funded: Digital Dost and programme files for BIS, compliance intel, Credit Kaksha on the micro tail, and a payment cell only for formal brand invoices. Do not open another toy park.",
        "out": "Do not relaunch SFURTI as a new park or staff a tool room the ministry already funds.",
        "action": "High-need reserve — not year-1 unless a sixth slot",
        "sources": "DGCIS: HS 9503 USD 169.46 million and chapter 95 USD 570.95 million, FY25. DPIIT: QCO from 1 January 2021, 21,000+ Udyam MSMEs, 1,800+ BIS licences, 19 SFURTI clusters. Brochure, 17 October 2026.",
        "notes": {
            "p1": "The QCO is a documented file failure, so Credit Kaksha, Digital Dost and programme files Activate. Rating Kaksha is Later: many units are still informal.",
            "p2": "Brand and marketplace delays are real where the invoice is formal, so the payment cell and ODR Activate. EMI is Later: bank EMIs are not yet the typical stress on an artisan spoke.",
            "p3": "Scheme usability is the BIS and SFURTI file, not a missing PLI. Lender route is Later until the file exists. Buyer linkage to organised retail is Activate.",
            "p4": "Friction research on who the QCO shut, and compliance intel, are the lead. The scorecard waits for an opted-in Koppal-plus-spoke cohort.",
            "delivery": "Koppal plus SFURTI spokes can host a hub-and-spoke desk. It is not already built.",
            "add": "Nineteen SFURTI clusters do not run Kaksha or a payment cell. A second park would add nothing.",
        },
    },
)

add(
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
        **bands(
            (40, 80, 180, 4200, 10500),
            (
                "25 reconstructed from CLE’s exporting members — membership is not this count",
                "30 reconstructed",
                "50 reconstructed",
            ),
            "Universe: about 15,000 footwear units (CLE/IBEF). Shares are a reconstructed shape of that count.",
        ),
        "mfi": "Active in the Agra and Ambur micro and job-work tail: MUDRA, NBFC micro loans and local chit or cooperative channels are in daily use. They do not cover a brand receivable.",
        "lending": H_LEND + "Sector: Footwear-specific credit-linked files (FPS-type bank sanction) stall after eligibility. IFLADP is a development programme, not a substitute for the sanction file. No evidence the brand pays on TReDS at the job-work tier.",
        "insurance": "ECGC for exporters. Fire and marine commercial. Brand goods-receipt receivables are uninsured. Product liability for sports footwear is commercial and patchy. CGTMSE is not a cover.",
        "vcpe": "Thin on the job-work and sole unit. Moderate only where a brand has raised growth capital. That capital does not reach the belt.",
    },
    {
        "name": "Footwear (non-leather + sports)",
        "delivery": 5,
        "add": 5,
        "tools": tools(5, 4, 5, 5, 5, 5, 4, 5, 5, 5, 5, 4, 4, 5, 4, 4),
        "problem": "Brand and export-house goods-receipt delays, and credit-linked footwear files that die at bank sanction.",
        "intervene": "Year-1 centre in Ambur–Ranipet or Agra: programme files and Digital Dost so the footwear scheme reaches sanction; Credit Kaksha and Rating Kaksha; payment cell and ODR on brand invoices; lender route after the file; ECGC where the unit exports.",
        "out": "Do not build a footwear park or route units to a preferred lender.",
        "action": "Year-1 Capability Centre",
        "sources": "CLE/IBEF: about 15,000 footwear units, 2,868 CLE members, sector turnover about ₹1.62 lakh crore, exports ₹48,667 crore, about 42 lakh workers, FY25 basket. BIS footwear quality orders from 2020–21. Brochure, 17 October 2026.",
        "notes": {
            "p1": "The sanction file is the failure mode, so Credit Kaksha, Digital Dost and programme files are 5. Rating Kaksha is 4 because units that already bill a brand have books worth a clinic.",
            "p2": "Brand and export-house GRN delays are formal enough for a payment cell and ODR. EMI is 4: explore it where a bank EMI already sits on those invoices.",
            "p3": "Scheme usability and the lender route are as important as ODR, because the credit-linked scheme dies at sanction. Market access is 4, not 5: CLE already convenes buyers.",
            "p4": "Friction research on the sanction wall is Activate. The belt is known, so mapping is 4 rather than a blank-sheet 5.",
            "delivery": "Ambur–Ranipet and Agra are existing factory belts a desk can enter in year 1.",
            "add": "CLE and IFLADP do not run ODR or a sanction clinic.",
        },
    },
)

add(
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
        **bands(
            (6, 15, 40, 250, 489),
            (
                "4 reconstructed — the awarded plants, domestic offtake, not exporters",
                "5 reconstructed domestic OEM suppliers",
                "8 reconstructed domestic OEM suppliers",
            ),
            "Universe: a reconstructed pack, BMS and recycling ring of about 800 units. The awarded plants sit in Large and are not the cohort.",
        ),
        "mfi": "Thin. MUDRA or CGTMSE may touch a micro pack shop. There is no sector MFI. The working-capital need is a bank line against OEM receipts.",
        "lending": H_LEND + "Sector: PLI-ACC is not a lending programme for the pack MSME. Vehicle NBFCs finance the vehicle, not the pack shop. No dedicated pack-MSME line was verified.",
        "insurance": "Product liability and transit for lithium packs are commercial and often missing at MSME scale. OEM receivables are uninsured. Fire is material because of the chemistry. ECGC is largely n.a. while offtake is domestic.",
        "vcpe": "Deep on the cell and OEM climate investors. Thin to none on the pack and BMS MSME.",
    },
    {
        "name": "ACC pack, BMS & recycling",
        "delivery": 4,
        "add": 5,
        "tools": tools(4, 4, 4, 4, 5, 5, 4, 5, 5, 4, 4, 4, 5, 5, 4, 3),
        "problem": "OEM goods-receipt cycles strand working capital in the pack and BMS shop, and the ring around the cell plants is unmapped.",
        "intervene": "New centre on the MSME ring only: map pack, BMS and authorised recyclers; payment cell and ODR on OEM GRNs; working capital matched to the cell-to-pack cycle; Credit Kaksha once the buyer is named.",
        "out": "Do not run a PLI-ACC plant or treat the four beneficiaries as the cohort.",
        "action": "Year-1 Capability Centre",
        "sources": "PLI-ACC awards, 2021, a small set of gigafactory beneficiaries. HS 8507 is the wrong export line (mostly lead-acid). Brochure, 17 October 2026. Motor-vehicle ASI employment is 14.80 lakh and is not this ring.",
        "notes": {
            "p1": "The ring is formal enough for all four readiness tools at 4, once a buyer code exists. It is not a nano cohort.",
            "p2": "OEM GRN delay is the cash cycle. Payment cell, ODR and outcome tracking Activate. EMI is 4 because those shops already service bank EMIs against the same receipts.",
            "p3": "Working capital mismatched to cell-to-pack inventory is the capital pathway. PLI-ACC is the anchor’s scheme, so scheme usability is 4, not a claim that Catalyst runs PLI.",
            "p4": "Mapping the ring, and the friction of who never gets a vendor code, are 5. Compliance on waste and transport rules is Later relative to the cash cycle.",
            "delivery": "The OEM belts are real. The centre itself is new, so delivery is 4 not 5.",
            "add": "Nobody runs Kaksha or ODR on pack MSMEs. The PLI programme runs the plants.",
        },
    },
)

add(
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
        **bands(
            (12, 25, 60, 900, 7003),
            (
                "n.a. as exporters — domestic EPR offtake",
                "n.a. as exporters",
                "n.a. as exporters",
            ),
            "Universe: a reconstructed ~8,000 units in the known informal belts plus authorised recyclers in the upper bands. Not a CPCB extract.",
        ),
        "mfi": "Active on the informal micro tail in Seelampur and Moradabad: local micro-lenders and some NBFC-MFI household loans. That credit is not a recycler term loan and does not survive an authorisation process by itself.",
        "lending": H_LEND + "Sector: no MSME e-waste term-loan product verified. EPR credit is the brand’s compliance cost, not a loan to the dismantler. SIDBI green lines, where offered, sit above this tail.",
        "insurance": "Pollution liability and workmen cover are the gap. Fire is commercial. There is no receivable to insure until an invoice exists. CGTMSE is not a cover.",
        "vcpe": "Moderate on a few organised recyclers. None on the informal lane.",
    },
    {
        "name": "E-waste & circular electronics",
        "delivery": 3,
        "add": 5,
        "tools": tools(4, 2, 5, 4, 3, 2, 1, 3, 3, 4, 3, 4, 5, 5, 3, 5),
        "problem": "Units cannot invoice a brand until they hold a CPCB authorisation, so there is no formal receivable to recover.",
        "intervene": "Map Seelampur and Moradabad. Digital Dost and compliance intel on the CPCB file. Programme files and a buyer link to an authorised channel. Skip ODR and EMI until an invoice exists.",
        "out": "Do not run an EPR exchange or set up as a recycler.",
        "action": "Next mapping / Phase II wave",
        "sources": "E-Waste (Management) Rules, 2022. Informal concentration in Seelampur and Moradabad is the cluster geography used by CPCB and state boards; a public unit census was not used. Brochure, 17 October 2026.",
        "notes": {
            "p1": "Digital Dost and programme files Activate because the authorisation file is the drop-off. Rating Kaksha Skips: books are not there yet. Credit Kaksha is 4 for the micro tail that already uses informal credit.",
            "p2": "Payment support is Later. ODR Skips and EMI Skips until the unit is formal and an invoice exists.",
            "p3": "Scheme usability is the EPR and authorisation route. Market access is the link to an authorised recycler or brand channel. Capital and lender routes wait on the file.",
            "p4": "Mapping, friction research and CPCB compliance intel are the year-1 tools if this wave is staffed. The scorecard is Later.",
            "delivery": "Formalisation has to come before a centre can hold a cohort. Delivery is 3.",
            "add": "Nobody else runs a file clinic on the informal lane. Brand EPR portals do not.",
        },
    },
)

add(
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
        **bands(
            (20, 30, 50, 400, 700),
            (
                "n.a. as exporters — domestic campus offtake",
                "n.a. as exporters",
                "n.a. as exporters",
            ),
            "Universe: a reconstructed ~1,200 vendors. Not a ministry list.",
        ),
        "mfi": "Thin. MUDRA does not fund a panel shop’s retention cycle. No sector MFI.",
        "lending": H_LEND + "Sector: none for the vendor. Infrastructure finance sits with the campus.",
        "insurance": "Contractors’ all-risk during fit-out. Retention and milestone receivables from the operator are uninsured. Fire is the operator’s cover.",
        "vcpe": "Deep in data-centre infrastructure funds. None on the panel and fit-out MSME.",
    },
    {
        "name": "Data-centre ancillaries",
        "delivery": 3,
        "add": 3,
        "tools": tools(3, 3, 3, 3, 4, 3, 3, 3, 4, 3, 3, 3, 4, 3, 3, 3),
        "problem": "Operator retention and milestone payments, once a vendor invoice exists, with no map of who the vendors are.",
        "intervene": "Later wave: map vendors around one campus cluster and open a payment cell only where invoices are formal. Do not staff a centre in year 1.",
        "out": "Do not develop a data-centre park or raise infrastructure capital.",
        "action": "Next mapping / Phase II wave",
        "sources": "State data-centre policies from 2020 onward. No official vendor census. Campus capex is not sales. Brochure, 17 October 2026.",
        "notes": {
            "p1": "Readiness tools are Later. The ring is not yet listed, so a classroom has no roll.",
            "p2": "The payment cell is Activate where a formal vendor invoice is stuck in operator retention. ODR and EMI are Later until that invoice is the norm.",
            "p3": "Working capital against retention is the capital need. There is no sector scheme to make usable.",
            "p4": "Mapping is the only strong research tool. A scorecard before the map would invent a cohort.",
            "delivery": "A spoke beside one campus is possible after the map. It is not year-1.",
            "add": "Operators already qualify their vendors. Cash-flow work would be new, but only after the list exists.",
        },
    },
)

add(
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
        **bands(
            (15, 25, 60, 700, 1700),
            (
                "n.a. as exporters — domestic CPO offtake",
                "n.a. as exporters",
                "n.a. as exporters",
            ),
            "Universe: a reconstructed ~2,500 assemblers, panel shops and installer firms. Charger asset counts are not this pyramid.",
        ),
        "mfi": "Thin. A micro electrician may use MUDRA. The CPO’s project finance is not an MFI product.",
        "lending": H_LEND + "Sector: PM E-DRIVE and FAME-II are subsidies on charging assets, paid through programme agencies, not a loan to the electrician. No MSME EVSE line verified.",
        "insurance": "Public liability at the charger and workmen cover for installers are the gap. CPO receivables to a small assembler are uninsured. ECGC is n.a. for domestic installs.",
        "vcpe": "Moderate on charge-point operators. None on the electrician.",
    },
    {
        "name": "EV charging infrastructure",
        "delivery": 3,
        "add": 4,
        "tools": tools(4, 3, 4, 4, 4, 3, 3, 3, 4, 4, 4, 4, 4, 4, 3, 3),
        "problem": "Small assemblers and electricians wait on charge-point operators, and the PM E-DRIVE file does not reach them.",
        "intervene": "Next wave, not year 1: map one assembly belt, Credit Kaksha and programme files for the installer, payment cell on CPO invoices, lender route after the file.",
        "out": "Do not become a charge-point operator or allocate DISCOM sites.",
        "action": "Next mapping / Phase II wave",
        "sources": "PM E-DRIVE guidelines, 30 September 2024, outlay ₹10,900 crore. FAME-II charging allocation ₹912.50 crore; charging described as unlicensed. Brochure, 17 October 2026.",
        "notes": {
            "p1": "Credit Kaksha, Digital Dost and programme files Activate for the installer who cannot complete a subsidy or vendor file. Rating is Later.",
            "p2": "CPO payment delays justify a payment cell. ODR and EMI are Later until invoices are formal and bank EMIs are common.",
            "p3": "All four capital and market tools are 4: the scheme exists, the bank product is ordinary MSME credit, and the CPO is a named buyer.",
            "p4": "The installer ring is unmapped, and the drop-off is the programme file. Scorecard and a heavy compliance tool are Later.",
            "delivery": "Pan-India installs mean the centre has to pick one belt first. Delivery is 3.",
            "add": "The subsidy programme does not run a payment cell for the electrician.",
        },
    },
)

add(
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
        **bands(
            (40, 60, 150, 900, 1850),
            (
                "20 reconstructed — PLI and larger exporters, not a census",
                "15 reconstructed",
                "25 reconstructed",
            ),
            "Universe: a reconstructed ~3,000 converters and specialised mills. The 24 startups and 30 PLI companies are inside the upper bands, not the whole pyramid.",
        ),
        "mfi": "Thin for a converter. A micro weaver in the same town may use MUDRA. NABARD is relevant only for a rural producer, not for a specified-fabric supplier.",
        "lending": H_LEND + "Sector: NTTM and GREAT are grants. PLI Textiles is an incentive for companies that clear an investment threshold. TUFS-successor status for new cases was not confirmed, so it is not listed as open. No micro-converter loan product.",
        "insurance": "ECGC for exporters. Fire and machinery for mills. Product liability where the cloth is protective or medical. Receivables from an auto or defence buyer are uninsured.",
        "vcpe": "The 24 GREAT startups are grant-funded (approved cost ₹12.16 crore, of which the Government of India share was ₹10.79 crore), which is not venture capital. PE that exists sits with larger MMF players, not the converter.",
    },
    {
        "name": "Technical textiles & MMF",
        "delivery": 4,
        "add": 4,
        "tools": tools(4, 4, 3, 4, 4, 4, 3, 3, 4, 3, 3, 4, 5, 4, 3, 4),
        "problem": "Converters fail buyer specifications and QCOs, and wait on auto, medical and defence invoices, while the firm list is still mixed up with commodity mills.",
        "intervene": "Next wave: map who actually makes technical textiles in one town, then Credit Kaksha, Rating Kaksha, a payment cell and compliance intel on the QCO. Do not send a powerloom into PLI.",
        "out": "Do not run an R&D project the textile research associations already own, or relaunch the apparel demo.",
        "action": "Next mapping / Phase II wave",
        "sources": "Ministry of Textiles: NTTM 2020, ₹1,480 crore; technical-textile exports ₹24,732.68 crore in FY25; 24 GREAT startups; 8 QCOs on 68 items. PLI Textiles, 24 September 2021, ₹10,683 crore, 30 companies commenced production. ASI FY25 textile factories 17.57 lakh persons. Brochure, 17 October 2026.",
        "notes": {
            "p1": "Credit and rating clinics fit a mill that already has books. Programme files Activate so units are not pointed at PLI or GREAT by mistake. Digital Dost is Later.",
            "p2": "Buyer invoices in auto and medical supply are formal enough for a payment cell and ODR. EMI and outcome tracking are Later until the cohort is separated from commodity trade.",
            "p3": "Working capital and a buyer link Activate. The live schemes are the wrong window for a small converter, so scheme usability is Later.",
            "p4": "Mapping is 5 because the export number does not name the firms. QCO compliance intel is Activate. The scorecard waits.",
            "delivery": "Surat, Panipat or Coimbatore can host a desk once the cohort is cut. Delivery is 4.",
            "add": "NTTM and the research associations own R&D and testing. They do not own the receivable.",
        },
    },
)

add(
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
        **bands(
            (8, 12, 20, 80, 130),
            (
                "n.a. as exporters — domestic ISRO and prime offtake",
                "n.a. as exporters",
                "n.a. as exporters",
            ),
            "Universe: a reconstructed ~250 firms including primes in Large. Shape sketch, not an IN-SPACe extract.",
        ),
        "mfi": "None typical. Banks, grants and venture only.",
        "lending": H_LEND + "Sector: IN-SPACe authorisation is a gate, not a loan. No MSME space-component line verified.",
        "insurance": "Launch and in-orbit covers sit with the prime. The machine shop’s fire and workmen covers are ordinary. Milestone receivables from ISRO are uninsured.",
        "vcpe": "Moderate on a few private space firms. None on the machine shop.",
    },
    {
        "name": "Space components & small-sat",
        "delivery": 2,
        "add": 2,
        "tools": tools(3, 2, 3, 3, 2, 2, 2, 2, 3, 3, 2, 2, 5, 4, 2, 3),
        "problem": "Component shops do not yet have a private offtake list, so there is no invoice cohort.",
        "intervene": "Map Bengaluru and Hyderabad job-shops that already machine for ISRO. Stop there this year.",
        "out": "Do not bid a satellite, seek an IN-SPACe authorisation for the centre, or use HS 8802 as evidence.",
        "action": "Watch — mapping and friction only",
        "sources": "IN-SPACe established 2020. HS 8802 is aircraft and is the wrong line (DGCIS quarterly reviews list 8802 among top headings for other reasons). Brochure, 17 October 2026.",
        "notes": {
            "p1": "Files will matter later. There is no thick tail, so readiness stays Later or Skip.",
            "p2": "ISRO milestones are not an MSME receivable book the centre can staff. Receivables tools Skip.",
            "p3": "IN-SPACe is a gate for the prime, not a scheme for the shop. Capital and scheme tools stay Later; lender and market Skip.",
            "p4": "Only mapping and friction Activate, to see whether a vendor ring exists before anyone promises a centre.",
            "delivery": "No MSME offtake large enough for a year-1 desk.",
            "add": "ISRO vendor development and IN-SPACe already occupy the official door.",
        },
    },
)

add(
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
        **bands(
            (15, 10, 10, 30, 55),
            (
                "n.a. as exporters",
                "n.a. as exporters",
                "n.a. as exporters",
            ),
            "Universe: a reconstructed sketch of about 120 possible vendors and sponsors. It is a ceiling, not a census, and it is not a cohort.",
        ),
        "mfi": "None typical.",
        "lending": H_LEND + "Sector: NGHM incentives are for the sponsor. No MSME hydrogen product.",
        "insurance": "Construction and marine covers sit on the project. Nothing cohort-specific.",
        "vcpe": "Deep on sponsor balance sheets and climate platforms. None on a vendor ring that is not there.",
    },
    {
        "name": "Green hydrogen ancillaries",
        "delivery": 1,
        "add": 1,
        "tools": tools(2, 2, 2, 2, 2, 1, 1, 2, 2, 2, 2, 2, 3, 3, 2, 2),
        "problem": "There is no MSME invoice or file cohort. The mission funds plants.",
        "intervene": "None in year 1. An optional one-page map of announced plants is the most the charter allows.",
        "out": "Do not open a centre, staff an electrolyser plant, or treat the sponsor as an anchor for a cohort that does not exist.",
        "action": "Out of cluster charter — anchor, not cohort",
        "sources": "National Green Hydrogen Mission, 2023. No MSME vendor census in the releases used. Brochure, 17 October 2026.",
        "notes": {
            "p1": "No micro or small tail to teach. Readiness tools Skip.",
            "p2": "No MSME receivable. ODR and EMI Skip.",
            "p3": "Capital pathways belong to the sponsor. They are out of the charter for a centre.",
            "p4": "A map of plants could be done later as a one-pager. It is not staffed. Friction research has nothing to drop out of yet.",
            "delivery": "No cluster vehicle.",
            "add": "The mission and the sponsors are the programme. Catalyst would add a second announcement, not a tool.",
        },
    },
)

add(
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
        **bands(
            (80, 40, 80, 600, 4200),
            (
                "n.a. as exporters — OMC domestic offtake",
                "n.a. as exporters",
                "n.a. as exporters",
            ),
            "Universe: a reconstructed ~5,000 collection and aggregation units, with distilleries placed in Large. Not an OMCs vendor extract.",
        ),
        "mfi": "Active on the micro collection tail: NABARD, FPO credit and SHG linkage in the feedstock districts. That is not distillery finance.",
        "lending": H_LEND + "Sector: NABARD and FPO credit, Agriculture Infrastructure Fund for aggregation. Interest subvention on distilleries is the anchor’s scheme. AgriSURE is equity or blended capital, not an MFI loan.",
        "insurance": "PMFBY insures the crop, not the collector’s receivable. Fire and boiler sit on the distillery. FPO receivables from a distillery or OMC agent are largely uninsured.",
        "vcpe": "Thin on the FPO. Distillery and SAF projects use project finance and strategic capital.",
    },
    {
        "name": "Ethanol, biofuels & SAF feedstock",
        "delivery": 3,
        "add": 3,
        "tools": tools(4, 3, 3, 4, 3, 2, 2, 3, 4, 4, 4, 4, 4, 4, 3, 3),
        "problem": "FPO and collection units drop out of feedstock supply because the aggregation file and the payment from the plant are weak.",
        "intervene": "Not year 1. In one belt: Credit Kaksha and NABARD or FPO scheme files, then a buyer link to the distillery. Skip ODR until invoices are formal.",
        "out": "Do not finance a distillery or run the blending programme.",
        "action": "Next mapping / Phase II wave",
        "sources": "National Policy on Biofuels, 2018, and the ethanol blending programme. HS 2207 is not the offtake. NABARD and AIF are the micro channels. Brochure, 17 October 2026.",
        "notes": {
            "p1": "Credit Kaksha and programme files Activate because FPO paperwork is the drop-off. Rating and Digital Dost are Later.",
            "p2": "Payment from the plant is a Later watch. ODR and EMI Skip: many collection relationships are not formal invoices with a bank EMI underneath.",
            "p3": "NABARD, FPO credit and AIF are real products a centre could make usable, and the distillery is a named buyer. All four P3 tools are 4.",
            "p4": "The collection ring is unmapped at belt level. Scorecard and a compliance clinic are Later.",
            "delivery": "A belt has to be chosen. National blending is not a site. Delivery is 3.",
            "add": "OMCs and NABARD already have schemes. A centre would only add file completion, and only in one belt.",
        },
    },
)

add(
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
        **bands(
            (30, 50, 120, 700, 1300),
            (
                "15 reconstructed from the exporting Pharmexcil-visible set",
                "12 reconstructed",
                "20 reconstructed",
            ),
            "Universe: a reconstructed ~2,200 licensed manufacturers. Not an FSSAI extract and not added to AYUSH licences.",
        ),
        "mfi": "Thin. A micro herbal unit may use MUDRA. The licensed factory is a bank file. No sector MFI.",
        "lending": H_LEND + "Sector: AYUSH and FSSAI schemes and the PLI food health window for firms that qualify. PLI is not the micro formulator’s loan. No dedicated nutraceutical MSME line verified.",
        "insurance": "Product liability and recall are the gap. ECGC for the AYUSH exporter. Brand and modern-trade receivables are uninsured. Clinical-trial cover is n.a. for a supplement unit.",
        "vcpe": "Moderate on branded AYUSH and consumer-health companies. Thin on the contract packer.",
    },
    {
        "name": "Nutraceuticals & AYUSH manufacturing",
        "delivery": 4,
        "add": 3,
        "tools": tools(4, 4, 5, 5, 4, 4, 3, 4, 4, 4, 4, 4, 4, 4, 3, 5),
        "problem": "FSSAI and AYUSH files fail, and brand or export-house payments follow only after the licence is current.",
        "intervene": "Next wave, not the year-1 five: Digital Dost and compliance intel on the two licences, then a payment cell on brand invoices in one belt (Baddi or Gujarat).",
        "out": "Do not double-count medical-device exports or open a second pharma cluster.",
        "action": "Next mapping / Phase II wave",
        "sources": "Pharmexcil, 14 June 2025: AYUSH and herbals USD 688.89 million. Drugs and pharmaceuticals exports USD 30.47 billion are a different basket. ASI FY25 pharma factories 10.92 lakh persons, parent industry only. Brochure, 17 October 2026.",
        "notes": {
            "p1": "Digital Dost and programme files are 5 because applications die on FSSAI and AYUSH completeness. Credit and rating clinics are 4 for licensed units that already have books.",
            "p2": "Brand invoices are formal enough for a payment cell, ODR and outcome tracking. EMI is Later until those EMIs are shown to sit on the same invoices.",
            "p3": "Scheme, lender and buyer tools are all usable once the licence is current. Private equity is on the brand, so the MSME packer still needs the bank route.",
            "p4": "Compliance intel is the lead. Mapping is 4 because the belts are known but the two licence lists are not joined. The scorecard is Later.",
            "delivery": "Baddi, Uttarakhand or a Gujarat belt can hold a desk. Delivery is 4.",
            "add": "Regulators and Pharmexcil already exist. Additionality is 3: the centre only wins if it completes files they do not complete.",
        },
    },
)

add(
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
        **bands(
            (20, 30, 80, 900, 2470),
            (
                "n.a. as exporters for the digital cohort",
                "n.a. as exporters for the digital cohort",
                "Domestic offtake via state mechanisation and FPOs for fabricators",
            ),
            "Universe: a reconstructed ~3,500 startups and small fabricators. Certificates and factories are mixed only in this shape sketch and are labelled as such.",
        ),
        "mfi": "Active at the custom-hiring and micro-fabricator end through NABARD, MUDRA and FPO credit. The venture-funded startup is outside that channel.",
        "lending": H_LEND + "Sector: NABARD, Agriculture Infrastructure Fund, custom-hiring credit, AgriSURE (equity and blended, not MFI). No single agri-tech MSME term loan.",
        "insurance": "Equipment and cattle or crop covers are not the startup’s receivable cover. PMFBY is farm cover. Custom-hiring receivables are uninsured.",
        "vcpe": "Moderate private agri venture plus AgriSURE at the startup end. Thin on the fabricator.",
    },
    {
        "name": "Agri-tech & farm machinery digital",
        "delivery": 3,
        "add": 3,
        "tools": tools(4, 3, 4, 4, 3, 2, 2, 3, 3, 4, 3, 4, 4, 4, 3, 3),
        "problem": "Custom-hiring and small fabricators fall out of state mechanisation files, and startup turnover is mistaken for machinery exports.",
        "intervene": "Not year 1. In one machinery belt: programme files and Credit Kaksha for custom-hiring units, and a buyer link to the state scheme. Skip ODR.",
        "out": "Do not quote HS 8432 exports as agri-tech revenue or fund a tractor OEM.",
        "action": "Next mapping / Phase II wave",
        "sources": "AgriSURE is equity or blended capital, not an MFI loan. Farm-machinery headings 8432 and 8433 are excluded from this cohort’s export. Brochure, 17 October 2026.",
        "notes": {
            "p1": "Credit Kaksha, Digital Dost and programme files Activate for the custom-hiring file. Rating is Later.",
            "p2": "Payment friction is Later. ODR and EMI Skip because many hires are not formal enough, and bank EMIs are not the documented stress.",
            "p3": "Scheme usability and a state or FPO buyer link are 4. The lender route waits on the file. Venture capital is on the startup, not the fabricator.",
            "p4": "Mapping has to separate certificates from factories before any scorecard. Friction research on scheme drop-off is Activate.",
            "delivery": "A belt can be chosen, but the digital layer is not a place. Delivery is 3.",
            "add": "State mechanisation missions and NABARD already fund the asset. The file clinic is the only add.",
        },
    },
)

add(
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
        **bands(
            (25, 40, 80, 1500, 6355),
            (
                "n.p. — services, no TradeStat exporter count",
                "n.p.",
                "n.p.",
            ),
            "Universe: a reconstructed ~8,000 studios and small vendor firms. Freelancers are excluded. Not a DPIIT extract.",
        ),
        "mfi": "None typical. Freelancers are not an MFI book. Studios use banks or nothing.",
        "lending": H_LEND + "Sector: state AVGC incentives are subsidies or space, not a receivable line. No MSME production-finance product verified.",
        "insurance": "Professional indemnity and production insurance exist commercially and are rare at the small studio. Client receivables are uninsured. ECGC is a poor fit for a services invoice.",
        "vcpe": "Moderate venture capital on gaming and a few studios. None on the vendor bench.",
    },
    {
        "name": "AVGC-XR",
        "delivery": 2,
        "add": 2,
        "tools": tools(3, 2, 3, 2, 3, 2, 2, 2, 2, 2, 2, 3, 4, 4, 2, 2),
        "problem": "Small studios wait on publisher payments, but the work is not a physical cluster and invoices are often informal.",
        "intervene": "Map only. Do not open a studio campus or a training college.",
        "out": "Do not become a delivery college or a production house.",
        "action": "Watch — mapping and friction only",
        "sources": "AVGC task force, 2022. Services exports USD 383.51 billion, PIB FY25, are the parent account, not this cohort. No HSN. Brochure, 17 October 2026.",
        "notes": {
            "p1": "Readiness is Later at best. There is no public-programme file that is the bottleneck for the bench.",
            "p2": "Payment delay is Later. ODR and EMI Skip because many engagements have no formal invoice and no bank EMI.",
            "p3": "Venture capital does not reach the bench, and there is no lender product the centre can open this year. Tools stay Skip or Later.",
            "p4": "Only a map and a friction note on informal contracts Activate. A scorecard would not have a cohort.",
            "delivery": "Chapter 18. No year-1 building.",
            "add": "State AVGC policies and colleges already offer space and courses.",
        },
    },
)

add(
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
        **bands(
            (10, 15, 40, 400, 1035),
            (
                "n.a. as exporters",
                "n.a. as exporters",
                "n.a. as exporters",
            ),
            "Universe: a reconstructed ~1,500 survey and drone-service firms. Pilot certificates are excluded.",
        ),
        "mfi": "None typical.",
        "lending": H_LEND + "Sector: none. GeM is a buyer channel, not a loan. Drone PLI closed and belonged to manufacturers.",
        "insurance": "DGCA third-party liability sits on the operator. Professional indemnity for a bad survey is rare. Government-tender receivables are uninsured.",
        "vcpe": "Thin. A few drone-service startups have raised rounds. The survey shop has not.",
    },
    {
        "name": "Geospatial & drones-as-a-service",
        "delivery": 2,
        "add": 2,
        "tools": tools(3, 2, 3, 3, 2, 2, 2, 2, 2, 2, 2, 3, 4, 4, 2, 3),
        "problem": "Tender payments are slow, and the service firms are too scattered to be a centre distinct from the drone demo.",
        "intervene": "Map service firms only so they are not double-counted as drone manufacturers. No centre.",
        "out": "Do not relaunch the drone demonstration cluster under a services name.",
        "action": "Watch — mapping and friction only",
        "sources": "Geospatial guidelines, 2021. DGCA PIB, 26 July 2024: 16,000 remote pilot certificates are people, not firms. Services have no HSN. Brochure, 17 October 2026.",
        "notes": {
            "p1": "Programme files for GeM are Later. There is no thick factory tail.",
            "p2": "Government payment delay is real and still Skip for a centre: the firms are not a cluster that can hold a recovery cell.",
            "p3": "No sector lender product. Market access to GeM is Later, not a year-1 staffing.",
            "p4": "Mapping and friction Activate only to keep this row from being merged into the drone demo.",
            "delivery": "Chapter 18. Delivery is 2.",
            "add": "The drone demo, if attached, already covers the aircraft. A second vehicle adds nothing.",
        },
    },
)

add(
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
        **bands(
            (30, 40, 80, 900, 2950),
            (
                "n.p. — services",
                "n.p.",
                "n.p.",
            ),
            "Universe: a reconstructed ~4,000 service firms. Not an empanelment extract.",
        ),
        "mfi": "None typical.",
        "lending": H_LEND + "Sector: none. These firms are often the delivery partner, not the borrower the centre was built for.",
        "insurance": "Professional indemnity and cyber cover are the firm’s own product market as well as its need. Client receivables are uninsured.",
        "vcpe": "Moderate on product startups. The audit shop is bootstrapped. Either way this is not a cluster PE gap the centre should fill.",
    },
    {
        "name": "Cybersecurity services",
        "delivery": 2,
        "add": 1,
        "tools": tools(3, 2, 3, 2, 3, 2, 2, 2, 2, 2, 2, 3, 3, 3, 2, 3),
        "problem": "There is no factory cash-cycle cohort. The firms are prospective members.",
        "intervene": "Invite empanelled firms as members inside the five year-1 vehicles. Do not open a cyber cluster.",
        "out": "Out of cluster charter. Do not staff a security operations centre.",
        "action": "Out of cluster charter — member / partner",
        "sources": "CERT-In directions, 2022. Services exports USD 383.51 billion, PIB FY25, are not this cohort. Brochure, 17 October 2026. Forced out of charter regardless of the arithmetic.",
        "notes": {
            "p1": "A file clinic is not the failure mode. Tools stay Later or Skip.",
            "p2": "Client payment delays exist and still do not justify a recovery cell for a virtual, member-type cohort.",
            "p3": "No sector scheme whose usability is Catalyst’s job. These firms sell to the banks the centre would otherwise convene.",
            "p4": "Mapping would only produce a membership list. It is Later, not a centre.",
            "delivery": "No physical cohort.",
            "add": "The type is a delivery partner. Additionality of a centre is 1. Forced out of charter.",
        },
    },
)

add(
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
        **bands(
            (25, 40, 80, 250, 205),
            (
                "10 reconstructed large mills — domestic and export, not a census",
                "8 reconstructed",
                "12 reconstructed",
            ),
            "Universe: a reconstructed ~600 rerollers and converters. PLI plants sit in Large.",
        ),
        "mfi": "None typical. Rerollers use bank cash credit. MFI products do not fund a heat.",
        "lending": H_LEND + "Sector: PLI Specialty Steel is the plant’s incentive. No MSME conversion loan verified.",
        "insurance": "Fire, marine and boiler on the mill. Receivables from an auto or project buyer are uninsured. ECGC only if the reroller itself exports.",
        "vcpe": "None on the reroller. Strategic capital sits on the listed steel groups.",
    },
    {
        "name": "Specialty steel (MSME conversion)",
        "delivery": 2,
        "add": 2,
        "tools": tools(3, 3, 3, 3, 3, 2, 2, 2, 3, 3, 3, 2, 4, 4, 2, 3),
        "problem": "The PLI sits on the melt shop. Rerollers do not have a specialty-grade buyer file, and a centre would be mistaken for a steel project.",
        "intervene": "Map rerollers who already sell a specialty grade. Do not open a centre.",
        "out": "Do not open a centre on a melt shop or administer PLI Specialty Steel.",
        "action": "Watch — mapping and friction only",
        "sources": "PLI Specialty Steel, 2021. Engineering goods USD 116.67 billion, PIB FY25, are not this cohort. Brochure, 17 October 2026.",
        "notes": {
            "p1": "Readiness is Later. The failure is not a missing classroom; it is the absence of a grade and a buyer.",
            "p2": "Mill payment cycles are Later. ODR and EMI Skip for a cohort the centre is not opening.",
            "p3": "PLI is the anchor’s scheme. Market access Skips because Catalyst must not become a grade-development consultant to a melt shop.",
            "p4": "Only mapping and friction Activate, to see whether any reroller is actually in specialty grades.",
            "delivery": "No year-1 vehicle that is not the plant.",
            "add": "The PLI programme and the steel companies already run this.",
        },
    },
)

add(
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
        **bands(
            (40, 70, 140, 550, 700),
            (
                "25 reconstructed from the exporting bulk-drug set",
                "20 reconstructed",
                "30 reconstructed",
            ),
            "Universe: a reconstructed ~1,500 bulk-drug and intermediate units. PLI plants are in Large. Not a Pharmexcil extract.",
        ),
        "mfi": "None typical. Pollution-control and working-capital finance is a bank file.",
        "lending": H_LEND + "Sector: PLI Bulk Drugs is an incentive to approved applicants. Park plots are allotments, not loans. No micro-intermediate MFI channel.",
        "insurance": "Pollution liability, fire and marine. Product liability on an API is commercial. Plant receivables are uninsured. ECGC for the exporter of record, who is usually the plant.",
        "vcpe": "Thin on the job-work unit. Strategic and PE capital appears on larger pharma groups, which are the anchor.",
    },
    {
        "name": "Bulk drugs & KSMs / APIs",
        "delivery": 2,
        "add": 2,
        "tools": tools(3, 3, 3, 3, 3, 2, 2, 2, 3, 3, 3, 2, 4, 4, 2, 3),
        "problem": "The incentive and the plot sit with the plant. A centre on the reactor would duplicate PLI.",
        "intervene": "Map intermediate MSMEs around one park only. Do not staff Kaksha for the PLI applicant.",
        "out": "Do not open a centre on a bulk-drug plant or run the park.",
        "action": "Watch — mapping and friction only",
        "sources": "Pharmexcil, 14 June 2025: bulk drugs USD 4.87 billion. PLI Bulk Drugs, 2020. ASI FY25 pharma factories 10.92 lakh persons, parent industry. Drugs and pharmaceuticals exports USD 30.47 billion are the wider basket. Brochure, 17 October 2026.",
        "notes": {
            "p1": "Regulatory files are real and still Later: the firms that hold them are the plants, which are out of cohort.",
            "p2": "Plant payment terms are not an MSME ODR book this year. ODR and EMI Skip.",
            "p3": "PLI and the park are the anchor’s scheme. Market access Skips so the centre is not pulled into selling intermediates.",
            "p4": "Mapping and friction on who around the park is actually an MSME Activate. A scorecard does not.",
            "delivery": "The vehicle on the ground is the park. A second desk has nowhere to stand that is not the plant.",
            "add": "PLI and the park authority already run the official relationship.",
        },
    },
)

add(
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
        **bands(
            (80, 120, 300, 3500, 8000),
            (
                "The 32 PLI companies dominate exports — they are not the MSME export-ready count",
                "40 reconstructed component exporters",
                "80 reconstructed",
            ),
            "Universe: a reconstructed ~12,000 suppliers in the three assembly catchments. The 300 manufacturing units are not this pyramid.",
        ),
        "mfi": "Thin. MUDRA may touch a micro packer. A tool room selling to an EMS company needs a bank line or TReDS.",
        "lending": H_LEND + "Sector: PLI LSEM is not open to this ring. TReDS works only if the assembler onboards the supplier. No component-MSME scheme was the centre’s to run.",
        "insurance": "ECGC where the MSME itself exports, which is rare. The principal carries marine cover on imported inputs. Supplier receivables are uninsured.",
        "vcpe": "Deep at the assembler and a few listed EMS companies. None on the tool room.",
    },
    {
        "name": "Mobile & electronics manufacturing",
        "delivery": 4,
        "add": 4,
        "tools": tools(4, 3, 4, 5, 5, 4, 3, 4, 4, 3, 4, 4, 5, 4, 3, 3),
        "problem": "Assembler payment terms hit the uncounted tool room, and firms are sent toward a PLI they cannot enter.",
        "intervene": "Next mapping wave: count non-PLI suppliers in Noida or Sriperumbudur, then a payment cell and programme files that keep them out of the wrong scheme.",
        "out": "Do not treat ₹5.45 lakh crore of mobile production as the cohort, and do not relaunch Phase II assembly as a new discovery.",
        "action": "Next mapping / Phase II wave",
        "sources": "MeitY / PIB, 23 July 2025: production ₹11.32 lakh crore, exports about ₹3.26 lakh crore, mobile production ₹5.45 lakh crore, mobile exports about ₹2 lakh crore, 300+ units, about 25 lakh jobs, PLI LSEM 1,30,330 direct jobs to June 2025, 32 beneficiaries. DGCIS electronic goods USD 38.58 billion FY25. Brochure, 17 October 2026.",
        "notes": {
            "p1": "Programme files are 5 so a moulder is not coached into PLI LSEM. Credit Kaksha and Digital Dost are 4. Rating is Later until the ring is listed.",
            "p2": "Assembler payment terms are the cash cycle, so the payment cell, ODR and outcome tracking Activate. EMI is Later.",
            "p3": "Working capital, the bank or TReDS route, and a vendor-code link are 4. Scheme usability is Later because the live PLI is the anchor’s.",
            "p4": "Mapping is 5. The drop-off from vendor-code lists is friction research at 4. Scorecard and compliance wait.",
            "delivery": "The belts are real and Phase II infrastructure exists. A supplier desk would be new. Delivery is 4.",
            "add": "MeitY and the assemblers already run the principal. They do not run receivables for the tool room. Additionality is 4, not 5, because the phase is already open.",
        },
    },
)

add(
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
        **bands(
            (35, 50, 120, 1200, 2595),
            (
                "Domestic offtake — n.a. as an EV exporter census",
                "Domestic OEM suppliers, count n.p.",
                "Domestic OEM suppliers, count n.p.",
            ),
            "Universe: a reconstructed ~4,000 EV-linked component firms. ACMA’s 1,100 members are not this pyramid. Pack and BMS units are excluded; they sit on the battery row.",
        ),
        "mfi": "Thin. A micro job-shop may use MUDRA. It is not the cluster’s financing system.",
        "lending": H_LEND + "Sector: PLI Auto and PM E-DRIVE are not loans to the Tier-3 shop. TReDS where the OEM onboards the supplier. Vehicle NBFCs finance the buyer of the vehicle.",
        "insurance": "ECGC for a component exporter in the wider ACMA sense. EV-OEM receivables are uninsured. Product liability sits with the OEM.",
        "vcpe": "Deep on OEM and Tier-1 EV platforms. Thin on the Tier-3 machinist. The pack row is where the MSME capital gap is sharper.",
    },
    {
        "name": "EV vehicles & auto-tech components",
        "delivery": 4,
        "add": 2,
        "tools": tools(3, 3, 3, 3, 4, 3, 3, 3, 3, 3, 3, 3, 4, 3, 3, 3),
        "problem": "OEM payment terms are real, and they are already the reason to open the pack centre rather than a second auto desk.",
        "intervene": "Do not staff a year-1 vehicle centre. If a Pune supplier desk opens later, it should be the pack and component ring, not the OEM.",
        "out": "Do not relaunch Phase II EV as a new cluster or run PLI Auto.",
        "action": "Next mapping / Phase II wave",
        "sources": "PLI Auto: 82 applicants and 278 units as on 30 November 2025; determined sales ₹32,879 crore and 48,974 jobs to 30 September 2025; outlay ₹25,938 crore. FAME-II reimbursements ₹6,559 crore. PM E-DRIVE ₹10,900 crore from 1 October 2024. ASI FY25 motor vehicles 14.80 lakh persons. Brochure, 17 October 2026.",
        "notes": {
            "p1": "Readiness tools are Later. The OEM and Tier-1 already have vendor development.",
            "p2": "The payment cell is 4 because OEM cycles are real, and it should be run on the pack row rather than duplicated here. ODR, EMI and outcomes stay Later.",
            "p3": "PLI and the demand incentive are the anchor’s schemes. All four P3 tools stay Later so this row does not compete with the pack centre.",
            "p4": "A map that points suppliers to the pack cohort, rather than a new scorecard, is the only Activate.",
            "delivery": "The belts exist, so a desk could open. It should not, while the pack centre is the year-1 vehicle. Delivery stays 4 as a property of the belt, not as a decision to open.",
            "add": "Prefer the pack and BMS sibling. Additionality of a second auto centre is 2.",
        },
    },
)

add(
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
        **bands(
            (40, 30, 80, 1500, 4350),
            (
                "Domestic and some module exports — exporter count n.p.",
                "n.p.",
                "n.p.",
            ),
            "Universe: a reconstructed ~6,000 BOS, structure and O&M firms, with ALMM manufacturers in the upper bands. Installer micro-enterprises inflate Micro and are a service tail, labelled as such.",
        ),
        "mfi": "Thin on the fabricator. A rooftop installer sometimes uses MUDRA. That installer is not the manufacturing cohort.",
        "lending": H_LEND + "Sector: IREDA and bank project finance serve plants and power projects. PLI is the awarded manufacturer’s incentive. No BOS-MSME line verified.",
        "insurance": "Marine, erection all-risk and performance covers sit on the project. Fabricator receivables from an EPC are uninsured. ECGC if the module maker exports.",
        "vcpe": "Deep on listed and sponsored module makers. None on the structure fabricator.",
    },
    {
        "name": "Solar PV modules & BOS",
        "delivery": 4,
        "add": 3,
        "tools": tools(3, 3, 3, 4, 4, 3, 2, 3, 3, 3, 3, 3, 4, 3, 3, 4),
        "problem": "EPC payment terms hit BOS fabricators, and ALMM compliance is about to tighten for cells, but the fabricator list is not the ALMM list.",
        "intervene": "Phase II mapping of BOS fabricators in Gujarat. Programme files and compliance intel so a small fabricator is not sent into PLI. A payment cell only where the EPC invoice is formal.",
        "out": "Do not run a module plant or treat enlisted GW as a cluster.",
        "action": "Next mapping / Phase II wave",
        "sources": "MNRE: ALMM from 21 manufacturers in 2021 to 100 manufacturers and 123 units at 100 GW. PLI tranches: 3 and 11 bidders. Installed PLI capacity about 18.5 GW modules as on 30 June 2025, which is capacity. Brochure, 17 October 2026.",
        "notes": {
            "p1": "Programme files are 4 so the fabricator is not pointed at PLI. The other readiness tools are Later: the micro installer is a different job.",
            "p2": "EPC delays justify a payment cell. ODR is Later. EMI Skips: the stress is inventory and the EPC, not a consumer EMI.",
            "p3": "IREDA and PLI are the plant’s channels. They are Later for this ring, not Activate.",
            "p4": "Mapping BOS separately from ALMM is Activate. Cell-ALMM compliance intel is Activate for manufacturers who are already mid-size; it is not a micro clinic. The scorecard is Later.",
            "delivery": "Gujarat fabrication can host a spoke. Delivery is 4 and the decision is still not year 1.",
            "add": "MNRE, SECI and IREDA already run the official door. Additionality is 3.",
        },
    },
)

add(
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
        **bands(
            (200, 150, 300, 4000, 10350),
            (
                "n.p. — services",
                "n.p.",
                "n.p.",
            ),
            "Universe: a reconstructed ~15,000 campus vendors and small tech firms. This shape is weak and is labelled reconstructed. It is not NASSCOM membership.",
        ),
        "mfi": "None typical.",
        "lending": H_LEND + "Sector: none for a GCC. The GCC is a buyer and a member.",
        "insurance": "Professional indemnity is standard at the GCC and rare at a tiny vendor. Vendor receivables are uninsured.",
        "vcpe": "Deep public markets and private equity on IT and GCC sponsors. None on the facilities vendor.",
    },
    {
        "name": "IT services & GCCs",
        "delivery": 2,
        "add": 2,
        "tools": tools(3, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 4, 4, 2, 2),
        "problem": "There is no MSME factory cohort. Treating GCCs as a cluster would crowd out the year-1 five.",
        "intervene": "Invite GCCs as anchors or members inside a real cluster. Map campus vendors only if a host city asks. No centre.",
        "out": "Do not open an IT cluster or a GCC park.",
        "action": "Watch — mapping and friction only",
        "sources": "PIB: services exports USD 383.51 billion, FY2024–25. No HSN. Phase II. Brochure, 17 October 2026.",
        "notes": {
            "p1": "Readiness tools are the wrong product for a GCC. They stay Later or Skip.",
            "p2": "GCC vendor payment is not a cluster recovery book. Receivables tools Skip.",
            "p3": "No scheme or lender pathway the centre should staff. The sector is a capitalled industry already.",
            "p4": "Mapping and a short friction note Activate only to stop this row being proposed as a centre.",
            "delivery": "Chapter 18. Delivery is 2.",
            "add": "Prefer any sibling that has a factory receivable. Additionality of an IT centre is 2.",
        },
    },
)

add(
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
        **bands(
            (40, 60, 150, 1500, 3250),
            (
                "n.a. as exporters",
                "n.a. as exporters",
                "n.a. as exporters",
            ),
            "Universe: a reconstructed ~5,000 care-delivery and healthtech firms. Device manufacturers are excluded.",
        ),
        "mfi": "Thin. A micro collection centre may use MUDRA. The funded healthtech company does not.",
        "lending": H_LEND + "Sector: healthcare NBFCs and hospital-equipment finance exist and usually serve the chain, not the collection point. No centre should originate them.",
        "insurance": "Clinical and professional covers sit with the provider. Scheme and insurer payouts to a small centre are uninsured receivables. This is not product-liability cover for a device.",
        "vcpe": "Deep on healthtech platforms. Thin on the collection point.",
    },
    {
        "name": "Healthtech & care delivery",
        "delivery": 3,
        "add": 2,
        "tools": tools(4, 3, 4, 3, 4, 3, 3, 3, 3, 3, 3, 3, 4, 3, 3, 3),
        "problem": "Insurer and public-scheme payouts to small care units are slow, and this row is easily confused with medical devices.",
        "intervene": "Do not open a second health centre. If a device centre sees care-unit invoices, record them as out of cohort. Mapping only, to keep the rows apart.",
        "out": "Do not double-count device exports, finance a hospital, or relaunch Phase II healthtech as new.",
        "action": "Next mapping / Phase II wave",
        "sources": "Telemedicine practice guidelines, 2020. Medtech exports USD 4.02 billion are a different row and are not used. Brochure, 17 October 2026.",
        "notes": {
            "p1": "Credit Kaksha and Digital Dost are 4 for a small diagnostic unit’s lender file. Rating and programme files are Later.",
            "p2": "The payment cell is 4 because insurer and scheme payouts recur. ODR and EMI are Later: many claims are not invoices in the MSME Act sense.",
            "p3": "Healthcare NBFCs are the chain’s product. The centre should not staff a lender route here while the device row is the year-1 health cohort.",
            "p4": "Mapping Activate, only to prevent a merge with medical devices. Other research tools are Later.",
            "delivery": "No belt that is not a hospital chain. Delivery is 3.",
            "add": "Phase II health programmes and the hospital chains already exist. Additionality is 2.",
        },
    },
)

add(
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
        **bands(
            (20, 30, 50, 700, 2200),
            (
                "n.a. as exporters",
                "n.a. as exporters",
                "n.a. as exporters",
            ),
            "Universe: a reconstructed ~3,000 training and edtech firms. Not an NSDC extract.",
        ),
        "mfi": "None typical. Fee-financing NBFCs lend to learners, not to a training-partner’s receivable.",
        "lending": H_LEND + "Sector: scheme training contracts are grants or outcome payments. They are not a cluster loan. Learner NBFCs are out of charter.",
        "insurance": "Liability for a training centre is commercial. Outcome-payment receivables are uninsured.",
        "vcpe": "Was deep on consumer edtech platforms and has since concentrated. None of it is a training-partner book the centre should intermediate.",
    },
    {
        "name": "Education technology & skilling",
        "delivery": 2,
        "add": 1,
        "tools": tools(3, 2, 3, 3, 2, 2, 2, 2, 2, 3, 2, 3, 3, 3, 2, 2),
        "problem": "Training partners are how a centre delivers apprenticeships. They are not themselves the MSME cohort.",
        "intervene": "Use colleges and training partners inside the five year-1 vehicles. Do not score them as a sixth cluster.",
        "out": "Out of cluster charter. Do not open an edtech cluster or finance a college.",
        "action": "Out of cluster charter — delivery partner",
        "sources": "Skill and apprenticeship programmes; remote-learning wave from 2020. Services account USD 383.51 billion, PIB FY25, is not this cohort. Brochure, 17 October 2026. Forced out of charter.",
        "notes": {
            "p1": "The brochure’s academic and apprenticeship function uses these partners. It does not enrol them as the cohort. Readiness tools stay Later or Skip.",
            "p2": "Outcome-payment delays are not the factory receivable the charter is built for. Receivables tools Skip.",
            "p3": "Scheme training contracts are Later at most. The centre must not become a placement agency.",
            "p4": "A map of partners is an operating list for the five vehicles, not a cluster scorecard.",
            "delivery": "No belt.",
            "add": "The type is the delivery partner. Additionality of a centre on edtech is 1. Forced out of charter.",
        },
    },
)

add(
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
        **bands(
            (40, 60, 150, 4000, 15750),
            (
                "n.a. as exporters",
                "n.a. as exporters",
                "n.a. as exporters",
            ),
            "Universe: a reconstructed ~20,000 fleet owners and small warehouses in the major belts. Riders who are not enterprises are excluded.",
        ),
        "mfi": "Active on the last-mile micro fleet: vehicle NBFCs, MUDRA and some NBFC-MFI household top-ups. That credit is the EMI the payment delay then breaks.",
        "lending": H_LEND + "Sector: vehicle NBFCs are the real product for a small fleet. They are not a Catalyst loan. No e-commerce-MSME guarantee beyond CGTMSE was verified.",
        "insurance": "Vehicle, goods-in-transit and warehouse covers are commercial and uneven at the micro fleet. Platform payouts are uninsured. ECGC is n.a.",
        "vcpe": "Deep on platforms and large 3PLs. None on the fleet owner.",
    },
    {
        "name": "E-commerce logistics & warehousing",
        "delivery": 5,
        "add": 4,
        "tools": tools(4, 3, 4, 3, 5, 4, 4, 5, 4, 3, 4, 4, 4, 4, 4, 3),
        "problem": "Platform and 3PL payouts land after the vehicle EMI is due, for a micro fleet that already has a formal loan.",
        "intervene": "Reserve, not year 1: attach a payment cell to the Bhiwandi annex if a sixth slot is funded. Credit Kaksha on the EMI-versus-payout gap. Do not build a warehouse.",
        "out": "Do not become a 3PL, a fleet lessor, or a new Phase II discovery.",
        "action": "High-need reserve — not year-1 unless a sixth slot",
        "sources": "E-way bill and warehouse geography (Bhiwandi and peer belts). No HSN. Vehicle NBFC and MUDRA use on micro fleets is the lending channel. Brochure, 17 October 2026.",
        "notes": {
            "p1": "Credit Kaksha and Digital Dost Activate because the fleet owner’s loan file and e-way compliance fail together. Rating and programme files are Later.",
            "p2": "Platform payout versus a live vehicle EMI is the EMI-concept case, so payment, ODR, EMI explore and outcome tracking all Activate.",
            "p3": "Working capital matched to the payout cycle, the vehicle-NBFC route, and a platform as the named buyer are 4. There is no sector scheme whose usability is the main job.",
            "p4": "The belt can carry a scorecard in year 1 if the annex opens, so mapping, friction and the scorecard are 4. Compliance on e-way is Later relative to the cash cycle.",
            "delivery": "A Bhiwandi-type annex is the delivery form already. Delivery is 5.",
            "add": "Platforms do not run a fleet-owner recovery cell. Additionality is 4. It is still a reserve because the year-1 five are fuller factory cohorts.",
        },
    },
)

add(
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
        **bands(
            (40, 30, 50, 400, 1480),
            (
                "n.a.",
                "n.a.",
                "n.a.",
            ),
            "Universe: a reconstructed ~2,000 fintech enterprises. BC agents are excluded because they are not the firm.",
        ),
        "mfi": "The NBFC-MFI is often the regulated entity itself. That is the opposite of a borrower cohort. Do not code the MFI as the micro tail of this row.",
        "lending": "These entities originate or distribute MUDRA, microfinance and business loans. They are not the borrowers. Listing CGTMSE here would invert the charter.",
        "insurance": "They distribute covers. They are not the uninsured MSME receivable.",
        "vcpe": "Deep. Fintechs are capitalled firms and capital providers. That depth is a reason to invite them as members, not to open a centre.",
    },
    {
        "name": "Fintech & BC-agent networks",
        "delivery": 1,
        "add": 1,
        "tools": tools(2, 2, 3, 2, 2, 1, 1, 2, 2, 2, 2, 2, 3, 2, 2, 2),
        "problem": "There is no borrowing cohort. Opening a fintech cluster would put the lender in the borrower’s seat.",
        "intervene": "Invite regulated lenders and BC networks as members inside the five vehicles. No centre.",
        "out": "Out of cluster charter. Do not allocate leads, rank lenders, or create a fintech cluster.",
        "action": "Out of cluster charter — member / partner",
        "sources": "Account Aggregator, 2021. BC and NBFC-MFI frameworks. No HSN. Brochure, 17 October 2026: the platform does not lend or route MSMEs to a preferred lender. Forced out of charter.",
        "notes": {
            "p1": "Credit Kaksha is something these firms might help deliver. It is not a service they need as a cluster. Tools Skip or Later.",
            "p2": "ODR and EMI Skip. A lender’s collection book is not the charter’s recovery cell.",
            "p3": "Capital pathways are what the member provides after a file exists. The centre does not build that market as a cohort.",
            "p4": "A map of willing member lenders is an operating list, Later, not a cluster study.",
            "delivery": "No cluster vehicle.",
            "add": "The type is a capital provider. Additionality of a centre is 1. Forced out of charter.",
        },
    },
)

add(
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
        **bands(
            (2, 4, 10, 80, 304),
            (
                "n.p.",
                "n.p.",
                "n.p.",
            ),
            "Universe: a reconstructed ~400 manufacturers and component workshops, including uncertified shops in Micro. The 23 PLI firms are the upper end. FY2021–22 sales of ₹319 crore across 23 firms are the only official size evidence and are not a band.",
        ),
        "mfi": "None typical for manufacturing. Namo Drone Didi uses SHGs for agricultural drone services, which is not this manufacturing row.",
        "lending": H_LEND + "Sector: PLI disbursement of about ₹98.32 crore was reported to Parliament. It is a closed incentive, not a loan. No cluster lending scheme.",
        "insurance": "DGCA third-party liability sits on the operator. Hull and product liability for the manufacturer are commercial. No penetration figure.",
        "vcpe": "Narrow and real at the top: a few manufacturers raised venture capital and ideaForge is listed. The component MSME on the 2022 list is not in that market.",
    },
    {
        "name": "Drones & drone components",
        "delivery": 4,
        "add": 3,
        "tools": tools(3, 2, 4, 4, 3, 2, 2, 2, 3, 3, 2, 3, 4, 4, 2, 4),
        "problem": "DGCA type-certification files, not a receivable book large enough to staff.",
        "intervene": "Attach file help to the existing demo if it is still live: Digital Dost, programme files and compliance intel. Do not open a new centre. Do not borrow Namo Drone Didi’s SHG population.",
        "out": "Do not relaunch the drone demonstration as a new discovery or run a training organisation.",
        "action": "Attach pillars to the existing demo",
        "sources": "Drone Rules and PLI, 2021, outlay ₹120 crore. PIB, 6 July 2022: 23 beneficiaries, combined sales ₹319 crore in FY2021–22. PIB, 26 July 2024: 48 manufacturing companies, 70 type-certified models, 16,000 remote pilot certificates, 116 training organisations. Brochure, 17 October 2026.",
        "notes": {
            "p1": "Digital Dost and programme files Activate because the type certificate is the drop-off. Credit Kaksha is Later. Rating Skips: the firms are young and few.",
            "p2": "There are not enough formal buyer invoices to staff ODR, EMI or a recovery score. The payment cell is Later.",
            "p3": "PLI is closed. Lender route Skips. Capital and scheme tools are Later. Venture capital has already found the few primes.",
            "p4": "Mapping and friction on who never finishes certification Activate, plus compliance intel. A scorecard of a few dozen firms is Skip.",
            "delivery": "The demo exists, so an attachment is plausible even though the firms are scattered. Delivery is 4.",
            "add": "DGCA and the closed PLI already structure the industry. Catalyst would add file completion only. Additionality is 3.",
        },
    },
)

add(
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
        **bands(
            (80, 120, 300, 3500, 12000),
            (
                "Exporter headcount n.p. Authorisations in FY25 were 1,762, which is not this cell",
                "n.p. — authorisations are not a turnover band",
                "n.p.",
            ),
            "Universe: the descriptive ~16,000 MSMEs, reconstructed into bands. It is not a licence census. The 462 licensed companies are a different population and sit conceptually in the upper bands without being forced to equal 462.",
        ),
        "mfi": "None typical. A DPSU vendor’s buyer is a public enterprise. MFI, SHG and NABARD rural products do not match the contract.",
        "lending": H_LEND + "Sector: iDEX grants up to ₹1.5 crore; ADITI and TDF are grants, not working capital. ₹449.62 crore was allocated to iDEX including ADITI for 2025–26. Bank finance against a defence contract where the bank will lend.",
        "insurance": "ECGC for the exporter of record. Contractual transit and product covers. Milestone receivables are uninsured. No MSME-wide defence cover verified.",
        "vcpe": "Selective on startups with a contract. The iDEX grant is not venture capital. The machine shop on a DPSU order is a bank file.",
    },
    {
        "name": "Defence manufacturing (private)",
        "delivery": 5,
        "add": 3,
        "tools": tools(4, 3, 3, 4, 4, 3, 2, 4, 3, 3, 3, 3, 5, 4, 3, 4),
        "problem": "DPSU milestone bills stick, and three different population numbers are briefed as if they were one cluster.",
        "intervene": "Attach to the existing demo, and only if a DPSU or prime opens its vendor list: Credit Kaksha, programme files, a payment cell and compliance intel on export authorisation. Do not relaunch the demo.",
        "out": "Do not bid a contract, grant an iDEX award, or treat 16,000 and 462 as the same count.",
        "action": "Attach pillars to the existing demo",
        "sources": "PIB, 1 April 2025: exports ₹23,622 crore; 1,762 authorisations; exporter count up 17.4% with no headcount. PIB, 9 August 2025: production ₹1,50,590 crore. February 2025 iDEX note: 619 startups and MSMEs, 430 contracts. About 16,000 MSMEs; 788 licences to 462 companies. FY25 domestic contracts: 193 worth ₹2,09,050 crore, of which 177 worth ₹1,68,922 crore were domestic. Brochure, 17 October 2026.",
        "notes": {
            "p1": "Credit Kaksha and programme files Activate for a vendor who cannot turn a milestone bill into a bank file. Rating and Digital Dost are Later.",
            "p2": "The payment cell and outcome tracking Activate because milestone delay is structural. ODR is Later: many vendors sit outside the micro and small ceiling. EMI Skips; the instrument is the milestone, not a retail EMI.",
            "p3": "iDEX is a grant, not the scheme-usability job, and SIDM and the DPSU already run empanelment. P3 stays Later.",
            "p4": "Mapping is 5 because the three population numbers cannot be one brief. Friction and export-authorisation compliance Activate. The scorecard is Later.",
            "delivery": "The demo and the corridors exist. Delivery is 5 as an attachment, not as a new park.",
            "add": "iDEX, SIDM and the corridors already occupy the ground. Catalyst adds the cash-flow file only. Additionality is 3.",
        },
    },
)

add(
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
        **bands(
            (25, 40, 120, 1400, 2915),
            (
                "Domestic brand offtake — n.a. as exporters",
                "n.a. as exporters",
                "n.a. as exporters",
            ),
            "Universe: the Noida–Hapur annex of about 4,500 MSMEs. The 84 PLI companies are not this pyramid.",
        ),
        "mfi": "Thin. MUDRA reaches a micro furniture unit. A job-worker on a brand schedule needs a bank line. No sector MFI.",
        "lending": H_LEND + "Sector: PLI White Goods is the 84 companies’ incentive. TReDS if the brand onboards the job-worker. No annex-specific loan.",
        "insurance": "Fire and marine commercial. Brand GRN receivables are uninsured. Product liability sits with the brand. ECGC is the brand’s cover when the brand exports.",
        "vcpe": "Moderate on a few branded appliance companies. None on the furniture and sheet-metal MSME.",
    },
    {
        "name": "White goods & furniture",
        "delivery": 5,
        "add": 4,
        "tools": tools(4, 5, 4, 3, 5, 5, 4, 4, 4, 4, 4, 3, 4, 4, 3, 3),
        "problem": "Brand goods-receipt delays, and BIS energy-rating or quality files, inside an annex of about 4,500 MSMEs.",
        "intervene": "Year-1 attachment to the Noida–Hapur annex: Rating Kaksha on BIS, a payment cell and ODR on brand GRNs, Credit Kaksha, and the lender route after the file. Do not relaunch the demo.",
        "out": "Do not administer PLI White Goods or build another industrial estate.",
        "action": "Year-1 attach pillars to the appliances annex",
        "sources": "PLI White Goods: 84 companies, intended investment ₹10,478 crore. Noida–Hapur annex about 4,500 MSMEs, the cohort used for this row. Brochure, 17 October 2026.",
        "notes": {
            "p1": "Rating Kaksha is 5 because BIS and energy-rating files are the discipline a brand asks for. Credit Kaksha and Digital Dost are 4. Programme files are Later: PLI is the wrong window and should not be staffed as if it were theirs.",
            "p2": "Brand GRN delay is the same receivables logic as food. Payment cell, ODR and EMI-explore Activate. Outcome tracking is 4.",
            "p3": "Working capital, scheme clarity, and the bank route are 4. Market access is Later: the annex already has a buyer panel.",
            "p4": "Mapping and friction on who in the 4,500 actually invoices the brand are 4. Scorecard and a new compliance stack are Later; BIS sits in Rating Kaksha.",
            "delivery": "The annex exists. Delivery is 5.",
            "add": "The annex and PLI do not run ODR or a rating clinic. Additionality is 4.",
        },
    },
)

add(
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
        **bands(
            (30, 50, 120, 1500, 4300),
            (
                "Domestic retail and some export houses — exporter count n.p.",
                "n.p.",
                "n.p.",
            ),
            "Universe: a reconstructed demo-belt cohort of about 6,000 units, not the national 1.73 lakh PMFME approvals and not the 42,801 ASI factories. National figures stay in the participant field.",
        ),
        "mfi": "Active. PMFME is a credit-linked subsidy through banks. Seed capital reached 3,76,326 SHG members (₹1,282.99 crore) as on 31 December 2025. NABARD and the state rural livelihood missions are in the same districts. NBFC-MFIs are a parallel micro channel, not the scheme administrator.",
        "lending": H_LEND + "Sector: PMFME credit-linked subsidy. As on 30 June 2025, 1,44,517 loans sanctioned, amount ₹11,501.79 crore. PLI food is the large-firm incentive (investment reported ₹9,032 crore; sales ₹3,80,350 crore; employment 3,40,116 direct and indirect). Do not mix the two into one loan.",
        "insurance": "Product liability and stock once the unit leaves the kitchen. PMFBY covers the farmer, not the processor. Cold-chain and fire covers are commercial. Retail and quick-commerce receivables are uninsured. No PMFME-specific cover was identified.",
        "vcpe": "Moderate to deep on packaged-food brands and PLI companies. None on the micro unit. Brand deals are not access for the approved PMFME list.",
    },
    {
        "name": "Food processing (PLI wave)",
        "delivery": 5,
        "add": 3,
        "tools": tools(5, 4, 4, 5, 5, 4, 4, 5, 4, 5, 4, 4, 4, 5, 4, 4),
        "problem": "Retail and quick-commerce payments, and PMFME or FPO files that stall, inside a demo that already exists.",
        "intervene": "Attach to the food demo: Credit Kaksha for the FPO and micro unit, programme files so PMFME reaches formalisation, a payment cell on retail and quick-commerce invoices, and a scheme desk. Do not open a second park.",
        "out": "Do not run PLI food, build a mega food park, or replace the state nodal agency.",
        "action": "Year-1 attach pillars to the food demo",
        "sources": "MoFPI: PLI food outlay ₹10,900 crore; 70 MSMEs directly and 40 contract manufacturers; scheme sales ₹3,80,350 crore. PMFME: 1,72,707 approved and 59,202 formalised as on 31 December 2025; 3,76,326 SHG members. ASI FY25 food factories 23.61 lakh persons. PMFME evaluation, 31 March 2025: more than 2.8 lakh opportunities and about 1.7 times turnover. Brochure, 17 October 2026.",
        "notes": {
            "p1": "Credit Kaksha and programme files are 5 because the scheme is credit-linked and the approval-to-formalisation gap is measured. Rating Kaksha is 4 for units that have left the kitchen and now face a buyer. Digital Dost is 4.",
            "p2": "Retail and quick-commerce invoices are the formal receivable, so the payment cell, ODR, EMI-explore and outcome tracking Activate. This is a different cash cycle from a kirana-only micro unit, and the demo has to select units that have those invoices.",
            "p3": "Scheme usability is 5. Capital, lender and buyer links are 4. PLI food is not the micro unit’s scheme, and the centre must say so.",
            "p4": "Friction research is 5 because 1,72,707 approved and 59,202 formalised are the drop-off. Mapping, the scorecard and FSSAI compliance are 4.",
            "delivery": "The demo exists. Delivery is 5 as an attachment.",
            "add": "The state nodal agency already runs PMFME. Catalyst adds the retail payment cell and the file standard, not a second helpdesk. Additionality is 3. Food still takes the attach slot because the demo is standing, while pack and BMS is the new centre.",
        },
    },
)


def assert_register():
    ids = [i["id"] for i in INDUSTRIES]
    expected = [
        "medtech", "semi", "toys", "footwear", "battery", "ewaste", "dc-ancillary",
        "charging", "techtex", "space", "ghydrogen", "ethanol", "nutra", "agritech",
        "avgc", "geospatial", "cyber", "specialty-steel", "api", "electronics", "ev",
        "solar", "it", "healthtech", "edtech", "logistics", "fintech", "drones",
        "defence", "appliances", "food",
    ]
    if ids != expected:
        raise SystemExit(f"id order drift: {ids}")
    if len(RAWS) != 31:
        raise SystemExit("raw count")
    str_fields = [
        "id", "name", "funded", "participants", "participantKind", "ancillaries",
        "activity", "geo", "mode", "icam", "why", "hs4", "exportFy25", "exportUnits",
        "turnover", "turnSplit", "employees", "vintage", "large", "expLarge",
        "med200", "expMed200", "med100", "expMed100", "small", "micro", "mfi",
        "lending", "insurance", "vcpe", "bandNote",
    ]
    for ind in INDUSTRIES:
        for key in str_fields:
            if not str(ind.get(key, "")).strip():
                raise SystemExit(f"empty {ind['id']}.{key}")
        if ind["activity"] not in ("Manufacturing", "Services", "Both"):
            raise SystemExit(ind["id"])
        if ind["mode"] not in ("Traditional", "Digital", "Hybrid"):
            raise SystemExit(ind["id"])
        if ind["icam"] not in ("Demo", "Phase II", "New candidate"):
            raise SystemExit(ind["id"])
        if sum(ind["bandPct"]) != 100:
            raise SystemExit(f"bandPct {ind['id']} {ind['bandPct']}")
    for raw in RAWS:
        for key in ("problem", "intervene", "out", "action", "justify", "sources"):
            if not str(raw.get(key, "")).strip():
                raise SystemExit(f"empty raw {raw['id']}.{key}")
    ranked = rank_rows(RAWS)
    print("RANK")
    for row in ranked:
        print(f"{row['rank']:2} {row['overall']:.3f} {row['tier']:16} {row['id']}")
    top = [r["id"] for r in ranked[:7]]
    want = ["medtech", "footwear", "battery", "food", "appliances", "logistics", "toys"]
    if top != want:
        raise SystemExit(f"calibration drift: {top}")
    # forced
    for row in ranked:
        if row["id"] in {"fintech", "edtech", "cyber", "ghydrogen"} and row["tier"] != "Out of charter":
            raise SystemExit(row["id"])
    semi = next(r for r in ranked if r["id"] == "semi")
    if semi["tier"] != "Watch":
        raise SystemExit("semi tier")
    if [k for k in semi["activate"]] != ["map", "friction"]:
        raise SystemExit(f"semi activate {semi['activate']}")
    ewaste = next(r for r in ranked if r["id"] == "ewaste")
    if ewaste["tools"]["odr"] > 2 or ewaste["tools"]["emi"] > 2:
        raise SystemExit("ewaste odr/emi")
    return ranked


CANVAS_A_HEAD = r'''import { useMemo, useState } from "cursor/canvas";
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

const INDUSTRIES: Industry[] = '''

CANVAS_A_TAIL = r'''

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
'''

CANVAS_B_HEAD = r'''import { useMemo, useState } from "cursor/canvas";
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

const RAW: Raw[] = '''

CANVAS_B_TAIL = r'''

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
'''


def emit_array(rows):
    body = json.dumps(rows, indent=2, ensure_ascii=False)
    if not (body.startswith("[\n") and body.endswith("\n]")):
        raise SystemExit("json shape")
    # Keep the opening bracket. The closing line must be `];` so parsers match `\n];`.
    return body[:-1] + "];"


def main():
    assert_register()
    CANVAS_DIR.mkdir(parents=True, exist_ok=True)
    a_path = CANVAS_DIR / "new-industry-cluster-map.canvas.tsx"
    b_path = CANVAS_DIR / "charter-intervention-rank.canvas.tsx"
    a_path.write_text(CANVAS_A_HEAD + emit_array(INDUSTRIES) + "\n" + CANVAS_A_TAIL, encoding="utf-8")
    b_path.write_text(CANVAS_B_HEAD + emit_array(RAWS) + "\n" + CANVAS_B_TAIL, encoding="utf-8")
    print(f"wrote {a_path} ({a_path.stat().st_size} bytes)")
    print(f"wrote {b_path} ({b_path.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
