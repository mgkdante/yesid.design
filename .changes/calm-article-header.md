---
"@yesid/ui": minor
---

Add a calm reading presentation for article, case-study and data pages. The expressive
presentation stays the default, so existing callers keep today's output apart from the two
behaviour changes below.

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

Behaviour changes for existing callers:

- `highlight` (Y-4-approved behaviour correction): the previous contract accented the first
  case-insensitive substring match, so `AI` accented part of `BRAIN`. It now accents the first
  case-insensitive whole-word match. Words follow `Intl.Segmenter`, so Chinese and Thai titles
  split into words; title and highlight compare in NFC; an apostrophe between letters stays
  inside the word (`can` never matches in `can't`), while an elision such as `l'`, `d’` or `qu’`
  starts a new word (`espace` matches in `l'espace`). Without `Intl.Segmenter`, letters, digits
  and combining marks form words under the same apostrophe policy. A highlight that appears only
  inside other words now accents nothing; one that also appears as a word later in the title now
  accents that word. Proof: `article-highlight.test.ts`, `ArticleHeader.test.ts` and the Gallery
  `/article-header` browser test fail on the previous source.
- Defect fix: a label and its date in the meta row wrap inside the column instead of
  overflowing (they were `nowrap`, and the header clips): a long Spanish date reached 429px on a
  320px screen. The pair's spacing is unchanged in the expressive presentation (`gap: 0.5em`
  between the label and the date, now also between rows when it wraps). Products can drop
  overrides of `.header__meta-pair`.

Migration: none required. To adopt, pass `presentation="reading"` to `ArticleHeader` (yesid.dev
articles and case studies, Transit data pages) and `ListingFrame` (reading listings), pass
`rule="line"` and a `measure` to `DetailFrame`, and move any opening into the `header` snippet.
