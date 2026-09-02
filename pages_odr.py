# -*- coding: utf-8 -*-
"""ODR micro-site pages. Lives under /public/odr/ with its own navigation."""

ODR_NAV = [
    ("Home","index.html"),("About the Programme","about.html"),("How ODR Works","how-it-works.html"),
    ("Choose a Provider","choose-provider.html"),("Resources","resources.html"),("Blogs","blogs.html"),
    ("Papers","papers.html"),("Podcasts","podcasts.html"),("Apply","apply.html"),("Contact","contact.html"),
]

def build(g):
    write = g["write"]; brand = g["brand"]; footer_disc = None
    A = "../assets"  # asset prefix from /odr/
    BRAND = brand("../", 40)
    BRAND_FOOT = f'<span style="display:inline-block;background:#fff;padding:10px 14px;border-radius:12px">{brand("../", 44)}</span>'

    def header(active):
        links = "".join(
            f'<a href="{h}" class="{"active" if active==h else ""}">{t}</a>' for t,h in ODR_NAV)
        mobile = "".join(f'<a href="{h}">{t}</a>' for t,h in ODR_NAV)
        return f"""<header class="site-header">
  <div class="wrap nav">
    <a class="brand" href="index.html" aria-label="MSME Catalyst ODR home">
      {BRAND}
      <span class="badge orange" style="margin-left:4px">ODR</span>
    </a>
    <nav class="nav-links" aria-label="Primary">{links}</nav>
    <div class="nav-cta">
      <a class="btn btn-ghost" href="../index.html">← Main site</a>
      <a class="btn btn-primary btn-arrow" href="apply.html">Apply for Support</a>
    </div>
    <button class="nav-toggle" aria-label="Menu" aria-expanded="false"><span></span><span></span><span></span></button>
  </div>
  <div class="mobile-menu">{mobile}
    <div class="mm-cta"><a class="btn btn-ghost" href="../index.html">← Main MSME Catalyst site</a><a class="btn btn-primary" href="apply.html">Apply for Support</a></div>
  </div>
</header>"""

    def footer():
        return f"""<footer class="site-footer">
  <div class="wrap">
    <div class="foot-grid">
      <div class="foot-brand">{BRAND_FOOT}
        <p style="margin-top:16px;max-width:36ch;font-size:.92rem;color:#9aa8a0">The MSME Catalyst ODR programme helps businesses organise payment-friction cases and connect with independent providers. Part of MSME Catalyst, operated by Digital Growth Infrastructure Foundation (Section 8).</p>
      </div>
      <div><h4>Programme</h4><ul class="foot-links"><li><a href="about.html">About the Programme</a></li><li><a href="how-it-works.html">How ODR Works</a></li><li><a href="choose-provider.html">Choose a Provider</a></li><li><a href="apply.html">Apply for Support</a></li></ul></div>
      <div><h4>Learn</h4><ul class="foot-links"><li><a href="resources.html">Resources</a></li><li><a href="papers.html">Papers</a></li><li><a href="blogs.html">Blogs</a></li><li><a href="podcasts.html">Podcasts</a></li></ul></div>
      <div><h4>MSME Catalyst</h4><ul class="foot-links"><li><a href="../index.html">Main site</a></li><li><a href="../programmes.html">Programmes</a></li><li><a href="../membership.html">Membership</a></li><li><a href="contact.html">Contact</a></li></ul></div>
    </div>
    <div class="foot-disclaimer">
      <strong>Important.</strong> MSME Catalyst is not an ODR platform, law firm, mediator, arbitrator or court. It does not provide legal advice, compel participation, collect money or guarantee recovery. Submitting a form does not create a lawyer-client relationship. The statutory MSEFC pathway remains available and is not replaced. Independent ODR providers retain all dispute-resolution decisions; MSMEs retain choice of provider.
    </div>
    <div class="foot-legal" style="font-size:.8rem;color:#8f9a92;margin-top:20px;line-height:1.7">
      <strong style="color:#c9d2cc">Digital Growth Infrastructure Foundation</strong> · Section 8 not-for-profit · CIN: U94990MH2026NPL468930<br>
      Registered Office: WeWork 247 Park, 13th Floor, Vikhroli Corp, Mumbai, Mumbai, Mumbai – 400079, Maharashtra
    </div>
    <div class="foot-bottom"><span>© <span id="yr">2026</span> Digital Growth Infrastructure Foundation · MSME Catalyst ODR</span><span><a href="../privacy.html">Privacy</a> · <a href="../terms.html">Terms</a></span></div>
  </div>
</footer>"""

    def doc(title, desc, body, active):
        return f"""<!doctype html>
<html lang="en"><head>
<script>document.documentElement.className+=' js';</script>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{title}</title><meta name="description" content="{desc}">
<meta property="og:title" content="{title}"><meta name="theme-color" content="#17211B">
<link rel="icon" href="{A}/img/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="{A}/css/styles.css">
</head><body>
{header(active)}
<main>{body}</main>
{footer()}
<script src="{A}/js/main.js"></script>
</body></html>"""

    def phero(kicker,h1,lead,crumb=""):
        cr = f'<div class="crumb"><a href="index.html">ODR Home</a> · {crumb}</div>' if crumb else ""
        return f'<section class="page-hero"><div class="wrap">{cr}<span class="kicker">{kicker}</span><h1 class="h1" style="margin-top:16px;max-width:22ch">{h1}</h1><p class="lead mt-s maxch">{lead}</p></div></section>'

    # -------- ODR HOME --------
    home = f"""
<section class="hero"><div class="wrap hero-inner">
  <div class="two-col wide-left">
    <div class="reveal in">
      <span class="kicker">MSME Catalyst | ODR Support</span>
      <h1 class="h1" style="margin-top:16px">Resolve payment friction before it becomes <span style="color:var(--orange)">business failure</span>.</h1>
      <p class="lead mt-m maxch">MSME Catalyst helps businesses facing payment-related commercial friction organise their documents, understand possible routes, and connect with an appropriate independent provider.</p>
      <div class="hero-ctas">
        <a class="btn btn-primary btn-lg btn-arrow" href="apply.html">Apply for Support</a>
        <a class="btn btn-dark btn-lg" href="how-it-works.html">How ODR Works</a>
        <a class="btn btn-ghost btn-lg" href="choose-provider.html">Choose a Provider</a>
      </div>
    </div>
    <div class="reveal in">
      <div class="form-card">
        <span class="kicker">The ODR journey</span>
        <div class="steps mt-s">
          <div class="step" style="padding:16px 18px 16px 64px"><h3 style="font-size:1rem">Apply</h3></div>
          <div class="step" style="padding:16px 18px 16px 64px"><h3 style="font-size:1rem">Initial screening</h3></div>
          <div class="step" style="padding:16px 18px 16px 64px"><h3 style="font-size:1rem">Case preparation</h3></div>
          <div class="step" style="padding:16px 18px 16px 64px"><h3 style="font-size:1rem">Neutral referral</h3></div>
          <div class="step" style="padding:16px 18px 16px 64px"><h3 style="font-size:1rem">Track &amp; learn</h3></div>
        </div>
      </div>
    </div>
  </div>
</div></section>

<section class="section"><div class="wrap">
  <div class="center reveal" style="max-width:56ch;margin-inline:auto"><span class="kicker" style="justify-content:center">Plain-language help</span><h2 class="h2 mt-s">Understand your options before you act</h2></div>
  <div class="grid g3 mt-l">
    <div class="card hoverable reveal"><div class="ico">🧾</div><h3>Evidence preparation</h3><p>Get your invoices, POs, delivery proof and communications in order.</p></div>
    <div class="card hoverable reveal"><div class="ico orange">🤝</div><h3>Mediation &amp; conciliation</h3><p>Understand faster, less adversarial routes to resolution.</p></div>
    <div class="card hoverable reveal"><div class="ico">⚖️</div><h3>Arbitration &amp; statutory routes</h3><p>Know when MSEFC and formal routes are the right path.</p></div>
  </div>
</div></section>

<section class="section bg-sand"><div class="wrap">
  <div class="boundary reveal">
    <h3>What this programme is — and is not</h3>
    <ul>
      <li>MSME Catalyst is not an ODR platform, law firm, mediator, arbitrator or court</li>
      <li>It does not provide legal advice, compel participation, collect money or guarantee recovery</li>
      <li>The statutory MSEFC pathway remains available and is not replaced</li>
    </ul>
  </div>
</div></section>

<section class="section"><div class="wrap"><div class="cta-band reveal"><span class="kicker on-dark">Facing a delayed payment?</span><h2 class="h2 mt-s">Start with a prepared case.</h2><p class="mt-s">Apply and the Cluster Recovery Cell will help you organise your documents and understand your routes.</p><div class="hero-ctas"><a class="btn btn-primary btn-arrow" href="apply.html">Apply for Support</a></div></div></div></section>
"""
    write("odr/index.html", doc("MSME Catalyst ODR | Resolve payment friction",
        "MSME Catalyst ODR helps businesses organise payment-friction cases and connect with an appropriate independent provider.", home, "index.html"))

    # -------- ABOUT THE PROGRAMME --------
    about = f"""
{phero("About the Programme","A neutral bridge between payment friction and resolution.",
  "The ODR programme prepares MSMEs and refers them, neutrally, to independent providers — it never decides the outcome.","About the Programme")}
<section class="section"><div class="wrap narrow stack">
  <p class="lead">Late payments are one of the most common — and most damaging — sources of stress for a small business. Money that has been earned sits unpaid, cash flow tightens, and the enterprise is forced to choose between chasing the payment and running the business.</p>
  <p>The MSME Catalyst ODR programme exists to reduce that burden. We help you understand what is happening, organise the evidence you already have, and see the routes available — from direct resolution and mediation to arbitration and the statutory MSEFC pathway. When you are ready, we connect you, neutrally, to an appropriate independent provider.</p>
  <div class="callout"><strong>Neutral by design.</strong> We do not represent you or the other party, we do not take a cut of any recovery, and we do not steer you toward any particular provider. You keep the choice.</div>
  <h3>Who it's for</h3>
  <p class="muted">Any MSME facing payment-related commercial friction — a delayed receivable, a disputed invoice, or a stalled settlement with a buyer or counterparty.</p>
</div></section>
"""
    write("odr/about.html", doc("About the ODR Programme | MSME Catalyst",
        "A neutral bridge between payment friction and resolution for MSMEs.", about, "about.html"))

    # -------- HOW ODR WORKS --------
    how = f"""
{phero("How ODR Works","From a stuck payment to a prepared, referred case.",
  "Five clear steps. You stay in control at every one of them.","How ODR Works")}
<section class="section"><div class="wrap narrow">
  <div class="steps">
    <div class="step reveal"><h3>Apply</h3><p>Tell us about the enterprise, the counterparty, the amount and the paperwork you have. Upload what you've got.</p></div>
    <div class="step reveal"><h3>Initial screening</h3><p>We check the case for completeness and fit — is this payment friction, and is ODR a sensible route?</p></div>
    <div class="step reveal"><h3>Case preparation through the Cluster Recovery Cell</h3><p>We help you organise invoices, POs, delivery proof, communications and a clear timeline, so your case stands on its own.</p></div>
    <div class="step reveal"><h3>Neutral referral</h3><p>We connect you to an appropriate independent provider. You choose which one.</p></div>
    <div class="step reveal"><h3>Track &amp; learn</h3><p>With your consent, the outcome feeds aggregate, de-identified learning that improves the whole system.</p></div>
  </div>
  <h2 class="h2 mt-l">Ways a case can resolve</h2>
  <div class="grid g2 mt-m">
    <div class="card reveal"><h3>Direct resolution</h3><p class="muted">A well-prepared case often prompts payment without any formal process.</p></div>
    <div class="card reveal"><h3>Mediation</h3><p class="muted">A neutral third party helps both sides reach a voluntary settlement.</p></div>
    <div class="card reveal"><h3>Conciliation</h3><p class="muted">Similar to mediation, with the conciliator able to suggest terms.</p></div>
    <div class="card reveal"><h3>Arbitration</h3><p class="muted">A binding decision by an arbitrator, outside the court system.</p></div>
  </div>
  <div class="boundary mt-l reveal"><h3>Always remember</h3><ul><li>The statutory MSEFC pathway remains available and is not replaced</li><li>MSME Catalyst does not adjudicate, advise or guarantee recovery</li><li>You retain choice of provider throughout</li></ul></div>
</div></section>
"""
    write("odr/how-it-works.html", doc("How ODR Works | MSME Catalyst",
        "The five-step ODR journey and the ways a payment-friction case can resolve.", how, "how-it-works.html"))

    # -------- CHOOSE A PROVIDER --------
    choose = f"""
{phero("Choose a Provider","Three independent ODR providers. Your choice.",
  "Review the providers and select one. We will hand you over — we do not recommend, guarantee or control their outcome.","Choose a Provider")}
<section class="section"><div class="wrap">
  <div class="grid g3">
    <div class="card hoverable reveal"><div class="ico orange">A</div><h3>Provider A</h3><p>Short description managed in the CMS (name, logo, areas of support, website, display order, status).</p><div class="pill-row mt-s"><span class="badge neutral">Mediation</span><span class="badge neutral">Conciliation</span></div></div>
    <div class="card hoverable reveal"><div class="ico">B</div><h3>Provider B</h3><p>Short description managed in the CMS.</p><div class="pill-row mt-s"><span class="badge neutral">Arbitration</span><span class="badge neutral">ODR</span></div></div>
    <div class="card hoverable reveal"><div class="ico orange">C</div><h3>Provider C</h3><p>Short description managed in the CMS.</p><div class="pill-row mt-s"><span class="badge neutral">Mediation</span><span class="badge neutral">Arbitration</span></div></div>
  </div>

  <div class="form-card mt-l reveal" style="max-width:640px;margin-inline:auto">
    <form id="provider-select" class="form">
      <div class="field"><label>Select a provider to continue</label>
        <select class="select" id="provider-choice">
          <option value="">Choose a provider…</option>
          <option value="sama">Provider A</option>
          <option value="presolv">Provider B</option>
          <option value="centre">Provider C</option>
        </select>
        <span class="hint">You'll be redirected to the provider's own website to continue.</span>
      </div>
      <button class="btn btn-primary btn-lg" type="submit">Continue to provider</button>
    </form>
    <div id="redirect-box" style="display:none;margin-top:20px">
      <div class="callout orange center">
        <h3 style="margin-bottom:6px">You are being redirected to <span id="redirect-name">the provider</span>.</h3>
        <p style="margin-bottom:14px">Redirecting in <strong id="redirect-count">3</strong> seconds…</p>
        <a id="redirect-now" class="btn btn-primary" href="#" rel="noopener">Continue now →</a>
      </div>
    </div>
  </div>
  <p class="notice mt-l" style="max-width:640px;margin-inline:auto">The provider list is a CMS collection (“ODR Providers”): logo, name, description, areas of support, website URL, display order and status. Provider selection is tracked in analytics and the CRM. MSME Catalyst does not imply any recommendation, guarantee or control over the provider's outcome.</p>
</div></section>
"""
    write("odr/choose-provider.html", doc("Choose an ODR Provider | MSME Catalyst",
        "Review three independent ODR providers and select one. MSME Catalyst refers neutrally and does not control outcomes.", choose, "choose-provider.html"))

    # -------- RESOURCES --------
    res_cats = ["Explainers","Checklists","Templates","Guides","FAQs"]
    res_filters = "".join(f'<button data-filter="{c.lower()}">{c}</button>' for c in res_cats)
    res_items = "".join(f"""
      <article class="rcard reveal" data-cat="{res_cats[i%len(res_cats)].lower()}">
        <div class="thumb {'o' if i%2 else ''}"><span class="badge {'orange' if i%2 else ''} tag">{res_cats[i%len(res_cats)]}</span></div>
        <div class="rb"><h3>Resource title to be added</h3><p class="muted" style="font-size:.9rem">Category, tags, upload date and a downloadable PDF — all CMS-managed.</p><div class="meta">PDF · 2026 · Download</div></div>
      </article>""" for i in range(6))
    resources = f"""
{phero("Resources","A library to help you prepare.",
  "Explainer articles, checklists, templates and FAQs — in simple language, free to download.","Resources")}
<section class="section"><div class="wrap">
  <div class="field" style="max-width:360px"><input class="input" placeholder="Search resources…"></div>
  <div class="filters mt-m" data-filter-group data-target="#res-grid"><button data-filter="all" class="active">All</button>{res_filters}</div>
  <div class="grid g3 mt-l" id="res-grid" data-cms-list="odr_resources" data-cms-render="rcard">{res_items}</div>
  <h2 class="h2 mt-l">Frequently asked questions</h2>
  <div class="mt-m" style="max-width:760px">
    <details class="acc reveal"><summary>What counts as “payment friction”?</summary><div class="ac-body">A delayed receivable, a disputed invoice, or a stalled settlement with a buyer or counterparty — money you've earned that hasn't been paid.</div></details>
    <details class="acc reveal"><summary>Does MSME Catalyst take a cut of what I recover?</summary><div class="ac-body">No. MSME Catalyst does not collect money and does not take any share of recovery.</div></details>
    <details class="acc reveal"><summary>Will I still be able to go to MSEFC or court?</summary><div class="ac-body">Yes. The statutory MSEFC pathway and formal legal routes remain fully available. ODR is an option, not a replacement.</div></details>
    <details class="acc reveal"><summary>Do you give legal advice?</summary><div class="ac-body">No. We help you organise your case and understand routes. We do not provide legal advice, and submitting a form does not create a lawyer-client relationship.</div></details>
  </div>
</div></section>
"""
    write("odr/resources.html", doc("Resources | MSME Catalyst ODR",
        "A resource library of explainers, checklists, templates and FAQs on payment friction and ODR.", resources, "resources.html"))

    # -------- BLOGS --------
    blog_items = "".join(f"""
      <article class="rcard reveal"><div class="thumb {'o' if i%2 else ''}"><span class="badge {'orange' if i%2 else ''} tag">ODR</span></div>
      <div class="rb"><h3>Article headline to be added</h3><p class="muted" style="font-size:.9rem">CMS-published with categories, author profile and social sharing.</p><div class="meta">Author · 5 min · 2026</div></div></article>""" for i in range(6))
    blogs = f"""
{phero("Blogs","Plain-language writing on getting paid.",
  "Practical articles that keep you engaged and informed while you work through a case.","Blogs")}
<section class="section"><div class="wrap"><div class="grid g3">{blog_items}</div>
<p class="notice mt-l">CMS publishing with categories, author profiles and social sharing.</p></div></section>
"""
    write("odr/blogs.html", doc("Blogs | MSME Catalyst ODR",
        "Plain-language articles on payment friction, evidence and resolution routes.", blogs, "blogs.html"))

    # -------- PAPERS --------
    paper_items = "".join(f"""
      <article class="rcard reveal"><div class="thumb {'o' if i%2 else ''}"><span class="badge {'orange' if i%2 else ''} tag">{'White paper' if i%2 else 'Policy note'}</span></div>
      <div class="rb"><h3>Paper title to be added</h3><p class="muted" style="font-size:.9rem">Uploaded report, policy note or white paper with a downloadable document.</p><div class="meta">PDF · Download</div></div></article>""" for i in range(4))
    papers = f"""
{phero("Papers","Evidence and policy, in depth.",
  "Reports, policy notes and white papers on MSME receivables and dispute resolution.","Papers")}
<section class="section"><div class="wrap"><div class="grid g2">{paper_items}</div>
<p class="notice mt-l">Uploaded reports, policy notes and white papers — downloadable documents managed in the CMS.</p></div></section>
"""
    write("odr/papers.html", doc("Papers | MSME Catalyst ODR",
        "Reports, policy notes and white papers on MSME receivables and dispute resolution.", papers, "papers.html"))

    # -------- PODCASTS --------
    pod_items = "".join(f"""
      <article class="rcard reveal"><div class="thumb {'o' if i%2 else ''}"><span class="badge {'orange' if i%2 else ''} tag">Episode {i+1:02d}</span></div>
      <div class="rb"><h3>Episode title</h3><p class="muted" style="font-size:.9rem">Guest · organisation. Summary in the CMS.</p><div class="pill-row" style="margin:4px 0"><span class="badge neutral">Spotify</span><span class="badge neutral">YouTube</span><span class="badge neutral">Apple</span></div><div class="meta">Transcript · tags · share</div></div></article>""" for i in range(4))
    podcasts = f"""
{phero("Podcasts","Listen while you prepare.",
  "Short conversations on getting paid, resolving disputes and the realities of MSME cash flow.","Podcasts")}
<section class="section"><div class="wrap"><div class="grid g2">{pod_items}</div>
<p class="notice mt-l">Episode title, guest, summary, embedded Spotify/YouTube/Apple links, transcript, tags and share buttons — all CMS-managed.</p></div></section>
"""
    write("odr/podcasts.html", doc("Podcasts | MSME Catalyst ODR",
        "Conversations on getting paid, resolving disputes and MSME cash flow.", podcasts, "podcasts.html"))

    # -------- APPLY --------
    apply = f"""
{phero("Apply for ODR Support","Start with a prepared case.",
  "Give us the details and upload what you have. The Cluster Recovery Cell will help you organise your case and understand your routes.","Apply")}
<section class="section"><div class="wrap narrow">
  <form class="form-card form" data-demo data-endpoint="/api/public/odr-apply" enctype="multipart/form-data">
    <div class="form-grid fg2">
      <div class="field"><label>Applicant name <span class="req">*</span></label><input class="input" name="applicant" required></div>
      <div class="field"><label>Enterprise name <span class="req">*</span></label><input class="input" name="enterprise" required></div>
    </div>
    <div class="form-grid fg2">
      <div class="field"><label>Mobile number <span class="req">*</span></label><input class="input" name="mobile" type="tel" required></div>
      <div class="field"><label>Email <span class="req">*</span></label><input class="input" name="email" type="email" required></div>
    </div>
    <div class="form-grid fg2">
      <div class="field"><label>Location <span class="req">*</span></label><input class="input" name="location" required></div>
      <div class="field"><label>Cluster</label><input class="input" name="cluster"></div>
    </div>
    <div class="form-grid fg2">
      <div class="field"><label>Buyer / counterparty name <span class="req">*</span></label><input class="input" name="counterparty" required></div>
      <div class="field"><label>Amount involved (₹) <span class="req">*</span></label><input class="input" name="amount" type="number" required></div>
    </div>
    <div class="field"><label>Invoice / PO / delivery details</label><textarea class="textarea" name="invoice_details" style="min-height:90px" placeholder="Invoice numbers, PO references, delivery/GRN details…"></textarea></div>
    <div class="form-grid fg2">
      <div class="field"><label>Payment due date</label><input class="input" name="due_date" type="date"></div>
      <div class="field"><label>Action already taken</label><input class="input" name="action_taken" placeholder="Reminders, notice, follow-ups…"></div>
    </div>
    <div class="field"><label>Issue description <span class="req">*</span></label><textarea class="textarea" name="issue" required placeholder="Describe what happened, in your own words."></textarea></div>
    <div class="field"><label>Upload documents</label><input class="input" type="file" name="documents" multiple accept=".pdf,.jpg,.jpeg,.png"></div>
    <label class="checkrow"><input type="checkbox" name="consent" required> I consent to be contacted and referred to an appropriate independent provider. <span class="req">*</span></label>
    <label class="checkrow"><input type="checkbox" name="no_lawyer_relationship" required> I understand that this submission does not create a lawyer-client relationship, and that MSME Catalyst does not provide legal advice or guarantee recovery. <span class="req">*</span></label>
    <button class="btn btn-primary btn-lg" type="submit">Submit application</button>
    <div class="form-success" style="display:none"><div class="callout"><strong>Application received.</strong> The Cluster Recovery Cell will review your case and get in touch. You'll keep the choice of provider throughout.</div></div>
  </form>
</div></section>
"""
    write("odr/apply.html", doc("Apply for ODR Support | MSME Catalyst",
        "Apply for ODR support. The Cluster Recovery Cell helps you prepare your payment-friction case and refers you neutrally.", apply, "apply.html"))

    # -------- CONTACT --------
    contact = f"""
{phero("Contact","Questions about the ODR programme?","We're here to help you understand your options.","Contact")}
<section class="section"><div class="wrap"><div class="two-col" style="align-items:start">
  <div class="reveal">
    <div class="card"><div class="ico orange">⚖️</div><h3>ODR support</h3><p><a class="textlink" href="mailto:odr@msmecatalyst.org">odr@msmecatalyst.org</a></p></div>
    <div class="card mt-m"><div class="ico">📝</div><h3>Ready to apply?</h3><p><a class="textlink" href="apply.html">Apply for ODR support →</a></p></div>
    <div class="card mt-m"><h3>Registered office</h3><p class="muted">Digital Growth Infrastructure Foundation (Section 8)<br>CIN: U94990MH2026NPL468930<br>WeWork 247 Park, 13th Floor, Vikhroli Corp, Mumbai, Mumbai, Mumbai – 400079, Maharashtra</p></div>
  </div>
  <div class="reveal"><form class="form-card form" data-demo data-endpoint="/api/public/contact">
    <h3 style="font-size:1.25rem">Send a message</h3>
    <div class="form-grid fg2"><div class="field"><label>Name <span class="req">*</span></label><input class="input" name="name" required></div><div class="field"><label>Enterprise</label><input class="input" name="org"></div></div>
    <div class="field"><label>Email <span class="req">*</span></label><input class="input" name="email" type="email" required></div>
    <div class="field"><label>Message <span class="req">*</span></label><textarea class="textarea" name="message" required></textarea></div>
    <button class="btn btn-primary btn-lg" type="submit">Send</button>
    <div class="form-success" style="display:none"><div class="callout"><strong>Thanks.</strong> We'll reply shortly.</div></div>
  </form></div>
</div></div></section>
"""
    write("odr/contact.html", doc("Contact | MSME Catalyst ODR",
        "Contact the MSME Catalyst ODR programme.", contact, "contact.html"))
