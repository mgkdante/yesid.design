# yesid.design
Shared UI, tokens and motion packages that every yesid product builds from.

## Language

**Section**:
A collapsible content card on a detail page, with a heading and a body.
_Avoid_: card (on detail pages), panel, disclosure

**Expand-all control**:
The single page action that opens every content section, or collapses them all when any is open. Pages with at least two content sections start expanded; after Collapse all the control turns orange, and the visitor's bulk choice is remembered across the site and visits. Individual toggles affect only that view. The TOC and independent panels keep their own state.
_Avoid_: quiet mode, per-section preference, Remember/Forget actions

**Filter group**:
A collapsible group of filters in a listing rail. Not touched by the expand-all control.
_Avoid_: section

**Section jump**:
Navigation to a content section at the shared reading line, opening that section and its
enclosing sections while preserving every other section's state.
_Avoid_: TOC scroll helper

**Navigation lifecycle**:
The shared coordination of page navigation, menu closure, language-switch intent, focus and
interrupted scrolling.
_Avoid_: header router

**Station tabs**:
The shared signage look for tab controls and navigation links. Selection, navigation, strip
geometry, scrolling and swipe handling belong to the caller.
_Avoid_: shared tab router

**Pointer effect**:
A visual response available to a hover-capable fine pointer, including a secondary mouse on a
touch device. Its motion tier also determines whether reduced motion permits it.
_Avoid_: desktop-only effect

**Touch-only feedback**:
Press feedback for a touch-capable device without a hover-capable fine pointer. Devices with
such a pointer use the same press baseline as desktops.
_Avoid_: mobile animation

**Release rehearsal**:
Verification of the same exact prerelease in both products, through their own checks and
affected real callers before stable promotion. Required when API reports or migration notes change.
_Avoid_: Gallery acceptance, stable adoption

**Consumer adoption**:
A product's reviewed integration of one exact stable release. Publication, adoption and deployed
acceptance each need their own evidence.
_Avoid_: automatic sync
