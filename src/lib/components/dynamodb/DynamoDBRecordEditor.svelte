<!--
 * Editor avanzado de registros DynamoDB
 * Soporte completo para tipos DynamoDB nativos y validación
-->
<script>
	import { onMount } from 'svelte';
	import { Button, TextInput, Select } from '../ui';
	import { LoadingSpinner } from '../ui/LoadingSpinner';
	import { Modal } from '../ui/Modal';
	import TypeSelector from './TypeSelector.svelte';
	import { dynamoDbApi } from '../../services/api-client.js';
	import { Plus, X, Save, RotateCcw, Type, CircleQuestionMark, Eye } from 'lucide-svelte';
	import JsonEditor from './JsonEditor.svelte';

	let {
		/** @type {Object} Registro a editar */
		record,
		/** @type {string} Nombre de la tabla */
		tableName,
		/** @type {string} ID de la conexión */
		connectionId,
		/** @type {boolean} Si el editor está abierto */
		isOpen = false,
		/** @type {(() => void) | undefined} Callback al cerrar */
		onClose,
		/** @type {((updatedRecord: Object) => void) | undefined} Callback al guardar */
		onSave
	} = $props();

	/** Estados del editor */
	let saving = $state(false);
	let error = $state('');
	let hasChanges = $state(false);
	let showPreview = $state(false);
	let editMode = $state(/** @type {'attributes' | 'json'} */ ('attributes')); // Nuevo modo de edición

	/** @type {Array<{key: string, value: any, type: string}>} */
	let attributes = $state([]);
	/** @type {Array<{key: string, value: any, type: string}>} */
	let originalAttributes = $state([]);

	/** Para edición JSON simple */
	let jsonContent = $state('');
	let originalJsonContent = $state('');

	/** Tipos DynamoDB soportados */
	const DYNAMODB_TYPES = [
		{ value: 'S', label: 'String (S)' },
		{ value: 'N', label: 'Number (N)' },
		{ value: 'B', label: 'Binary (B)' },
		{ value: 'BOOL', label: 'Boolean (BOOL)' },
		{ value: 'NULL', label: 'Null (NULL)' },
		{ value: 'SS', label: 'String Set (SS)' },
		{ value: 'NS', label: 'Number Set (NS)' },
		{ value: 'BS', label: 'Binary Set (BS)' },
		{ value: 'L', label: 'List (L)' },
		{ value: 'M', label: 'Map (M)' }
	];

	/**
	 * Detecta si un registro está en formato DynamoDB nativo o formato plano
	 * @param {Object} record
	 * @returns {boolean} true si es formato DynamoDB nativo
	 */
	function isDynamoNativeFormat(record) {
		// Un registro DynamoDB nativo tiene valores como { "S": "value" }, { "N": "123" }, etc.
		const firstValue = Object.values(record)[0];
		return (
			typeof firstValue === 'object' &&
			firstValue !== null &&
			(firstValue.S ||
				firstValue.N ||
				firstValue.B ||
				firstValue.BOOL !== undefined ||
				firstValue.NULL !== undefined ||
				firstValue.L ||
				firstValue.M ||
				firstValue.SS ||
				firstValue.NS ||
				firstValue.BS)
		);
	}

	/**
	 * Convierte un registro plano a formato DynamoDB nativo
	 * @param {Object} plainRecord
	 * @returns {Object} Registro en formato DynamoDB nativo
	 */
	function plainToDynamoNative(plainRecord) {
		/** @type {any} */
		const result = {};

		Object.entries(plainRecord).forEach(([key, value]) => {
			if (value === null || value === undefined) {
				result[key] = { NULL: true };
			} else if (typeof value === 'string') {
				result[key] = { S: value };
			} else if (typeof value === 'number') {
				result[key] = { N: String(value) };
			} else if (typeof value === 'boolean') {
				result[key] = { BOOL: value };
			} else if (Array.isArray(value)) {
				result[key] = {
					L: value.map((item) => {
						if (typeof item === 'string') return { S: item };
						if (typeof item === 'number') return { N: String(item) };
						if (typeof item === 'boolean') return { BOOL: item };
						return { S: JSON.stringify(item) };
					})
				};
			} else if (typeof value === 'object') {
				result[key] = { M: plainToDynamoNative(value) };
			} else {
				result[key] = { S: String(value) };
			}
		});

		return result;
	}

	/**
	 * Convierte un registro DynamoDB nativo a formato editable
	 * @param {Object} dynamoRecord
	 */
	function dynamoToEditable(dynamoRecord) {
		/** @type {Array<{key: string, value: any, type: string}>} */
		const result = [];

		Object.entries(dynamoRecord).forEach(([key, value]) => {
			const type = Object.keys(value)[0];
			const val = value[type];

			result.push({
				key,
				value: formatValueForEdit(val, type),
				type
			});
		});

		return result;
	}

	/**
	 * Formatea un valor para edición según su tipo
	 * @param {any} value
	 * @param {string} type
	 */
	function formatValueForEdit(value, type) {
		switch (type) {
			case 'SS':
			case 'NS':
			case 'BS':
				return Array.isArray(value) ? value.join(', ') : '';
			case 'L':
				return JSON.stringify(value, null, 2);
			case 'M':
				return JSON.stringify(value, null, 2);
			case 'BOOL':
				return value ? 'true' : 'false';
			case 'NULL':
				return 'null';
			default:
				return String(value);
		}
	}

	/**
	 * Convierte el formato editable de vuelta a DynamoDB
	 * @param {any[]} editableAttrs
	 */
	function editableToDynamo(editableAttrs) {
		/** @type {any} */
		const result = {};

		editableAttrs.forEach(({ key, value, type }) => {
			if (!key.trim()) return; // Skip empty keys

			result[key] = {
				[type]: parseValueByType(value, type)
			};
		});

		return result;
	}

	/**
	 * Convierte un AttributeValue nativo a valor JS plano
	 * @param {any} av
	 */
	/**
	 * @param {any} av
	 * @returns {any}
	 */
	function attributeValueToPlain(av) {
		if (av == null) return av;
		if (typeof av !== 'object') return av;
		if ('S' in av) return av.S;
		if ('N' in av) return Number(av.N);
		if ('BOOL' in av) return Boolean(av.BOOL);
		if ('NULL' in av) return null;
		if ('SS' in av) return Array.isArray(av.SS) ? av.SS.slice() : [];
		if ('NS' in av) {
			if (!Array.isArray(av.NS)) return [];
			const arr = /** @type {string[]} */ (av.NS);
			return arr.map((n) => Number(n));
		}
		if ('BS' in av) return Array.isArray(av.BS) ? av.BS.slice() : [];
		if ('L' in av) {
			if (!Array.isArray(av.L)) return [];
			const arr = /** @type {any[]} */ (av.L);
			return arr.map((x) => attributeValueToPlain(x));
		}
		if ('M' in av) {
			/** @type {any} */
			const out = {};
			for (const key of Object.keys(av.M || {})) {
				out[key] = attributeValueToPlain(av.M[key]);
			}
			return out;
		}
		return av;
	}

	/**
	 * Parsea un valor según su tipo DynamoDB
	 * @param {string} value
	 * @param {string} type
	 */
	function parseValueByType(value, type) {
		const trimmedValue = value?.trim() || '';
		
		switch (type) {
			case 'N':
				return String(Number(trimmedValue || '0'));
			case 'BOOL':
				return trimmedValue.toLowerCase() === 'true';
			case 'NULL':
				return null;
			case 'S':
				return trimmedValue; // String puede estar vacío
			case 'SS':
				return trimmedValue 
					? trimmedValue.split(',').map((s) => s.trim()).filter((s) => s)
					: [];
			case 'NS':
				return trimmedValue
					? trimmedValue.split(',').map((s) => String(Number(s.trim()))).filter((s) => s !== 'NaN')
					: [];
			case 'BS':
				return trimmedValue
					? trimmedValue.split(',').map((s) => s.trim()).filter((s) => s)
					: [];
			case 'L':
				if (!trimmedValue) return [];
				try {
					return JSON.parse(trimmedValue);
				} catch {
					return [];
				}
			case 'M':
				if (!trimmedValue) return {};
				try {
					return JSON.parse(trimmedValue);
				} catch {
					return {};
				}
			default:
				return trimmedValue;
		}
	}

	/**
	 * Valida un atributo según su tipo
	 * @param {string} value
	 * @param {string} type
	 */
	function validateAttribute(value, type) {
		// NULL no requiere valor
		if (type === 'NULL') return '';
		
		// String vacío está permitido para tipo S
		if (type === 'S') return '';
		
		// Para otros tipos, verificar si hay contenido cuando se requiere
		const trimmedValue = value?.trim() || '';

		switch (type) {
			case 'N':
				if (!trimmedValue) return 'Número requerido';
				if (isNaN(Number(trimmedValue))) return 'Debe ser un número válido';
				break;
			case 'BOOL':
				if (!trimmedValue) return 'Valor boolean requerido';
				if (!['true', 'false'].includes(trimmedValue.toLowerCase())) {
					return 'Debe ser true o false';
				}
				break;
			case 'SS':
			case 'NS':
			case 'BS':
				// Sets pueden estar vacíos, pero si tienen contenido debe ser válido
				if (trimmedValue) {
					if (type === 'NS') {
						const nums = trimmedValue.split(',').map((s) => s.trim());
						if (nums.some((n) => isNaN(Number(n)))) {
							return 'Todos los valores deben ser números';
						}
					}
				}
				break;
			case 'L':
			case 'M':
				// Listas y mapas pueden estar vacíos, pero si tienen contenido debe ser JSON válido
				if (trimmedValue) {
					try {
						JSON.parse(trimmedValue);
					} catch {
						return 'Debe ser JSON válido';
					}
				}
				break;
		}
		return '';
	}

	/**
	 * Agrega un nuevo atributo
	 */
	function addAttribute() {
		attributes = [...attributes, { key: '', value: '', type: 'S' }];
		hasChanges = true;
	}

	/**
	 * Remueve un atributo
	 * @param {number} index
	 */
	function removeAttribute(index) {
		attributes = attributes.filter((_, i) => i !== index);
		hasChanges = true;
	}

	/**
	 * Maneja el cambio de tipo de un atributo
	 * @param {number} index
	 * @param {string} newType
	 */
	function handleTypeChange(index, newType) {
		if (attributes[index].type !== newType) {
			attributes[index].type = newType;
			attributes[index].value = '';
			hasChanges = true;
		}
	}

	/**
	 * Resetea el editor al estado original
	 */
	function resetChanges() {
		attributes = JSON.parse(JSON.stringify(originalAttributes));
		jsonContent = originalJsonContent;
		hasChanges = false;
		error = '';
	}

	/**
	 * Maneja los cambios en el contenido JSON
	 */
	function handleJsonChange() {
		hasChanges = jsonContent !== originalJsonContent;
	}

	/**
	 * Guarda los cambios
	 */
	async function saveChanges() {
		saving = true;
		error = '';

		try {
			/** @type {any} */
			let recordToSave;

			if (editMode === 'json') {
				// Validar JSON
				try {
					recordToSave = JSON.parse(jsonContent);
					console.log('JSON a guardar:', recordToSave);
				} catch (/** @type {any} */ jsonError) {
					error = `JSON inválido: ${jsonError.message}`;
					saving = false;
					return;
				}
			} else {
				// Convertir atributos a formato JavaScript simple
				recordToSave = {};

				for (let i = 0; i < attributes.length; i++) {
					const attr = attributes[i];
					if (!attr.key.trim()) {
						error = `Atributo ${i + 1}: La clave no puede estar vacía`;
						saving = false;
						return;
					}

					const validationError = validateAttribute(attr.value, attr.type);
					if (validationError) {
						error = `Atributo "${attr.key}": ${validationError}`;
						saving = false;
						return;
					}
				}

				// Verificar claves duplicadas
				const keys = attributes.map((a) => a.key.trim());
				const duplicates = keys.filter((key, index) => keys.indexOf(key) !== index);
				if (duplicates.length > 0) {
					error = `Claves duplicadas encontradas: ${duplicates.join(', ')}`;
					saving = false;
					return;
				}

				// Convertir a formato JavaScript simple
				attributes.forEach(({ key, value, type }) => {
					if (!key.trim()) return;
					recordToSave[key] = parseValueByType(value, type);
				});

				console.log('Atributos a guardar:', recordToSave);
			}

			// Log del record final
			console.log('Record final a enviar a DynamoDB:', recordToSave);
			console.log('Tamaño del record:', JSON.stringify(recordToSave).length, 'bytes');
			console.log('Tabla destino:', tableName);

			// En modo atributos, si el usuario ingresó valores como { S, N, L, ... }, ofrecer guardado nativo
			let response;
			if (
				editMode === 'attributes' &&
				attributes.every((a) =>
					['S', 'N', 'B', 'BOOL', 'NULL', 'SS', 'NS', 'BS', 'L', 'M'].includes(a.type)
				)
			) {
				// Construir mapa AttributeValue nativo a partir de los atributos
				/** @type {any} */
				const nativeItem = {};
				attributes.forEach(({ key, value, type }) => {
					if (!key.trim()) return;
					
					const trimmedValue = value?.trim() || '';
					
					if (type === 'N') {
						nativeItem[key] = { N: String(Number(trimmedValue || '0')) };
					} else if (type === 'BOOL') {
						nativeItem[key] = { BOOL: trimmedValue.toLowerCase() === 'true' };
					} else if (type === 'NULL') {
						nativeItem[key] = { NULL: true };
					} else if (type === 'SS') {
						const parts = trimmedValue ? trimmedValue.split(',').map(s => s.trim()).filter(s => s) : [];
						nativeItem[key] = { SS: parts };
					} else if (type === 'NS') {
						const parts = trimmedValue ? trimmedValue.split(',').map(s => s.trim()).filter(s => s && !isNaN(Number(s))).map(s => String(Number(s))) : [];
						nativeItem[key] = { NS: parts };
					} else if (type === 'BS') {
						const parts = trimmedValue ? trimmedValue.split(',').map(s => s.trim()).filter(s => s) : [];
						nativeItem[key] = { BS: parts };
					} else if (type === 'L') {
						if (!trimmedValue) {
							nativeItem[key] = { L: [] };
						} else {
							try {
								nativeItem[key] = { L: JSON.parse(trimmedValue) };
							} catch {
								nativeItem[key] = { L: [] };
							}
						}
					} else if (type === 'M') {
						if (!trimmedValue) {
							nativeItem[key] = { M: {} };
						} else {
							try {
								nativeItem[key] = { M: plainToDynamoNative(JSON.parse(trimmedValue)) };
							} catch {
								nativeItem[key] = { M: {} };
							}
						}
					} else {
						// Tipo S - string puede estar vacío
						nativeItem[key] = { S: trimmedValue };
					}
				});

				response = await dynamoDbApi.putItemNative(tableName, nativeItem);
			} else {
				// El Document Client maneja automáticamente la conversión a DynamoDB
				response = await dynamoDbApi.putItem(tableName, recordToSave);
			}

			if (response.success) {
				hasChanges = false;
				onSave?.(recordToSave);
				handleClose();
			} else {
				error = response.error || 'Error guardando el registro';
			}
		} catch (/** @type {any} */ err) {
			console.error('Error completo:', err);
			console.error('Stack trace:', err.stack);
			error = `Error: ${err.message}`;
		} finally {
			saving = false;
		}
	}

	/**
	 * Maneja el cierre del editor
	 */
	function handleClose() {
		if (hasChanges && !confirm('¿Descartar cambios sin guardar?')) {
			return;
		}

		onClose?.();
	}

	/**
	 * Obtiene el ícono para un tipo DynamoDB
	 * @param {string} type
	 */
	function getTypeIcon(type) {
		switch (type) {
			case 'S':
				return '📝';
			case 'N':
				return '🔢';
			case 'BOOL':
				return '✓';
			case 'NULL':
				return '∅';
			case 'SS':
			case 'NS':
			case 'BS':
				return '📋';
			case 'L':
				return '📃';
			case 'M':
				return '🗂';
			default:
				return '📄';
		}
	}

	/**
	 * Inicializa el editor con un registro específico
	 * @param {Object} recordToEdit - Registro a editar
	 */
	function initializeEditor(recordToEdit) {
		if (recordToEdit) {
			// Detectar formato del registro
			const isNativeFormat = isDynamoNativeFormat(recordToEdit);

			let dynamoNativeRecord;
			if (isNativeFormat) {
				dynamoNativeRecord = recordToEdit;
			} else {
				// Convertir de formato plano a DynamoDB nativo
				dynamoNativeRecord = plainToDynamoNative(recordToEdit);
			}

			// Inicializar editor de atributos
			attributes = dynamoToEditable(dynamoNativeRecord);
			originalAttributes = JSON.parse(JSON.stringify(attributes));

			// Inicializar editor JSON simple
			jsonContent = JSON.stringify(recordToEdit, null, 2);
			originalJsonContent = jsonContent;

			hasChanges = false;
			error = '';
		}
	}

	/**
	 * Variable reactiva que almacena el último record procesado para evitar re-inicializaciones
	 */
	let lastProcessedRecord = $state(null);

	/**
	 * Vigila cambios en isOpen y record para inicializar el editor
	 */
	$effect(() => {
		if (isOpen && record && record !== lastProcessedRecord) {
			initializeEditor(record);
			lastProcessedRecord = record;
		} else if (!isOpen) {
			lastProcessedRecord = null;
		}
	});
