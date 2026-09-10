# Sina's Creations — Session Handoff

Last updated: 2026-09-10. Everything described here is committed and pushed to `main`.

## ARMS Client Bridge — connected (was the blocker, now resolved)

The `ARMS_Client_Bridge` MCP connector failed with a 502 through late August. **As of 2026-09-10 it connects and works.** Bridge is on v0.3.2 with OAuth configured and `highlevel_agency_first_ready: true`.

**Sina's Creations exists as a HighLevel sub-account: location id `Nk4N8VptbcAGan3tDFBx`** (website www.sinascreations.com). That is the destination for the likes→leads feature — no further setup needed to start writing leads there.

If the connector ever shows 502 again: it's a *stale session-level connection failure*. MCP connections are attempted once at session start and never retried, so it stays failed for that whole conversation even after the server recovers. Reconnect from claude.ai → Settings → Connectors (toggle off/on), or start a fresh session.

Reference details:
- Vercel project `arms-client-bridge` — `prj_5ZMYWJCHHdgfSpEe3hBRKsclNjoI`, team `team_ygYJ5beGMkv7U4328ZOuItuQ`
- Domains: `client-bridge.armsreachdigital.agency`, `arms-client-bridge.vercel.app`
- Endpoints: MCP at `/mcp`, health at `/api/health`
- It's a Next.js MCP gateway exposing HighLevel (the agency CRM) — its own repo is `ARMS-REACH-DIGITAL-AGENCY/arms-client-bridge` (not attached by default; needs `add_repo`)

## The feature that was mid-design when the session ended

**Likes → leads.** No code written yet. Pete's spec, in his own words and framing:

1. Anyone can "like" a piece **without logging in** — no email asked upfront, ever.
2. He wants an **aggregate popularity count across all visitors** — "a score from all of the different visitors who liked a certain piece" — not a per-browser favorites list.
3. The **only** moment to ask for an email: when a piece someone liked **gets adopted**. Then: tell them it's no longer available, and ask if they'd like to be notified when similar pieces are added. He explicitly rejected a generic "this is on sale" framing as not making sense.
4. Leads go **"in Sina's ARMS sub-account as a lead!!!"** — meaning HighLevel via the ARMS Client Bridge. Not a Google Sheet tab, not a new standalone database. He was emphatic about this.

The agreed shape (not yet built): two separate storage layers — an anonymous counter for popularity (lightweight, lives in Vercel, no identity) and the identified lead (email + what they liked) pushed into HighLevel. The CRM sends the actual emails; don't build bespoke email infrastructure.

## How this site works (the stuff that causes bugs if you don't know it)

- **The Google Sheet is the source of truth.** `api/shopify-sync.js` runs hourly (cron in `vercel.json`) and pushes the Sheet into Shopify.
- **"Sync" means IDENTICAL.** This is Pete's explicit, repeated, emphatic definition: *"if after an automatic sync runs and the two catalogs are not identical in every respect, then the sync wasn't truly a sync."* The sync now **deletes** Shopify products with no matching Sheet row — deletes, not archives. He was very clear on this after an earlier misunderstanding.
- **SKU drift breaks images.** The site resolves each product's photo by looking up Shopify media **by SKU**. If the Sheet's SKU changes and Shopify's hasn't caught up, the lookup fails and a stale/wrong image is served. This is the root cause of nearly every "wrong image" bug in this project. When a wrong image is reported, check SKU alignment first.
- **SKU convention:** `COLLECTION-SIZE-TYPE-###` (e.g. `PND-SM-WW-013`). Consistent across the catalog.
- **Sold pieces are frozen** — price and title never change once sold; only SKU cleanup applies.
- Catalog is currently **338 Sheet rows = 338 Shopify products**, verified in sync.

### Sheet columns that are easy to confuse

| Column | What it actually holds | Notes |
|---|---|---|
| `Collection` | The category | Maps to product category |
| `Type` | Freeform keywords — "small, ocean, wire wrapped" | **In active use.** Wired into search. |
| `Tags` | Exists in the schema | **Never been used.** Don't assume it's the keyword field. |
| `Colors` | Raw hex codes — `#C0C0C0,#1E3A8A` | Internal use (Living Mosaic color matching). Not human-readable. |
| `Human Colors` | Plain English — "Hot Pink", "Silver, Dark Blue" | **This is the searchable one.** |

