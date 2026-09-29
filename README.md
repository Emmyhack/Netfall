# Netfall

Rate truth layer for stablecoin corridors. Netfall compares providers and reports one
thing honestly: **how much actually lands**.

Providers advertise deliberately non-comparable numbers — a good rate with a hidden fee,
"zero fees" with a wide spread, a headline price that only applies above a threshold most
people never reach. Netfall resolves all of it to the final arriving amount, ranks
providers by it, and hands the user off to the winner.

Netfall never holds funds, never executes transactions and never takes custody. It is a
measuring instrument.

**V1 corridors:** NGN, GHS, KES → USDT and USDC.

---

## This repository is the frontend only

There is no backend, no live provider integration and no database. The quote engine is a
separate, later project. Everything here runs against a mock data layer that implements
the production API contract exactly.

Anything that would need a backend is implemented against the mock and marked with a
`// LIVE:` comment describing what the real implementation needs.

**Not in this repository, by design:** wallet connection, smart contracts, authentication,
payment processing, any real provider integration.

---

## Getting started

```bash
npm install
npm run dev          # http://localhost:3000
```

| Script | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build (type errors and lint errors fail the build) |
| `npm start` | Serve the production build |
| `npm test` | Vitest, once |
| `npm run test:watch` | Vitest, watching |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |

---

## Routes

| Route | Purpose |
|---|---|
| `/` | Homepage. The hero is the live comparison tool, not a marketing image. |
| `/compare/[corridor]` | Statically generated corridor page, e.g. `/compare/ngn-usdt`. Amount via `?amount=`. |
| `/alerts` | Rate alert signup. Persists to the browser only. |
| `/large-amounts` | High-ticket / OTC enquiry flow. |
| `/how-we-make-money` | Full commercial disclosure. Linked from every comparison surface. |
| `/about` | What Netfall measures and how. |
| `/api` | Developer landing. Marketing only in V1; there is no working API. |
| `/_dev/components` | Component gallery. Every component at every state it has to survive. |
| `/_dev/scenarios` | Scenario harness. Every degraded state, reachable by URL. |

The `_dev` routes 404 in production and ship no client JavaScript there. Their folders are
named `%5Fdev` because an unescaped leading underscore makes a folder private in the App
Router, which would mean no route at all.

**The URL is the source of truth for the comparison.** Corridor and amount live in the path
and query string, so every comparison is shareable and every corridor page is indexable.
Nothing about the comparison is held only in component state.

---

## The rules the code enforces

These are correctness requirements, not preferences. Each has a test.

1. **Ranking is by landed amount and nothing else.** No sponsored placement, no partner
   boost, no weighting by our own commission. `lib/quotes/ranking.ts` is the whole
   implementation; `lib/quotes/engine.test.ts` and `components/QuoteTable.test.tsx` hold it
   to that, including that a commercial partner never outranks a better rate and that an
   exact quote never outranks a better estimate.
2. **An estimate never looks exact.** Every quote carries
   `confidence: 'exact' | 'estimated' | 'insufficient_data'`. Non-exact figures are prefixed
   with `≈` and carry a worded badge. Colour never carries the meaning alone.
3. **Unavailable providers are never hidden.** Providers that failed, timed out or fell
   outside their limits appear in a secondary list with a plain-language reason. Absence is
   information.
4. **The source is always disclosed.** Quotes reached through an aggregator are labelled.
5. **The commercial relationship is always disclosed**, at the point of comparison rather
   than in the footer, and the provider list on `/how-we-make-money` is generated from the
   same configuration the comparison uses, so it cannot drift.
6. **The cost of choosing badly is shown** in the currency the user is sending — the
   shortfall in the asset, valued at the best available rate.
7. **Quotes expire.** An expired quote raises an error state and strikes the figures
   through. It is never presented as a stale success.
8. **Numbers are tabular.** Monetary figures use `.numeric`, which sets JetBrains Mono with
   tabular lining numerals so digits align down a column.

---

## Money

