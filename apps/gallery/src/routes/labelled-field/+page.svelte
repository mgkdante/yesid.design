<script lang="ts">
  import LabelledFieldForm from '#lib/gallery/LabelledFieldForm.svelte';
  const examples = {
    en: { title: 'Send a message', required: 'All fields are required.', email: 'Email address where you would like to receive a reply', hint: 'Use an address you can access. For example, name@example.com.', message: 'What would you like to discuss about your website or data tools?', messageHint: 'Describe the task and what you need help with.', emailError: 'Enter a complete email address, including the domain, so you can receive a reply.', messageError: 'Enter a message describing your task before sending this form.', summary: 'Review these fields', send: 'Send message', busy: 'Sending message…', done: 'Demonstration complete. No message was sent.' },
    fr: { title: 'Envoyer un message', required: 'Tous les champs sont obligatoires.', email: 'Adresse courriel à laquelle vous souhaitez recevoir une réponse au sujet de votre projet', hint: 'Utilisez une adresse à laquelle vous avez accès. Par exemple, nom@exemple.com.', message: 'Que souhaitez-vous améliorer dans votre site Web ou vos outils de données?', messageHint: 'Décrivez votre tâche et le soutien dont vous avez besoin.', emailError: 'Saisissez une adresse courriel complète, y compris le nom de domaine, pour recevoir une réponse concernant votre demande.', messageError: 'Décrivez votre tâche dans le champ de message avant d’envoyer ce formulaire.', summary: 'Vérifiez ces champs', send: 'Envoyer le message', busy: 'Envoi du message…', done: 'Démonstration terminée. Aucun message n’a été envoyé.' },
    es: { title: 'Enviar un mensaje', required: 'Todos los campos son obligatorios.', email: 'Dirección de correo electrónico en la que quieres recibir una respuesta sobre tu proyecto', hint: 'Usa una dirección a la que tengas acceso. Por ejemplo, nombre@ejemplo.com.', message: '¿Qué quieres mejorar en tu sitio web o en tus herramientas de datos?', messageHint: 'Describe tu tarea y la ayuda que necesitas.', emailError: 'Escribe una dirección de correo electrónico completa, incluido el dominio, para recibir una respuesta sobre tu solicitud.', messageError: 'Describe tu tarea en el campo de mensaje antes de enviar este formulario.', summary: 'Revisa estos campos', send: 'Enviar mensaje', busy: 'Enviando mensaje…', done: 'Demostración completada. No se envió ningún mensaje.' },
  };
</script>
<svelte:head><title>Labelled field recipe</title></svelte:head>
<div data-register="task" data-ripple-exempt>
  <h1 class="text-title">Labelled field recipe</h1>
  <p>Interactive demonstration only. These forms do not send messages. Submit empty fields to explore error recovery.</p>
  {#each Object.entries(examples) as [lang, copy]}<LabelledFieldForm {lang} {copy} />{/each}
  <section aria-label="Input boundary on page" class="boundary-proof">
    <label for="page-input">Email address on the page surface</label>
    <input id="page-input" type="email" autocomplete="email" />
  </section>
</div>
<style>
  .boundary-proof { max-width: 32rem; display: grid; gap: 6px; font-size: 1.0625rem; }
  input { min-height: 44px; width: 100%; border: 1px solid var(--input); background: var(--background); border-radius: var(--radius-md); padding: 10px 12px; }
</style>
