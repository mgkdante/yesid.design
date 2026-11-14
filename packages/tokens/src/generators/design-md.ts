import type { Token, TokenTree } from '../types.ts';
import { serializeYaml } from '../serialize.ts';
import { isLeaf, isClampToken } from '../parse.ts';

export interface DesignMdOptions {
  components?: readonly string[];
  brandComponents?: readonly string[];
  primitiveSubpaths?: readonly string[];
}

function yamlMap(tree: TokenTree, indent: number, transformKey?: (k: string) => string): string {
  const lines: string[] = [];
  const pad = ' '.repeat(indent);
  for (const [k, v] of Object.entries(tree)) {
    if (k.startsWith('$')) continue;
    const outKey = transformKey ? transformKey(k) : k;
    if (isLeaf(v)) {
      lines.push(`${pad}${outKey}: ${serializeYaml(v)}`);
    } else {
      lines.push(`${pad}${outKey}:`);
      lines.push(yamlMap(v as TokenTree, indent + 2, transformKey));
    }
  }
  return lines.join('\n');
}

/**
 * Emit flat color map: brand colors + dark theme colors.
 * The design.md spec requires colors to be flat hex values at `colors.<name>`.
 * We emit brand colors first (primary, accent, etc.), then dark semantic tokens
 * (background, foreground, etc.). Light theme overrides are prose, not tokens.
 */
function flatColorMap(colorTree: TokenTree): string {
  const lines: string[] = [];
  const seen = new Set<string>();
  // brand colors
  const brand = colorTree.brand as TokenTree | undefined;
  if (brand) {
    for (const [k, v] of Object.entries(brand)) {
      if (k.startsWith('$') || !isLeaf(v)) continue;
      // Only emit hex color values (skip rgb channels and other non-hex)
      if (typeof v.$value === 'string' && v.$value.startsWith('#')) {
        lines.push(`  ${k}: ${serializeYaml(v)}`);
        seen.add(k);
      }
    }
  }
  // dark theme semantic colors (source of truth for dark-first design)
  const dark = colorTree.dark as TokenTree | undefined;
  if (dark) {
    for (const [k, v] of Object.entries(dark)) {
      if (k.startsWith('$') || !isLeaf(v) || seen.has(k)) continue; // skip names emitted from brand
      if (typeof v.$value === 'string' && v.$value.startsWith('#')) {
        lines.push(`  ${k}: ${serializeYaml(v)}`);
      }
    }
  }
  return lines.join('\n');
}

/**
 * Emit typography fontSize as a valid spec dimension (px/em/rem).
 * For clamp() tokens, we use the max value (large-viewport design intent).
 * The spec does not accept clamp() expressions as dimension values.
 */
function typographyFontSize(v: Token): string {
  if (isClampToken(v)) {
    // Use max value — the largest design-intent size, comprehensible to agents
    return `"${v.$value.max}"`;
  }
  return serializeYaml(v);
}

export function generateDesignMd(tree: TokenTree, opts: DesignMdOptions = {}): string {
  const colors = tree.color as TokenTree;
  const text = tree.text as TokenTree;
  const radius = tree.radius as TokenTree;
  const space = tree.space as TokenTree;

  // Typography: each text-* token becomes { fontSize: <dimension> }.
  // fontSize uses the max of any clamp() value — a valid spec dimension.
  const typographyLines: string[] = [];
  for (const [k, v] of Object.entries(text)) {
    if (isLeaf(v)) {
      typographyLines.push(`  ${k}:`);
      typographyLines.push(`    fontSize: ${typographyFontSize(v)}`);
    }
  }

  const components = opts.components ?? opts.brandComponents ?? [];
  const componentsBlock = components.length
    ? components.map((component) => `  ${component}: {}`).join('\n')
    : '  # see packages/ui/README.md and the public @yesid/ui exports';
  const brandComponents = opts.brandComponents ?? [];
  const primitiveSubpaths = opts.primitiveSubpaths ?? [];
  const componentInventory = brandComponents.length || primitiveSubpaths.length
    ? `See \`@yesid/ui/brand\` (${brandComponents.length} components: ${brandComponents.map((name) => `\`${name}\``).join(', ')}) and
