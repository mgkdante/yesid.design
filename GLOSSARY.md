# yesid.dev-design
Shared UI, tokens and motion packages that every yesid product builds from.

## Language

**Section**:
A collapsible content card on a detail page, with a heading and a body.
_Avoid_: card (on detail pages), panel, disclosure

**Expand-all control**:
The single page action that opens every section, or collapses them all when any is open. Nothing about it is remembered between visits.
_Avoid_: quiet mode, remember collapse

**Filter group**:
A collapsible group of filters in a listing rail. Not touched by the expand-all control.
_Avoid_: section
