#!/usr/bin/env node

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

// Mapping de paths SVG a nombres de iconos Lucide
const SVG_MAPPINGS = {
	// Iconos básicos ya mapeados
	'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15':
		'RefreshCw',
	'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z':
		'Lock',
	'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z':
		'AlertTriangle',
	'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10':
		'Table',
	'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z': 'Search',
	'15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1721 9z':
		'Key',
	'M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1721 9z':
		'Key',
	'M4 7v10c0 2.21 1.79 4 4 4h8c0-2.21-1.79-4-4-4H8c-2.21 0-4-1.79-4-4z': 'HardDrive',
	'M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z':
		'CheckCircle',
	'M6 18L18 6M6 6l12 12': 'X',
	'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1-1H8a1 1 0 00-1 1v3M4 7h16':
		'Trash2',
	'M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z':
		'AlertTriangle',
	'M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z':
		'Info',

	// Nuevos iconos comunes que aparecen en la salida
	'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z':
		'Edit2',
	'M4 6h16M4 10h16M4 14h16M4 18h16': 'Menu',
	'M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z':
		'Copy',
	'M19 9l-7 7-7-7': 'ChevronDown',
	'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z':
		'FileText',
	'M4 6h16M4 12h16M4 18h7': 'AlignLeft',
	'M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z':
		'Download',
	'M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-4.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 009.586 13H7':
		'Archive',
	'M15 19l-7-7 7-7': 'ChevronLeft',
	'M9 5l7 7-7 7': 'ChevronRight',
	'm4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z':
		'Loader2',
	'M18 8a6 6 0 01-7.743 5.743L10 14l-1-1-3.257-3.257A6 6 0 1118 8zm-6-4a2 2 0 11-4 0 2 2 0 014 0z':
		'MapPin',
	'M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z':
		'List',
	'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z': 'HelpCircle',
	'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4':
		'BarChart3',
	'M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z':
		'MapPin',
	'M3 10h18M3 14h18m-9-4v8m-7 0V4a1 1 0 011-1h12a1 1 0 011 1v16a1 1 0 01-1 1H4a1 1 0 01-1-1V10z':
		'Table2',
	'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4': 'Code2',
	'M8 16l2.879-2.879m0 0a3 3 0 104.243-4.242 3 3 0 00-4.243 4.242zM21 12a9 9 0 11-18 0 9 9 0 0118 0z':
		'Search',
	'M3 4a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 13a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1v-3zM12 4a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1V4zM12 13a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-3z':
		'Grid3X3',
	'M12 4v16m8-8H4': 'Plus',

	// Iconos adicionales encontrados en la salida
	'M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z':
		'HelpCircle',
	'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1-1H8a1 1 0 00-1 1v3M4 7h16':
		'Trash2',
	'M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z':
		'Loader2',
	'M4 6h16M4 12h16M4 18h16': 'Menu'
};

// Mapeo de tamaños comunes
const SIZE_MAPPINGS = {
	'h-3 w-3': 12,
	'h-4 w-4': 16,
	'h-5 w-5': 20,
	'h-6 w-6': 24,
	'h-12 w-12': 48
};

function getAllSvelteFiles(dir, files = []) {
	const items = readdirSync(dir);

	for (const item of items) {
		const fullPath = join(dir, item);
		const stat = statSync(fullPath);

		if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
			getAllSvelteFiles(fullPath, files);
		} else if (extname(item) === '.svelte') {
			files.push(fullPath);
		}
	}

	return files;
}

function extractSVGInfo(svgMatch) {
	// Extraer path d
	const pathMatch = svgMatch.match(/d="([^"]+)"/);
	if (!pathMatch) return null;

	const pathData = pathMatch[1];

	// Buscar en el mapping
	const iconName = SVG_MAPPINGS[pathData];
	if (!iconName) {
		console.log(`⚠️ Path no mapeado: ${pathData}`);
		return null;
	}

	// Extraer tamaño
	const sizeMatch = svgMatch.match(/class="[^"]*?(h-\d+ w-\d+)[^"]*?"/);
	const size = sizeMatch ? SIZE_MAPPINGS[sizeMatch[1]] || 24 : 24;

	// Extraer clases adicionales
	const classMatch = svgMatch.match(/class="([^"]+)"/);
	let additionalClasses = '';
	if (classMatch) {
		const classes = classMatch[1].split(' ');
		const filteredClasses = classes.filter(
			(cls) =>
				!cls.startsWith('h-') &&
				!cls.startsWith('w-') &&
				cls !== 'fill-none' &&
				cls !== 'fill-currentColor' &&
				cls !== 'stroke-currentColor'
		);
		if (filteredClasses.length > 0) {
			additionalClasses = ` class="${filteredClasses.join(' ')}"`;
		}
	}

	return { iconName, size, additionalClasses };
}

function replaceSVGsInContent(content) {
	// Regex para capturar todo el SVG
	const svgRegex = /<svg[^>]*>[\s\S]*?<\/svg>/g;

	let modified = content;
	let replacements = 0;
	let neededImports = new Set();

	modified = modified.replace(svgRegex, (svgMatch) => {
		const info = extractSVGInfo(svgMatch);
		if (!info) return svgMatch; // No se puede reemplazar

		neededImports.add(info.iconName);
		replacements++;

		return `<${info.iconName} size={${info.size}}${info.additionalClasses} />`;
	});

	// Agregar imports si es necesario
	if (neededImports.size > 0) {
		const importStr = `import { ${Array.from(neededImports).join(', ')} } from 'lucide-svelte';`;

		// Buscar si ya hay imports de lucide-svelte
		const existingImportMatch = modified.match(/import\s+\{([^}]+)\}\s+from\s+'lucide-svelte';/);

		if (existingImportMatch) {
			// Combinar imports existentes
			const existingImports = existingImportMatch[1].split(',').map((s) => s.trim());
			const allImports = [...new Set([...existingImports, ...Array.from(neededImports)])];
			const newImportStr = `import { ${allImports.join(', ')} } from 'lucide-svelte';`;
			modified = modified.replace(existingImportMatch[0], newImportStr);
		} else {
			// Agregar nuevo import después del último import existente
			const lastImportMatch = modified.match(/import.*?from.*?;/g);
			if (lastImportMatch) {
				const lastImport = lastImportMatch[lastImportMatch.length - 1];
				const insertIndex = modified.indexOf(lastImport) + lastImport.length;
				modified =
					modified.slice(0, insertIndex) + '\n\t' + importStr + modified.slice(insertIndex);
			}
		}
	}

	return { content: modified, replacements, imports: Array.from(neededImports) };
}

function main() {
	const srcDir = './src';
	const files = getAllSvelteFiles(srcDir);

	let totalReplacements = 0;
	const processedFiles = [];

	for (const filePath of files) {
		const originalContent = readFileSync(filePath, 'utf8');
		const result = replaceSVGsInContent(originalContent);

		if (result.replacements > 0) {
			writeFileSync(filePath, result.content);
			processedFiles.push({
				path: filePath,
				replacements: result.replacements,
				imports: result.imports
			});
			totalReplacements += result.replacements;

			console.log(
				`✅ ${filePath.replace('./src/', '')}: ${result.replacements} SVGs → iconos Lucide`
			);
			if (result.imports.length > 0) {
				console.log(`   Importados: ${result.imports.join(', ')}`);
			}
		}
	}

	console.log(
		`\n🎉 Completado: ${totalReplacements} SVGs reemplazados en ${processedFiles.length} archivos`
	);
}

main();
