# Labelled fields

Use the Gallery `/labelled-field` recipe for contact, account and search fields. It is a
composition of native HTML and Button, not a published Field component. D14 promotion waits
until yesid.dev and yesid.login need the same contract. One-time-code parsing, expiry,
resend and authentication stay in yesid.login.

Keep a visible sentence-case label linked with `for` and a unique field `id`. Place a hint
beside it; a placeholder never replaces either. State which fields are required before the
form, use native `required`, and include that guidance in each field's description.
Use Inter at 16 to 17px, a minimum 44px field and action height, wrapping labels and errors,
and no fixed text heights. Keep native scrolling, focus outlines and `data-ripple-exempt`.
For the form action use Button's existing `size="cta"`, a 44px minimum and wrapping text.
Disable its transitions and translation under reduced motion, as the Gallery does.

```svelte
<p id="required">All fields are required.</p>
<label for="email">Email address</label>
<p id="email-hint">Use an address you can access.</p>
<input id="email" name="email" type="email" autocomplete="email" required
  class="labelled-input" aria-invalid={error ? 'true' : undefined}
  aria-describedby={`required email-hint${error ? ' email-error' : ''}`} />
{#if error}<p id="email-error">{error}</p>{/if}
```

Descriptions retain the hint when the error appears. Mark only invalid fields with
`aria-invalid="true"`; remove it after successful revalidation. On a failed submit, render
a summary before the fields, give it `tabindex="-1"` and a heading through `aria-labelledby`,
then `await tick()` and focus it. Each summary link has a real `href="#field-id"` and focuses
that native field when activated. Allow enough scroll margin below fixed chrome.
The runnable Gallery form demonstrates this sequence and repeated submissions.

Validate again on the server. Client validation is a convenience, not a trust boundary.
Use `novalidate` only when implementing the full accessible error flow. Preserve entered
values after validation and transport errors. Actual products retain their native server
submission path where available. The Gallery deliberately simulates sending and makes no request.

While sending, prevent duplicate submission, mark the form busy, keep visible sending text
and a persistent status region outside the busy subtree. Keep values readable. Report actual
server results without claiming delivery when only a request was accepted. A transport failure
must explain retry or an alternate contact and preserve the draft.

## Boundary and text

The fix is a documented product class using the existing **input** token, not a token value
change. The audited yesid.dev contact form uses `--border` before submit and measured only
1.62:1 dark and 1.73:1 light (13 November audit). Those are consumer measurements, not
measurements of `--input`. Replace that field boundary class with `border-color: var(--input)`.
The Gallery browser spec measures this token against page and card in both themes with a
3:1 floor. No token value change is proposed or included; any future value proposal needs
owner approval and a separate contrast review.

```css
.labelled-input {
  width: 100%; min-height: 44px; padding: 10px 12px;
  border: 1px solid var(--input); border-radius: var(--radius-md);
  background: var(--card); color: var(--foreground);
  font-family: 'Inter Variable', sans-serif; font-size: 1.0625rem; line-height: 1.5;
}
.labelled-input:focus-visible { outline: 2px solid var(--ring); outline-offset: 3px; }
```

An error needs text as well as any destructive border. Use `autocomplete="name"` for a
person's own full name, `email` for their reply address, and `organization` where appropriate.
A message has no autocomplete purpose token. An invitation address describes another person,
so assess autofill separately. `one-time-code` belongs only on yesid.login's code field.

## Consumer acceptance

Products own every translated word and validation rule. French task copy uses vous and
courriel; Spanish uses tú. The Gallery keeps EN, long Québec FR and long ES labels and errors
visible together so every case can be exercised without changing the identity toggles.

| Consumer | Adoption checks |
| --- | --- |
| yesid.dev DEV-2 / DEV-9 | Contact labels, autocomplete, hints, required guidance, summary focus and links, server failure with retained draft, busy text; replace the weak border class |
| yesid.login LOG-1 / LOG-2 / LOG-5 | Sign-in, invitation and account fields; preserve product OTP semantics and document navigation; verify errors and request-accepted wording |
| Transit search | Visible search label and hint, purpose where applicable; search need not invent required fields or a submit-error summary |

For each adoption check keyboard and assistive-technology recovery, both themes, 320 to
1440px, 200% text and 400% zoom, 44px targets and reduced motion in all published languages.
Gallery axe and browser proof are repository evidence, not consumer acceptance or a native
language review. The B1 field proposal supplies the same stacked label/hint, card and token boundary.
