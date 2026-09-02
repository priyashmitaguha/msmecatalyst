# -*- coding: utf-8 -*-
"""Main public-site page bodies for MSME Catalyst."""

def build(g):
    doc = g["doc"]; write = g["write"]; cta_band = g["cta_band"]; page_hero = g["page_hero"]
    T = g["T"]; _reg = g["_reg"]

    # ===================== HOME =====================
    home = f"""
<section class="hero">
  <div class="wrap hero-inner">
    <div class="two-col wide-left">
      <div class="reveal in">
        <span class="kicker" data-cms="home.hero_kicker">{_reg("home.hero_kicker","MSME Catalyst | The Convergence Layer","Hero kicker")}</span>
        <h1 class="h1" data-cms="home.hero_heading" style="margin-top:18px">{_reg("home.hero_heading","India does not lack MSME support.<br><span style='color:var(--orange)'>It lacks convergence.</span>","Hero heading (HTML allowed)")}</h1>
        <p class="lead mt-m maxch" data-cms="home.hero_sub">{_reg("home.hero_sub","MSME Catalyst makes existing support work together around real MSME clusters and business journeys — a neutral, not-for-profit platform that brings anchors, MSMEs, lenders, technology providers, capability institutions, legal and dispute-resolution partners and government into one accountable operating model.","Hero sub-copy",True)}</p>
        <div class="hero-ctas">
          <a class="btn btn-primary btn-lg btn-arrow" href="approach.html">Explore Our Approach</a>
          <a class="btn btn-dark btn-lg" href="membership.html">Join MSME Catalyst</a>
          <a class="btn btn-ghost btn-lg" href="odr-support.html">Apply for ODR Support</a>
        </div>
        <div class="hero-strip">
          <div class="hero-stat"><b>4</b><span>connected growth gaps addressed</span></div>
          <div class="hero-stat"><b>1</b><span>accountable operating model</span></div>
          <div class="hero-stat"><b>0</b><span>exclusive tie-ins or lock-in</span></div>
        </div>
      </div>
      <div class="reveal in">
        <div class="converge" aria-hidden="true">
          <div class="ring"></div>
          <div class="ring" style="inset:14%"></div>
          <div class="core">MSME<br>Cluster</div>
          <div class="node" style="top:-2%;left:42%">🏢</div>
          <div class="node" style="top:20%;right:-4%">🏦</div>
          <div class="node" style="bottom:18%;right:-4%">⚙️</div>
          <div class="node" style="bottom:-2%;left:42%">🎓</div>
          <div class="node" style="bottom:18%;left:-4%">⚖️</div>
          <div class="node" style="top:20%;left:-4%">🏛️</div>
        </div>
      </div>
    </div>
  </div>
</section>

<section class="section"><div class="wrap">
  <div class="two-col">
    <div class="reveal">
      <span class="kicker" data-cms="home.problem_kicker">{_reg("home.problem_kicker","The problem")}</span>
      <h2 class="h2 mt-s" data-cms="home.problem_heading">{_reg("home.problem_heading","An MSME rarely has one isolated problem.")}</h2>
    </div>
    <div class="reveal">
      <p class="lead" data-cms="home.problem_lead">{_reg("home.problem_lead","A single enterprise may face delayed receivables, weak buyer visibility, limited documentation, poor access to capability support and unclear capital pathways — all at the same time.","Problem lead",True)}</p>
      <p class="muted" data-cms="home.problem_body">{_reg("home.problem_body","Support exists. Schemes, lenders, universities, technology and legal routes are all available. But they often reach the enterprise <strong>separately</strong>, on different timelines, through different doors — so the enterprise carries the burden of stitching them together alone.","Problem body",True)}</p>
    </div>
  </div>
</div></section>

<section class="section bg-sand"><div class="wrap">
  <div class="center reveal" style="max-width:60ch;margin-inline:auto">
    <span class="kicker" style="justify-content:center">The four connected growth gaps</span>
    <h2 class="h2 mt-s">MSME Catalyst helps enterprises close four gaps at once</h2>
  </div>
  <div class="grid g4 mt-l">
    <div class="gap-card gap-1 reveal"><span class="n">1</span><h3 data-cms="home.gap1_title">{_reg("home.gap1_title","Cash-flow gap")}</h3><p data-cms="home.gap1_desc">{_reg("home.gap1_desc","Receivables and payment certainty.")}</p></div>
    <div class="gap-card gap-2 reveal"><span class="n">2</span><h3 data-cms="home.gap2_title">{_reg("home.gap2_title","Market gap")}</h3><p data-cms="home.gap2_desc">{_reg("home.gap2_desc","Demand-side linkage and buyer access.")}</p></div>
    <div class="gap-card gap-3 reveal"><span class="n">3</span><h3 data-cms="home.gap3_title">{_reg("home.gap3_title","Capability gap")}</h3><p data-cms="home.gap3_desc">{_reg("home.gap3_desc","Technical, managerial, digital and legal handholding.")}</p></div>
    <div class="gap-card gap-4 reveal"><span class="n">4</span><h3 data-cms="home.gap4_title">{_reg("home.gap4_title","Growth-capital gap")}</h3><p data-cms="home.gap4_desc">{_reg("home.gap4_desc","Preparation, documentation and access pathways.")}</p></div>
  </div>
</div></section>

<section class="section"><div class="wrap">
  <div class="center reveal" style="max-width:58ch;margin-inline:auto">
    <span class="kicker" style="justify-content:center">What changes in a converged cluster</span>
    <h2 class="h2 mt-s">When support works together, the enterprise feels the difference</h2>
  </div>
  <div class="grid g3 mt-l">
    <div class="card hoverable reveal"><div class="ico">📈</div><h3>Clearer demand</h3><p>Ecosystems built around real anchors, buyers and markets — not isolated supply-side interventions.</p></div>
    <div class="card hoverable reveal"><div class="ico orange">💧</div><h3>More predictable cash flow</h3><p>Payment friction is surfaced early and routed to the right support before it becomes failure.</p></div>
    <div class="card hoverable reveal"><div class="ico">🛠️</div><h3>Practical local capability</h3><p>Technical, managerial, digital and legal handholding available through one working door.</p></div>
    <div class="card hoverable reveal"><div class="ico orange">🧭</div><h3>Relevant capital & market pathways</h3><p>Readiness and documentation that connect enterprises to the routes that actually fit them.</p></div>
    <div class="card hoverable reveal"><div class="ico">🔎</div><h3>Shared evidence & accountability</h3><p>Cluster scorecards track readiness, friction and outcomes — so collaboration is measured, not assumed.</p></div>
  </div>
</div></section>

<section class="section bg-ink"><div class="wrap">
  <div class="two-col">
    <div class="reveal">
      <span class="kicker on-dark">What MSME Catalyst does</span>
      <h2 class="h2 mt-s" style="color:#fff">We hold the shared operating framework — not the outcomes</h2>
      <p class="mt-s" style="color:rgba(255,255,255,.78)">MSME Catalyst is the neutral layer that convenes, prepares and tracks. It does not lend, underwrite or adjudicate — independent institutions retain their own eligibility, commercial and legal decisions.</p>
      <a class="btn btn-primary btn-arrow mt-m" href="approach.html">See how the model works</a>
    </div>
    <div class="reveal">
      <div class="steps">
        <div class="step" style="background:transparent;border-color:rgba(255,255,255,.16)"><h3 style="color:#fff">Creates a shared cluster operating framework</h3><p style="color:rgba(255,255,255,.7)">One common way of working across every participant in a cluster.</p></div>
        <div class="step" style="background:transparent;border-color:rgba(255,255,255,.16)"><h3 style="color:#fff">Convenes relevant institutions</h3><p style="color:rgba(255,255,255,.7)">The right anchors, lenders, capability and legal partners around a live need.</p></div>
        <div class="step" style="background:transparent;border-color:rgba(255,255,255,.16)"><h3 style="color:#fff">Prepares enterprises and cases</h3><p style="color:rgba(255,255,255,.7)">Readiness, documentation and case preparation so support can actually land.</p></div>
        <div class="step" style="background:transparent;border-color:rgba(255,255,255,.16)"><h3 style="color:#fff">Coordinates referrals &amp; tracks outcomes</h3><p style="color:rgba(255,255,255,.7)">Neutral referral, then measurement of what happened.</p></div>
        <div class="step" style="background:transparent;border-color:rgba(255,255,255,.16)"><h3 style="color:#fff">Publishes aggregated execution insight</h3><p style="color:rgba(255,255,255,.7)">Shared, de-identified learning that improves the whole system.</p></div>
      </div>
    </div>
  </div>
</div></section>

<section class="section"><div class="wrap">
  <div class="center reveal" style="max-width:56ch;margin-inline:auto">
    <span class="kicker" style="justify-content:center">Who builds the system</span>
    <h2 class="h2 mt-s">Shared infrastructure, built by many hands</h2>
    <p class="muted mt-s">No single participant owns the cluster. Each holds a role; MSME Catalyst holds the framework and the evidence in trust.</p>
  </div>
  <div class="grid g4 mt-l">
    <div class="chip reveal"><div class="ci">🏭</div><b>MSMEs &amp; clusters</b></div>
    <div class="chip reveal"><div class="ci">🏢</div><b>Anchor corporates &amp; buyers</b></div>
    <div class="chip reveal"><div class="ci">🏦</div><b>Banks &amp; NBFCs</b></div>
    <div class="chip reveal"><div class="ci">⚙️</div><b>Technology &amp; infrastructure</b></div>
    <div class="chip reveal"><div class="ci">🎓</div><b>Capability &amp; academic institutions</b></div>
    <div class="chip reveal"><div class="ci">⚖️</div><b>Legal &amp; ODR partners</b></div>
    <div class="chip reveal"><div class="ci">🏛️</div><b>Government &amp; public institutions</b></div>
    <div class="chip reveal"><div class="ci">🤝</div><b>Funders &amp; donors</b></div>
  </div>
</div></section>

{cta_band()}
"""
    schema = '{"@context":"https://schema.org","@type":"Organization","name":"MSME Catalyst","alternateName":"Digital Growth Infrastructure Foundation","description":"India\\u0027s neutral, not-for-profit convergence layer for MSME growth.","url":"https://msmecatalyst.org"}'
    write("index.html", doc(
        "MSME Catalyst | India's neutral convergence layer for MSME growth",
        "MSME Catalyst is a neutral, not-for-profit platform that makes existing MSME support work together around real clusters and business journeys.",
        home, active="index.html", schema=schema))

    # ===================== ABOUT =====================
    council_roles = [
        "Chair / Independent Member","Banking or Financial Institution Member","NBFC / Alternative Lender Member",
        "Fintech / Digital Infrastructure Member","Anchor Corporate / Market Access Member","MSME / Cluster Representative",
        "Capability / Academic Institution Member","Legal / Receivables / ODR Ecosystem Member",
        "Independent Governance or Risk Expert","Independent Sector / Development Expert",
    ]
    council_cards = "".join(f"""
      <article class="profile reveal">
        <div class="ph">{i+1:02d}</div>
        <div class="pb">
          <h3>Member to be announced</h3>
          <div class="role">{r}</div>
          <div class="org">Organisation · Designation</div>
          <p class="bio">Short biography managed in the CMS. Each card supports photo upload, name, designation, organisation, bio, LinkedIn and a display toggle.</p>
          <span class="li">in · LinkedIn</span>
        </div>
      </article>""" for i, r in enumerate(council_roles))

    secretariat = [
        ("Chief Executive Officer","Leads the platform and is accountable for measurable MSME outcomes."),
        ("Cluster Programmes","Designs and runs cluster capability centres and programme delivery."),
        ("Partnerships & Membership","Convenes institutions and manages the membership working model."),
        ("Research, Data & Learning","Owns scorecards, dashboards and aggregated execution insight."),
        ("Operations & Communications","Runs day-to-day operations, governance support and communications."),
    ]
    sec_cards = "".join(f"""
      <article class="profile reveal">
        <div class="ph">{t.split()[0][0]}{t.split()[-1][0]}</div>
        <div class="pb"><h3>Appointment in progress</h3><div class="role">{t}</div>
        <div class="org">Secretariat · Digital Growth Infrastructure Foundation</div>
        <p class="bio">{d}</p><span class="li">in · LinkedIn</span></div>
      </article>""" for t, d in secretariat)

    advisory_cards = "".join(f"""
      <article class="profile reveal">
        <div class="ph">A{i+1}</div>
        <div class="pb"><h3>Advisor to be announced</h3><div class="role">Advisory Body · Non-executive</div>
        <div class="org">Area of expertise · Organisation</div>
        <p class="bio">Strategic guidance only. Advisors do not approve lending, select cases or control operations.</p>
        <span class="li">in · LinkedIn</span></div>
      </article>""" for i in range(6))

    about = f"""
{page_hero("About MSME Catalyst", "Industry-led, professionally run, accountable for outcomes.",
  "MSME Catalyst is operated by Digital Growth Infrastructure Foundation, a Section 8 not-for-profit entity. We are built as a neutral convergence layer.", "About", key="about")}

<section class="section" id="who"><div class="wrap">
  <div class="two-col">
    <div class="reveal">
      <span class="kicker">Who we are</span>
      <h2 class="h2 mt-s">A neutral convergence layer, held in trust</h2>
    </div>
    <div class="reveal">
      <p class="lead">MSME Catalyst is operated by Digital Growth Infrastructure Foundation, a Section 8, not-for-profit entity. We are built as a neutral convergence layer: industry-led, professionally run and accountable for whether collaboration produces measurable MSME outcomes.</p>
      <div class="callout mt-m"><strong>Our purpose.</strong> To make existing MSME infrastructure usable on the ground — by converging market demand, cash-flow support, capability, capital pathways and intelligence around live clusters.</div>
    </div>
  </div>
</div></section>

<section class="section bg-sand" id="neutrality"><div class="wrap">
  <div class="center reveal" style="max-width:56ch;margin-inline:auto">
    <span class="kicker" style="justify-content:center">Why neutrality matters</span>
    <h2 class="h2 mt-s">We do not own the decisions. We hold the framework.</h2>
  </div>
  <div class="grid g2 mt-l" style="max-width:900px;margin-inline:auto">
    <div class="card reveal"><div class="ico orange">🚫</div><h3>What we do not own</h3><p>MSME Catalyst does not own the lender decision, the legal outcome, the customer relationship or the participant's data.</p></div>
    <div class="card reveal"><div class="ico">🤲</div><h3>What we hold in trust</h3><p>MSME Catalyst holds the shared operating framework and the aggregated evidence — on behalf of the whole ecosystem, not any one participant.</p></div>
  </div>
  <div class="boundary reveal mt-l" style="max-width:900px;margin-inline:auto">
    <h3>What We Do Not Do</h3>
    <p>MSME Catalyst does not lend, underwrite, provide legal advice, adjudicate disputes, operate an ODR platform, guarantee recovery, or replace existing schemes, courts, arbitrators, universities or implementation partners.</p>
    <p class="muted mt-s" style="margin-bottom:0">We facilitate structured access to relevant ecosystem pathways. Independent lenders, ODR providers and other institutions retain their own eligibility, commercial, legal and operational decisions.</p>
  </div>
</div></section>

<section class="section" id="council"><div class="wrap">
  <div class="center reveal" style="max-width:56ch;margin-inline:auto">
    <span class="kicker" style="justify-content:center">Governance</span>
    <h2 class="h2 mt-s">Governing Council</h2>
    <p class="muted mt-s">Ten seats representing the ecosystem. Each profile is CMS-managed with photo, name, designation, organisation, biography, LinkedIn and display status.</p>
  </div>
  <div class="grid g4 mt-l" data-cms-list="council" data-cms-render="profile">{council_cards}</div>
</div></section>

<section class="section bg-sand" id="advisory"><div class="wrap">
  <div class="center reveal" style="max-width:60ch;margin-inline:auto">
    <span class="kicker" style="justify-content:center">Advisory Body · Non-executive</span>
    <h2 class="h2 mt-s">Strategic guidance, clearly bounded</h2>
    <p class="muted mt-s">The Advisory Body is non-executive. It provides strategic guidance and <strong>does not approve lending, select cases or control operations.</strong></p>
  </div>
  <div class="grid g3 mt-l" data-cms-list="advisory" data-cms-render="profile">{advisory_cards}</div>
</div></section>

<section class="section" id="secretariat"><div class="wrap">
  <div class="center reveal" style="max-width:56ch;margin-inline:auto">
    <span class="kicker" style="justify-content:center">The team</span>
    <h2 class="h2 mt-s">Secretariat</h2>
    <p class="muted mt-s">The professional team that runs the platform day to day.</p>
  </div>
  <div class="grid g3 mt-l" data-cms-list="secretariat" data-cms-render="profile">{sec_cards}</div>
</div></section>

{cta_band()}
"""
    write("about.html", doc("About Us | MSME Catalyst",
        "MSME Catalyst is operated by Digital Growth Infrastructure Foundation, a Section 8 not-for-profit built as a neutral convergence layer for MSME growth.",
        about, active="about.html"))

    # ===================== OUR APPROACH =====================
    approach = f"""
{page_hero("Our Approach", "Start with demand. Build capability. Share evidence. Protect neutrality.",
  "A working method for making support land on the ground — organised around real clusters, not isolated interventions.", "Our Approach", key="approach")}

<section class="section" id="convergence"><div class="wrap narrow">
  <div class="steps">
    <div class="step reveal"><h3>Start with demand</h3><p>We build ecosystems around real anchors, buyers, products, supply-chain needs and markets — rather than isolated supply-side interventions. Demand is the organising principle, because demand is what makes every other form of support worth using.</p></div>
    <div class="step reveal"><h3>Build a Cluster Capability Centre</h3><p>The Capability Centre is one door into a working MSME support system. It is <strong>not</strong> a lender, college, ODR platform or legal service — it is the coordination point that makes those services reachable.</p></div>
    <div class="step reveal"><h3>Use shared evidence</h3><p>Cluster scorecards track readiness, payment friction, capability needs, market linkage and capital pathways — so decisions are grounded in what is actually happening on the ground.</p></div>
    <div class="step reveal"><h3>Protect neutrality</h3><p>MSMEs remain free to choose providers. No participant gets exclusive access or preferred tie-ins. Neutrality is not a slogan here; it is an operating rule.</p></div>
  </div>
</div></section>

<section class="section bg-sand" id="capability-centres"><div class="wrap">
  <div class="center reveal" style="max-width:56ch;margin-inline:auto">
    <span class="kicker" style="justify-content:center">Inside the Cluster Capability Centre</span>
    <h2 class="h2 mt-s">One door, five functions</h2>
    <p class="muted mt-s">The Capability Centre coordinates — it does not replace the institutions it connects to.</p>
  </div>
  <div class="grid g3 mt-l">
    <div class="card hoverable reveal"><div class="card-num">1</div><h3>Academic &amp; apprenticeship-linked support</h3><p>Skilling and talent pathways connected to real cluster needs.</p></div>
    <div class="card hoverable reveal"><div class="card-num">2</div><h3>Business &amp; growth handholding</h3><p>Managerial, digital and operational support for the enterprise journey.</p></div>
    <div class="card hoverable reveal"><div class="card-num">3</div><h3>Finance &amp; receivables support</h3><p>Readiness and documentation — not lending decisions, which stay with lenders.</p></div>
    <div class="card hoverable reveal"><div class="card-num">4</div><h3>Legal, commercial-friction &amp; ODR referral</h3><p>Case preparation and neutral referral — not legal advice or adjudication.</p></div>
    <div class="card hoverable reveal"><div class="card-num">5</div><h3>Ecosystem coordination</h3><p>Convening the right participants around a live need, then tracking outcomes.</p></div>
  </div>
</div></section>

<section class="section"><div class="wrap">
  <div class="two-col">
    <div class="reveal">
      <span class="kicker">Cluster scorecards</span>
      <h2 class="h2 mt-s">Evidence everyone can see</h2>
      <p class="lead mt-s">Scorecards make a cluster legible — turning scattered signals into a shared picture that participants can act on together.</p>
    </div>
    <div class="reveal">
      <ul class="flist">
        <li>Enterprise and cluster <strong>readiness</strong></li>
        <li><strong>Payment friction</strong> and receivables health</li>
        <li><strong>Capability needs</strong> — technical, managerial, digital, legal</li>
        <li><strong>Market linkage</strong> and buyer access</li>
        <li><strong>Capital pathways</strong> and documentation gaps</li>
      </ul>
    </div>
  </div>
</div></section>

<section class="section bg-ink"><div class="wrap center">
  <div class="reveal" style="max-width:52ch;margin-inline:auto">
    <span class="kicker on-dark" style="justify-content:center">A promise, not a preference</span>
    <h2 class="h2 mt-s" style="color:#fff">MSMEs remain free to choose. No exclusive tie-ins. Ever.</h2>
    <a class="btn btn-primary btn-arrow mt-m" href="programmes.html">See the programmes</a>
  </div>
</div></section>
"""
    write("approach.html", doc("Our Approach | MSME Catalyst",
        "Start with demand, build a Cluster Capability Centre, use shared evidence and protect neutrality — MSME Catalyst's working method.",
        approach, active="approach.html"))

    # ===================== PROGRAMMES =====================
    pillars = [
        ("Pillar 1","Awareness & Readiness",["Credit Ki Kaksha","Rating Ki Kaksha","Digital Dost","Policy & Programme Readiness"]),
        ("Pillar 2","Receivables & ODR Support",["Cluster-led payment support","Recovery Cell case preparation","ODR referral pathway","Aggregate outcome learning"]),
        ("Pillar 3","Capital & Market Pathways",["Finance-readiness and documentation","Buyer and supply-chain context","Referral to relevant capital pathways","Market access and growth pathways"]),
        ("Pillar 4","Cluster Intelligence",["Cluster mapping","Readiness and friction research","Scorecards and dashboards","Compliance and capability intelligence"]),
    ]
    pillar_cards = "".join(f"""
      <div class="pillar reveal">
        <div class="pn">{p}</div><h3>{t}</h3>
        <ul>{''.join(f'<li>{x}</li>' for x in items)}</ul>
      </div>""" for p, t, items in pillars)
    programmes = f"""
{page_hero("Programmes", "Four pillars that carry the enterprise journey.",
  "From awareness and readiness to receivables, capital, market access and cluster intelligence — each pillar is a working programme, not a poster.", "Programmes", key="programmes")}
<section class="section"><div class="wrap">
  <div class="grid g2">{pillar_cards}</div>
  <div class="notice mt-l">Every programme respects the platform's boundaries: MSME Catalyst prepares, convenes, refers and measures — it does not lend, underwrite, provide legal advice, adjudicate disputes or operate an ODR platform.</div>
</div></section>
{cta_band()}
"""
    write("programmes.html", doc("Programmes | MSME Catalyst",
        "Four programme pillars: Awareness & Readiness, Receivables & ODR Support, Capital & Market Pathways, and Cluster Intelligence.",
        programmes, active="programmes.html"))

    # ===================== ODR SUPPORT (redirect page) =====================
    odr_support = f"""
{page_hero("ODR Support", "Resolve payment friction before it becomes business failure.",
  "MSME Catalyst helps businesses facing payment-related commercial friction organise their documents, understand possible routes and connect with an appropriate independent provider.", "ODR Support", key="odr_support")}
<section class="section"><div class="wrap narrow center">
  <div class="callout orange reveal">
    <h3 style="margin-bottom:8px">ODR Support runs on a dedicated micro-site</h3>
    <p style="margin-bottom:16px">For clarity and focus, the ODR programme — how it works, choosing a provider, resources and the application — lives on a separate MSME Catalyst ODR site.</p>
    <a class="btn btn-primary btn-lg btn-arrow" href="odr/index.html">Go to the ODR micro-site</a>
    <p class="notice" style="margin-top:18px;display:inline-block">You are being taken to the MSME Catalyst ODR micro-site. This page auto-redirects in <span id="redir">6</span> seconds.</p>
  </div>
  <div class="steps mt-l" style="text-align:left">
    <div class="step reveal"><h3>Apply</h3><p>Submit your case and documents.</p></div>
    <div class="step reveal"><h3>Initial screening</h3><p>We check completeness and fit.</p></div>
    <div class="step reveal"><h3>Case preparation</h3><p>The Cluster Recovery Cell helps you organise evidence.</p></div>
    <div class="step reveal"><h3>Neutral referral</h3><p>You are connected to an appropriate independent provider — your choice.</p></div>
    <div class="step reveal"><h3>Track &amp; learn</h3><p>Outcomes feed aggregate, de-identified learning.</p></div>
  </div>
  <div class="boundary reveal mt-l" style="text-align:left">
    <h3>Important boundaries</h3>
    <ul>
      <li>MSME Catalyst is not an ODR platform, law firm, mediator, arbitrator or court</li>
      <li>It does not provide legal advice, compel participation, collect money or guarantee recovery</li>
      <li>The statutory MSEFC pathway remains available and is not replaced</li>
    </ul>
  </div>
</div></section>
<script>(function(){{var n=6,el=document.getElementById('redir');var t=setInterval(function(){{n--;if(el)el.textContent=n;if(n<=0){{clearInterval(t);window.location.href='odr/index.html';}}}},1000);}})();</script>
"""
    write("odr-support.html", doc("ODR Support | MSME Catalyst",
        "Resolve payment friction before it becomes business failure. MSME Catalyst helps you prepare your case and connect with an independent ODR provider.",
        odr_support, active="odr-support.html"))

    # ===================== MEMBERSHIP =====================
    membership = f"""
{page_hero("Membership", "Membership is a working role inside cluster infrastructure.",
  "Membership is institutional, invitation-led and outcome-oriented — not generic logo placement or event access.", "Membership", key="membership")}
<section class="section" id="membership"><div class="wrap">
  <div class="two-col">
    <div class="reveal">
      <span class="kicker">Who membership is for</span>
      <h2 class="h2 mt-s">Institutions ready to do the work</h2>
      <ul class="flist mt-m">
        <li>Banks, NBFCs and regulated financial institutions</li>
        <li>Fintechs, TSPs, LSPs, data and infrastructure providers</li>
        <li>Rating and ecosystem institutions</li>
        <li>Anchor corporates and market-access organisations</li>
        <li>Funders supporting execution infrastructure</li>
      </ul>
    </div>
    <div class="reveal">
      <span class="kicker">Membership value</span>
      <h2 class="h2 mt-s">What members get</h2>
      <div class="grid g2 mt-m">
        <div class="card reveal"><h3>Live pilot access</h3><p>Participate in real cluster pilots.</p></div>
        <div class="card reveal"><h3>Partnership access</h3><p>Structured routes to collaborate.</p></div>
        <div class="card reveal"><h3>Readiness &amp; friction intelligence</h3><p>Aggregated cluster insight.</p></div>
        <div class="card reveal"><h3>Credible visibility</h3><p>Recognition tied to contribution.</p></div>
      </div>
      <p class="muted mt-s">Plus participation in relevant working groups and ecosystem design.</p>
    </div>
  </div>
</div></section>

<section class="section bg-sand"><div class="wrap narrow">
  <div class="center reveal"><span class="kicker" style="justify-content:center">Apply</span><h2 class="h2 mt-s">Membership application</h2><p class="muted mt-s">Submissions are reviewed by the Secretariat and managed in the membership CRM.</p></div>
  <form class="form-card mt-l form" data-demo data-endpoint="/api/public/membership-apply">
    <div class="form-grid fg2">
      <div class="field"><label>Legal entity name <span class="req">*</span></label><input class="input" name="legal_name" required></div>
      <div class="field"><label>Brand / display name</label><input class="input" name="brand_name"></div>
    </div>
    <div class="form-grid fg2">
      <div class="field"><label>Membership category <span class="req">*</span></label>
        <select class="select" name="category" required><option value="">Select…</option><option>Lenders</option><option>Fintechs</option><option>Infrastructure</option><option>Anchors</option><option>Ecosystem Institutions</option><option>ODR Providers</option><option>Donors &amp; Funding Partners</option></select></div>
      <div class="field"><label>Industry type</label><input class="input" name="industry"></div>
    </div>
    <div class="form-grid fg2">
      <div class="field"><label>Website</label><input class="input" name="website" type="url" placeholder="https://"></div>
      <div class="field"><label>GSTIN / PAN</label><input class="input" name="gstin_pan"></div>
    </div>
    <div class="field"><label>Registered address</label><textarea class="textarea" name="address" style="min-height:80px"></textarea></div>
    <hr class="divider">
    <div class="form-grid fg2">
      <div class="field"><label>Primary contact name <span class="req">*</span></label><input class="input" name="contact_name" required></div>
      <div class="field"><label>Designation</label><input class="input" name="designation"></div>
    </div>
    <div class="form-grid fg2">
      <div class="field"><label>Email <span class="req">*</span></label><input class="input" name="email" type="email" required></div>
      <div class="field"><label>Phone <span class="req">*</span></label><input class="input" name="phone" type="tel" required></div>
    </div>
    <div class="field"><label>Logo upload</label><div class="file">Drag a logo here or click to upload · PNG/SVG</div></div>
    <label class="checkrow"><input type="checkbox" name="logo_consent"> We consent to our logo being displayed on the public members section once membership is active and paid.</label>
    <button class="btn btn-primary btn-lg" type="submit">Submit application</button>
    <div class="form-success" style="display:none" role="status"><div class="callout"><strong>Application received.</strong> Our team will be in touch. This form connects to the membership CRM where status, invoicing and renewals are managed.</div></div>
  </form>
</div></section>

<section class="section"><div class="wrap">
  <div class="center reveal" style="max-width:56ch;margin-inline:auto"><span class="kicker" style="justify-content:center">Members</span><h2 class="h2 mt-s">Our members</h2><p class="muted mt-s">This wall is generated automatically from active, paid CRM records — only for organisations that have given logo-display consent. Logos are never manually uploaded to the page.</p></div>
  <div class="filters center mt-m" style="justify-content:center" data-filter-group data-target="#member-wall">
    <button data-filter="all" class="active">All</button><button data-filter="lenders">Lenders</button><button data-filter="fintechs">Fintechs</button><button data-filter="infra">Infrastructure</button><button data-filter="anchors">Anchors</button><button data-filter="ecosystem">Ecosystem</button><button data-filter="odr">ODR Providers</button>
  </div>
  <div class="logowall mt-m" id="member-wall">
    <div class="lw" data-cat="lenders"><span>Member logo</span></div>
    <div class="lw" data-cat="fintechs"><span>Member logo</span></div>
    <div class="lw" data-cat="infra"><span>Member logo</span></div>
    <div class="lw" data-cat="anchors"><span>Member logo</span></div>
    <div class="lw" data-cat="ecosystem"><span>Member logo</span></div>
    <div class="lw" data-cat="odr"><span>Member logo</span></div>
    <div class="lw" data-cat="lenders"><span>Member logo</span></div>
    <div class="lw" data-cat="fintechs"><span>Member logo</span></div>
  </div>
  <p class="notice mt-m">In production these tiles are populated by the CRM API (<code>GET /api/members</code>) — see the back-end. A logo appears when status is <em>Active</em> and website display is <em>Paid and Live</em>, and disappears automatically on expiry, overdue payment or Secretariat override.</p>
</div></section>

<section class="section bg-sand" id="donors"><div class="wrap">
  <div class="center reveal" style="max-width:62ch;margin-inline:auto">
    <span class="kicker" style="justify-content:center">Donors &amp; Funding Partners</span>
    <h2 class="h2 mt-s">Fund the infrastructure that makes MSME growth support usable.</h2>
    <p class="muted mt-s">Donor and CSR funding supports cluster capability centres, enterprise readiness, local coordination, payment-friction support, monitoring, evaluation and reusable execution playbooks.</p>
  </div>
  <div class="grid g3 mt-l">
    <div class="card hoverable reveal"><div class="ico">🏗️</div><h3>Cluster capability centres</h3><p>The physical and human infrastructure that makes support reachable.</p></div>
    <div class="card hoverable reveal"><div class="ico orange">🤝</div><h3>Local coordination</h3><p>The convening capacity that keeps participants aligned.</p></div>
    <div class="card hoverable reveal"><div class="ico">📋</div><h3>Enterprise readiness</h3><p>Preparation and documentation that let support land.</p></div>
    <div class="card hoverable reveal"><div class="ico orange">💧</div><h3>Payment-friction support</h3><p>Case preparation and neutral referral for receivables.</p></div>
    <div class="card hoverable reveal"><div class="ico">📊</div><h3>Monitoring &amp; evaluation</h3><p>Scorecards, dashboards and honest measurement of outcomes.</p></div>
    <div class="card hoverable reveal"><div class="ico orange">📘</div><h3>Reusable execution playbooks</h3><p>Learning packaged so the next cluster starts ahead.</p></div>
  </div>
  <div class="boundary reveal mt-l">
    <h3>Safeguards</h3>
    <ul>
      <li>Funding does not buy influence over individual lending decisions, ODR referrals, policy positions or case outcomes</li>
      <li>Donors receive outcome and learning reporting, not operational control</li>
    </ul>
  </div>
  <div class="center mt-l reveal"><a class="btn btn-primary btn-lg btn-arrow" href="contact.html">Talk to us about funding</a></div>
</div></section>
"""
    write("membership.html", doc("Membership | MSME Catalyst",
        "Membership in MSME Catalyst is a working, institutional role inside cluster infrastructure — invitation-led and outcome-oriented — plus Donors & Funding Partners.",
        membership, active="membership.html"))

    # ===================== REPORTS & PAPERS =====================
    rep_cats = ["Reports","White papers","Cluster maps","Scorecards","Research"]
    rep_filters = "".join(f'<button data-filter="{c.lower().replace(" ","-")}">{c}</button>' for c in rep_cats)
    rep_items = ""
    sample = [("Report","reports"),("White paper","white-papers"),("Cluster map","cluster-maps"),("Scorecard","scorecards"),("Research","research"),("Report","reports")]
    for i,(label,cat) in enumerate(sample):
        rep_items += f"""
      <article class="rcard reveal" data-cat="{cat}">
        <div class="thumb {'o' if i%2 else ''}"><span class="badge {'orange' if i%2 else ''} tag">{label}</span></div>
        <div class="rb"><h3>Publication title to be added</h3><p class="muted" style="font-size:.9rem">Short summary managed in the CMS with tags, author, publication date, file upload and SEO fields.</p><div class="meta">Category: {label} · 2026</div></div>
      </article>"""
    reports = f"""
{page_hero("Reports &amp; Papers", "Shared evidence, published openly.",
  "Reports, white papers, cluster maps, scorecards and research — the platform's aggregated execution insight.", "Knowledge Hub · Reports &amp; Papers", key="reports")}
<section class="section"><div class="wrap">
  <div class="crumb" style="margin-bottom:20px"><a href="knowledge.html">← Back to Knowledge Hub</a></div>
  <div class="filters reveal" data-filter-group data-target="#rep-grid">
    <button data-filter="all" class="active">All</button>{rep_filters}
  </div>
  <div class="grid g3 mt-l" id="rep-grid" data-cms-list="reports" data-cms-render="rcard">{rep_items}</div>
  <p class="notice mt-l">Each item is a CMS entry: title, summary, thumbnail, category, tags, author, publication date, file upload, external link, SEO fields and visibility status.</p>
</div></section>
"""
    write("reports.html", doc("Reports & Papers | MSME Catalyst",
        "Reports, white papers, cluster maps, scorecards and research from MSME Catalyst.",
        reports, active="reports.html"))

    # ===================== PODCASTS =====================
    pod_items = "".join(f"""
      <article class="rcard reveal">
        <div class="thumb {'o' if i%2 else ''}"><span class="badge {'orange' if i%2 else ''} tag">Episode {i+1:02d}</span></div>
        <div class="rb"><h3>Episode title to be added</h3><p class="muted" style="font-size:.9rem">Guest name · Organisation. Description managed in the CMS.</p>
        <div class="pill-row" style="margin:4px 0"><span class="badge neutral">Spotify</span><span class="badge neutral">YouTube</span><span class="badge neutral">Apple</span></div>
        <div class="meta">Transcript · tags · related reports &amp; blogs · share</div></div>
      </article>""" for i in range(6))
    podcasts = f"""
{page_hero("Podcasts", "Conversations on convergence.",
  "Practitioners, institutions and policymakers on what it takes to make MSME support work together.", "Knowledge Hub · Podcasts", key="podcasts")}
<section class="section"><div class="wrap">
  <div class="crumb" style="margin-bottom:20px"><a href="knowledge.html">← Back to Knowledge Hub</a></div>
  <div class="grid g3" data-cms-list="podcasts" data-cms-render="rcard">{pod_items}</div>
  <p class="notice mt-l">Each episode is a CMS entry: cover image, title, guest &amp; organisation, description, audio/video embed, Spotify / YouTube / Apple links, transcript, tags, related reports &amp; blogs and social-share links.</p>
</div></section>
"""
    write("podcasts.html", doc("Podcasts | MSME Catalyst",
        "The MSME Catalyst podcast — conversations on making MSME support converge.",
        podcasts, active="podcasts.html"))

    # ===================== EVENTS & LABS =====================
    ev_cats = ["Working labs","Roundtables","Events"]
    ev_filters = "".join(f'<button data-filter="{c.lower().replace(" ","-")}">{c}</button>' for c in ev_cats)
    ev_sample = [("Working lab","working-labs"),("Roundtable","roundtables"),("Event","events"),("Working lab","working-labs")]
    ev_items = ""
    for i,(label,cat) in enumerate(ev_sample):
        ev_items += f"""
      <article class="rcard reveal" data-cat="{cat}">
        <div class="thumb {'o' if i%2 else ''}"><span class="badge {'orange' if i%2 else ''} tag">{label}</span></div>
        <div class="rb"><h3>Event / lab title to be added</h3><p class="muted" style="font-size:.9rem">Working labs, roundtables and events — managed in the CMS with date, summary, tags and links.</p><div class="meta">Category: {label} · 2026</div></div>
      </article>"""
    events = f"""
{page_hero("Events &amp; Labs", "Where the ecosystem does the work together.",
  "Working labs, roundtables and convenings that turn shared intent into shared execution.", "Knowledge Hub · Events &amp; Labs", key="events")}
<section class="section"><div class="wrap">
  <div class="crumb" style="margin-bottom:20px"><a href="knowledge.html">← Back to Knowledge Hub</a></div>
  <div class="filters reveal" data-filter-group data-target="#ev-grid">
    <button data-filter="all" class="active">All</button>{ev_filters}
  </div>
  <div class="grid g3 mt-l" id="ev-grid" data-cms-list="events" data-cms-render="rcard">{ev_items}</div>
  <p class="notice mt-l">Each item is a CMS entry (Events &amp; Labs collection): title, summary, thumbnail, category, date, tags, external link and visibility status.</p>
</div></section>
"""
    write("events.html", doc("Events & Labs | MSME Catalyst",
        "Working labs, roundtables and convenings from MSME Catalyst.",
        events, active="events.html"))

    # ===================== KNOWLEDGE HUB (landing) =====================
    knowledge = f"""
{page_hero("Knowledge Hub", "Evidence, insight and convening — in one place.",
  "Reports and papers, writing, conversations and live convenings. The platform's aggregated execution insight, grouped for easy access.", "Knowledge Hub", key="knowledge")}
<section class="section"><div class="wrap">
  <div class="grid g2">
    <a class="card hoverable reveal" href="reports.html" data-section="reports" style="display:block"><div class="ico">📊</div><h3>Reports &amp; Papers</h3><p>Reports, white papers, cluster maps, scorecards and research.</p><span class="textlink mt-s" style="display:inline-block">Browse →</span></a>
    <a class="card hoverable reveal" href="blogs.html" data-section="blogs" style="display:block"><div class="ico orange">✍️</div><h3>Blogs</h3><p>Short, practical writing on convergence, receivables, capability and capital.</p><span class="textlink mt-s" style="display:inline-block">Read →</span></a>
    <a class="card hoverable reveal" href="podcasts.html" data-section="podcasts" style="display:block"><div class="ico">🎙️</div><h3>Podcasts</h3><p>Conversations with practitioners, institutions and policymakers.</p><span class="textlink mt-s" style="display:inline-block">Listen →</span></a>
    <a class="card hoverable reveal" href="events.html" data-section="events" style="display:block"><div class="ico orange">🗓️</div><h3>Events &amp; Labs</h3><p>Working labs, roundtables and convenings.</p><span class="textlink mt-s" style="display:inline-block">Explore →</span></a>
  </div>
</div></section>
{cta_band()}
"""
    write("knowledge.html", doc("Knowledge Hub | MSME Catalyst",
        "The MSME Catalyst Knowledge Hub — Reports & Papers, Blogs, Podcasts, and Events & Labs.",
        knowledge, active="knowledge.html"))

    # ===================== BLOGS =====================
    blog_cats = ["Convergence","Receivables","Capability","Capital","Policy","Clusters"]
    blog_filters = "".join(f'<button data-filter="{c.lower()}">{c}</button>' for c in blog_cats)
    blog_items = "".join(f"""
      <article class="rcard reveal" data-cat="{blog_cats[i%len(blog_cats)].lower()}">
        <div class="thumb {'o' if i%2 else ''}"><span class="badge {'orange' if i%2 else ''} tag">{blog_cats[i%len(blog_cats)]}</span></div>
        <div class="rb"><h3>Article headline to be added</h3><p class="muted" style="font-size:.9rem">Short summary from the CMS.</p><div class="meta">Author · 6 min read · 2026</div></div>
      </article>""" for i in range(6))
    blogs = f"""
{page_hero("Blogs", "Notes from the ground.",
  "Short, practical writing on convergence, receivables, capability, capital and cluster policy.", "Knowledge Hub · Blogs", key="blogs")}
<section class="section"><div class="wrap">
  <div class="crumb" style="margin-bottom:20px"><a href="knowledge.html">← Back to Knowledge Hub</a></div>
  <div class="two-col" style="align-items:stretch">
    <article class="rcard reveal" style="grid-column:1/-1">
      <div class="two-col" style="gap:0;align-items:stretch">
        <div class="thumb" style="min-height:240px"><span class="badge orange tag">Featured</span></div>
        <div class="rb" style="justify-content:center"><span class="kicker">Featured article</span><h3 style="font-size:1.5rem;margin-top:8px">The featured post headline appears here</h3><p class="muted">Set any article as the featured piece in the CMS. Includes author details, related articles and social sharing.</p><a class="textlink" href="#">Read article</a></div>
      </div>
    </article>
  </div>
  <div class="two-col mt-l" style="align-items:start">
    <div>
      <div class="field" style="max-width:340px"><input class="input" placeholder="Search articles…"></div>
      <div class="filters mt-m" data-filter-group data-target="#blog-grid">
        <button data-filter="all" class="active">All</button>{blog_filters}
      </div>
      <div class="grid g2 mt-l" id="blog-grid" data-cms-list="blogs" data-cms-render="rcard">{blog_items}</div>
    </div>
    <aside class="card reveal">
      <h3>Newsletter</h3>
      <p class="muted">Occasional, useful. No noise.</p>
      <form class="form mt-s" data-demo data-endpoint="/api/public/newsletter">
        <input class="input" name="email" type="email" placeholder="you@company.com" required>
        <button class="btn btn-primary" type="submit">Subscribe</button>
        <div class="form-success" style="display:none"><div class="callout">Thanks — you're on the list.</div></div>
      </form>
      <hr class="divider" style="margin:20px 0">
      <h3>Editorial workflow</h3>
      <p class="muted" style="font-size:.9rem">Draft → Review → Published → Archived, managed in the admin CMS with SEO fields and a social-share image.</p>
    </aside>
  </div>
</div></section>
"""
    write("blogs.html", doc("Blogs | MSME Catalyst",
        "Practical writing on MSME convergence, receivables, capability, capital and cluster policy.",
        blogs, active="blogs.html"))

    # ===================== CONTACT =====================
    contact = f"""
{page_hero("Contact", "Let's find the right door.",
  "Whether you're an MSME, an institution, a funder or a partner, there's a clear route to reach us.", "Contact", key="contact")}
<section class="section"><div class="wrap">
  <div class="two-col" style="align-items:start">
    <div class="reveal">
      <div class="grid g2">
        <div class="card"><div class="ico">✉️</div><h3>General enquiries</h3><p><a class="textlink" href="mailto:info@msmecatalyst.org">info@msmecatalyst.org</a></p></div>
        <div class="card"><div class="ico orange">🤝</div><h3>Membership</h3><p><a class="textlink" href="mailto:membership@msmecatalyst.org">membership@msmecatalyst.org</a></p></div>
        <div class="card"><div class="ico">💛</div><h3>Donors &amp; partnerships</h3><p><a class="textlink" href="mailto:partnerships@msmecatalyst.org">partnerships@msmecatalyst.org</a></p></div>
        <div class="card"><div class="ico orange">⚖️</div><h3>ODR support</h3><p><a class="textlink" href="odr/apply.html">Apply for ODR support →</a></p></div>
      </div>
      <div class="card mt-m"><h3>Registered office</h3><p class="muted">Digital Growth Infrastructure Foundation (Section 8)<br>CIN: U94990MH2026NPL468930<br>WeWork 247 Park, 13th Floor, Vikhroli Corp, Mumbai, Mumbai, Mumbai – 400079, Maharashtra</p></div>
      <div class="card mt-m"><h3>Follow</h3>
        <div class="socials" style="margin-top:10px">
          <a href="#" style="background:var(--sand);color:var(--ink-2)">in</a><a href="#" style="background:var(--sand);color:var(--ink-2)">𝕏</a><a href="#" style="background:var(--sand);color:var(--ink-2)">◎</a><a href="#" style="background:var(--sand);color:var(--ink-2)">▶</a><a href="#" style="background:var(--sand);color:var(--ink-2)">f</a><a href="#" style="background:var(--sand);color:var(--ink-2)">♫</a>
        </div>
      </div>
    </div>
    <div class="reveal">
      <form class="form-card form" data-demo data-endpoint="/api/public/contact">
        <h3 style="font-size:1.3rem">General enquiry</h3>
        <div class="form-grid fg2">
          <div class="field"><label>Name <span class="req">*</span></label><input class="input" name="name" required></div>
          <div class="field"><label>Organisation</label><input class="input" name="org"></div>
        </div>
        <div class="form-grid fg2">
          <div class="field"><label>Email <span class="req">*</span></label><input class="input" name="email" type="email" required></div>
          <div class="field"><label>Phone</label><input class="input" name="phone" type="tel"></div>
        </div>
        <div class="field"><label>Enquiry category <span class="req">*</span></label>
          <select class="select" name="enquiry_type" required>
            <option value="">Select…</option>
            <option>General enquiry</option>
            <option>Membership</option>
            <option>Donors &amp; Funding Partners</option>
            <option>Partnerships</option>
            <option>ODR Support</option>
            <option>Media / Speaking</option>
            <option>Other</option>
          </select></div>
        <div class="field"><label>Message <span class="req">*</span></label><textarea class="textarea" name="message" required></textarea></div>
        <label class="checkrow"><input type="checkbox" name="consent" required> I consent to MSME Catalyst contacting me in response to this enquiry and storing these details for that purpose. <span class="req">*</span></label>
        <button class="btn btn-primary btn-lg" type="submit">Send message</button>
        <div class="form-success" style="display:none"><div class="callout"><strong>Thank you.</strong> We'll be in touch shortly.</div></div>
      </form>
    </div>
  </div>
  <div class="boundary reveal mt-l" style="border-left-color:var(--green)">
    <h3>Statutory details</h3>
    <p style="margin-bottom:4px"><strong>Digital Growth Infrastructure Foundation</strong> · Section 8 not-for-profit company</p>
    <p style="margin-bottom:4px">CIN: U94990MH2026NPL468930</p>
    <p style="margin-bottom:0">Registered Office: WeWork 247 Park, 13th Floor, Vikhroli Corp, Mumbai, Mumbai, Mumbai – 400079, Maharashtra</p>
  </div>
</div></section>
"""
    write("contact.html", doc("Contact | MSME Catalyst",
        "Contact MSME Catalyst — general enquiries, membership, funding & partnerships, and ODR support.",
        contact, active="contact.html"))

    # ===================== PRIVACY & TERMS =====================
    legal_body = lambda title, intro, secs: f"""
{page_hero("Legal", title, intro, title)}
<section class="section"><div class="wrap narrow stack">{secs}</div></section>"""
    privacy_secs = "".join(f"<h3>{h}</h3><p class='muted'>{p}</p>" for h,p in [
        ("Who we are","This site is operated by Digital Growth Infrastructure Foundation, a Section 8 not-for-profit, under the MSME Catalyst platform."),
        ("What we collect","Information you provide through membership, ODR and contact forms, and standard analytics on site usage. Document uploads are stored securely and access-controlled."),
        ("How we use it","To operate the platform, process applications, coordinate referrals and improve the service. We publish only aggregated, de-identified insight."),
        ("Consent & choice","Forms capture explicit consent for contact and, where relevant, referral and logo display. You may withdraw consent at any time."),
        ("Your rights","You may request access to, correction of, or deletion of your personal data by contacting us."),
        ("Contact","privacy@msmecatalyst.org"),
    ])
    write("privacy.html", doc("Privacy Policy | MSME Catalyst","Privacy policy for the MSME Catalyst platform.",
        legal_body("Privacy Policy","How MSME Catalyst handles your data, consent and document uploads.",privacy_secs)))
    terms_secs = "".join(f"<h3>{h}</h3><p class='muted'>{p}</p>" for h,p in [
        ("Nature of the platform","MSME Catalyst is a neutral convergence layer. It does not lend, underwrite, provide legal advice, adjudicate disputes or operate an ODR platform."),
        ("No professional relationship","Using this site or submitting a form does not create a lawyer-client relationship or any advisory relationship, and does not guarantee any outcome or recovery."),
        ("Referrals","Any referral to a lender, capability institution or ODR provider is neutral. MSMEs retain choice of provider. Providers retain all their own decisions."),
        ("Statutory routes","The statutory MSEFC pathway and all court and arbitral routes remain available and are not replaced by MSME Catalyst."),
        ("Content","CMS-published content is provided for information. Reasonable care is taken but no warranty is given as to completeness or fitness for a particular purpose."),
        ("Contact","legal@msmecatalyst.org"),
    ])
    write("terms.html", doc("Terms | MSME Catalyst","Terms of use for the MSME Catalyst platform.",
        legal_body("Terms of Use","The terms governing use of the MSME Catalyst platform.",terms_secs)))
