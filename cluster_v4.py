"""The 54 local clusters from cluster v4, 30 October 2026.

Facts are copied from that workbook. A score is filled only where a published
figure maps onto the 1–5 anchor. A named enquiry route is not a partner, a
college conversation, or a lender.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

EXTRACT = Path(__file__).resolve().parent / "data" / "cluster-v4-extract.json"

# Published belt counts that map onto the count anchor.
# Panipat's 3,095 is a 2015–16 textile profile, and the carpet count is unverified.
# Faridabad's 12,015 is a 2012 mixed engineering study, not this metals cohort.
# Pune's 2,000 is units served, not a census. Peenya's 100 is a machine-tool subset.
COUNT_SCORE = {
    "T-Tiruppur": 5,
    "M-Coimbatore": 3,
    "M-Kolhapur": 3,
}

# TEA FY2024–25 knitwear exports are the belt's published export. The rupee
# figure is the ecosystem, so the score stays 4.
EXPORT_SCORE = {
    "T-Tiruppur": 4,
}

# A listed facility is a 3. It is not a request to house the desk.
STATE_SCORE = {
    "ADD07": 3,
    "ADD10": 3,
    "ADD11": 3,
    "ADD13": 3,
}

STATE_NOTE = {
    "ADD07": "Peenya cluster SPV exists (cluster v4, 30 October 2026). A facility is in place.",
    "ADD10": "Hosur engineering CFC is listed complete (cluster v4, 30 October 2026). A facility is in place.",
    "ADD11": "Hosur Print and Pack CFC is reported developed in FY2023–24 (cluster v4). A facility is in place.",
    "ADD13": "Plastic woven-sacks CFC at Pillaipakkam/Sriperumbudur is listed complete (cluster v4). A facility is in place.",
}

SIZE_NOTE = {
    "T-Kolhapur": "60 micro enterprises in a CFC proposal, and 240 women artisans in a separate project. Neither figure is the whole cluster. Turnover bands are not verified.",
    "M-Coimbatore": "The foundry lists include large and medium units as well as micro and small. Shares are not published. Turnover bands are not verified.",
    "M-Faridabad": "The 12,015 figure is a 2012 mixed engineering cluster, not a metals size mix. Turnover bands are not verified.",
    "ADD07": "The 100 MSMEs are a historical machine-tool subset, plus 6 large units. That is not a size mix for the fabrication belt.",
    "T-Tiruppur": "TEA's unit count does not split nano, micro, small and medium. Turnover bands are not verified.",
}


def clip(text: str, limit: int = 360) -> str:
    text = " ".join(str(text).split())
    if len(text) <= limit:
        return text
    cut = text[: limit - 1].rsplit(" ", 1)[0]
    return cut + "…"


def place_of(geo: str) -> str:
    text = " ".join(geo.split())
    state = text.split(";")[0].strip()
    district = ""
    belt = ""
    district_match = re.search(r"district: ([^.]+)", text)
    belt_match = re.search(r"Candidate belt: ([^.]+)", text)
    if district_match:
        district = district_match.group(1).strip()
    if belt_match:
        belt = belt_match.group(1).strip()
    parts = [state]
    if district and district.lower() not in state.lower():
        parts.append(district)
    if belt:
        parts.append(belt)
    return " · ".join(part for part in parts if part)[:220]


def local_route(infra: str) -> str:
    text = " ".join(infra.split())
    match = re.search(r"Local route(?: for enquiry)?: (.*?)(?:Local scope|No local agreement|Academic route|$)", text)
    if not match:
        return ""
    return match.group(1).strip(" .")


def load_rows() -> list[dict]:
    rows = json.loads(EXTRACT.read_text(encoding="utf-8"))
    if len(rows) != 54:
        raise SystemExit(f"cluster v4 extract has {len(rows)} rows, expected 54")
    return rows


def as_cluster(row: dict) -> dict:
    partner = row["partner"].strip()
    if "local NV" in partner:
        partner_note = "No local delivery partner is named. Cluster v4 marks the local route as not verified."
    else:
        partner_note = f"{partner}. Cluster v4 records this as an enquiry route. No agreement is recorded."

    export_text = row["export_text"]
    if row["id"] in EXPORT_SCORE:
        export_note = clip(export_text, 420)
    elif export_text.startswith("Local gross turnover"):
        export_note = f"Cluster v4 label: {row['export_label']}. No local export value is published for this cohort."
    else:
        export_note = f"Cluster v4 label: {row['export_label']}. {clip(export_text, 280)}"

    if row["id"] in STATE_NOTE:
        state_note = STATE_NOTE[row["id"]]
    else:
        route = local_route(row["infra"])
        if route and "not yet mapped" not in route.lower():
            state_note = f"Named route: {route}. Cluster v4 does not record a state scheme or park already in place."
        else:
            state_note = "No state scheme, park, or nodal office is recorded for this belt in cluster v4."

    count_score = COUNT_SCORE.get(row["id"])
    export_score = EXPORT_SCORE.get(row["id"])
    state_score = STATE_SCORE.get(row["id"])
    return {
        "id": row["id"],
        "name": row["name"],
        "place": place_of(row["geo"]),
        "hsn": row["hsn"],
        "hsn_note": f"{row['product']}. {row['goods']}",
        "list": "Cluster v4",
        "count": (clip(row["count"], 420), count_score),
        "growth": (
            f"No published comparison of units, sales or exports for this belt. Comparison-row observation: {row['status']}.",
            None,
        ),
        "partners": (partner_note, None),
        "colleges": (
            f"{row['college']}. Named in cluster v4 as the academic route. No meeting is recorded.",
            None,
        ),
        "lenders": (
            f"No lending company is named. Product types listed in cluster v4: {row['lending']}.",
            None,
        ),
        "marketing": ("No marketing company is named in cluster v4.", None),
        "export": (export_note, export_score),
        "listing": ("No listing candidate is named in cluster v4.", None),
        "size": (
            SIZE_NOTE.get(
                row["id"],
                "Turnover bands are not verified in cluster v4, so the nano, micro, small and medium mix is still open.",
            ),
            None,
        ),
        "state": (state_note, state_score),
        "central": (
            "Cluster v4 names the same horizontal routes for every belt: SIDBI, CGTMSE, MUDRA, LEAN, ZED and NSIC. It does not show MSMEs in this belt already inside a cluster-specific central scheme.",
            None,
        ),
        "other": (
            f"Cluster v4 position: {row['position']}. Comparison-row observation: {row['status']}. Do not add this count to an overlapping row.",
            None,
        ),
    }


def clusters() -> list[dict]:
    return [as_cluster(row) for row in load_rows()]
