import { useMemo, useState } from "cursor/canvas";
import { BarChart, Button, Callout, Divider, Grid, H1, H2, H3, Pill, Row, Select, Stack, Stat, Table, Text, TextArea, TextInput } from "cursor/canvas";
import { useCanvasState, useHostTheme } from "cursor/canvas";

type FactorId =
  | "count" | "growth" | "partners" | "colleges" | "lenders" | "marketing"
  | "export" | "listing" | "size" | "state" | "central" | "other";

type Cell = { note: string; score: string };
type Cluster = { id: string; name: string; place: string; hsn: string; list: string; cells: Record<FactorId, Cell> };
type Book = { weights: Record<FactorId, string>; clusters: Cluster[] };

const FACTORS: { id: FactorId; name: string; weight: number; prompt: string; s1: string; s3: string; s5: string }[] = [
  {
    "id": "count",
    "name": "How many exist",
    "weight": 12,
    "prompt": "Enterprises in the belt you would actually staff. Name the source. Do not add a member list to a licence list.",
    "s1": "Only the large plants, or under about 50 enterprises.",
    "s3": "A few hundred to about 1,000 in one belt, or a large national count with no single belt.",
    "s5": "About 5,000 or more MSMEs in the one belt you would staff."
  },
  {
    "id": "growth",
    "name": "Growth potential",
    "weight": 10,
    "prompt": "What is growing: units, sales, exports, or approvals. Use a comparison, not a single level.",
    "s1": "The scheme is closed, or the wave is announcements only.",
    "s3": "One official signal is rising. The MSME in this belt is not yet separated from the large firm.",
    "s5": "Demand, new units, and a buyer pipeline are all visible in the last two years."
  },
  {
    "id": "partners",
    "name": "Partners to deliver",
    "weight": 12,
    "prompt": "Who would deliver the work in this belt. A ministry is not a delivery partner. 'None yet' is a valid fact — then score 1.",
    "s1": "No partner named, or you have decided there is none.",
    "s3": "A named partner has had a conversation. Nothing is agreed.",
    "s5": "A partner can start delivery in this belt this quarter."
  },
  {
    "id": "colleges",
    "name": "Nearby colleges",
    "weight": 6,
    "prompt": "College, department, and the person you would call. Distance from the belt matters.",
    "s1": "No college named.",
    "s3": "A department and a person are named. They have not agreed to a meeting.",
    "s5": "A training or apprentice path with that college is agreed."
  },
  {
    "id": "lenders",
    "name": "Lending companies",
    "weight": 10,
    "prompt": "The branch, NBFC, or bank that will take files from this belt. CGTMSE, MUDRA, and SIDBI as national names do not count.",
    "s1": "No lender named for this belt.",
    "s3": "A branch or NBFC is named and already lends to MSMEs. It has not seen this cluster.",
    "s5": "That lender will take a batch of files from the centre."
  },
  {
    "id": "marketing",
    "name": "Marketing companies",
    "weight": 6,
    "prompt": "A firm that will put these units in front of buyers. A council newsletter is not a marketing company.",
    "s1": "No firm named.",
    "s3": "A firm is named and already sells to this industry's buyers. No pilot is agreed.",
    "s5": "The firm will take a pilot set of units from this belt."
  },
  {
    "id": "export",
    "name": "Export potential",
    "weight": 10,
    "prompt": "Export of the MSME in this belt, with the year and the source. A neighbouring HS line does not count.",
    "s1": "No export path, or the only published line is the wrong product.",
    "s3": "The sector exports. The MSME share in this belt is modest or unpublished.",
    "s5": "MSMEs in this belt already export, and the route (buyer, council, or ECGC) is one they can use."
  },
  {
    "id": "listing",
    "name": "Chance of a big listing",
    "weight": 5,
    "prompt": "A unit in this cluster that could reach an SME IPO or the main board. Name it, or write that there is none.",
    "s1": "No listing candidate, or you have looked and there is none.",
    "s3": "One unit has the scale and the books to be discussed. No process has started.",
    "s5": "A unit from this cluster is listed, or has filed."
  },
  {
    "id": "size",
    "name": "Size mix and max lot",
    "weight": 10,
    "prompt": "Nano (own-account or SHG), micro (at or below ₹10 crore), small (₹10–100 crore), medium (₹100–500 crore), large (above ₹500 crore). Write the mix, then the biggest lot you would enrol.",
    "s1": "Almost all large. The centre would have no micro or small lot.",
    "s3": "Mixed. Small is visible. Micro is not the mass.",
    "s5": "Mostly micro or nano, and the biggest lot you would enrol is small, not the large plant."
  },
  {
    "id": "state",
    "name": "State government support",
    "weight": 8,
    "prompt": "The state scheme, park, or nodal office for this belt. Name the state. A policy with nothing to file is a 2.",
    "s1": "No state scheme, park, or nodal office.",
    "s3": "A park, nodal agency, or state scheme exists.",
    "s5": "The state will house the desk, or has asked for the centre."
  },
  {
    "id": "central",
    "name": "Central government support",
    "weight": 8,
    "prompt": "A central scheme an MSME in this belt can file. A scheme that only the large plant can enter is a 2.",
    "s1": "No central scheme for this cluster.",
    "s3": "A scheme exists and only some of these MSMEs qualify.",
    "s5": "MSMEs here are already inside an open central scheme."
  },
  {
    "id": "other",
    "name": "Anything else",
    "weight": 3,
    "prompt": "One more fact that would change the decision. Raise its weight on the Weights sheet if it should count more.",
    "s1": "The extra fact argues against opening here.",
    "s3": "Useful context. It does not change the decision.",
    "s5": "This fact, on its own, would move the cluster up or down a tier."
  }
];

