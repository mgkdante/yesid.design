---
"@yesid/ui": patch
---

Correct the WCAG 2.2.2 Pause, Stop, Hide defect: default decorative ErrorIllustration lamps,
MetroStation ping, StopLabel glow and TerminalCursor blink now use their still reduced-motion
frames. The Gallery browser regression fails on the original source and checks every route
at load and after six seconds under normal and reduced motion, allowing only busy Skeletons.

Owner-approved compatibility exception (instruction dated 2026-11-14 in DEPRECATION.md):
opt-in gradient Separator, StatusDot pulse, TerminalPanel signal.live and led-pulse are still.
Pulse and live remain accepted for compatibility and produce no visual pulse; all props, types
and exports remain. Skeleton only animates inside aria-busy="true"; callers remove loading
indicators when loading completes. The UI API report changes only the SHA-256 receipt for the
public base.css asset because led-pulse is now still; declarations and export surfaces are unchanged.
