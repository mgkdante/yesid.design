---
"@yesid/ui": patch
---

Correct the WCAG 2.2.2 Pause, Stop, Hide defect: default decorative ErrorIllustration lamps,
MetroStation ping, StopLabel glow and TerminalCursor blink now use their still reduced-motion
frames. The Gallery browser regression fails on the original source and checks every route
at load and after six seconds under normal and reduced motion, allowing only busy Skeletons.

Owner-approved compatibility exception (instruction dated 2026-11-14 in DEPRECATION.md):
opt-in gradient Separator is still; StatusDot pulse, TerminalPanel signal.live and led-pulse
last two cycles (four seconds) then rest. All props, types and exports remain unchanged.
Skeleton and spinners may loop only while loading; callers own their loading lifetime.