</script>

<Modal open={isOpen} onclose={handleClose} size="xl">
	<div class="flex h-[80vh] flex-col">
		<!-- Header -->
		<div class="border-b border-gray-200 p-4">
			<div class="flex items-center justify-between">
				<div>
					<h2 class="text-xl font-semibold text-gray-900">Editor de Registro</h2>
					<p class="text-sm text-gray-600">
						Tabla: <code class="rounded bg-gray-100 px-1">{tableName}</code>
					</p>
				</div>

				<div class="flex gap-2">
					<!-- Toggle de modo de edición -->
					<div class="flex rounded-lg bg-gray-100 p-1">
						<button
							class="rounded-md px-3 py-1 text-sm transition-colors {editMode === 'attributes'
								? 'bg-white text-gray-900 shadow-sm'
								: 'text-gray-600 hover:text-gray-900'}"
							onclick={() => (editMode = 'attributes')}
							disabled={saving}
						>
							Atributos
						</button>
						<button
							class="rounded-md px-3 py-1 text-sm transition-colors {editMode === 'json'
								? 'bg-white text-gray-900 shadow-sm'
								: 'text-gray-600 hover:text-gray-900'}"
							onclick={() => (editMode = 'json')}
							disabled={saving}
						>
							JSON
						</button>
					</div>

					{#if editMode === 'attributes'}
						<Button
							variant="secondary"
							onclick={() => (showPreview = !showPreview)}
							disabled={saving}
						>
							<Eye size={16} />
							{showPreview ? 'Ocultar' : 'Vista'} JSON
						</Button>
					{/if}

					{#if hasChanges}
						<Button variant="secondary" onclick={resetChanges} disabled={saving}>
							<RotateCcw size={16} />
							Resetear
						</Button>
					{/if}

					<Button onclick={saveChanges} loading={saving} disabled={!hasChanges}>
						<Save size={16} />
						Guardar
					</Button>
				</div>
			</div>

			{#if error}
				<div class="mt-3 rounded-lg border border-red-200 bg-red-50 p-3">
					<p class="text-sm text-red-700">{error}</p>
				</div>
			{/if}
		</div>

		<!-- Content -->
		<div class="flex-1 overflow-hidden">
			{#if editMode === 'json'}
				<!-- Editor JSON avanzado -->
				<div class="h-full overflow-y-auto p-4">
					<JsonEditor bind:value={jsonContent} disabled={saving} onchange={handleJsonChange} />
				</div>
			{:else if showPreview}
				<!-- Vista previa JSON -->
				<div class="h-full overflow-y-auto border-t border-gray-200 bg-gray-900 p-4 text-white">
					<h3 class="mb-4 text-lg font-medium text-white">Vista Previa DynamoDB JSON</h3>
					<pre class="overflow-x-auto text-sm"><code
							>{JSON.stringify(editableToDynamo(attributes), null, 2)}</code
						></pre>
				</div>
			{:else}
				<!-- Editor de atributos -->
				<div class="h-full overflow-y-auto p-4">
					<div class="space-y-4">
						<!-- Add attribute button -->
						<div class="flex items-center justify-between">
							<h3 class="text-lg font-medium text-gray-900">Atributos ({attributes.length})</h3>
							<Button size="sm" onclick={addAttribute} disabled={saving}>
								<Plus size={16} />
								Agregar Atributo
							</Button>
						</div>

						<!-- Attributes list -->
						{#each attributes as attr, index (index)}
							<div class="rounded-lg border border-gray-200 bg-gray-50 p-4">
								<div class="relative grid grid-cols-12 items-start gap-4">
									<!-- Key -->
									<div class="col-span-3">
										<label class="mb-1 block text-sm font-medium text-gray-700" for="attr-key">
											Clave
										</label>
										<TextInput
											id="attr-key"
											bind:value={attr.key}
											placeholder="nombre_atributo"
											disabled={saving}
											onchange={() => (hasChanges = true)}
										/>
									</div>

									<!-- Type -->
									<div class="col-span-3">
										<label class="mb-1 block text-sm font-medium text-gray-700" for="attr-type">
											Tipo
										</label>
										<Select
											id="attr-type"
											value={attr.type}
											options={DYNAMODB_TYPES}
											disabled={saving}
											onchange={(/** @type {any} */ event) =>
												handleTypeChange(index, event.target.value)}
										/>
									</div>

									<!-- Value -->
									<div class="col-span-6">
										<label class="mb-1 block text-sm font-medium text-gray-700" for="attr-value">
											Valor
											{#if ['L', 'M'].includes(attr.type)}
												<span class="text-xs text-gray-500">(JSON)</span>
											{:else if ['SS', 'NS', 'BS'].includes(attr.type)}
												<span class="text-xs text-gray-500">(separado por comas)</span>
											{/if}
										</label>

										{#if attr.type === 'BOOL'}
											<Select
												id="attr-value"
												bind:value={attr.value}
												options={[
													{ value: 'true', label: 'true' },
													{ value: 'false', label: 'false' }
												]}
												disabled={saving}
												onchange={() => (hasChanges = true)}
											/>
										{:else if attr.type === 'NULL'}
											<TextInput id="attr-value" value="null" disabled={true} />
										{:else if ['L', 'M'].includes(attr.type)}
											<textarea
												id="attr-value"
												bind:value={attr.value}
												class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
												rows="3"
												placeholder={attr.type === 'L' ? '["item1", "item2"]' : '{"key": "value"}'}
												disabled={saving}
												onchange={() => (hasChanges = true)}
											></textarea>
										{:else}
											<TextInput
												id="attr-value"
												bind:value={attr.value}
												placeholder={attr.type === 'N'
													? '123'
													: attr.type === 'SS'
														? 'val1, val2, val3'
														: attr.type === 'NS'
															? '1, 2, 3'
															: 'valor'}
												disabled={saving}
												onchange={() => (hasChanges = true)}
											/>
										{/if}

										<!-- Validation error -->
										{#if validateAttribute(attr.value, attr.type)}
											<p class="mt-1 text-xs text-red-600">
												{validateAttribute(attr.value, attr.type)}
											</p>
										{/if}
									</div>

									<!-- Remove button -->
									<div class=" absolute -right-3 -top-3">
										<Button
											size="sm"
											variant="secondary"
											onclick={() => removeAttribute(index)}
											disabled={saving}
											class="flex h-8 w-8 items-center justify-center rounded-lg text-red-600 hover:bg-red-50 hover:text-red-700"
										>
											<X size={16} />
										</Button>
									</div>
								</div>
							</div>
						{/each}

						{#if attributes.length === 0}
							<div class="py-8 text-center text-gray-500">
								<Type size={48} class="mx-auto mb-4 text-gray-400" />
								<p>No hay atributos definidos</p>
								<p class="text-sm">Haz clic en "Agregar Atributo" para comenzar</p>
							</div>
						{/if}
					</div>
				</div>
			{/if}
		</div>

		<!-- Info panel -->
		<div class="border-t border-gray-200 bg-gray-50 px-4 py-3">
			<div class="flex items-center gap-2 text-sm text-gray-600">
				<CircleQuestionMark size={16} />
				<span>
					Tipos: String (S), Number (N), Boolean (BOOL), List (L), Map (M), Sets (SS/NS/BS)
					{#if hasChanges}
						• <strong>Cambios sin guardar</strong>
					{/if}
				</span>
			</div>
		</div>
	</div>
</Modal>
