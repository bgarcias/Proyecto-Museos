# Proyecto Museos

Aplicación web para gestionar museos, piezas, exposiciones, préstamos e inventarios. Next.js, Prisma y Supabase (PostgreSQL, Auth y Storage).

## Requisitos

- Node.js 24.x
- Un proyecto de Supabase (PostgreSQL, Auth y Storage)
- Conexión a internet: la compilación descarga las tipografías de Google Fonts

## Instalación

Las variables de entorno van antes de instalar: la instalación ejecuta `prisma generate` (`postinstall`) y necesita `DIRECT_URL`.

1. Copiar `.env.example` a `.env.local` y completar los valores (ver la tabla siguiente).
2. Instalar las dependencias:

   ```
   npm install
   ```

## Variables de entorno

| Variable | Para qué sirve | Tipo |
|-|-|-|
| `DATABASE_URL` | Conexión con pool que usa la aplicación (en Supabase, el pooler en modo transacción) | Secreta |
| `DIRECT_URL` | Conexión directa o session pooler, para las herramientas de Prisma | Secreta |
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto de Supabase | Pública |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave anónima de Supabase | Pública |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave de servicio: crea cuentas y sube imágenes desde el servidor. Nunca en el cliente | Secreta |
| `CARGA_ADMIN_EMAIL` | Correo del administrador de la carga inicial | Secreta |
| `CARGA_COLABORADOR_EMAIL` | Correo del colaborador de la carga inicial | Secreta |
| `CARGA_CONTRASENA` | Contraseña de las cuentas de la carga inicial (10 a 15 caracteres) | Secreta |
| `MOSTRAR_DATOS_DEMO` | Con `true`, el login muestra las cuentas de demostración | Solo servidor |

Las URL y las claves están en el panel de Supabase (Connect y Project Settings, API). `.env.local` nunca se sube al repositorio.

## Base de datos y Prisma

La estructura de la base está en `prisma/sql/`; no se usan `prisma migrate`, `db push` ni `db pull`.

1. En el editor SQL de Supabase, ejecutar en orden `prisma/sql/01_crear_tablas.sql` y `prisma/sql/02_reglas_y_seguridad.sql`. El primero borra y recrea las 12 tablas: úsalo solo en una base que se pueda perder.
2. En Supabase (Authentication), agregar la URL de redirección `<dirección-de-la-app>/restablecer-contrasena` y fijar en 10 la longitud mínima de contraseña.
3. En Supabase Storage, crear un bucket público llamado `piezas`.
4. Opcional, datos de demostración:

   ```
   npm run db:simular   # revisa los datos sin conectarse
   npm run db:cargar    # crea las cuentas de Auth y llena las tablas (pide escribir CARGAR)
   ```

Otros comandos: `npm run db:generar` (genera el cliente de Prisma) y `npm run db:validar` (valida `prisma/schema.prisma`).

## Correr en local

```
npm run dev
```

Abrir http://localhost:3000. Sin sesión, redirige a `/login`.

Para comprobar la compilación y servirla:

```
npm run build
npm run start
```

## Despliegue en Vercel

1. Importar el repositorio en Vercel (cada subida a `main` genera un despliegue).
2. Definir las variables de entorno del proyecto. `DIRECT_URL` es necesaria en el build porque `postinstall` genera el cliente de Prisma. Las `NEXT_PUBLIC_` se incrustan al compilar.
3. Desplegar.
4. En Settings, Function Regions, elegir la región más cercana a la base de Supabase (por ejemplo Portland `pdx1` para West US) y redesplegar.
5. Agregar la URL publicada, con `/restablecer-contrasena`, a las URLs de redirección de Supabase Auth.
6. Para ocultar las cuentas de demostración en producción, poner `MOSTRAR_DATOS_DEMO=false` y redesplegar.
