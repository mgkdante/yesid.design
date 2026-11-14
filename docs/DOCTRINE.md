# The yesid.design doctrine: honest, calm by default, expressive on purpose

Approved by the owner on 13 November 2026. Read this before composing a page.
Gallery fixtures accompany the rules they demonstrate below.

**Owner decisions this doctrine applies** (binding): keep the yesid.design philosophy, the four colours, cards and collapsible cards, and D15; WCAG 2.2 AA; equal languages; no em dashes; a section starts with its heading, never an eyebrow (10 November 2026); Transit answers 3A (test status colours before any change), 4A (calm data-reading style; one restrained construction scene on home and footer), 5A (a page may start chosen optional sections closed on a first visit) and 8A (compact phone header); and on 13 November 2026: the theme and language toggles stay exactly as they are and are core identity; the language order is English, French, Spanish, then English again, owned by yesid.design; the construction props keep their sliding animation; the yesid.dev home motion as decided (section 3); a mandate to apply the calm register to every other page while keeping everything he named; and his answers of that evening ("Approved and A to all"), among them orange text links (9A) and the French and Spanish voices (6A, 7A).

## 1. What stays, and what "slop" means here

yesid.design is "digital infrastructure that moves": edge to edge, dark first, four colours with named jobs (orange acts and signs, yellow guides, white reflects, black structures), Inter for reading, JetBrains Mono for code and technical notation, cards and collapsible sections with one remembered Expand all or Collapse all choice, motion with intent, no fluff. None of that changes.

In this doctrine, slop means **a default standing in for a decision**: a device that appears whatever the content, or decoration that looks like evidence. It is a judgment about repetition and meaning, not a guess about who or what made a page. A near-black page, an orange dot, a card, an arrow or a yellow highlight is not a defect on its own. Name the harm, fix its cause, and never score "tells".

**Keep:**

- the four colours and their roles, the yellow conversion rule, dark first with a working light theme;
- the theme and language toggles, exactly as they are (section 2);
- the signage vocabulary: the wordmark dot, the station-spine menu, route plates, departure-board readouts that carry real data;
- the construction scene with its sliding props, and the other signatures the owner named (section 3);
- Inter and JetBrains Mono, strong token contrast (body 16.84:1 dark, 16.28:1 light) and the focus outline with its forced-colours branch;
- cards, collapsible sections and D15; DataTable; StateNotice and honest absence; the motion policy, reduced-motion handling and the ripple exemption for reading surfaces; 44 px targets;
- real photographs, real screenshots beside their explanation, code shown as selectable highlighted text, the first-person plain voice, and the calm legal reading pages.

## 2. Core identity that does not change

These are yesid.design itself. No rule below overrides them, and no product restyles them.

- **The four colours** and their roles (Rule 3).
- **Inter and JetBrains Mono** in their roles (Rule 4).
- **Cards and collapsible cards**, with D15's remembered choice and the 5A opt-in (Rule 7).
- **The theme toggle and the language toggle.** `ThemeToggle` (the signal-lamp switch) and `LanguageToggle` (the signpost boards) stay exactly as they are in look and behaviour in every product. The language signpost moves to the next language on each tap, in the brand order **English, French, Spanish, then English again**. yesid.design owns that order (D18, roadmap item Y-27): a product passes the languages it publishes and the toggle orders them, so Transit's two languages cycle English, French. Products supply the language names and the theme label (D16). U1's opt-in `compactControls` may move both, unchanged, into the phone menu below a 600 px header (answer 8A). The theme lamp is a control that shows the visitor's own choice, not a status claim, so Rule 1 does not apply to it.

The owner kept the standard controls. The system-owned language order prevents product-specific cycling.

## 3. Signatures: expression allowed by name

A signature is an expressive element the owner has approved, with its job and its conditions. Pages may use a signature only where it is listed. A new signature joins this list only with the owner's approval.

