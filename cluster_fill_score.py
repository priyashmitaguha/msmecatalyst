"""Fill-in cluster score.

Twelve factors. Each is a fact plus a score from 1 to 5. A blank score is
ignored, so the number moves as soon as a cell is filled and a missing
partner does not count as zero. The score is shown out of 100. A tier
(Open / Shortlist / Watch / Not now) appears only after 8 of the 12 factors
are filled. Weights are relative and editable.
"""

from __future__ import annotations

FACTORS = [
    {
        "id": "count",
        "name": "How many exist",
        "weight": 12,
        "prompt": "Enterprises in the belt you would actually staff. Name the source. Do not add a member list to a licence list.",
        "s1": "Only the large plants, or under about 50 enterprises.",
        "s3": "A few hundred to about 1,000 in one belt, or a large national count with no single belt.",
        "s5": "About 5,000 or more MSMEs in the one belt you would staff.",
    },
    {
        "id": "growth",
        "name": "Growth potential",
        "weight": 10,
        "prompt": "What is growing: units, sales, exports, or approvals. Use a comparison, not a single level.",
        "s1": "The scheme is closed, or the wave is announcements only.",
        "s3": "One official signal is rising. The MSME in this belt is not yet separated from the large firm.",
        "s5": "Demand, new units, and a buyer pipeline are all visible in the last two years.",
    },
    {
        "id": "partners",
        "name": "Partners to deliver",
        "weight": 12,
        "prompt": "Who would deliver the work in this belt. A ministry is not a delivery partner. 'None yet' is a valid fact — then score 1.",
        "s1": "No partner named, or you have decided there is none.",
        "s3": "A named partner has had a conversation. Nothing is agreed.",
        "s5": "A partner can start delivery in this belt this quarter.",
    },
    {
        "id": "colleges",
        "name": "Nearby colleges",
        "weight": 6,
        "prompt": "College, department, and the person you would call. Distance from the belt matters.",
        "s1": "No college named.",
        "s3": "A department and a person are named. They have not agreed to a meeting.",
        "s5": "A training or apprentice path with that college is agreed.",
    },
    {
        "id": "lenders",
        "name": "Lending companies",
        "weight": 10,
        "prompt": "The branch, NBFC, or bank that will take files from this belt. CGTMSE, MUDRA, and SIDBI as national names do not count.",
        "s1": "No lender named for this belt.",
        "s3": "A branch or NBFC is named and already lends to MSMEs. It has not seen this cluster.",
        "s5": "That lender will take a batch of files from the centre.",
    },
    {
        "id": "marketing",
        "name": "Marketing companies",
        "weight": 6,
        "prompt": "A firm that will put these units in front of buyers. A council newsletter is not a marketing company.",
        "s1": "No firm named.",
        "s3": "A firm is named and already sells to this industry's buyers. No pilot is agreed.",
        "s5": "The firm will take a pilot set of units from this belt.",
    },
    {
        "id": "export",
        "name": "Export potential",
        "weight": 10,
        "prompt": "Export of the MSME in this belt, with the year and the source. A neighbouring HS line does not count.",
        "s1": "No export path, or the only published line is the wrong product.",
        "s3": "The sector exports. The MSME share in this belt is modest or unpublished.",
        "s5": "MSMEs in this belt already export, and the route (buyer, council, or ECGC) is one they can use.",
    },
    {
        "id": "listing",
        "name": "Chance of a big listing",
        "weight": 5,
        "prompt": "A unit in this cluster that could reach an SME IPO or the main board. Name it, or write that there is none.",
        "s1": "No listing candidate, or you have looked and there is none.",
        "s3": "One unit has the scale and the books to be discussed. No process has started.",
        "s5": "A unit from this cluster is listed, or has filed.",
    },
    {
        "id": "size",
        "name": "Size mix and max lot",
        "weight": 10,
        "prompt": "Nano (own-account or SHG), micro (at or below ₹10 crore), small (₹10–100 crore), medium (₹100–500 crore), large (above ₹500 crore). Write the mix, then the biggest lot you would enrol.",
        "s1": "Almost all large. The centre would have no micro or small lot.",
        "s3": "Mixed. Small is visible. Micro is not the mass.",
        "s5": "Mostly micro or nano, and the biggest lot you would enrol is small, not the large plant.",
    },
    {
        "id": "state",
        "name": "State government support",
        "weight": 8,
        "prompt": "The state scheme, park, or nodal office for this belt. Name the state. A policy with nothing to file is a 2.",
        "s1": "No state scheme, park, or nodal office.",
        "s3": "A park, nodal agency, or state scheme exists.",
        "s5": "The state will house the desk, or has asked for the centre.",
    },
    {
        "id": "central",
        "name": "Central government support",
        "weight": 8,
        "prompt": "A central scheme an MSME in this belt can file. A scheme that only the large plant can enter is a 2.",
        "s1": "No central scheme for this cluster.",
        "s3": "A scheme exists and only some of these MSMEs qualify.",
        "s5": "MSMEs here are already inside an open central scheme.",
    },
    {
        "id": "other",
        "name": "Anything else",
        "weight": 3,
        "prompt": "One more fact that would change the decision. Raise its weight on the Weights sheet if it should count more.",
        "s1": "The extra fact argues against opening here.",
        "s3": "Useful context. It does not change the decision.",
        "s5": "This fact, on its own, would move the cluster up or down a tier.",
    },
]

