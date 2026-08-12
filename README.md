# SIIB_NEW — Sistema Integral de Información Beta

Sistema empresarial moderno construido con **React + Fastify + PostgreSQL**. Reemplazo multiplataforma del sistema SIIB original (.NET Framework), diseñado para correr nativamente en **macOS, Linux y Windows**.

---

## Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS |
| Backend | Node.js 20 + Fastify 4 + TypeScript |
| ORM | Prisma 5 |
| Base de datos | PostgreSQL 15 |
| Auth | JWT (jsonwebtoken) |
| Estado | Zustand 4 |
| Data fetching | TanStack Query v5 |

---

## Módulos del Sistema

| Módulo | Descripción |
|--------|-------------|
| 🏠 Dashboard | KPIs en tiempo real de todos los módulos |
| 💰 Nómina | Prenómina, recibos CFDI, checador, TEF bancario |
| 👥 RRHH | Empleados, puestos, departamentos |
| 🛒 Compras | Requisiciones con 3 niveles de autorización, cotizaciones, órdenes |
| 📦 Almacén | Inventario, movimientos, stock bajo, solicitudes |
| 🌾 Alimentación | Dietas de ganado, facturas de forraje, programas |
| 🐄 Informática | Registro de animales, lotes, partos |
| ⚖️ Báscula | Fichas de pesaje, entrada/salida, peso neto |
| 🥛 Leche | Envíos, programación semanal por cliente |
| 📊 Contabilidad | Solicitudes de pago con flujo de autorización |

---

## Requisitos Previos