| Signature | Where | Its job | Conditions |
| --- | --- | --- | --- |
| Theme and language toggles | Every product's header (or its phone menu, by opt-in) | Identity and the visitor's choices | Unchanged (section 2) |
| The wordmark and its dot | Every header and footer | Identity | The header's one-time wordmark play may be turned off on task pages (roadmap Y-18) |
| The construction scene and its sliding props | yesid.dev home closing; Transit home and footer (4A); below yesid.login's sign-in task | The brand's closing gesture | Where a page passes the reveal marker (`ConstructionProps` `revealAt`, as yesid.dev and Transit do), the props slide up out of the ground only as the visitor scrolls to the scene, exactly as today; under reduced motion they appear whole without moving. yesid.login passes no marker, so its scene is still today and stays so. The scene sits at the end of a page or below a task, never between the reader and the answer |
| The closing departure board | yesid.dev home closing | Real destinations (contact, GitHub, blog, About) as signage | Rows stay real links; no blinking cursor or invented readouts |
| "click me" and the Montréal metro scene | yesid.dev home opening | Invites the metro intro replay | Clicking opens the scene; under reduced motion it opens a still form of the scene with nothing moving |
| The nine manifesto flow lines | yesid.dev home | Ambient brand texture | A visible control pauses them; still under reduced motion; decorative text stays hidden from assistive technology, meaningful links stay readable |
| The glowing weather sun and the three drifting clouds (and the other weather scenes) | yesid.dev home, About, and Contact beside or after the form, never before it | Represent the current weather | Same pause control; still under reduced motion; if the weather cannot load, no weather is shown rather than a dash or a guess; a storm flash stays under three flashes a second |
| The shared error illustration | Every "page not found" | Shows that something is missing, in the brand's language | Small, after the heading and recovery links; its lights stay still (Y-22) |
| The bulk control's orange active state (D15 `activeEffect="glow"`) | Pages with Expand all | Shows that Collapse all is active | Allowed on reading pages |

**Removed by the owner's decision** (yesid.dev home): the headline dot's heartbeat pulse, the typewriter cursor, the two blinking terminal cursors, the three pulsing lamps and the pretend train countdown.

## 4. Three presentation registers

One brand, three registers. They share every contract that makes the family recognizable and trustworthy; they differ only in how much expression a page spends. Reading and task are the two calm registers. Under the owner's mandate of 13 November 2026, every page other than the expressive ones moves to the calm registers.

| | Expressive | Reading | Task |
| --- | --- | --- | --- |
| Job | Say who this is and why it matters, at the door | Understand and check, at the reader's pace | Finish a short action correctly |
| yesid.dev | Home; page not found | Case studies, articles, blog lists, services and service details, About, projects, legal | Contact |
| yesid.login | Page not found | Privacy and terms | Sign-in, code, site choice, site switch, editor hand-off, Account, People |
| Transit | The home closing scene and footer (4A) | Records, lines, stops, rankings, method, data health, legal | Search, map controls, filters |
| Title | Display type, one lead treatment | Title size, sentence case | Compact task heading, about 28 to 32 px |
| Density | Default | Default; compact for data products | Default; one bounded column, about 28rem |
| Decoration | The listed signatures, plus one lead gesture | Only listed signatures, in their own region at the end or beside the content | Only listed signatures, outside the task region |
| Motion | The listed signatures; feedback to actions | Only in answer to an action | Only in answer to an action |
| Surfaces | Framed cards allowed, never nested | One neutral surface per question | One neutral task card |
| Width | Full bleed allowed | Prose at 60 to 75 characters; wide columns only with a job | Bounded column; help beside or below |
| Tone | Same voice, bolder | Same voice, direct | Same voice, shortest |

**Identical in every register:** the chrome mechanics (pill header, menu, footer without invented status, skip link, landmarks in the same order), the theme and language toggles, the four colour roles, the type families and roles, the focus outline (solid orange, at least 3:1 against what surrounds it), the link and button hierarchy, the voice of errors and empty states, the spacing and radius scales, the motion policy and the accessibility floor (WCAG 2.2 AA).

**Placement:** expressive elements sit at the door (the top of an expressive page), at the end (a closing section or the footer zone), or beside the main content as context (the weather on About and Contact). Never between a reader and the answer, never inside a form or task region.

