---
"@yesid/ui": minor
---

Add a calm reading presentation for article, case-study and data pages. The expressive
presentation stays the default, so existing callers keep today's output apart from the two
defect fixes below.

- `ArticleHeader` `presentation="reading"`: on the page colour, left aligned on the reading
  column (`--article-measure`, else DetailFrame's `--detail-center-width`, else 46rem), title in
  sentence case as written, Inter throughout, an orange underlined back link, no canvas, circuit
  grid, chevrons, corner marks, crosshair, watermark, edge notes or highlight. `category` becomes
  the first meta entry below the title at 15px instead of a line above it.
- `ArticleHeader` `--article-title-size` replaces the title size, so products no longer restyle
  the header's private `h1` selector.
- `DetailFrame` `rule`: `hazard` (default), `line` or `none`. From 1024px with both rails the
  frame sets `--detail-center-width`. The README now states that `header` renders before both
  rails, the place for an opening, and that `summary` is the top of the center column, after the
  left rail.
- `ListingFrame` `presentation="reading"`: a visible horizontal h1 at every width, no edge title,
  accent rail or artwork, a sentence-case subtitle and a neutral line. `blueprint` is now
  optional; the expressive presentation renders an empty art layer without it.

Defect fixes:

- `highlight` matches whole words only, Unicode aware: `AI` no longer accents part of `BRAIN`.
  A highlight that appears only inside other words now accents nothing; one that appears as a
  word later in the title now accents that word. Proof: `ArticleHeader.test.ts` and the Gallery
  `/article-header` browser test fail on the previous source.
- A label and its date in the meta row wrap inside the column instead of overflowing (they were
  `nowrap`, and the header clips): a long Spanish date reached 429px on a 320px screen. Products
  can drop overrides of `.header__meta-pair`.

Migration: none required. To adopt, pass `presentation="reading"` to `ArticleHeader` (yesid.dev
articles and case studies, Transit data pages) and `ListingFrame` (reading listings), pass
`rule="line"` and a `measure` to `DetailFrame`, and move any opening into the `header` snippet.