const SEED: Book = {
  "weights": {
    "count": "12",
    "growth": "10",
    "partners": "12",
    "colleges": "6",
    "lenders": "10",
    "marketing": "6",
    "export": "10",
    "listing": "5",
    "size": "10",
    "state": "8",
    "central": "8",
    "other": "3"
  },
  "clusters": [
    {
      "id": "E-Pune",
      "name": "Pune engineering and auto supplier route",
      "place": "Maharashtra · Pune · Pimpri–Chinchwad / Bhosari first; Chakan as a later spoke",
      "hsn": "8708; 8714; 8409",
      "list": "Cluster v4",
      "cells": {
        "count": {
          "note": "Over 2,000 MSMEs served by Auto Cluster cumulatively; undated institutional page accessed 29 October 2026. Not a current count of operating engineering enterprises. Separately SAMEEEKSHA reports about 50 aluminium casting units (2015–16), including 8 large units; this is a narrow subset, not the whole Pune engineering cluster.",
          "score": ""
        },
        "growth": {
          "note": "No published comparison of units, sales or exports for this belt. Comparison-row observation: Credit +11%; DPD 1.3%.",
          "score": ""
        },
        "partners": {
          "note": "C + MCCIA / Auto Cluster. Cluster v4 records this as an enquiry route. No agreement is recorded.",
          "score": ""
        },
        "colleges": {
          "note": "COEP / ILS. Named in cluster v4 as the academic route. No meeting is recorded.",
          "score": ""
        },
        "lenders": {
          "note": "No lending company is named. Product types listed in cluster v4: CC/OD; vendor; tooling.",
          "score": ""
        },
        "marketing": {
          "note": "No marketing company is named in cluster v4.",
          "score": ""
        },
        "export": {
          "note": "Cluster v4 label: Potential only. No local export value is published for this cohort.",
          "score": ""
        },
        "listing": {
          "note": "No listing candidate is named in cluster v4.",
          "score": ""
        },
        "size": {
          "note": "Turnover bands are not verified in cluster v4, so the nano, micro, small and medium mix is still open.",
          "score": ""
        },
        "state": {
          "note": "Named route: MCCIA / Auto Cluster. Cluster v4 does not record a state scheme or park already in place.",
          "score": ""
        },
        "central": {
          "note": "Cluster v4 names the same horizontal routes for every belt: SIDBI, CGTMSE, MUDRA, LEAN, ZED and NSIC. It does not show MSMEs in this belt already inside a cluster-specific central scheme.",
          "score": ""
        },
        "other": {
          "note": "Cluster v4 position: Validation shortlist. Comparison-row observation: Credit +11%; DPD 1.3%. Do not add this count to an overlapping row.",
          "score": ""
        }
      }
    },
    {
      "id": "E-New Delhi",
      "name": "Delhi general engineering metal cutting and fabrication",
      "place": "Delhi NCT · Delhi district jurisdiction to validate per unit · Naraina / Mayapuri candidate machining and fabrication belt",
      "hsn": "7308; 7326; 8466",
      "list": "Cluster v4",
      "cells": {
        "count": {
          "note": "Comparable current district–sector enterprise count not verified",
          "score": ""
        },
        "growth": {
          "note": "No published comparison of units, sales or exports for this belt. Comparison-row observation: Credit +19%; DPD 0.3%.",
          "score": ""
        },
        "partners": {
          "note": "C + DSIIDC enquiry. Cluster v4 records this as an enquiry route. No agreement is recorded.",
          "score": ""
        },
        "colleges": {
          "note": "DTU. Named in cluster v4 as the academic route. No meeting is recorded.",
          "score": ""
        },
        "lenders": {
          "note": "No lending company is named. Product types listed in cluster v4: CC/OD; equipment.",
          "score": ""
        },
        "marketing": {
          "note": "No marketing company is named in cluster v4.",
          "score": ""
        },
        "export": {
          "note": "Cluster v4 label: Potential only. No local export value is published for this cohort.",
          "score": ""
        },
        "listing": {
          "note": "No listing candidate is named in cluster v4.",
          "score": ""
        },
        "size": {
          "note": "Turnover bands are not verified in cluster v4, so the nano, micro, small and medium mix is still open.",
          "score": ""
        },
        "state": {
          "note": "No state scheme, park, or nodal office is recorded for this belt in cluster v4.",
          "score": ""
        },
        "central": {
          "note": "Cluster v4 names the same horizontal routes for every belt: SIDBI, CGTMSE, MUDRA, LEAN, ZED and NSIC. It does not show MSMEs in this belt already inside a cluster-specific central scheme.",
          "score": ""
        },
        "other": {
          "note": "Cluster v4 position: Mapping / evidence first. Comparison-row observation: Credit +19%; DPD 0.3%. Do not add this count to an overlapping row.",
          "score": ""
        }
      }
    },
    {
      "id": "E-Chennai",
      "name": "Chennai engineering Ambattur fabrication route",
      "place": "Tamil Nadu · Chennai / Tiruvallur jurisdiction to validate per unit · Ambattur / Thirumullaivoyal engineering route",
      "hsn": "7308; 7326; 8466",
      "list": "Cluster v4",
      "cells": {
        "count": {
          "note": "Comparable current district–sector enterprise count not verified",
          "score": ""
        },
        "growth": {
          "note": "No published comparison of units, sales or exports for this belt. Comparison-row observation: Credit +3%; DPD 1%.",
          "score": ""
        },
        "partners": {
          "note": "C + TAPSTIA CFC. Cluster v4 records this as an enquiry route. No agreement is recorded.",
          "score": ""
        },
        "colleges": {
          "note": "Anna University. Named in cluster v4 as the academic route. No meeting is recorded.",
          "score": ""
        },
        "lenders": {
          "note": "No lending company is named. Product types listed in cluster v4: CC/OD; equipment.",
          "score": ""
        },
        "marketing": {
          "note": "No marketing company is named in cluster v4.",
          "score": ""
        },
        "export": {
          "note": "Cluster v4 label: Potential only. No local export value is published for this cohort.",
          "score": ""
        },
        "listing": {
          "note": "No listing candidate is named in cluster v4.",
          "score": ""
        },
        "size": {
          "note": "Turnover bands are not verified in cluster v4, so the nano, micro, small and medium mix is still open.",
          "score": ""
        },
        "state": {
          "note": "No state scheme, park, or nodal office is recorded for this belt in cluster v4.",
          "score": ""
        },
        "central": {
          "note": "Cluster v4 names the same horizontal routes for every belt: SIDBI, CGTMSE, MUDRA, LEAN, ZED and NSIC. It does not show MSMEs in this belt already inside a cluster-specific central scheme.",
          "score": ""
        },
        "other": {
          "note": "Cluster v4 position: Validation shortlist. Comparison-row observation: Credit +3%; DPD 1%. Do not add this count to an overlapping row.",
          "score": ""
        }
      }
    },
    {
      "id": "ADD01",
      "name": "Pune Hadapsar printing and packaging",
      "place": "Maharashtra · Pune · Hadapsar printing and packaging",
      "hsn": "4819; 4821; 4911",
      "list": "Cluster v4",
      "cells": {
        "count": {
          "note": "Current cluster-specific enterprise count not verified. Historical DC-MSME mapping identifies the cluster.",
          "score": ""
        },
        "growth": {
          "note": "No published comparison of units, sales or exports for this belt. Comparison-row observation: Historical cluster listed.",
          "score": ""
        },
        "partners": {
          "note": "Hadapsar printing cluster / local SPV. Cluster v4 records this as an enquiry route. No agreement is recorded.",
          "score": ""
        },
        "colleges": {
          "note": "COEP; print specialist NV. Named in cluster v4 as the academic route. No meeting is recorded.",
          "score": ""
        },
        "lenders": {
          "note": "No lending company is named. Product types listed in cluster v4: Paper WC; press loan.",
          "score": ""
        },
        "marketing": {
          "note": "No marketing company is named in cluster v4.",
          "score": ""
        },
        "export": {
          "note": "Cluster v4 label: Potential. No local export value is published for this cohort.",
          "score": ""
        },
        "listing": {
          "note": "No listing candidate is named in cluster v4.",
          "score": ""
        },
        "size": {
          "note": "Turnover bands are not verified in cluster v4, so the nano, micro, small and medium mix is still open.",
          "score": ""
        },
        "state": {
          "note": "Named route: Hadapsar printing cluster / local SPV. Cluster v4 does not record a state scheme or park already in place.",
          "score": ""
        },
        "central": {
          "note": "Cluster v4 names the same horizontal routes for every belt: SIDBI, CGTMSE, MUDRA, LEAN, ZED and NSIC. It does not show MSMEs in this belt already inside a cluster-specific central scheme.",
          "score": ""
        },
        "other": {
          "note": "Cluster v4 position: Mapping / evidence first. Comparison-row observation: Historical cluster listed. Do not add this count to an overlapping row.",
          "score": ""
        }
      }
    },
    {
      "id": "ADD02",
      "name": "Pune plastics and moulding",
      "place": "Maharashtra · Pune · Pimpri–Chinchwad / Bhosari plastics and moulding enquiry",
      "hsn": "3923; 3926; 6305",
      "list": "Cluster v4",
      "cells": {
        "count": {
          "note": "Current plastics-only enterprise count not verified. Published Pune plastic-products mapping is historical.",
          "score": ""
        },
        "growth": {
          "note": "No published comparison of units, sales or exports for this belt. Comparison-row observation: Historical sector mapping.",
          "score": ""
        },
        "partners": {
          "note": "MCCIA / Auto Cluster. Cluster v4 records this as an enquiry route. No agreement is recorded.",
          "score": ""
        },
        "colleges": {
          "note": "COEP; CIPET referral. Named in cluster v4 as the academic route. No meeting is recorded.",
          "score": ""
        },
        "lenders": {
          "note": "No lending company is named. Product types listed in cluster v4: Resin WC; mould loan.",
          "score": ""
        },
        "marketing": {
          "note": "No marketing company is named in cluster v4.",
          "score": ""
        },
        "export": {
          "note": "Cluster v4 label: Potential. No local export value is published for this cohort.",
          "score": ""
        },
        "listing": {
          "note": "No listing candidate is named in cluster v4.",
          "score": ""
        },
        "size": {
          "note": "Turnover bands are not verified in cluster v4, so the nano, micro, small and medium mix is still open.",
          "score": ""
        },
        "state": {
          "note": "Named route: MCCIA / Auto Cluster. Cluster v4 does not record a state scheme or park already in place.",
          "score": ""
        },
        "central": {
          "note": "Cluster v4 names the same horizontal routes for every belt: SIDBI, CGTMSE, MUDRA, LEAN, ZED and NSIC. It does not show MSMEs in this belt already inside a cluster-specific central scheme.",
          "score": ""
        },
        "other": {
          "note": "Cluster v4 position: Mapping / evidence first. Comparison-row observation: Historical sector mapping. Do not add this count to an overlapping row.",
          "score": ""
        }
      }
    },
    {
      "id": "ADD03",
      "name": "Pune defence supplier ecosystem",
      "place": "Maharashtra · Pune · Pune / Pimpri–Chinchwad defence supplier enquiry",
      "hsn": "8807; 9305; 7326",
      "list": "Cluster v4",
      "cells": {
        "count": {
          "note": "Operating eligible defence MSME count not verified; technology-node presence is not a cluster census.",
          "score": ""
        },
        "growth": {
          "note": "No published comparison of units, sales or exports for this belt. Comparison-row observation: RTN launched 2021.",
          "score": ""
        },
        "partners": {
          "note": "Army RTN / SIDM enquiry. Cluster v4 records this as an enquiry route. No agreement is recorded.",
          "score": ""
        },
        "colleges": {
          "note": "COEP / ILS. Named in cluster v4 as the academic route. No meeting is recorded.",
          "score": ""
        },
        "lenders": {
          "note": "No lending company is named. Product types listed in cluster v4: Contract WC; metrology.",
          "score": ""
        },
        "marketing": {
          "note": "No marketing company is named in cluster v4.",
          "score": ""
        },
        "export": {
          "note": "Cluster v4 label: Controlled potential. No local export value is published for this cohort.",
          "score": ""
        },
        "listing": {
          "note": "No listing candidate is named in cluster v4.",
          "score": ""
        },
        "size": {
          "note": "Turnover bands are not verified in cluster v4, so the nano, micro, small and medium mix is still open.",
          "score": ""
        },
        "state": {
          "note": "Named route: Army RTN / SIDM enquiry. Cluster v4 does not record a state scheme or park already in place.",
          "score": ""
        },
        "central": {
          "note": "Cluster v4 names the same horizontal routes for every belt: SIDBI, CGTMSE, MUDRA, LEAN, ZED and NSIC. It does not show MSMEs in this belt already inside a cluster-specific central scheme.",
          "score": ""
        },
        "other": {
          "note": "Cluster v4 position: Mapping / evidence first. Comparison-row observation: RTN launched 2021. Do not add this count to an overlapping row.",
          "score": ""
        }
      }
    },
    {
      "id": "ADD04",
      "name": "Delhi printing and packaging",
      "place": "Delhi NCT · Industrial-area district to be confirmed · Naraina printing / Bawana packaging candidate belts",
      "hsn": "4819; 4821; 4911",
      "list": "Cluster v4",
      "cells": {
        "count": {
          "note": "Current local enterprise count not verified. DSIIDC historical relocation table has 5,170 printing/paper/packaging entries; not current Bawana stock, not used as size.",
          "score": ""
        },
        "growth": {
          "note": "No published comparison of units, sales or exports for this belt. Comparison-row observation: Historical sector evidence.",
          "score": ""
        },
        "partners": {
          "note": "DSIIDC / printer association enquiry. Cluster v4 records this as an enquiry route. No agreement is recorded.",
          "score": ""
        },
        "colleges": {
          "note": "DSEU Pusa printing. Named in cluster v4 as the academic route. No meeting is recorded.",
          "score": ""
        },
        "lenders": {
          "note": "No lending company is named. Product types listed in cluster v4: Paper WC; press loan.",
          "score": ""
        },
        "marketing": {
          "note": "No marketing company is named in cluster v4.",
          "score": ""
        },
        "export": {
          "note": "Cluster v4 label: Potential. No local export value is published for this cohort.",
          "score": ""
        },
        "listing": {
          "note": "No listing candidate is named in cluster v4.",
          "score": ""
        },
        "size": {
          "note": "Turnover bands are not verified in cluster v4, so the nano, micro, small and medium mix is still open.",
          "score": ""
        },
        "state": {
          "note": "Named route: DSIIDC / printer association enquiry. Cluster v4 does not record a state scheme or park already in place.",
          "score": ""
        },
        "central": {
          "note": "Cluster v4 names the same horizontal routes for every belt: SIDBI, CGTMSE, MUDRA, LEAN, ZED and NSIC. It does not show MSMEs in this belt already inside a cluster-specific central scheme.",
          "score": ""
        },
        "other": {
          "note": "Cluster v4 position: Mapping / evidence first. Comparison-row observation: Historical sector evidence. Do not add this count to an overlapping row.",
          "score": ""
        }
      }
    },
    {
      "id": "ADD05",
      "name": "Delhi plastics Bawana Narela enquiry",
      "place": "Delhi NCT · North / North West Delhi jurisdiction to validate · Bawana first; Narela only as a separately coded spoke",
      "hsn": "3923; 3926; 6305",
      "list": "Cluster v4",
      "cells": {
        "count": {
          "note": "Current local enterprise count not verified. DSIIDC relocation table has 4,144 plastic/polymer entries; not current operating Bawana/Narela count.",
          "score": ""
        },
        "growth": {
          "note": "No published comparison of units, sales or exports for this belt. Comparison-row observation: Area and cohort to validate.",
          "score": ""
        },
        "partners": {
          "note": "DSIIDC / plastic association enquiry. Cluster v4 records this as an enquiry route. No agreement is recorded.",
          "score": ""
        },
        "colleges": {
          "note": "DTU; CIPET Murthal. Named in cluster v4 as the academic route. No meeting is recorded.",
          "score": ""
        },
        "lenders": {
          "note": "No lending company is named. Product types listed in cluster v4: Resin WC; mould loan.",
          "score": ""
        },
        "marketing": {
          "note": "No marketing company is named in cluster v4.",
          "score": ""
        },
        "export": {
          "note": "Cluster v4 label: Potential. No local export value is published for this cohort.",
          "score": ""
        },
        "listing": {
          "note": "No listing candidate is named in cluster v4.",
          "score": ""
        },
        "size": {
          "note": "Turnover bands are not verified in cluster v4, so the nano, micro, small and medium mix is still open.",
          "score": ""
        },
        "state": {
          "note": "Named route: DSIIDC / plastic association enquiry. Cluster v4 does not record a state scheme or park already in place.",
          "score": ""
        },
        "central": {
          "note": "Cluster v4 names the same horizontal routes for every belt: SIDBI, CGTMSE, MUDRA, LEAN, ZED and NSIC. It does not show MSMEs in this belt already inside a cluster-specific central scheme.",
          "score": ""
        },
        "other": {
          "note": "Cluster v4 position: Mapping / evidence first. Comparison-row observation: Area and cohort to validate. Do not add this count to an overlapping row.",
          "score": ""
        }
      }
    },
    {
      "id": "ADD06",
      "name": "Gurugram Manesar auto components",
      "place": "Haryana / NCR · Gurugram · IMT Manesar and adjacent supplier estates",
      "hsn": "8708; 8714; 8409",
      "list": "Cluster v4",
      "cells": {
        "count": {
          "note": "Named suppliers verified in Haryana register; current active MSME-only total not established. Overlaps broader Gurugram engineering.",
          "score": ""
        },
        "growth": {
          "note": "No published comparison of units, sales or exports for this belt. Comparison-row observation: Supplier presence recorded.",
          "score": ""
        },
        "partners": {
          "note": "ACMA North / supplier associations. Cluster v4 records this as an enquiry route. No agreement is recorded.",
          "score": ""
        },
        "colleges": {
          "note": "Gurugram University / J C Bose. Named in cluster v4 as the academic route. No meeting is recorded.",
          "score": ""
        },
        "lenders": {
          "note": "No lending company is named. Product types listed in cluster v4: CC/OD; vendor; tooling.",
          "score": ""
        },
        "marketing": {
          "note": "No marketing company is named in cluster v4.",
          "score": ""
        },
        "export": {
          "note": "Cluster v4 label: Potential. No local export value is published for this cohort.",
          "score": ""
        },
        "listing": {
          "note": "No listing candidate is named in cluster v4.",
          "score": ""
        },
        "size": {
          "note": "Turnover bands are not verified in cluster v4, so the nano, micro, small and medium mix is still open.",
          "score": ""
        },
        "state": {
          "note": "Named route: ACMA North / supplier associations. Cluster v4 does not record a state scheme or park already in place.",
          "score": ""
        },
        "central": {
          "note": "Cluster v4 names the same horizontal routes for every belt: SIDBI, CGTMSE, MUDRA, LEAN, ZED and NSIC. It does not show MSMEs in this belt already inside a cluster-specific central scheme.",
          "score": ""
        },
        "other": {
          "note": "Cluster v4 position: Mapping / evidence first. Comparison-row observation: Supplier presence recorded. Do not add this count to an overlapping row.",
          "score": ""
        }
      }
    },
    {
      "id": "ADD07",
      "name": "Bengaluru Peenya metal cutting and fabrication",
      "place": "Karnataka · Bengaluru Urban jurisdiction to validate · Peenya industrial area",
      "hsn": "7308; 7326; 8466",
      "list": "Cluster v4",
      "cells": {
        "count": {
          "note": "Historical machine-tools subset: 100 MSMEs plus 6 large units. This is not the total machining/fabrication enterprise count.",
          "score": ""
        },
        "growth": {
          "note": "No published comparison of units, sales or exports for this belt. Comparison-row observation: Cluster SPV exists.",
          "score": ""
        },
        "partners": {
          "note": "MTMA / Peenya Industries Association. Cluster v4 records this as an enquiry route. No agreement is recorded.",
          "score": ""
        },
        "colleges": {
          "note": "RVCE. Named in cluster v4 as the academic route. No meeting is recorded.",
          "score": ""
        },
        "lenders": {
          "note": "No lending company is named. Product types listed in cluster v4: CC/OD; equipment.",
          "score": ""
        },
        "marketing": {
          "note": "No marketing company is named in cluster v4.",
          "score": ""
        },
        "export": {
          "note": "Cluster v4 label: Potential. No local export value is published for this cohort.",
          "score": ""
        },
        "listing": {
          "note": "No listing candidate is named in cluster v4.",
          "score": ""
        },
        "size": {
          "note": "The 100 MSMEs are a historical machine-tool subset, plus 6 large units. That is not a size mix for the fabrication belt.",
          "score": ""
        },
        "state": {
          "note": "Peenya cluster SPV exists (cluster v4, 30 October 2026). A facility is in place.",
          "score": "3"
        },
        "central": {
          "note": "Cluster v4 names the same horizontal routes for every belt: SIDBI, CGTMSE, MUDRA, LEAN, ZED and NSIC. It does not show MSMEs in this belt already inside a cluster-specific central scheme.",
          "score": ""
        },
        "other": {
          "note": "Cluster v4 position: Validation shortlist. Comparison-row observation: Cluster SPV exists. Do not add this count to an overlapping row.",
          "score": ""
        }
      }
    },
    {
      "id": "ADD08",
      "name": "Bengaluru plastics precision moulding",
      "place": "Karnataka · Bengaluru Urban · Peenya and nearby precision-moulding enquiry",
      "hsn": "3923; 3926; 6305",
      "list": "Cluster v4",
      "cells": {
        "count": {
          "note": "Current moulding enterprise count not verified. Technical ecosystem evidence is available; local cohort remains proposed.",
          "score": ""
        },
        "growth": {
          "note": "No published comparison of units, sales or exports for this belt. Comparison-row observation: Technical route; cohort NV.",
          "score": ""
        },
        "partners": {
          "note": "CIPET APDDRL / local convenor enquiry. Cluster v4 records this as an enquiry route. No agreement is recorded.",
          "score": ""
        },
        "colleges": {
          "note": "RVCE; CIPET APDDRL. Named in cluster v4 as the academic route. No meeting is recorded.",
          "score": ""
        },
        "lenders": {
          "note": "No lending company is named. Product types listed in cluster v4: Resin WC; mould loan.",
          "score": ""
        },
        "marketing": {
          "note": "No marketing company is named in cluster v4.",
          "score": ""
        },
        "export": {
          "note": "Cluster v4 label: Potential. No local export value is published for this cohort.",
          "score": ""
        },
        "listing": {
          "note": "No listing candidate is named in cluster v4.",
          "score": ""
        },
        "size": {
          "note": "Turnover bands are not verified in cluster v4, so the nano, micro, small and medium mix is still open.",
          "score": ""
        },
        "state": {
          "note": "Named route: CIPET APDDRL / local convenor enquiry. Cluster v4 does not record a state scheme or park already in place.",
          "score": ""
        },
        "central": {
          "note": "Cluster v4 names the same horizontal routes for every belt: SIDBI, CGTMSE, MUDRA, LEAN, ZED and NSIC. It does not show MSMEs in this belt already inside a cluster-specific central scheme.",
          "score": ""
        },
        "other": {
          "note": "Cluster v4 position: Mapping / evidence first. Comparison-row observation: Technical route; cohort NV. Do not add this count to an overlapping row.",
          "score": ""
        }
      }
    },
    {
      "id": "ADD09",
      "name": "Bengaluru aerospace defence suppliers",
      "place": "Karnataka · Devanahalli district jurisdiction to validate at recruitment · Bengaluru / Devanahalli aerospace supplier ecosystem",
      "hsn": "8807; 9305; 7326",
      "list": "Cluster v4",
      "cells": {
        "count": {
          "note": "Active eligible MSME count not verified. Aerospace park area and state export shares are not company counts.",
          "score": ""
        },
        "growth": {
          "note": "No published comparison of units, sales or exports for this belt. Comparison-row observation: State ecosystem identified.",
          "score": ""
        },
        "partners": {
          "note": "Invest Karnataka / SIDM enquiry. Cluster v4 records this as an enquiry route. No agreement is recorded.",
          "score": ""
        },
        "colleges": {
          "note": "RVCE. Named in cluster v4 as the academic route. No meeting is recorded.",
          "score": ""
        },
        "lenders": {
          "note": "No lending company is named. Product types listed in cluster v4: Contract WC; metrology.",
          "score": ""
        },
        "marketing": {
          "note": "No marketing company is named in cluster v4.",
          "score": ""
        },
        "export": {
          "note": "Cluster v4 label: Controlled potential. No local export value is published for this cohort.",
          "score": ""
        },
        "listing": {
          "note": "No listing candidate is named in cluster v4.",
          "score": ""
        },
        "size": {
          "note": "Turnover bands are not verified in cluster v4, so the nano, micro, small and medium mix is still open.",
          "score": ""
        },
        "state": {
          "note": "Named route: Invest Karnataka / SIDM enquiry. Cluster v4 does not record a state scheme or park already in place.",
          "score": ""
        },
        "central": {
          "note": "Cluster v4 names the same horizontal routes for every belt: SIDBI, CGTMSE, MUDRA, LEAN, ZED and NSIC. It does not show MSMEs in this belt already inside a cluster-specific central scheme.",
          "score": ""
        },
        "other": {
          "note": "Cluster v4 position: Mapping / evidence first. Comparison-row observation: State ecosystem identified. Do not add this count to an overlapping row.",
          "score": ""
        }
      }
    },
    {
      "id": "ADD10",
      "name": "Hosur auto and engineering suppliers",
      "place": "Tamil Nadu · Krishnagiri · Hosur / adjacent engineering estates",
      "hsn": "8708; 8714; 8409",
      "list": "Cluster v4",
      "cells": {
        "count": {
          "note": "Current auto-only enterprise total not verified. Existing engineering CFC is evidence of support infrastructure, not a firm census.",
          "score": ""
        },
        "growth": {
          "note": "No published comparison of units, sales or exports for this belt. Comparison-row observation: Engineering CFC listed complete.",
          "score": ""
        },
        "partners": {
          "note": "Hosur engineering CFC / ACMA enquiry. Cluster v4 records this as an enquiry route. No agreement is recorded.",
          "score": ""
        },
        "colleges": {
          "note": "RVCE or Anna; travel check. Named in cluster v4 as the academic route. No meeting is recorded.",
          "score": ""
        },
        "lenders": {
          "note": "No lending company is named. Product types listed in cluster v4: CC/OD; vendor; tooling.",
          "score": ""
        },
        "marketing": {
          "note": "No marketing company is named in cluster v4.",
          "score": ""
        },
        "export": {
          "note": "Cluster v4 label: Potential. No local export value is published for this cohort.",
          "score": ""
        },
        "listing": {
          "note": "No listing candidate is named in cluster v4.",
          "score": ""
        },
        "size": {
          "note": "Turnover bands are not verified in cluster v4, so the nano, micro, small and medium mix is still open.",
          "score": ""
        },
        "state": {
          "note": "Hosur engineering CFC is listed complete (cluster v4, 30 October 2026). A facility is in place.",
          "score": "3"
        },
        "central": {
          "note": "Cluster v4 names the same horizontal routes for every belt: SIDBI, CGTMSE, MUDRA, LEAN, ZED and NSIC. It does not show MSMEs in this belt already inside a cluster-specific central scheme.",
          "score": ""
        },
        "other": {
          "note": "Cluster v4 position: Mapping / evidence first. Comparison-row observation: Engineering CFC listed complete. Do not add this count to an overlapping row.",
          "score": ""
        }
      }
    },
    {
      "id": "ADD11",
      "name": "Hosur print and pack products",
      "place": "Tamil Nadu · Krishnagiri · Hosur print and pack products",
      "hsn": "4819; 4821; 4911",
      "list": "Cluster v4",
      "cells": {
        "count": {
          "note": "Current active firm count not verified. CFC reported developed in FY2023–24.",
          "score": ""
        },
        "growth": {
          "note": "No published comparison of units, sales or exports for this belt. Comparison-row observation: CFC developed FY2023–24.",
          "score": ""
        },
        "partners": {
          "note": "Print and Pack CFC / SPV enquiry. Cluster v4 records this as an enquiry route. No agreement is recorded.",
          "score": ""
        },
        "colleges": {
          "note": "IPT Chennai; travel check. Named in cluster v4 as the academic route. No meeting is recorded.",
          "score": ""
        },
        "lenders": {
          "note": "No lending company is named. Product types listed in cluster v4: Paper WC; press loan.",
          "score": ""
        },
        "marketing": {
          "note": "No marketing company is named in cluster v4.",
          "score": ""
        },
        "export": {
          "note": "Cluster v4 label: Potential. No local export value is published for this cohort.",
          "score": ""
        },
        "listing": {
          "note": "No listing candidate is named in cluster v4.",
          "score": ""
        },
        "size": {
          "note": "Turnover bands are not verified in cluster v4, so the nano, micro, small and medium mix is still open.",
          "score": ""
        },
        "state": {
          "note": "Hosur Print and Pack CFC is reported developed in FY2023–24 (cluster v4). A facility is in place.",
          "score": "3"
        },
        "central": {
          "note": "Cluster v4 names the same horizontal routes for every belt: SIDBI, CGTMSE, MUDRA, LEAN, ZED and NSIC. It does not show MSMEs in this belt already inside a cluster-specific central scheme.",
          "score": ""
        },
        "other": {
          "note": "Cluster v4 position: Mapping / evidence first. Comparison-row observation: CFC developed FY2023–24. Do not add this count to an overlapping row.",
          "score": ""
        }
      }
    },
    {
      "id": "ADD12",
      "name": "Chennai auto components",
      "place": "Tamil Nadu · Chennai / neighbouring district jurisdiction to validate · Guindy / Ambattur automotive supplier enquiry",
      "hsn": "8708; 8714; 8409",
      "list": "Cluster v4",
      "cells": {
        "count": {
          "note": "Current eligible auto-component MSME count not verified. Historical DC-MSME cluster listing establishes sector.",
          "score": ""
        },
        "growth": {
          "note": "No published comparison of units, sales or exports for this belt. Comparison-row observation: Historical auto cluster listed.",
          "score": ""
        },
        "partners": {
          "note": "ACMA South / local supplier bodies. Cluster v4 records this as an enquiry route. No agreement is recorded.",
          "score": ""
        },
        "colleges": {
          "note": "Anna University. Named in cluster v4 as the academic route. No meeting is recorded.",
          "score": ""
        },
        "lenders": {
          "note": "No lending company is named. Product types listed in cluster v4: CC/OD; vendor; tooling.",
          "score": ""
        },
        "marketing": {
          "note": "No marketing company is named in cluster v4.",
          "score": ""
        },
        "export": {
          "note": "Cluster v4 label: Potential. No local export value is published for this cohort.",
          "score": ""
        },
        "listing": {
          "note": "No listing candidate is named in cluster v4.",
          "score": ""
        },
        "size": {
          "note": "Turnover bands are not verified in cluster v4, so the nano, micro, small and medium mix is still open.",
          "score": ""
        },
        "state": {
          "note": "Named route: ACMA South / local supplier bodies. Cluster v4 does not record a state scheme or park already in place.",
          "score": ""
        },
        "central": {
          "note": "Cluster v4 names the same horizontal routes for every belt: SIDBI, CGTMSE, MUDRA, LEAN, ZED and NSIC. It does not show MSMEs in this belt already inside a cluster-specific central scheme.",
          "score": ""
        },
        "other": {
          "note": "Cluster v4 position: Mapping / evidence first. Comparison-row observation: Historical auto cluster listed. Do not add this count to an overlapping row.",
          "score": ""
        }
      }
    },
    {
      "id": "ADD13",
      "name": "Chennai Kancheepuram plastic woven sacks",
      "place": "Tamil Nadu · Kancheepuram · Pillaipakkam / Sriperumbudur plastic woven-sack CFC",
      "hsn": "3923; 3926; 6305",
      "list": "Cluster v4",
      "cells": {
        "count": {
          "note": "Current operating enterprise count not verified. Completed plastic woven sacks CFC is listed at Pillaipakkam/Sriperumbudur.",
          "score": ""
        },
        "growth": {
          "note": "No published comparison of units, sales or exports for this belt. Comparison-row observation: CFC listed complete.",
          "score": ""
        },
        "partners": {
          "note": "Chennai Plastic Sacks Cluster SPV. Cluster v4 records this as an enquiry route. No agreement is recorded.",
          "score": ""
        },
        "colleges": {
          "note": "CIPET Chennai / Anna. Named in cluster v4 as the academic route. No meeting is recorded.",
          "score": ""
        },
        "lenders": {
          "note": "No lending company is named. Product types listed in cluster v4: Resin WC; mould loan.",
          "score": ""
        },
        "marketing": {
          "note": "No marketing company is named in cluster v4.",
          "score": ""
        },
        "export": {
          "note": "Cluster v4 label: Potential. No local export value is published for this cohort.",
          "score": ""
        },
        "listing": {
          "note": "No listing candidate is named in cluster v4.",
          "score": ""
        },
        "size": {
          "note": "Turnover bands are not verified in cluster v4, so the nano, micro, small and medium mix is still open.",
          "score": ""
        },
        "state": {
          "note": "Plastic woven-sacks CFC at Pillaipakkam/Sriperumbudur is listed complete (cluster v4). A facility is in place.",
          "score": "3"
        },
        "central": {
          "note": "Cluster v4 names the same horizontal routes for every belt: SIDBI, CGTMSE, MUDRA, LEAN, ZED and NSIC. It does not show MSMEs in this belt already inside a cluster-specific central scheme.",
          "score": ""
        },
        "other": {
          "note": "Cluster v4 position: Mapping / evidence first. Comparison-row observation: CFC listed complete. Do not add this count to an overlapping row.",
          "score": ""
        }
      }
    },
    {
      "id": "ADD14",
      "name": "Chennai printing and packaging",
      "place": "Tamil Nadu · Chennai · Chennai printing and packaging enquiry",
      "hsn": "4819; 4821; 4911",
      "list": "Cluster v4",
      "cells": {
        "count": {
          "note": "Current active printing/packaging enterprise count not verified. Historical DC-MSME list identifies Chennai printing.",
          "score": ""
        },
        "growth": {
          "note": "No published comparison of units, sales or exports for this belt. Comparison-row observation: Historical printing cluster.",
          "score": ""
        },
        "partners": {
          "note": "Printing cluster / local SPV enquiry. Cluster v4 records this as an enquiry route. No agreement is recorded.",
          "score": ""
        },
        "colleges": {
          "note": "IPT Chennai. Named in cluster v4 as the academic route. No meeting is recorded.",
          "score": ""
        },
        "lenders": {
          "note": "No lending company is named. Product types listed in cluster v4: Paper WC; press loan.",
          "score": ""
        },
        "marketing": {
          "note": "No marketing company is named in cluster v4.",
          "score": ""
        },
        "export": {
          "note": "Cluster v4 label: Potential. No local export value is published for this cohort.",
          "score": ""
        },
        "listing": {
          "note": "No listing candidate is named in cluster v4.",
          "score": ""
        },
        "size": {
          "note": "Turnover bands are not verified in cluster v4, so the nano, micro, small and medium mix is still open.",
          "score": ""
        },
        "state": {
          "note": "Named route: Printing cluster / local SPV enquiry. Cluster v4 does not record a state scheme or park already in place.",
          "score": ""
        },
        "central": {
          "note": "Cluster v4 names the same horizontal routes for every belt: SIDBI, CGTMSE, MUDRA, LEAN, ZED and NSIC. It does not show MSMEs in this belt already inside a cluster-specific central scheme.",
          "score": ""
        },
        "other": {
          "note": "Cluster v4 position: Mapping / evidence first. Comparison-row observation: Historical printing cluster. Do not add this count to an overlapping row.",
          "score": ""
        }
      }
    },
    {
      "id": "ADD15",
      "name": "Chennai Hosur defence corridor suppliers",
      "place": "Tamil Nadu · Chennai / Krishnagiri; additional plant districts to verify · Chennai–Hosur defence-corridor nodes",
      "hsn": "8807; 9305; 7326",
      "list": "Cluster v4",
      "cells": {
        "count": {
          "note": "Eligible supplier cohort size not verified. Two corridor nodes are grouped for comparison; this is not one bounded microcluster.",
          "score": ""
        },
        "growth": {
          "note": "No published comparison of units, sales or exports for this belt. Comparison-row observation: Defence corridor nodes.",
          "score": ""
        },
        "partners": {
          "note": "TIDCO / SIDM enquiry. Cluster v4 records this as an enquiry route. No agreement is recorded.",
          "score": ""
        },
        "colleges": {
          "note": "Anna University; Hosur travel check. Named in cluster v4 as the academic route. No meeting is recorded.",
          "score": ""
        },
        "lenders": {
          "note": "No lending company is named. Product types listed in cluster v4: Contract WC; metrology.",
          "score": ""
        },
        "marketing": {
          "note": "No marketing company is named in cluster v4.",
          "score": ""
        },
        "export": {
          "note": "Cluster v4 label: Controlled potential. No local export value is published for this cohort.",
          "score": ""
        },
        "listing": {
          "note": "No listing candidate is named in cluster v4.",
          "score": ""
        },
        "size": {
          "note": "Turnover bands are not verified in cluster v4, so the nano, micro, small and medium mix is still open.",
          "score": ""
        },
        "state": {
          "note": "Named route: TIDCO / SIDM enquiry. Cluster v4 does not record a state scheme or park already in place.",
          "score": ""
        },
        "central": {
          "note": "Cluster v4 names the same horizontal routes for every belt: SIDBI, CGTMSE, MUDRA, LEAN, ZED and NSIC. It does not show MSMEs in this belt already inside a cluster-specific central scheme.",
          "score": ""
        },
        "other": {
          "note": "Cluster v4 position: Mapping / evidence first. Comparison-row observation: Defence corridor nodes. Do not add this count to an overlapping row.",
          "score": ""
        }
      }
    },
    {
      "id": "E-Bengaluru",
      "name": "Bengaluru — Electronics",
      "place": "Karnataka · Bengaluru Urban · Peenya / Bommasandra electronics production enquiry",
      "hsn": "8534; 8537; 8542",
      "list": "Cluster v4",
      "cells": {
        "count": {
          "note": "Comparable current district–sector enterprise count not verified",
          "score": ""
        },
        "growth": {
          "note": "No published comparison of units, sales or exports for this belt. Comparison-row observation: Credit +16%; DPD 1.1%.",
          "score": ""
        },
        "partners": {
          "note": "No local delivery partner is named. Cluster v4 marks the local route as not verified.",
          "score": ""
        },
        "colleges": {
          "note": "RVCE. Named in cluster v4 as the academic route. No meeting is recorded.",
          "score": ""
        },
        "lenders": {
          "note": "No lending company is named. Product types listed in cluster v4: Parts WC; assembly capex.",
          "score": ""
        },
        "marketing": {
          "note": "No marketing company is named in cluster v4.",
          "score": ""
        },
        "export": {
          "note": "Cluster v4 label: Potential only. No local export value is published for this cohort.",
          "score": ""
        },
        "listing": {
          "note": "No listing candidate is named in cluster v4.",
          "score": ""
        },
        "size": {
          "note": "Turnover bands are not verified in cluster v4, so the nano, micro, small and medium mix is still open.",
          "score": ""
        },
        "state": {
          "note": "No state scheme, park, or nodal office is recorded for this belt in cluster v4.",
          "score": ""
        },
        "central": {
          "note": "Cluster v4 names the same horizontal routes for every belt: SIDBI, CGTMSE, MUDRA, LEAN, ZED and NSIC. It does not show MSMEs in this belt already inside a cluster-specific central scheme.",
          "score": ""
        },
        "other": {
          "note": "Cluster v4 position: Mapping / evidence first. Comparison-row observation: Credit +16%; DPD 1.1%. Do not add this count to an overlapping row.",
          "score": ""
        }
      }
    },
    {
      "id": "E-Mumbai Suburban",
      "name": "Mumbai Suburban — Electronics",
      "place": "Maharashtra · Mumbai Suburban · Andheri / Marol electronics enquiry",
      "hsn": "8534; 8537; 8542",
      "list": "Cluster v4",
      "cells": {
        "count": {
          "note": "Comparable current district–sector enterprise count not verified",
          "score": ""
        },
        "growth": {
          "note": "No published comparison of units, sales or exports for this belt. Comparison-row observation: Credit +14%; DPD 1.6%.",
          "score": ""
        },
        "partners": {
          "note": "No local delivery partner is named. Cluster v4 marks the local route as not verified.",
          "score": ""
        },
        "colleges": {
          "note": "VJTI. Named in cluster v4 as the academic route. No meeting is recorded.",
          "score": ""
        },
        "lenders": {
          "note": "No lending company is named. Product types listed in cluster v4: Parts WC; assembly capex.",
          "score": ""
        },
        "marketing": {
          "note": "No marketing company is named in cluster v4.",
          "score": ""
        },
        "export": {
          "note": "Cluster v4 label: Potential only. No local export value is published for this cohort.",
          "score": ""
        },
        "listing": {
          "note": "No listing candidate is named in cluster v4.",
          "score": ""
        },
        "size": {
          "note": "Turnover bands are not verified in cluster v4, so the nano, micro, small and medium mix is still open.",
          "score": ""
        },
        "state": {
          "note": "No state scheme, park, or nodal office is recorded for this belt in cluster v4.",
          "score": ""
        },
        "central": {
          "note": "Cluster v4 names the same horizontal routes for every belt: SIDBI, CGTMSE, MUDRA, LEAN, ZED and NSIC. It does not show MSMEs in this belt already inside a cluster-specific central scheme.",
          "score": ""
        },
        "other": {
          "note": "Cluster v4 position: Mapping / evidence first. Comparison-row observation: Credit +14%; DPD 1.6%. Do not add this count to an overlapping row.",
          "score": ""
        }
      }
    },
    {
      "id": "E-Jaipur",
      "name": "Jaipur — Electronics",
      "place": "Rajasthan · Jaipur jurisdiction to validate after district changes · Sitapura / Vishwakarma candidate electronics belt",
      "hsn": "8534; 8537; 8542",
      "list": "Cluster v4",
      "cells": {
        "count": {
          "note": "Comparable current district–sector enterprise count not verified",
          "score": ""
        },
        "growth": {
          "note": "No published comparison of units, sales or exports for this belt. Comparison-row observation: Credit +21%; DPD 0.6%.",
          "score": ""
        },
        "partners": {
          "note": "No local delivery partner is named. Cluster v4 marks the local route as not verified.",
          "score": ""
        },
        "colleges": {
          "note": "MNIT Jaipur. Named in cluster v4 as the academic route. No meeting is recorded.",
          "score": ""
        },
        "lenders": {
          "note": "No lending company is named. Product types listed in cluster v4: Parts WC; assembly capex.",
          "score": ""
        },
        "marketing": {
          "note": "No marketing company is named in cluster v4.",
          "score": ""
        },
        "export": {
          "note": "Cluster v4 label: Potential only. No local export value is published for this cohort.",
          "score": ""
        },
        "listing": {
          "note": "No listing candidate is named in cluster v4.",
          "score": ""
        },
        "size": {
          "note": "Turnover bands are not verified in cluster v4, so the nano, micro, small and medium mix is still open.",
          "score": ""
        },
        "state": {
          "note": "No state scheme, park, or nodal office is recorded for this belt in cluster v4.",
          "score": ""
        },
        "central": {
          "note": "Cluster v4 names the same horizontal routes for every belt: SIDBI, CGTMSE, MUDRA, LEAN, ZED and NSIC. It does not show MSMEs in this belt already inside a cluster-specific central scheme.",
          "score": ""
        },
        "other": {
          "note": "Cluster v4 position: Mapping / evidence first. Comparison-row observation: Credit +21%; DPD 0.6%. Do not add this count to an overlapping row.",
          "score": ""
        }
      }
    },
    {
      "id": "E-Gurugram",
      "name": "Gurugram — Engineering",
      "place": "Haryana · Gurugram · Udyog Vihar / Manesar engineering enquiry",
      "hsn": "7308; 7326; 8466",
      "list": "Cluster v4",
      "cells": {
        "count": {
          "note": "Comparable current district–sector enterprise count not verified",
          "score": ""
        },
        "growth": {
          "note": "No published comparison of units, sales or exports for this belt. Comparison-row observation: Credit +25%; DPD 0.5%.",
          "score": ""
        },
        "partners": {
          "note": "No local delivery partner is named. Cluster v4 marks the local route as not verified.",
          "score": ""
        },
        "colleges": {
          "note": "Gurugram University. Named in cluster v4 as the academic route. No meeting is recorded.",
          "score": ""
        },
        "lenders": {
          "note": "No lending company is named. Product types listed in cluster v4: CC/OD; equipment.",
          "score": ""
        },
        "marketing": {
          "note": "No marketing company is named in cluster v4.",
          "score": ""
        },
        "export": {
          "note": "Cluster v4 label: Potential only. No local export value is published for this cohort.",
          "score": ""
        },
        "listing": {
          "note": "No listing candidate is named in cluster v4.",
          "score": ""
        },
        "size": {
          "note": "Turnover bands are not verified in cluster v4, so the nano, micro, small and medium mix is still open.",
          "score": ""
        },
        "state": {
          "note": "No state scheme, park, or nodal office is recorded for this belt in cluster v4.",
          "score": ""
        },
        "central": {
          "note": "Cluster v4 names the same horizontal routes for every belt: SIDBI, CGTMSE, MUDRA, LEAN, ZED and NSIC. It does not show MSMEs in this belt already inside a cluster-specific central scheme.",
          "score": ""
        },
        "other": {
          "note": "Cluster v4 position: Mapping / evidence first. Comparison-row observation: Credit +25%; DPD 0.5%. Do not add this count to an overlapping row.",
          "score": ""
        }
      }
    },
    {
      "id": "T-Tiruppur",
      "name": "Tiruppur — Textiles",
      "place": "Tamil Nadu · Tiruppur · Tiruppur knitwear production and ancillary belt",
      "hsn": "6109; 6203; 6204",
      "list": "Cluster v4",
      "cells": {
        "count": {
          "note": "TEA publishes approximately 20,000 production and ancillary units across operations; the count table is undated and should not be treated as a deduplicated 2026 company census. Separately TEA reports 1,360 knitwear exporter members as of January 2026. Membership is a subset, not the total cluster. Accessed 29 October 2026.",
          "score": "5"
        },
        "growth": {
          "note": "No published comparison of units, sales or exports for this belt. Comparison-row observation: Credit +6%; DPD 1.8%.",
          "score": ""
        },
        "partners": {
          "note": "C + TEA. Cluster v4 records this as an enquiry route. No agreement is recorded.",
          "score": ""
        },
        "colleges": {
          "note": "NIFT TEA. Named in cluster v4 as the academic route. No meeting is recorded.",
          "score": ""
        },
        "lenders": {
          "note": "No lending company is named. Product types listed in cluster v4: Seasonal WC; export.",
          "score": ""
        },
        "marketing": {
          "note": "No marketing company is named in cluster v4.",
          "score": ""
        },
        "export": {
          "note": "TEA’s earlier profile reports FY2024–25 knitwear exports ₹44,747 crore and domestic sales ₹27,000 crore. Because the domestic observation year and population match are not established, no combined turnover or export-share arithmetic is published. These are broader ecosystem indicators, not cohort sales.",
          "score": "4"
        },
        "listing": {
          "note": "No listing candidate is named in cluster v4.",
          "score": ""
        },
        "size": {
          "note": "TEA's unit count does not split nano, micro, small and medium. Turnover bands are not verified.",
          "score": ""
        },
        "state": {
          "note": "Named route: TEA. Cluster v4 does not record a state scheme or park already in place.",
          "score": ""
        },
        "central": {
          "note": "Cluster v4 names the same horizontal routes for every belt: SIDBI, CGTMSE, MUDRA, LEAN, ZED and NSIC. It does not show MSMEs in this belt already inside a cluster-specific central scheme.",
          "score": ""
        },
        "other": {
          "note": "Cluster v4 position: Validation shortlist. Comparison-row observation: Credit +6%; DPD 1.8%. Do not add this count to an overlapping row.",
          "score": ""
        }
      }
    },
    {
      "id": "T-Mumbai Suburban",
      "name": "Mumbai Suburban — Apparels",
      "place": "Maharashtra · Mumbai Suburban · Andheri / Goregaon / Malad apparel enquiry",
      "hsn": "6109; 6203; 6204",
      "list": "Cluster v4",
      "cells": {
        "count": {
          "note": "Comparable current district–sector enterprise count not verified",
          "score": ""
        },
        "growth": {
          "note": "No published comparison of units, sales or exports for this belt. Comparison-row observation: Credit +20%; DPD 1.3%.",
          "score": ""
        },
        "partners": {
          "note": "No local delivery partner is named. Cluster v4 marks the local route as not verified.",
          "score": ""
        },
        "colleges": {
          "note": "VJTI. Named in cluster v4 as the academic route. No meeting is recorded.",
          "score": ""
        },
        "lenders": {
          "note": "No lending company is named. Product types listed in cluster v4: Seasonal WC; export.",
          "score": ""
        },
        "marketing": {
          "note": "No marketing company is named in cluster v4.",
          "score": ""
        },
        "export": {
          "note": "Cluster v4 label: Potential only. No local export value is published for this cohort.",
          "score": ""
        },
        "listing": {
          "note": "No listing candidate is named in cluster v4.",
          "score": ""
        },
        "size": {
          "note": "Turnover bands are not verified in cluster v4, so the nano, micro, small and medium mix is still open.",
          "score": ""
        },
        "state": {
          "note": "No state scheme, park, or nodal office is recorded for this belt in cluster v4.",
          "score": ""
        },
        "central": {
          "note": "Cluster v4 names the same horizontal routes for every belt: SIDBI, CGTMSE, MUDRA, LEAN, ZED and NSIC. It does not show MSMEs in this belt already inside a cluster-specific central scheme.",
          "score": ""
        },
        "other": {
          "note": "Cluster v4 position: Mapping / evidence first. Comparison-row observation: Credit +20%; DPD 1.3%. Do not add this count to an overlapping row.",
          "score": ""
        }
      }
    },
    {
      "id": "T-Coimbatore",
      "name": "Coimbatore — Khadi",
      "place": "Tamil Nadu · Coimbatore · Khadi / weaving enterprise catchment to be mapped",
      "hsn": "5208; 5209",
      "list": "Cluster v4",
      "cells": {
        "count": {
          "note": "Comparable current district–sector enterprise count not verified",
          "score": ""
        },
        "growth": {
          "note": "No published comparison of units, sales or exports for this belt. Comparison-row observation: Credit -5%; DPD 1.5%.",
          "score": ""
        },
        "partners": {
          "note": "No local delivery partner is named. Cluster v4 marks the local route as not verified.",
          "score": ""
        },
        "colleges": {
          "note": "PSG iTech. Named in cluster v4 as the academic route. No meeting is recorded.",
          "score": ""
        },
        "lenders": {
          "note": "No lending company is named. Product types listed in cluster v4: Seasonal WC; export.",
          "score": ""
        },
        "marketing": {
          "note": "No marketing company is named in cluster v4.",
          "score": ""
        },
        "export": {
          "note": "Cluster v4 label: Potential only. No local export value is published for this cohort.",
          "score": ""
        },
        "listing": {
          "note": "No listing candidate is named in cluster v4.",
          "score": ""
        },
        "size": {
          "note": "Turnover bands are not verified in cluster v4, so the nano, micro, small and medium mix is still open.",
          "score": ""
        },
        "state": {
          "note": "No state scheme, park, or nodal office is recorded for this belt in cluster v4.",
          "score": ""
        },
        "central": {
          "note": "Cluster v4 names the same horizontal routes for every belt: SIDBI, CGTMSE, MUDRA, LEAN, ZED and NSIC. It does not show MSMEs in this belt already inside a cluster-specific central scheme.",
          "score": ""
        },
        "other": {
          "note": "Cluster v4 position: Mapping / evidence first. Comparison-row observation: Credit -5%; DPD 1.5%. Do not add this count to an overlapping row.",
          "score": ""
        }
      }
    },
    {
      "id": "T-Panipat",
      "name": "Panipat — Carpets",
      "place": "Haryana · Panipat · Panipat carpets / home-textile processing enquiry",
      "hsn": "5701; 5702; 5703",
      "list": "Cluster v4",
      "cells": {
        "count": {
          "note": "3,095 textile MSMEs in 2015–16; carpet-only company count unverified",
          "score": ""
        },
        "growth": {
          "note": "No published comparison of units, sales or exports for this belt. Comparison-row observation: Credit +21%; DPD 0.6%.",
          "score": ""
        },
        "partners": {
          "note": "No local delivery partner is named. Cluster v4 marks the local route as not verified.",
          "score": ""
        },
        "colleges": {
          "note": "PIET. Named in cluster v4 as the academic route. No meeting is recorded.",
          "score": ""
        },
        "lenders": {
          "note": "No lending company is named. Product types listed in cluster v4: Seasonal WC; export.",
          "score": ""
        },
        "marketing": {
          "note": "No marketing company is named in cluster v4.",
          "score": ""
        },
        "export": {
          "note": "Cluster v4 label: Potential only. SAMEEEKSHA reports ₹950 crore production/turnover for the broader textile profile with data attributed to 2015–16. Carpet-only gross sales, domestic/export split and current cohort sales are not verified; no price or inflation update is reconstructed.",
          "score": ""
        },
        "listing": {
          "note": "No listing candidate is named in cluster v4.",
          "score": ""
        },
        "size": {
          "note": "Turnover bands are not verified in cluster v4, so the nano, micro, small and medium mix is still open.",
          "score": ""
        },
        "state": {
          "note": "No state scheme, park, or nodal office is recorded for this belt in cluster v4.",
          "score": ""
        },
        "central": {
          "note": "Cluster v4 names the same horizontal routes for every belt: SIDBI, CGTMSE, MUDRA, LEAN, ZED and NSIC. It does not show MSMEs in this belt already inside a cluster-specific central scheme.",
          "score": ""
        },
        "other": {
          "note": "Cluster v4 position: Mapping / evidence first. Comparison-row observation: Credit +21%; DPD 0.6%. Do not add this count to an overlapping row.",
          "score": ""
        }
      }
    },
    {
      "id": "T-Jaipur",
      "name": "Jaipur — Garments",
      "place": "Rajasthan · Jaipur jurisdiction to validate · Sitapura / Sanganer garment-production enquiry",
      "hsn": "6109; 6203; 6204",
      "list": "Cluster v4",
      "cells": {
        "count": {
          "note": "Comparable current district–sector enterprise count not verified",
          "score": ""
        },
        "growth": {
          "note": "No published comparison of units, sales or exports for this belt. Comparison-row observation: Credit +19%; DPD 1%.",
          "score": ""
        },
        "partners": {
          "note": "No local delivery partner is named. Cluster v4 marks the local route as not verified.",
          "score": ""
        },
        "colleges": {
          "note": "MNIT Jaipur. Named in cluster v4 as the academic route. No meeting is recorded.",
          "score": ""
        },
        "lenders": {
          "note": "No lending company is named. Product types listed in cluster v4: Seasonal WC; export.",
          "score": ""
        },
        "marketing": {
          "note": "No marketing company is named in cluster v4.",
          "score": ""
        },
        "export": {
          "note": "Cluster v4 label: Potential only. No local export value is published for this cohort.",
          "score": ""
        },
        "listing": {
          "note": "No listing candidate is named in cluster v4.",
          "score": ""
        },
        "size": {
          "note": "Turnover bands are not verified in cluster v4, so the nano, micro, small and medium mix is still open.",
          "score": ""
        },
        "state": {
          "note": "No state scheme, park, or nodal office is recorded for this belt in cluster v4.",
          "score": ""
        },
        "central": {
          "note": "Cluster v4 names the same horizontal routes for every belt: SIDBI, CGTMSE, MUDRA, LEAN, ZED and NSIC. It does not show MSMEs in this belt already inside a cluster-specific central scheme.",
          "score": ""
        },
        "other": {
          "note": "Cluster v4 position: Mapping / evidence first. Comparison-row observation: Credit +19%; DPD 1%. Do not add this count to an overlapping row.",
          "score": ""
        }
      }
    },
    {
      "id": "T-Kolhapur",
      "name": "Kolhapur — Footwear",
      "place": "Maharashtra · Kolhapur · Kolhapuri footwear producer groups; exact workshops to map",
      "hsn": "6403",
      "list": "Cluster v4",
      "cells": {
        "count": {
          "note": "60 micro enterprises in CFC proposal; 240 women artisans in separate project; neither is whole-cluster total",
          "score": ""
        },
        "growth": {
          "note": "No published comparison of units, sales or exports for this belt. Comparison-row observation: Credit +16%; DPD 1.4%.",
          "score": ""
        },
        "partners": {
          "note": "C + LIDCOM / local artisan groups. Cluster v4 records this as an enquiry route. No agreement is recorded.",
          "score": ""
        },
        "colleges": {
          "note": "Govt Polytechnic. Named in cluster v4 as the academic route. No meeting is recorded.",
          "score": ""
        },
        "lenders": {
          "note": "No lending company is named. Product types listed in cluster v4: Seasonal WC; export.",
          "score": ""
        },
        "marketing": {
          "note": "No marketing company is named in cluster v4.",
          "score": ""
        },
        "export": {
          "note": "Cluster v4 label: Global collaboration. No local export value is published for this cohort.",
          "score": ""
        },
        "listing": {
          "note": "No listing candidate is named in cluster v4.",
          "score": ""
        },
        "size": {
          "note": "60 micro enterprises in a CFC proposal, and 240 women artisans in a separate project. Neither figure is the whole cluster. Turnover bands are not verified.",
          "score": ""
        },
        "state": {
          "note": "Named route: LIDCOM / local artisan groups. Cluster v4 does not record a state scheme or park already in place.",
          "score": ""
        },
        "central": {
          "note": "Cluster v4 names the same horizontal routes for every belt: SIDBI, CGTMSE, MUDRA, LEAN, ZED and NSIC. It does not show MSMEs in this belt already inside a cluster-specific central scheme.",
          "score": ""
        },
        "other": {
          "note": "Cluster v4 position: Growth reserve. Comparison-row observation: Credit +16%; DPD 1.4%. Do not add this count to an overlapping row.",
          "score": ""
        }
      }
    },
    {
      "id": "T-Gurugram",
      "name": "Gurugram — Apparels",
      "place": "Haryana · Gurugram · Udyog Vihar / adjoining apparel factories",
      "hsn": "6109; 6203; 6204",
      "list": "Cluster v4",
      "cells": {
        "count": {
          "note": "Comparable current district–sector enterprise count not verified",
          "score": ""
        },
        "growth": {
          "note": "No published comparison of units, sales or exports for this belt. Comparison-row observation: Credit +50%; DPD 1.6%.",
          "score": ""
        },
        "partners": {
          "note": "No local delivery partner is named. Cluster v4 marks the local route as not verified.",
          "score": ""
        },
        "colleges": {
          "note": "Gurugram University. Named in cluster v4 as the academic route. No meeting is recorded.",
          "score": ""
        },
        "lenders": {
          "note": "No lending company is named. Product types listed in cluster v4: Seasonal WC; export.",
          "score": ""
        },
        "marketing": {
          "note": "No marketing company is named in cluster v4.",
          "score": ""
        },
        "export": {
          "note": "Cluster v4 label: Potential only. No local export value is published for this cohort.",
          "score": ""
        },
        "listing": {
          "note": "No listing candidate is named in cluster v4.",
          "score": ""
        },
        "size": {
          "note": "Turnover bands are not verified in cluster v4, so the nano, micro, small and medium mix is still open.",
          "score": ""
        },
        "state": {
          "note": "No state scheme, park, or nodal office is recorded for this belt in cluster v4.",
          "score": ""
        },
        "central": {
          "note": "Cluster v4 names the same horizontal routes for every belt: SIDBI, CGTMSE, MUDRA, LEAN, ZED and NSIC. It does not show MSMEs in this belt already inside a cluster-specific central scheme.",
          "score": ""
        },
        "other": {
          "note": "Cluster v4 position: Mapping / evidence first. Comparison-row observation: Credit +50%; DPD 1.6%. Do not add this count to an overlapping row.",
          "score": ""
        }
      }
    },
    {
      "id": "T-Gautam Buddha Nagar",
      "name": "Gautam Buddha Nagar — Garments",
      "place": "Uttar Pradesh · Gautam Buddha Nagar · Noida garment-production sector enquiry",
      "hsn": "6109; 6203; 6204",
      "list": "Cluster v4",
      "cells": {
        "count": {
          "note": "Comparable current district–sector enterprise count not verified",
          "score": ""
        },
        "growth": {
          "note": "No published comparison of units, sales or exports for this belt. Comparison-row observation: Credit +27%; DPD 0.6%.",
          "score": ""
        },
        "partners": {
          "note": "No local delivery partner is named. Cluster v4 marks the local route as not verified.",
          "score": ""
        },
        "colleges": {
          "note": "Amity Noida. Named in cluster v4 as the academic route. No meeting is recorded.",
          "score": ""
        },
        "lenders": {
          "note": "No lending company is named. Product types listed in cluster v4: Seasonal WC; export.",
          "score": ""
        },
        "marketing": {
          "note": "No marketing company is named in cluster v4.",
          "score": ""
        },
        "export": {
          "note": "Cluster v4 label: Potential only. No local export value is published for this cohort.",
          "score": ""
        },
        "listing": {
          "note": "No listing candidate is named in cluster v4.",
          "score": ""
        },
        "size": {
          "note": "Turnover bands are not verified in cluster v4, so the nano, micro, small and medium mix is still open.",
          "score": ""
        },
        "state": {
          "note": "No state scheme, park, or nodal office is recorded for this belt in cluster v4.",
          "score": ""
        },
        "central": {
          "note": "Cluster v4 names the same horizontal routes for every belt: SIDBI, CGTMSE, MUDRA, LEAN, ZED and NSIC. It does not show MSMEs in this belt already inside a cluster-specific central scheme.",
          "score": ""
        },
        "other": {
          "note": "Cluster v4 position: Mapping / evidence first. Comparison-row observation: Credit +27%; DPD 0.6%. Do not add this count to an overlapping row.",
          "score": ""
        }
      }
    },
    {
      "id": "F-Pune",
      "name": "Pune — Food processing",
      "place": "Maharashtra · Pune · Pune / Pimpri–Chinchwad food-processing enquiry",
      "hsn": "1905; 2008; 2106",
      "list": "Cluster v4",
      "cells": {
        "count": {
          "note": "Comparable current district–sector enterprise count not verified",
          "score": ""
        },
        "growth": {
          "note": "No published comparison of units, sales or exports for this belt. Comparison-row observation: Credit +11%; DPD 2.7%.",
          "score": ""
        },
        "partners": {
          "note": "No local delivery partner is named. Cluster v4 marks the local route as not verified.",
          "score": ""
        },
        "colleges": {
          "note": "COEP / ILS. Named in cluster v4 as the academic route. No meeting is recorded.",
          "score": ""
        },
        "lenders": {
          "note": "No lending company is named. Product types listed in cluster v4: Seasonal WC; capex.",
          "score": ""
        },
        "marketing": {
          "note": "No marketing company is named in cluster v4.",
          "score": ""
        },
        "export": {
          "note": "Cluster v4 label: Product checks. No local export value is published for this cohort.",
          "score": ""
        },
        "listing": {
          "note": "No listing candidate is named in cluster v4.",
          "score": ""
        },
        "size": {
          "note": "Turnover bands are not verified in cluster v4, so the nano, micro, small and medium mix is still open.",
          "score": ""
        },
        "state": {
          "note": "No state scheme, park, or nodal office is recorded for this belt in cluster v4.",
          "score": ""
        },
        "central": {
          "note": "Cluster v4 names the same horizontal routes for every belt: SIDBI, CGTMSE, MUDRA, LEAN, ZED and NSIC. It does not show MSMEs in this belt already inside a cluster-specific central scheme.",
          "score": ""
        },
        "other": {
          "note": "Cluster v4 position: Mapping / evidence first. Comparison-row observation: Credit +11%; DPD 2.7%. Do not add this count to an overlapping row.",
          "score": ""
        }
      }
    },
    {
      "id": "F-Bengaluru Urban",
      "name": "Bengaluru Urban — Food processing",
      "place": "Karnataka · Bengaluru Urban · Urban food-processing estates enquiry",
      "hsn": "1905; 2008; 2106",
      "list": "Cluster v4",
      "cells": {
        "count": {
          "note": "Comparable current district–sector enterprise count not verified",
          "score": ""
        },
        "growth": {
          "note": "No published comparison of units, sales or exports for this belt. Comparison-row observation: Credit +17%; DPD 2.8%.",
          "score": ""
        },
        "partners": {
          "note": "No local delivery partner is named. Cluster v4 marks the local route as not verified.",
          "score": ""
        },
        "colleges": {
          "note": "RVCE. Named in cluster v4 as the academic route. No meeting is recorded.",
          "score": ""
        },
        "lenders": {
          "note": "No lending company is named. Product types listed in cluster v4: Seasonal WC; capex.",
          "score": ""
        },
        "marketing": {
          "note": "No marketing company is named in cluster v4.",
          "score": ""
        },
        "export": {
          "note": "Cluster v4 label: Product checks. No local export value is published for this cohort.",
          "score": ""
        },
        "listing": {
          "note": "No listing candidate is named in cluster v4.",
          "score": ""
        },
        "size": {
          "note": "Turnover bands are not verified in cluster v4, so the nano, micro, small and medium mix is still open.",
          "score": ""
        },
        "state": {
          "note": "No state scheme, park, or nodal office is recorded for this belt in cluster v4.",
          "score": ""
        },
        "central": {
          "note": "Cluster v4 names the same horizontal routes for every belt: SIDBI, CGTMSE, MUDRA, LEAN, ZED and NSIC. It does not show MSMEs in this belt already inside a cluster-specific central scheme.",
          "score": ""
        },
        "other": {
          "note": "Cluster v4 position: Mapping / evidence first. Comparison-row observation: Credit +17%; DPD 2.8%. Do not add this count to an overlapping row.",
          "score": ""
        }
      }
    },
    {
      "id": "F-Indore",
      "name": "Indore — Food processing",
      "place": "Madhya Pradesh · Indore · Sanwer Road / Palda food-processing enquiry",
      "hsn": "1905; 2008; 2106",
      "list": "Cluster v4",
      "cells": {
        "count": {
          "note": "Comparable current district–sector enterprise count not verified",
          "score": ""
        },
        "growth": {
          "note": "No published comparison of units, sales or exports for this belt. Comparison-row observation: Credit +9%; DPD 0.7%.",
          "score": ""
        },
        "partners": {
          "note": "No local delivery partner is named. Cluster v4 marks the local route as not verified.",
          "score": ""
        },
        "colleges": {
          "note": "DAVV IMS. Named in cluster v4 as the academic route. No meeting is recorded.",
          "score": ""
        },
        "lenders": {
          "note": "No lending company is named. Product types listed in cluster v4: Seasonal WC; capex.",
          "score": ""
        },
        "marketing": {
          "note": "No marketing company is named in cluster v4.",
          "score": ""
        },
        "export": {
          "note": "Cluster v4 label: Product checks. No local export value is published for this cohort.",
          "score": ""
        },
        "listing": {
          "note": "No listing candidate is named in cluster v4.",
          "score": ""
        },
        "size": {
          "note": "Turnover bands are not verified in cluster v4, so the nano, micro, small and medium mix is still open.",
          "score": ""
        },
        "state": {
          "note": "No state scheme, park, or nodal office is recorded for this belt in cluster v4.",
          "score": ""
        },
        "central": {
          "note": "Cluster v4 names the same horizontal routes for every belt: SIDBI, CGTMSE, MUDRA, LEAN, ZED and NSIC. It does not show MSMEs in this belt already inside a cluster-specific central scheme.",
          "score": ""
        },
        "other": {
          "note": "Cluster v4 position: Mapping / evidence first. Comparison-row observation: Credit +9%; DPD 0.7%. Do not add this count to an overlapping row.",
          "score": ""
        }
      }
    },
    {
      "id": "F-Kolkata",
      "name": "Kolkata — Marine",
      "place": "West Bengal · Kolkata · Kolkata marine-export business / processing-site mapping",
      "hsn": "0306; 1605",
      "list": "Cluster v4",
      "cells": {
        "count": {
          "note": "Comparable current district–sector enterprise count not verified",
          "score": ""
        },
        "growth": {
          "note": "No published comparison of units, sales or exports for this belt. Comparison-row observation: Credit +1%; DPD 1%.",
          "score": ""
        },
        "partners": {
          "note": "No local delivery partner is named. Cluster v4 marks the local route as not verified.",
          "score": ""
        },
        "colleges": {
          "note": "Jadavpur University. Named in cluster v4 as the academic route. No meeting is recorded.",
          "score": ""
        },
        "lenders": {
          "note": "No lending company is named. Product types listed in cluster v4: Seasonal WC; capex.",
          "score": ""
        },
        "marketing": {
          "note": "No marketing company is named in cluster v4.",
          "score": ""
        },
        "export": {
          "note": "Cluster v4 label: Product checks. No local export value is published for this cohort.",
          "score": ""
        },
        "listing": {
          "note": "No listing candidate is named in cluster v4.",
          "score": ""
        },
        "size": {
          "note": "Turnover bands are not verified in cluster v4, so the nano, micro, small and medium mix is still open.",
          "score": ""
        },
        "state": {
          "note": "No state scheme, park, or nodal office is recorded for this belt in cluster v4.",
          "score": ""
        },
        "central": {
          "note": "Cluster v4 names the same horizontal routes for every belt: SIDBI, CGTMSE, MUDRA, LEAN, ZED and NSIC. It does not show MSMEs in this belt already inside a cluster-specific central scheme.",
          "score": ""
        },
        "other": {
          "note": "Cluster v4 position: Mapping / evidence first. Comparison-row observation: Credit +1%; DPD 1%. Do not add this count to an overlapping row.",
          "score": ""
        }
      }
    },
    {
      "id": "F-Nagpur",
      "name": "Nagpur — Food processing",
      "place": "Maharashtra · Nagpur · Hingna / Butibori processor enquiry",
      "hsn": "1905; 2008; 2106",
      "list": "Cluster v4",
      "cells": {
        "count": {
          "note": "Comparable current district–sector enterprise count not verified",
          "score": ""
        },
        "growth": {
          "note": "No published comparison of units, sales or exports for this belt. Comparison-row observation: Credit +12%; DPD 1%.",
          "score": ""
        },
        "partners": {
          "note": "No local delivery partner is named. Cluster v4 marks the local route as not verified.",
          "score": ""
        },
        "colleges": {
          "note": "VNIT. Named in cluster v4 as the academic route. No meeting is recorded.",
          "score": ""
        },
        "lenders": {
          "note": "No lending company is named. Product types listed in cluster v4: Seasonal WC; capex.",
          "score": ""
        },
        "marketing": {
          "note": "No marketing company is named in cluster v4.",
          "score": ""
        },
        "export": {
          "note": "Cluster v4 label: Product checks. No local export value is published for this cohort.",
          "score": ""
        },
        "listing": {
          "note": "No listing candidate is named in cluster v4.",
          "score": ""
        },
        "size": {
          "note": "Turnover bands are not verified in cluster v4, so the nano, micro, small and medium mix is still open.",
          "score": ""
        },
        "state": {
          "note": "No state scheme, park, or nodal office is recorded for this belt in cluster v4.",
          "score": ""
        },
        "central": {
          "note": "Cluster v4 names the same horizontal routes for every belt: SIDBI, CGTMSE, MUDRA, LEAN, ZED and NSIC. It does not show MSMEs in this belt already inside a cluster-specific central scheme.",
          "score": ""
        },
        "other": {
          "note": "Cluster v4 position: Mapping / evidence first. Comparison-row observation: Credit +12%; DPD 1%. Do not add this count to an overlapping row.",
          "score": ""
        }
      }
    },
    {
      "id": "F-Tiruppur",
      "name": "Tiruppur — Food processing",
      "place": "Tamil Nadu · Tiruppur · Food-processing catchment to be mapped independently of knitwear",
      "hsn": "1905; 2008; 2106",
      "list": "Cluster v4",
      "cells": {
        "count": {
          "note": "Comparable current district–sector enterprise count not verified",
          "score": ""
        },
        "growth": {
          "note": "No published comparison of units, sales or exports for this belt. Comparison-row observation: Credit +21%; DPD 0.2%.",
          "score": ""
        },
        "partners": {
          "note": "No local delivery partner is named. Cluster v4 marks the local route as not verified.",
          "score": ""
        },
        "colleges": {
          "note": "NIFT TEA. Named in cluster v4 as the academic route. No meeting is recorded.",
          "score": ""
        },
        "lenders": {
          "note": "No lending company is named. Product types listed in cluster v4: Seasonal WC; capex.",
          "score": ""
        },
        "marketing": {
          "note": "No marketing company is named in cluster v4.",
          "score": ""
        },
        "export": {
          "note": "Cluster v4 label: Product checks. No local export value is published for this cohort.",
          "score": ""
        },
        "listing": {
          "note": "No listing candidate is named in cluster v4.",
          "score": ""
        },
        "size": {
          "note": "Turnover bands are not verified in cluster v4, so the nano, micro, small and medium mix is still open.",
          "score": ""
        },
        "state": {
          "note": "No state scheme, park, or nodal office is recorded for this belt in cluster v4.",
          "score": ""
        },
        "central": {
          "note": "Cluster v4 names the same horizontal routes for every belt: SIDBI, CGTMSE, MUDRA, LEAN, ZED and NSIC. It does not show MSMEs in this belt already inside a cluster-specific central scheme.",
          "score": ""
        },
        "other": {
          "note": "Cluster v4 position: Mapping / evidence first. Comparison-row observation: Credit +21%; DPD 0.2%. Do not add this count to an overlapping row.",
          "score": ""
        }
      }
    },
    {
      "id": "F-Rangareddi",
      "name": "Rangareddi — Food processing",
      "place": "Telangana · Rangareddy · Kattedan / Rajendranagar food-processing enquiry",
      "hsn": "1905; 2008; 2106",
      "list": "Cluster v4",
      "cells": {
        "count": {
          "note": "Comparable current district–sector enterprise count not verified",
          "score": ""
        },
        "growth": {
          "note": "No published comparison of units, sales or exports for this belt. Comparison-row observation: Credit +12%; DPD 0.6%.",
          "score": ""
        },
        "partners": {
          "note": "No local delivery partner is named. Cluster v4 marks the local route as not verified.",
          "score": ""
        },
        "colleges": {
          "note": "CBIT. Named in cluster v4 as the academic route. No meeting is recorded.",
          "score": ""
        },
        "lenders": {
          "note": "No lending company is named. Product types listed in cluster v4: Seasonal WC; capex.",
          "score": ""
        },
        "marketing": {
          "note": "No marketing company is named in cluster v4.",
          "score": ""
        },
        "export": {
          "note": "Cluster v4 label: Product checks. No local export value is published for this cohort.",
          "score": ""
        },
        "listing": {
          "note": "No listing candidate is named in cluster v4.",
          "score": ""
        },
        "size": {
          "note": "Turnover bands are not verified in cluster v4, so the nano, micro, small and medium mix is still open.",
          "score": ""
        },
        "state": {
          "note": "No state scheme, park, or nodal office is recorded for this belt in cluster v4.",
          "score": ""
        },
        "central": {
          "note": "Cluster v4 names the same horizontal routes for every belt: SIDBI, CGTMSE, MUDRA, LEAN, ZED and NSIC. It does not show MSMEs in this belt already inside a cluster-specific central scheme.",
          "score": ""
        },
        "other": {
          "note": "Cluster v4 position: Mapping / evidence first. Comparison-row observation: Credit +12%; DPD 0.6%. Do not add this count to an overlapping row.",
          "score": ""
        }
      }
    },
    {
      "id": "F-Bikaner",
      "name": "Bikaner — Food processing",
      "place": "Rajasthan · Bikaner · Bichhwal / Karni industrial-area food enquiry",
      "hsn": "1905; 2008; 2106",
      "list": "Cluster v4",
      "cells": {
        "count": {
          "note": "Comparable current district–sector enterprise count not verified",
          "score": ""
        },
        "growth": {
          "note": "No published comparison of units, sales or exports for this belt. Comparison-row observation: Credit +20%; DPD 1.1%.",
          "score": ""
        },
        "partners": {
          "note": "No local delivery partner is named. Cluster v4 marks the local route as not verified.",
          "score": ""
        },
        "colleges": {
          "note": "Engineering College. Named in cluster v4 as the academic route. No meeting is recorded.",
          "score": ""
        },
        "lenders": {
          "note": "No lending company is named. Product types listed in cluster v4: Seasonal WC; capex.",
          "score": ""
        },
        "marketing": {
          "note": "No marketing company is named in cluster v4.",
          "score": ""
        },
        "export": {
          "note": "Cluster v4 label: Product checks. No local export value is published for this cohort.",
          "score": ""
        },
        "listing": {
          "note": "No listing candidate is named in cluster v4.",
          "score": ""
        },
        "size": {
          "note": "Turnover bands are not verified in cluster v4, so the nano, micro, small and medium mix is still open.",
          "score": ""
        },
        "state": {
          "note": "No state scheme, park, or nodal office is recorded for this belt in cluster v4.",
          "score": ""
        },
        "central": {
          "note": "Cluster v4 names the same horizontal routes for every belt: SIDBI, CGTMSE, MUDRA, LEAN, ZED and NSIC. It does not show MSMEs in this belt already inside a cluster-specific central scheme.",
          "score": ""
        },
        "other": {
          "note": "Cluster v4 position: Mapping / evidence first. Comparison-row observation: Credit +20%; DPD 1.1%. Do not add this count to an overlapping row.",
          "score": ""
        }
      }
    },
    {
      "id": "F-Bareilly",
      "name": "Bareilly — Food processing",
      "place": "Uttar Pradesh · Bareilly · Parsakhera / C B Ganj processor enquiry",
      "hsn": "1905; 2008; 2106",
      "list": "Cluster v4",
      "cells": {
        "count": {
          "note": "Comparable current district–sector enterprise count not verified",
          "score": ""
        },
        "growth": {
          "note": "No published comparison of units, sales or exports for this belt. Comparison-row observation: Credit +49%; DPD 0.1%.",
          "score": ""
        },
        "partners": {
          "note": "No local delivery partner is named. Cluster v4 marks the local route as not verified.",
          "score": ""
        },
        "colleges": {
          "note": "MJPRU. Named in cluster v4 as the academic route. No meeting is recorded.",
          "score": ""
        },
        "lenders": {
          "note": "No lending company is named. Product types listed in cluster v4: Seasonal WC; capex.",
          "score": ""
        },
        "marketing": {
          "note": "No marketing company is named in cluster v4.",
          "score": ""
        },
        "export": {
          "note": "Cluster v4 label: Product checks. No local export value is published for this cohort.",
          "score": ""
        },
        "listing": {
          "note": "No listing candidate is named in cluster v4.",
          "score": ""
        },
        "size": {
          "note": "Turnover bands are not verified in cluster v4, so the nano, micro, small and medium mix is still open.",
          "score": ""
        },
        "state": {
          "note": "No state scheme, park, or nodal office is recorded for this belt in cluster v4.",
          "score": ""
        },
        "central": {
          "note": "Cluster v4 names the same horizontal routes for every belt: SIDBI, CGTMSE, MUDRA, LEAN, ZED and NSIC. It does not show MSMEs in this belt already inside a cluster-specific central scheme.",
          "score": ""
        },
        "other": {
          "note": "Cluster v4 position: Mapping / evidence first. Comparison-row observation: Credit +49%; DPD 0.1%. Do not add this count to an overlapping row.",
          "score": ""
        }
      }
    },
    {
      "id": "M-Kolkata",
      "name": "Kolkata — Metals and metal products",
      "place": "West Bengal · Kolkata · Kolkata metal-business and operating-site enquiry",
      "hsn": "7325; 7326; 7616",
      "list": "Cluster v4",
      "cells": {
        "count": {
          "note": "Comparable current district–sector enterprise count not verified",
          "score": ""
        },
        "growth": {
          "note": "No published comparison of units, sales or exports for this belt. Comparison-row observation: Credit -12%; DPD 0.8%.",
          "score": ""
        },
        "partners": {
          "note": "No local delivery partner is named. Cluster v4 marks the local route as not verified.",
          "score": ""
        },
        "colleges": {
          "note": "Jadavpur University. Named in cluster v4 as the academic route. No meeting is recorded.",
          "score": ""
        },
        "lenders": {
          "note": "No lending company is named. Product types listed in cluster v4: CC/OD; equipment.",
          "score": ""
        },
        "marketing": {
          "note": "No marketing company is named in cluster v4.",
          "score": ""
        },
        "export": {
          "note": "Cluster v4 label: Potential only. No local export value is published for this cohort.",
          "score": ""
        },
        "listing": {
          "note": "No listing candidate is named in cluster v4.",
          "score": ""
        },
        "size": {
          "note": "Turnover bands are not verified in cluster v4, so the nano, micro, small and medium mix is still open.",
          "score": ""
        },
        "state": {
          "note": "No state scheme, park, or nodal office is recorded for this belt in cluster v4.",
          "score": ""
        },
        "central": {
          "note": "Cluster v4 names the same horizontal routes for every belt: SIDBI, CGTMSE, MUDRA, LEAN, ZED and NSIC. It does not show MSMEs in this belt already inside a cluster-specific central scheme.",
          "score": ""
        },
        "other": {
          "note": "Cluster v4 position: Mapping / evidence first. Comparison-row observation: Credit -12%; DPD 0.8%. Do not add this count to an overlapping row.",
          "score": ""
        }
      }
    },
    {
      "id": "M-Chennai",
      "name": "Chennai — Metals and metal products",
      "place": "Tamil Nadu · Chennai / Tiruvallur operating-site jurisdiction to verify · Ambattur / adjacent metal-fabrication enquiry",
      "hsn": "7325; 7326; 7616",
      "list": "Cluster v4",
      "cells": {
        "count": {
          "note": "Comparable current district–sector enterprise count not verified",
          "score": ""
        },
        "growth": {
          "note": "No published comparison of units, sales or exports for this belt. Comparison-row observation: Credit +3%; DPD 0.8%.",
          "score": ""
        },
        "partners": {
          "note": "No local delivery partner is named. Cluster v4 marks the local route as not verified.",
          "score": ""
        },
        "colleges": {
          "note": "Anna University. Named in cluster v4 as the academic route. No meeting is recorded.",
          "score": ""
        },
        "lenders": {
          "note": "No lending company is named. Product types listed in cluster v4: CC/OD; equipment.",
          "score": ""
        },
        "marketing": {
          "note": "No marketing company is named in cluster v4.",
          "score": ""
        },
        "export": {
          "note": "Cluster v4 label: Potential only. No local export value is published for this cohort.",
          "score": ""
        },
        "listing": {
          "note": "No listing candidate is named in cluster v4.",
          "score": ""
        },
        "size": {
          "note": "Turnover bands are not verified in cluster v4, so the nano, micro, small and medium mix is still open.",
          "score": ""
        },
        "state": {
          "note": "No state scheme, park, or nodal office is recorded for this belt in cluster v4.",
          "score": ""
        },
        "central": {
          "note": "Cluster v4 names the same horizontal routes for every belt: SIDBI, CGTMSE, MUDRA, LEAN, ZED and NSIC. It does not show MSMEs in this belt already inside a cluster-specific central scheme.",
          "score": ""
        },
        "other": {
          "note": "Cluster v4 position: Mapping / evidence first. Comparison-row observation: Credit +3%; DPD 0.8%. Do not add this count to an overlapping row.",
          "score": ""
        }
      }
    },
    {
      "id": "M-Coimbatore",
      "name": "Coimbatore — Metals and metal products",
      "place": "Tamil Nadu · Coimbatore · Ganapathy / Peelamedu / SIDCO / Arasur foundry catchment",
      "hsn": "7325; 7326; 7616",
      "list": "Cluster v4",
      "cells": {
        "count": {
          "note": "BEE SIDHIEE profile lists about 535 foundries; Indian Foundry Association lists about 600. Reference years are not stated on these pages. Different published estimates, not a statistical range or verified current census; includes large and medium units as well as micro/small. Accessed 29 October 2026.",
          "score": "3"
        },
        "growth": {
          "note": "No published comparison of units, sales or exports for this belt. Comparison-row observation: Credit +11%; DPD 1.8%.",
          "score": ""
        },
        "partners": {
          "note": "C + COINDIA. Cluster v4 records this as an enquiry route. No agreement is recorded.",
          "score": ""
        },
        "colleges": {
          "note": "PSG iTech. Named in cluster v4 as the academic route. No meeting is recorded.",
          "score": ""
        },
        "lenders": {
          "note": "No lending company is named. Product types listed in cluster v4: CC/OD; equipment.",
          "score": ""
        },
        "marketing": {
          "note": "No marketing company is named in cluster v4.",
          "score": ""
        },
        "export": {
          "note": "Cluster v4 label: Potential only. No local export value is published for this cohort.",
          "score": ""
        },
        "listing": {
          "note": "No listing candidate is named in cluster v4.",
          "score": ""
        },
        "size": {
          "note": "The foundry lists include large and medium units as well as micro and small. Shares are not published. Turnover bands are not verified.",
          "score": ""
        },
        "state": {
          "note": "Named route: COINDIA. Cluster v4 does not record a state scheme or park already in place.",
          "score": ""
        },
        "central": {
          "note": "Cluster v4 names the same horizontal routes for every belt: SIDBI, CGTMSE, MUDRA, LEAN, ZED and NSIC. It does not show MSMEs in this belt already inside a cluster-specific central scheme.",
          "score": ""
        },
        "other": {
          "note": "Cluster v4 position: Mapping / evidence first. Comparison-row observation: Credit +11%; DPD 1.8%. Do not add this count to an overlapping row.",
          "score": ""
        }
      }
    },
    {
      "id": "M-Faridabad",
      "name": "Faridabad — Metals and metal products",
      "place": "Haryana · Faridabad · NIT / DLF / Ballabhgarh engineering-estate enquiry",
      "hsn": "7325; 7326; 7616",
      "list": "Cluster v4",
      "cells": {
        "count": {
          "note": "12,015 MSME units in the wider mixed engineering cluster: DESL 2012 study, compiled by TERI with July 2014 inputs. Includes auto parts, sheet metal, fabrication and other sectors. Not a metals-only count or a verified 2026 operating census.",
          "score": ""
        },
        "growth": {
          "note": "No published comparison of units, sales or exports for this belt. Comparison-row observation: Credit +23%; DPD 0.6%.",
          "score": ""
        },
        "partners": {
          "note": "C + FIA. Cluster v4 records this as an enquiry route. No agreement is recorded.",
          "score": ""
        },
        "colleges": {
          "note": "J C Bose YMCA. Named in cluster v4 as the academic route. No meeting is recorded.",
          "score": ""
        },
        "lenders": {
          "note": "No lending company is named. Product types listed in cluster v4: CC/OD; equipment.",
          "score": ""
        },
        "marketing": {
          "note": "No marketing company is named in cluster v4.",
          "score": ""
        },
        "export": {
          "note": "Cluster v4 label: Potential only. No local export value is published for this cohort.",
          "score": ""
        },
        "listing": {
          "note": "No listing candidate is named in cluster v4.",
          "score": ""
        },
        "size": {
          "note": "The 12,015 figure is a 2012 mixed engineering cluster, not a metals size mix. Turnover bands are not verified.",
          "score": ""
        },
        "state": {
          "note": "Named route: FIA. Cluster v4 does not record a state scheme or park already in place.",
          "score": ""
        },
        "central": {
          "note": "Cluster v4 names the same horizontal routes for every belt: SIDBI, CGTMSE, MUDRA, LEAN, ZED and NSIC. It does not show MSMEs in this belt already inside a cluster-specific central scheme.",
          "score": ""
        },
        "other": {
          "note": "Cluster v4 position: Validation shortlist. Comparison-row observation: Credit +23%; DPD 0.6%. Do not add this count to an overlapping row.",
          "score": ""
        }
      }
    },
    {
      "id": "M-Ghaziabad",
      "name": "Ghaziabad — Metals and metal products",
      "place": "Uttar Pradesh · Ghaziabad · Bulandshahr Road / Sahibabad metal-processing enquiry",
      "hsn": "7325; 7326; 7616",
      "list": "Cluster v4",
      "cells": {
        "count": {
          "note": "Comparable current district–sector enterprise count not verified",
          "score": ""
        },
        "growth": {
          "note": "No published comparison of units, sales or exports for this belt. Comparison-row observation: Credit +17%; DPD 0.8%.",
          "score": ""
        },
        "partners": {
          "note": "No local delivery partner is named. Cluster v4 marks the local route as not verified.",
          "score": ""
        },
        "colleges": {
          "note": "KIET. Named in cluster v4 as the academic route. No meeting is recorded.",
          "score": ""
        },
        "lenders": {
          "note": "No lending company is named. Product types listed in cluster v4: CC/OD; equipment.",
          "score": ""
        },
        "marketing": {
          "note": "No marketing company is named in cluster v4.",
          "score": ""
        },
        "export": {
          "note": "Cluster v4 label: Potential only. No local export value is published for this cohort.",
          "score": ""
        },
        "listing": {
          "note": "No listing candidate is named in cluster v4.",
          "score": ""
        },
        "size": {
          "note": "Turnover bands are not verified in cluster v4, so the nano, micro, small and medium mix is still open.",
          "score": ""
        },
        "state": {
          "note": "No state scheme, park, or nodal office is recorded for this belt in cluster v4.",
          "score": ""
        },
        "central": {
          "note": "Cluster v4 names the same horizontal routes for every belt: SIDBI, CGTMSE, MUDRA, LEAN, ZED and NSIC. It does not show MSMEs in this belt already inside a cluster-specific central scheme.",
          "score": ""
        },
        "other": {
          "note": "Cluster v4 position: Mapping / evidence first. Comparison-row observation: Credit +17%; DPD 0.8%. Do not add this count to an overlapping row.",
          "score": ""
        }
      }
    },
    {
      "id": "M-Kolhapur",
      "name": "Kolhapur — Metals and metal products",
      "place": "Maharashtra · Kolhapur · Shiroli / Gokul Shirgaon foundry enquiry",
      "hsn": "7325; 7326; 7616",
      "list": "Cluster v4",
      "cells": {
        "count": {
          "note": "About 250 foundries in wider-area undated profile; includes surrounding areas",
          "score": "3"
        },
        "growth": {
          "note": "No published comparison of units, sales or exports for this belt. Comparison-row observation: Credit +20%; DPD 3.5%.",
          "score": ""
        },
        "partners": {
          "note": "No local delivery partner is named. Cluster v4 marks the local route as not verified.",
          "score": ""
        },
        "colleges": {
          "note": "Govt Polytechnic. Named in cluster v4 as the academic route. No meeting is recorded.",
          "score": ""
        },
        "lenders": {
          "note": "No lending company is named. Product types listed in cluster v4: CC/OD; equipment.",
          "score": ""
        },
        "marketing": {
          "note": "No marketing company is named in cluster v4.",
          "score": ""
        },
        "export": {
          "note": "Cluster v4 label: Potential only. No local export value is published for this cohort.",
          "score": ""
        },
        "listing": {
          "note": "No listing candidate is named in cluster v4.",
          "score": ""
        },
        "size": {
          "note": "Turnover bands are not verified in cluster v4, so the nano, micro, small and medium mix is still open.",
          "score": ""
        },
        "state": {
          "note": "No state scheme, park, or nodal office is recorded for this belt in cluster v4.",
          "score": ""
        },
        "central": {
          "note": "Cluster v4 names the same horizontal routes for every belt: SIDBI, CGTMSE, MUDRA, LEAN, ZED and NSIC. It does not show MSMEs in this belt already inside a cluster-specific central scheme.",
          "score": ""
        },
        "other": {
          "note": "Cluster v4 position: Mapping / evidence first. Comparison-row observation: Credit +20%; DPD 3.5%. Do not add this count to an overlapping row.",
          "score": ""
        }
      }
    },
    {
      "id": "M-Nashik",
      "name": "Nashik — Metals and metal products",
      "place": "Maharashtra · Nashik · Ambad / Satpur metal/engineering enquiry",
      "hsn": "7325; 7326; 7616",
      "list": "Cluster v4",
      "cells": {
        "count": {
          "note": "Comparable current district–sector enterprise count not verified",
          "score": ""
        },
        "growth": {
          "note": "No published comparison of units, sales or exports for this belt. Comparison-row observation: Credit +21%; DPD 1.4%.",
          "score": ""
        },
        "partners": {
          "note": "No local delivery partner is named. Cluster v4 marks the local route as not verified.",
          "score": ""
        },
        "colleges": {
          "note": "K K Wagh. Named in cluster v4 as the academic route. No meeting is recorded.",
          "score": ""
        },
        "lenders": {
          "note": "No lending company is named. Product types listed in cluster v4: CC/OD; equipment.",
          "score": ""
        },
        "marketing": {
          "note": "No marketing company is named in cluster v4.",
          "score": ""
        },
        "export": {
          "note": "Cluster v4 label: Potential only. No local export value is published for this cohort.",
          "score": ""
        },
        "listing": {
          "note": "No listing candidate is named in cluster v4.",
          "score": ""
        },
        "size": {
          "note": "Turnover bands are not verified in cluster v4, so the nano, micro, small and medium mix is still open.",
          "score": ""
        },
        "state": {
          "note": "No state scheme, park, or nodal office is recorded for this belt in cluster v4.",
          "score": ""
        },
        "central": {
          "note": "Cluster v4 names the same horizontal routes for every belt: SIDBI, CGTMSE, MUDRA, LEAN, ZED and NSIC. It does not show MSMEs in this belt already inside a cluster-specific central scheme.",
          "score": ""
        },
        "other": {
          "note": "Cluster v4 position: Mapping / evidence first. Comparison-row observation: Credit +21%; DPD 1.4%. Do not add this count to an overlapping row.",
          "score": ""
        }
      }
    },
    {
      "id": "C-Bengaluru",
      "name": "Bengaluru — Chemicals",
      "place": "Karnataka · Bengaluru Urban; plant jurisdictions to validate · Peenya / Bommasandra chemical-product enquiry",
      "hsn": "Ch 28/29; 3208; 3402",
      "list": "Cluster v4",
      "cells": {
        "count": {
          "note": "Comparable current district–sector enterprise count not verified",
          "score": ""
        },
        "growth": {
          "note": "No published comparison of units, sales or exports for this belt. Comparison-row observation: Credit +16%; DPD 1.4%.",
          "score": ""
        },
        "partners": {
          "note": "No local delivery partner is named. Cluster v4 marks the local route as not verified.",
          "score": ""
        },
        "colleges": {
          "note": "RVCE. Named in cluster v4 as the academic route. No meeting is recorded.",
          "score": ""
        },
        "lenders": {
          "note": "No lending company is named. Product types listed in cluster v4: WC; upgrade; export.",
          "score": ""
        },
        "marketing": {
          "note": "No marketing company is named in cluster v4.",
          "score": ""
        },
        "export": {
          "note": "Cluster v4 label: Product checks. No local export value is published for this cohort.",
          "score": ""
        },
        "listing": {
          "note": "No listing candidate is named in cluster v4.",
          "score": ""
        },
        "size": {
          "note": "Turnover bands are not verified in cluster v4, so the nano, micro, small and medium mix is still open.",
          "score": ""
        },
        "state": {
          "note": "No state scheme, park, or nodal office is recorded for this belt in cluster v4.",
          "score": ""
        },
        "central": {
          "note": "Cluster v4 names the same horizontal routes for every belt: SIDBI, CGTMSE, MUDRA, LEAN, ZED and NSIC. It does not show MSMEs in this belt already inside a cluster-specific central scheme.",
          "score": ""
        },
        "other": {
          "note": "Cluster v4 position: Mapping / evidence first. Comparison-row observation: Credit +16%; DPD 1.4%. Do not add this count to an overlapping row.",
          "score": ""
        }
      }
    },
    {
      "id": "C-Hyderabad",
      "name": "Hyderabad — Chemicals",
      "place": "Telangana · Hyderabad; operating-site jurisdictions to verify · Hyderabad chemical supplier / plant-address mapping",
      "hsn": "Ch 28/29; 3208; 3402",
      "list": "Cluster v4",
      "cells": {
        "count": {
          "note": "Comparable current district–sector enterprise count not verified",
          "score": ""
        },
        "growth": {
          "note": "No published comparison of units, sales or exports for this belt. Comparison-row observation: Credit +1%; DPD 3.9%.",
          "score": ""
        },
        "partners": {
          "note": "No local delivery partner is named. Cluster v4 marks the local route as not verified.",
          "score": ""
        },
        "colleges": {
          "note": "Osmania University. Named in cluster v4 as the academic route. No meeting is recorded.",
          "score": ""
        },
        "lenders": {
          "note": "No lending company is named. Product types listed in cluster v4: WC; upgrade; export.",
          "score": ""
        },
        "marketing": {
          "note": "No marketing company is named in cluster v4.",
          "score": ""
        },
        "export": {
          "note": "Cluster v4 label: Product checks. No local export value is published for this cohort.",
          "score": ""
        },
        "listing": {
          "note": "No listing candidate is named in cluster v4.",
          "score": ""
        },
        "size": {
          "note": "Turnover bands are not verified in cluster v4, so the nano, micro, small and medium mix is still open.",
          "score": ""
        },
        "state": {
          "note": "No state scheme, park, or nodal office is recorded for this belt in cluster v4.",
          "score": ""
        },
        "central": {
          "note": "Cluster v4 names the same horizontal routes for every belt: SIDBI, CGTMSE, MUDRA, LEAN, ZED and NSIC. It does not show MSMEs in this belt already inside a cluster-specific central scheme.",
          "score": ""
        },
        "other": {
          "note": "Cluster v4 position: Mapping / evidence first. Comparison-row observation: Credit +1%; DPD 3.9%. Do not add this count to an overlapping row.",
          "score": ""
        }
      }
    },
    {
      "id": "C-Chennai",
      "name": "Chennai — Chemicals",
      "place": "Tamil Nadu · Chennai; Kancheepuram/Chengalpattu plant boundaries to check · Chennai chemical supplier and operating-site enquiry",
      "hsn": "Ch 28/29; 3208; 3402",
      "list": "Cluster v4",
      "cells": {
        "count": {
          "note": "Comparable current district–sector enterprise count not verified",
          "score": ""
        },
        "growth": {
          "note": "No published comparison of units, sales or exports for this belt. Comparison-row observation: Credit +7%; DPD 0.3%.",
          "score": ""
        },
        "partners": {
          "note": "No local delivery partner is named. Cluster v4 marks the local route as not verified.",
          "score": ""
        },
        "colleges": {
          "note": "Anna University. Named in cluster v4 as the academic route. No meeting is recorded.",
          "score": ""
        },
        "lenders": {
          "note": "No lending company is named. Product types listed in cluster v4: WC; upgrade; export.",
          "score": ""
        },
        "marketing": {
          "note": "No marketing company is named in cluster v4.",
          "score": ""
        },
        "export": {
          "note": "Cluster v4 label: Product checks. No local export value is published for this cohort.",
          "score": ""
        },
        "listing": {
          "note": "No listing candidate is named in cluster v4.",
          "score": ""
        },
        "size": {
          "note": "Turnover bands are not verified in cluster v4, so the nano, micro, small and medium mix is still open.",
          "score": ""
        },
        "state": {
          "note": "No state scheme, park, or nodal office is recorded for this belt in cluster v4.",
          "score": ""
        },
        "central": {
          "note": "Cluster v4 names the same horizontal routes for every belt: SIDBI, CGTMSE, MUDRA, LEAN, ZED and NSIC. It does not show MSMEs in this belt already inside a cluster-specific central scheme.",
          "score": ""
        },
        "other": {
          "note": "Cluster v4 position: Mapping / evidence first. Comparison-row observation: Credit +7%; DPD 0.3%. Do not add this count to an overlapping row.",
          "score": ""
        }
      }
    },
    {
      "id": "C-Nagpur",
      "name": "Nagpur — Chemicals",
      "place": "Maharashtra · Nagpur · Hingna / Butibori chemical-product enquiry",
      "hsn": "Ch 28/29; 3208; 3402",
      "list": "Cluster v4",
      "cells": {
        "count": {
          "note": "Comparable current district–sector enterprise count not verified",
          "score": ""
        },
        "growth": {
          "note": "No published comparison of units, sales or exports for this belt. Comparison-row observation: Credit +22%; DPD 0.5%.",
          "score": ""
        },
        "partners": {
          "note": "No local delivery partner is named. Cluster v4 marks the local route as not verified.",
          "score": ""
        },
        "colleges": {
          "note": "VNIT. Named in cluster v4 as the academic route. No meeting is recorded.",
          "score": ""
        },
        "lenders": {
          "note": "No lending company is named. Product types listed in cluster v4: WC; upgrade; export.",
          "score": ""
        },
        "marketing": {
          "note": "No marketing company is named in cluster v4.",
          "score": ""
        },
        "export": {
          "note": "Cluster v4 label: Product checks. No local export value is published for this cohort.",
          "score": ""
        },
        "listing": {
          "note": "No listing candidate is named in cluster v4.",
          "score": ""
        },
        "size": {
          "note": "Turnover bands are not verified in cluster v4, so the nano, micro, small and medium mix is still open.",
          "score": ""
        },
        "state": {
          "note": "No state scheme, park, or nodal office is recorded for this belt in cluster v4.",
          "score": ""
        },
        "central": {
          "note": "Cluster v4 names the same horizontal routes for every belt: SIDBI, CGTMSE, MUDRA, LEAN, ZED and NSIC. It does not show MSMEs in this belt already inside a cluster-specific central scheme.",
          "score": ""
        },
        "other": {
          "note": "Cluster v4 position: Mapping / evidence first. Comparison-row observation: Credit +22%; DPD 0.5%. Do not add this count to an overlapping row.",
          "score": ""
        }
      }
    },
    {
      "id": "C-Kanpur",
      "name": "Kanpur — Chemicals",
      "place": "Uttar Pradesh · Kanpur Nagar · Dada Nagar / Panki chemical-product enquiry",
      "hsn": "Ch 28/29; 3208; 3402",
      "list": "Cluster v4",
      "cells": {
        "count": {
          "note": "Comparable current district–sector enterprise count not verified",
          "score": ""
        },
        "growth": {
          "note": "No published comparison of units, sales or exports for this belt. Comparison-row observation: Credit +36%; DPD 1.1%.",
          "score": ""
        },
        "partners": {
          "note": "No local delivery partner is named. Cluster v4 marks the local route as not verified.",
          "score": ""
        },
        "colleges": {
          "note": "HBTU. Named in cluster v4 as the academic route. No meeting is recorded.",
          "score": ""
        },
        "lenders": {
          "note": "No lending company is named. Product types listed in cluster v4: WC; upgrade; export.",
          "score": ""
        },
        "marketing": {
          "note": "No marketing company is named in cluster v4.",
          "score": ""
        },
        "export": {
          "note": "Cluster v4 label: Product checks. No local export value is published for this cohort.",
          "score": ""
        },
        "listing": {
          "note": "No listing candidate is named in cluster v4.",
          "score": ""
        },
        "size": {
          "note": "Turnover bands are not verified in cluster v4, so the nano, micro, small and medium mix is still open.",
          "score": ""
        },
        "state": {
          "note": "No state scheme, park, or nodal office is recorded for this belt in cluster v4.",
          "score": ""
        },
        "central": {
          "note": "Cluster v4 names the same horizontal routes for every belt: SIDBI, CGTMSE, MUDRA, LEAN, ZED and NSIC. It does not show MSMEs in this belt already inside a cluster-specific central scheme.",
          "score": ""
        },
        "other": {
          "note": "Cluster v4 position: Mapping / evidence first. Comparison-row observation: Credit +36%; DPD 1.1%. Do not add this count to an overlapping row.",
          "score": ""
        }
      }
    },
    {
      "id": "C-Madurai",
      "name": "Madurai — Chemicals",
      "place": "Tamil Nadu · Madurai · Kappalur chemical-product enquiry",
      "hsn": "Ch 28/29; 3208; 3402",
      "list": "Cluster v4",
      "cells": {
        "count": {
          "note": "Comparable current district–sector enterprise count not verified",
          "score": ""
        },
        "growth": {
          "note": "No published comparison of units, sales or exports for this belt. Comparison-row observation: Credit +13%; DPD 0.3%.",
          "score": ""
        },
        "partners": {
          "note": "No local delivery partner is named. Cluster v4 marks the local route as not verified.",
          "score": ""
        },
        "colleges": {
          "note": "TCE Madurai. Named in cluster v4 as the academic route. No meeting is recorded.",
          "score": ""
        },
        "lenders": {
          "note": "No lending company is named. Product types listed in cluster v4: WC; upgrade; export.",
          "score": ""
        },
        "marketing": {
          "note": "No marketing company is named in cluster v4.",
          "score": ""
        },
        "export": {
          "note": "Cluster v4 label: Product checks. No local export value is published for this cohort.",
          "score": ""
        },
        "listing": {
          "note": "No listing candidate is named in cluster v4.",
          "score": ""
        },
        "size": {
          "note": "Turnover bands are not verified in cluster v4, so the nano, micro, small and medium mix is still open.",
          "score": ""
        },
        "state": {
          "note": "No state scheme, park, or nodal office is recorded for this belt in cluster v4.",
          "score": ""
        },
        "central": {
          "note": "Cluster v4 names the same horizontal routes for every belt: SIDBI, CGTMSE, MUDRA, LEAN, ZED and NSIC. It does not show MSMEs in this belt already inside a cluster-specific central scheme.",
          "score": ""
        },
        "other": {
          "note": "Cluster v4 position: Mapping / evidence first. Comparison-row observation: Credit +13%; DPD 0.3%. Do not add this count to an overlapping row.",
          "score": ""
        }
      }
    },
    {
      "id": "C-Belagavi",
      "name": "Belagavi — Chemicals",
      "place": "Karnataka · Belagavi · Belagavi operating-site mapping; Udyambag/Macche enquiry",
      "hsn": "Ch 28/29; 3208; 3402",
      "list": "Cluster v4",
      "cells": {
        "count": {
          "note": "Comparable current district–sector enterprise count not verified",
          "score": ""
        },
        "growth": {
          "note": "No published comparison of units, sales or exports for this belt. Comparison-row observation: Credit +12%; DPD 2.4%.",
          "score": ""
        },
        "partners": {
          "note": "No local delivery partner is named. Cluster v4 marks the local route as not verified.",
          "score": ""
        },
        "colleges": {
          "note": "VTU Belagavi. Named in cluster v4 as the academic route. No meeting is recorded.",
          "score": ""
        },
        "lenders": {
          "note": "No lending company is named. Product types listed in cluster v4: WC; upgrade; export.",
          "score": ""
        },
        "marketing": {
          "note": "No marketing company is named in cluster v4.",
          "score": ""
        },
        "export": {
          "note": "Cluster v4 label: Product checks. No local export value is published for this cohort.",
          "score": ""
        },
        "listing": {
          "note": "No listing candidate is named in cluster v4.",
          "score": ""
        },
        "size": {
          "note": "Turnover bands are not verified in cluster v4, so the nano, micro, small and medium mix is still open.",
          "score": ""
        },
        "state": {
          "note": "No state scheme, park, or nodal office is recorded for this belt in cluster v4.",
          "score": ""
        },
        "central": {
          "note": "Cluster v4 names the same horizontal routes for every belt: SIDBI, CGTMSE, MUDRA, LEAN, ZED and NSIC. It does not show MSMEs in this belt already inside a cluster-specific central scheme.",
          "score": ""
        },
        "other": {
          "note": "Cluster v4 position: Mapping / evidence first. Comparison-row observation: Credit +12%; DPD 2.4%. Do not add this count to an overlapping row.",
          "score": ""
        }
      }
    },
    {
      "id": "C-Kancheepuram",
      "name": "Kancheepuram — Chemicals",
      "place": "Tamil Nadu · Kancheepuram after district split · Sriperumbudur / Oragadam chemical-product enquiry",
      "hsn": "Ch 28/29; 3208; 3402",
      "list": "Cluster v4",
      "cells": {
        "count": {
          "note": "Comparable current district–sector enterprise count not verified",
          "score": ""
        },
        "growth": {
          "note": "No published comparison of units, sales or exports for this belt. Comparison-row observation: Credit +25%; DPD 0.4%.",
          "score": ""
        },
        "partners": {
          "note": "No local delivery partner is named. Cluster v4 marks the local route as not verified.",
          "score": ""
        },
        "colleges": {
          "note": "SCSVMV. Named in cluster v4 as the academic route. No meeting is recorded.",
          "score": ""
        },
        "lenders": {
          "note": "No lending company is named. Product types listed in cluster v4: WC; upgrade; export.",
          "score": ""
        },
        "marketing": {
          "note": "No marketing company is named in cluster v4.",
          "score": ""
        },
        "export": {
          "note": "Cluster v4 label: Product checks. No local export value is published for this cohort.",
          "score": ""
        },
        "listing": {
          "note": "No listing candidate is named in cluster v4.",
          "score": ""
        },
        "size": {
          "note": "Turnover bands are not verified in cluster v4, so the nano, micro, small and medium mix is still open.",
          "score": ""
        },
        "state": {
          "note": "No state scheme, park, or nodal office is recorded for this belt in cluster v4.",
          "score": ""
        },
        "central": {
          "note": "Cluster v4 names the same horizontal routes for every belt: SIDBI, CGTMSE, MUDRA, LEAN, ZED and NSIC. It does not show MSMEs in this belt already inside a cluster-specific central scheme.",
          "score": ""
        },
        "other": {
          "note": "Cluster v4 position: Mapping / evidence first. Comparison-row observation: Credit +25%; DPD 0.4%. Do not add this count to an overlapping row.",
          "score": ""
        }
      }
    },
    {
      "id": "medtech",
      "name": "Medical devices",
      "place": "AMTZ Vizag, or Greater Noida / Kanchipuram",
      "hsn": "",
      "list": "National type",
      "cells": {
        "count": {
          "note": "About 700 manufacturers (CII/IBEF). About 4,000 CDSCO licensed sites are a second count and are not added. The state split is not published.",
          "score": "3"
        },
        "growth": {
          "note": "FY25 exports USD 4.02 billion (EPCMD/DGCIS). A prior-year comparison for the MSME belt was not used, so the score is open.",
          "score": ""
        },
        "partners": {
          "note": "",
          "score": ""
        },
        "colleges": {
          "note": "",
          "score": ""
        },
        "lenders": {
          "note": "",
          "score": ""
        },
        "marketing": {
          "note": "",
          "score": ""
        },
        "export": {
          "note": "USD 4.02 billion in FY2024–25. How much of that is the MSME, rather than the larger device company, is not published.",
          "score": "4"
        },
        "listing": {
          "note": "",
          "score": ""
        },
        "size": {
          "note": "Reconstructed shape, not a census: micro about 36%, small about 40%. Max lot to enrol: small. The 28 PLI applicants are not the lot.",
          "score": "4"
        },
        "state": {
          "note": "AMTZ Visakhapatnam is a park. Other device parks are in Madhya Pradesh and Tamil Nadu.",
          "score": "4"
        },
        "central": {
          "note": "PLI MedTech (₹3,420 crore) is an incentive for approved applicants, not a loan to the MSME ring. The usable central door for a small unit is narrower than the PLI.",
          "score": "3"
        },
        "other": {
          "note": "",
          "score": ""
        }
      }
    },
    {
      "id": "semi",
      "name": "Semiconductor ancillaries",
      "place": "Sanand and Dholera, Gujarat",
      "hsn": "",
      "list": "National type",
      "cells": {
        "count": {
          "note": "10 approved plants in six states, and 23 design-linked applicants. Ancillary workshops are not a published census.",
          "score": "1"
        },
        "growth": {
          "note": "ISM committed capex is about ₹1.6 lakh crore. That is plant capex, not MSME sales.",
          "score": "2"
        },
        "partners": {
          "note": "",
          "score": ""
        },
        "colleges": {
          "note": "",
          "score": ""
        },
        "lenders": {
          "note": "",
          "score": ""
        },
        "marketing": {
          "note": "",
          "score": ""
        },
        "export": {
          "note": "No export figure for the ancillary ring. Do not borrow an electronics line.",
          "score": "1"
        },
        "listing": {
          "note": "",
          "score": ""
        },
        "size": {
          "note": "The published population is the plants. Max lot on the ground today is large. A micro tail is not counted.",
          "score": "2"
        },
        "state": {
          "note": "Gujarat is hosting plants at Sanand and Dholera. An MSME scheme for ancillaries was not found.",
          "score": "2"
        },
        "central": {
          "note": "ISM and the design-linked incentive fund the plant and the design applicant, not a vendor ring.",
          "score": "2"
        },
        "other": {
          "note": "",
          "score": ""
        }
      }
    },
    {
      "id": "toys",
      "name": "Toys",
      "place": "Koppal hub, NCR toy park, Channapatna",
      "hsn": "9503",
      "list": "National type",
      "cells": {
        "count": {
          "note": "DPIIT: 21,000+ Udyam MSMEs, across about 50 clusters. BIS licences are a second count. One belt is not 21,000.",
          "score": "3"
        },
        "growth": {
          "note": "QCO from 1 January 2021. HS 9503 exports were USD 169.46 million in FY25. A unit-growth rate was not used.",
          "score": ""
        },
        "partners": {
          "note": "",
          "score": ""
        },
        "colleges": {
          "note": "",
          "score": ""
        },
        "lenders": {
          "note": "",
          "score": ""
        },
        "marketing": {
          "note": "",
          "score": ""
        },
        "export": {
          "note": "HS 9503 USD 169.46 million in FY2024–25. Chapter 95 (USD 570.95 million) is a wider basket and is not this figure.",
          "score": "3"
        },
        "listing": {
          "note": "",
          "score": ""
        },
        "size": {
          "note": "Reconstructed shape: micro about 86%. Max lot to enrol: small. SFURTI clusters are the artisan end.",
          "score": "5"
        },
        "state": {
          "note": "Koppal hub and the Greater Noida toy park are the places named. Confirm which state office would house a desk.",
          "score": "3"
        },
        "central": {
          "note": "SFURTI in 19 clusters is grant infrastructure. The QCO is a licence wall, not a grant.",
          "score": "4"
        },
        "other": {
          "note": "",
          "score": ""
        }
      }
    },
    {
      "id": "footwear",
      "name": "Footwear",
      "place": "Ambur–Ranipet or Agra — split the row if you work both",
      "hsn": "",
      "list": "National type",
      "cells": {
        "count": {
          "note": "About 15,000 footwear units (CLE/IBEF). CLE's 2,868 members are not added. The split between Ambur–Ranipet and Agra is not published.",
          "score": "4"
        },
        "growth": {
          "note": "Sector exports ₹48,667 crore in FY25 are a level for a wider leather basket, not a growth rate for one belt.",
          "score": ""
        },
        "partners": {
          "note": "",
          "score": ""
        },
        "colleges": {
          "note": "",
          "score": ""
        },
        "lenders": {
          "note": "",
          "score": ""
        },
        "marketing": {
          "note": "",
          "score": ""
        },
        "export": {
          "note": "CLE/IBEF: leather, footwear and goods exports ₹48,667 crore in FY2024–25, on a sector turnover of about ₹1.62 lakh crore. The basket is wider than non-leather and sports footwear.",
          "score": "4"
        },
        "listing": {
          "note": "",
          "score": ""
        },
        "size": {
          "note": "Reconstructed shape of the 15,000: micro about 70%, small about 28%. Max lot to enrol: small.",
          "score": "5"
        },
        "state": {
          "note": "",
          "score": ""
        },
        "central": {
          "note": "BIS footwear quality orders from 2020–21, and credit-linked footwear files that stall at bank sanction. The scheme exists. The sanction is the failure.",
          "score": "4"
        },
        "other": {
          "note": "",
          "score": ""
        }
      }
    },
    {
      "id": "battery",
      "name": "ACC pack, BMS and recycling",
      "place": "Pune, NCR, and southern pack shops — not the cell plants",
      "hsn": "",
      "list": "National type",
      "cells": {
        "count": {
          "note": "A handful of PLI-ACC plants. Pack, BMS and recycling MSMEs are not in that list and are not counted.",
          "score": "2"
        },
        "growth": {
          "note": "The cell plants are the growth. Pack-MSME growth is not published.",
          "score": ""
        },
        "partners": {
          "note": "",
          "score": ""
        },
        "colleges": {
          "note": "",
          "score": ""
        },
        "lenders": {
          "note": "",
          "score": ""
        },
        "marketing": {
          "note": "",
          "score": ""
        },
        "export": {
          "note": "No ACC-pack export figure. Do not use HS 8507 (mostly lead-acid).",
          "score": "1"
        },
        "listing": {
          "note": "",
          "score": ""
        },
        "size": {
          "note": "Reconstructed sketch only: micro about 61%, small about 31%. Max lot to enrol: small. The plants are large and are not the lot.",
          "score": "4"
        },
        "state": {
          "note": "",
          "score": ""
        },
        "central": {
          "note": "PLI-ACC is the plant's incentive. It is not a scheme the pack MSME files.",
          "score": "2"
        },
        "other": {
          "note": "",
          "score": ""
        }
      }
    },
    {
      "id": "ewaste",
      "name": "E-waste",
      "place": "Seelampur (Delhi) and Moradabad",
      "hsn": "",
      "list": "National type",
      "cells": {
        "count": {
          "note": "CPCB lists authorised recyclers. Informal units in these two lanes are larger and uncounted. The two lists are not added.",
          "score": "2"
        },
        "growth": {
          "note": "E-Waste Management Rules, 2022, pushed brands into EPR. Unit growth in the lanes is not published.",
          "score": ""
        },
        "partners": {
          "note": "",
          "score": ""
        },
        "colleges": {
          "note": "",
          "score": ""
        },
        "lenders": {
          "note": "",
          "score": ""
        },
        "marketing": {
          "note": "",
          "score": ""
        },
        "export": {
          "note": "Domestic EPR and brand buy-back. No export figure for this lane.",
          "score": "1"
        },
        "listing": {
          "note": "",
          "score": ""
        },
        "size": {
          "note": "The lane is mostly micro and informal. Max lot to enrol, once formal: small. Authorised recyclers may be larger.",
          "score": "5"
        },
        "state": {
          "note": "",
          "score": ""
        },
        "central": {
          "note": "The 2022 rules create a compliance duty for the brand. They are not a grant for the dismantler.",
          "score": "2"
        },
        "other": {
          "note": "",
          "score": ""
        }
      }
    },
    {
      "id": "dc-ancillary",
      "name": "Data-centre ancillaries",
      "place": "Navi Mumbai, Chennai, Hyderabad, Noida, Bengaluru",
      "hsn": "",
      "list": "National type",
      "cells": {
        "count": {
          "note": "Public counts are of campuses, not of vendors. Vendor population is not published.",
          "score": "1"
        },
        "growth": {
          "note": "State data-centre policies from about 2020. Vendor-count growth is not published.",
          "score": ""
        },
        "partners": {
          "note": "",
          "score": ""
        },
        "colleges": {
          "note": "",
          "score": ""
        },
        "lenders": {
          "note": "",
          "score": ""
        },
        "marketing": {
          "note": "",
          "score": ""
        },
        "export": {
          "note": "Campus offtake is domestic.",
          "score": "1"
        },
        "listing": {
          "note": "",
          "score": ""
        },
        "size": {
          "note": "Not counted. The operator is large. The lot to enrol would be the vendor, and that list does not exist yet.",
          "score": "2"
        },
        "state": {
          "note": "Several states have data-centre policies. A vendor scheme was not found.",
          "score": "3"
        },
        "central": {
          "note": "No central scheme for the campus vendor was found.",
          "score": "1"
        },
        "other": {
          "note": "",
          "score": ""
        }
      }
    },
    {
      "id": "charging",
      "name": "EV charging",
      "place": "NCR, Pune, and Gujarat electrical belts",
      "hsn": "",
      "list": "National type",
      "cells": {
        "count": {
          "note": "Charger counts are assets, not firms. Electricians and small assemblers are not an official census.",
          "score": "2"
        },
        "growth": {
          "note": "PM E-DRIVE from 1 October 2024, outlay ₹10,900 crore. FAME-II charging was earlier. Firm growth is not published.",
          "score": ""
        },
        "partners": {
          "note": "",
          "score": ""
        },
        "colleges": {
          "note": "",
          "score": ""
        },
        "lenders": {
          "note": "",
          "score": ""
        },
        "marketing": {
          "note": "",
          "score": ""
        },
        "export": {
          "note": "Deployment is domestic.",
          "score": "1"
        },
        "listing": {
          "note": "",
          "score": ""
        },
        "size": {
          "note": "Reconstructed sketch: micro about 68%. Max lot to enrol: the small assembler, not the charge-point operator.",
          "score": "4"
        },
        "state": {
          "note": "",
          "score": ""
        },
        "central": {
          "note": "PM E-DRIVE and FAME-II subsidise charging assets through programme agencies. They are not a loan to the electrician.",
          "score": "3"
        },
        "other": {
          "note": "",
          "score": ""
        }
      }
    },
    {
      "id": "techtex",
      "name": "Technical textiles",
      "place": "Surat, Panipat, or Coimbatore",
      "hsn": "",
      "list": "National type",
      "cells": {
        "count": {
          "note": "24 GREAT startups and 30 PLI companies are scheme lists. The mill and converter population is not that list.",
          "score": "2"
        },
        "growth": {
          "note": "Technical-textile exports ₹21,407.36 crore in FY24 to ₹24,732.68 crore in FY25 (Ministry of Textiles).",
          "score": "4"
        },
        "partners": {
          "note": "",
          "score": ""
        },
        "colleges": {
          "note": "",
          "score": ""
        },
        "lenders": {
          "note": "",
          "score": ""
        },
        "marketing": {
          "note": "",
          "score": ""
        },
        "export": {
          "note": "₹24,732.68 crore in FY2024–25. This is not RMG and not the whole man-made-fibre basket.",
          "score": "4"
        },
        "listing": {
          "note": "",
          "score": ""
        },
        "size": {
          "note": "Reconstructed sketch: micro about 62%, small about 30%. Max lot to enrol: the converter, small. PLI companies are not the lot.",
          "score": "4"
        },
        "state": {
          "note": "",
          "score": ""
        },
        "central": {
          "note": "NTTM (₹1,480 crore) and GREAT are grants. PLI Textiles is for companies that clear an investment threshold.",
          "score": "3"
        },
        "other": {
          "note": "",
          "score": ""
        }
      }
    },
    {
      "id": "space",
      "name": "Space components",
      "place": "Bengaluru and Hyderabad",
      "hsn": "",
      "list": "National type",
      "cells": {
        "count": {
          "note": "Private launch and satellite firms are a short list. Component MSMEs are not published. Do not use HS 8802 (aircraft).",
          "score": "1"
        },
        "growth": {
          "note": "IN-SPACe dates from 2020. An MSME order book was not found.",
          "score": "2"
        },
        "partners": {
          "note": "",
          "score": ""
        },
        "colleges": {
          "note": "",
          "score": ""
        },
        "lenders": {
          "note": "",
          "score": ""
        },
        "marketing": {
          "note": "",
          "score": ""
        },
        "export": {
          "note": "No export figure for this component ring.",
          "score": "1"
        },
        "listing": {
          "note": "",
          "score": ""
        },
        "size": {
          "note": "The published names are the primes. Max lot today is the prime, not a machine shop.",
          "score": "2"
        },
        "state": {
          "note": "",
          "score": ""
        },
        "central": {
          "note": "IN-SPACe authorisation is a gate for the prime, not a scheme for the shop.",
          "score": "2"
        },
        "other": {
          "note": "",
          "score": ""
        }
      }
    },
    {
      "id": "ghydrogen",
      "name": "Green hydrogen ancillaries",
      "place": "No MSME belt — plants only",
      "hsn": "",
      "list": "National type",
      "cells": {
        "count": {
          "note": "Mission awards are to large sponsors. An ancillary census was not found.",
          "score": "1"
        },
        "growth": {
          "note": "National Green Hydrogen Mission, 2023, funds plants. MSME revenue growth was not found.",
          "score": "2"
        },
        "partners": {
          "note": "",
          "score": ""
        },
        "colleges": {
          "note": "",
          "score": ""
        },
        "lenders": {
          "note": "",
          "score": ""
        },
        "marketing": {
          "note": "",
          "score": ""
        },
        "export": {
          "note": "No MSME export figure.",
          "score": "1"
        },
        "listing": {
          "note": "",
          "score": ""
        },
        "size": {
          "note": "The sponsored plant is large. There is no counted micro lot.",
          "score": "1"
        },
        "state": {
          "note": "",
          "score": ""
        },
        "central": {
          "note": "The mission incentive is for the sponsor.",
          "score": "1"
        },
        "other": {
          "note": "",
          "score": ""
        }
      }
    },
    {
      "id": "ethanol",
      "name": "Ethanol and feedstock",
      "place": "One belt in UP, Maharashtra, Karnataka, or Bihar",
      "hsn": "",
      "list": "National type",
      "cells": {
        "count": {
          "note": "Distilleries are a few hundred large units. FPO and collection points are a different population and are not a belt census.",
          "score": "2"
        },
        "growth": {
          "note": "The 20% blend target drove capacity after about 2021. Collection-unit growth is not a census.",
          "score": ""
        },
        "partners": {
          "note": "",
          "score": ""
        },
        "colleges": {
          "note": "",
          "score": ""
        },
        "lenders": {
          "note": "",
          "score": ""
        },
        "marketing": {
          "note": "",
          "score": ""
        },
        "export": {
          "note": "The offtake is domestic blending. Do not use HS 2207.",
          "score": "1"
        },
        "listing": {
          "note": "",
          "score": ""
        },
        "size": {
          "note": "Plants are large. The lot to enrol is the FPO or collection unit, which is micro. The two must not be scored as one lot.",
          "score": "3"
        },
        "state": {
          "note": "",
          "score": ""
        },
        "central": {
          "note": "The blending programme is the offtake. NABARD and FPO credit are the micro channel. It is not one MSME scheme.",
          "score": "3"
        },
        "other": {
          "note": "",
          "score": ""
        }
      }
    },
    {
      "id": "nutra",
      "name": "Nutraceuticals and AYUSH",
      "place": "Baddi, Uttarakhand, or Gujarat",
      "hsn": "",
      "list": "National type",
      "cells": {
        "count": {
          "note": "No single official count combines AYUSH and nutraceutical licences. None is stated.",
          "score": "2"
        },
        "growth": {
          "note": "Pharmexcil, 14 June 2025: AYUSH and herbals USD 688.89 million. A growth rate was not used.",
          "score": ""
        },
        "partners": {
          "note": "",
          "score": ""
        },
        "colleges": {
          "note": "",
          "score": ""
        },
        "lenders": {
          "note": "",
          "score": ""
        },
        "marketing": {
          "note": "",
          "score": ""
        },
        "export": {
          "note": "AYUSH and herbals USD 688.89 million. Drugs and pharmaceuticals USD 30.47 billion are a different basket.",
          "score": "3"
        },
        "listing": {
          "note": "",
          "score": ""
        },
        "size": {
          "note": "Reconstructed sketch: micro about 59%, small about 32%. Max lot to enrol: small. Do not enrol the brand that holds the PE round.",
          "score": "4"
        },
        "state": {
          "note": "",
          "score": ""
        },
        "central": {
          "note": "FSSAI and AYUSH licences are gates. A PLI food health window fits only some firms.",
          "score": "3"
        },
        "other": {
          "note": "",
          "score": ""
        }
      }
    },
    {
      "id": "agritech",
      "name": "Agri-tech and farm machinery",
      "place": "One custom-hiring belt — name it before scoring the place",
      "hsn": "",
      "list": "National type",
      "cells": {
        "count": {
          "note": "No belt census. Startup certificates and machinery factories are different lists.",
          "score": "2"
        },
        "growth": {
          "note": "State mechanisation missions are the demand. A unit-growth figure was not used.",
          "score": ""
        },
        "partners": {
          "note": "",
          "score": ""
        },
        "colleges": {
          "note": "",
          "score": ""
        },
        "lenders": {
          "note": "",
          "score": ""
        },
        "marketing": {
          "note": "",
          "score": ""
        },
        "export": {
          "note": "Do not use farm-machinery HS 8432 or 8433 as this cohort's export.",
          "score": "1"
        },
        "listing": {
          "note": "",
          "score": ""
        },
        "size": {
          "note": "The fabricator and the custom-hiring unit are the lot, usually micro or small. The tractor OEM is not.",
          "score": "3"
        },
        "state": {
          "note": "",
          "score": ""
        },
        "central": {
          "note": "AgriSURE is equity or blended capital, not a loan to the fabricator. No dedicated MSME line was confirmed.",
          "score": "2"
        },
        "other": {
          "note": "",
          "score": ""
        }
      }
    },
    {
      "id": "avgc",
      "name": "AVGC-XR",
      "place": "No single belt — studios are scattered",
      "hsn": "",
      "list": "National type",
      "cells": {
        "count": {
          "note": "No place-level census of studios. Freelancers are people, not enterprises.",
          "score": "1"
        },
        "growth": {
          "note": "",
          "score": ""
        },
        "partners": {
          "note": "",
          "score": ""
        },
        "colleges": {
          "note": "",
          "score": ""
        },
        "lenders": {
          "note": "",
          "score": ""
        },
        "marketing": {
          "note": "",
          "score": ""
        },
        "export": {
          "note": "No cohort export inside the services account of USD 383.51 billion.",
          "score": "1"
        },
        "listing": {
          "note": "",
          "score": ""
        },
        "size": {
          "note": "A studio that bills is often micro. There is no belt, so the mix is not a cluster shape.",
          "score": "3"
        },
        "state": {
          "note": "",
          "score": ""
        },
        "central": {
          "note": "The AVGC task force (2022) is a policy. A scheme a small studio can file was not confirmed.",
          "score": "2"
        },
        "other": {
          "note": "",
          "score": ""
        }
      }
    },
    {
      "id": "geospatial",
      "name": "Geospatial and drone services",
      "place": "Scattered service firms — do not merge with drone manufacturing",
      "hsn": "",
      "list": "National type",
      "cells": {
        "count": {
          "note": "16,000 remote-pilot certificates are people, not firms. Firm census is not published.",
          "score": "1"
        },
        "growth": {
          "note": "",
          "score": ""
        },
        "partners": {
          "note": "",
          "score": ""
        },
        "colleges": {
          "note": "",
          "score": ""
        },
        "lenders": {
          "note": "",
          "score": ""
        },
        "marketing": {
          "note": "",
          "score": ""
        },
        "export": {
          "note": "Services. No HSN and no cohort export.",
          "score": "1"
        },
        "listing": {
          "note": "",
          "score": ""
        },
        "size": {
          "note": "Service firms, mostly micro, if they are firms at all. Max lot: small.",
          "score": "3"
        },
        "state": {
          "note": "",
          "score": ""
        },
        "central": {
          "note": "Geospatial guidelines, 2021, are a liberalisation, not a scheme.",
          "score": "2"
        },
        "other": {
          "note": "",
          "score": ""
        }
      }
    },
    {
      "id": "cyber",
      "name": "Cybersecurity services",
      "place": "No factory belt",
      "hsn": "",
      "list": "National type",
      "cells": {
        "count": {
          "note": "No cluster count. These are firms you might invite in, not a place.",
          "score": "1"
        },
        "growth": {
          "note": "",
          "score": ""
        },
        "partners": {
          "note": "",
          "score": ""
        },
        "colleges": {
          "note": "",
          "score": ""
        },
        "lenders": {
          "note": "",
          "score": ""
        },
        "marketing": {
          "note": "",
          "score": ""
        },
        "export": {
          "note": "No cohort figure inside services exports.",
          "score": "1"
        },
        "listing": {
          "note": "",
          "score": ""
        },
        "size": {
          "note": "Not a manufacturing lot. Max lot is a small services firm.",
          "score": "2"
        },
        "state": {
          "note": "",
          "score": ""
        },
        "central": {
          "note": "CERT-In directions are a compliance duty, not a cluster scheme.",
          "score": "1"
        },
        "other": {
          "note": "",
          "score": ""
        }
      }
    },
    {
      "id": "specialty-steel",
      "name": "Specialty steel conversion",
      "place": "Rerollers — not the melt shop",
      "hsn": "",
      "list": "National type",
      "cells": {
        "count": {
          "note": "PLI beneficiaries are the melt and processing companies. An MSME reroller census was not found.",
          "score": "1"
        },
        "growth": {
          "note": "",
          "score": ""
        },
        "partners": {
          "note": "",
          "score": ""
        },
        "colleges": {
          "note": "",
          "score": ""
        },
        "lenders": {
          "note": "",
          "score": ""
        },
        "marketing": {
          "note": "",
          "score": ""
        },
        "export": {
          "note": "Engineering goods USD 116.67 billion are too wide. No specialty-reroller export was used.",
          "score": "1"
        },
        "listing": {
          "note": "",
          "score": ""
        },
        "size": {
          "note": "The PLI plant is large. Max lot, if any MSME is enrolled, would be the reroller. That list is not counted.",
          "score": "2"
        },
        "state": {
          "note": "",
          "score": ""
        },
        "central": {
          "note": "PLI Specialty Steel is the plant's scheme.",
          "score": "2"
        },
        "other": {
          "note": "",
          "score": ""
        }
      }
    },
    {
      "id": "api",
      "name": "Bulk drugs and APIs",
      "place": "Around one park — name the park",
      "hsn": "",
      "list": "National type",
      "cells": {
        "count": {
          "note": "PLI Bulk Drugs applicants and park plots. Intermediate MSMEs around the park are not a published census.",
          "score": "1"
        },
        "growth": {
          "note": "Pharmexcil, 14 June 2025: bulk drugs USD 4.87 billion. That is the plant line.",
          "score": ""
        },
        "partners": {
          "note": "",
          "score": ""
        },
        "colleges": {
          "note": "",
          "score": ""
        },
        "lenders": {
          "note": "",
          "score": ""
        },
        "marketing": {
          "note": "",
          "score": ""
        },
        "export": {
          "note": "Bulk drugs USD 4.87 billion. That export sits with the plants, not a counted MSME ring.",
          "score": "2"
        },
        "listing": {
          "note": "",
          "score": ""
        },
        "size": {
          "note": "The plot and the PLI sit with the plant. Max lot on the scheme list is large.",
          "score": "2"
        },
        "state": {
          "note": "",
          "score": ""
        },
        "central": {
          "note": "PLI Bulk Drugs (2020) is the plant's incentive.",
          "score": "2"
        },
        "other": {
          "note": "",
          "score": ""
        }
      }
    },
    {
      "id": "electronics",
      "name": "Electronics suppliers",
      "place": "Noida–Greater Noida or Sriperumbudur",
      "hsn": "",
      "list": "National type",
      "cells": {
        "count": {
          "note": "32 PLI companies and 300+ mobile units (MeitY). Neither count is the MSME tool room.",
          "score": "2"
        },
        "growth": {
          "note": "FY25 electronics goods USD 38.58 billion. Production ₹11.32 lakh crore and exports about ₹3.26 lakh crore. The ring's own growth is not separated.",
          "score": ""
        },
        "partners": {
          "note": "",
          "score": ""
        },
        "colleges": {
          "note": "",
          "score": ""
        },
        "lenders": {
          "note": "",
          "score": ""
        },
        "marketing": {
          "note": "",
          "score": ""
        },
        "export": {
          "note": "The USD 38.58 billion is mostly the large assembler, including smartphones. The supplier's export is not published.",
          "score": "2"
        },
        "listing": {
          "note": "",
          "score": ""
        },
        "size": {
          "note": "The 32 PLI companies are large and are not the lot. The uncounted supplier is the lot. Max lot to enrol: small.",
          "score": "3"
        },
        "state": {
          "note": "",
          "score": ""
        },
        "central": {
          "note": "PLI LSEM is not open to the tool room. Pointing a moulder at it is the wrong window.",
          "score": "2"
        },
        "other": {
          "note": "",
          "score": ""
        }
      }
    },
    {
      "id": "ev",
      "name": "EV and auto components",
      "place": "Pune–Chakan or Hosur–Krishnagiri",
      "hsn": "",
      "list": "National type",
      "cells": {
        "count": {
          "note": "82 PLI Auto applicants and 278 units as on 30 November 2025. ACMA's membership is the wider component industry, not an EV census.",
          "score": "2"
        },
        "growth": {
          "note": "PLI Auto determined sales ₹32,879 crore to 30 September 2025. That is the applicant, not the MSME supplier.",
          "score": ""
        },
        "partners": {
          "note": "",
          "score": ""
        },
        "colleges": {
          "note": "",
          "score": ""
        },
        "lenders": {
          "note": "",
          "score": ""
        },
        "marketing": {
          "note": "",
          "score": ""
        },
        "export": {
          "note": "No EV-only export. ACMA's component exports include conventional parts and are not used.",
          "score": "1"
        },
        "listing": {
          "note": "",
          "score": ""
        },
        "size": {
          "note": "The OEM and the PLI unit are large. Max lot to enrol: the small supplier. The pack ring is a different row.",
          "score": "3"
        },
        "state": {
          "note": "",
          "score": ""
        },
        "central": {
          "note": "PLI Auto and PM E-DRIVE are not loans to the supplier.",
          "score": "2"
        },
        "other": {
          "note": "",
          "score": ""
        }
      }
    },
    {
      "id": "solar",
      "name": "Solar modules and BOS",
      "place": "Gujarat fabrication, not the Rajasthan project site",
      "hsn": "",
      "list": "National type",
      "cells": {
        "count": {
          "note": "ALMM: 100 manufacturers and 123 units, up from 21 manufacturers in 2021. Installers and BOS MSMEs are not added.",
          "score": "2"
        },
        "growth": {
          "note": "ALMM manufacturers from 21 in 2021 to 100. That is the module list, not BOS MSMEs.",
          "score": "3"
        },
        "partners": {
          "note": "",
          "score": ""
        },
        "colleges": {
          "note": "",
          "score": ""
        },
        "lenders": {
          "note": "",
          "score": ""
        },
        "marketing": {
          "note": "",
          "score": ""
        },
        "export": {
          "note": "A clean module-export line was not used. ALMM capacity is not exports.",
          "score": "2"
        },
        "listing": {
          "note": "",
          "score": ""
        },
        "size": {
          "note": "The ALMM name is often a mid-size or large manufacturer. The installer is a different, smaller lot. Do not score them as one.",
          "score": "3"
        },
        "state": {
          "note": "",
          "score": ""
        },
        "central": {
          "note": "ALMM and PLI are the manufacturer's gate and incentive. IREDA finances projects and plants.",
          "score": "3"
        },
        "other": {
          "note": "",
          "score": ""
        }
      }
    },
    {
      "id": "it",
      "name": "IT services and GCCs",
      "place": "Bengaluru, Hyderabad, Pune, NCR, Chennai — no factory belt",
      "hsn": "",
      "list": "National type",
      "cells": {
        "count": {
          "note": "NASSCOM lists, park tenants, and GCC announcements are three different counts. None is an MSME census.",
          "score": "2"
        },
        "growth": {
          "note": "",
          "score": ""
        },
        "partners": {
          "note": "",
          "score": ""
        },
        "colleges": {
          "note": "",
          "score": ""
        },
        "lenders": {
          "note": "",
          "score": ""
        },
        "marketing": {
          "note": "",
          "score": ""
        },
        "export": {
          "note": "Services exports USD 383.51 billion in FY25. IT is a large part of that account and is not a cluster figure.",
          "score": "2"
        },
        "listing": {
          "note": "",
          "score": ""
        },
        "size": {
          "note": "The GCC is large and is not the lot. A campus vendor would be small. That vendor list was not counted.",
          "score": "2"
        },
        "state": {
          "note": "",
          "score": ""
        },
        "central": {
          "note": "No central scheme for an MSME cluster here.",
          "score": "1"
        },
        "other": {
          "note": "",
          "score": ""
        }
      }
    },
    {
      "id": "healthtech",
      "name": "Healthtech",
      "place": "No factory belt — do not site this at AMTZ",
      "hsn": "",
      "list": "National type",
      "cells": {
        "count": {
          "note": "Certificates and empanelled care units are different lists. They are not the 700 device manufacturers.",
          "score": "1"
        },
        "growth": {
          "note": "",
          "score": ""
        },
        "partners": {
          "note": "",
          "score": ""
        },
        "colleges": {
          "note": "",
          "score": ""
        },
        "lenders": {
          "note": "",
          "score": ""
        },
        "marketing": {
          "note": "",
          "score": ""
        },
        "export": {
          "note": "No export figure. Do not reuse medtech USD 4.02 billion.",
          "score": "1"
        },
        "listing": {
          "note": "",
          "score": ""
        },
        "size": {
          "note": "A small diagnostic unit can be micro. A hospital chain is not the lot.",
          "score": "3"
        },
        "state": {
          "note": "",
          "score": ""
        },
        "central": {
          "note": "Telemedicine guidelines (2020) are a practice rule, not a scheme for a care-unit cluster.",
          "score": "2"
        },
        "other": {
          "note": "",
          "score": ""
        }
      }
    },
    {
      "id": "edtech",
      "name": "Edtech and skilling",
      "place": "No belt",
      "hsn": "",
      "list": "National type",
      "cells": {
        "count": {
          "note": "DPIIT certificates and NSDC training partners are different lists. They are not a place.",
          "score": "1"
        },
        "growth": {
          "note": "",
          "score": ""
        },
        "partners": {
          "note": "",
          "score": ""
        },
        "colleges": {
          "note": "",
          "score": ""
        },
        "lenders": {
          "note": "",
          "score": ""
        },
        "marketing": {
          "note": "",
          "score": ""
        },
        "export": {
          "note": "Not separable inside services exports.",
          "score": "1"
        },
        "listing": {
          "note": "",
          "score": ""
        },
        "size": {
          "note": "Training partners are mostly small. They are a delivery route, not a lot to enrol as the cluster.",
          "score": "2"
        },
        "state": {
          "note": "",
          "score": ""
        },
        "central": {
          "note": "Skill and apprenticeship contracts pay the partner. They are not a cluster scheme.",
          "score": "2"
        },
        "other": {
          "note": "",
          "score": ""
        }
      }
    },
    {
      "id": "logistics",
      "name": "E-commerce logistics",
      "place": "Bhiwandi, Bilaspur–Gurugram, or Hoskote",
      "hsn": "",
      "list": "National type",
      "cells": {
        "count": {
          "note": "Warehouse counts, transporter registrations, and fleet owners are three units. They are not added. No firm census.",
          "score": "2"
        },
        "growth": {
          "note": "The belts grew with e-way bill and online retail from about 2017. A firm-count growth rate is not published.",
          "score": ""
        },
        "partners": {
          "note": "",
          "score": ""
        },
        "colleges": {
          "note": "",
          "score": ""
        },
        "lenders": {
          "note": "",
          "score": ""
        },
        "marketing": {
          "note": "",
          "score": ""
        },
        "export": {
          "note": "Domestic. Do not use merchandise export totals.",
          "score": "1"
        },
        "listing": {
          "note": "",
          "score": ""
        },
        "size": {
          "note": "The fleet owner is micro. Max lot to enrol: small. The 3PL is not the lot.",
          "score": "5"
        },
        "state": {
          "note": "",
          "score": ""
        },
        "central": {
          "note": "No cluster scheme. Vehicle finance is a lender product, which belongs in the lender column once a company is named.",
          "score": "1"
        },
        "other": {
          "note": "",
          "score": ""
        }
      }
    },
    {
      "id": "fintech",
      "name": "Fintech and BC networks",
      "place": "No factory belt",
      "hsn": "",
      "list": "National type",
      "cells": {
        "count": {
          "note": "Regulated fintechs and BC networks are different lists. Agent headcount is people, not enterprises.",
          "score": "2"
        },
        "growth": {
          "note": "",
          "score": ""
        },
        "partners": {
          "note": "",
          "score": ""
        },
        "colleges": {
          "note": "",
          "score": ""
        },
        "lenders": {
          "note": "",
          "score": ""
        },
        "marketing": {
          "note": "",
          "score": ""
        },
        "export": {
          "note": "Not merchandise trade.",
          "score": "1"
        },
        "listing": {
          "note": "",
          "score": ""
        },
        "size": {
          "note": "These firms lend or distribute credit. They are not the borrowing lot.",
          "score": "1"
        },
        "state": {
          "note": "",
          "score": ""
        },
        "central": {
          "note": "Account Aggregator (2021) is infrastructure. It is not a scheme for a borrower cluster.",
          "score": "1"
        },
        "other": {
          "note": "",
          "score": ""
        }
      }
    },
    {
      "id": "drones",
      "name": "Drones",
      "place": "Split across many cities — no single belt",
      "hsn": "",
      "list": "National type",
      "cells": {
        "count": {
          "note": "PLI list, 6 July 2022: 23 firms. PIB, 26 July 2024: 48 companies with type-certified models. The lists are small and scattered.",
          "score": "2"
        },
        "growth": {
          "note": "The PLI window has closed. Sales on the early list were ₹319 crore in FY22, unaudited, for the beneficiaries.",
          "score": "2"
        },
        "partners": {
          "note": "",
          "score": ""
        },
        "colleges": {
          "note": "",
          "score": ""
        },
        "lenders": {
          "note": "",
          "score": ""
        },
        "marketing": {
          "note": "",
          "score": ""
        },
        "export": {
          "note": "No export line. The last official sales figure is the PLI list's own turnover.",
          "score": "1"
        },
        "listing": {
          "note": "",
          "score": ""
        },
        "size": {
          "note": "A few dozen manufacturers. Max lot: the type-certified firm, often small. Not a micro mass in one lane.",
          "score": "3"
        },
        "state": {
          "note": "",
          "score": ""
        },
        "central": {
          "note": "Drone PLI (outlay ₹120 crore) has closed. About ₹98 crore was the disbursement figure used in the desk pass.",
          "score": "2"
        },
        "other": {
          "note": "",
          "score": ""
        }
      }
    },
    {
      "id": "defence",
      "name": "Defence suppliers",
      "place": "Bengaluru, Hyderabad, Pune, or the TN / UP corridors",
      "hsn": "",
      "list": "National type",
      "cells": {
        "count": {
          "note": "About 16,000 MSMEs is an ecosystem description. 788 licences to 462 companies, and iDEX's 619 startups, are different counts. They are not added. Density inside one corridor is not published.",
          "score": "3"
        },
        "growth": {
          "note": "FY25 exporter count was up 17.4%. The headcount was not published. Exports were ₹23,622 crore.",
          "score": "3"
        },
        "partners": {
          "note": "",
          "score": ""
        },
        "colleges": {
          "note": "",
          "score": ""
        },
        "lenders": {
          "note": "",
          "score": ""
        },
        "marketing": {
          "note": "",
          "score": ""
        },
        "export": {
          "note": "₹23,622 crore in FY2024–25. Private sector ₹15,233 crore, DPSUs ₹8,389 crore. The MSME share of that export is not published.",
          "score": "3"
        },
        "listing": {
          "note": "",
          "score": ""
        },
        "size": {
          "note": "The description is mostly small firms, but the vendor who holds a milestone bill is often small or medium. Max lot to enrol: medium. Do not enrol the DPSU.",
          "score": "3"
        },
        "state": {
          "note": "Tamil Nadu and Uttar Pradesh defence corridors, plus the older Bengaluru, Hyderabad, and Pune industry. Which office would house a desk is not settled.",
          "score": "3"
        },
        "central": {
          "note": "iDEX grants (startups and MSMEs; 430 contracts by February 2025) are not the scheme for all 16,000. Export authorisation is a gate.",
          "score": "3"
        },
        "other": {
          "note": "",
          "score": ""
        }
      }
    },
    {
      "id": "appliances",
      "name": "White goods and furniture",
      "place": "Noida–Hapur annex",
      "hsn": "",
      "list": "National type",
      "cells": {
        "count": {
          "note": "The annex is about 4,500 MSMEs. The 84 PLI White Goods companies are not added to that.",
          "score": "4"
        },
        "growth": {
          "note": "A growth rate for the 4,500 was not found. PLI intended investment is ₹10,478 crore for the 84 companies.",
          "score": ""
        },
        "partners": {
          "note": "",
          "score": ""
        },
        "colleges": {
          "note": "",
          "score": ""
        },
        "lenders": {
          "note": "",
          "score": ""
        },
        "marketing": {
          "note": "",
          "score": ""
        },
        "export": {
          "note": "No export figure for the annex. Engineering goods USD 116.67 billion are too wide.",
          "score": "2"
        },
        "listing": {
          "note": "",
          "score": ""
        },
        "size": {
          "note": "Reconstructed shape of the annex: micro about 65%, small about 31%. Max lot to enrol: small.",
          "score": "5"
        },
        "state": {
          "note": "The Noida–Hapur annex is the place. Confirm the state nodal office before treating this as a 5.",
          "score": "4"
        },
        "central": {
          "note": "PLI White Goods is the 84 companies' incentive, not the annex MSME's scheme.",
          "score": "2"
        },
        "other": {
          "note": "",
          "score": ""
        }
      }
    },
    {
      "id": "food",
      "name": "Food processing",
      "place": "The food-demo belt — name the district, not all 726 ODOP districts",
      "hsn": "",
      "list": "National type",
      "cells": {
        "count": {
          "note": "PMFME, 31 December 2025: 1,72,707 micro enterprises approved and 59,202 formalised, nationally. ASI factories are a third count. The demo belt's own count is not the national number.",
          "score": "3"
        },
        "growth": {
          "note": "The approval-to-formalisation gap is still open: 1,72,707 approved against 59,202 formalised.",
          "score": "4"
        },
        "partners": {
          "note": "",
          "score": ""
        },
        "colleges": {
          "note": "",
          "score": ""
        },
        "lenders": {
          "note": "",
          "score": ""
        },
        "marketing": {
          "note": "",
          "score": ""
        },
        "export": {
          "note": "MoFPI: processed-food exports USD 10.88 billion in FY2023–24. A single FY25 level was not used. MSME share is not published.",
          "score": "3"
        },
        "listing": {
          "note": "",
          "score": ""
        },
        "size": {
          "note": "The PMFME unit is micro. Max lot to enrol: small, once it invoices a buyer. PLI food companies are not the lot.",
          "score": "5"
        },
        "state": {
          "note": "State nodal agencies already run PMFME. The centre would sit beside that agency, not replace it.",
          "score": "4"
        },
        "central": {
          "note": "PMFME is open and credit-linked. As on 30 June 2025, 1,44,517 loans sanctioned, ₹11,501.79 crore. PLI food is a different, larger-firm scheme.",
          "score": "5"
        },
        "other": {
          "note": "",
          "score": ""
        }
      }
    }
  ]
};

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
  const [book, setBook] = useCanvasState<Book>("cluster-fill-book-v4", SEED);
  const [view, setView] = useState<"rank" | "fill" | "weights" | "anchors">("rank");
  const [listFilter, setListFilter] = useState("Cluster v4");
  const [selectedId, setSelectedId] = useState(SEED.clusters[0].id);
  const [addedName, setAddedName] = useState("");
  const [addedPlace, setAddedPlace] = useState("");
  const theme = useHostTheme();

  const selected = book.clusters.find((cluster) => cluster.id === selectedId) ?? book.clusters[0];
  const inList = (cluster: Cluster) => listFilter === "All" || cluster.list === listFilter;
  const current = running(selected, book);
  const ranked = useMemo(() => {
    return book.clusters
      .map((cluster, index) => ({ cluster, index, ...running(cluster, book) }))
      .filter((row) => row.cluster.name.trim() !== "" && inList(row.cluster))
      .sort((a, b) => a.index - b.index);
  }, [book, listFilter]);
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
    setBook((prev) => ({ ...prev, clusters: [...prev.clusters, { id, name, place, hsn: "", list: "Added", cells }] }));
    setListFilter("Added");
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
          54 local clusters from cluster v4, 30 October 2026, then the national types. Type the fact, then pick 1 to 5. The mark moves as soon as a score is entered. A blank factor is dropped. It is not a zero. The HSN heading does not enter the mark.
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
        {selected.list}. {selected.place}. HSN {selected.hsn || "—"}. {current.filled >= 8
          ? `Tier: ${current.tier}. Eight or more factors are filled, so this cluster can be compared.`
          : `Running score only. Still blank: ${current.missing.join(", ")}.`}
      </Callout>

      <Row gap={8} wrap>
        <Pill active={view === "fill"} onClick={() => setView("fill")}>Fill this cluster</Pill>
        <Pill active={view === "rank"} onClick={() => setView("rank")}>All clusters</Pill>
        <Pill active={view === "weights"} onClick={() => setView("weights")}>Weights</Pill>
        <Pill active={view === "anchors"} onClick={() => setView("anchors")}>What 1 and 5 mean</Pill>
      </Row>
      <Row gap={8} wrap>
        {["Cluster v4", "National type", "Added", "All"].map((name) => (
          <Pill key={name} active={listFilter === name} onClick={() => {
            setListFilter(name);
            const next = book.clusters.find((cluster) => cluster.name.trim() !== "" && (name === "All" || cluster.list === name));
            if (next) setSelectedId(next.id);
          }}>{name}</Pill>
        ))}
      </Row>

      {view === "fill" && (
        <Stack gap={12}>
          <Select
            value={selected.id}
            onChange={setSelectedId}
            options={book.clusters.filter((cluster) => cluster.name.trim() !== "" && inList(cluster)).map((cluster) => ({ value: cluster.id, label: cluster.name }))}
          />
          <Text size="small" tone="secondary">HSN code. Indicative heading. It does not enter the mark.</Text>
          <TextInput
            value={selected.hsn}
            onChange={(hsn) => setBook((prev) => ({
              ...prev,
              clusters: prev.clusters.map((cluster) => cluster.id === selected.id ? { ...cluster, hsn } : cluster),
            }))}
            placeholder="HSN heading"
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
            Same order as cluster v4, then the national types. A running mark uses only the filled factors. A blue desk score is already entered only where a published figure mapped onto the 1–5 anchor.
          </Text>
          {ranked.length > 0 && (
          <Table
            headers={["Cluster", "HSN code", "Place", "Mark", "Filled", "Tier", "Use it?"]}
            columnAlign={["left", "left", "left", "right", "right", "left", "left"]}
            rows={ranked.map((row) => [
              row.cluster.name,
              row.cluster.hsn || "—",
              row.cluster.place,
              row.mark === null ? "—" : String(row.mark),
              `${row.filled} of 12`,
              row.filled === 0 ? "—" : row.tier,
              row.filled >= 8 ? "Ready to compare" : "Running score",
            ])}
            rowTone={ranked.map((row) => row.filled >= 8 ? toneFor(row.tier) : "neutral")}
            striped
            stickyHeader
          />
          )}
          {chartRows.length > 0 && (
            <Stack gap={6}>
              <H2>Running mark out of 100</H2>
              <BarChart
                horizontal
                height={Math.max(320, chartRows.length * 22)}
                categories={chartRows.map((row) => row.cluster.name)}
                series={[{ name: "Mark out of 100", data: chartRows.map((row) => row.mark ?? 0) }]}
                yMax={100}
                valueSuffix=""
              />
              <Text size="small" tone="tertiary">
                Mark out of 100 on the filled factors only. Blank factors are excluded. Source: cluster v4, 30 October 2026, and the national desk, 19 November 2026. A bar with fewer than 8 factors is a running score.
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
