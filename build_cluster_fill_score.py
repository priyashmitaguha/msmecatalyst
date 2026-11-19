#!/usr/bin/env python3
"""Write the fill-in Excel scorer and the canvas that uses the same pattern."""

from __future__ import annotations

import json
from pathlib import Path

from openpyxl import Workbook
from openpyxl.chart import BarChart, Reference
from openpyxl.comments import Comment
from openpyxl.formatting.rule import FormulaRule
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation

from cluster_fill_score import (
    CLUSTERS,
    FACTORS,
    READY_AT,
    assert_register,
    books,
    running_score,
    tier_for,
)

ROOT = Path(__file__).resolve().parent
XLSX = ROOT / "Cluster-Fill-Score.xlsx"
CANVAS = ROOT / "canvases" / "cluster-fill-score.canvas.tsx"

NAVY = "0B2545"
PALE = "F4F7FB"
INPUT = "FFF8E8"
DESK = "E7EEF6"
GREEN = "E5F2E9"
AMBER = "FBF3D5"
THIN = Border(
    left=Side(style="thin", color="D5DDE8"),
    right=Side(style="thin", color="D5DDE8"),
    top=Side(style="thin", color="D5DDE8"),
    bottom=Side(style="thin", color="D5DDE8"),
)
WRAP = Alignment(wrap_text=True, vertical="top")
CENTER = Alignment(wrap_text=True, vertical="center", horizontal="center")

EXTRA_ROWS = 15
HEADER_ROW = 4
FIRST = 5


def score_columns():
    # P is 16. Twelve contiguous score columns.
    return [16 + index for index in range(len(FACTORS))]


def fact_columns():
    # D is 4.
    return [4 + index for index in range(len(FACTORS))]


def apply_font(cell, size=10, bold=False, color="1A1A1A", name="Calibri"):
    cell.font = Font(name=name, size=size, bold=bold, color=color)


def fill(cell, hex_color):
    cell.fill = PatternFill("solid", fgColor=hex_color)


def write_weights(wb):
    sheet = wb.create_sheet("Weights")
    sheet["A1"] = "Weights"
    apply_font(sheet["A1"], 16, True, NAVY)
    sheet["A2"] = (
        "These are relative. They do not have to sum to 100. "
        "The score is a weighted average of the factors you have filled, converted to a mark out of 100. "
        "A factor left blank is dropped, and so is its weight. Set a weight to 0 to ignore that factor even when it is filled. "
        "Change a weight here and every cluster on Scores updates."
    )
    apply_font(sheet["A2"], 11)
    sheet["A2"].alignment = WRAP
    sheet.merge_cells("A2:C2")
    sheet.row_dimensions[2].height = 48
    for col, text in enumerate(("Factor", "What you are scoring", "Weight"), start=1):
        cell = sheet.cell(4, col, text)
        fill(cell, NAVY)
        apply_font(cell, 10, True, "FFFFFF")
    for index, factor in enumerate(FACTORS):
        row = 5 + index
        sheet.cell(row, 1, factor["name"])
        sheet.cell(row, 2, factor["prompt"])
        weight = sheet.cell(row, 3, factor["weight"])
        fill(weight, INPUT)
        weight.alignment = CENTER
        weight.number_format = "0"
        for col in (1, 2):
            sheet.cell(row, col).alignment = WRAP
            apply_font(sheet.cell(row, col), 10)
            fill(sheet.cell(row, col), "FFFFFF" if index % 2 == 0 else PALE)
        apply_font(weight, 12, True, NAVY)
        sheet.row_dimensions[row].height = 36
    total_row = 5 + len(FACTORS)
    sheet.cell(total_row, 2, "Sum of weights")
    apply_font(sheet.cell(total_row, 2), 10, True, NAVY)
    total = sheet.cell(total_row, 3, f"=SUM(C5:C{total_row - 1})")
    apply_font(total, 12, True, NAVY)
    total.alignment = CENTER
    sheet.cell(total_row + 2, 1, "Marks out of 100, after at least 8 factors are filled")
    apply_font(sheet.cell(total_row + 2, 1), 10, True, NAVY)
    bands = (
        (80, "Open — worth a conversation about a centre"),
        (60, "Shortlist"),
        (40, "Watch"),
        (0, "Not now"),
    )
    for offset, (mark, label) in enumerate(bands):
        sheet.cell(total_row + 3 + offset, 1, f"{mark} and above" if mark else "Below 40")
        if mark == 0:
            sheet.cell(total_row + 3 + offset, 1, "Below 40")
        sheet.cell(total_row + 3 + offset, 2, label)
        apply_font(sheet.cell(total_row + 3 + offset, 1), 10)
        apply_font(sheet.cell(total_row + 3 + offset, 2), 10)
    sheet.cell(total_row + 8, 1, "Below 8 filled factors the mark still moves, and the tier stays 'Not yet'. A running score is not a decision.")
    apply_font(sheet.cell(total_row + 8, 1), 10)
    sheet.merge_cells(start_row=total_row + 8, start_column=1, end_row=total_row + 8, end_column=3)
    sheet.column_dimensions["A"].width = 32
    sheet.column_dimensions["B"].width = 88
    sheet.column_dimensions["C"].width = 14
    sheet.auto_filter.ref = f"A4:C{total_row - 1}"
    sheet.freeze_panes = "A5"
    sheet.page_setup.orientation = "landscape"
    sheet.page_setup.fitToPage = True
    sheet.page_setup.fitToWidth = 1
    sheet.page_setup.fitToHeight = 1
    sheet.sheet_properties.pageSetUpPr.fitToPage = True
    return sheet


