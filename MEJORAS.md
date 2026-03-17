# Mejoras - DynamoDB Manager

> Archivo unificado de tracking (reemplaza TODO.md). Marcar con `[x]` conforme se resuelvan.

---

## Completado

### Fase 1: Fixes Criticos

- [x] **Memory leak en suscripciones** — `current-connection.js`: subscribe sin cleanup → `$effect`
- [x] **Intervalo global sin limpieza** — `server-connections.js`: setInterval duplicado en hot reload
- [x] **Enmascaramiento debil de credenciales** — `aws-config.js`: mostrar solo ultimos 4 chars
- [x] **Manejo errores API Client** — `api-client.js`: try-catch para `response.json()` con HTML/502
- [x] **Patron suscripcion ineficiente** — Reemplazar `store.subscribe()()` por `get(store)`

### Fase 2: UX Esencial

- [x] **Sistema Toast/Notificaciones** — Store + componente con variantes y auto-dismiss
- [x] **Confirmacion al eliminar registros** — Modal con claves primarias antes de borrar
- [x] **Debounce en busquedas** — 500ms con $effect en RecordViewer
- [x] **i18n completo** — Todos los textos por paraglide (en/es)
- [x] **Limpieza console.logs** — Eliminados todos los logs de desarrollo

### Fase 3: Funcionalidades

- [x] **Mejoras tabla de datos** — Ordenamiento, claves resaltadas, seleccion multiple, columnas fijas
- [x] **Atajos de teclado** — Ctrl+N/R/F/E/S, Escape, cheat-sheet con `?`
- [x] **Cache esquemas tabla** — Store con TTL 5min e invalidacion manual
- [x] **Roles ARIA** — role=status, tablist/tab, aria-expanded en paneles
- [x] **Navegacion por teclado** — focus-within, tabindex en celdas editables
- [x] **DRY API Client** — `_getConnectionId()` centralizado
- [x] **Imports estaticos AWS** — Eliminados imports dinamicos en dynamodb-service
- [x] **Sort Key en QueryBuilder** — Soporte completo: =, <, <=, >, >=, begins_with, between

### Fase 4: Optimizacion

- [x] **Paginacion servidor** — Scan/Query iterativo (supera limite 1MB de DynamoDB)
- [x] **Busqueda avanzada (core)** — Operadores de comparacion, selector campo/operador/valor

### Infraestructura

- [x] **Electron 38 + electron-builder** — Build multiplataforma (Windows, macOS, Linux)
- [x] **Stack moderno** — Svelte 5 + SvelteKit 2.22 + TailwindCSS 4 + Vite 7
- [x] **Tema oscuro completo** — Todos los componentes incluyendo modales y editores
- [x] **Editor avanzado JSON** — Monaco/CodeMirror integrado
- [x] **Breadcrumbs** — Navegacion Conexion > Tabla > Vista
- [x] **Validacion JSON robusta** — Estructura, claves primarias, tipos DynamoDB
- [x] **Rate limiting API** — Limitar operaciones de escritura por minuto
- [x] **Validacion servidor** — Sanitizar tableName, tamano items, expresiones
- [x] **Error boundary centralizado** — Store errors.js, clasificacion, log estructurado
- [x] **Textos alternativos** — aria-label en iconos y emojis
- [x] **Documentacion GitHub** — README en/es con instrucciones de fork/contribucion

---

## Pendiente

### Prioridad Alta

- [ ] **Contraste WCAG** — `text-gray-400` sobre `bg-gray-50` (~2.5:1) no cumple AA (4.5:1). Auditar con Lighthouse/axe. Minimo `text-gray-600` claro / `text-gray-300` oscuro.
- [ ] **Tests unitarios criticos**
  - [ ] `dynamodb-service.js` — Mock AWS SDK, metodos CRUD
  - [ ] `api-client.js` — Mock fetch, manejo errores
  - [ ] `validators.js` — Tests exhaustivos
  - [ ] `connections.js` store — Persistencia y CRUD

### Prioridad Media

- [ ] **Importar datos** — Importar desde CSV/JSON (actualmente solo exporta)
- [ ] **Busqueda multi-campo** — Multiples filtros simultaneos en RecordViewer
- [ ] **Historial de queries** — Queries recientes en QueryBuilder
- [ ] **Lazy loading** — Cargar DynamoDBRecordEditor, JsonEditor, TableInfo bajo demanda
- [ ] **Encriptacion credenciales** — Electron `safeStorage` / Web Crypto API

### Prioridad Baja

- [ ] **Tests E2E** — Flujo conectar > explorar > CRUD > errores > tema
- [ ] **Tests accesibilidad** — Integrar axe-core en CI
- [ ] **Highlight busqueda** — Resaltar terminos encontrados en resultados
- [ ] **Drag & drop** — Reordenar conexiones en sidebar
- [ ] **Logger configurable** — Modulo logger.js con niveles por entorno
- [ ] **Token sesion seguro** — Reemplazar x-connection-id por token firmado
- [ ] **Mejora empty states** — Wizard primeros pasos, acciones directas
- [ ] **Consolidar stores** — Documentar flujo de estado global de conexiones
- [ ] **Separacion concerns** — Extraer logica DynamoDB de componentes a utils
- [ ] **Mejora JSDoc** — Reducir `@type {any}`, tipos mas especificos

### Futuro (v2.0+)

- [ ] Multi-region — Comparar tablas entre regiones
- [ ] Exportar a CSV/Excel
- [ ] Dashboard de metricas y cost analysis
