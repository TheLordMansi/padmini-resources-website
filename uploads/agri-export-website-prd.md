# PRD — Agri-Export B2B Website (One-Time Build)

**Version:** 1.0 · **Owner:** CEO · **Audience:** Software team
**Product type:** B2B lead-generation website for an Indian agricultural exporter trading perishables (fresh fruits & vegetables) and non-perishables (spices, rice, pulses, tea).

---

## 1. Purpose & North Star

The website's single job: make a serious overseas buyer (importer / distributor / wholesaler in the Gulf, Europe, Southeast Asia, Africa) **trust us enough to send an enquiry**. Every page, section, and feature is judged against that.

**Primary conversion actions (in order):**
1. Request a Quote (RFQ form)
2. WhatsApp click-to-chat
3. Sample request
4. Catalog PDF download (with optional email capture)

**Explicit non-goals:** No e-commerce cart, no online payment, no retail pricing display, no flashy animation-heavy UI, no forced popups demanding contact details.

---

## 2. Target User (Buyer Persona)

- Professional B2B buyer: import house, wholesale distributor, supermarket sourcing manager, HORECA supplier.
- Regions: UAE/Saudi/Gulf, EU (Netherlands, Germany, UK), Southeast Asia (Malaysia, Singapore, Vietnam), Africa (Kenya, Nigeria, Egypt).
- Behavior: browses on mobile, often on slow connections; compares 5–10 suppliers; verifies credentials; communicates on WhatsApp and email; fears fraud, quality failure, documentation problems, and cold-chain breaks.
- Decision drivers: verifiable legitimacy → product specs → process clarity → responsiveness.

---

## 3. Sitemap

```
Home
Products
 ├── Fresh Produce (Perishables)
 │    ├── Grapes
 │    ├── Pomegranate
 │    ├── Mango
 │    ├── Onion
 │    └── [other fresh items]
 └── Staples & Spices (Non-Perishables)
      ├── Rice (Basmati / Non-Basmati)
      ├── Pulses
      ├── Spices (individual pages per major spice)
      └── Tea
About Us
Certifications & Compliance
Quality & Infrastructure
How We Export
Private Label / OEM
Request a Quote
FAQ for Buyers
Careers
Contact
Blog / Market Insights  (Phase 2)
Privacy Policy · Terms of Use
```

**Global elements (every page):**
- Sticky header: logo, nav, WhatsApp button, "Request a Quote" button.
- Floating WhatsApp click-to-chat widget (bottom-right, small, non-intrusive).
- Footer: company legal name, full physical address, IEC no., GST no., APEDA/FSSAI registration numbers, corporate email, phone, quick links, social links, copyright.

---

## 4. Page-by-Page Specification

### 4.1 Home (Landing Page)

| # | Section | Content | Notes |
|---|---------|---------|-------|
| 1 | Sticky header | Logo, nav (Products, Certifications, How We Export, About, Contact), WhatsApp btn, RFQ btn | RFQ button visually primary |
| 2 | Hero | One real facility/loading photo. H1: "Exporters of Fresh Indian Produce & Premium Staples — APEDA & FSSAI Certified." Subline: markets served, established year. CTAs: "Explore Products" + "Request a Quote" | Static image. **No carousel/slider.** |
| 3 | Trust bar | Logos + registration numbers: IEC, APEDA, FSSAI, Spices Board, ISO/HACCP | Must appear within first scroll |
| 4 | Numbers strip | Years in business · Countries served · Containers/year · Product lines | 4 stats, large type |
| 5 | Two-track product split | Card A: Fresh Produce (cold chain, seasonality). Card B: Staples & Spices (bulk, private label, long shelf life). Each links to its hub | Core information architecture |
| 6 | Seasonality snapshot | Compact 12-month availability grid for top 4–6 perishables | Links to full calendar |
| 7 | Capability row | 4 tiles with real photos: Cold Chain · In-house Grading & Packing · Private Label · Documentation Support | |
| 8 | Export process strip | 4 steps: Enquiry → Sample → Contract & Payment (LC/TT) → Shipment with Full Docs | Links to How We Export |
| 9 | Countries-served map | World map with highlighted markets + country list | Static/lightweight SVG, not a heavy JS globe |
| 10 | Testimonials | 2–4 real references: name/company (or anonymized company type), country, product | Only real ones |
| 11 | Facility gallery | 6 real photos: packhouse, cold store, grading, loading | Lightbox optional |
| 12 | Final CTA block | "Tell us your product and destination — quote within 24 hours." RFQ btn + WhatsApp btn | |
| 13 | Footer | Full legal identity block | Dense, verifiable |

