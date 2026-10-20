# POS UPTPC — Cantina Universitaria 🎓

Sistema de Punto de Venta (POS) para la **Cantina de la Universidad Politécnica Territorial de Puerto Cabello (UPTPC)**, construido con **Next.js 16**, **TypeScript**, **Tailwind CSS 4**, **shadcn/ui** y base de datos **Turso (libSQL)** — listo para desplegar en **Vercel**.

| | |
|---|---|
| 🏛️ Institución | Universidad Politécnica Territorial de Puerto Cabello (UPTPC) |
| 📍 Dirección | Zona Industrial Santa Rosa, Circuito Comunal 8, Parroquia Juan José Flores, Puerto Cabello, Edo. Carabobo |
| 🧾 RIF | G-20005608-8 |
| 💰 Moneda | Bolívares (Bs.) con formato venezolano `1.234,56` |
| 🧮 IVA | 16 % (configurable desde el panel) |

---

## ✨ Funcionalidades

### General
- 🔐 **Autenticación con sesiones JWT** en cookie `httpOnly` (7 días de duración).
- 👥 **Dos roles**: `Administrador` (acceso total) y `Vendedor` (POS + ventas).
- 🍽️ **POS completo**: grilla de productos por categorías, búsqueda, carrito con cantidades, modo *Salón* / *Para llevar* y nombre opcional del cliente.
- 💳 **Tres métodos de pago venezolanos**: Efectivo (con cálculo automático de cambio), Punto de venta y Pago móvil (con campo de referencia).
- 🧾 **Ticket institucional imprimible** con logos UPTPC / PNF Informática, datos de la institución y desglose de IVA.
- 🔔 **Notificaciones con toasts** (sonner) y **diálogos de confirmación** propios — sin `alert()` ni `confirm()` del navegador.
- 📱 **Diseño responsive**: en móvil el carrito se convierte en una hoja deslizable inferior.

### Administración (solo ADMIN)
- 📊 **Resumen**: ventas e ingresos del día y del mes, ticket promedio, pagos por método, productos más vendidos (30 días) y últimas ventas.
- 👤 **CRUD de usuarios**: crear vendedores y administradores, editar, restablecer contraseña, activar/desactivar y eliminar, con protecciones:
  - No puedes desactivar/eliminar tu propia cuenta.
  - Siempre debe existir al menos un administrador activo.
  - No se puede eliminar un usuario con ventas registradas (se sugiere desactivarlo).
- 📦 **CRUD de productos y categorías**: precios en bolívares, activar/desactivar (los inactivos desaparecen del POS), eliminar con conservación del historial.
- ⚙️ **Ajustes**: nombre del negocio, subtítulo, dirección, RIF, IVA (%) y moneda — con vista previa del encabezado del ticket.
- 🧾 **CRUD de ventas**: consultar, filtrar por período/método/estado, ver ticket, **anular/restaurar** y eliminar; exportación a **CSV**.

---

## 🗄️ Base de datos

Los datos se almacenan en **Turso** (libSQL distribuido sobre SQLite). El sistema incluye un **bootstrap automático**: la primera vez que la aplicación se conecta, crea las tablas y los datos iniciales sin necesidad de ejecutar migraciones manualmente:

- 👤 Superadmin: **`admin` / `admin`**
- 🛒 Productos iniciales: **Empanada (Bs. 50) · Arepa (Bs. 70) · Refresco (Bs. 30) · Pastelito (Bs. 40) · Pastel (Bs. 90)**
- 🗂️ Categorías: Comidas, Bebidas, Postres
- ⚙️ Ajustes de la institución precargados

> ⚠️ **Importante:** cambia la contraseña del superadmin la primera vez que entres (Administración → Usuarios → editar `admin`).

Si no defines `TURSO_DATABASE_URL`, la aplicación usa SQLite local (`db/pos.db`) para desarrollo.

---

## 🚀 Despliegue en Vercel

### 1. Crea la base de datos en Turso

```bash
# Instala el CLI de Turso: https://docs.turso.tech/cli/introduction
turso db create basepos
turso db tokens create basepos     # copia el token generado
turso db show basepos --url        # copia la URL (libsql://...)
```

### 2. Sube el código a GitHub

```bash
git init
git add .
git commit -m "POS UPTPC: sistema de cantina"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/pos-uptpc.git
git push -u origin main
```

> El `.gitignore` excluye `.env*`, `node_modules/`, `.next/` y archivos innecesarios.

### 3. Importa el proyecto en Vercel