def write_how(wb):
    sheet = wb.create_sheet("How to score", 0)
    sheet["A1"] = "How to score a cluster"
    apply_font(sheet["A1"], 16, True, NAVY)
    sheet["A2"] = (
        "One row is one place you might work, not a national industry essay. "
        "Type the fact, then a score from 1 to 5. Leave the score blank if you do not know. "
        "Blank is not zero. The mark out of 100 is the weighted average of the scores you have entered, divided by 5. "
        "Partners, colleges, lenders, and marketing companies are names of people or firms. "
        "A national scheme is not a partner and not a lender. "
        "Nano means own-account or a self-help group, below a micro enterprise. "
        "Micro is turnover at or below ₹10 crore. Small is ₹10–100 crore. Medium is ₹100–500 crore. Large, above ₹500 crore, is not the lot a centre enrols. "
        "If you will work two places in one industry, copy the row and score each place."
    )
    apply_font(sheet["A2"], 11)
    sheet["A2"].alignment = WRAP
    sheet.merge_cells("A2:E2")
    sheet.row_dimensions[2].height = 78
    headers = ("Factor", "Weight", "Score 1", "Score 3", "Score 5")
    for col, text in enumerate(headers, start=1):
        cell = sheet.cell(4, col, text)
        fill(cell, NAVY)
        apply_font(cell, 10, True, "FFFFFF")
        cell.alignment = WRAP
    for index, factor in enumerate(FACTORS):
        row = 5 + index
        values = (factor["name"], factor["weight"], factor["s1"], factor["s3"], factor["s5"])
        for col, value in enumerate(values, start=1):
            cell = sheet.cell(row, col, value)
            apply_font(cell, 9, col == 1, NAVY if col == 1 else "1A1A1A")
            cell.alignment = WRAP
            fill(cell, "FFFFFF" if index % 2 == 0 else PALE)
        sheet.row_dimensions[row].height = 48
    sheet.column_dimensions["A"].width = 28
    sheet.column_dimensions["B"].width = 12
    for col in ("C", "D", "E"):
        sheet.column_dimensions[col].width = 42

    example_row = 5 + len(FACTORS) + 2
    sheet.cell(example_row, 1, "Worked example — not a real cluster")
    apply_font(sheet.cell(example_row, 1), 13, True, NAVY)
    sheet.cell(example_row + 1, 1, (
        "Count 5, partners 1, lenders 3, export 4, size 5, state 4, central 4. "
        "The other five factors are blank, so they drop out. "
        "Numerator 5×12 + 1×12 + 3×10 + 4×10 + 5×10 + 4×8 + 4×8 = 256. "
        "Denominator 12+12+10+10+10+8+8 = 70. "
        "256 / 70 / 5 × 100 = 73. "
        "Seven factors are filled, so the tier stays Not yet. Fill an eighth factor and the tier appears."
    ))
    apply_font(sheet.cell(example_row + 1, 1), 11)
    sheet.cell(example_row + 1, 1).alignment = WRAP
    sheet.merge_cells(start_row=example_row + 1, start_column=1, end_row=example_row + 1, end_column=5)
    sheet.row_dimensions[example_row + 1].height = 62
    sheet.freeze_panes = "A5"
    sheet.page_setup.orientation = "landscape"
    sheet.page_setup.fitToPage = True
    sheet.page_setup.fitToWidth = 1
    sheet.page_setup.fitToHeight = 1
    sheet.sheet_properties.pageSetUpPr.fitToPage = True
    sheet.oddHeader.left.text = "MSME Catalyst · Cluster fill-in score"
    sheet.oddFooter.left.text = "Blank is not zero. A tier needs 8 of 12 factors."
    return sheet


