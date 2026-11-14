<script lang="ts">
  import { Button } from '@yesid/ui/button';
  const surfaces = ['background', 'card', 'muted', 'popover', 'terminal-chrome', 'manifesto', 'accent-surface'];
  const copy = {
    en: 'Read the source and its observation period before comparing these results.',
    fr: 'Consultez la source et sa période d’observation complète avant de comparer les résultats présentés sur cette page.',
    es: 'Consulta la fuente y su período completo de observación antes de comparar los resultados que se presentan en esta página.',
  };
</script>
<svelte:head><title>Text links</title></svelte:head>
<div data-register="reading" data-ripple-exempt>
  <h1 class="text-title">Text links</h1>
  <p>Orange links stay underlined. Yellow highlights and the conversion button have separate jobs.</p>
  <Button variant="conversion" size="cta" href="#source">Talk to Yesid</Button>
  <p>Highlighted figure: <strong class="text-accent-text">42 trips</strong>. Demonstration only.</p>
  {#each ['page', 'island'] as region}
    <section class:theme-dark={region === 'island'} aria-label={region === 'island' ? 'Dark island' : 'Page surfaces'}>
      {#each surfaces as surface}
        <div data-link-surface={surface} data-region={region} style:background={'var(--' + surface + ')'}>
          <h2 class="text-reading-heading">{surface}</h2>
          {#each Object.entries(copy) as [lang, sentence]}
            <p {lang}>{sentence} <a href="#source">{lang === 'fr' ? 'Consulter la source et la méthode détaillée' : lang === 'es' ? 'Consultar la fuente y el método detallado' : 'Read the source and method'}</a>.</p>
          {/each}
        </div>
      {/each}
    </section>
  {/each}
  <p id="source">Demonstration fixture. These links do not claim a live measurement.</p>
</div>
<style>
  [data-link-surface] { padding: 1rem; margin-block: 1rem; color: var(--foreground); overflow-wrap: anywhere; }
  p { margin-block: 1rem; }
</style>
