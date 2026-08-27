# Sina's Creations — Session Handoff

Last updated: 2026-08-27. Everything described here is committed and pushed to `main`.

## The one thing blocking progress

**The `ARMS_Client_Bridge` MCP connector could not connect in the previous session (502 Bad Gateway).**

The server itself is healthy — verified directly. `https://arms-client-bridge.vercel.app/api/health` returns 200 with `bridge_auth_configured: true` and `highlevel_agency_pit_configured: true`. The 502 is a *stale session-level connection failure*: MCP connections are attempted once at session start and never retried, so once it fails it stays failed for that whole conversation regardless of server state.

**First thing to do in the new thread:** check whether `ARMS_Client_Bridge` tools are available. If they are, the blocker is gone. If it still shows 502, it needs to be reconnected from claude.ai → Settings → Connectors (toggle off/on).

Once connected, there is still a second step: the bridge reports `highlevel_company_id_configured: false` and `highlevel_location_pit_fallback_count: 1` with no default location set. A HighLevel location credential for **Sina's Creations specifically** likely needs configuring before leads can land in the right sub-account.

Reference details:
- Vercel project `arms-client-bridge` — `prj_5ZMYWJCHHdgfSpEe3hBRKsclNjoI`, team `team_ygYJ5beGMkv7U4328ZOuItuQ`
- Domains: `client-bridge.armsreachdigital.agency`, `arms-client-bridge.vercel.app`
- Endpoints: MCP at `/mcp`, health at `/api/health`
- It's a Next.js MCP gateway exposing HighLevel (the agency CRM) — its own repo is `ARMS-REACH-DIGITAL-AGENCY/arms-client-bridge` (not attached by default; needs `add_repo`)

## The feature that was mid-design when the session ended

**Likes → leads.** No code written yet. The owner's spec, in her own words and framing:

1. Anyone can "like" a piece **without logging in** — no email asked upfront, ever.
2. She wants an **aggregate popularity count across all visitors** — "a score from all of the different visitors who liked a certain piece" — not a per-browser favorites list.
3. The **only** moment to ask for an email: when a piece someone liked **gets adopted**. Then: tell them it's no longer available, and ask if they'd like to be notified when similar pieces are added. She explicitly rejected a generic "this is on sale" framing as not making sense.
4. Leads go **"in Sina's ARMS sub-account as a lead!!!"** — meaning HighLevel via the ARMS Client Bridge. Not a Google Sheet tab, not a new standalone database. She was emphatic about this.

The agreed shape (not yet built): two separate storage layers — an anonymous counter for popularity (lightweight, lives in Vercel, no identity) and the identified lead (email + what they liked) pushed into HighLevel. The CRM sends the actual emails; don't build bespoke email infrastructure.

## How this site works (the stuff that causes bugs if you don't know it)

- **The Google Sheet is the source of truth.** `api/shopify-sync.js` runs hourly (cron in `vercel.json`) and pushes the Sheet into Shopify.
- **"Sync" means IDENTICAL.** This is the owner's explicit, repeated, emphatic definition: *"if after an automatic sync runs and the two catalogs are not identical in every respect, then the sync wasn't truly a sync."* The sync now **deletes** Shopify products with no matching Sheet row — deletes, not archives. She was very clear on this after an earlier misunderstanding.
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

- **Certificate of Adoption** sent when a piece sells — trigger point (order placed vs. shipped) and design both need owner input
- **Missing descriptions** — 343 products all have names and SKUs, but some descriptions are blank. An audit was requested; the specific list has not been produced yet.
- **Hook + offer** for a client acquisition campaign — suggestions requested, nothing approved yet
- **GA4 + Meta Pixel wiring** — blocked on a Measurement ID (`G-XXXXXXXXXX`) and a Pixel ID. The plan is to add them as Vercel env vars (`VITE_GA_MEASUREMENT_ID`, `VITE_META_PIXEL_ID`), never hardcoded. This cannot move forward without those two IDs — creating the accounts requires the owner's own Google/Meta logins.
- **Analytics rollup across all owned domains** — one dashboard covering Susie Sculpts, Sina's Creations, armsreachdigital.agency/.com, peteismyagent.com, whozthey.com, mybenefitbuddies.com, wearliftedtoday.com, yatstats.com and its 1025 subdomains. Key constraint discovered: **a GA4 property cannot be moved between accounts once created** — consolidation happens via Account Access Management plus Looker Studio for rollup, not by relocating properties.
- **Future vision (explicitly deferred):** letting new owners upload a photo of themselves wearing their adopted piece plus a short story about why they adopted it

## Working with the owner

She's the non-technical business partner on this project (ARMS Reach Digital Agency) and she's sharp about the business, not the code. A few things that make this go well:

- **She approves things once.** Re-asking for confirmation on something already settled is frustrating. If she said yes, go.
- **Screenshots are how she reports problems** — and they're accurate. Trust the screenshot over an assumption about what the code does.
- **All caps means back up and re-read.** When she escalates, it's almost always because an instruction was inverted or an earlier decision got reversed. Re-read what she actually said before responding.
- **She wants "here's specifically what you need to do" lists** when work depends on her. Do as much as possible without her, then hand her a short, concrete list.
- Her email is pcdaction@gmail.com. Some commits on `main` show as author "YAT?STATS" — same person, other tooling.
