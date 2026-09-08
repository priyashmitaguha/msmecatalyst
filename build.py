#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""MSME Catalyst static site generator.
Produces the public site (/public) and ODR micro-site (/public/odr) from shared
layout partials so the header, footer and design system stay consistent.
"""
import os, html
from bs4 import BeautifulSoup

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "public")

# ---- Editable-content registry ----------------------------------------
# Every call to T() registers a CMS-editable text block: the live pages carry
# the default text in the HTML (so static hosting works and SEO is intact),
# and the admin "Page Content" editor can override it. main.js hydrates any
# element carrying data-cms="<key>" with the admin value when one exists.
REG = {}  # key -> {default, label, page, multiline}

def _reg(key, default, label=None, multiline=False, page=None, kind="html"):
    """Register an editable block and return its default text (for custom markup).
    kind drives server-side sanitisation of admin input:
      html → allowlist-sanitised rich text · url → validated link · text → plain text."""
    REG[key] = {"default": default, "label": label or key.split(".")[-1].replace("_", " ").title(),
                "page": page or key.split(".")[0], "multiline": multiline, "kind": kind}
    return default

def T(key, default, tag="span", cls="", label=None, multiline=False, page=None):
    _reg(key, default, label, multiline, page)
    c = f' class="{cls}"' if cls else ""
    return f'<{tag} data-cms="{key}"{c}>{default}</{tag}>'

# ---- Automatic full-page editability ----------------------------------
# annotate() walks a page's <main> body and registers EVERY meaningful text
# block (headings, paragraphs, list items, quotes, table cells, standalone
# links and buttons) plus images (src + alt) as CMS-editable fields. Existing
# data-cms / data-cms-list markup and the shared header/footer are left alone
# (the header/footer carry their own global keys). Keys are assigned in document
# order (page.c1, page.c2 …) so they stay stable across rebuilds while the page
# structure is unchanged. main.js hydrates data-cms (innerHTML), data-cms-href
# (href), data-cms-src (src) and data-cms-alt (alt) from the saved overrides.
_BLOCK_TEXT = {"h1", "h2", "h3", "h4", "h5", "h6", "p", "li", "blockquote",
               "figcaption", "summary", "dt", "dd", "th", "td"}
_MULTILINE = {"p", "li", "blockquote", "dd", "figcaption", "td"}
_SKIP = {"script", "style", "svg", "template", "nav", "header", "footer", "button", "form"}

def _label_from(text, tag):
    t = " ".join((text or "").split())
    if len(t) > 46:
        t = t[:46].rstrip() + "…"
    kind = {"h1": "Heading", "h2": "Heading", "h3": "Subheading", "h4": "Subheading",
            "h5": "Subheading", "h6": "Subheading", "p": "Paragraph", "li": "List item",
            "blockquote": "Quote", "a": "Link", "td": "Table cell", "th": "Table heading",
            "summary": "Summary", "dt": "Term", "dd": "Definition",
            "figcaption": "Caption"}.get(tag, tag.title())
    return f"{kind}: {t}" if t else kind

def _blocked_ancestor(node):
    p = node.parent
    while getattr(p, "name", None):
        if p.name in _SKIP:
            return True
        if p.has_attr("data-cms") or p.has_attr("data-cms-list") or p.has_attr("data-cms-src"):
            return True
        p = p.parent
    return False

def annotate(body_html, page):
    """Return body_html with every meaningful element made CMS-editable, registered under `page`."""
    soup = BeautifulSoup(body_html, "html.parser")
    n = 0
    for el in soup.find_all(True):
        name = el.name
        # A data-cms-strip element (must be empty) is removed from the public output but
        # still CONSUMES its key number, so removing on-page content leaves a stable
        # numbering GAP instead of renumbering every following key — which would otherwise
        # misalign existing saved CMS overrides for this page.
        if el.has_attr("data-cms-strip"):
            n += 1
            el.decompose()
            continue
        if name in _SKIP:
            continue
        if el.has_attr("data-cms") or el.has_attr("data-cms-list") or el.has_attr("data-cms-src"):
            continue
        if _blocked_ancestor(el):
            continue
        if name in _BLOCK_TEXT:
            if not el.get_text(strip=True):
                continue
            n += 1
            key = f"{page}.c{n}"
            inner = el.decode_contents().strip()
            el["data-cms"] = key
            REG[key] = {"default": inner, "label": _label_from(el.get_text(" ", strip=True), name),
                        "page": page, "multiline": (name in _MULTILINE) or ("<" in inner), "kind": "html"}
        elif name == "a":
            txt = el.get_text(" ", strip=True)
            if not txt:
                continue
            n += 1
            key = f"{page}.c{n}"
            el["data-cms"] = key
            REG[key] = {"default": el.decode_contents().strip(), "label": _label_from(txt, "a"),
                        "page": page, "multiline": False, "kind": "html"}
            href = el.get("href", "")
            if href and not href.startswith("#") and not href.startswith("mailto:") and not href.startswith("tel:"):
                el["data-cms-href"] = key + "_href"
                REG[key + "_href"] = {"default": href, "label": f"Link URL: {txt[:34]}",
                                      "page": page, "multiline": False, "kind": "url"}
    for img in soup.find_all("img"):
        if img.has_attr("data-cms-src") or _blocked_ancestor(img):
            continue
        n += 1
        key = f"{page}.img{n}"
        img["data-cms-src"] = key
        REG[key] = {"default": img.get("src", ""), "label": "Image source", "page": page, "multiline": False, "kind": "url"}
        img["data-cms-alt"] = key + "_alt"
        REG[key + "_alt"] = {"default": img.get("alt", ""), "label": "Image alt text", "page": page, "multiline": False, "kind": "text"}
    return soup.decode()

def _slug_from_active(active, title):
    s = (active or "").strip()
    if s.endswith(".html"):
        s = s[:-5]
    return s or "page"

BRAND_SVG = """<svg viewBox="0 0 440 200" aria-label="MSME Catalyst" role="img" style="height:40px;width:auto">
<text x="8" y="90" font-family="Sora,sans-serif" font-weight="800" font-style="italic" font-size="92" letter-spacing="-3" fill="#EE7A1A">MSME</text>
<path d="M372 40 L410 40 L410 52 L388 52 L400 63 L388 74 L410 74 L410 86 L372 86 Z" fill="#EE7A1A"/>
<polygon points="404,20 432,48 404,48" fill="#1B7A3C"/>
<text x="8" y="168" font-family="Sora,sans-serif" font-weight="800" font-style="italic" font-size="68" letter-spacing="1" fill="#1B7A3C">CATALYST</text></svg>"""

# ---- main-site navigation ----
NAV = [
    ("Home", "index.html"),
    ("About Us", "about.html", [
        ("Who We Are", "about.html#who"),
        ("Governing Council", "about.html#council"),
        ("Advisory Body", "about.html#advisory"),
        ("Secretariat", "about.html#secretariat"),
    ]),
    ("Our Approach", "approach.html", [
        ("Convergence Model", "approach.html#convergence"),
        ("Cluster Capability Centres", "approach.html#capability-centres"),
        ("Programmes", "programmes.html"),
    ]),
    ("Membership", "membership.html", [
        ("Membership", "membership.html#membership"),
        ("Donors & Funding Partners", "membership.html#donors"),
    ]),
    ("ODR Support", "odr-support.html"),
    ("Knowledge Hub", "knowledge.html", [
        ("Reports & Papers", "reports.html"),
        ("Blogs", "blogs.html"),
        ("Podcasts", "podcasts.html"),
        ("Events & Labs", "events.html"),
    ]),
    ("Contact Us", "contact.html"),
]

def brand(prefix="", h=40):
    return f'<img src="{prefix}assets/img/logo.png" alt="MSME Catalyst" style="height:{h}px;width:auto;display:block">'

def section_of(href):
    """Map a link target to a toggleable section key (for hide-when-not-live)."""
    h = href.split('#')[0]; frag = href.split('#')[1] if '#' in href else ''
    # Anchor sections on About (Governing Council / Advisory / Secretariat) can be hidden.
    if h == 'about.html' and frag in ('council', 'advisory', 'secretariat'):
        return frag
    return ({
        'programmes.html': 'programmes', 'reports.html': 'reports', 'blogs.html': 'blogs',
        'podcasts.html': 'podcasts', 'events.html': 'events', 'odr-support.html': 'odr',
    }).get(h) or ('donors' if (h == 'membership.html' and frag == 'donors') else None)

def _ds(href):
    s = section_of(href)
    return f' data-section="{s}"' if s else ''

def rel(prefix): return prefix  # kept for clarity

def _navkey(href):
    stem = href.split('#')[0].replace('.html', '') or 'home'
    frag = ('_' + href.split('#')[1]) if '#' in href else ''
    return 'global.nav_' + (stem + frag).replace('-', '_').replace('/', '_')

def _navlabel(href, label):
    """Editable (global) navigation label — shared across every page."""
    key = _navkey(href)
    _reg(key, label, label=f"Nav: {label}", multiline=False, page="global")
    return f'<span data-cms="{key}">{label}</span>'

def header(active, prefix=""):
    links = []
    mobile = []
    for item in NAV:
        label, href = item[0], item[1]
        drop = item[2] if len(item) > 2 else None
        is_active = " active" if active == href else ""
        if drop:
            sub = "".join(f'<a href="{prefix}{d[1]}"{_ds(d[1])}>{_navlabel(d[1], d[0])}</a>' for d in drop)
            links.append(f'<div class="has-drop"><a href="{prefix}{href}" class="{is_active.strip()}">{_navlabel(href, label)} ▾</a><div class="drop">{sub}</div></div>')
            mobile.append(f'<a href="{prefix}{href}">{_navlabel(href, label)}</a>')
            mobile += [f'<a href="{prefix}{d[1]}" class="mm-sub"{_ds(d[1])}>{_navlabel(d[1], d[0])}</a>' for d in drop]
        else:
            links.append(f'<a href="{prefix}{href}" class="{is_active.strip()}"{_ds(href)}>{_navlabel(href, label)}</a>')
            mobile.append(f'<a href="{prefix}{href}"{_ds(href)}>{_navlabel(href, label)}</a>')
    join = T("global.nav_join", "Join", tag="span", label="Nav: Join button")
    join2 = T("global.nav_join_mobile", "Join MSME Catalyst", tag="span", label="Nav: Join button (mobile)")
    return f"""<header class="site-header">
  <div class="wrap nav">
    <a class="brand" href="{prefix}index.html" aria-label="MSME Catalyst home">
      {brand(prefix, 42)}
    </a>
    <nav class="nav-links" aria-label="Primary">
      {''.join(links)}
    </nav>
    <div class="nav-cta">
      <a class="btn btn-primary btn-arrow" href="{prefix}membership.html">{join}</a>
    </div>
    <button class="nav-toggle" aria-label="Menu" aria-expanded="false"><span></span><span></span><span></span></button>
  </div>
  <div class="mobile-menu">
    {''.join(mobile)}
    <div class="mm-cta">
      <a class="btn btn-primary" href="{prefix}membership.html">{join2}</a>
    </div>
  </div>