READY_AT = 8
FACTOR_IDS = [factor["id"] for factor in FACTORS]
WEIGHTS = {factor["id"]: factor["weight"] for factor in FACTORS}

# Desk facts. A score is filled only where the 1–5 anchor can be applied from a published figure.
# Partners, colleges, lenders, marketing companies, listing, and "anything else" stay blank.
CLUSTERS = [
    {
        "id": "medtech",
        "name": "Medical devices",
        "place": "AMTZ Vizag, or Greater Noida / Kanchipuram",
        "count": ("About 700 manufacturers (CII/IBEF). About 4,000 CDSCO licensed sites are a second count and are not added. The state split is not published.", 3),
        "growth": ("FY25 exports USD 4.02 billion (EPCMD/DGCIS). A prior-year comparison for the MSME belt was not used, so the score is open.", None),
        "export": ("USD 4.02 billion in FY2024–25. How much of that is the MSME, rather than the larger device company, is not published.", 4),
        "size": ("Reconstructed shape, not a census: micro about 36%, small about 40%. Max lot to enrol: small. The 28 PLI applicants are not the lot.", 4),
        "state": ("AMTZ Visakhapatnam is a park. Other device parks are in Madhya Pradesh and Tamil Nadu.", 4),
        "central": ("PLI MedTech (₹3,420 crore) is an incentive for approved applicants, not a loan to the MSME ring. The usable central door for a small unit is narrower than the PLI.", 3),
    },
    {
        "id": "semi",
        "name": "Semiconductor ancillaries",
        "place": "Sanand and Dholera, Gujarat",
        "count": ("10 approved plants in six states, and 23 design-linked applicants. Ancillary workshops are not a published census.", 1),
        "growth": ("ISM committed capex is about ₹1.6 lakh crore. That is plant capex, not MSME sales.", 2),
        "export": ("No export figure for the ancillary ring. Do not borrow an electronics line.", 1),
        "size": ("The published population is the plants. Max lot on the ground today is large. A micro tail is not counted.", 2),
        "state": ("Gujarat is hosting plants at Sanand and Dholera. An MSME scheme for ancillaries was not found.", 2),
        "central": ("ISM and the design-linked incentive fund the plant and the design applicant, not a vendor ring.", 2),
    },
    {
        "id": "toys",
        "name": "Toys",
        "place": "Koppal hub, NCR toy park, Channapatna",
        "count": ("DPIIT: 21,000+ Udyam MSMEs, across about 50 clusters. BIS licences are a second count. One belt is not 21,000.", 3),
        "growth": ("QCO from 1 January 2021. HS 9503 exports were USD 169.46 million in FY25. A unit-growth rate was not used.", None),
        "export": ("HS 9503 USD 169.46 million in FY2024–25. Chapter 95 (USD 570.95 million) is a wider basket and is not this figure.", 3),
        "size": ("Reconstructed shape: micro about 86%. Max lot to enrol: small. SFURTI clusters are the artisan end.", 5),
        "state": ("Koppal hub and the Greater Noida toy park are the places named. Confirm which state office would house a desk.", 3),
        "central": ("SFURTI in 19 clusters is grant infrastructure. The QCO is a licence wall, not a grant.", 4),
    },
    {
        "id": "footwear",
        "name": "Footwear",
        "place": "Ambur–Ranipet or Agra — split the row if you work both",
        "count": ("About 15,000 footwear units (CLE/IBEF). CLE's 2,868 members are not added. The split between Ambur–Ranipet and Agra is not published.", 4),
        "growth": ("Sector exports ₹48,667 crore in FY25 are a level for a wider leather basket, not a growth rate for one belt.", None),
        "export": ("CLE/IBEF: leather, footwear and goods exports ₹48,667 crore in FY2024–25, on a sector turnover of about ₹1.62 lakh crore. The basket is wider than non-leather and sports footwear.", 4),
        "size": ("Reconstructed shape of the 15,000: micro about 70%, small about 28%. Max lot to enrol: small.", 5),
        "central": ("BIS footwear quality orders from 2020–21, and credit-linked footwear files that stall at bank sanction. The scheme exists. The sanction is the failure.", 4),
    },
    {
        "id": "battery",
        "name": "ACC pack, BMS and recycling",
        "place": "Pune, NCR, and southern pack shops — not the cell plants",
        "count": ("A handful of PLI-ACC plants. Pack, BMS and recycling MSMEs are not in that list and are not counted.", 2),
        "growth": ("The cell plants are the growth. Pack-MSME growth is not published.", None),
        "export": ("No ACC-pack export figure. Do not use HS 8507 (mostly lead-acid).", 1),
        "size": ("Reconstructed sketch only: micro about 61%, small about 31%. Max lot to enrol: small. The plants are large and are not the lot.", 4),
        "central": ("PLI-ACC is the plant's incentive. It is not a scheme the pack MSME files.", 2),
    },
    {
        "id": "ewaste",
        "name": "E-waste",
        "place": "Seelampur (Delhi) and Moradabad",
        "count": ("CPCB lists authorised recyclers. Informal units in these two lanes are larger and uncounted. The two lists are not added.", 2),
        "growth": ("E-Waste Management Rules, 2022, pushed brands into EPR. Unit growth in the lanes is not published.", None),
        "export": ("Domestic EPR and brand buy-back. No export figure for this lane.", 1),
        "size": ("The lane is mostly micro and informal. Max lot to enrol, once formal: small. Authorised recyclers may be larger.", 5),
        "central": ("The 2022 rules create a compliance duty for the brand. They are not a grant for the dismantler.", 2),
    },
    {
        "id": "dc-ancillary",
        "name": "Data-centre ancillaries",
        "place": "Navi Mumbai, Chennai, Hyderabad, Noida, Bengaluru",
        "count": ("Public counts are of campuses, not of vendors. Vendor population is not published.", 1),
        "growth": ("State data-centre policies from about 2020. Vendor-count growth is not published.", None),
        "export": ("Campus offtake is domestic.", 1),
        "size": ("Not counted. The operator is large. The lot to enrol would be the vendor, and that list does not exist yet.", 2),
        "state": ("Several states have data-centre policies. A vendor scheme was not found.", 3),
        "central": ("No central scheme for the campus vendor was found.", 1),
    },
    {
        "id": "charging",
        "name": "EV charging",
        "place": "NCR, Pune, and Gujarat electrical belts",
        "count": ("Charger counts are assets, not firms. Electricians and small assemblers are not an official census.", 2),
        "growth": ("PM E-DRIVE from 1 October 2024, outlay ₹10,900 crore. FAME-II charging was earlier. Firm growth is not published.", None),
        "export": ("Deployment is domestic.", 1),
        "size": ("Reconstructed sketch: micro about 68%. Max lot to enrol: the small assembler, not the charge-point operator.", 4),
        "central": ("PM E-DRIVE and FAME-II subsidise charging assets through programme agencies. They are not a loan to the electrician.", 3),
    },
    {
        "id": "techtex",
        "name": "Technical textiles",
        "place": "Surat, Panipat, or Coimbatore",
        "count": ("24 GREAT startups and 30 PLI companies are scheme lists. The mill and converter population is not that list.", 2),
        "growth": ("Technical-textile exports ₹21,407.36 crore in FY24 to ₹24,732.68 crore in FY25 (Ministry of Textiles).", 4),
        "export": ("₹24,732.68 crore in FY2024–25. This is not RMG and not the whole man-made-fibre basket.", 4),
        "size": ("Reconstructed sketch: micro about 62%, small about 30%. Max lot to enrol: the converter, small. PLI companies are not the lot.", 4),
        "central": ("NTTM (₹1,480 crore) and GREAT are grants. PLI Textiles is for companies that clear an investment threshold.", 3),
    },
    {
        "id": "space",
        "name": "Space components",
        "place": "Bengaluru and Hyderabad",
        "count": ("Private launch and satellite firms are a short list. Component MSMEs are not published. Do not use HS 8802 (aircraft).", 1),
        "growth": ("IN-SPACe dates from 2020. An MSME order book was not found.", 2),
        "export": ("No export figure for this component ring.", 1),
        "size": ("The published names are the primes. Max lot today is the prime, not a machine shop.", 2),
        "central": ("IN-SPACe authorisation is a gate for the prime, not a scheme for the shop.", 2),
    },
    {
        "id": "ghydrogen",
        "name": "Green hydrogen ancillaries",
        "place": "No MSME belt — plants only",
        "count": ("Mission awards are to large sponsors. An ancillary census was not found.", 1),
        "growth": ("National Green Hydrogen Mission, 2023, funds plants. MSME revenue growth was not found.", 2),
        "export": ("No MSME export figure.", 1),
        "size": ("The sponsored plant is large. There is no counted micro lot.", 1),
        "central": ("The mission incentive is for the sponsor.", 1),
    },
    {
        "id": "ethanol",
        "name": "Ethanol and feedstock",
        "place": "One belt in UP, Maharashtra, Karnataka, or Bihar",
        "count": ("Distilleries are a few hundred large units. FPO and collection points are a different population and are not a belt census.", 2),
        "growth": ("The 20% blend target drove capacity after about 2021. Collection-unit growth is not a census.", None),
        "export": ("The offtake is domestic blending. Do not use HS 2207.", 1),
        "size": ("Plants are large. The lot to enrol is the FPO or collection unit, which is micro. The two must not be scored as one lot.", 3),
        "central": ("The blending programme is the offtake. NABARD and FPO credit are the micro channel. It is not one MSME scheme.", 3),
    },
    {
        "id": "nutra",
        "name": "Nutraceuticals and AYUSH",
        "place": "Baddi, Uttarakhand, or Gujarat",
        "count": ("No single official count combines AYUSH and nutraceutical licences. None is stated.", 2),
        "growth": ("Pharmexcil, 14 June 2025: AYUSH and herbals USD 688.89 million. A growth rate was not used.", None),
        "export": ("AYUSH and herbals USD 688.89 million. Drugs and pharmaceuticals USD 30.47 billion are a different basket.", 3),
        "size": ("Reconstructed sketch: micro about 59%, small about 32%. Max lot to enrol: small. Do not enrol the brand that holds the PE round.", 4),
        "central": ("FSSAI and AYUSH licences are gates. A PLI food health window fits only some firms.", 3),
    },
    {
        "id": "agritech",
        "name": "Agri-tech and farm machinery",
        "place": "One custom-hiring belt — name it before scoring the place",
        "count": ("No belt census. Startup certificates and machinery factories are different lists.", 2),
        "growth": ("State mechanisation missions are the demand. A unit-growth figure was not used.", None),
        "export": ("Do not use farm-machinery HS 8432 or 8433 as this cohort's export.", 1),
        "size": ("The fabricator and the custom-hiring unit are the lot, usually micro or small. The tractor OEM is not.", 3),
        "central": ("AgriSURE is equity or blended capital, not a loan to the fabricator. No dedicated MSME line was confirmed.", 2),
    },
    {
        "id": "avgc",
        "name": "AVGC-XR",
        "place": "No single belt — studios are scattered",
        "count": ("No place-level census of studios. Freelancers are people, not enterprises.", 1),
        "export": ("No cohort export inside the services account of USD 383.51 billion.", 1),
        "size": ("A studio that bills is often micro. There is no belt, so the mix is not a cluster shape.", 3),
        "central": ("The AVGC task force (2022) is a policy. A scheme a small studio can file was not confirmed.", 2),
    },
    {
        "id": "geospatial",
        "name": "Geospatial and drone services",
        "place": "Scattered service firms — do not merge with drone manufacturing",
        "count": ("16,000 remote-pilot certificates are people, not firms. Firm census is not published.", 1),
        "export": ("Services. No HSN and no cohort export.", 1),
        "size": ("Service firms, mostly micro, if they are firms at all. Max lot: small.", 3),
        "central": ("Geospatial guidelines, 2021, are a liberalisation, not a scheme.", 2),
    },
    {
        "id": "cyber",
        "name": "Cybersecurity services",
        "place": "No factory belt",
        "count": ("No cluster count. These are firms you might invite in, not a place.", 1),
        "export": ("No cohort figure inside services exports.", 1),
        "size": ("Not a manufacturing lot. Max lot is a small services firm.", 2),
        "central": ("CERT-In directions are a compliance duty, not a cluster scheme.", 1),
    },
    {
        "id": "specialty-steel",
        "name": "Specialty steel conversion",
        "place": "Rerollers — not the melt shop",
        "count": ("PLI beneficiaries are the melt and processing companies. An MSME reroller census was not found.", 1),
        "export": ("Engineering goods USD 116.67 billion are too wide. No specialty-reroller export was used.", 1),
        "size": ("The PLI plant is large. Max lot, if any MSME is enrolled, would be the reroller. That list is not counted.", 2),
        "central": ("PLI Specialty Steel is the plant's scheme.", 2),
    },
    {
        "id": "api",
        "name": "Bulk drugs and APIs",
        "place": "Around one park — name the park",
        "count": ("PLI Bulk Drugs applicants and park plots. Intermediate MSMEs around the park are not a published census.", 1),
        "growth": ("Pharmexcil, 14 June 2025: bulk drugs USD 4.87 billion. That is the plant line.", None),
        "export": ("Bulk drugs USD 4.87 billion. That export sits with the plants, not a counted MSME ring.", 2),
        "size": ("The plot and the PLI sit with the plant. Max lot on the scheme list is large.", 2),
        "central": ("PLI Bulk Drugs (2020) is the plant's incentive.", 2),
    },
    {
        "id": "electronics",
        "name": "Electronics suppliers",
        "place": "Noida–Greater Noida or Sriperumbudur",
        "count": ("32 PLI companies and 300+ mobile units (MeitY). Neither count is the MSME tool room.", 2),
        "growth": ("FY25 electronics goods USD 38.58 billion. Production ₹11.32 lakh crore and exports about ₹3.26 lakh crore. The ring's own growth is not separated.", None),
        "export": ("The USD 38.58 billion is mostly the large assembler, including smartphones. The supplier's export is not published.", 2),
        "size": ("The 32 PLI companies are large and are not the lot. The uncounted supplier is the lot. Max lot to enrol: small.", 3),
        "central": ("PLI LSEM is not open to the tool room. Pointing a moulder at it is the wrong window.", 2),
    },
    {
        "id": "ev",
        "name": "EV and auto components",
        "place": "Pune–Chakan or Hosur–Krishnagiri",
        "count": ("82 PLI Auto applicants and 278 units as on 30 November 2025. ACMA's membership is the wider component industry, not an EV census.", 2),
        "growth": ("PLI Auto determined sales ₹32,879 crore to 30 September 2025. That is the applicant, not the MSME supplier.", None),
        "export": ("No EV-only export. ACMA's component exports include conventional parts and are not used.", 1),
        "size": ("The OEM and the PLI unit are large. Max lot to enrol: the small supplier. The pack ring is a different row.", 3),
        "central": ("PLI Auto and PM E-DRIVE are not loans to the supplier.", 2),
    },
    {
        "id": "solar",
        "name": "Solar modules and BOS",
        "place": "Gujarat fabrication, not the Rajasthan project site",
        "count": ("ALMM: 100 manufacturers and 123 units, up from 21 manufacturers in 2021. Installers and BOS MSMEs are not added.", 2),
        "growth": ("ALMM manufacturers from 21 in 2021 to 100. That is the module list, not BOS MSMEs.", 3),
        "export": ("A clean module-export line was not used. ALMM capacity is not exports.", 2),
        "size": ("The ALMM name is often a mid-size or large manufacturer. The installer is a different, smaller lot. Do not score them as one.", 3),
        "central": ("ALMM and PLI are the manufacturer's gate and incentive. IREDA finances projects and plants.", 3),
    },
    {
        "id": "it",
        "name": "IT services and GCCs",
        "place": "Bengaluru, Hyderabad, Pune, NCR, Chennai — no factory belt",
        "count": ("NASSCOM lists, park tenants, and GCC announcements are three different counts. None is an MSME census.", 2),
        "export": ("Services exports USD 383.51 billion in FY25. IT is a large part of that account and is not a cluster figure.", 2),
        "size": ("The GCC is large and is not the lot. A campus vendor would be small. That vendor list was not counted.", 2),
        "central": ("No central scheme for an MSME cluster here.", 1),
    },
    {
        "id": "healthtech",
        "name": "Healthtech",
        "place": "No factory belt — do not site this at AMTZ",
        "count": ("Certificates and empanelled care units are different lists. They are not the 700 device manufacturers.", 1),
        "export": ("No export figure. Do not reuse medtech USD 4.02 billion.", 1),
        "size": ("A small diagnostic unit can be micro. A hospital chain is not the lot.", 3),
        "central": ("Telemedicine guidelines (2020) are a practice rule, not a scheme for a care-unit cluster.", 2),
    },
    {
        "id": "edtech",
        "name": "Edtech and skilling",
        "place": "No belt",
        "count": ("DPIIT certificates and NSDC training partners are different lists. They are not a place.", 1),
        "export": ("Not separable inside services exports.", 1),
        "size": ("Training partners are mostly small. They are a delivery route, not a lot to enrol as the cluster.", 2),
        "central": ("Skill and apprenticeship contracts pay the partner. They are not a cluster scheme.", 2),
    },
    {
        "id": "logistics",
        "name": "E-commerce logistics",
        "place": "Bhiwandi, Bilaspur–Gurugram, or Hoskote",
        "count": ("Warehouse counts, transporter registrations, and fleet owners are three units. They are not added. No firm census.", 2),
        "growth": ("The belts grew with e-way bill and online retail from about 2017. A firm-count growth rate is not published.", None),
        "export": ("Domestic. Do not use merchandise export totals.", 1),
        "size": ("The fleet owner is micro. Max lot to enrol: small. The 3PL is not the lot.", 5),
        "central": ("No cluster scheme. Vehicle finance is a lender product, which belongs in the lender column once a company is named.", 1),
    },
    {
        "id": "fintech",
        "name": "Fintech and BC networks",
        "place": "No factory belt",
        "count": ("Regulated fintechs and BC networks are different lists. Agent headcount is people, not enterprises.", 2),
        "export": ("Not merchandise trade.", 1),
        "size": ("These firms lend or distribute credit. They are not the borrowing lot.", 1),
        "central": ("Account Aggregator (2021) is infrastructure. It is not a scheme for a borrower cluster.", 1),
    },
    {
        "id": "drones",
        "name": "Drones",
        "place": "Split across many cities — no single belt",
        "count": ("PLI list, 6 July 2022: 23 firms. PIB, 26 July 2024: 48 companies with type-certified models. The lists are small and scattered.", 2),
        "growth": ("The PLI window has closed. Sales on the early list were ₹319 crore in FY22, unaudited, for the beneficiaries.", 2),
        "export": ("No export line. The last official sales figure is the PLI list's own turnover.", 1),
        "size": ("A few dozen manufacturers. Max lot: the type-certified firm, often small. Not a micro mass in one lane.", 3),
        "central": ("Drone PLI (outlay ₹120 crore) has closed. About ₹98 crore was the disbursement figure used in the desk pass.", 2),
    },
    {
        "id": "defence",
        "name": "Defence suppliers",
        "place": "Bengaluru, Hyderabad, Pune, or the TN / UP corridors",
        "count": ("About 16,000 MSMEs is an ecosystem description. 788 licences to 462 companies, and iDEX's 619 startups, are different counts. They are not added. Density inside one corridor is not published.", 3),
        "growth": ("FY25 exporter count was up 17.4%. The headcount was not published. Exports were ₹23,622 crore.", 3),
        "export": ("₹23,622 crore in FY2024–25. Private sector ₹15,233 crore, DPSUs ₹8,389 crore. The MSME share of that export is not published.", 3),
        "size": ("The description is mostly small firms, but the vendor who holds a milestone bill is often small or medium. Max lot to enrol: medium. Do not enrol the DPSU.", 3),
        "state": ("Tamil Nadu and Uttar Pradesh defence corridors, plus the older Bengaluru, Hyderabad, and Pune industry. Which office would house a desk is not settled.", 3),
        "central": ("iDEX grants (startups and MSMEs; 430 contracts by February 2025) are not the scheme for all 16,000. Export authorisation is a gate.", 3),
    },
    {
        "id": "appliances",
        "name": "White goods and furniture",
        "place": "Noida–Hapur annex",
        "count": ("The annex is about 4,500 MSMEs. The 84 PLI White Goods companies are not added to that.", 4),
        "growth": ("A growth rate for the 4,500 was not found. PLI intended investment is ₹10,478 crore for the 84 companies.", None),
        "export": ("No export figure for the annex. Engineering goods USD 116.67 billion are too wide.", 2),
        "size": ("Reconstructed shape of the annex: micro about 65%, small about 31%. Max lot to enrol: small.", 5),
        "state": ("The Noida–Hapur annex is the place. Confirm the state nodal office before treating this as a 5.", 4),
        "central": ("PLI White Goods is the 84 companies' incentive, not the annex MSME's scheme.", 2),
    },
    {
        "id": "food",
        "name": "Food processing",
        "place": "The food-demo belt — name the district, not all 726 ODOP districts",
        "count": ("PMFME, 31 December 2025: 1,72,707 micro enterprises approved and 59,202 formalised, nationally. ASI factories are a third count. The demo belt's own count is not the national number.", 3),
        "growth": ("The approval-to-formalisation gap is still open: 1,72,707 approved against 59,202 formalised.", 4),
        "export": ("MoFPI: processed-food exports USD 10.88 billion in FY2023–24. A single FY25 level was not used. MSME share is not published.", 3),
        "size": ("The PMFME unit is micro. Max lot to enrol: small, once it invoices a buyer. PLI food companies are not the lot.", 5),
        "state": ("State nodal agencies already run PMFME. The centre would sit beside that agency, not replace it.", 4),
        "central": ("PMFME is open and credit-linked. As on 30 June 2025, 1,44,517 loans sanctioned, ₹11,501.79 crore. PLI food is a different, larger-firm scheme.", 5),
    },
]


