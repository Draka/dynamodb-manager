<!--
 * Componente Panel base para contenedores de contenido
 * Incluye header, footer y diferentes estilos
-->
<script>
	import { ChevronDown } from 'lucide-svelte';

	let {
		/** @type {string} Título del panel */
		title = '',
		/** @type {string} Subtítulo opcional */
		subtitle = '',
		/** @type {boolean} Si el panel es plegable */
		collapsible = false,
		/** @type {boolean} Estado inicial colapsado */
		collapsed = $bindable(false),
		/** @type {'white' | 'gray' | 'bordered'} Variante visual */
		variant = 'white',
		/** Slots */
		children,
		header,
		footer,
		...props
	} = $props();

	/** Clases base del panel */
	const baseClasses = 'rounded-lg overflow-hidden';

	/** Mapeo de variantes a clases CSS */
	const variantClasses = {
		white: 'bg-white dark:bg-gray-900 shadow-sm',
		gray: 'bg-gray-50 dark:bg-gray-800',
		bordered: 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700'
	};

	/** Clases computadas finales */
	const computedClasses = $derived(
		[baseClasses, variantClasses[/** @type {keyof typeof variantClasses} */ (variant)]]
			.filter(Boolean)
			.join(' ')
	);

	/**
	 * Toggle del estado colapsado
	 */
	function toggleCollapse() {
		if (collapsible) {
			collapsed = !collapsed;
		}
	}
</script>

<div class={computedClasses} {...props}>
	<!-- Header -->
	{#if title || header || collapsible}
		{#if collapsible}
			<button
				type="button"
				class="w-full cursor-pointer border-b border-gray-200 dark:border-gray-700 px-6 py-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800"
				onclick={toggleCollapse}
			>
				<div class="flex items-center justify-between">
					<div>
						{#if header}
							{@render header()}
						{:else if title}
							<h3 class="text-lg font-medium text-gray-900 dark:text-white">
								{title}
							</h3>
							{#if subtitle}
								<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
									{subtitle}
								</p>
							{/if}
						{/if}
					</div>

					<ChevronDown
						size={20}
						class="transform transition-transform duration-200 text-gray-400 dark:text-gray-500 {collapsed
							? 'rotate-0'
							: 'rotate-180'}"
					/>
				</div>
			</button>
		{:else}
			<div class="border-b border-gray-200 dark:border-gray-700 px-6 py-4">
				<div>
					{#if header}
						{@render header()}
					{:else if title}
						<h3 class="text-lg font-medium text-gray-900 dark:text-white">
							{title}
						</h3>
						{#if subtitle}
							<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
								{subtitle}
							</p>
						{/if}
					{/if}
				</div>
			</div>
		{/if}
	{/if}

	<!-- Content -->
	{#if !collapsed}
		<div class="p-6">
			{@render children()}
		</div>
	{/if}

	<!-- Footer -->
	{#if footer && !collapsed}
		<div class="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-6 py-4">
			{@render footer()}
		</div>
	{/if}
</div>
