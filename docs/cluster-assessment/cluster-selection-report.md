# Cluster selection brief

This note replaces the earlier nine-industry desk ranking. That ranking is withdrawn. It used a different universe, scored auto components as the only High-need type, and is not the Gate-1 selection.

The master is the Word file `Industry-Types-and-Clusters.docx` at the repository root. `Industry-Types-and-Clusters.pdf` is the print copy. Edit the Word file, then reprint. Do not treat the PDF as the source.

The register is 31 industry types, the same ids on both canvases:

- `canvases/new-industry-cluster-map.canvas.tsx` — who is in the industry. Fit is the cluster-shape score, from 1 to 5. It is not the charter score.
- `canvases/charter-intervention-rank.canvas.tsx` — the sixteen brochure tools.

Regenerate both documents from those canvases:

```bash
python3 generate_industry_clusters_report.py
```

Desk date: 5 November 2026 (Asia/Kolkata). Export year: FY2024–25.

## Year-1 slate

Rank is not the pick. Three new centres and two attachments:

1. Medical devices — new Capability Centre. AMTZ Visakhapatnam spoke, or Greater Noida / Kanchipuram. Need 4.835, rank 1.
2. Footwear (non-leather and sports) — new Capability Centre. Ambur–Ranipet, or Agra. Need 4.745, rank 2.
3. Food processing (PLI wave) — attach to the existing food demonstration. Need 4.350, rank 4.
4. ACC pack, BMS and recycling — new Capability Centre, not the PLI-ACC plants. Need 4.360, rank 3.
5. White goods and furniture — attach to the Noida–Hapur annex of about 4,500 MSMEs. Need 4.165, rank 5.

Logistics and toys stay High and are reserves unless a sixth slot is funded. Fintech, edtech, cybersecurity and green hydrogen are out of charter.

Size-band counts are reconstructed. They are not a GSTN or MCA census. Official figures stay labelled with their publisher inside the Word register.