</header>"""

SOCIALS = [
    ("LinkedIn", "in", "#"), ("X", "𝕏", "#"), ("Instagram", "◎", "#"),
    ("YouTube", "▶", "#"), ("Facebook", "f", "#"), ("Spotify", "♫", "#"),
    ("Apple Podcasts", "", "#"), ("WhatsApp", "✆", "#"),
]

def footer(prefix=""):
    socials = "".join(f'<a href="{u}" aria-label="{n}" title="{n}">{i}</a>' for n, i, u in SOCIALS)
    def _footkey(title):
        return 'global.foot_head_' + title.lower().replace(' ', '_').replace('&', 'and')
    def col(title, items):
        hk = _footkey(title); _reg(hk, title, label=f"Footer heading: {title}", page="global")
        lis = "".join(f'<li{_ds(h)}><a href="{prefix}{h}">{_navlabel(h, t)}</a></li>' for t, h in items)
        return f'<div><h4 data-cms="{hk}">{title}</h4><ul class="foot-links">{lis}</ul></div>'
    return f"""<footer class="site-footer">
  <div class="wrap">
    <div class="foot-grid">
      <div class="foot-brand">
        <span style="display:inline-block;background:#fff;padding:12px 16px;border-radius:12px">{brand(prefix, 46)}</span>
        <p data-cms="global.footer_tagline" style="margin-top:16px;max-width:34ch;font-size:.92rem;color:#9aa8a0">{_reg("global.footer_tagline", "India's neutral convergence layer for MSME growth. A not-for-profit platform operated by Digital Growth Infrastructure Foundation (Section 8).", "Footer tagline", True)}</p>
        <div class="socials">{socials}</div>
      </div>
      {col("Platform", [("Our Approach","approach.html"),("Programmes","programmes.html"),("ODR Support","odr-support.html"),("Membership","membership.html"),("Donors & Funding Partners","membership.html#donors")])}
      {col("Knowledge Hub", [("Reports & Papers","reports.html"),("Blogs","blogs.html"),("Podcasts","podcasts.html"),("Events & Labs","events.html"),("Contact Us","contact.html")])}
      {col("Governance", [("Who We Are","about.html#who"),("Governing Council","about.html#council"),("Advisory Body","about.html#advisory"),("Secretariat","about.html#secretariat"),("Why Neutrality","about.html#neutrality")])}
    </div>
    <div class="foot-disclaimer" data-cms="global.footer_disclaimer">
      {_reg("global.footer_disclaimer", "<strong>What We Do Not Do.</strong> MSME Catalyst does not lend, underwrite, provide legal advice, adjudicate disputes, operate an ODR platform, guarantee recovery, or replace existing schemes, courts, arbitrators, universities or implementation partners. We facilitate structured access to relevant ecosystem pathways. Independent lenders, ODR providers and other institutions retain their own eligibility, commercial, legal and operational decisions.", "Footer legal disclaimer", True)}
    </div>
    <div class="foot-legal" style="font-size:.8rem;color:#8f9a92;margin-top:20px;line-height:1.7">
      <strong style="color:#c9d2cc">Digital Growth Infrastructure Foundation</strong> · Section 8 not-for-profit · CIN: U94990MH2026NPL468930<br>
      Registered Office: WeWork 247 Park, 13th Floor, Vikhroli Corp, Mumbai, Mumbai, Mumbai – 400079, Maharashtra
    </div>
    <div class="foot-bottom">
      <span>© <span id="yr">2026</span> Digital Growth Infrastructure Foundation. All rights reserved.</span>
      <span><a href="{prefix}privacy.html">Privacy</a> · <a href="{prefix}terms.html">Terms</a> · <a href="{prefix}contact.html">Contact</a></span>
    </div>
  </div>