### 4.2 Products Hub + Category Pages

- Hub page: the two-track split, then full product grid with category filter.
- Category pages (Fresh Produce / Staples & Spices): grid of product cards — photo, name, one-line spec (e.g., "Residue-compliant table grapes · 4.5kg / 9kg cartons"), "View Specs" link.
- Perishable category page additionally shows the **full seasonality calendar** at top.
- Non-perishable category page additionally shows a **private-label banner** linking to OEM page.

### 4.3 Product Detail Page (single template, two variants)

**Common fields (all products):**
- Product name + HS code
- Real product photos (product, packed cartons, palletized/loaded)
- Description (short, factual)
- Varieties / grades offered
- Size / count / grade table
- Packaging options (retail carton, bulk bag, units per carton, cartons per pallet, per 20ft / 40ft container)
- MOQ
- Shelf life & storage conditions
- Origin region(s) in India
- Certifications applicable to this product
- Downloadable PDF spec sheet
- CTAs: "Request a Quote" (pre-fills product) + WhatsApp + "Request a Sample"

**Perishable variant — additional blocks:**
- Availability calendar (12-month strip for this crop)
- Cold-chain handling: pre-cooling, storage temp, reefer transit temp, transit-time guidance by region
- Harvest-to-ship timeline

**Non-perishable variant — additional blocks:**
- Bulk packaging matrix (25kg/50kg bags, jute/PP, cartons)
- Private-label / OEM availability flag + link
- Technical/purity specs (moisture %, admixture, broken %, etc. as applicable)
- Sample availability & dispatch terms

**Product data model (CMS fields):** name, slug, category (perishable/non-perishable), HS code, images[], description, grades[], sizes[], packaging[], MOQ, shelf life, storage, origin, certifications[], spec-sheet PDF, seasonality[12 booleans] (perishable only), cold-chain text (perishable only), tech-spec table (non-perishable only), private-label flag.

### 4.4 About Us

- Company story: founding, growth, what we trade, philosophy (factual, not flowery).
- Founder & leadership: names, photos, one-line credentials.
- Facility overview with photos.
- Timeline / milestones (optional strip).
- Registered office & operational address.
- CTA: Certifications page + RFQ.

**Rationale:** buyers wire money to identifiable people. Faces, names, and a verifiable address convert fear into confidence.

### 4.5 Certifications & Compliance (dedicated page)

- Each certificate displayed as: certificate image (viewable/enlargeable), issuing body, registration/license number, validity where applicable.
- Minimum set: IEC, APEDA RCMC, FSSAI, GST; plus ISO/HACCP, Spices Board, GlobalGAP/residue-compliance, phytosanitary capability statement as available.
- Short plain-language line under each: what this certificate means for the buyer.
- CTA: "Need certificate copies for your import compliance? Request via RFQ/WhatsApp."

**Rule:** never display a certificate we cannot back with a verifiable number.

### 4.6 Quality & Infrastructure

- Packhouse: capacity, grading & sorting process, photos.
- Cold chain: pre-cooling, cold storage capacity, reefer logistics.
- Quality control: inspection steps, lab testing / residue monitoring, rejection standards.
- Loading & container stuffing photos/video (30–60s clips max, compressed).