def write_scores(wb):
    sheet = wb.create_sheet("Scores", 1)
    book = books()
    facts = fact_columns()
    scores = score_columns()
    filled_col = scores[-1] + 1
    mark_col = filled_col + 1
    tier_col = mark_col + 1
    state_col = tier_col + 1

    sheet["A1"] = "Cluster fill-in score"
    apply_font(sheet["A1"], 16, True, NAVY)
    sheet.merge_cells("A1:C1")
    sheet["A2"] = (
        "Yellow score cells are empty on purpose. Blue score cells are a desk starting point from a published figure — overwrite them. "
        "Type 1 to 5. Do not type in the Mark column. "
        f"The tier appears after {READY_AT} factors. Desk date 19 November 2026 (Asia/Kolkata). "
        "Partners, nearby colleges, lenders, marketing companies, and listing are blank until you name them."
    )
    apply_font(sheet["A2"], 10)
    sheet["A2"].alignment = WRAP
    sheet.merge_cells("A2:C2")
    sheet.row_dimensions[2].height = 48

    sheet.cell(3, 15, "Weight")
    apply_font(sheet.cell(3, 15), 9, True, NAVY)
    for index, col in enumerate(scores):
        cell = sheet.cell(3, col, f"=Weights!C{5 + index}")
        apply_font(cell, 10, True, NAVY)
        cell.alignment = CENTER
        fill(cell, PALE)

    headers = ["Id", "Cluster", "Place"]
    headers += [f"{factor['name']} — fact" for factor in FACTORS]
    headers += [factor["name"] for factor in FACTORS]
    headers += ["Filled", "Mark out of 100", "Tier", "Use it?"]
    for col, text in enumerate(headers, start=1):
        cell = sheet.cell(HEADER_ROW, col, text)
        fill(cell, NAVY)
        apply_font(cell, 9, True, "FFFFFF")
        cell.alignment = Alignment(wrap_text=True, vertical="center", horizontal="center")
    sheet.row_dimensions[HEADER_ROW].height = 32
    sheet.auto_filter.ref = f"A{HEADER_ROW}:{get_column_letter(state_col)}{HEADER_ROW}"
    sheet.freeze_panes = "D5"
    sheet.auto_filter.ref = f"A{HEADER_ROW}:{get_column_letter(state_col)}{FIRST + len(CLUSTERS) + EXTRA_ROWS - 1}"

    rows = list(book["clusters"])
    for _ in range(EXTRA_ROWS):
        rows.append({
            "id": "",
            "name": "",
            "place": "",
            "cells": {factor["id"]: {"note": "", "score": ""} for factor in FACTORS},
        })

    score_range_start = get_column_letter(scores[0])
    score_range_end = get_column_letter(scores[-1])
    for offset, cluster in enumerate(rows):
        row = FIRST + offset
        zebra = PALE if offset % 2 else "FFFFFF"
        ident = sheet.cell(row, 1, cluster["id"])
        name = sheet.cell(row, 2, cluster["name"])
        place = sheet.cell(row, 3, cluster["place"])
        for cell in (ident, name, place):
            apply_font(cell, 10, cell is name, NAVY if cell is name else "1A1A1A")
            cell.alignment = WRAP
            fill(cell, zebra)
        for index, factor in enumerate(FACTORS):
            fact = cluster["cells"][factor["id"]]
            fact_cell = sheet.cell(row, facts[index], fact["note"])
            score_cell = sheet.cell(row, scores[index], int(fact["score"]) if fact["score"] else None)
            fact_cell.alignment = WRAP
            score_cell.alignment = CENTER
            apply_font(fact_cell, 8)
            apply_font(score_cell, 12, True, NAVY)
            fill(fact_cell, zebra)
            if fact["score"]:
                fill(score_cell, DESK)
                score_cell.comment = Comment(
                    "Desk starting score from a published figure. Overwrite it with your own.",
                    "MSME Catalyst",
                    width=240,
                    height=40,
                )
            else:
                fill(score_cell, INPUT)
            score_cell.number_format = "0"
        filled = sheet.cell(row, filled_col, f"=COUNT({score_range_start}{row}:{score_range_end}{row})")
        mark = sheet.cell(
            row,
            mark_col,
            (
                f'=IF({get_column_letter(filled_col)}{row}=0,"",'
                f'IF(SUMPRODUCT(({score_range_start}{row}:{score_range_end}{row}<>"")*'
                f'${score_range_start}$3:${score_range_end}$3)=0,"",'
                f'ROUND(SUMPRODUCT({score_range_start}{row}:{score_range_end}{row},'
                f'${score_range_start}$3:${score_range_end}$3)/'
                f'SUMPRODUCT(({score_range_start}{row}:{score_range_end}{row}<>"")*'
                f'${score_range_start}$3:${score_range_end}$3)/5*100,0)))'
            ),
        )
        tier = sheet.cell(
            row,
            tier_col,
            (
                f'=IF({get_column_letter(filled_col)}{row}=0,"",'
                f'IF({get_column_letter(filled_col)}{row}<{READY_AT},"Not yet",'
                f'IF({get_column_letter(mark_col)}{row}>=80,"Open",'
                f'IF({get_column_letter(mark_col)}{row}>=60,"Shortlist",'
                f'IF({get_column_letter(mark_col)}{row}>=40,"Watch","Not now")))))'
            ),
        )
        state = sheet.cell(
            row,
            state_col,
            (
                f'=IF({get_column_letter(filled_col)}{row}=0,"",'
                f'IF({get_column_letter(filled_col)}{row}<{READY_AT},"Running score","Ready to compare"))'
            ),
        )
        for cell in (filled, mark, tier, state):
            apply_font(cell, 10, cell is mark, NAVY)
            cell.alignment = CENTER
            fill(cell, GREEN)
        sheet.row_dimensions[row].height = 46

    last = FIRST + len(rows) - 1
    validation = DataValidation(type="whole", operator="between", formula1="1", formula2="5", allow_blank=True)
    validation.error = "Enter a whole number from 1 to 5, or leave the cell blank."
    validation.errorTitle = "Score"
    validation.prompt = "1 is weak, 5 is ready. Blank means you have not scored it."
    validation.promptTitle = "1 to 5"
    validation.add(f"{score_range_start}{FIRST}:{score_range_end}{last}")
    sheet.add_data_validation(validation)

    mark_letter = get_column_letter(mark_col)
    filled_letter = get_column_letter(filled_col)
    sheet.conditional_formatting.add(
        f"{mark_letter}{FIRST}:{mark_letter}{last}",
        FormulaRule(formula=[f"AND({filled_letter}{FIRST}>={READY_AT},{mark_letter}{FIRST}>=80)"], fill=PatternFill("solid", fgColor="CDE8D4")),
    )
    sheet.conditional_formatting.add(
        f"{mark_letter}{FIRST}:{mark_letter}{last}",
        FormulaRule(formula=[f"AND({filled_letter}{FIRST}>={READY_AT},{mark_letter}{FIRST}>=60,{mark_letter}{FIRST}<80)"], fill=PatternFill("solid", fgColor="D9E4F2")),
    )
    sheet.conditional_formatting.add(
        f"{mark_letter}{FIRST}:{mark_letter}{last}",
        FormulaRule(formula=[f"AND({filled_letter}{FIRST}>={READY_AT},{mark_letter}{FIRST}<60)"], fill=PatternFill("solid", fgColor=AMBER)),
    )

    sheet.column_dimensions["A"].width = 16
    sheet.column_dimensions["B"].width = 28
    sheet.column_dimensions["C"].width = 42
    for col in facts:
        sheet.column_dimensions[get_column_letter(col)].width = 38
    for col in scores:
        sheet.column_dimensions[get_column_letter(col)].width = 14
    for col in (filled_col, mark_col, tier_col, state_col):
        sheet.column_dimensions[get_column_letter(col)].width = 18

    chart = BarChart()
    chart.type = "bar"
    chart.title = "Running mark out of 100"
    chart.y_axis.title = None
    chart.x_axis.title = None
    data = Reference(sheet, min_col=mark_col, min_row=HEADER_ROW, max_row=FIRST + len(CLUSTERS) - 1)
    cats = Reference(sheet, min_col=2, min_row=FIRST, max_row=FIRST + len(CLUSTERS) - 1)
    chart.add_data(data, titles_from_data=True)
    chart.set_categories(cats)
    chart.shape = 4
    chart.legend = None
    chart.height = 12
    chart.width = 18
    sheet.add_chart(chart, "AB53")

    sheet.page_setup.orientation = "landscape"
    sheet.page_setup.fitToPage = True
    sheet.page_setup.fitToWidth = 1
    sheet.page_setup.fitToHeight = 0
    sheet.page_setup.paperSize = sheet.PAPERSIZE_TABLOID
    sheet.sheet_properties.pageSetUpPr.fitToPage = True
    sheet.print_title_rows = "1:4"
    sheet.page_setup.horizontalCentered = True
    sheet.oddHeader.left.text = "MSME Catalyst · Cluster fill-in score · 19 November 2026"
    sheet.oddFooter.left.text = "Blank is not zero · A tier needs 8 of 12 factors · Word of the mark is this sheet"
    sheet.oddFooter.right.text = "Page &P"
    sheet.sheet_view.showGridLines = False
    sheet.auto_filter.ref = f"A{HEADER_ROW}:{get_column_letter(state_col)}{last}"
    return sheet