</footer>"""

def doc(title, desc, body, active="", prefix="", extra_head="", schema=None, canonical=""):
    body = annotate(body, _slug_from_active(active, title))
    schema_block = f'<script type="application/ld+json">{schema}</script>' if schema else ""
    return f"""<!doctype html>
<html lang="en">
<head>
<script>document.documentElement.className+=' js';</script>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{title}</title>
<meta name="description" content="{html.escape(desc)}">
<meta property="og:title" content="{html.escape(title)}">
<meta property="og:description" content="{html.escape(desc)}">
<meta property="og:type" content="website">
<meta name="theme-color" content="#17211B">
{f'<link rel="canonical" href="{canonical}">' if canonical else ''}
<link rel="icon" href="{prefix}assets/img/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="{prefix}assets/css/styles.css">
{extra_head}
{schema_block}
</head>
<body>
{header(active, prefix)}
<main>
{body}
</main>
{footer(prefix)}
<script src="{prefix}assets/js/visibility-lib.js"></script>
<script src="{prefix}assets/js/main.js"></script>
</body>
</html>"""

def write(path, content):
    full = os.path.join(ROOT, path)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, "w", encoding="utf-8") as f:
        f.write(content)
    print("wrote", path)

# ---------- helpers for content blocks ----------
def cta_band(prefix=""):
    return f"""<section class="section"><div class="wrap">
  <div class="cta-band reveal">
    <span class="kicker on-dark" data-cms="global.cta_kicker">{_reg("global.cta_kicker","Build the convergence layer","CTA band kicker")}</span>
    <h2 class="h2" data-cms="global.cta_heading" style="margin-top:14px;max-width:20ch">{_reg("global.cta_heading","Support already exists. Let's make it work together.","CTA band heading")}</h2>
    <p class="mt-s" data-cms="global.cta_text">{_reg("global.cta_text","Whether you are an MSME facing payment friction, an institution ready to pilot, or a funder backing execution infrastructure — there is a working role for you.","CTA band text",True)}</p>
    <div class="hero-ctas">
      <a class="btn btn-primary btn-arrow" href="{prefix}membership.html">Join MSME Catalyst</a>
      <a class="btn btn-ghost on-dark" href="{prefix}odr-support.html">Apply for ODR Support</a>
      <a class="btn btn-ghost on-dark" href="{prefix}membership.html#donors">Fund the infrastructure</a>
    </div>
  </div>
