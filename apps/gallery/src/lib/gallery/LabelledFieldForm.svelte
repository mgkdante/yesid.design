<script lang="ts">
  import { tick } from 'svelte';
  import { Button } from '@yesid/ui/button';
  let { lang, copy }: { lang: string; copy: { title: string; required: string; email: string; hint: string; message: string; messageHint: string; emailError: string; messageError: string; summary: string; send: string; busy: string; done: string } } = $props();
  let email = $state('');
  let message = $state('');
  let errors = $state<string[]>([]);
  let busy = $state(false);
  let done = $state(false);
  let summary = $state<HTMLDivElement>();
  const id = (field: string) => `${lang}-${field}`;
  async function submit(event: SubmitEvent) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget as HTMLFormElement;
    const emailField = form.elements.namedItem('email') as HTMLInputElement;
    errors = [...(!emailField.validity.valid ? ['email'] : []), ...(!message.trim() ? ['message'] : [])];
    done = false;
    if (errors.length) {
      await tick();
      summary?.focus();
      return;
    }
    busy = true;
    // A bounded simulation, with no request or claim of delivery.
    await new Promise((resolve) => setTimeout(resolve, 1000));
    busy = false;
    done = true;
  }
  function focusField(event: MouseEvent, field: string) {
    event.preventDefault();
    document.getElementById(id(field))?.focus();
  }
</script>

<section {lang} aria-labelledby={id('title')}>
  <h2 id={id('title')}>{copy.title}</h2>
  <form novalidate onsubmit={submit} aria-labelledby={id('title')} aria-busy={busy}>
    <p id={id('required')}>{copy.required}</p>
    {#if errors.length}
      <div class="error-summary" tabindex="-1" bind:this={summary} role="group" aria-labelledby={id('summary')}>
        <h3 id={id('summary')}>{copy.summary}</h3>
        <ul>{#each errors as field}
          <li><a href={'#' + id(field)} onclick={(event) => focusField(event, field)}>{field === 'email' ? copy.emailError : copy.messageError}</a></li>
        {/each}</ul>
      </div>
    {/if}
    <div class="field">
      <label for={id('email')}>{copy.email}</label>
      <p class="hint" id={id('email-hint')}>{copy.hint}</p>
      <input class="labelled-input" id={id('email')} name="email" type="email" autocomplete="email" autocapitalize="none" spellcheck="false" required readonly={busy} bind:value={email}
        aria-invalid={errors.includes('email') ? 'true' : undefined}
        aria-describedby={`${id('required')} ${id('email-hint')}${errors.includes('email') ? ' ' + id('email-error') : ''}`} />
      {#if errors.includes('email')}<p class="error" id={id('email-error')}>{copy.emailError}</p>{/if}
    </div>
    <div class="field">
      <label for={id('message')}>{copy.message}</label>
      <p class="hint" id={id('message-hint')}>{copy.messageHint}</p>
      <textarea class="labelled-input" id={id('message')} name="message" required readonly={busy} bind:value={message}
        aria-invalid={errors.includes('message') ? 'true' : undefined}
        aria-describedby={`${id('required')} ${id('message-hint')}${errors.includes('message') ? ' ' + id('message-error') : ''}`}></textarea>
      {#if errors.includes('message')}<p class="error" id={id('message-error')}>{copy.messageError}</p>{/if}
    </div>
    <Button type="submit" size="cta" class="min-h-11 whitespace-normal motion-reduce:transition-none motion-reduce:translate-none" disabled={busy}>{busy ? copy.busy : copy.send}</Button>
  </form>
  <p role="status">{busy ? copy.busy : done ? copy.done : ''}</p>
</section>

<style>
  section { margin-block: 2rem; max-width: 32rem; overflow-wrap: anywhere; }
  h2 { font-size: 1.5rem; font-weight: 700; margin-bottom: 1rem; }
  h3, label { font-weight: 600; }
  form { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 1.25rem; display: grid; gap: 1.25rem; font-size: 1rem; line-height: 1.5; }
  .field { display: grid; gap: 6px; }
  label { font-size: 1.0625rem; }
  .hint { color: var(--muted-foreground); }
  .labelled-input { width: 100%; min-height: var(--size-tap-min); padding: 10px 12px; border: 1px solid var(--input); border-radius: var(--radius-md); background: var(--card); color: var(--foreground); font: inherit; font-size: 1.0625rem; }
  textarea { min-height: 7.5rem; resize: vertical; }
  .labelled-input:focus-visible, .error-summary:focus { outline: 2px solid var(--ring); outline-offset: 3px; }
  .labelled-input[aria-invalid='true'] { border-color: var(--destructive); }
  .error { color: var(--destructive); }
  .error-summary { border-inline-start: 3px solid var(--destructive); padding-inline-start: 1rem; }
  a { display: flex; align-items: center; min-height: 44px; color: var(--primary); text-decoration: underline; }
  [role='status'] { min-height: 1.5em; margin-top: 1rem; }
  input, textarea, .error-summary { scroll-margin-top: 8rem; }
</style>