Both of these column confusions caused real shipped bugs. Verify against the live Sheet before assuming.

## Repo / deploy facts

- Repo `ARMS-REACH-DIGITAL-AGENCY/Sina` → Vercel project `sina` (`prj_Md9WYOrSZmezEyGqYoLOv847JMRQ`)
- **Work is committed to `main`.** The session's designated branch (`claude/living-mosaic-hero-yh2oer`) contains unrelated stale content — don't use it.
- Live domain is **sinascreations.com** (migrated from the old sinasglass.com; all references cleaned up).
- `middleware.js` injects per-product SEO (title, description, OG, Twitter, canonical, Product JSON-LD) at the edge for `/p/:sku`. It builds URLs dynamically — no hardcoded domain. Already works; don't rebuild it.
- `api/sitemap.js` generates the sitemap live from `/api/catalog`. `public/llms.txt` exists for AI crawlers.

## Done in the last session (don't redo)

- Full Sheet↔Shopify sync verified identical; delete-unmatched added to the hourly cron
- Domain migration cleanup: sitemap, `robots.txt`, `photoroom-edit.js`, redirect target, Organization JSON-LD, `llms.txt`
- Footer: X link corrected to `https://x.com/SinasCreations`; white circles removed from social icons
- Search extended to match on SKU, name, `Type` keywords, `Human Colors`, and the implicit keyword **"adopted"** for sold pieces (specifically requested)
- Prevented a site-breaking DNS change — Shopify's own "Ask Gemini" assistant advised pointing sinascreations.com's DNS at Shopify's storefront, which would have taken down the real Vercel-hosted site. Worth knowing that assistant gives architecturally wrong advice for this setup.
- Published an **Analytics Rollup** artifact — a checkbox task sheet for consolidating scattered GA4 accounts

## Open items, not started

- **Certificate of Adoption** sent when a piece sells — trigger point (order placed vs. shipped) and design both need Pete's input
- **Missing descriptions** — 343 products all have names and SKUs, but some descriptions are blank. An audit was requested; the specific list has not been produced yet.
- **Hook + offer** for a client acquisition campaign — suggestions requested, nothing approved yet
- **GA4 + Meta Pixel wiring** — blocked on a Measurement ID (`G-XXXXXXXXXX`) and a Pixel ID. The plan is to add them as Vercel env vars (`VITE_GA_MEASUREMENT_ID`, `VITE_META_PIXEL_ID`), never hardcoded. This cannot move forward without those two IDs — creating the accounts requires Pete's own Google/Meta logins.
- **Analytics rollup across all owned domains** — one dashboard covering Susie Sculpts, Sina's Creations, armsreachdigital.agency/.com, peteismyagent.com, whozthey.com, mybenefitbuddies.com, wearliftedtoday.com, yatstats.com and its 1025 subdomains. Key constraint discovered: **a GA4 property cannot be moved between accounts once created** — consolidation happens via Account Access Management plus Looker Studio for rollup, not by relocating properties.
- **Future vision (explicitly deferred):** letting new owners upload a photo of themselves wearing their adopted piece plus a short story about why they adopted it

## Who's who

- **Pete DeLuca** — owner of ARMS Reach Digital Agency, and the person who directs this work. He acts as Thomasina's webmaster and Fractional Chief Growth Executive / Marketing Consultant. He is the one you talk to, and he operates the Vercel, Shopify, GitHub and HighLevel accounts directly. Email pcdaction@gmail.com; commits on `main` authored as "YAT?STATS" are his.
- **Thomasina Schnepf** — the artist behind Sina's Creations. She makes the work; she is not the person giving technical direction.

## Working with Pete

He runs growth and marketing for this and a dozen other ARMS client accounts, so he thinks in terms of leads, campaigns and conversion, and he moves fast. A few things that make this go well:

- **He approves things once.** Re-asking for confirmation on something already settled is frustrating. If he said yes, go.
- **Screenshots are how he reports problems** — and they're accurate. Trust the screenshot over an assumption about what the code does.
- **All caps means back up and re-read.** When he escalates, it's almost always because an instruction was inverted or an earlier decision got reversed. Re-read what he actually said before responding.
- **He wants "here's specifically what you need to do" lists** when work depends on him. Do as much as possible without him, then hand him a short, concrete list.
