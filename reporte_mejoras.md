# Reporte de Mejoras — SIIB_NEW

**Fecha:** 2026-06-21 | **Generado por:** Agente de Análisis de Mejoras  
**Puntuación General: 5.8 / 10 — No apto para producción**

---

## Resumen Ejecutivo

El stack tecnológico elegido es excelente y la arquitectura base es sólida. Sin embargo, existen 5 problemas críticos que deben resolverse antes de cualquier despliegue, y un número significativo de mejoras que elevarían el sistema a nivel producción.

---

## 1. Críticos — Resolver Inmediatamente

### C1. Todas las rutas de negocio sin autenticación

**Impacto:** RFC, CURP, salarios, datos de empleados accesibles sin credenciales.

Los plugins `nomina.ts`, `rrhh.ts`, `compras.ts`, `almacen.ts`, `alimentacion.ts`, `informatica.ts`, `bascula.ts`, `leche.ts`, `contabilidad.ts` no tienen el hook `fastify.authenticate`.

**Fix:**
```typescript
// Al inicio de cada plugin, después del export default
export default async function nominaRoutes(fastify: FastifyInstance) {
  fastify.addHook('onRequest', fastify.authenticate)  // ← AGREGAR
  // ... resto de rutas
}
```

---

### C2. Mismatch de tipos: `aut1/2/3Status` Boolean vs String

**Impacto:** Datos corruptos al crear requisiciones. El módulo de Compras no funciona.

`schema.prisma` define `aut1Status Boolean @default(false)` pero el código asigna `'PENDIENTE'`/`'AUTORIZADO'`.

**Fix en schema.prisma:**
```prisma
// Antes:
aut1Status    Boolean @default(false)
aut2Status    Boolean @default(false)
aut3Status    Boolean @default(false)

// Después:
aut1Status    String  @default("PENDIENTE")
aut2Status    String  @default("PENDIENTE")
aut3Status    String  @default("PENDIENTE")
```
Luego: `npx prisma migrate dev --name fix-autorizacion-status`

---

### C3. `NominaGrupo.status` es `Int` en schema pero `String` en lógica

**Impacto:** Prisma lanza error en runtime al crear cualquier nómina. El módulo core no funciona.

**Fix en schema.prisma:**
```prisma
// Antes:
status        Int     @default(1)

// Después:
status        String  @default("BORRADOR")
```
Luego: `npx prisma migrate dev --name fix-nomina-status`

---

### C4. Dos instancias de `PrismaClient` (connection pool duplicado)

**Impacto:** Doble consumo de conexiones a base de datos; comportamiento inconsistente.

`nomina.ts` y `rrhh.ts` importan `import { prisma } from '../lib/prisma'` directamente. `compras.ts` y otros usan `fastify.prisma` del plugin.

**Fix:** Usar `fastify.prisma` en absolutamente todos los archivos de routes:
```typescript
// ❌ Antes (nomina.ts, rrhh.ts):
import { prisma } from '../lib/prisma'

// ✅ Después — quitar el import y usar:
const result = await fastify.prisma.empleado.findMany(...)
```

---

### C5. Token null: key de localStorage incorrecta + URLs hardcodeadas

**Impacto:** `RequisicionesList.tsx` siempre recibe token null. Cualquier feature con URL hardcodeada falla en producción.

`RequisicionesList.tsx` usa `localStorage.getItem('token')` pero el auth store (Zustand) guarda con key `'siib_token'`.

**Fix:**
```typescript
// ❌ Antes:
const token = localStorage.getItem('token')
const res = await fetch('http://localhost:3001/api/compras/requisiciones', {
  headers: { Authorization: `Bearer ${token}` }
})

// ✅ Después:
const requisiciones = await api.get('/compras/requisiciones')
```

---

## 2. Graves — Resolver Antes del Primer Usuario

| # | Problema | Archivo | Fix |
|---|---------|---------|-----|
| G1 | CORS bloqueará el frontend en producción (`origin: false`) | `server.ts` | `origin: process.env.FRONTEND_URL \|\| true` |
| G2 | Sin rate limiting en login | `server.ts` | Agregar `@fastify/rate-limit` con max 5 req/min en `/api/auth/login` |
| G3 | Sin RBAC — cualquier usuario autoriza requisiciones | `compras.ts` | Verificar rol del usuario autenticado antes de autorizar |
| G4 | `prisma db push` en producción sin historial de migraciones | `README.md` | Usar `prisma migrate deploy` en prod |
| G5 | `JWT_SECRET` con default inseguro (`'changeme'`) | `server.ts` | Exigir variable de entorno, no tener default |

---

## 3. Módulos Pendientes (~70% son PlaceholderPage)

Los agentes completaron los módulos de Nómina, RRHH, Compras, Almacén, Alimentación, Informática, Báscula, Leche y Contabilidad con sus páginas principales. Sin embargo, varias sub-páginas siguen como PlaceholderPage:

```
nomina/     → CargaExcel.tsx, HistorialNominas.tsx
rrhh/       → EmpleadoDetalle.tsx
compras/    → ProveedorForm.tsx, MarcaForm.tsx
almacen/    → MovimientosHistorial.tsx
alimentacion → DietaDetalle.tsx
informatica → AnimalDetalle.tsx, LoteForm.tsx
```

---

## 4. Mejoras de Calidad (Nice to Have)

| # | Mejora | Impacto |
|---|--------|---------|
| M1 | Agregar tests con Vitest (frontend) + Jest (backend) | Previene regresiones |
| M2 | Interceptor 401 global en `api.ts` → redirect a login | UX |
| M3 | Migraciones de Prisma con `--name` descriptivos | Mantenibilidad |
| M4 | Validación de esquema con Zod en todas las rutas | Seguridad |
| M5 | Logs estructurados (Pino ya incluido en Fastify) | Observabilidad |
| M6 | Health check endpoint `/api/health` | DevOps |
| M7 | Dockerizar el backend y frontend para despliegue | Portabilidad |
| M8 | Paginación en todos los listados del frontend | Performance |

---

## 5. Lo que está Bien ✅

- Stack tecnológico moderno y apropiado (React 18, Fastify 4, Prisma 5, PostgreSQL 15)
- Plugin Prisma registrado correctamente como `fastify.prisma`
- Soft deletes consistentes en todos los modelos (`deletedAt`)
- UI consistente y pulida con Tailwind
- Paginación server-side correcta en backend
- Cliente API centralizado (`lib/api.ts`)
- Schema de BD bien normalizado (25 modelos relacionados)
- JWT con expiración de 8h
- Docker Compose para desarrollo local

---

## 6. Plan de Acción Sugerido

```
Semana 1 (Bloqueadores):
  □ C1: Agregar fastify.authenticate a todos los plugins de rutas
  □ C2/C3: Corregir tipos en schema.prisma + migrar
  □ C4: Unificar uso de fastify.prisma
  □ C5: Reemplazar fetch/localStorage en RequisicionesList
  □ G5: JWT_SECRET sin default inseguro

Semana 2 (Estabilidad):
  □ G1: Configurar CORS con variable de entorno
  □ G2: Rate limiting en login
  □ G3: RBAC básico para autorizaciones
  □ M1: Tests unitarios críticos (auth, nomina, compras)

Semana 3 (Completar):
  □ Implementar páginas PlaceholderPage restantes
  □ M2: Interceptor 401
  □ M6: Health check
  □ M8: Paginación en frontend
```

---

*Generado por Agente de Mejoras — 2026-06-21*