**How a page declares its register:** set `data-register="expressive"`, `"reading"` or `"task"` on the route's top element (the first element inside `<main id="main">`); an undeclared page is reading. A signature region may declare its own register: the section or container that holds a closing scene carries `data-register="expressive"` even on a reading or task page, and a layout-owned footer scene (Transit's) carries it on the layout's scene container. The attribute is a declaration for reviewers, mockups, Gallery fixtures and product tests (a product may fail a test when a scene renders outside an expressive region; that policy stays with the product, per D7). No component reads it, and it is neither a theme nor a visitor setting: light and dark are a separate axis, and no "quiet mode" returns. Calm arrives through component options that pages choose, and default changes happen only where the owner approves them as named exceptions.

Reading and task share calm rules but differ in width, density and what comes first.

## 5. Rules

Each rule has its reason and a do / don't pair. "Carried by" names the yesid.design release that adds the option a product needs (the shared component roadmap). The full rules apply when a recomposed page is completed; follow-up shared options are listed below.

### Rule 1. Decoration never looks like evidence

Lamps, dates, "Live", "Online", "System", demo figures, telemetry ticks, serial numbers, drawing stamps, coordinates and countdowns appear only when a real source supplies the state, its subject and its time. Otherwise they are not drawn. The theme toggle's lamp is a control, not a status (section 2).

**Why.** Readers take a lamp or a date as a measurement. Earlier footers drew a pulsing "Live" lamp and a date the component made up, and terminal panels always drew a green lamp, even around a contact form.

**Gallery:** [`/site-header`](../apps/gallery/src/routes/site-header/+page.svelte).

| Do | Don't |
| --- | --- |
| "Simulated data. This is a demonstration." beside the figures it describes | "Routes live" and a green lamp over demo numbers |
| A live figure with its age: "Updated 30 seconds ago" | "SYSTEM 2026.11.13" made by the component |
| A footer with links, attribution and no state | A pulsing lamp on a contact form or a code sample |
| A dated screenshot and a link to the live tool | "SCALE 1:48 · DWG AZUR-001-A" beside real work |

Carried by: TerminalPanel `signal` and optional footer status (v0.42.0); documentation and deprecation of the self-made footer date (Y-25, v0.43.0).

### Rule 2. Spend boldness on purpose

Reading and task pages spend no boldness of their own: their identity comes from the shared chrome, the toggles, the type and the colour roles, and at most a signature region at their end. An expressive page leads with one gesture at the door and may carry the signatures listed in section 3. Never add new costumes: no console, construction site or technical drawing stacked on a page beyond the listed signatures. Real material is not a gesture: screenshots, photographs, diagrams and code that explain the work are content and are never rationed.

**Why.** Boldness spent on purpose is remembered; costumes stacked everywhere dilute the identity and push the answer down. A slogan, metric tiles and a decorative console can fill the opening before the reader learns what the product does.

**Gallery:** [`/registers`](../apps/gallery/src/routes/registers/+page.svelte).

| Do | Don't |
| --- | --- |
| Home: the offer and one action, then a real client project; "click me" and the metro scene; the closing scene at the end | Slogan, metric tiles, console, hazard tape and blueprint art in one opening |
| Case study: real screenshots beside each explanation | A decorative drawing in place of the product's own screens |

### Rule 3. Each colour has one job

- **Orange acts and signs:** buttons, links (underlined inside text), focus, the selected tab or view, route signage, and the keywords of highlighted code. Not static card borders, not status.
- **Yellow guides and highlights:** the screen's one highlight, departure-board signage, map and diagram amber, hazard tape for a real caution, string colours in highlighted code, and the "talk to Yesid" conversion button, at most one per view. Not ordinary numbers, not labels above headings, not status.
- **The highlight** is the one yellow emphasis that tells the reader where to look: the answer figure or the selected item. It does not count signage, hazard tape, code syntax or the conversion button.
- **Text links** are underlined in the orange text ink (`primary`), like everything else that acts (owner answer 9A, 13 November 2026; Y-28). Yellow is never a link colour: on Transit's maps it already marks late buses, stops, the selected line and a button.
- **White reflects:** reading ink for text and for ordinary numbers.
- **Black structures:** rules, tape and the deep board.
- **Status colours** belong to named states only, always with a word and a shape (Transit: ▼ Early, ● On time, ▲ Late, ○ Delay unknown; yesid.login: a dot beside "Access confirmed"), never as decoration or a chart series. No status palette is verified colour-blind safe; tokens change only after the owner chooses from the rendered colour test (3A, item Y-7).
- **Charts:** one neutral colour for a single series; a legend and direct labels for two to four series; values and labels in text colours, never a series colour; one axis per chart.

