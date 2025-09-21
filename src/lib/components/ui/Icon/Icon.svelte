<!--
 * Componente Icon wrapper para iconos Lucide
 * Simplifica el uso de iconos y permite cambiar fácilmente el sistema de iconos
-->
<script>
	import * as Icons from 'lucide-svelte';

	let {
		/** @type {string} Nombre del icono de Lucide */
		name = 'Circle',
		/** @type {number | string} Tamaño del icono */
		size = 24,
		/** @type {string} Clases CSS adicionales */
		class: className = '',
		/** @type {string} Color del icono */
		color = 'currentColor',
		/** @type {number} Ancho del stroke */
		strokeWidth = 2,
		...props
	} = $props();

	/** Componente dinámico del icono */
	const IconComponent = $derived(() => {
		// Convertir nombre de snake-case a PascalCase si es necesario
		const iconName = name
			.split('-')
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join('');

		return Icons[iconName] || Icons.Circle;
	});
</script>

<svelte:component
	this={IconComponent()}
	{size}
	{color}
	stroke-width={strokeWidth}
	class={className}
	{...props}
/>