Every monetary value is a decimal string, end to end, and never becomes a JavaScript
number. Floating-point error in a product whose entire claim is numeric honesty is not an
acceptable bug.

- `lib/money.ts` owns all arithmetic (decimal.js-light). It is the only module that
  constructs a `Decimal`, and it throws rather than coercing a malformed value.
- `lib/format.ts` owns every monetary, rate, percentage and duration string. Grouping is
  done by hand rather than through `Intl.NumberFormat`, because `Intl` takes a number.
- An ESLint rule bans `toLocaleString` and `parseFloat` outside those two files.
- The one place a monetary value becomes a number is `positionRatio`, which produces a
  plotting coordinate, never a figure shown to a user.

**Fee breakdowns are a single-currency ledger** denominated in what the user receives. The
first line is the gross amount at the mid-market reference rate; every following line is a
deduction, including the provider's rate margin. Expressing the margin as a line item is
the argument: it is the cost providers hide inside a headline rate. The lines must sum
exactly to the landed amount — `FeeBreakdown` renders an error rather than a breakdown that
does not reconcile, and the mock derives the landed amount *from* the ledger so a mismatch
is structurally impossible.

---

## The mock layer

`lib/mock/` is deliberately adversarial. Instant, perfect mocks produce frontends with no
real error handling.

- Per-provider latency between 200ms and 1800ms.
- Roughly one provider call in ten times out or reports the provider down.
- Every corridor surfaces at least one `estimated` and one `insufficient_data` quote.
- Small amounts fall below some providers' floors; large amounts exceed others' ceilings.
- Tiered pricing: small tickets quietly pay a wider spread.
- `?seed=` makes any run reproducible.
- `/_dev/scenarios` reaches `all-fail`, `all-timeout`, `single-provider`, `zero-dispersion`,
  `extreme-dispersion` and `expired` by URL.

### Swapping in the real engine

`lib/quotes/source.ts` is the only module in the application that imports `lib/mock`. The
development harnesses and the mock's own tests are the deliberate exceptions.

Replace four function bodies and nothing above them changes:

| Function | Becomes |
|---|---|
| `streamQuotes` | `GET /v1/quote`, streamed |
| `fetchQuotes` | the same call, awaited |
| `sampleCorridor` | `GET /v1/coverage/{corridor}`, at build time |
| `listProviders` | `GET /v1/providers` |

Keep the `QuoteEvent` sequence identical: one `started`, then one `quote` or `unavailable`
per provider as it resolves, then exactly one `settled` or `error`.

---

## Design

The visual direction is MetaMask's site and Onramper's combined, sampled from the live
pages rather than described from memory.

### Type: what MetaMask actually ships

metamask.io self-hosts five faces. Every one of them is proprietary:

| Face | Owner | Licence |
|---|---|---|
| Euclid Circular B Regular / Medium | Swiss Typefaces | Commercial — purchasable |
| MM Sans Variable (wght 400–900) | Ryan Bugden | Bespoke, MetaMask-owned |
| MM Poly Variable (RESO, wdth axes) | Ryan Bugden | Bespoke, MetaMask-owned |
| MM Sans Mono | Ryan Bugden | Bespoke, MetaMask-owned |

Euclid Circular B can be licensed. The three MM faces were commissioned for MetaMask and
are not available at any price. So the stack here is the closest open equivalents, picked
on letterform:

- **Outfit** for UI and headings, standing in for Euclid Circular B — geometric,
  near-circular bowls, double-storey `a`, single-storey `g`, flat terminals, tall x-height.
  The same construction as Onramper's Saans, so it serves both references.
- **Archivo** for the hero line only, standing in for MM Poly, exactly as MetaMask uses MM
  Poly for exactly one line. It is the one open variable face with a real width axis
  (62–125%), which is what makes the wide heavy display setting possible. Loaded
  `font-display: optional` — see the performance note below.
- **JetBrains Mono** for numerals, standing in for MM Sans Mono.

**To drop in real Euclid Circular B** once licensed, `app/fonts.ts` is the only file that
changes: replace the `outfit` export with a `next/font/local` declaration pointing at the
woff2 files and keep the `--font-ui` variable name.