def write_xlsx():
    wb = Workbook()
    default = wb.active
    write_how(wb)
    write_weights(wb)
    write_scores(wb)
    wb.remove(default)
    wb.calculation.calcMode = "auto"
    wb.properties.title = "Cluster fill-in score"
    wb.properties.subject = "Score updates as factors are filled. Blank is not zero."
    wb.active = wb["Scores"]
    wb.save(XLSX)


CANVAS_TAIL = r"""
type FactorId =
  | "count" | "growth" | "partners" | "colleges" | "lenders" | "marketing"
  | "export" | "listing" | "size" | "state" | "central" | "other";

type Cell = { note: string; score: string };
type Cluster = { id: string; name: string; place: string; cells: Record<FactorId, Cell> };
type Book = { weights: Record<FactorId, string>; clusters: Cluster[] };

const SCORE_OPTIONS = [
  { value: "blank", label: "Not filled" },
  { value: "1", label: "1 — weak" },
  { value: "2", label: "2 — thin" },
  { value: "3", label: "3 — usable" },
  { value: "4", label: "4 — strong" },
  { value: "5", label: "5 — ready" },
];

function weightOf(book: Book, id: FactorId) {
  const value = Number(book.weights[id]);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function running(cluster: Cluster, book: Book) {
  let numerator = 0;
  let denominator = 0;
  let filled = 0;
  const missing: string[] = [];
  for (const factor of FACTORS) {
    const raw = cluster.cells[factor.id].score;
    if (raw === "" || raw === "blank") {
      missing.push(factor.name);
      continue;
    }
    const weight = weightOf(book, factor.id);
    filled += 1;
    numerator += Number(raw) * weight;
    denominator += weight;
  }
  const mark = filled === 0 || denominator === 0 ? null : Math.round(numerator / denominator / 5 * 100);
  let tier = "Not yet";
  if (mark !== null && filled >= 8) {
    if (mark >= 80) tier = "Open";
    else if (mark >= 60) tier = "Shortlist";
    else if (mark >= 40) tier = "Watch";
    else tier = "Not now";
  }
  return { filled, mark, tier, missing };
}

function toneFor(tier: string): "success" | "info" | "warning" | "danger" | "neutral" {
  if (tier === "Open") return "success";
  if (tier === "Shortlist") return "info";
  if (tier === "Watch") return "warning";
  if (tier === "Not now") return "danger";
  return "neutral";
}

function statTone(tier: string): "success" | "info" | "warning" | "danger" | undefined {
  if (tier === "Open") return "success";
  if (tier === "Shortlist") return "info";
  if (tier === "Watch") return "warning";
  if (tier === "Not now") return "danger";
  return undefined;
}

export default function ClusterFillScore() {
  const [book, setBook] = useCanvasState<Book>("cluster-fill-book", SEED);
  const [view, setView] = useState<"rank" | "fill" | "weights" | "anchors">("fill");
  const [selectedId, setSelectedId] = useState(SEED.clusters[0].id);
  const [addedName, setAddedName] = useState("");
  const [addedPlace, setAddedPlace] = useState("");
  const theme = useHostTheme();

  const selected = book.clusters.find((cluster) => cluster.id === selectedId) ?? book.clusters[0];
  const current = running(selected, book);
  const ranked = useMemo(() => {
    return book.clusters
      .map((cluster) => ({ cluster, ...running(cluster, book) }))
      .filter((row) => row.cluster.name.trim() !== "")
      .sort((a, b) => {
        const aReady = a.filled >= 8 ? 1 : 0;
        const bReady = b.filled >= 8 ? 1 : 0;
        if (aReady !== bReady) return bReady - aReady;
        return (b.mark ?? -1) - (a.mark ?? -1);
      });
  }, [book]);
  const chartRows = ranked.filter((row) => row.mark !== null);

  function patchCluster(id: string, factor: FactorId, patch: Partial<Cell>) {
    setBook((prev) => ({
      ...prev,
      clusters: prev.clusters.map((cluster) => cluster.id === id ? {
        ...cluster,
        cells: { ...cluster.cells, [factor]: { ...cluster.cells[factor], ...patch } },
      } : cluster),
    }));
  }

  function addCluster() {
    const name = addedName.trim();
    const place = addedPlace.trim();
    if (!name || !place) return;
    const id = `custom-${Date.now()}`;
    const cells = {} as Record<FactorId, Cell>;
    for (const factor of FACTORS) cells[factor.id] = { note: "", score: "" };
    setBook((prev) => ({ ...prev, clusters: [...prev.clusters, { id, name, place, cells }] }));
    setSelectedId(id);
    setAddedName("");
    setAddedPlace("");
    setView("fill");
  }

  return (
    <Stack gap={20}>
      <Stack gap={6}>
        <H1>Cluster fill-in score</H1>
        <Text tone="secondary">
          Type the fact, then pick 1 to 5. The mark moves as soon as a score is entered. A blank factor is dropped. It is not a zero.
        </Text>
      </Stack>

      <div style={{ background: theme.fill.tertiary, padding: 16 }}>
        <Grid columns={4} gap={16}>
          <Stat value={current.mark === null ? "—" : String(current.mark)} label="Mark out of 100" tone={current.filled >= 8 ? statTone(current.tier) : "warning"} />
          <Stat value={`${current.filled} of 12`} label="Factors filled" />
          <Stat value={current.filled >= 8 ? current.tier : "Not yet"} label={current.filled >= 8 ? "Tier" : "Tier waits for 8 factors"} tone={current.filled >= 8 ? statTone(current.tier) : "warning"} />
          <Stat value={String(FACTORS.reduce((sum, factor) => sum + weightOf(book, factor.id), 0))} label="Sum of weights" />
        </Grid>
      </div>

      <Callout tone={current.filled >= 8 ? "success" : "warning"} title={selected.name}>
        {selected.place}. {current.filled >= 8
          ? `Tier: ${current.tier}. Eight or more factors are filled, so this cluster can be compared.`
          : `Running score only. Still blank: ${current.missing.join(", ")}.`}
      </Callout>

      <Row gap={8} wrap>
        <Pill active={view === "fill"} onClick={() => setView("fill")}>Fill this cluster</Pill>
        <Pill active={view === "rank"} onClick={() => setView("rank")}>All clusters</Pill>
        <Pill active={view === "weights"} onClick={() => setView("weights")}>Weights</Pill>
        <Pill active={view === "anchors"} onClick={() => setView("anchors")}>What 1 and 5 mean</Pill>
      </Row>

      {view === "fill" && (
        <Stack gap={12}>
          <Select
            value={selected.id}
            onChange={setSelectedId}
            options={book.clusters.filter((cluster) => cluster.name.trim() !== "").map((cluster) => ({ value: cluster.id, label: cluster.name }))}
          />
          {FACTORS.map((factor) => {
            const cell = selected.cells[factor.id];
            return (
              <Stack key={factor.id} gap={4}>
                <Row gap={8} align="center">
                  <Text weight="semibold">{factor.name}</Text>
                  <Text tone="tertiary" size="small">Weight {book.weights[factor.id]}</Text>
                </Row>
                <Text size="small" tone="secondary">{factor.prompt}</Text>
                <Text size="small">1 — {factor.s1} 5 — {factor.s5}</Text>
                <TextArea
                  value={cell.note}
                  onChange={(note) => patchCluster(selected.id, factor.id, { note })}
                  placeholder={factor.prompt}
                  rows={2}
                />
                <Select
                  value={cell.score === "" ? "blank" : cell.score}
                  onChange={(score) => patchCluster(selected.id, factor.id, { score: score === "blank" ? "" : score })}
                  options={SCORE_OPTIONS}
                />
                <Divider />
              </Stack>
            );
          })}
        </Stack>
      )}

      {view === "rank" && (
        <Stack gap={12}>
          <Text size="small" tone="secondary">
            Sorted with ready clusters (8 or more factors) first. A running mark uses only the filled factors. Desk starting scores are already in the count, size, export, and government columns where a published figure existed.
          </Text>
          <Table
            headers={["Cluster", "Place", "Mark", "Filled", "Tier", "Use it?"]}
            columnAlign={["left", "left", "right", "right", "left", "left"]}
            rows={ranked.map((row) => [
              row.cluster.name,
              row.cluster.place,
              row.mark === null ? "—" : String(row.mark),
              `${row.filled} of 12`,
              row.tier,
              row.filled >= 8 ? "Ready to compare" : "Running score",
            ])}
            rowTone={ranked.map((row) => row.filled >= 8 ? toneFor(row.tier) : "neutral")}
            striped
            stickyHeader
          />
          {chartRows.length > 0 && (
            <Stack gap={6}>
              <H2>Running mark by cluster</H2>
              <BarChart
                horizontal
                height={Math.max(320, chartRows.length * 22)}
                categories={chartRows.map((row) => row.cluster.name)}
                series={[{ name: "Mark out of 100", data: chartRows.map((row) => row.mark ?? 0) }]}
                yMax={100}
              />
              <Text size="small" tone="tertiary">
                Mark out of 100. Blank factors are excluded. Source: scores on this canvas, including desk starting scores until you overwrite them. A high bar with fewer than 8 factors is not a decision. 19 November 2026.
              </Text>
            </Stack>
          )}
          <H3>Add a place</H3>
          <Text size="small" tone="secondary">Use this when one industry has two belts, for example Agra separately from Ambur.</Text>
          <TextInput value={addedName} onChange={setAddedName} placeholder="Cluster name" />
          <TextInput value={addedPlace} onChange={setAddedPlace} placeholder="Place" />
          <Row>
            <Button onClick={addCluster} disabled={!addedName.trim() || !addedPlace.trim()}>Add cluster</Button>
          </Row>
        </Stack>
      )}

      {view === "weights" && (
        <Stack gap={8}>
          <Text>
            Weights are relative. The mark divides by the weights of the factors you have filled, then converts the 1–5 average to a mark out of 100. Set a weight to 0 to ignore that factor.
          </Text>
          <Table
            headers={["Factor", "Weight"]}
            columnAlign={["left", "right"]}
            rows={FACTORS.map((factor) => [factor.name, book.weights[factor.id]])}
            striped
          />
          {FACTORS.map((factor) => (
            <Row key={factor.id} gap={8} align="center">
              <Text style={{ width: 220 }}>{factor.name}</Text>
              <TextInput
                value={book.weights[factor.id]}
                onChange={(value) => setBook((prev) => ({ ...prev, weights: { ...prev.weights, [factor.id]: value } }))}
                type="number"
              />
            </Row>
          ))}
        </Stack>
      )}

      {view === "anchors" && (
        <Table
          headers={["Factor", "Weight", "1", "3", "5"]}
          rows={FACTORS.map((factor) => [factor.name, String(factor.weight), factor.s1, factor.s3, factor.s5])}
          striped
          stickyHeader
        />
      )}
    </Stack>
  );
}
"""


