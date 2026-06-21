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
