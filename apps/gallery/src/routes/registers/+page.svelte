<svelte:head><title>Presentation registers</title></svelte:head>
<h1 class="text-title">Presentation registers</h1>
<p>One brand, three registers. Light and dark are a separate axis. See the doctrine for the five-minute review.</p>
<section data-register="expressive" aria-labelledby="expressive">
  <h2 id="expressive" class="text-title">Digital infrastructure that moves</h2>
  <p>A lead treatment belongs at the door. Signatures need their own named job and conditions.</p>
</section>
<section data-register="reading" data-ripple-exempt aria-labelledby="reading">
  <h2 id="reading" class="text-reading-heading">What the observation tells us</h2>
  <p class="text-reading">A reading page puts its answer first, followed by the period, source and limits.
    This example is a demonstration. <a href="/text-links">Read the source fixture</a>.</p>
  <p lang="fr">Les résultats sont accompagnés de leur période d’observation complète et des limites de la méthode.</p>
  <p lang="es">Los resultados incluyen el período completo de observación y las limitaciones del método.</p>
</section>
<section data-register="task" data-ripple-exempt aria-labelledby="task">
  <h2 id="task" class="text-heading">Send a message</h2>
  <p>Finish one action in a bounded column. Help follows the question. This is a demonstration form.</p>
  <label for="message">Message / Votre message / Tu mensaje</label>
  <textarea id="message" rows="3"></textarea>
  <p>No message is sent from this fixture.</p>
</section>
<style>
  section { margin-block: 2rem; padding-block: 1rem; }
  [data-register="reading"] { max-width: 70ch; }
  [data-register="task"] { max-width: 28rem; }
  p { margin-block: 1rem; }
  textarea { display: block; width: 100%; border: 1px solid var(--input); background: var(--card); color: var(--foreground); }
</style>
