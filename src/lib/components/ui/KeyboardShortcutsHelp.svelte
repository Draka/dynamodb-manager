<!--
 * Modal de ayuda para atajos de teclado
 * Muestra todos los atajos disponibles organizados por categoría
-->
<script>
	import { Modal } from './Modal';
	import { Keyboard } from 'lucide-svelte';
	import * as m from '$lib/paraglide/messages.js';
	import {
		showShortcutsHelp,
		getShortcutsByCategory,
		getShortcutDisplay
	} from '$lib/stores/keyboard-shortcuts.js';

	/** Estado del modal */
	let open = $state(false);

	/** Suscripción al store */
	$effect(() => {
		const unsubscribe = showShortcutsHelp.subscribe((value) => {
			open = value;
		});

		return () => unsubscribe();
	});

	/** Cerrar modal */
	function handleClose() {
		showShortcutsHelp.set(false);
	}

	/** Obtener atajos agrupados por categoría */
	const shortcutsByCategory = $derived(getShortcutsByCategory());
</script>

<Modal bind:open title={m['keyboardShortcuts.title']()} size="lg" onClose={handleClose}>
	<div class="space-y-6">
		<!-- Icono y descripción -->
		<div class="flex items-center gap-3 border-b border-gray-200 pb-4 dark:border-gray-700">
			<div
				class="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30"
			>
				<Keyboard class="h-5 w-5 text-blue-600 dark:text-blue-400" />
			</div>
			<div>
				<h3 class="text-lg font-medium text-gray-900 dark:text-white">
					Atajos de teclado disponibles
				</h3>
				<p class="text-sm text-gray-600 dark:text-gray-300">
					Usa estos atajos para navegar más rápido por la aplicación
				</p>
			</div>
		</div>

		<!-- Atajos por categoría -->
		{#each Object.entries(shortcutsByCategory) as [category, shortcuts] (category)}
			<div class="space-y-2">
				<h4 class="text-sm font-semibold tracking-wide text-gray-700 uppercase dark:text-gray-300">
					{category}
				</h4>
				<div class="space-y-1">
					{#each shortcuts as shortcut (shortcut.key + shortcut.category)}
						<div
							class="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-2 dark:bg-gray-800"
						>
							<span class="text-sm text-gray-700 dark:text-gray-300">
								{shortcut.description}
							</span>
							<kbd
								class="inline-flex items-center gap-1 rounded border border-gray-300 bg-white px-2 py-1 font-mono text-xs font-semibold text-gray-800 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
							>
								{getShortcutDisplay(shortcut)}
							</kbd>
						</div>
					{/each}
				</div>
			</div>
		{/each}

		<!-- Nota sobre Mac -->
		<div
			class="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20"
		>
			<p class="text-xs text-blue-800 dark:text-blue-200">
				<strong>Nota:</strong> En Mac, usa ⌘ (Cmd) en lugar de Ctrl
			</p>
		</div>
	</div>
</Modal>
