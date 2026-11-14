<script lang="ts">
 import { getContext } from 'svelte';
 import { SiteHeader } from '@yesid/ui/layout';
 import { Wordmark, type NavigationLifecycle } from '@yesid/ui/brand';
 import { Button } from '@yesid/ui/button';
 import { LABELS, LANGUAGE_NAMES } from '#lib/gallery/site-header-fixture.ts';
 const navigation = getContext<NavigationLifecycle>('gallery-navigation');
</script>

<SiteHeader {navigation} home="/header-seams" links={[]} menuItems={[]} compactControls wordmarkAutoPlay={false}
 labels={LABELS} language={{ locale: 'en', locales: ['en', 'fr', 'es'], href: next => `/header-seams?lang=${next}`, label: 'Language', names: LANGUAGE_NAMES }}>
 {#snippet brand()}
  <span class="brand-cluster"><Wordmark href="https://yesid.dev" external animate={false} /><a href="/header-seams" class="product-link">login</a></span>
 {/snippet}
</SiteHeader>
<main id="main" class="mx-auto max-w-5xl px-6" style="padding-top: var(--nav-clearance)">
 <h1 class="text-heading font-bold">Header seams and wrapping</h1>
 <div class="my-6 grid gap-4" style="width:200px">
  <Button wrap>Envoyer les instructions de connexion par courriel</Button>
  <Button wrap href="/header-seams">Enviar las instrucciones para iniciar sesión por correo</Button>
  <Button>Continue</Button>
 </div>
 <table style="width:100%; table-layout:fixed" aria-label="Deployment words">
  <thead><tr><th scope="col">Scope</th><th scope="col">Description</th></tr></thead>
  <tbody><tr><th scope="row">Deployment</th><td>Reliable environments support teams</td></tr>
   <tr><th scope="row">Long word fallback</th><td>Supercalifragilisticexpialidocioussupercalifragilisticexpialidocious</td></tr></tbody>
 </table>
</main>
<style>
 .brand-cluster { display: inline-flex; align-items: center; gap: 8px; font-size: 1.125rem; }
 .product-link { display: inline-flex; align-items: center; min-height: 44px; font-weight: 700; }
 th, td { padding: 8px; text-align: start; }
</style>
