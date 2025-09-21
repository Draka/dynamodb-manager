/** @type {import('@tailwindcss/vite').Config} */
export default {
	// Habilitar modo oscuro con clase
	darkMode: 'selector',

	// Archivos a escanear para clases
	content: ['./src/**/*.{html,js,svelte,ts}'],

	theme: {
		extend: {
			// Colores personalizados para el modo oscuro
			colors: {
				// Grises más suaves para mejor legibilidad
				gray: {
					50: '#f9fafb',
					100: '#f3f4f6',
					200: '#e5e7eb',
					300: '#d1d5db',
					400: '#9ca3af',
					500: '#6b7280',
					600: '#4b5563',
					700: '#374151',
					800: '#1f2937',
					900: '#111827',
					950: '#030712'
				},
				// Superficie para modo oscuro
				dark: {
					50: '#18181b',
					100: '#27272a',
					200: '#3f3f46',
					300: '#52525b',
					400: '#71717a',
					500: '#a1a1aa',
					600: '#d4d4d8',
					700: '#e4e4e7',
					800: '#f4f4f5',
					900: '#fafafa'
				}
			},

			// Variables CSS personalizadas
			backgroundColor: {
				primary: 'var(--color-bg-primary)',
				secondary: 'var(--color-bg-secondary)',
				surface: 'var(--color-surface)'
			},

			textColor: {
				primary: 'var(--color-text-primary)',
				secondary: 'var(--color-text-secondary)',
				muted: 'var(--color-text-muted)'
			},

			borderColor: {
				primary: 'var(--color-border-primary)',
				secondary: 'var(--color-border-secondary)'
			},

			// Animaciones para transiciones de tema
			transitionProperty: {
				theme: 'background-color, border-color, color, fill, stroke'
			}
		}
	},

	plugins: [
		// Plugin para formularios con soporte de modo oscuro
		require('@tailwindcss/forms')({
			strategy: 'class'
		})
	]
};