def write_canvas():
    book = books()
    factors = []
    for factor in FACTORS:
        factors.append({
            "id": factor["id"],
            "name": factor["name"],
            "weight": factor["weight"],
            "prompt": factor["prompt"],
            "s1": factor["s1"],
            "s3": factor["s3"],
            "s5": factor["s5"],
        })
    head = """import { useMemo, useState } from "cursor/canvas";
import { BarChart, Button, Callout, Divider, Grid, H1, H2, H3, Pill, Row, Select, Stack, Stat, Table, Text, TextArea, TextInput } from "cursor/canvas";
import { useCanvasState, useHostTheme } from "cursor/canvas";

const FACTORS: { id: FactorId; name: string; weight: number; prompt: string; s1: string; s3: string; s5: string }[] = __FACTORS__;

const SEED: Book = __SEED__;
"""
    # FactorId is used before it is declared in the const annotation. Declare the type first.
    source = (
        'import { useMemo, useState } from "cursor/canvas";\n'
        'import { BarChart, Button, Callout, Divider, Grid, H1, H2, H3, Pill, Row, Select, Stack, Stat, Table, Text, TextArea, TextInput } from "cursor/canvas";\n'
        'import { useCanvasState, useHostTheme } from "cursor/canvas";\n\n'
        "type FactorId =\n"
        '  | "count" | "growth" | "partners" | "colleges" | "lenders" | "marketing"\n'
        '  | "export" | "listing" | "size" | "state" | "central" | "other";\n\n'
        "const FACTORS: { id: FactorId; name: string; weight: number; prompt: string; s1: string; s3: string; s5: string }[] = "
        + json.dumps(factors, ensure_ascii=False, indent=2)
        + ";\n\nconst SEED: Book = "
        + json.dumps(book, ensure_ascii=False, indent=2)
        + ";\n"
        + CANVAS_TAIL
    )
    # The tail repeats the FactorId type. Remove the duplicate by starting the tail after the types.
    # CANVAS_TAIL begins with the type block. Strip it since we already emitted types.
    tail = CANVAS_TAIL
    marker = "const SCORE_OPTIONS"
    tail = tail[tail.index(marker):]
    source = (
        'import { useMemo, useState } from "cursor/canvas";\n'
        'import { BarChart, Button, Callout, Divider, Grid, H1, H2, H3, Pill, Row, Select, Stack, Stat, Table, Text, TextArea, TextInput } from "cursor/canvas";\n'
        'import { useCanvasState, useHostTheme } from "cursor/canvas";\n\n'
        "type FactorId =\n"
        '  | "count" | "growth" | "partners" | "colleges" | "lenders" | "marketing"\n'
        '  | "export" | "listing" | "size" | "state" | "central" | "other";\n\n'
        "type Cell = { note: string; score: string };\n"
        "type Cluster = { id: string; name: string; place: string; cells: Record<FactorId, Cell> };\n"
        "type Book = { weights: Record<FactorId, string>; clusters: Cluster[] };\n\n"
        "const FACTORS: { id: FactorId; name: string; weight: number; prompt: string; s1: string; s3: string; s5: string }[] = "
        + json.dumps(factors, ensure_ascii=False, indent=2)
        + ";\n\nconst SEED: Book = "
        + json.dumps(book, ensure_ascii=False, indent=2)
        + ";\n\n"
        + tail
    )
    CANVAS.parent.mkdir(parents=True, exist_ok=True)
    CANVAS.write_text(source, encoding="utf-8")
    return source


def main():
    assert_register()
    write_xlsx()
    write_canvas()
    book = books()
    print(f"clusters {len(book['clusters'])}")
    for cluster in book["clusters"]:
        filled, mark = running_score(cluster["cells"], book["weights"])
        print(f"{mark:3}  {filled:2}/12  {tier_for(filled, mark):<10} {cluster['id']}")
    print(f"wrote {XLSX}")
    print(f"wrote {CANVAS}")


if __name__ == "__main__":
    main()
