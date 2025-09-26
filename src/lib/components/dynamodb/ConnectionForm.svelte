<!--
 * Formulario para crear/editar conexiones DynamoDB
 * Incluye validación en tiempo real y prueba de conexión
-->
<script>
	import { Button } from '../ui/Button';
	import { TextInput } from '../ui/Input';
	import { validateAWSConnection, generateConnectionId } from '../../services/aws-config.js';
	import { addConnection, updateConnection } from '../../stores/connections.js';
	import { setConnection } from '../../stores/current-connection.js';
	import { dynamoDbApi } from '../../services/api-client.js';
	import { setCurrentConnectionCookie } from '../../services/connection-manager.js';
	import { validateRequired } from '../../utils/validators.js';
	import { CircleCheckBig, Code } from 'lucide-svelte';
	import * as m from '$lib/paraglide/messages.js';

	/**
	 * @typedef {import('../../services/aws-config.js').AWSConnection} AWSConnection
	 */

	let {
		/** @type {AWSConnection | null} Conexión a editar (null para nueva) */
		connection = null,
		/** @type {(() => void) | undefined} Callback al guardar exitosamente */
		onsaved,
		/** @type {(() => void) | undefined} Callback al cancelar */
		oncancelled,
		/** @type {boolean} Si auto-conectar después de guardar */
		autoConnect = true
	} = $props();

	/** Estado del formulario */
	let formData = $state({
		name: connection?.name || '',
		region: connection?.region || '',
		endpoint: connection?.endpoint || '',
		accessKeyId: connection?.credentials.accessKeyId || '',
		secretAccessKey: connection?.credentials.secretAccessKey || '',
		sessionToken: connection?.credentials.sessionToken || ''
	});

	/** Errores de validación */
	let errors = $state({
		name: null,
		region: null,
		endpoint: null,
		accessKeyId: null,
		secretAccessKey: null,
		general: null
	});

	/** Estados del componente */
	let isTesting = $state(false);
	let isSaving = $state(false);
	let testResult = $state(/** @type {'success' | 'error' | null} */ (null));
	let testMessage = $state('');

	/** Indica si es edición o creación */
	const isEditing = $derived(connection !== null);

	/** Título del formulario */
	const title = $derived(isEditing ? 'Editar Conexión' : 'Nueva Conexión DynamoDB');

	/** Botón de acción principal */
	const actionButtonText = $derived(isEditing ? 'Actualizar Conexión' : 'Crear Conexión');

	/**
	 * Valida un campo específico
	 * @param {string} field - Nombre del campo
	 * @param {any} value - Valor del campo
	 */
	function validateField(field, value) {
		switch (field) {
			case 'name':
				errors.name = validateRequired(value, 'Nombre');
				break;
			case 'region':
				errors.region = validateRequired(value, 'Región');
				if (!errors.region && !/^[a-z]{2,3}-[a-z]+-\d{1,2}$/.test(value)) {
					errors.region = 'Formato de región inválido (ej: us-east-1, eu-west-2)';
				}
				break;
			case 'endpoint':
				// Validar endpoint si se proporciona
				if (value && value.trim().length > 0) {
					try {
						new URL(value.trim());
					} catch {
						errors.endpoint = 'URL de endpoint inválida (ej: http://localhost:8000)';
					}
				} else {
					errors.endpoint = null;
				}
				break;
			case 'accessKeyId':
				errors.accessKeyId = validateRequired(value, 'Access Key ID');
				// Permitir valores dummy para desarrollo (como "dummy")
				if (!errors.accessKeyId && value !== 'dummy' && !/^[A-Z0-9]{20}$/.test(value)) {
					errors.accessKeyId =
						'Access Key ID debe tener 20 caracteres alfanuméricos (o "dummy" para desarrollo)';
				}
				break;
			case 'secretAccessKey':
				errors.secretAccessKey = validateRequired(value, 'Secret Access Key');
				// Permitir valores dummy para desarrollo
				if (!errors.secretAccessKey && value !== 'dummy' && value.length < 40) {
					errors.secretAccessKey =
						'Secret Access Key debe tener al menos 40 caracteres (o "dummy" para desarrollo)';
				}
				break;
		}
	}

	/**
	 * Valida todo el formulario
	 * @returns {boolean} Si el formulario es válido
	 */
	function validateForm() {
		validateField('name', formData.name);
		validateField('region', formData.region);
		validateField('endpoint', formData.endpoint);
		validateField('accessKeyId', formData.accessKeyId);
		validateField('secretAccessKey', formData.secretAccessKey);

		const connectionData = {
			name: formData.name,
			region: formData.region,
			...(formData.endpoint && { endpoint: formData.endpoint }),
			credentials: {
				accessKeyId: formData.accessKeyId,
				secretAccessKey: formData.secretAccessKey,
				...(formData.sessionToken && { sessionToken: formData.sessionToken })
			}
		};

		const validationErrors = validateAWSConnection(connectionData);
		if (validationErrors.length > 0) {
			errors.general = validationErrors.join(', ');
			return false;
		}

		errors.general = null;
		return !hasFormErrors();
	}

	/**
	 * Verifica si hay errores en el formulario
	 * @returns {boolean} Si hay errores
	 */
	function hasFormErrors() {
		return Object.values(errors).some((error) => error !== null);
	}

	/**
	 * Prueba la conexión con AWS usando API client
	 */
	async function testConnection() {
		if (!validateForm()) {
			return;
		}

		isTesting = true;
		testResult = null;
		testMessage = '';

		try {
			const testConnectionData = {
				name: formData.name,
				region: formData.region,
				...(formData.endpoint && { endpoint: formData.endpoint }),
				credentials: {
					accessKeyId: formData.accessKeyId,
					secretAccessKey: formData.secretAccessKey,
					...(formData.sessionToken && { sessionToken: formData.sessionToken })
				}
			};

			const response = await dynamoDbApi.testConnection(testConnectionData);

			if (response.success) {
				testResult = 'success';
				testMessage = 'Conexión exitosa!';
			} else {
				testResult = 'error';
				testMessage = response.error || 'No se pudo conectar. Verifica las credenciales.';
			}
		} catch (error) {
			testResult = 'error';
			testMessage = `Error de conexión: ${error.message}`;
			console.error('Error probando conexión:', error);
		} finally {
			isTesting = false;
		}
	}

	/**
	 * Guarda la conexión
	 */
	async function saveConnection() {
		if (!validateForm()) {
			return;
		}

		isSaving = true;

		try {
			const connectionData = {
				id: connection?.id || generateConnectionId(),
				name: formData.name.trim(),
				region: formData.region,
				...(formData.endpoint?.trim() && { endpoint: formData.endpoint.trim() }),
				credentials: {
					accessKeyId: formData.accessKeyId.trim(),
					secretAccessKey: formData.secretAccessKey.trim(),
					...(formData.sessionToken?.trim() && { sessionToken: formData.sessionToken.trim() })
				},
				createdAt: connection?.createdAt || new Date(),
				lastUsed: new Date()
			};

			if (isEditing) {
				updateConnection(connectionData.id, connectionData);
			} else {
				addConnection(connectionData);
			}

			// Auto-conectar si está habilitado (usar cookies para el backend)
			if (autoConnect) {
				setConnection(connectionData);
				setCurrentConnectionCookie(connectionData);
			}

			onsaved?.();
		} catch (error) {
			errors.general = `Error guardando conexión: ${error.message}`;
			console.error('Error guardando conexión:', error);
		} finally {
			isSaving = false;
		}
	}

	/**
	 * Cancela la operación
	 */
	function cancel() {
		oncancelled?.();
	}

	/**
	 * Maneja la validación cuando el usuario sale de un campo
	 * @param {string} field - Campo a validar
	 * @param {any} value - Valor del campo
	 */
	function handleFieldBlur(field, value) {
		validateField(field, value);
	}
