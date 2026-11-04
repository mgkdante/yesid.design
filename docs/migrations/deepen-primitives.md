# Primitive cleanup (deepen D-e)

This is an owner-approved minor removal with no deprecation window, approved on 2026-11-03.
The package is not released by this change. The owner reviews the API report when v0.34.0 is prepared.

## Migrate

- `@yesid/ui/toggle` and `@yesid/ui/toggle-group` are removed, including their Root/Item aliases,
  types and `toggleVariants`. If a product needs toggle behavior, adapt bits-ui directly and own
  its rendering. FilterGroup already does this; its public props, DOM and behavior stay the same.
- Button variants `secondary`, `destructive`, `link` and sizes `xs`, `lg`, `icon`, `icon-xs`,
  `icon-sm`, `icon-lg` are removed. Supported variants are `default`, `conversion`, `outline`,
  `ghost`; supported sizes are `default`, `sm`, `icon-tap`, `cta-sm`, `cta`, `cta-lg`.
- Badge variants `secondary`, `ghost`, `link` are removed. `default`, `destructive`, `outline`,
  `tag`, `tag-active`, `number` and all three sizes stay. All declared defaults remain live.
- Sheet `left` is removed; `bottom` (the default) and `right` stay.
- Inline-icon padding selectors on Button, Badge and Tabs.Trigger, Button's button-group rounding,
  and Button/Badge invalid-state border/ring selectors are removed. There are no activating
  markers on these primitives in either product. Preserve Button ghost's `dark:hover:bg-muted/50`
  and the existing `[a]:hover:bg-primary/80` selectors.