def blank():
    return {"note": "", "score": ""}


def as_cells(row):
    cells = {}
    for factor in FACTORS:
        value = row.get(factor["id"])
        if value is None:
            cells[factor["id"]] = blank()
        else:
            note, score = value
            cells[factor["id"]] = {"note": note, "score": "" if score is None else str(score)}
    return cells


def books():
    clusters = []
    for row in CLUSTERS:
        clusters.append({
            "id": row["id"],
            "name": row["name"],
            "place": row["place"],
            "cells": as_cells(row),
        })
    return {
        "weights": {factor["id"]: str(factor["weight"]) for factor in FACTORS},
        "clusters": clusters,
    }


def running_score(cells, weights):
    """Return filled count and a 0–100 score, or None when nothing is scored.

    A blank score drops out of both the numerator and the denominator.
    """
    num = 0.0
    den = 0.0
    filled = 0
    for factor_id in FACTOR_IDS:
        raw = cells[factor_id]["score"]
        if raw == "" or raw is None:
            continue
        score = float(raw)
        weight = float(weights[factor_id])
        if weight < 0:
            raise ValueError(factor_id)
        filled += 1
        num += score * weight
        den += weight
    if filled == 0 or den == 0:
        return filled, None
    return filled, round(num / den / 5 * 100)