${primitiveSubpaths.length} primitive subpaths (${primitiveSubpaths.map((name) => `\`@yesid/ui/${name}\``).join(', ')}).`
    : 'See the public `@yesid/ui/brand` export and the `@yesid/ui/*` primitive subpath exports.';

  return `---
version: alpha
name: yesid.dev
description: Digital infrastructure that moves. Edge-to-edge, dark-first, four-color infrastructure doctrine (orange signage · yellow wayfinding · reflective white · structural black), motion-with-intent.

# GENERATED FROM packages/tokens/tokens.json — DO NOT EDIT
# Run \`bun run tokens:build\` to regenerate.

colors:
${flatColorMap(colors)}

typography:
${typographyLines.join('\n')}

rounded:
${yamlMap(radius, 2)}

spacing:
${yamlMap(space, 2, (k) => `"${k}"`)}

components:
${componentsBlock}
---

## Overview

yesid.dev is a freelance digital-infrastructure brand. The design language is edge-to-edge,
dark-first, governed by the four-color infrastructure doctrine below. Every visual decision
traces back to one of five principles: edge-to-edge layout, dark-first surfaces, one-orange
interactivity (orange is the clickable hue — with a single doctrinal exception: yellow
conversion buttons, see Colors), motion-with-intent, no fluff.
Public narrative and implementation rules: README.md and
docs/BUILD-A-YESID-PRODUCT.md.

Before composing a page, read the doctrine ([docs/DOCTRINE.md](docs/DOCTRINE.md)): core identity,
signatures by name, three registers, calm by default.

## Colors

**THE FOUR-COLOR INFRASTRUCTURE DOCTRINE** (constitutional). Real infrastructure speaks four
colors — orange signage, yellow hazard stripes (with black), reflective white, black tape and
structure. Each holds a named role; every component usage maps to exactly one:

- **ORANGE — interactive/signage** (\`primary\` \`#E07800\`, light \`#985000\`): nav and component
  links, buttons, CTAs, focus rings, active/hover states, signage accents. The clickable hue for
  everything except conversion (below), text links included: a link without a class is underlined in \`primary\` ink.
- **YELLOW: wayfinding and highlight** (\`accent\` as surface and art; \`accent-text\` as AA text;
  \`line-amber\`; \`accent-surface\`): the one highlight per screen (the answer figure or the
  selected item), departure-board signage, map and diagram amber, string colours in highlighted
  code, and hazard tape for a real caution or the page's signature. Not for ordinary numbers,
  labels above headings or status: ordinary numbers use reading ink, and status uses the status
  tokens with a word and a shape. The yellow conversion rule is unchanged: the only clickable
  yellow surface is the "talk to Yesid" button, at most one per view; every other yellow stays
  unclickable, text links included (they are orange).
- **WHITE — reflective** (\`reflective\` \`#F5F5F0\`, theme-invariant; dark \`foreground\`):
  key headline words on dark, catch-lights (\`edge-highlight\`), white-core métro dots and
  reflective chips over guaranteed-dark grounds.
- **BLACK — tape/structure** (\`hazard-b\` / \`signage-bg\` \`#1C1814\`; light \`border-strong\`
  joins the family): hazard stripe pairing, signage chip grounds, light-mode strong
  structural rules drawn as black tape on paper. Dark mode's deep board IS the black voice.

Semantic tokens (\`background\`, \`foreground\`, \`card\`, \`muted\`, etc.) carry theme-switching
responsibility. Contrast verified on dark first, then light — all pairs script-computed.

## Typography

Inter Variable for headings + body; JetBrains Mono Variable for code, terminals, mono labels.
Self-hosted (no Google Fonts CDN). Type scale uses \`clamp()\` for fluid sizing across breakpoints.
Hard floors: body ≥ 16px, mono ≥ 13px, labels ≥ 12px, micro for chrome only.

Sentence case. Uppercase only for short signage. A section starts with its heading, never with a label above it.

## Layout

Four CSS Grid recipes: Full-Bleed · Contained · Content+Sidebars · Edge-Title-Grid. Container
widths cap at \`64rem\` (content) / \`72rem\` (wide). Page gutters scale via \`--space-page-x\`.
Section spacing scales via \`--space-section-y\`. Consumer integration guidance lives in
docs/BUILD-A-YESID-PRODUCT.md.
SiteHeader accepts a caller-owned \`brand\` snippet and \`wordmarkAutoPlay={false}\` for its default
wordmark. Empty menus omit the menu button and keep the identity controls reachable in the pill.
Button \`wrap\` opts into multiline labels and content-driven height. Table cells preserve whole
words, wrapping a single word only when it exceeds the cell width.

## Elevation & Depth

Shadow tokens use \`color-mix(in srgb, var(--primary) N%, transparent)\` for brand-connected
glows. Six tiers: \`glow-sm\`, \`glow-md\`, \`glow-lg\`, \`card\`, \`section\`, \`nav\`. No raw
\`box-shadow\` in components except the existing Card, SiteHeader, TocNav and StopLabel surface,
chrome and signage shadows. These exceptions do not authorize new glow on reading or task
surfaces. Only the D15 bulk control and lit artwork in a signature region may glow there.

## Motion

Decorative animation must not loop endlessly (WCAG 2.2.2). Default-on decoration stays
in its reduced-motion frame. Status dots and live-signal lamps stay still, including explicit
pulse requests kept for compatibility. Other explicit opt-in emphasis lasts at most five seconds,
then rests. Respect reduced motion. Loading indicators, including Skeleton and spinners, may loop
only inside an explicitly busy region while content is loading; the caller removes them when
loading completes. Pointer and scroll responses follow input and settle when input stops.

## Shapes

Five radius tokens: \`sm\` (4px), \`md\` (8px, default), \`lg\` (12px), \`xl\` (16px), \`pill\` (9999px).
Borders use semantic tokens (\`border\`, \`border-subtle\`, \`border-strong\`).

## Components

${componentInventory} Design-system documentation:
the public \`@yesid/ui\` package documentation and the living Gallery.

## Do's and Don'ts

**Do**

- Reference tokens via \`var(--token)\` or Tailwind utilities (\`bg-primary\`, \`text-foreground\`).
- Use the 4 CSS Grid recipes; pages own their grids in scoped CSS.
- Respect \`prefers-reduced-motion\` on every animation.

**Don't**

- Draw a status, date or lamp without a real source.
- Put a label above a heading.
- Accent one word of a title.
- Add hover effects to content that does not act.
- Restyle the theme or language toggle.
- Colour a link yellow.
- Hardcode hex colors in components.
- Use arbitrary Tailwind values (\`text-[14px]\`, \`p-[22px]\`) — use the scale or a token.
- Use \`vh\` on mobile; use \`dvh\`/\`svh\`/\`lvh\`.
- Add motion that doesn't serve wayfinding, feedback, or emphasis.
`;
}