### Colour: Onramper's branding

The palette is Onramper's, sampled from the live site rather than eyeballed:

| Role | Value | Where it comes from |
|---|---|---|
| Page | `#EFEEF3` | Onramper's page ground |
| Cards | `#FFFFFF` | Onramper's cards |
| Ink | `#151515` / `#333333` | their heading and body colours |
| Muted | `#6A6A84` → `#65657E` | darkened to clear AA on `--surface-2` |
| Borders | `#CACAD4` | their border colour |
| Brand | `#0093FF` | their primary blue |
| Accents | `#6AFFC5` mint, `#63D2E6` cyan | their accent fills |
| Radii | 8px standard, 16px cards, 123px pills | their measured values |

Two measurements shaped how those get used:

- **White on `#0093FF` is 3.17:1.** The brand band therefore carries dark type, not
  white — which is how Onramper uses the blue too, as a ground rather than as body text.
- **Onramper's palette has no warm colour at all.** The caution tone (`#9C550B` light,
  `#E5A34A` dark) is the one addition, because "estimated" has to be distinguishable from
  brand blue to mean anything.

`--on-brand` and `--on-mint` are fixed in both themes, because the fills they sit on are
fixed. Using the themed `--ink` there flipped the mint handoff button to near-white text
at 1.08:1 in dark mode.

### Pattern: MetaMask's

MetaMask runs consecutive full-bleed sections, each a different flat brand colour, with
the type inverted against whatever ground it lands on, one very large display line, and a
pill for every action. That structure is reproduced here in Onramper's colours.

`components/ui/Section.tsx` takes `band="dark" | "brand" | "mint"`. Each band class
redefines the palette tokens locally, so cards, rules and muted text inside it invert
automatically and no component needs to know which ground it is on. In dark mode the
neutral band flips to light while the brand and mint bands hold, so the page keeps
alternating either way.

- **Tokens** live in `app/globals.css` and are mapped into `tailwind.config.ts`. Nothing
  hardcodes a hex value.
- **`.code-block`** carries its own fixed palette in every theme and inside every band,
  using Onramper's mint and cyan as the syntax accents. Inheriting page colours had put
  syntax tokens on a pale band ground at 1.4:1.
- **Buttons own their colours.** `components/ui/Button.tsx` has a variant per context,
  including `band` and `band-ghost`, and each band supplies `--band-btn-bg` / `--band-btn-fg`
  because a white pill reads on blue and vanishes on mint. Overriding a variant's colour
  utilities from `className` is a coin toss decided by stylesheet order, not attribute
  order, and it made a footer label invisible once.
- **The spread bar** (`components/SpreadBar.tsx`) is still the signature element: inline SVG
  at measured pixel width, the gap bracketed and labelled with what choosing badly costs,
  collapsing to a two-endpoint form below 420px.
- **Motion:** one orchestrated moment. When quotes resolve the axis draws from the centre
  outward and the ticks settle, ~400ms, ease-out. Nothing else animates on load, and
  `prefers-reduced-motion` renders everything at rest.

### Page structure

Onramper's information architecture, MetaMask's banding, Onramper's colours:

1. Announcement strip in the brand dark
2. Header — logo, centred links, pill actions, corridor shortcut rail
3. Hero — headline beside the live comparison tool, not a screenshot of one
4. Provider wall, doubling as commission disclosure
6. Coverage figures, measured
5. How the number is built — **mint band**
7. **Blue band** — how we make money
8. Every corridor we track
9. **Dark band** — the API, for the second audience
10. FAQ
11. **Dark band** — closing statement and resource footer

Every page follows the same rhythm: a bordered hero, `Section` bodies, at least one band,
the shared footer.

## Measured against the budgets

Production build, Chromium under Lighthouse's simulated slow 3G (1.6 Mbps, 150ms RTT) and
4× CPU throttling, at 390px.

