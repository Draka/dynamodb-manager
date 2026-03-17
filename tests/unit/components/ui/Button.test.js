/**
 * Tests para el componente Button
 * Verifica todas las variantes, estados, tamaños y eventos
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte/legacy';
import Button from '../../../../src/lib/components/ui/Button/Button.svelte';

describe('Button Component', () => {
	let container;

	beforeEach(() => {
		container = document.createElement('div');
		document.body.appendChild(container);
	});

	afterEach(() => {
		document.body.removeChild(container);
		vi.clearAllMocks();
	});

	describe('Basic Rendering', () => {
		it('should render button with default props', () => {
			const { getByRole } = render(Button, {
				$$slots: { default: 'Click me' }
			});

			const button = getByRole('button');
			expect(button).toBeInTheDocument();
			expect(button).toHaveTextContent('Click me');
			expect(button).toHaveAttribute('type', 'button');
		});

		it('should render button with custom content', () => {
			const { getByRole } = render(Button, {
				$$slots: { default: 'Custom Text' }
			});

			const button = getByRole('button');
			expect(button).toHaveTextContent('Custom Text');
		});

		it('should apply base classes correctly', () => {
			const { getByRole } = render(Button, {
				$$slots: { default: 'Test' }
			});

			const button = getByRole('button');
			expect(button).toHaveClass('inline-flex', 'items-center', 'justify-center', 'gap-2');
			expect(button).toHaveClass('font-medium', 'rounded-lg', 'transition-colors');
			expect(button).toHaveClass('focus:outline-none', 'focus:ring-2', 'focus:ring-offset-2');
		});
	});

	describe('Button Types', () => {
		it('should render as button type by default', () => {
			const { getByRole } = render(Button, {
				$$slots: { default: 'Test' }
			});

			expect(getByRole('button')).toHaveAttribute('type', 'button');
		});

		it('should render as submit type', () => {
			const { getByRole } = render(Button, {
				type: 'submit',
				$$slots: { default: 'Submit' }
			});

			expect(getByRole('button')).toHaveAttribute('type', 'submit');
		});

		it('should render as reset type', () => {
			const { getByRole } = render(Button, {
				type: 'reset',
				$$slots: { default: 'Reset' }
			});

			expect(getByRole('button')).toHaveAttribute('type', 'reset');
		});
	});

	describe('Button Variants', () => {
		const variants = [
			{
				name: 'primary',
				classes: ['bg-blue-600', 'hover:bg-blue-700', 'text-white', 'focus:ring-blue-500']
			},
			{
				name: 'secondary',
				classes: ['bg-gray-600', 'hover:bg-gray-700', 'text-white', 'focus:ring-gray-500']
			},
			{
				name: 'success',
				classes: ['bg-green-600', 'hover:bg-green-700', 'text-white', 'focus:ring-green-500']
			},
			{
				name: 'danger',
				classes: ['bg-red-600', 'hover:bg-red-700', 'text-white', 'focus:ring-red-500']
			},
			{
				name: 'warning',
				classes: ['bg-yellow-600', 'hover:bg-yellow-700', 'text-white', 'focus:ring-yellow-500']
			},
			{
				name: 'ghost',
				classes: ['bg-transparent', 'hover:bg-gray-100', 'text-gray-700', 'border']
			}
		];

		variants.forEach(({ name, classes }) => {
			it(`should apply ${name} variant classes`, () => {
				const { getByRole } = render(Button, {
					variant: name,
					$$slots: { default: `${name} button` }
				});

				const button = getByRole('button');
				classes.forEach((className) => {
					expect(button).toHaveClass(className);
				});
			});
		});

		it('should default to primary variant', () => {
			const { getByRole } = render(Button, {
				$$slots: { default: 'Default' }
			});

			const button = getByRole('button');
			expect(button).toHaveClass('bg-blue-600');
		});
	});

	describe('Button Sizes', () => {
		const sizes = [
			{ name: 'sm', classes: ['px-3', 'py-1.5', 'text-sm'] },
			{ name: 'md', classes: ['px-4', 'py-2', 'text-sm'] },
			{ name: 'lg', classes: ['px-6', 'py-3', 'text-base'] }
		];

		sizes.forEach(({ name, classes }) => {
			it(`should apply ${name} size classes`, () => {
				const { getByRole } = render(Button, {
					size: name,
					children: () => `${name} button`
				});

				const button = getByRole('button');
				classes.forEach((className) => {
					expect(button).toHaveClass(className);
				});
			});
		});

		it('should default to md size', () => {
			const { getByRole } = render(Button, {
				children: () => 'Default'
			});

			const button = getByRole('button');
			expect(button).toHaveClass('px-4', 'py-2');
		});
	});

	describe('Button States', () => {
		describe('Loading State', () => {
			it('should show loading spinner when loading', () => {
				const { container, getByRole } = render(Button, {
					loading: true,
					children: () => 'Loading'
				});

				const button = getByRole('button');
				expect(button).toHaveClass('cursor-wait');
				expect(button).toBeDisabled();

				// Verificar que el spinner está presente
				const spinner = container.querySelector('.animate-spin');
				expect(spinner).toBeInTheDocument();
			});

			it('should prevent click when loading', async () => {
				const mockClick = vi.fn();
				const { getByRole } = render(Button, {
					loading: true,
					onclick: mockClick,
					children: () => 'Loading'
				});

				const button = getByRole('button');
				await fireEvent.click(button);

				expect(mockClick).not.toHaveBeenCalled();
			});

			it('should not show spinner when not loading', () => {
				const { container } = render(Button, {
					loading: false,
					children: () => 'Not Loading'
				});

				const spinner = container.querySelector('.animate-spin');
				expect(spinner).not.toBeInTheDocument();
			});
		});

		describe('Disabled State', () => {
			it('should disable button when disabled prop is true', () => {
				const { getByRole } = render(Button, {
					disabled: true,
					children: () => 'Disabled'
				});

				const button = getByRole('button');
				expect(button).toBeDisabled();
				expect(button).toHaveClass('disabled:opacity-50', 'disabled:cursor-not-allowed');
			});

			it('should prevent click when disabled', async () => {
				const mockClick = vi.fn();
				const { getByRole } = render(Button, {
					disabled: true,
					onclick: mockClick,
					children: () => 'Disabled'
				});

				const button = getByRole('button');
				await fireEvent.click(button);

				expect(mockClick).not.toHaveBeenCalled();
			});

			it('should be enabled by default', () => {
				const { getByRole } = render(Button, {
					children: () => 'Enabled'
				});

				const button = getByRole('button');
				expect(button).not.toBeDisabled();
			});
		});
	});

	describe('Click Events', () => {
		it('should call onclick handler when clicked', async () => {
			const mockClick = vi.fn();
			const { getByRole } = render(Button, {
				onclick: mockClick,
				children: () => 'Clickable'
			});

			const button = getByRole('button');
			await fireEvent.click(button);

			expect(mockClick).toHaveBeenCalledTimes(1);
			expect(mockClick).toHaveBeenCalledWith(expect.any(MouseEvent));
		});

		it('should work without onclick handler', async () => {
			const { getByRole } = render(Button, {
				children: () => 'No Handler'
			});

			const button = getByRole('button');

			// No debería lanzar error
			await expect(fireEvent.click(button)).resolves.toBeUndefined();
		});

		it('should prevent event when loading', async () => {
			const mockClick = vi.fn();
			const { getByRole } = render(Button, {
				loading: true,
				onclick: mockClick,
				children: () => 'Loading'
			});

			const button = getByRole('button');
			const event = new MouseEvent('click', { bubbles: true });
			const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

			await fireEvent(button, event);

			expect(preventDefaultSpy).toHaveBeenCalled();
			expect(mockClick).not.toHaveBeenCalled();
		});

		it('should prevent event when disabled', async () => {
			const mockClick = vi.fn();
			const { getByRole } = render(Button, {
				disabled: true,
				onclick: mockClick,
				children: () => 'Disabled'
			});

			const button = getByRole('button');
			const event = new MouseEvent('click', { bubbles: true });
			const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

			await fireEvent(button, event);

			expect(preventDefaultSpy).toHaveBeenCalled();
			expect(mockClick).not.toHaveBeenCalled();
		});
	});

	describe('Additional Props', () => {
		it('should pass through additional props', () => {
			const { getByRole } = render(Button, {
				'data-testid': 'custom-button',
				'aria-label': 'Custom Label',
				children: () => 'Custom Props'
			});

			const button = getByRole('button');
			expect(button).toHaveAttribute('data-testid', 'custom-button');
			expect(button).toHaveAttribute('aria-label', 'Custom Label');
		});

		it('should handle id prop', () => {
			const { getByRole } = render(Button, {
				id: 'unique-button',
				children: () => 'With ID'
			});

			const button = getByRole('button');
			expect(button).toHaveAttribute('id', 'unique-button');
		});
	});

	describe('Dark Mode Support', () => {
		beforeEach(() => {
			// Agregar clase dark al document para simular dark mode
			document.documentElement.classList.add('dark');
		});

		afterEach(() => {
			document.documentElement.classList.remove('dark');
		});

		it('should have dark mode classes for primary variant', () => {
			const { getByRole } = render(Button, {
				variant: 'primary',
				children: () => 'Dark Primary'
			});

			const button = getByRole('button');
			expect(button).toHaveClass('dark:bg-blue-700', 'dark:hover:bg-blue-800');
			expect(button).toHaveClass('dark:focus:ring-blue-400');
		});

		it('should have dark mode classes for ghost variant', () => {
			const { getByRole } = render(Button, {
				variant: 'ghost',
				children: () => 'Dark Ghost'
			});

			const button = getByRole('button');
			expect(button).toHaveClass('dark:hover:bg-gray-800', 'dark:text-gray-200');
			expect(button).toHaveClass('dark:border-gray-600');
		});
	});

	describe('Accessibility', () => {
		it('should have proper focus styling', () => {
			const { getByRole } = render(Button, {
				children: () => 'Focusable'
			});

			const button = getByRole('button');
			expect(button).toHaveClass('focus:outline-none', 'focus:ring-2');
		});

		it('should maintain focus ring in dark mode', () => {
			const { getByRole } = render(Button, {
				children: () => 'Dark Focus'
			});

			const button = getByRole('button');
			expect(button).toHaveClass('dark:focus:ring-offset-gray-900');
		});

		it('should be keyboard accessible', async () => {
			const mockClick = vi.fn();
			const { getByRole } = render(Button, {
				onclick: mockClick,
				children: () => 'Keyboard'
			});

			const button = getByRole('button');
			button.focus();

			await fireEvent.keyDown(button, { key: 'Enter' });
			// Note: En testing real, Enter no triggerea click automáticamente
			// pero el botón debería estar focuseable
			expect(button).toHaveFocus();
		});
	});

	describe('Complex Scenarios', () => {
		it('should handle loading and disabled states together', () => {
			const { getByRole, container } = render(Button, {
				loading: true,
				disabled: true,
				children: () => 'Loading + Disabled'
			});

			const button = getByRole('button');
			expect(button).toBeDisabled();
			expect(button).toHaveClass('cursor-wait');

			const spinner = container.querySelector('.animate-spin');
			expect(spinner).toBeInTheDocument();
		});

		it('should combine variant, size and state classes correctly', () => {
			const { getByRole } = render(Button, {
				variant: 'success',
				size: 'lg',
				loading: true,
				children: () => 'Complex'
			});

			const button = getByRole('button');
			expect(button).toHaveClass('bg-green-600'); // variant
			expect(button).toHaveClass('px-6', 'py-3'); // size
			expect(button).toHaveClass('cursor-wait'); // loading state
		});
	});
});