### 4.7 How We Export

- Step-by-step process diagram: Enquiry → Quote → Sample → Contract → Payment terms → Production/procurement → QC → Shipment → Documents.
- **Documentation we provide:** Commercial Invoice, Packing List, Bill of Lading, Certificate of Origin, Phytosanitary Certificate, health/lab certificates as applicable.
- **Payment terms accepted:** LC at sight, TT (advance/balance structure). Plain-language explanation of each.
- **Incoterms quoted:** FOB / CIF / CFR — with one-line meaning of each.
- Ports of loading (e.g., Nhava Sheva, Mundra) and indicative transit times by region.
- FAQ-style reassurance: "First time importing from India?" mini-guide.

**Rationale:** this page removes the first-time buyer's biggest fear — the unknown machinery of international trade. It positions us as the experienced party.

### 4.8 Private Label / OEM

- What we offer: buyer-brand packaging for rice, pulses, spices, tea.
- Packaging formats & printing capability.
- MOQs for private label.
- Process: artwork → sample → approval → production.
- Photo examples (mock or real, clearly labeled).
- CTA: RFQ with "Private Label" pre-selected.

### 4.9 Request a Quote (RFQ)

**Form fields:**
- Product (dropdown, pre-filled if arriving from a product page)
- Destination country (dropdown)
- Quantity / container requirement (free text or ranges)
- Company name
- Business email (required)
- Phone / WhatsApp (**optional**, labeled "for faster response")
- Message (optional)

**Rules:**
- No popups anywhere on the site demanding contact info. RFQ is always user-initiated.
- Auto-acknowledgement email on submit: "Received — our export desk responds within 24 hours."
- Lead routed to sales inbox + stored (spreadsheet/CRM) with timestamp, source page, product.
- Spam protection: honeypot + rate limit (avoid CAPTCHAs that add friction; use invisible methods).

**Sample request:** same form with a "Request sample" checkbox, or dedicated variant; sample dispatch terms stated (buyer pays courier is standard — state it plainly).

### 4.10 FAQ for Buyers

Answer plainly: MOQ policy, sample policy, payment terms, quality guarantees, documentation, shipping times, cold-chain assurance, how to verify our licenses, private label MOQs. Structured for SEO (FAQ schema markup).

### 4.11 Careers

- One simple page: short culture blurb, open roles list (CMS-editable), application email.
- **Zero custom engineering.** No portal, no login, no ATS. Value = signals a real, growing company.

### 4.12 Contact

- Full address + embedded map, corporate email, phone, WhatsApp, office hours (with timezone), RFQ link.
- Company registration identifiers repeated (IEC/GST) — this is a verification page for cautious buyers.

### 4.13 Blog / Market Insights — **Phase 2**

- Purpose: SEO for buyer-intent queries ("basmati rice exporter India", "pomegranate season India export").
- CMS-driven articles; not launch-blocking.

---

## 5. Cross-Site Features (prioritized)