| Budget | Target | Measured |
|---|---|---|
| LCP | < 2.5s | 0.57–0.60s |
| First-load JS | < 130 KB gzipped | 129.3 KB (homepage), 128.9 KB (corridor page) |
| CLS | < 0.05 | ≤ 0.0071 |
| INP | < 200ms | 24–32ms |
| Accessibility | Lighthouse 100 | 0 axe violations, WCAG 2.1 AA + best-practice, 8 pages × light/dark × 360/1280px |

Verified in Chromium, Firefox and WebKit, both themes, at 360px and 1280px: no horizontal
overflow, no console errors, comparison resolves in all three.

Polyfills are served `noModule` and are not counted; no browser from the last several years
downloads them.

Two performance notes worth keeping in mind when extending this:

- **Do not call `useSearchParams` in a statically generated page.** It opts the whole subtree
  out of prerendering — the HTML ships a Suspense fallback that is swapped on hydration, which
  measured as 0.28 CLS on the homepage. `lib/hooks/useUrlSearchParams.ts` reads
  `window.location` instead and keeps the URL as the source of truth. The dev scenario
  harness is the one exception, because it navigates with `<Link>`.
- **The table reserves one skeleton row per outstanding provider from the first paint**, at
  exactly the height of a resolved row, so rows fill in without moving anything.
- **The results table lays out against its own container, not the viewport.** It uses a CSS
  `@container` query, and its action column is a fixed width rather than `auto`. Both are
  scars: viewport breakpoints could not see that the table had been placed inside a
  half-width hero card, so at full desktop width the six columns printed on top of each
  other; and an intrinsic action column resolved to a different width in every row, because
  every row is its own grid and the provider names differ, so the figures came out ragged.
- **The display face loads `optional`, not `swap`.** It is set very large and stretched to
  118%, so no metric-adjusted fallback can match its advance widths. When it swapped in, the
  hero headline reflowed from two lines to three and cost 0.10 CLS on corridor pages. With
  `optional` the browser uses the fallback for that load if the font is not ready, caches it,
  and uses it from the next visit on.

---

## Layout

```
app/
  compare/[corridor]/   statically generated corridor pages
  %5Fdev/               development harnesses, 404 in production
  globals.css           design tokens, bands, code palette, spread bar animation
  fonts.ts              self-hosted Outfit, Archivo, JetBrains Mono
components/
  ui/Button.tsx         the pill action primitive, one variant per context
  ui/Section.tsx        page rhythm; band="dark|brand|mint" goes full-bleed
  SpreadBar.tsx         the signature element
  QuoteTable.tsx        ranked results, sticky header, live region
  QuoteRow.tsx          one provider; stacks into a card below 640px
  FeeBreakdown.tsx      the reconciling ledger, code-split behind the expander
  HighTicketInterceptor.tsx   above the OTC threshold, code-split
  states/               skeleton, error, expired, unsupported corridor
  ProviderWall.tsx      social proof that doubles as commission disclosure
  HowItWorks.tsx        the four subtractions
  Faq.tsx               the objections the product invites
lib/
  types.ts              the production API contract
  money.ts              all decimal arithmetic
  format.ts             all display formatting
  corridors.ts          corridor definitions (client-safe)
  corridorNotes.ts      corridor prose (server only, kept out of the bundle)
  quotes/source.ts      the single seam — swap this for the live engine
  mock/                 the adversarial mock engine
  hooks/
```

---

## Testing

80 tests across six files. They concentrate on the two things that are actually load-bearing:
the arithmetic, and the honesty rules.

```bash
npm test
```

- `lib/money.test.ts` — exactness, rounding, dispersion, reconciliation.
- `lib/format.test.ts` — every display format, including that a value too large for a
  JavaScript number still formats correctly.
- `lib/quotes/engine.test.ts` — the §4 rules at the data layer, across every corridor and
  eight seeds, plus the mock's own guarantees.
- `components/QuoteTable.test.tsx` — the §4 rules at the DOM level.
- `components/FeeBreakdown.test.tsx` — that a ledger which does not reconcile renders an
  error and no figures.
- `components/SpreadBar.test.tsx` — the screen-reader description and the degenerate cases.
