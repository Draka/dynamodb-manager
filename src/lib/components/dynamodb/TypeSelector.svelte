<!--
 * Selector visual de tipos DynamoDB
 * Muestra iconos y descripciones para cada tipo
-->
<script>
	let {
		/** @type {string} Tipo seleccionado */
		value = 'S',
		/** @type {boolean} Si está deshabilitado */
		disabled = false,
		/** @type {((value: string) => void) | undefined} Callback cuando cambia el valor */
		onchange
	} = $props();

	/** Tipos DynamoDB con descripciones detalladas */
	const TYPES = [
		{
			value: 'S',
			label: 'String',
			icon: '📝',
			description: 'Texto simple',
			example: '"Hola mundo"'
		},
		{
			value: 'N',
			label: 'Number',
			icon: '🔢',
			description: 'Número decimal o entero',
			example: '123 o 45.67'
		},
		{
			value: 'BOOL',
			label: 'Boolean',
			icon: '✓',
			description: 'Verdadero o falso',
			example: 'true / false'
		},
		{
			value: 'NULL',
			label: 'Null',
			icon: '∅',
			description: 'Valor nulo',
			example: 'null'
		},
		{
			value: 'B',
			label: 'Binary',
			icon: '💾',
			description: 'Datos binarios (Base64)',
			example: 'dGhpcyB0ZXh0IGlzIGJhc2U2NC1lbmNvZGVk'
		},
		{
			value: 'SS',
			label: 'String Set',
			icon: '📋',
			description: 'Conjunto de strings únicos',
			example: 'tag1, tag2, tag3'
		},
		{
			value: 'NS',
			label: 'Number Set',
			icon: '#️⃣',
			description: 'Conjunto de números únicos',
			example: '1, 2, 3, 5, 8'
		},
		{
			value: 'BS',
			label: 'Binary Set',
			icon: '💿',
			description: 'Conjunto de binarios únicos',
			example: 'bin1, bin2'
		},
		{
			value: 'L',
			label: 'List',
			icon: '📃',
			description: 'Lista ordenada de elementos',
			example: '["item1", 123, true]'
		},
		{
			value: 'M',
			label: 'Map',
			icon: '🗂',
			description: 'Objeto con pares clave-valor',
			example: '{"name": "Juan", "age": 30}'
		}
	];

	/** @param {string} typeValue */
	function selectType(typeValue) {
		if (disabled || typeValue === value) return;
		onchange?.(typeValue);
	}
	const selectedType = TYPES.find((t) => t.value === value);
</script>

<div class="space-y-2">
	<div class="grid grid-cols-2 gap-2 md:grid-cols-5">
		{#each TYPES as type (type.value)}
			<button
				class="rounded-lg border-2 p-3 text-left transition-all hover:shadow-md {value ===
				type.value
					? 'border-blue-500 bg-blue-50'
					: 'border-gray-200 bg-white hover:border-gray-300'} {disabled
					? 'cursor-not-allowed opacity-50'
					: 'cursor-pointer'}"
				onclick={() => selectType(type.value)}
				{disabled}
			>
				<div class="mb-1 flex items-center gap-2">
					<span class="text-xl">{type.icon}</span>
					<span class="text-sm font-medium">{type.label}</span>
				</div>
				<p class="text-xs leading-tight text-gray-600">{type.description}</p>
			</button>
		{/each}
	</div>

	<!-- Ejemplo del tipo seleccionado -->
	{#if selectedType}
		<div class="rounded-md bg-gray-100 p-2">
			<p class="text-xs text-gray-700">
				<strong>Ejemplo:</strong>
				<code class="rounded bg-white px-1">{selectedType.example}</code>
			</p>
		</div>
	{/if}
</div>
