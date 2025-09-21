<!--
 * Componente Modal base con overlay y gestión de foco
 * Incluye animaciones de entrada/salida y manejo de ESC
-->
<script>
	import { X } from 'lucide-svelte';
	import { fade } from 'svelte/transition';

	let {
		/** @type {boolean} Si el modal está abierto */
		open = false,
		/** @type {string} Título del modal */
		title = '',
		/** @type {boolean} Si muestra botón de cerrar */
		closable = true,
		/** @type {boolean} Si cierra al hacer click en overlay */
		closeOnOverlay = true,
		/** @type {boolean} Si cierra con tecla ESC */
		closeOnEsc = true,
		/** @type {'sm' | 'md' | 'lg' | 'xl' | 'full'} Tamaño del modal */
		size = 'md',
		/** @type {(() => void) | undefined} Callback al cerrar */
		onclose = undefined,
		/** Slots */
		children = undefined,
		footer = undefined,
		...props
	} = $props();

	/** Elemento del modal para manejo de foco */
	let modalElement = $state(/** @type {HTMLElement | null} */ (null));

	/** Elemento con foco anterior */
	let previousActiveElement = $state(/** @type {Element | null} */ (null));

	/** Mapeo de tamaños a clases CSS */
	/** @type {{ [key: string]: string }} */
	const sizeClasses = {
		sm: 'w-xl',
		md: 'w-2xl',
		lg: 'w-3xl',
		xl: 'w-4xl',
		full: 'w-full mx-4'
	};

	/** Clases computadas del modal */
	const modalClasses = $derived(
		['relative bg-white rounded-lg shadow-xl', sizeClasses[size]].filter(Boolean).join(' ')
	);

	/**
	 * Cierra el modal
	 */
	function closeModal() {
		onclose?.();
	}

	/**
	 * Maneja el click en el overlay
	 * @param {any} event - Evento de click
	 */
	function handleOverlayClick(event) {
		if (closeOnOverlay && event.target === event.currentTarget) {
			closeModal();
		}
	}

	/**
	 * Maneja las teclas presionadas
	 * @param {KeyboardEvent} event - Evento de teclado
	 */
	function handleKeydown(event) {
		if (event.key === 'Escape' && closeOnEsc) {
			closeModal();
		}

		// Manejo de foco con Tab
		if (event.key === 'Tab') {
			handleTabKey(event);
		}
	}

	/**
	 * Maneja la tecla Tab para mantener foco dentro del modal
	 * @param {KeyboardEvent} event - Evento de teclado
	 */
	function handleTabKey(event) {
		if (!modalElement) return;

		const focusableElements = modalElement.querySelectorAll(
			'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
		);

		const firstElement = focusableElements[0];
		const lastElement = focusableElements[focusableElements.length - 1];

		if (event.shiftKey) {
			if (document.activeElement === firstElement) {
				event.preventDefault();
				/** @type {HTMLElement} */ (lastElement)?.focus();
			}
		} else {
			if (document.activeElement === lastElement) {
				event.preventDefault();
				/** @type {HTMLElement} */ (firstElement)?.focus();
			}
		}
	}

	/** Efecto para manejar el foco cuando se abre/cierra el modal */
	$effect(() => {
		if (open) {
			// Guardar elemento con foco actual
			previousActiveElement = document.activeElement;

			// Enfocar el modal cuando se abra
			setTimeout(() => {
				const firstFocusable = modalElement?.querySelector(
					'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
				);
				if (firstFocusable) {
					/** @type {HTMLElement} */ (firstFocusable).focus();
				} else {
					modalElement?.focus();
				}
			}, 100);

			// Agregar event listener para ESC
			document.addEventListener('keydown', handleKeydown);
		} else {
			// Restaurar foco al cerrar
			if (previousActiveElement) {
				/** @type {HTMLElement} */ (previousActiveElement).focus();
			}

			// Remover event listener
			document.removeEventListener('keydown', handleKeydown);
		}

		// Cleanup al destruir el componente
		return () => {
			document.removeEventListener('keydown', handleKeydown);
		};
	});
</script>

{#if open}
	<!-- Overlay -->
	<div
		class="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/20 bg-opacity-50 p-4 backdrop-blur-sm duration-200"
		role="dialog"
		aria-modal="true"
		aria-labelledby={title ? 'modal-title' : undefined}
		tabindex="-1"
		in:fade
		out:fade
	>
		<!-- Modal Content -->
		<div
			bind:this={modalElement}
			class="{modalClasses} animate-in zoom-in-95 overflow-hidden duration-200"
			tabindex="-1"
			{...props}
		>
			<!-- Header -->
			{#if title || closable}
				<div class="flex items-center justify-between pb-4">
					{#if title}
						<h2 id="modal-title" class="text-lg font-semibold text-gray-900">
							{title}
						</h2>
					{/if}

					{#if closable}
						<button
							type="button"
							class="flex h-10 w-10 items-center justify-center rounded-md text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
							onclick={closeModal}
							aria-label="Cerrar modal"
						>
							<X size={20} />
						</button>
					{/if}
				</div>
			{/if}

			<!-- Body -->
			<div class=" {title || closable ? '' : 'pt-6'}">
				{@render children()}
			</div>

			<!-- Footer -->
			{#if footer}
				<div class="rounded-b-lg bg-gray-50 py-4">
					{@render footer()}
				</div>
			{/if}
		</div>
	</div>
{/if}
