<!--
 * Vista JSON para registros DynamoDB
 * Muestra los datos en formato JSON con syntax highlighting
-->
<script>
	import { ChevronDown, Copy, FileText, Menu, SquarePen } from 'lucide-svelte';

	/**
	 * @typedef {Object} Record
	 * @property {Object} data - Datos del registro
	 */

	let {
		/** @type {Record[]} Lista de registros */
		records,
		/** @type {((record: Object) => void) | undefined} Callback para editar registro */
		onEditRecord,
		/** @type {((record: Object) => void) | undefined} Callback para eliminar registro */
		onDeleteRecord
	} = $props();

	/** Registro seleccionado para vista detallada */
	let selectedRecord = $state(/** @type {number | null} */ (null));

	/** Vista compacta o expandida */
	let compactView = $state(true);

	/**
	 * Copia un registro al portapapeles
	 * @param {Object} record - Registro a copiar
	 */
	async function copyRecord(record) {
		try {
			const jsonText = JSON.stringify(record, null, 2);
			await navigator.clipboard.writeText(jsonText);
			// TODO: Mostrar toast de confirmación
		} catch (err) {
			console.error('Error copiando al portapapeles:', err);
		}
	}

	/**
	 * Copia todos los registros al portapapeles
	 */
	async function copyAllRecords() {
		try {
			const jsonText = JSON.stringify(records, null, 2);
			await navigator.clipboard.writeText(jsonText);
			// TODO: Mostrar toast de confirmación
		} catch (err) {
			console.error('Error copiando al portapapeles:', err);
		}
	}

	/**
	 * Toggle de vista compacta/expandida
	 */
	function toggleCompactView() {
		compactView = !compactView;
	}

	/**
	 * Selecciona un registro para vista detallada
	 * @param {number} index - Índice del registro
	 */
	function selectRecord(index) {
		selectedRecord = selectedRecord === index ? null : index;
	}

	/**
	 * Obtiene una vista previa del registro
	 * @param {any} record - Registro
	 * @returns {string} Vista previa
	 */
	function getRecordPreview(record) {
		const keys = Object.keys(record);
		const preview = keys
			.slice(0, 3)
			.map((key) => {
				const value = record[key];
				const shortValue =
					typeof value === 'string' && value.length > 30 ? value.substring(0, 30) + '...' : value;
				return `${key}: ${JSON.stringify(shortValue)}`;
			})
			.join(', ');

		return keys.length > 3 ? `${preview}...` : preview;
	}

	/**
	 * Genera HTML con resaltado de sintaxis para JSON
	 *
	 * Nota: usamos {@html} con una cadena generada por nosotros mismos, no por el usuario,
	 * por lo que es seguro tras escapar entidades (&, <, >) antes del resaltado.
	 * @param {any} value
	 * @returns {string}
	 */
	function syntaxHighlight(value) {
		const jsonText = JSON.stringify(value, null, 2) ?? '';
		const escaped = jsonText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

		return escaped.replace(
			/("(\\u[a-fA-F0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(?:true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
			(match) => {
				let cls = 'json-number';
				if (match.startsWith('"')) {
					cls = match.endsWith('":') ? 'json-key' : 'json-string';
				} else if (/true|false/.test(match)) {
					cls = 'json-boolean';
				} else if (/null/.test(match)) {
					cls = 'json-null';
				}
				return `<span class="${cls}">${match}</span>`;
			}
		);
	}
</script>

<div class="flex h-full flex-col gap-2">
	<!-- Controles -->
	<div class="flex items-center justify-between border-b bg-gray-50 p-2">
		<div class="flex items-center gap-4">
			<button
				type="button"
				class="flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-1 text-sm transition-colors hover:bg-gray-50"
				onclick={toggleCompactView}
			>
				<Menu size={16} />
				{compactView ? 'Vista Expandida' : 'Vista Compacta'}
			</button>

			<span class="text-sm text-gray-600">
				{records.length}
				{records.length === 1 ? 'registro' : 'registros'}
			</span>
		</div>

		<button
			type="button"
			class="flex items-center gap-2 rounded-md bg-blue-600 px-3 py-1 text-sm text-white transition-colors hover:bg-blue-700"
			onclick={copyAllRecords}
		>
			<Copy size={16} />
			Copiar Todo
		</button>
	</div>

	<!-- Vista de registros -->
	<div class="flex-1 space-y-2 overflow-y-auto">
		{#each records as record, index (index)}
			<div class="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
				<!-- Header del registro -->
				<div
					class="flex cursor-pointer items-center justify-between p-2 transition-colors hover:bg-gray-50"
					onclick={() => selectRecord(index)}
					role="button"
					tabindex="0"
					onkeydown={(e) => {
						if (e.key === 'Enter' || e.key === ' ') {
							e.preventDefault();
							selectRecord(index);
						}
					}}
				>
					<div class="flex items-center gap-3">
						<span class="text-sm font-medium text-gray-900">
							Registro #{index + 1}
						</span>

						{#if compactView}
							<span class="max-w-md truncate text-xs text-gray-500">
								{getRecordPreview(record)}
							</span>
						{/if}
					</div>

					<div class="flex items-center gap-2">
						{#if onEditRecord}
							<button
								type="button"
								class="text-gray-400 transition-colors hover:text-gray-600"
								onclick={(e) => {
									e.stopPropagation();
									onEditRecord?.(record);
								}}
								title="Editar registro"
							>
								<SquarePen size={16} />
								<span class="sr-only">Editar registro</span>
							</button>
						{/if}

						{#if onDeleteRecord}
							<button
								type="button"
								class="text-gray-400 transition-colors hover:text-red-600"
								onclick={(e) => {
									e.stopPropagation();
									onDeleteRecord?.(record);
								}}
								title="Eliminar registro"
							>
								<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
									/>
								</svg>
								<span class="sr-only">Eliminar registro</span>
							</button>
						{/if}

						<button
							type="button"
							class="text-gray-400 transition-colors hover:text-gray-600"
							onclick={(e) => {
								e.stopPropagation();
								copyRecord(record);
							}}
							title="Copiar registro"
						>
							<Copy size={16} />
							<span class="sr-only">Copiar registro</span>
						</button>

						<ChevronDown
							size={16}
							class="transform text-gray-400 transition-transform {selectedRecord === index
								? 'rotate-180'
								: ''}"
						/>
					</div>
				</div>

				<!-- Contenido del registro (expandible) -->
				{#if selectedRecord === index || !compactView}
					<div class="h-px bg-black"></div>
					<div
						class="overflow-x-auto rounded-md bg-gray-50 p-4 font-mono text-sm leading-relaxed whitespace-pre"
					>
						{@html syntaxHighlight(record)}
					</div>
				{/if}
			</div>
		{/each}
	</div>

	<!-- Estado vacío -->
	{#if records.length === 0}
		<div class="py-12 text-center">
			<FileText size={48} class="mx-auto text-gray-400" />
			<h3 class="mt-2 text-sm font-medium text-gray-900">Sin datos JSON</h3>
			<p class="mt-1 text-sm text-gray-500">No hay registros para mostrar en formato JSON.</p>
		</div>
	{/if}
</div>

<style>
	/* Mejorar legibilidad del JSON */

	/* Estilos adicionales para syntax highlighting */
	:global(.json-key) {
		color: #dc2626; /* red-600 */
	}

	:global(.json-string) {
		color: #16a34a; /* green-600 */
	}

	:global(.json-number) {
		color: #2563eb; /* blue-600 */
	}

	:global(.json-boolean) {
		color: #9333ea; /* purple-600 */
	}

	:global(.json-null) {
		color: #6b7280; /* gray-500 */
		font-style: italic;
	}
</style>