</div></section>"""

def page_hero(kicker, h1, lead, crumb="", prefix="", key=None):
    cr = f'<div class="crumb"><a href="{prefix}index.html">Home</a> · {crumb}</div>' if crumb else ""
    if key:
        REG[f"{key}.kicker"] = {"default": kicker, "label": "Hero kicker", "page": key, "multiline": False, "kind": "html"}
        REG[f"{key}.heading"] = {"default": h1, "label": "Hero heading", "page": key, "multiline": False, "kind": "html"}
        REG[f"{key}.lead"] = {"default": lead, "label": "Hero intro", "page": key, "multiline": True, "kind": "html"}
        ka, kb, kc = f' data-cms="{key}.kicker"', f' data-cms="{key}.heading"', f' data-cms="{key}.lead"'
    else:
        ka = kb = kc = ""
    return f"""<section class="page-hero"><div class="wrap">
    {cr}
    <span class="kicker"{ka}>{kicker}</span>
    <h1 class="h1"{kb} style="margin-top:16px;max-width:20ch">{h1}</h1>
    <p class="lead mt-s maxch"{kc}>{lead}</p>
  </div></section>"""

if __name__ == "__main__":
    import json, pages_main, pages_odr
    pages_main.build(globals())
    pages_odr.build(globals())
    # Emit the editable-content registry for the admin "Page Content" editor.
    reg_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "server", "content-registry.json")
    os.makedirs(os.path.dirname(reg_path), exist_ok=True)
    with open(reg_path, "w", encoding="utf-8") as f:
        json.dump(REG, f, ensure_ascii=False, indent=2, sort_keys=True)
    print(f"wrote server/content-registry.json ({len(REG)} editable blocks)")
    print("\nDone.")
