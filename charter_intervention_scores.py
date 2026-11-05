"""Charter scores for the 31 industry types. Same weights as Canvas B."""

TOOL_KEYS = [
    "credit", "rating", "digital", "policy",
    "payment", "odr", "emi", "outcomes",
    "capital", "schemes", "lender", "market",
    "map", "friction", "scorecard", "compliance",
]
P1_KEYS = TOOL_KEYS[0:4]
P2_KEYS = TOOL_KEYS[4:8]
P3_KEYS = TOOL_KEYS[8:12]
P4_KEYS = TOOL_KEYS[12:16]

WEIGHTS = {
    "p1": 0.18,
    "p2": 0.24,
    "p3": 0.18,
    "p4": 0.14,
    "delivery": 0.16,
    "add": 0.10,
}

FORCED_OUT = {"fintech", "edtech", "cyber", "ghydrogen"}


def mean(tools, keys):
    return sum(tools[k] for k in keys) / 4.0


def tier_for(overall, industry_id):
    if industry_id in FORCED_OUT:
        return "Out of charter"
    if overall >= 4.0:
        return "High"
    if overall >= 3.0:
        return "Medium"
    if overall >= 2.0:
        return "Watch"
    return "Out of charter"


def call_for(score):
    if score >= 4:
        return "Activate"
    if score == 3:
        return "Later"
    return "Skip"


def score_row(row):
    tools = row["tools"]
    missing = [k for k in TOOL_KEYS if k not in tools]
    if missing:
        raise ValueError(f"{row.get('id')} missing tools: {missing}")
    p1 = mean(tools, P1_KEYS)
    p2 = mean(tools, P2_KEYS)
    p3 = mean(tools, P3_KEYS)
    p4 = mean(tools, P4_KEYS)
    overall = (
        p1 * WEIGHTS["p1"]
        + p2 * WEIGHTS["p2"]
        + p3 * WEIGHTS["p3"]
        + p4 * WEIGHTS["p4"]
        + row["delivery"] * WEIGHTS["delivery"]
        + row["add"] * WEIGHTS["add"]
    )
    activate = [k for k in TOOL_KEYS if tools[k] >= 4]
    later = [k for k in TOOL_KEYS if tools[k] == 3]
    skip = [k for k in TOOL_KEYS if tools[k] <= 2]
    return {
        "p1": p1,
        "p2": p2,
        "p3": p3,
        "p4": p4,
        "overall": overall,
        "tier": tier_for(overall, row["id"]),
        "activate": activate,
        "later": later,
        "skip": skip,
    }


def rank_rows(rows):
    scored = []
    for row in rows:
        s = score_row(row)
        scored.append({**row, **s})
    scored.sort(key=lambda r: (-r["overall"], r["name"]))
    for i, row in enumerate(scored, start=1):
        row["rank"] = i
    return scored
