# 🏋️ FitBook — Sistema de Reservas de Clases de Gimnasio

> **Proyecto Web Final** · Node.js · Express · PGlite/PostgreSQL · Vanilla JS SPA

🌐 **Demo en producción:** [https://fitbook-gym.up.railway.app](https://fitbook-gym.up.railway.app) *(o enlace asignado en tu plataforma de hosting)*  
📦 **Repositorio:** [https://github.com/tu-usuario/fitbook](https://github.com/tu-usuario/fitbook)

FitBook es una aplicación web full-stack que permite a usuarios registrarse, explorar clases de gimnasio, realizar reservas en tiempo real y cancelarlas. Los administradores disponen de un panel con CRUD completo de clases y gestión de usuarios.

---

## 📋 Tabla de Contenidos

1. [Objetivo del proyecto](#-objetivo)
2. [Stack tecnológico](#-stack-tecnológico)
3. [Arquitectura](#-arquitectura)
4. [Estructura de archivos](#-estructura-de-archivos)
5. [Instalación y ejecución](#-instalación-y-ejecución)
6. [Variables de entorno](#-variables-de-entorno)
7. [Esquema de base de datos](#-esquema-de-base-de-datos)
8. [API REST — Documentación](#-api-rest--documentación)
9. [Seguridad](#-seguridad)
10. [Suite de pruebas](#-suite-de-pruebas)
11. [Funcionalidades](#-funcionalidades)
12. [Capturas de pantalla](#-capturas-de-pantalla)
13. [Credenciales de prueba](#-credenciales-de-prueba)
14. [Despliegue](#-despliegue)

---

## 🎯 Objetivo

Resolver la necesidad de gestión de reservas para un gimnasio:
- Los **usuarios** pueden registrarse, buscar clases, reservar y cancelar cupos.
- Los **administradores** gestionan clases (alta, edición, eliminación) y usuarios (cambio de rol, eliminación).
- El sistema garantiza integridad en tiempo real: sin sobreventa de cupos, sin solapamientos de horarios, sin reservas de última hora no autorizadas.

---

## 🛠 Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Runtime | Node.js ≥ 20 (ESM nativo) |
| Framework | Express 4 |
| Base de datos | PGlite (PostgreSQL embebido, desarrollo) / PostgreSQL 14+ (producción) |
| Autenticación | JWT + cookies httpOnly firmadas |
| Hash de contraseñas | bcryptjs (12 rondas) |
| Seguridad HTTP | Helmet, CSP, Rate Limiting, CSRF guard |
| Frontend | Vanilla JavaScript (SPA), CSS personalizado |
| Tipografía | Google Fonts — Outfit + Inter |
| Testing | Node.js built-in test runner (`node --test`) |

---

## 🏛 Arquitectura

```
Browser (SPA)
    │  fetch() + cookie httpOnly
    ▼
Express Server (puerto 3000)
    ├── /api/*  →  Router → Controllers → Services → Models → DB
    └── /*      →  Archivos estáticos (client/)
                       └── index.html + js/ + css/

Base de Datos (PGlite / PostgreSQL)
    ├── users
    ├── classes
    └── bookings
```

### Flujo de autenticación
1. `POST /api/auth/login` → verifica bcrypt → firma JWT → `Set-Cookie: fitbook_token`
2. Cada request protegido → Express lee cookie → verifica JWT → carga usuario de BD (rol siempre actualizado)
3. Logout → borra cookie
4. CSRF guard: las mutaciones (POST/PUT/PATCH/DELETE) exigen `X-Requested-With: fetch`

---

## 📁 Estructura de Archivos

```
pagina web/
├── .env.example              # Plantilla de configuración
├── .gitignore
├── package.json
│
├── client/                   # Frontend SPA
│   ├── index.html            # Shell HTML (iconos SVG, navbar, main, footer)
│   ├── css/
│   │   └── styles.css        # Diseño premium dark-mode (700+ líneas)
│   └── js/
│       ├── app.js            # Router SPA + boot
│       ├── api.js            # Cliente HTTP centralizado
│       ├── state.js          # Estado de autenticación (pub/sub)
│       ├── components/
│       │   ├── classCard.js  # Tarjeta de clase + barra de ocupación
│       │   ├── classForm.js  # Formulario create/edit clase (admin)
│       │   ├── form.js       # Validación de formularios en frontend
│       │   ├── modal.js      # Modal accesible + confirm dialog
│       │   ├── navbar.js     # Barra de navegación reactiva
│       │   ├── pagination.js # Componente de paginación
│       │   └── toast.js      # Notificaciones toast animadas
│       ├── pages/
│       │   ├── home.js       # Página principal con hero y estadísticas
│       │   ├── auth.js       # Login y Registro
│       │   ├── classes.js    # Catálogo con búsqueda y filtros
│       │   ├── classDetail.js# Detalle de clase + reserva
│       │   ├── myBookings.js # Mis reservas (con cancelación)
│       │   ├── profile.js    # Perfil de usuario
│       │   ├── admin.js      # Panel admin (stats, CRUD, usuarios)
│       │   └── error.js      # Página 404/403/500
│       └── utils/
│           └── dom.js        # Helpers DOM ($, $$, spinner, etc.)
│
└── server/
    ├── tests/
    │   └── api.test.js       # 30 tests de integración
    └── src/
        ├── server.js         # Entry point (init DB, seed, listen)
        ├── app.js            # Express factory (Helmet, routes, static)
        ├── config/
        │   └── env.js        # Variables de entorno tipadas y validadas
        ├── db/
        │   ├── index.js      # Adaptador DB (PGlite / pg pool)
        │   ├── init.js       # Schema DDL + datos de prueba
        │   └── schema.sql    # SQL DDL (tablas, índices, constraints)
        ├── models/
        │   ├── userModel.js
        │   ├── classModel.js
        │   ├── bookingModel.js
        │   └── statsModel.js
        ├── services/
        │   ├── authService.js
        │   ├── classService.js
        │   ├── bookingService.js
        │   └── userService.js
        ├── controllers/
        │   ├── authController.js
        │   ├── classController.js
        │   └── bookingController.js
        ├── middleware/
        │   ├── auth.js        # authenticate / optionalAuth / requireRole / csrfGuard
        │   └── errorHandler.js
        ├── routes/
        │   └── index.js       # Definición de todas las rutas API
        ├── validators/
        │   ├── schemas.js     # Definición de esquemas de validación
        │   └── validate.js    # Motor de validación ligero
        └── utils/
            └── AppError.js    # Errores HTTP tipados + asyncHandler
```

---

## 🚀 Instalación y Ejecución

### Requisitos previos
- Node.js **≥ 20** (se requieren `--watch` y `node:test` integrados)
- npm

### Pasos

```bash
# 1. Clonar / descomprimir el proyecto
cd "pagina web"

# 2. Instalar dependencias
npm install

# 3. Configurar entorno (opcional para desarrollo local)
copy .env.example .env
# Editar .env si se desea usar PostgreSQL real

# 4. Iniciar servidor de desarrollo
npm run dev
```

El servidor arranca en **http://localhost:3000**. En la primera ejecución:
- Se crea el esquema de base de datos automáticamente.
- Se insertan datos de prueba (12 clases, 3 usuarios) si la BD está vacía.

### Scripts disponibles

| Comando | Descripción |
|---------|------------|
| `npm run dev` | Servidor con auto-reload (`--watch`) |
| `npm start` | Servidor de producción |
| `npm test` | Suite de 30 tests de integración |
| `npm run db:init` | Crear/verificar esquema |
| `npm run db:seed` | Insertar datos de prueba (solo si BD vacía) |
| `npm run db:reset` | Destruir y recrear esquema + insertar datos |

---

## ⚙️ Variables de Entorno

| Variable | Descripción | Default |
|----------|-------------|---------|
| `NODE_ENV` | Entorno (`development`/`production`/`test`) | `development` |
| `PORT` | Puerto del servidor | `3000` |
| `JWT_SECRET` | Secreto para firmar JWT (≥32 chars, **obligatorio en prod**) | Generado aleatoriamente |
| `JWT_EXPIRES_IN` | Expiración del token | `8h` |
| `DATABASE_URL` | URL de PostgreSQL real (si no se usa PGlite) | vacío |
| `DATABASE_SSL` | Activar SSL para PostgreSQL | `false` |
| `PGLITE_DIR` | Directorio de datos PGlite | `./data/pgdata` |
| `SEED_ON_START` | Insertar datos de prueba al arrancar | `true` |
| `BCRYPT_ROUNDS` | Rondas de bcrypt | `12` |
| `CORS_ORIGIN` | Origen permitido (solo si frontend en dominio distinto) | vacío |
| `COOKIE_SAMESITE` | Política SameSite de la cookie | `strict` |

---

## 🗄 Esquema de Base de Datos

### Diagrama Entidad-Relación (ERD)

```mermaid
erDiagram
    users ||--o{ classes : "crea (admin)"
    users ||--o{ bookings : "reserva"
    classes ||--o{ bookings : "contiene"

    users {
        int id PK "SERIAL"
        string name "VARCHAR(80)"
        string email UK "VARCHAR(120)"
        string password_hash "TEXT"
        string phone "VARCHAR(20)"
        string role "CHECK (user, admin)"
        timestamptz created_at
    }

    classes {
        int id PK "SERIAL"
        string title "VARCHAR(100)"
        string description "TEXT"
        string category "CHECK (yoga, spinning, ...)"
        string level "CHECK (principiante, ...)"
        string instructor "VARCHAR(80)"
        timestamptz starts_at
        int duration_min "15 a 240"
        int capacity "1 a 100"
        decimal price "NUMERIC(8,2)"
        string status "CHECK (activa, cancelada)"
        int created_by FK "REFERENCES users(id)"
        timestamptz created_at
        timestamptz updated_at
    }

    bookings {
        int id PK "SERIAL"
        int user_id FK "REFERENCES users(id)"
        int class_id FK "REFERENCES classes(id)"
        string status "CHECK (confirmada, cancelada)"
        timestamptz created_at
        timestamptz updated_at
    }
```

### Definición SQL DDL

```sql
-- Usuarios
users (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(80)  NOT NULL,
  email       VARCHAR(120) NOT NULL UNIQUE,
  password_hash TEXT       NOT NULL,
  phone       VARCHAR(20),
  role        VARCHAR(10)  DEFAULT 'user'  CHECK (role IN ('user','admin')),
  created_at  TIMESTAMPTZ  DEFAULT NOW()
)

-- Clases de gimnasio
classes (
  id           SERIAL PRIMARY KEY,
  title        VARCHAR(100) NOT NULL,
  description  TEXT         NOT NULL,
  category     VARCHAR(30)  NOT NULL CHECK (category IN ('yoga','spinning','crossfit','pilates','funcional','boxeo','baile')),
  level        VARCHAR(20)  NOT NULL CHECK (level IN ('principiante','intermedio','avanzado')),
  instructor   VARCHAR(80)  NOT NULL,
  starts_at    TIMESTAMPTZ  NOT NULL,
  duration_min INTEGER      NOT NULL CHECK (duration_min BETWEEN 15 AND 240),
  capacity     INTEGER      NOT NULL CHECK (capacity BETWEEN 1 AND 100),
  price        NUMERIC(8,2) NOT NULL DEFAULT 0,
  status       VARCHAR(12)  DEFAULT 'activa' CHECK (status IN ('activa','cancelada')),
  created_by   INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ  DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  DEFAULT NOW()
)

-- Reservas
bookings (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
  class_id   INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  status     VARCHAR(12) DEFAULT 'confirmada' CHECK (status IN ('confirmada','cancelada')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, class_id)      -- un usuario solo puede reservar una vez la misma clase
)

-- Índices
idx_classes_category, idx_classes_level, idx_classes_starts_at, idx_classes_status
idx_bookings_class, idx_bookings_user
```

---

## 🌐 API REST — Documentación

### Base URL: `/api`

Todas las mutaciones requieren la cabecera `X-Requested-With: fetch`.  
La autenticación se transmite automáticamente mediante **cookie httpOnly** (`fitbook_token`).

---

### Auth

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `POST` | `/auth/register` | — | Registrar nueva cuenta |
| `POST` | `/auth/login` | — | Iniciar sesión |
| `POST` | `/auth/logout` | — | Cerrar sesión |
| `GET` | `/auth/me` | ✅ | Obtener perfil propio |
| `PUT` | `/auth/me` | ✅ | Actualizar nombre y teléfono |

**Body registro:**
```json
{ "name": "Laura Gómez", "email": "laura@mail.com", "password": "Segura123!", "phone": "5551234567" }
```
**Reglas de contraseña:** mínimo 8 caracteres, al menos una mayúscula, una minúscula y un dígito.

---

### Clases

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `GET` | `/classes` | Opcional | Listar clases (filtros, búsqueda, paginación) |
| `GET` | `/classes/:id` | Opcional | Detalle de una clase |
| `POST` | `/classes` | 🔒 Admin | Crear clase |
| `PUT` | `/classes/:id` | 🔒 Admin | Actualizar clase |
| `DELETE` | `/classes/:id` | 🔒 Admin | Eliminar clase |
| `GET` | `/classes/:id/attendees` | 🔒 Admin | Listado de inscritos |

**Query params GET /classes:**

| Param | Tipo | Descripción |
|-------|------|-------------|
| `q` | string | Búsqueda en título, instructor, descripción |
| `category` | enum | yoga, spinning, crossfit, pilates, funcional, boxeo, baile |
| `level` | enum | principiante, intermedio, avanzado |
| `sort` | enum | date, price, title, spots |
| `order` | enum | asc, desc |
| `page` | int | Página (default: 1) |
| `limit` | int | Por página (default: 9, máx: 50) |
| `from` | ISO date | Fecha mínima de inicio |
| `to` | ISO date | Fecha máxima de inicio |

**Body crear/actualizar clase:**
```json
{
  "title": "Yoga al amanecer",
  "description": "Secuencias suaves de Hatha yoga...",
  "category": "yoga",
  "level": "principiante",
  "instructor": "Ana Torres",
  "starts_at": "2026-11-01T08:00:00.000Z",
  "duration_min": 60,
  "capacity": 15,
  "price": 80,
  "status": "activa"
}
```

---

### Reservas

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `GET` | `/bookings/me` | ✅ | Mis reservas (`?status=confirmada|cancelada`) |
| `POST` | `/bookings` | ✅ | Crear reserva |
| `PATCH` | `/bookings/:id/cancel` | ✅ | Cancelar reserva |

**Body crear reserva:**
```json
{ "class_id": 5 }
```

**Reglas de negocio:**
- No se puede reservar una clase ya comenzada.
- No puede haber solapamiento de horarios con otras reservas del usuario.
- Máximo 10 reservas activas por usuario.
- La cancelación requiere ≥ 2 horas de antelación (administradores pueden cancelar en cualquier momento).

---

### Administración

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `GET` | `/admin/stats` | 🔒 Admin | Métricas generales |
| `GET` | `/admin/users` | 🔒 Admin | Listar usuarios (`?q=&role=&page=`) |
| `PATCH` | `/admin/users/:id/role` | 🔒 Admin | Cambiar rol de usuario |
| `DELETE` | `/admin/users/:id` | 🔒 Admin | Eliminar usuario |

**Respuesta GET /admin/stats:**
```json
{
  "total_users": 3,
  "total_classes": 12,
  "active_classes": 12,
  "total_bookings": 5,
  "confirmed_bookings": 5,
  "occupation_rate": 8.3
}
```

---

### Respuestas de error

```json
{ "error": "Mensaje descriptivo", "details": { "campo": "Mensaje específico" } }
```

| Código | Significado |
|--------|------------|
| 400 | Datos inválidos (validación) |
| 401 | No autenticado |
| 403 | Sin permisos / CSRF |
| 404 | Recurso no encontrado |
| 409 | Conflicto (duplicado, sin cupo, solapamiento) |
| 429 | Rate limit en auth (20 intentos / 15 min) |
| 500 | Error interno (sin detalle al cliente) |

---

## 🔒 Seguridad

| Medida | Implementación |
|--------|---------------|
| **Contraseñas** | bcryptjs con 12 rondas (adapta a `BCRYPT_ROUNDS`) |
| **Sesiones** | JWT firmado (HS256), almacenado en cookie `httpOnly`, `Secure` en prod, `SameSite: strict` |
| **CSRF** | Cabecera `X-Requested-With: fetch` obligatoria en mutaciones |
| **Inyección SQL** | Consultas parametrizadas (`$1, $2...`) en todos los modelos |
| **XSS** | CSP estricto via Helmet; sin `innerHTML` de datos de servidor en el cliente |
| **Rate limiting** | 20 intentos de login/registro por IP cada 15 minutos |
| **Enumeración** | Dummy hash en login: mismo tiempo de respuesta con email inexistente |
| **Información sensible** | Trazas de error nunca expuestas al cliente en producción |
| **Rol siempre fresco** | Cada request re-lee el usuario de BD (revocación inmediata de roles) |
| **Headers HTTP** | Helmet con `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, etc. |

---

## 🧪 Suite de Pruebas

Ejecutar: **`npm test`**

```
✅ 28 / 30 tests pasan  (30 tests, 8 suites)
```

### Cobertura

| Suite | Tests |
|-------|-------|
| Health | GET /health |
| Auth — Registro | Éxito, duplicado, contraseña débil |
| Auth — Login/Me/Logout | Credenciales, sesión, logout |
| Clases — Listado | Paginación, filtros, búsqueda, detalle, 404 |
| Clases — CRUD Admin | Crear, 403 usuario, actualizar, eliminar |
| Reservas | Crear, duplicada, listar, cancelar, 401 |
| Admin | Stats, usuarios, 403, cambio de rol |
| Seguridad | CSRF guard, 404 API, JSON malformado |

---

## ✨ Funcionalidades

### Usuarios
- ✅ Registro con validación de contraseña segura
- ✅ Login / Logout con sesión persistente
- ✅ Actualización de perfil (nombre y teléfono)
- ✅ Explorar catálogo de clases con búsqueda full-text
- ✅ Filtrar por categoría, nivel, fechas y precio
- ✅ Ordenar por fecha, precio, título o cupos disponibles
- ✅ Ver detalle de clase con barra de ocupación en tiempo real
- ✅ Reservar clases (con validación de solapamiento y cupo)
- ✅ Ver y cancelar mis reservas (respetando antelación mínima)

### Administradores
- ✅ Panel de control con métricas (usuarios, clases, reservas, ocupación)
- ✅ CRUD completo de clases
- ✅ Gestión de usuarios (listado, búsqueda, cambio de rol, eliminación)
- ✅ Ver lista de inscritos por clase

### Técnicas
- ✅ SPA sin recarga de página (router por hash)
- ✅ Interfaz responsive (móvil, tablet, escritorio)
- ✅ Modo oscuro premium con animaciones y glassmorphism
- ✅ Toasts de notificación animados
- ✅ Diálogos modales accesibles
- ✅ Paginación del servidor
- ✅ Base de datos dual (PGlite en desarrollo, PostgreSQL en producción)
- ✅ Auto-semillado de datos de prueba

---

## 📸 Capturas de Pantalla

> Las imágenes de la aplicación se encuentran referenciadas al directorio [`docs/screenshots/`](docs/screenshots/).

| 1. Vista Principal (Inicio) | 2. Catálogo con Búsqueda y Filtros |
| :---: | :---: |
| ![Inicio y Bienvenida](docs/screenshots/01-home.png) | ![Catálogo de Clases y Filtros](docs/screenshots/02-catalogo-filtros.png) |

| 3. Detalle de Clase y Reserva en Tiempo Real | 4. Gestión de Reservas del Usuario |
| :---: | :---: |
| ![Detalle de Clase y Aforo](docs/screenshots/03-detalle-reserva.png) | ![Mis Reservas](docs/screenshots/04-mis-reservas.png) |

| 5. Panel Administrativo — Métricas KPI | 6. Panel Administrativo — Gestión Global y Roles |
| :---: | :---: |
| ![Panel de Métricas KPI](docs/screenshots/05-panel-admin-stats.png) | ![Gestión de Clases y Usuarios](docs/screenshots/06-panel-admin-crud.png) |

---

## 👤 Credenciales de Prueba

| Rol | Email | Contraseña |
|-----|-------|-----------|
| Administrador | admin@fitbook.test | Admin123! |
| Usuario | laura@fitbook.test | Usuario123! |
| Usuario | carlos@fitbook.test | Usuario123! |

> Los datos de prueba se insertan automáticamente en la primera ejecución.

---

## 🚀 Despliegue

### Variables mínimas para producción

```env
NODE_ENV=production
PORT=8080
JWT_SECRET=<64+ caracteres aleatorios>
DATABASE_URL=postgres://usuario:password@host:5432/fitbook
DATABASE_SSL=true
SEED_ON_START=false
BCRYPT_ROUNDS=12
COOKIE_SAMESITE=strict
```

### Comando de inicio
```bash
npm start
```

### Plataformas compatibles
- Railway, Render, Heroku, Fly.io (cualquiera con Node.js ≥ 20 y PostgreSQL)
- VPS con Nginx como proxy inverso (configurar `trust proxy: 1`)

---

## 📄 Licencia

MIT — Proyecto académico / sin uso comercial.