- Replace exact `var(--radius)` with `var(--radius-md)`, its current resolved value (8px).
  Transit PR [619](https://github.com/mgkdante/transit/pull/619) changes the sole product reference,
  MetricInfo.svelte. Merge that migration before adopting the new token output.
- Replace `var(--secondary)` with `var(--popover)` if using the retired alias. Its
  `--color-secondary` Tailwind mapping and the eight `--color-sidebar*` mappings are removed.
  Use the underlying semantic tokens for any future sidebar. `--secondary-foreground`,
  named radii, `--input` and `--destructive-foreground` stay.

There is no automatic style replacement for a removed variant. An app requiring a new treatment
owns that decision; neither current product needs one.

## Fresh consumer inventory

Read-only mains inspected: Transit `773ae1a976ce476f6de0ff25264b21aff936f0ea` and
Site `8743f41f8645d181f4796feba831f037d3fd6f37`. Design baseline is
`f60f216911c8cdb2066463087009c4f6e4a8c657`. Re-fetch both mains immediately before the PR.

| Surface | Transit | Site | Design production source | Outcome |
| --- | --- | --- | --- | --- |
| Toggle / ToggleGroup modules | 0 | 0 | FilterGroup behavior adapter only | Adapt FilterGroup, remove wrappers/demos |
| Removed Button variants and sizes | 0 | 0 | 0 | Remove |
| Button `sm`, `ghost`, `outline`, `icon-tap` | Live | `ghost` live | Defaults / Gallery | Keep |
| Button default, conversion, cta sizes | Default | Live | Defaults / Gallery `cta-sm` | Keep |
| Removed Badge variants | 0 | 0 | 0 | Remove |
| Badge default | Default path | Default path | Declared default | Keep |
| Badge destructive | 0 | 0 | Gallery only | Keep, including dark selectors |
| Tabs default | Default path | Default path | Declared default | Keep, no rail/look change |
| Sheet left | 0 | 0 | 0 | Remove |
| Sheet right | 0 | 0 | Gallery only | Keep |
| Inline-icon / button-group / aria-invalid on affected primitives | 0 | 0 | 0 | Remove inactive selectors |
| Sidebar color mappings | 0 | 0 | 0 | Remove |
| Exact --radius | MetricInfo:322 | 0 | Generator only | Migrate to --radius-md before adoption |
| Exact --secondary and its utilities | 0 | 0 | Removed Button/Badge variants; one arbitrary accent test | Remove; test now uses --popover |

Every imported Button, Badge, Tabs.List/TabsList and Sheet.Content call was inspected with the
Svelte parser, including multiline props, spread props, dynamic values and class expressions.
All variant/size/side props are literal or omitted; no consumer imports the variant helpers or
their type aliases. Dynamic classes in RightPanel and StationTabs alter visibility/layout only.
Site's aria-invalid belongs to native contact fields, not Button or Badge. Transit's data-icon
is a map group badge (`markers`/`alerts`/`active`/`status`/`crowding`), outside these primitives, and has no inline-start/end value.
Other packages have no callers of the removed contracts. Test fixtures only exercise existing
contracts and are not product use; tests pinned to retained defaults and behaviors stay.

[The scan transcript](../evidence/deepen-primitive-scans.txt) records all findings and parsed props.

Commands (PowerShell variables point at the two shallow clones):

```powershell
git -C $transit fetch --depth=1 origin main
git -C $site fetch --depth=1 origin main
git -C $transit rev-parse origin/main
git -C $site rev-parse origin/main
# Run each pattern against both consumer refs, then against Design packages/apps.
git -C $transit grep -n -E '@yesid/ui/(toggle|toggle-group)|buttonVariants|badgeVariants|ButtonVariant|ButtonSize|BadgeVariant|BadgeSize|TabsListVariant|SheetSide' origin/main -- apps packages
git -C $site grep -n -E '@yesid/ui/(toggle|toggle-group)|buttonVariants|badgeVariants|ButtonVariant|ButtonSize|BadgeVariant|BadgeSize|TabsListVariant|SheetSide' origin/main -- apps packages
rg -n 'primitives/(toggle|toggle-group)|ui/(toggle|toggle-group)' packages apps
# All candidate props, including expressions/spreads, are inspected in these caller files.
git -C $transit grep -n -E '@yesid/ui/(button|badge|tabs|sheet)' origin/main -- apps packages
git -C $site grep -n -E '@yesid/ui/(button|badge|tabs|sheet)' origin/main -- apps packages
rg -n 'buttonVariants|badgeVariants|<(Button|Badge|TabsList|Tabs.List|Sheet.Content)' packages apps
# Match exact aliases, never prefixes such as --radius-md or --secondary-foreground.
git -C $transit grep -n -P -- '--radius(?![-\w])|--secondary(?![-\w])|--(?:color-)?sidebar|(?:bg|text|border|ring|fill|stroke|from|via|to)-secondary(?![-\w])' origin/main -- apps packages
git -C $site grep -n -P -- '--radius(?![-\w])|--secondary(?![-\w])|--(?:color-)?sidebar|(?:bg|text|border|ring|fill|stroke|from|via|to)-secondary(?![-\w])' origin/main -- apps packages
rg -n --pcre2 -- '--radius(?![-\w])|--secondary(?![-\w])|--(?:color-)?sidebar|(?:bg|text|border|ring|fill|stroke|from|via|to)-secondary(?![-\w])' packages apps
# Inspect each hit's element and enclosing component, including CSS selectors and runtime strings.
git -C $transit grep -n -E 'data-icon|button-group|aria-invalid' origin/main -- apps packages
git -C $site grep -n -E 'data-icon|button-group|aria-invalid' origin/main -- apps packages
rg -n 'data-icon|button-group|aria-invalid' packages apps
```

A zero-match grep returns exit 1. Definitions, tests, migration docs and the frozen before-class
receipt are distinguished from uses. The remaining `data-slot="toggle-group"` attributes in
FilterGroup are intentional DOM compatibility, not imports of the removed module.

## No look change

[The class receipt](../evidence/deepen-primitive-classes.json) contains the exact computed `before`,
`after` and removed-token list for every retained cross-product of Button, Badge, Tabs.List and
Sheet variants/sizes, plus each no-props default: 50 cases. It was captured on the baseline before
editing. `primitive-cleanup.test.ts` checks every current combination against those baseline
strings, allowing only the listed inactive icon/group/invalid selectors. It also checks the
recorded after string. Defaults and compound CTA variants are included.

FilterGroup's two frozen DOM fixtures were captured before editing and pass after direct bits-ui
adaptation. Only generated ids, framework scope hashes, comment nodes and attribute ordering are
normalized. Element structure, remaining attributes, classes, values and test ids remain exact.
The tests also cover both densities, collapse/inert behavior, selection/reset/deselection,
external controlled updates and vertical roving focus with Space/Enter activation. Changing
orientation to horizontal deliberately fails both DOM fixtures and the keyboard test (3 failures),
then restoring the source passes all 13 FilterGroup cases. No behavior change is intended.

Generated CSS differences are exhausted by these removals:

- `theme.css`: eight sidebar mappings and `--color-secondary`, plus the empty separating line.
- `tokens.css`: exact `--radius`, its obsolete comment/blank line, and four `--secondary`
  declarations in the dark/light attribute blocks and dark/light media fallbacks.
- `DESIGN.md`: primitive subpath inventory changes 14 to 12. Motion tokens are byte-identical.

There are no changed CSS values, selectors, motion rules or token source values. Tabs.Trigger's
only source-class difference is removing `has-data-[icon=inline-end]:pr-1` and
`has-data-[icon=inline-start]:pl-1`; no consumer activates either selector. All other Tabs classes
and both list variants stay byte-identical. [The computed trigger receipt](../evidence/deepen-tabs-trigger-classes.json)
is checked against a rendered Tabs trigger by the same regression suite.

## API and licensing

Two UI subpaths disappear, with 12 exported names counted per subpath (11 distinct spellings):
`./toggle`: Root, Toggle, toggleVariants, ToggleSize, ToggleVariant, ToggleVariants;
`./toggle-group`: Root, Item, ToggleGroup, ToggleGroupItem, ToggleGroupProps, ToggleGroupItemProps.
Four public type families narrow: ButtonVariant (7 to 4), ButtonSize (12 to 6), BadgeVariant
(9 to 6), SheetSide (3 to 2). Corresponding variant-helper schemas and component props narrow
through those definitions. No root or brand export is removed. Tokens retain all subpaths;
only the hashes of the two public CSS assets change, removing 11 exact custom-property names.

`bun run api:report` regenerates the reports. API approval uses the exact current main SHA with
the pending fragment, not release-stage commands. Versions remain at v0.33.0.

NOTICE preserves all three exact copyright lines from
[upstream LICENSE.md](https://github.com/huntabyte/shadcn-svelte/blob/main/LICENSE.md).
The existing release packer copies root LICENSE and NOTICE into every archive. A local UI pack
was inspected with `tar -xOf ... package/NOTICE` and contains all three notices. No package or
release is published. The existing repository pack tests verify root-notice propagation and
restoration of temporary package notices.

Retained out-of-scope/dead surface: the FilterGroup root retains its legacy size/spacing markers
and classes to honor its DOM contract. No other removal beyond this slice is made. Named radius,
secondary-foreground, input and destructive-foreground tests remain.