def tier_for(filled, score):
    if not filled or score is None:
        return ""
    if filled < READY_AT:
        return "Not yet"
    if score >= 80:
        return "Open"
    if score >= 60:
        return "Shortlist"
    if score >= 40:
        return "Watch"
    return "Not now"


def assert_register():
    if len(CLUSTERS) != 31:
        raise SystemExit(f"expected 31 clusters, got {len(CLUSTERS)}")
    ids = [row["id"] for row in CLUSTERS]
    if len(set(ids)) != 31:
        raise SystemExit("duplicate cluster id")
    if sum(factor["weight"] for factor in FACTORS) != 100:
        raise SystemExit("default weights must sum to 100")
    book = books()
    for cluster in book["clusters"]:
        for factor_id in ("partners", "colleges", "lenders", "marketing", "listing", "other"):
            if cluster["cells"][factor_id]["score"] != "":
                raise SystemExit(f"{cluster['id']} {factor_id} should be blank until someone fills it")
        filled, score = running_score(cluster["cells"], book["weights"])
        if filled == 0 or score is None:
            raise SystemExit(f"{cluster['id']} has no desk score")
        if filled >= READY_AT:
            raise SystemExit(f"{cluster['id']} is ready before partners are named")
    # Worked example. Weights of the filled factors are the default weights.
    example = {factor["id"]: blank() for factor in FACTORS}
    for factor_id, score in (
        ("count", 5), ("partners", 1), ("lenders", 3), ("export", 4),
        ("size", 5), ("state", 4), ("central", 4),
    ):
        example[factor_id]["score"] = str(score)
    filled, score = running_score(example, book["weights"])
    # 5*12 + 1*12 + 3*10 + 4*10 + 5*10 + 4*8 + 4*8 = 256; weights 70; 256/70/5*100 = 73.14
    if filled != 7 or score != 73:
        raise SystemExit(f"worked example {filled} {score}")
    if tier_for(filled, score) != "Not yet":
        raise SystemExit("seven factors must not receive a tier")
    if tier_for(8, 80) != "Open" or tier_for(8, 60) != "Shortlist":
        raise SystemExit("tier cut-off")
    if tier_for(8, 40) != "Watch" or tier_for(8, 39) != "Not now":
        raise SystemExit("tier floor")