1. Entra a [vercel.com/new](https://vercel.com/new) e importa el repositorio (Vercel detecta Next.js automáticamente).
2. Antes de desplegar, abre **Environment Variables** y agrega:

   | Variable | Valor |
   |---|---|
   | `TURSO_DATABASE_URL` | `libsql://basepos-<tu-usuario>.aws-us-west-2.turso.io` |
   | `TURSO_AUTH_TOKEN` | el token generado con `turso db tokens create` |
   | `AUTH_SECRET` | una cadena secreta larga (ej. `openssl rand -hex 32`) |

3. Despliega. En el primer arranque el sistema **crea las tablas y los datos iniciales solo**.

### Alternativa: despliegue por CLI

```bash
npm i -g vercel
vercel link
vercel env add TURSO_DATABASE_URL
vercel env add TURSO_AUTH_TOKEN
vercel env add AUTH_SECRET
vercel --prod
```

---

## 💻 Desarrollo local

```bash
# 1. Instalar dependencias
bun install        # o npm install

# 2. Configurar variables de entorno
cp .env.example .env
#    → edita TURSO_DATABASE_URL, TURSO_AUTH_TOKEN y AUTH_SECRET
#    → (o deja DATABASE_URL=file:db/pos.db para usar SQLite local)

# 3. Inicializar la base de datos (crea tablas + datos semilla)
bun run db:init

# 4. Levantar el servidor
bun run dev        # http://localhost:3000
```

### Comandos útiles

| Comando | Descripción |
|---|---|
| `bun run dev` | Servidor de desarrollo |
| `bun run build` | Compilación de producción (incluye `prisma generate`) |
| `bun run lint` | Verificación de código con ESLint |
| `bun run db:init` | Crea tablas y datos iniciales en Turso/SQLite |
| `bun run db:seed` | Solo datos semilla (admin, productos, ajustes) |
| `bun run db:generate` | Regenera el cliente Prisma |

---

## 🧱 Estructura del proyecto

```
├── prisma/
│   ├── schema.prisma        # Modelos: User, Category, Product, Sale, SaleItem, Setting
│   └── seed.ts              # Datos semilla (admin/admin, 5 productos, ajustes)
├── src/
│   ├── app/
│   │   ├── page.tsx         # Redirección según sesión y rol
│   │   ├── login/           # Pantalla de inicio de sesión
│   │   ├── panel/
│   │   │   ├── layout.tsx   # Guarda de sesión + shell con navegación
│   │   │   ├── pos/         # Punto de venta
│   │   │   ├── ventas/      # Historial de ventas
│   │   │   └── admin/       # Panel de administración
│   │   └── api/
│   │       ├── auth/        # login · logout · me
│   │       ├── users/       # CRUD usuarios (solo admin)
│   │       ├── categories/  # CRUD categorías (solo admin)
│   │       ├── products/    # CRUD productos (admin escribe, vendedor lee)
│   │       ├── sales/       # Crear/consultar/anular/eliminar ventas
│   │       ├── settings/    # Ajustes del negocio
│   │       └── stats/       # Estadísticas del panel
│   ├── components/
│   │   ├── pos/             # POS, modal de pago, ticket imprimible
│   │   ├── ventas/          # Historial con filtros y CSV
│   │   ├── admin/           # Resumen, usuarios, productos, ajustes
│   │   └── confirm-dialog.tsx
│   └── lib/
│       ├── db.ts            # Prisma + adaptador libSQL (Turso o SQLite)
│       ├── bootstrap.ts     # Creación automática de esquema y semilla
│       ├── auth.ts          # Sesiones JWT (jose) y guardas de rol
│       ├── hash.ts          # Contraseñas con scrypt
│       ├── money.ts         # Formato/parseo de bolívares en céntimos
│       └── constants.ts     # Métodos de pago, roles, ajustes por defecto
└── public/logos/            # Logos UPTPC y PNF Informática
```

---

## 🔒 Seguridad

- Contraseñas hasheadas con **scrypt** (nativo de Node, sin dependencias externas).
- Sesiones firmadas con **JWT HS256** (`jose`) en cookie `httpOnly` + `SameSite=Lax` + `Secure` en producción.
- **Todos** los endpoints validan sesión y rol en el servidor (el vendedor recibe `403` en rutas de administración).
- Los precios de las ventas se calculan **siempre en el servidor** a partir de los productos guardados.
- Validación de entradas con **Zod** en cada endpoint.

## 🛠️ Stack tecnológico

[Next.js 16](https://nextjs.org) · [TypeScript 5](https://www.typescriptlang.org) · [Tailwind CSS 4](https://tailwindcss.com) · [shadcn/ui](https://ui.shadcn.com) · [Prisma ORM](https://www.prisma.io) + [@prisma/adapter-libsql](https://github.com/turso-db/prisma-libsql) · [Turso](https://turso.tech) · [TanStack Query](https://tanstack.com/query) · [sonner](https://sonner.emilkowal.ski) · [date-fns](https://date-fns.org) · [jose](https://github.com/panva/jose)

---

*Desarrollado por PNF en Informática · Cantina UPTPC — Servicio de Alimentación* 🍽️
