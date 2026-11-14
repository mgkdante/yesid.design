/** Task headings in yesid.login's words, with long French and Spanish so wrapping is visible. */
export const mastheads = [
	{
		lang: 'en',
		kicker: 'yesid. | login',
		heading: 'Change my email',
		lede: 'Verify your current address, then your new address with two codes.',
	},
	{
		lang: 'fr',
		kicker: 'yesid. | connexion',
		heading: 'Changer mon adresse courriel de connexion et de récupération',
		lede: 'Vérifiez votre adresse actuelle, puis votre nouvelle adresse avec deux codes envoyés l’un après l’autre.',
	},
	{
		lang: 'es',
		kicker: 'yesid. | inicio de sesión',
		heading: 'Cambiar mi dirección de correo electrónico de inicio de sesión',
		lede: 'Verifica tu dirección actual y luego tu nueva dirección con dos códigos enviados uno tras otro.',
	},
] as const;