- **Node.js** 20+ → [nodejs.org](https://nodejs.org)
- **Docker Desktop** (para PostgreSQL) → [docker.com](https://www.docker.com/products/docker-desktop/)
- **Git**

---

## Instalación y Arranque

### 1. Clonar el repositorio

```bash
git clone https://github.com/cmartinez89/SIIB_NUEVO.git
cd SIIB_NUEVO
```

### 2. Configurar variables de entorno

```bash
# Backend
cp backend/.env.example backend/.env
# Edita backend/.env con tus valores (la URL de base de datos ya apunta a Docker)
```

### 3. Levantar PostgreSQL con Docker

```bash
docker-compose up -d
# Verifica que está corriendo:
docker-compose ps
```

### 4. Instalar dependencias

```bash
# Instalar todo de una vez:
npm run install:all

# O manualmente:
cd backend && npm install
cd ../frontend && npm install
```

### 5. Configurar la base de datos

```bash
cd backend

# Crear tablas con Prisma
npx prisma migrate dev --name init

# Cargar datos de prueba
npx prisma db seed
```

### 6. Arrancar el sistema

```bash
# Desde la raíz del proyecto (arranca backend + frontend simultáneamente):
npm run dev
```

O por separado:
```bash
# Terminal 1 — Backend (puerto 3001)
cd backend && npm run dev

# Terminal 2 — Frontend (puerto 5173)
cd frontend && npm run dev
```

### 7. Acceder al sistema

| Servicio | URL |
|----------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:3001/api |
| pgAdmin | http://localhost:5050 |

**Credenciales de prueba:**
- Email: `admin@siib.com`
- Password: `admin123`

---

## Estructura del Proyecto

```
SIIB_NEW/
├── docker-compose.yml          # PostgreSQL + pgAdmin
├── package.json                # Scripts raíz (dev, install:all)
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma       # Modelos de base de datos
│   │   └── seed.ts             # Datos de prueba
│   └── src/
│       ├── server.ts           # Servidor Fastify principal
│       ├── plugins/            # JWT, Prisma
│       └── routes/             # auth, usuarios, nomina, rrhh,
│                               # compras, almacen, alimentacion,
│                               # informatica, bascula, leche,
│                               # contabilidad, dashboard
└── frontend/
    └── src/
        ├── App.tsx             # Router principal
        ├── components/
        │   ├── ui/             # Button, Input, Card, Table...
        │   └── layout/         # Layout, Sidebar, Header
        ├── pages/              # Páginas por módulo
        ├── store/              # Zustand (auth)
        └── lib/                # api.ts, utils.ts
```

---

## API Reference

Todos los endpoints requieren el header:
```
Authorization: Bearer <token>
```

Excepto `POST /api/auth/login`.

### Autenticación
```
POST /api/auth/login    { email, password } → { token, user }
GET  /api/auth/me       → { user }
POST /api/auth/logout   → { success }
```

### Módulos
Cada módulo sigue el patrón REST estándar:
```
GET    /api/{modulo}           Lista con paginación y filtros
POST   /api/{modulo}           Crear nuevo registro
GET    /api/{modulo}/:id       Detalle
PUT    /api/{modulo}/:id       Actualizar
DELETE /api/{modulo}/:id       Eliminar (soft delete)
GET    /api/{modulo}/resumen   KPIs para dashboard
```

---

## Scripts Disponibles

```bash
# Raíz
npm run dev          # Arranca backend + frontend en paralelo
npm run install:all  # Instala dependencias en ambos proyectos

# Backend
npm run dev          # Desarrollo con hot-reload (tsx watch)
npm run build        # Compilar TypeScript
npm run start        # Producción

# Frontend
npm run dev          # Vite dev server
npm run build        # Build de producción
npm run preview      # Preview del build
```

---

## Base de Datos

### Migraciones

```bash
cd backend

# Nueva migración
npx prisma migrate dev --name descripcion_cambio

# Ver estado de migraciones
npx prisma migrate status

# Abrir Prisma Studio (explorador visual de BD)
npx prisma studio
```

### Reset completo (desarrollo)

```bash
cd backend
npx prisma migrate reset   # Borra todo y re-crea desde cero
```

---

## Estado de la Migración

**Fase 0 (críticos) — completada 2026-08-11:**

- ✅ Autenticación agregada a todas las rutas de negocio, incluyendo `dashboard.ts` (única ruta que aún faltaba; el resto de módulos ya tenía el hook `fastify.authenticate`).
- ✅ Eliminada la segunda instancia de `PrismaClient` (`lib/prisma.ts`, usada solo por `dashboard.ts`) — todas las rutas usan `fastify.prisma`.
- ✅ Corregido el patrón de fetch con token/URL hardcodeados: además de `RequisicionesList.tsx` (ya corregido antes), se encontró y corrigió el mismo bug en **8 páginas más** (`ProveedoresList`, `OrdenesCompra`, `RequisicionForm`, `RequisicionDetalle`, `SolicitudesAlmacen`, `InventarioList`, `MovimientosList`, `ArticuloForm`) — todas usaban `localStorage.getItem('token')` (key incorrecta) y `fetch('http://localhost:3001/...')` hardcodeado en vez del cliente `lib/api.ts`.
- ✅ Verificado: `aut1/2/3Status` y `NominaGrupo.status` ya eran `String` en `schema.prisma` (el mismatch de tipos documentado en versiones anteriores ya no aplica).

**Fase 1 (RBAC) — completada 2026-08-12:** modelos `Rol`/`Modulo`/`SubModulo`/`RolSubModulo`/`UsuarioEstablo`, menú dinámico por rol en login/`/me`, sidebar y rutas del frontend gateadas por permiso real, panel de administración (`/administracion/*`) para roles, módulos y alcance multi-establo. Nota de alcance: la enforcement es a nivel de menú/frontend; las rutas de negocio existentes (compras.ts, nomina.ts, etc.) todavía no verifican permiso por acción — ver el commit de Fase 1 para el detalle.

**Fase 2 (Portal + Casetas) — completada 2026-08-12:** PDF público de orden de compra por token (`pdfkit`), bitácora de caseta + vales de salida + sincronización offline del kiosco. **Pendiente dentro de Fase 2** (investigado, no fabricado): llevar Compras y Nómina a paridad real requiere modelar firmas de usuario con límite de monto, validación contra presupuesto por cuenta contable, y las fórmulas exactas de percepciones/deducciones de nómina (el original tiene al menos 4 subsistemas de nómina — prenómina clásica, un segundo flujo "PlanB" de +4000 líneas, turnos, y archivos bancarios TEF). Esto necesita su propia sesión de investigación línea por línea antes de escribir código — no se adivinó ninguna fórmula financiera o de nómina.

**Fase 4 (Access, Admin SIIB, Tareas, Evaluaciones, catálogos menores) — completada 2026-08-12.**

**Fase 3 (Báscula SAB + Tracker) — parcial, por diseño:**
- ✅ Báscula SAB (`/api/bascula-sab`, `/bascula/sab`): flujo completo primera pesada → segunda pesada → cierre, con edición justificada. El peso se **teclea manualmente** en vez de leerse del puerto serie — el punto de integración está marcado con `TODO(hardware)` en `backend/src/routes/basculaSab.ts`. Para conectar la báscula física real hay dos caminos, ninguno probable sin el hardware en mano: **Web Serial API** (Chrome/Edge únicamente, requiere HTTPS, el navegador pide permiso de puerto serie al usuario) o un **agente local** (un pequeño servicio en la PC de la báscula que lee el puerto serie y expone un endpoint HTTP local que el frontend consulta).
- ⏸️ **Tracker no se implementó** — es una integración ETL con una base **Firebird** externa del sistema de mezcladoras TMR, en un servidor físico distinto por establo (credenciales en tabla de parámetros del original). No hay forma de escribir esto de forma verificable sin esa base accesible: el driver correcto en Node sería [`node-firebird`](https://www.npmjs.com/package/node-firebird), y la arquitectura sería un job programado (`node-cron` o similar) que se conecta a cada Firebird por establo, lee `DS_BATCH`/`DS_RATION`/`DS_INGREDIENT` desde el último `id` sincronizado, y hace upsert hacia un modelo `ConsumoRacion` (no existe todavía en `schema.prisma`). Implementarlo en falso —contra una base que no existe— sería peor que no implementarlo.

Pendiente: ver el mapa completo de módulos faltantes y la Fase 5 de la hoja de ruta (Reportes, módulo por módulo).

---

## Comparación con Sistema Original

| Aspecto | SIIB Original | SIIB_NEW |
|---------|--------------|----------|
| Framework | ASP.NET MVC 5 | React + Fastify |
| Runtime | .NET Framework 4.7.2 | Node.js 20 |
| OS compatible | Solo Windows | macOS ✓ Linux ✓ Windows ✓ |
| Base de datos | SQL Server | PostgreSQL |
| Frontend | Razor + jQuery | React + TypeScript |
| Deploy | IIS + Windows Server | Docker / cualquier VPS |
| Tests | 0% cobertura | Estructura preparada |

---

## Contribuir

1. Crea una rama: `git checkout -b feature/nombre-modulo`
2. Haz tus cambios
3. Crea un PR describiendo qué módulo/funcionalidad afectas

---

*Generado con Claude Code — 2026-06-21*