</script>

<form
	class="space-y-6 p-4"
	onsubmit={(e) => {
		e.preventDefault();
		saveConnection();
	}}
>
	<div class="text-center">
		<h2 class="mb-2 text-2xl font-bold text-gray-900">
			{title}
		</h2>
		<p class="text-gray-600">
			{isEditing ? 'Modifica los datos de tu conexión' : 'Configura una nueva conexión a DynamoDB'}
		</p>
	</div>

	<!-- Error general -->
	{#if errors.general}
		<div class="rounded-lg border border-red-200 bg-red-50 p-4">
			<div class="flex items-center gap-2">
				<Code size={20} class="text-red-500" />
				<span class="text-sm text-red-700">{errors.general}</span>
			</div>
		</div>
	{/if}

	<!-- Resultado de prueba de conexión -->
	{#if testResult}
		<div
			class="rounded-lg border p-4 {testResult === 'success'
				? 'border-green-200 bg-green-50'
				: 'border-red-200 bg-red-50'}"
		>
			<div class="flex items-center gap-2">
				{#if testResult === 'success'}
					<CircleCheckBig size={20} class="text-green-500" />
					<span class="text-sm text-green-700">{testMessage}</span>
				{:else}
					<Code size={20} class="text-red-500" />
					<span class="text-sm text-red-700">{testMessage}</span>
				{/if}
			</div>
		</div>
	{/if}

	<!-- Campos del formulario -->
	<div class="space-y-4">
		<TextInput
			bind:value={formData.name}
			label={m['connection.name']()}
			placeholder="ej. Producción, Desarrollo, Testing"
			required
			error={errors.name}
			help={m['connection.nameHelp']()}
			onblur={() => handleFieldBlur('name', formData.name)}
		/>

		<TextInput
			bind:value={formData.region}
			label={m['connection.region']()}
			placeholder="us-east-1, us-west-2, eu-west-1, etc."
			required
			error={errors.region}
			help={m['connection.regionHelp']()}
			onblur={() => handleFieldBlur('region', formData.region)}
		/>

		<TextInput
			bind:value={formData.endpoint}
			label={m['connection.endpoint']()}
			placeholder="http://localhost:8000 (para DynamoDB local)"
			error={errors.endpoint}
			help={m['connection.endpointHelp']()}
			onblur={() => handleFieldBlur('endpoint', formData.endpoint)}
		/>

		<TextInput
			bind:value={formData.accessKeyId}
			label={m['connection.accessKeyId']()}
			placeholder=""
			required
			error={errors.accessKeyId}
			help={m['connection.accessKeyIdHelp']()}
			onblur={() => handleFieldBlur('accessKeyId', formData.accessKeyId)}
		/>

		<TextInput
			bind:value={formData.secretAccessKey}
			type="password"
			label={m['connection.secretAccessKey']()}
			placeholder=""
			required
			error={errors.secretAccessKey}
			help={m['connection.secretAccessKeyHelp']()}
			onblur={() => handleFieldBlur('secretAccessKey', formData.secretAccessKey)}
		/>

		<TextInput
			bind:value={formData.sessionToken}
			label={m['connection.sessionToken']()}
			placeholder={m['connection.sessionTokenPlaceholder']()}
			help={m['connection.sessionTokenHelp']()}
		/>
	</div>

	<!-- Botones de acción -->
	<div class="flex gap-3 pt-4">
		<Button
			type="button"
			variant="secondary"
			onclick={testConnection}
			disabled={isTesting || isSaving}
			loading={isTesting}
		>
			{isTesting ? 'Probando...' : 'Probar Conexión'}
		</Button>

		<Button
			type="submit"
			variant="primary"
			disabled={isSaving || isTesting || hasFormErrors()}
			loading={isSaving}
		>
			{isSaving ? 'Guardando...' : actionButtonText}
		</Button>
	</div>

	<!-- Botón cancelar -->
	{#if oncancelled}
		<div class="text-center">
			<Button type="button" variant="ghost" onclick={cancel} disabled={isSaving || isTesting}>
				Cancelar
			</Button>
		</div>
	{/if}
</form>
