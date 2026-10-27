# Boutique POS - Sistema de Facturación, Caja e Inventario

Sistema web para tienda de ropa en Paraguay, con moneda Guaraníes (₲), preparado para correr con Docker.

## Características (MVP)

- **Punto de Venta (POS)** - Venta rápida con carrito, múltiples formas de pago, descuentos
- **Control de Caja** - Apertura/cierre de caja, arqueo, movimientos de caja
- **Inventario** - Control de stock por producto y variante (talle/color), movimientos
- **Productos** - Catálogo con categorías, marcas, variantes, precios y costos
- **Clientes** - Gestión con RUC/CI para Paraguay
- **Ventas y Reportes** - Historial de ventas, reportes básicos
- **Comprobantes Internos** - Numeración configurable (listo para migrar a SIFEN/SET)

## Tecnologías

- **Frontend/Backend**: Next.js 15 (App Router) + TypeScript
- **UI**: Tailwind CSS 4
- **Base de Datos**: PostgreSQL 16
- **ORM**: Prisma
- **Contenedores**: Docker + Docker Compose

## Levantar el proyecto

### 1. Configurar variables de entorno

```bash
cd boutique-app
cp .env.example .env
```

Editar `.env` si es necesario.

### 2. Levantar con Docker

Desde la raíz del proyecto:

```bash
docker compose up --build
```

La aplicación estará en `http://localhost:3000`

### 3. Migrar base de datos (primera vez)

En otra terminal:

```bash
docker compose exec app npx prisma migrate dev --name init
docker compose exec app npx prisma generate
```

### 4. (Opcional) Datos de prueba

```bash
docker compose exec app npx prisma db seed
```

## Desarrollo local sin Docker

Si prefieres correr localmente:

```bash
cd boutique-app
npm install
npx prisma generate
npx prisma migrate dev
npm run dev
```

Necesitarás PostgreSQL corriendo localmente.

## Notas

- Los montos se guardan como **enteros** en Guaraníes (sin decimales)
- Todo queda dockerizado para máxima portabilidad
- Preparado para agregar facturación electrónica SIFEN más adelante
- Código en español para facilitar el uso diario

## Estructura

```
boutique/
├── docker-compose.yml
├── README.md
└── boutique-app/
    ├── Dockerfile
    ├── prisma/
    │   └── schema.prisma
    └── src/
        ├── app/
        ├── components/
        └── lib/
```
