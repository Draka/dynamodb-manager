<!--
 * Componente para alternar entre tema claro y oscuro
 * Incluye iconos animados y estado visual
-->
<script>
	import { Sun, Moon, Monitor } from 'lucide-svelte';
	import { themeMode, setThemeMode, THEME_MODES } from '../../../stores/theme.js';

	let {
		/** @type {'button' | 'dropdown'} Variante del componente */
		variant = 'button',
		/** @type {string} Clases CSS adicionales */
		class: className = '',
		...props
	} = $props();

	/**
	 * Alterna entre los modos de tema
	 */
	function cycleTheme() {
		const modes = [THEME_MODES.LIGHT, THEME_MODES.DARK, THEME_MODES.SYSTEM];
		const currentIndex = modes.indexOf($themeMode);
		const nextIndex = (currentIndex + 1) % modes.length;
		setThemeMode(modes[nextIndex]);
	}

	/**
	 * Obtiene el icono apropiado para el tema actual
	 * @param {string} mode - Modo de tema actual
	 * @returns {any} Componente de icono
	 */
	function getThemeIcon(mode) {
		switch (mode) {
			case THEME_MODES.LIGHT:
				return Sun;
			case THEME_MODES.DARK:
				return Moon;
			case THEME_MODES.SYSTEM:
				return Monitor;
			default:
				return Sun;
		}
	}

	/**
	 * Obtiene el tooltip para el tema actual
	 * @param {string} mode - Modo de tema actual
	 * @returns {string} Texto del tooltip
	 */
	function getThemeTooltip(mode) {
		switch (mode) {
			case THEME_MODES.LIGHT:
				return 'Cambiar a tema oscuro';
			case THEME_MODES.DARK:
				return 'Cambiar a tema del sistema';
			case THEME_MODES.SYSTEM:
				return 'Cambiar a tema claro';
			default:
				return 'Cambiar tema';
		}
	}

	// Componente de icono reactivo
	const IconComponent = $derived(getThemeIcon($themeMode));
	const tooltip = $derived(getThemeTooltip($themeMode));
</script>

{#if variant === 'button'}
	<!-- Botón simple de toggle -->
	<button
		class="flex items-center justify-center rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100 {className}"
		onclick={cycleTheme}
		title={tooltip}
		{...props}
	>
		<IconComponent size={20} class="transition-transform duration-200" />
		<span class="sr-only">{tooltip}</span>
	</button>
{:else if variant === 'dropdown'}
	<!-- Dropdown con opciones -->
	<div class="relative">
		<button
			class="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 {className}"
			onclick={cycleTheme}
			{...props}
		>
			<IconComponent size={16} />
			<span>
				{#if $themeMode === THEME_MODES.LIGHT}
					Claro
				{:else if $themeMode === THEME_MODES.DARK}
					Oscuro
				{:else}
					Sistema
				{/if}
			</span>
		</button>
	</div>
{/if}
