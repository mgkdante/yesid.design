# No endless decorative loops

Y-30 source inventory, based on design `9785f04` (origin/main). Consumer scan is read-only:
`yesid.dev` bb0b3811cf64d6ae9aed26b79fcdc921974f441b,
Transit 1f907be61a21a831f6b87ea99de69f60e181f0ce,
`yesid.login` e73d196bda15c94fcd74f5d0076fd7a8c648751f.
Working-tree callers were searched too; these receipts do not establish adoption or deployment.

| Component / driver | Original activation and signal | Consumers found | Result |
| --- | --- | --- | --- |
| ErrorIllustration blink-light, 1.2s infinite | Default decorative construction lamps | All three through ErrorPage: dev and Transit +error.svelte; login NotFound and People | Still: lamp A opacity 1, lamp B opacity-subtle, matching reduced motion |
| MetroStation station-ping, 2s infinite | Default decorative roundel ping; pulseDelay only delays it | No direct product callers | Ping hidden, as under reduced motion; pulseDelay retained |
| StopLabel pulse-glow, 2s infinite | Default decorative marker | dev brand wrapper, about sections | Still marker, existing reduced-motion shadow |
| TerminalCursor terminal-blink, 1s infinite | Default decorative block | dev home Manifesto/CloserTerminalBoard, AboutCta, ContactPage | Steady block, existing reduced-motion frame |
| Separator gradient-flow, 3s infinite | Opt-in variant=gradient, decorative rule | No gradient callers; products use hazard/default | Still two-color gradient, matching reduced motion |
| StatusDot pulse / base.css led-pulse, 2s infinite | Opt-in pulse, status emphasis | dev HeroSqlPanel opts in; Transit FreshnessStamp/ConformanceBadge/health and login People use status dots | Two cycles, four seconds, then underlying steady lamp |
| TerminalPanel signal.live via StatusDot | Opt-in verified live status emphasis | Search found no explicit product signal.live callers | Same four-second bound; label and status remain |
| Skeleton pulse, 2s infinite | Loading-only placeholder | Transit EdgeState loading branch | Retained only for loading lifetime; caller removes on completion |
| ManifestoCanvas ticker | Default mounted canvas; pointer proximity converges to steady nodes, click ripples 1.2s/0.8s | dev home Manifesto; also indirect ArticleHeader users | No autonomous cyclic animation; redraw driver remains, offscreen no-op, reduced-motion bitmap |
| @motion ticker fan-out | Explicit subscribe; shared frame delivery, no visual output itself | dev heroTypewriter; ManifestoCanvas | Infrastructure retained; consumer owns subscription cleanup |
| @motion Lenis GSAP ticker | Explicit init, input-driven smooth scroll (1.2s duration) | SiteRoot in products | Infrastructure retained; no autonomous decorative cycle |
| UI clock interval | Explicit subscribers, time data every 1s (30s reduced), pauses hidden | Transit freshness/time readouts via shared state | Data update, not decorative animation |
| section-jump RAF | User navigation, waits for layout stability, 700ms cap | Shared frame/navigation users | Finite; unchanged |
| blueprintScrub, theme RAF | Input/resize-coalesced one-frame redraw and theme synchronization | Shared page/header users | No autonomous loop; unchanged |
| wordmarkHover repeats | User hover, repeat=1 with finite duration | Shared Wordmark users | Finite; unchanged |

The audit covered all files in `packages/ui` and `packages/motion`, including base CSS,
CSS animation shorthands/utilities, JS tickers/intervals/RAF and SVG repeatCount. No SVG indefinite
repeat, GSAP repeat=-1, or additional autonomous cyclic animation was found. There is no shared
spinner component. Consumer spinners are allowed only during actual loading.

## Compatibility and verification

Default-on decoration is a WCAG 2.2.2 defect fix. Opt-in Separator and LED behavior follows the
owner-approved exception in DEPRECATION.md, quoting the brief's instruction dated 2026-11-14.
There is no prop, type, export or API report change. No product dependency or source was changed.

`decorative-motion.spec.ts` visits every Gallery route in normal and reduced motion, checking
`document.getAnimations()` at load for infinite iterations and again after six seconds for
infinite iterations or running animations. The sole allowlist is a Skeleton target inside an
explicitly busy region. Gallery exercises every StatusDot color with pulse enabled, as well as
the explicit live TerminalPanel signal and gradient separator. Original-source desktop run failed
both assertions on `/`: gradient-flow, pulse-glow, station-ping, terminal-blink and blink-light
remained running. Reduced motion must stay still. The first run exposed and corrected the Gallery
config's default reduced-motion override so normal-motion testing actually exercises motion.

Consumer acceptance after a published candidate still needs the real dev error pages, home/about/
contact marker and cursor callers, HeroSqlPanel; Transit error pages and EdgeState loading-to-ready
transition; login NotFound and People errors. Check normal/reduced motion, light/dark themes and
phone/small-laptop widths. Gallery and source scans do not establish those deployed results.