| Feature | Priority | Why |
|---|---|---|
| WhatsApp Business click-to-chat (all pages, floating + header) | **Must** | Primary trade channel in Gulf/Africa/SEA; deals close in chat |
| RFQ system with auto-acknowledgement + lead storage | **Must** | The conversion engine |
| Downloadable company catalog PDF (email-optional gate) | **Must** | Buyers forward it internally; travels where the website can't |
| Downloadable per-product spec sheets (PDF) | **Must** | Procurement teams need documents, not links |
| Seasonality calendar component (site-wide reusable) | **Must** | Perishable buyers plan by season |
| CMS for products, certificates, testimonials, careers, blog | **Must** | Team updates without developers; it's a one-time build only if content is editable |
| SEO foundation: semantic HTML, meta, sitemap.xml, schema (Organization, Product, FAQ), keyword-mapped pages | **Must** | Free buyer traffic compounds |
| Analytics (GA4) + event tracking on RFQ submit, WhatsApp click, PDF download | **Must** | We manage what we measure |
| Performance budget & image pipeline (WebP/AVIF, lazy-load, CDN) | **Must** | Buyers on slow overseas mobile connections |
| Multi-language: English at launch; **Arabic** in Phase 2 (RTL support planned in the design system now) | Nice (phased) | Gulf is a top market; but don't delay launch for it |
| Currency note: prices are quoted per contract — no live FX engine | Decision | Avoid overbuild; B2B pricing is negotiated |
| Facility/loading video embeds (compressed, click-to-play) | Nice | Cheap trust; must not hurt load speed |
| Trade-show presence section (Gulfood, Fruit Logistica) | Nice | Industry legitimacy |
| Live chat bot | **Rejected** | WhatsApp replaces it; bots frustrate serious buyers |
| Popup lead-capture on product click | **Rejected** | Repels professional buyers; kills trust |
| Retail e-commerce/cart | **Rejected** | Wrong business model signal |

---

## 6. Design Direction

- **Tone:** established trading house — clean, confident, information-dense. Not a lifestyle brand, not a startup landing page.
- **Layout:** generous whitespace, strong typographic hierarchy, real photography over illustration, tables for specs.
- **Color:** deep green (agriculture/trust) + warm neutral background + a restrained gold/amber accent; high contrast for readability.
- **Typography:** one professional sans for UI/body + optional serif for headlines; system-font fallbacks for speed.
- **Imagery:** real facility/product/loading photos only. No generic stock farms. Every image compressed and lazy-loaded.
- **Motion:** minimal — subtle fades at most. No parallax, no video backgrounds, no heavy animation libraries.
- **Mobile-first:** every layout designed at 375px first; spec tables become stacked cards on mobile.

---

## 7. Non-Functional Requirements

- **Performance:** LCP < 2.5s on 3G-class connection; total page weight target < 1.5MB on landing; Core Web Vitals green.
- **Mobile:** fully responsive; WhatsApp/RFQ CTAs thumb-reachable.
- **SEO:** unique title/meta per page; schema markup; clean URLs (/products/pomegranate); XML sitemap; hreflang-ready for Phase 2 Arabic.
- **Accessibility:** semantic headings, alt text, sufficient contrast (also an SEO win).
- **Security:** HTTPS, form spam protection, no exposed personal data.
- **Reliability:** RFQ submissions must never be lost — email + persistent store, with failure alerting.
- **Internationalization-ready:** copy in CMS/resource files, RTL-capable layout system.

---

## 8. Analytics & Success Metrics

- RFQ submissions / week (primary)
- WhatsApp click-throughs
- Sample requests
- Catalog & spec-sheet downloads
- Organic traffic to product pages; rankings for target buyer-intent keywords
- Bounce rate on landing from paid/organic buyer traffic

---

## 9. Build Phases

**Phase 1 — Launch (everything a buyer needs to trust and enquire):**
Home, Products hub + all product pages, About Us, Certifications, How We Export, Quality & Infrastructure, RFQ, Contact, FAQ, Careers, footer/legal, WhatsApp integration, catalog + spec-sheet PDFs, CMS, analytics, SEO foundation, performance budget met.

**Phase 2 — Growth:**
Arabic language (RTL), Blog/Market Insights, expanded testimonials/case studies, trade-show section, additional videos, second language if market data supports it.

**Content dependencies (needed from business side before build completes):**
Certificate scans + numbers · facility photo/video shoot · product spec data per SKU · founder photos/bios · 2–4 trade references · catalog PDF content.

---

## 10. Open Questions for the Team

1. Stack & CMS recommendation given the performance budget (static-first strongly preferred).
2. Effort estimate per Phase 1 block, and the critical path.
3. Photo/video shoot scheduling — this is the longest content lead item; start immediately.