**Why.** When highlights, ordinary figures, status and links share a colour, readers must guess what the colour means. Giving each colour one job keeps actions distinct from evidence and wayfinding.

**Gallery:** [`/text-links`](../apps/gallery/src/routes/text-links/+page.svelte).

| Do | Don't |
| --- | --- |
| "71% of readings were on time" in reading ink; the selected line is the screen's one highlight | Four yellow numbers on one card |
| "Step 1 of 2" in muted ink, sentence case | Yellow "STEP 1 OF 2" and yellow member counts |
| A neutral border on a static card; orange on the selected one | An orange frame around every block |
| An underlined orange link inside a sentence | A yellow link next to the screen's yellow highlight |

Carried by: Y-28 orange text links (v0.43.0), Y-6 neutral surfaces (v0.44.0), Y-5 metric tone (v0.45.0), Y-7 colour roles and the status test (status tokens release).

### Rule 4. Type carries meaning, not costume

- Sentence case for titles, headings, labels and buttons.
- Uppercase only for short signage (route plates, sign codes, the language signpost's boards) and, on an expressive page, one short display line.
- JetBrains Mono only for code, identifiers, stop codes, timetable values and timestamps that compare. Small labels are Inter.
- Tabular figures for numbers that compare.
- No eyebrow: a section starts with its heading. No kicker that repeats the brand above a task title. Under the owner's mandate this includes removing eyebrows already shipped.
- No single accented word or colour inside a title.
- Numbers mark real sequences only.
- Floors: body 16 px or more; meaningful labels 12 px or more, preferably 14 to 15 px; mono 13 px or more; the 11 px micro size for chrome only. Text wraps; it never shrinks to fit.
- A separator joins facts a reader needs ("Record · data through Nov 10"), never system-like fragments.

**Why.** Monospace, tracked uppercase labels and tiny categories made ordinary reading look like technical signage. Highlighting part of a word can also change its meaning, so type treatment must follow the content.

**Gallery:** [`/registers`](../apps/gallery/src/routes/registers/+page.svelte).

| Do | Don't |
| --- | --- |
| "Step 1 of 2" | "SERVICE 01 / 04" on items that are not steps |
| "In brief" as a heading, then the finding | "STOP 01 · LANGUAGES" above a section |
| A title in one colour and weight | One orange word inside a white title |
| Stop code "51234" in mono | Stop names, dates and prose in mono |

Carried by: Y-22 optional Masthead kicker and Y-4 calm article header (v0.43.0); Y-8 label roles (v0.44.0).

### Rule 5. One surface per question; hover only on things that act

Cards hold one subject; comparisons are aligned rows inside one card; no card inside a card inside a section. Static cards use the neutral border; orange edges mark interaction or selection. Hover, press and lift effects appear only on whole-card links, buttons and section headings. No glow on reading or task surfaces, with two exceptions: the bulk control's orange active state (D15) and lit artwork in a signature region; the glow tokens otherwise serve the conversion button on expressive pages.

**Why.** Repeated frames compete with the content and hide which items belong together. Hover effects on static cards suggest an action that the surface cannot perform.

**Gallery:** [`/registers`](../apps/gallery/src/routes/registers/+page.svelte).

| Do | Don't |
| --- | --- |
| People as one card with a row per person: identity, role, state in words, actions | An orange frame around each person |
| A whole-card project link that lifts on hover | A hover glow on a static metric tile |

Carried by: Y-1 heading-only hover on sections (v0.42.0), Y-6 (v0.44.0), Y-11 row recipes (v0.45.0).

### Rule 6. Headings answer

A page title names the subject in plain words. A section heading says what the section tells; its summary gives the finding. A task heading says the task. No slogan in a reading or task title, no console phrase, no rotated or visually hidden title.

**Why.** Ceremonial title stages delay the answer, especially on a phone. A plain heading tells readers what the page contains or what they can do next.

**Gallery:** [`/registers`](../apps/gallery/src/routes/registers/+page.svelte).

| Do | Don't |
| --- | --- |
| "Sign in to edit your website" | "Login" alone, with the brand only in the footer |
| Case study: "In brief", then who has the problem, what Yesid did, the result and its current limit | A heavy uppercase title on a circuit canvas before the first sentence |
| "Page not found" with a way back | "Under construction" for a missing page |
| A horizontal page title on every width | A desktop title shown only as a rotated edge label |

### Rule 7. Sections toggle from their heading and keep their summary

- Cards and collapsible sections stay.
- Only the heading opens or closes a section; a tap, click or text selection in the body never does.
- A closed section shows its summary (the finding, the period, any serious limit), never clamped.
- The page's main answer is never inside a collapsible body. Two levels at most: page, section, one inner detail.
- D15 stands: on a page with the Expand all control and at least two content sections, a first visit opens content sections, and the visitor's saved bulk choice wins later. With 5A, a page may start chosen optional sections closed on a first visit (Y-12); the saved choice still wins. Individual toggles affect that view only; the TOC and filters stay independent.
- Do not mark ordinary content sections `independent` to escape the visitor's choice.

**Why.** A paragraph that closes its section when tapped interrupts reading and text selection. A clipped summary hides the finding or its limits exactly when the body is closed.

**Gallery:** [`/sections`](../apps/gallery/src/routes/sections/+page.svelte).

| Do | Don't |
| --- | --- |
| Closed: "Cancellations. {share} of trips, {complete period}. {serious limit}." (format only; no figure implied) | Closed: "Cancellations" and the same line clipped after two lines |
| "Technical details" closed on a first visit (Y-12), opened by its heading | The case study's "In brief" inside a collapsible card |

Carried by: Y-1 (v0.42.0), Y-12 (v0.43.0).

### Rule 8. Motion has a job; reading stays still

Motion answers an action (open, close, confirm, navigate, a refresh result) or is one of the signatures in section 3. Reading and task surfaces stay still: no new ambient loops, pulses, blinking or count-ups. A signature that loops on its own for more than five seconds has a visible control that pauses it and stops under reduced motion (WCAG 2.2.2). A scroll-linked signature, such as the construction props' slide, moves only while the visitor scrolls and appears whole under reduced motion. Reading surfaces keep native scrolling and carry `data-ripple-exempt` (D9). Under reduced motion nothing scales, slides or blinks, and every signature uses its still form.

**Why.** Endless decorative motion competes with reading, and a pulsing lamp can imply a state nobody measured. Motion that answers an action or belongs to a named signature keeps a clear purpose.

**Gallery:** [`/error-page`](../apps/gallery/src/routes/error-page/+page.svelte).

| Do | Don't |
| --- | --- |
| The construction props slide up as the visitor reaches the closing scene; with reduced motion they appear whole | Every card fades up as it scrolls into view |
| The manifesto lines move, with a "Pause animation" button beside them | Lamps that blink on a 404 while the reader looks for a way back |

Carried by: Y-2 and Y-13 (v0.42.0); still error illustration option (Y-22, v0.43.0); the yesid.dev pause control and "click me" still form are product work.

### Rule 9. Plain, specific words in every language

- Name things as the reader knows them. Describe what was built, for whom, and its limit. No slogans in reading or task copy, no superlatives, no "AI" as a selling word: say what the automation does and where a person approves it.
- Actions start with a verb and keep their name through the flow: "Send message", then "Message sent".
- Errors say what happened, then what to do; no blame, no apology, no error codes. Empty states say what this is, why it is empty and how to start. Confirmations name the action and its consequence.
- No command syntax in a human task ("$ yesid --contact", "send --message", "Initialize connection").
- English, Québec French and neutral Spanish are equal and complete, including errors, emails and fallbacks. French uses "courriel" and "vous" on commercial, form and task pages, while personal essays keep their authored voice (answer 6A); Spanish uses "tú" in product and site text, and the legal text keeps "usted" until its own review (answer 7A).
- No em dashes. No count that will go stale in permanent text ("three sites"); a number that matters is a dated measurement.
- Products own every visitor-facing word; components ship none (D16). The owner approves commercial and legal wording; interface wording follows the plan's drafts under his mandate.

**Why.** Vague promises and command syntax make readers work out both the meaning and the next action. Plain words and complete translations let each visitor follow the same journey.

| Purpose | English | Français (Québec) | Español |
| --- | --- | --- | --- |
| Action | Send message | Envoyer le message | Enviar mensaje |
| Result | Message sent. Thank you for getting in touch. | Message envoyé. Merci de m'avoir écrit. | Mensaje enviado. Gracias por escribir. |
| Error | Your message was not sent. Your draft is still here. Try again or email contact@yesid.dev. | Votre message n'a pas été envoyé. Votre brouillon est conservé. Réessayez ou écrivez à contact@yesid.dev. | El mensaje no se envió. El borrador sigue aquí. Inténtalo de nuevo o escribe a contact@yesid.dev. |
| Empty | No projects match these filters. Clear search and filters | Aucun projet ne correspond à ces filtres. Effacer la recherche et les filtres | Ningún proyecto coincide con estos filtros. Borrar la búsqueda y los filtros |
| Confirmation | Remove {email}'s access to {site}? This person will no longer be able to edit this website. | Retirer l'accès de {email} à {site}? Cette personne ne pourra plus modifier ce site. | ¿Quitar a {email} el acceso a {site}? Esta persona ya no podrá editar este sitio. |

Don't: "Initialize connection ->", "I help businesses grow.", "Invalid or expired code." shown before any code was entered. The Spanish lines use "tú" (answer 7A).

### Rule 10. Honest absence, demonstration and failure

Every figure and every state has its own words: live (with its age), last received (held), simulated (a demonstration), unavailable (failed, with a next step), measured zero ("0" with its unit), not published, not enough data. Never a lone dash, never zero for "not measured", never failure words for a deliberate demonstration, never success words for something that only might have happened.

**Why.** A dash, zero or generic message makes readers guess whether a value was measured, is missing or failed to load. Calling a chosen demonstration a failure, or a request an accomplished result, creates the same confusion.

| State | English | Français (Québec) | Español |
| --- | --- | --- | --- |
| Demonstration | Simulated data. This is a demonstration. | Données simulées. Ceci est une démonstration. | Datos simulados. Esta es una demostración. |
| Held | Last received {age} ago. Refresh unavailable. | Dernières données reçues il y a {durée}. Mise à jour indisponible. | Últimos datos recibidos hace {tiempo}. Actualización no disponible. |
| Failure | Live data is unavailable. View the demonstration. | Les données en direct sont indisponibles. Voir la démonstration. | Los datos en vivo no están disponibles. Ver la demostración. |
| No capability | No live data for this line | Aucune donnée en direct pour cette ligne | No hay datos en vivo para esta línea |
| Request accepted | Request received. Check your inbox and junk mail. | Demande reçue. Vérifiez votre boîte de réception et vos courriels indésirables. | Solicitud recibida. Revisa tu bandeja de entrada y el correo no deseado. |

Don't: "-" where a weather value failed; "Email sent" when the service only accepted a request; "Live data unavailable" over a demonstration that was chosen on purpose.

### Rule 11. Leave the identity controls alone

The theme toggle and the language toggle are the standard yesid.design ones on every page of every product: same look, same behaviour, same place in the header (or in the phone menu by U1's opt-in). The language signpost cycles in the brand order. No product relabels, restyles or replaces them, and no mockup shows a substitute.

**Why.** The owner kept the theme and language toggles as core identity. A shared language order prevents products from giving the same control a different next step.

**Gallery:** [`/site-header`](../apps/gallery/src/routes/site-header/+page.svelte), [`/site-header-compact`](../apps/gallery/src/routes/site-header-compact/+page.svelte).

| Do | Don't |
| --- | --- |
| Pass the published languages and their names; the toggle orders them English, French, Spanish | Pass a product-specific order, or draw a separate language menu |
| Let `compactControls` move both toggles into the phone menu | Swap the signal lamp for a text switch |

Carried by: U1 (v0.42.0); the brand language order (Y-27, v0.42.0).

### Rule 12. Real material is the signature

Distinctiveness comes from Yesid's real work: screenshots beside the text they explain, named contributions, highlighted code as selectable text, real photographs, route plates, and the scenes he made. No stock imagery, placeholder media or invented outcomes. A number that is evidence shows its unit and period, and its source where one exists. The service metrics already published on yesid.dev keep their approved form, without a source, date or tooltip (owner rule); a published metric stays unless it is wrong.

**Why.** Real screenshots, photographs and selectable code let readers inspect the work being described. Invented machinery and decorative imagery provide no comparable proof.

| Do | Don't |
| --- | --- |
| A dated screenshot of the live Transit dashboard beside its explanation, and a link to it | A simulated dashboard as the hero's proof |
| Café Arona's real store, with its current limit stated | An outcome, client name or quote nobody can check |

### The floor under every rule

WCAG 2.2 AA in every register and theme: text contrast 4.5:1; a focus indicator and input boundaries of at least 3:1 against what surrounds them (the `input` token gives 3.12:1 or more on cards; Button keeps the 2 px offset outline, Y-17); 44 px targets as the product standard (24 px minimum); nothing essential on hover alone; reduced motion respected; a pause control for any looping signature; content readable without JavaScript where the server can render it; equal journeys in every offered language.

## 6. Amended sentences for `DESIGN.md` and `tokens.json`

The generator and token descriptions carry these colour roles. They change no token value.

> **YELLOW: wayfinding and highlight** (`accent` as surface and art; `accent-text` as AA text; `line-amber`; `accent-surface`): the one highlight per screen (the answer figure or the selected item), departure-board signage, map and diagram amber, string colours in highlighted code, and hazard tape for a real caution or the page's signature. Not for ordinary numbers, labels above headings or status: ordinary numbers use reading ink, and status uses the status tokens with a word and a shape. The yellow conversion rule is unchanged: the only clickable yellow surface is the "talk to Yesid" button, at most one per view; every other yellow stays unclickable, text links included (they are orange).

With owner answer 9A (13 November 2026), Y-28 also changes the ORANGE role's last sentence, from "The clickable hue for everything except conversion and text links (below)." to:

> The clickable hue for everything except conversion (below), text links included: a link without a class is underlined in `primary` ink.

Additions to the generated Overview, Typography and Do's and Don'ts:

- Overview: "Before composing a page, read the doctrine (`docs/DOCTRINE.md`): core identity, signatures by name, three registers, calm by default."
- Typography: "Sentence case. Uppercase only for short signage. A section starts with its heading, never with a label above it."
- Don't: "Draw a status, date or lamp without a real source." "Put a label above a heading." "Accent one word of a title." "Add hover effects to content that does not act." "Restyle the theme or language toggle." "Colour a link yellow."
- Elevation: no glow on reading or task surfaces except the D15 bulk control and lit artwork in a signature region; the existing drift ("no raw box-shadow in components" while Card, SiteHeader, TocNav and StopLabel draw their own) is resolved by documenting each exception or consolidating it.
- Decisions: a new D18 records that the toggles are core identity and that yesid.design owns the language order, with a note in D8 that this is its one exception to product-owned locale policy.

## 7. Where the system carries each rule

| Rule | Shared contract | Release |
| --- | --- | --- |
| 1 Evidence | TerminalPanel `signal`; optional footer status | v0.42.0 |
| 1 Evidence | Self-made footer date documented and deprecated (Y-25) | v0.43.0 starts the deprecation |
| 3 Colour | Orange underlined text links (Y-28) | v0.43.0 |
| 3 Colour | Neutral static Card and section borders (Y-6) | v0.44.0 |
| 3 Colour | MetricDisplay reading-ink tone and tabular figures (Y-5) | v0.45.0 |
| 3 Colour | Status palette, after the rendered test and the owner's choice (Y-7) | Status tokens release |
| 4 Type | Calm article header, whole-word emphasis only, readable category (Y-4); Masthead kicker optional (Y-22) | v0.43.0 |
| 4 Type | Sentence-case label role, optional TOC counter (Y-8) | v0.44.0 |
| 5 Surfaces | Heading-only hover on sections (Y-1) | v0.42.0 |
| 5 Surfaces | Hover only on interactive cards (Y-6); comparison, narrative and member-list recipes (Y-11) | v0.44.0, v0.45.0 |
| 7 Sections | Heading-only toggle and unclamped summary (Y-1) | v0.42.0 |
| 7 Sections | Chosen optional sections closed on a first visit (Y-12) | v0.43.0 |
| 8 Motion | No signal pulse by default (Y-2); overscroll only for fine pointers (Y-13) | v0.42.0 |
| 8 Motion | Still error illustration option (Y-22) | v0.43.0 |
| 11 Identity controls | Compact phone menu placement (U1); brand language order (Y-27) | v0.42.0 |
| Floor | Visible focus on filled buttons (Y-17) | v0.42.0 |
| Floor | Labelled field recipe (Y-20); calm reading frame for legal and long prose (Y-21) | v0.43.0, v0.45.0 |

## 8. The five-minute review

This is the completion review of a recomposed page and every mockup before the owner sees it. Full product acceptance also runs every language, theme and assistive-technology journey. Open the page at 390 px and 1440 px, in both themes and in one other language, then answer each line yes or no; a "no" goes back to the page's builder.

1. **Register.** The page declares `data-register`; decoration matches it; signatures appear only as listed in section 3, at the door, at the end or beside the content, never inside a form.
2. **Job.** On the first phone screen, a stranger can say what the page is for and what to do next.
3. **Evidence.** No lamp, "Live", "Online", date, countdown or serial appears without a real source; any demonstration says so beside its figures.
4. **Absence.** Every missing or failed value has words, not a dash or a zero.
5. **Colour.** One highlight per screen and at most one yellow button per view; no yellow link; orange only on actions and links, selection, signage and code syntax; any status colour comes with a word and a shape.
6. **Type.** No label above a heading, no accented word in a title, uppercase and mono only for signage, codes and identifiers; numbers that compare line up; nothing meaningful under 12 px.
7. **Surfaces.** One surface per question, no frame inside a frame; static cards do not react to hover.
8. **Sections.** Tapping body text leaves the section open; a closed section still shows its finding; the page's answer is outside every collapsible body.
9. **Motion.** Nothing moves while you read except a listed signature; any looping signature has a pause control; with reduced motion on, nothing scales, slides or blinks, and signatures show their still form.
10. **Words.** Actions start with a verb; errors say what to do; no command syntax or slogan in reading or task copy; all offered languages are present and natural; no em dash.
11. **Controls and focus.** Tab through the page: every button, link and field shows a visible focus outline; the theme and language toggles are the standard ones, unchanged.
12. **Phone.** At 390 px in French or Spanish, nothing is clipped, every target is at least 44 px, and the fixed header hides no focused control.

## 9. Words used in this doctrine

- **Register:** the amount of expression a page or region spends: expressive, reading or task. Light and dark are a separate axis.
- **Signature:** an expressive element the owner approved by name, with its job and conditions (section 3).
- **Evidence:** anything a reader will take as a measured fact: a number, a status, a date, a lamp. It needs a source, a subject and a time.
- **Demonstration:** simulated content shown on purpose, always labelled where it appears.
- **Highlight:** the one yellow emphasis on a screen that tells the reader where to look.
- **Summary:** the finding a section keeps visible when it is closed.
