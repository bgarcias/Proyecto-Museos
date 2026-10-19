# Guía para conectar el proyecto

Hoy el prototipo corre con datos en memoria. Esta guía explica cómo conectarlo a PostgreSQL en Supabase con Prisma 7, a Supabase Auth, a Supabase Storage y a Vercel, cambiando solo la capa de datos (`lib/data`) y la de sesión (`lib/auth/session.ts`). No se escriben llaves, contraseñas ni direcciones de conexión en este documento: los valores van solo en `.env.local` y en las variables de Vercel.

## 1. Variables de entorno

Los nombres están en `.env.example`. Los valores van solo en `.env.local`, que nunca se sube al repositorio. Todas se leen desde `lib/config/env.ts`.

| Variable | Para qué sirve | Tipo | Dónde se obtiene |
|-|-|-|-|
| `DATA_SOURCE` | Elige la implementación de datos: `memoria` o `prisma` | Pública | Se escribe a mano |
| `DATABASE_URL` | Conexión con pool (con el parámetro `pgbouncer=true`), para la aplicación | Secreta | Supabase, botón Connect del proyecto |
| `DIRECT_URL` | Conexión directa o session pooler, solo para migraciones | Secreta | Supabase, botón Connect del proyecto |
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto de Supabase | Pública | Supabase, Project Settings, API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave anónima | Pública | Supabase, Project Settings, API |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave de servicio, para crear usuarios y subir imágenes | Secreta | Supabase, Project Settings, API |

Si falta `DATABASE_URL` o `DIRECT_URL`, la aplicación o las migraciones fallan con un mensaje claro en español, solo cuando se usa la función que la necesita. La clave de servicio solo se usa en el servidor, nunca en componentes de cliente.

## 2. Esquema de 12 tablas

El esquema está en `prisma/schema.prisma`, solo como archivo. Contiene los modelos, sin los bloques generator y datasource, que se agregan al instalar Prisma (paso 4 de la sección 5). Los nombres de tabla y de columna están en snake_case, con `@map` y `@@map`.

| Tabla | Modelo | Claves y restricciones declaradas | Notas |
|-|-|-|-|
| `organizacion` | `Organizacion` | id uuid | Agrupa usuarios, museos y categorías |
| `usuario` | `Usuario` | id uuid sin valor por defecto, `email` único | El id es el de la cuenta de Supabase Auth. No guarda contraseña. Lleva `organizacion_id`, `rol` y `activo` |
| `museo` | `Museo` | id uuid, único (`organizacion_id`, `prefijo`) | `organizacion_id`, `prefijo` (lo calcula la aplicación al registrar el museo y no cambia nunca), `tipo` (tipo de colección: texto o enum, ver más abajo), `direccion` opcional y `activo` |
| `usuario_museo` | `UsuarioMuseo` | clave compuesta (`usuario_id`, `museo_id`) | Museos asignados a cada usuario |
| `categoria` | `Categoria` | único (`organizacion_id`, `nombre`) | Las categorías son datos de cada organización |
| `pieza` | `Pieza` | único (`museo_id`, `codigo`) y único (`museo_id`, `codigo_anterior`) | `codigo` lo asigna la aplicación al guardar (prefijo del museo, guion y correlativo) y no cambia nunca, `codigo_anterior` opcional, `estado_conservacion` y `disponibilidad` como texto, `imagen_url` opcional, `fecha_registro` con `now()` |
| `historial_cambio` | `HistorialCambio` | id uuid | `campo_modificado`, `valor_anterior` y `valor_nuevo` como texto, `fecha` con `now()` |
| `exposicion` | `Exposicion` | id uuid | `fecha_inicio` y `fecha_fin` de tipo fecha, `cancelada` booleano |
| `pieza_exposicion` | `PiezaExposicion` | clave compuesta (`pieza_id`, `exposicion_id`) | Piezas de cada exposición |
| `prestamo` | `Prestamo` | id uuid | `valor_asegurado` decimal con 2 decimales, fechas de tipo fecha, `fecha_devolucion_real` y `estado_conservacion_devolucion` opcionales |
| `inventario` | `Inventario` | id uuid | `usuario_id` (quien inició el inventario), `usuario_cierre_id` opcional (quien lo cerró, vacío mientras está en curso, con relación al usuario), `fecha_inicio` y `fecha_cierre` con fecha y hora, `estado` como texto. Las dos relaciones con `usuario` llevan nombre (`InventarioIniciadoPor` e `InventarioCerradoPor`) |
| `detalle_inventario` | `DetalleInventario` | único (`inventario_id`, `pieza_id`) | `resultado` como texto y `observacion` opcional |

Todos los ids son uuid. Salvo el de `usuario`, llevan `@default(dbgenerated("gen_random_uuid()"))`.

En el prototipo, los valores fijos (rol, tipo de colección del museo, estado de conservación, disponibilidad, estado de inventario y resultado de inventario) se guardan como texto en minúscula, y la interfaz muestra su etiqueta. Esos valores están en `lib/constantes.ts`. El tipo de colección del museo (`museo.tipo`) tiene cinco valores: `arqueologia`, `historico`, `arte`, `ciencias_naturales` y `otro`.

**Tipos de dato por definir.** Al conectar se recrearán las 12 tablas con el código final del proyecto, y antes hay que definir el tipo de dato de cada columna. Al crear la tabla `prestamo`, `valor_asegurado` debe ser decimal con 2 decimales y capacidad para 100.000.000 (el esquema declara `Decimal(12, 2)`, que admite hasta 10 dígitos enteros), y hay que revisar que las columnas de texto `institucion_destino`, `responsable_receptor`, `numero_convenio` y `numero_poliza` admitan los máximos de 100, 100, 40 y 40 caracteres que valida hoy el controlador (el esquema las declara como texto sin longitud). En especial, `museo.tipo` puede ser texto o un enum de la base con los cinco valores nuevos. Con texto, una restricción `CHECK` es opcional. Con enum, agregar un tipo de colección exige una migración. Lo mismo vale para las demás columnas con valores fijos. La columna nueva `inventario.usuario_cierre_id` (uuid opcional, con llave foránea a `usuario`) se incluye al recrear las 12 tablas: el esquema ya la declara, pero solo está editado y no se ha migrado.

## 3. Reglas que Prisma no puede expresar

Estas reglas se validan hoy en los controladores. Prisma no las puede declarar en el esquema, así que se pueden reforzar en la base con SQL, como índices únicos parciales o restricciones, escritas a mano en una migración. Es una recomendación, no algo ya implementado.

| Regla | Dónde se valida hoy |
|-|-|
| Una pieza solo puede tener un préstamo abierto (con `fecha_devolucion_real` nula). Está como comentario en el modelo `Prestamo` | `CC_Prestamo`, por la disponibilidad `disponible` de la pieza |
| Solo puede haber un inventario en curso por museo | `CC_Inventario.crearInventario` |
| El inventario guarda quién lo inició y, al cerrarlo, quién lo cerró (la persona de la sesión). Puede cerrarlo cualquier persona con acceso al museo del inventario, y no hay una restricción de cierre por persona | `CC_Inventario.cerrarInventario` |
| El nombre de un museo es único dentro de la organización | `CC_Museo` |
| El prefijo de un museo se calcula con la regla de `lib/codigos.ts` (iniciales de las palabras significativas, tres letras si hay una sola, máximo 5, número al final si se repite) y no cambia nunca. La unicidad por organización la declara el esquema, pero el cálculo y la inmutabilidad no | `lib/data` (`crearMuseo`), con `lib/codigos.ts` |
| El código de una pieza es el prefijo del museo, un guion y un correlativo de al menos 3 dígitos: el mayor del museo más uno. La unicidad la declara el esquema, pero el cálculo y la inmutabilidad no | `lib/data` (`crearPieza` y `crearPiezas`), con `lib/codigos.ts` |
| La fecha de fin de una exposición es posterior a la de inicio | `CC_Exposicion` |
| Una exposición tiene al menos una pieza, y ninguna de sus dos fechas supera los 3 años desde hoy. Hoy se validan en el controlador (con `LIMITE_ANIOS_FECHAS` y `fechaLimite()`) y la vista solo las refleja con un aviso y el atributo `max` | `CC_Exposicion` |
| Las piezas de una exposición pertenecen al museo sede | `CC_Exposicion` |
| Un préstamo tiene una sola pieza (`prestamo.pieza_id`, sin tabla intermedia). Su fecha de salida no es posterior a hoy, su devolución prevista no supera los 3 años desde hoy (`LIMITE_ANIOS_FECHAS` y `fechaLimite()`), su valor asegurado es un número mayor que cero con hasta 2 decimales y no supera 100.000.000 (`validarValorAsegurado`), y sus textos respetan los máximos de longitud (100 y 40 caracteres). Hoy se validan en el controlador, y la vista solo las refleja con avisos y atributos `max`, `min` y `maxLength`. Si se quisiera reforzar el valor en la base, la columna `valor_asegurado` ya es decimal con 2 decimales | `CC_Prestamo` |
| Una pieza no está en dos exposiciones no canceladas con fechas cruzadas, ni en una exposición con un préstamo abierto cuyas fechas se crucen | `CC_Exposicion` y `CC_Prestamo` |
| Cada usuario solo tiene asignados museos de su organización, y todas las lecturas y escrituras se filtran por la organización de la persona en sesión | `lib/permisos.ts` y `lib/controllers/utilidades.ts` |
| Los reportes de piezas, de exposiciones y de préstamos parten solo de los datos visibles de la persona (`piezasVisibles`, `exposicionesVisibles` y `prestamosVisibles`), validan el acceso al museo elegido y recalculan el reporte en el servidor al exportar. Al conectar la base conviene que el filtro por museo y por fecha se haga en la consulta | `CC_Reporte` y `lib/controllers/utilidades.ts` |
| La disponibilidad y el estado de conservación de una pieza reflejan los préstamos y los inventarios, y cada cambio queda en el historial | `CC_Prestamo`, `CC_Inventario` y `CC_Pieza` |

## 4. Seguridad por fila (RLS)

Plan: activar la seguridad por fila (Row Level Security) en las 12 tablas y no crear políticas. Sin políticas, el acceso directo a las tablas con la clave anónima o con una sesión de usuario a través de la API de Supabase queda bloqueado.

La aplicación accede a la base solo desde el servidor, con Prisma y las cadenas de conexión, por lo que las políticas no son necesarias para que funcione. Hay que verificar al conectar que el rol de la cadena de conexión que usa Prisma pueda leer y escribir con la seguridad por fila activada, por ejemplo si su rol omite esa seguridad. Si no la omite, habrá que crear políticas para ese rol.

El aislamiento entre organizaciones y entre museos no depende de la base: lo aplican los controladores. Si más adelante se quisiera reforzar en la base, habría que escribir las políticas por organización y por museo asignado.

## 5. Orden para conectar la base de datos

1. Crear el proyecto en Supabase.
2. Llenar `.env.local` con los valores de la sección 1.
3. Instalar Prisma con versiones exactas:

   ```
   npm install -E prisma@7.10.0 @prisma/client@7.10.0 @prisma/adapter-pg@7.10.0
   ```

   Importante: el comando `npm install prisma` sin versión instala una versión candidata, no la estable. Por eso siempre se indica la versión.

4. Agregar al inicio de `prisma/schema.prisma` los bloques generator y datasource. El datasource lleva solo el provider, sin `url`:

   ```prisma
   generator client {
     provider = "prisma-client"
     output   = "../lib/data/prisma/generado"
   }

   datasource db {
     provider = "postgresql"
   }
   ```

5. Crear en la raíz el archivo `prisma.config.ts`, que lee `DIRECT_URL` para las migraciones:

   ```ts
   import { defineConfig, env } from "prisma/config";

   try {
     process.loadEnvFile(".env.local");
   } catch {
     // sin .env.local, se usan las variables del entorno
   }

   export default defineConfig({
     schema: "prisma/schema.prisma",
     datasource: {
       url: env("DIRECT_URL"),
     },
   });
   ```

6. Crear las tablas con la migración (pide un nombre de forma interactiva) y generar el cliente. Se recrean las 12 tablas con el código final del proyecto, una vez definidos los tipos de dato de la sección 2. Si en la base quedan tablas de una versión anterior, hay que eliminarlas o contrastarlas antes de migrar, para no duplicar ni dejar columnas desactualizadas.

   ```
   npx prisma migrate dev
   npx prisma generate
   ```

7. Agregar a una migración las restricciones de la sección 3 que se quieran reforzar, y activar la seguridad por fila de la sección 4.
8. Implementar `lib/data/prisma` cumpliendo `lib/data/contratos.ts`. El cliente se crea con el adaptador `@prisma/adapter-pg` y la variable `DATABASE_URL` (la de pool, con `pgbouncer=true`), leída desde `lib/config/env.ts`:

   ```ts
   // lib/data/prisma/cliente.ts
   import { PrismaPg } from "@prisma/adapter-pg";
   import { obtenerDatabaseUrl } from "../../config/env";
   import { PrismaClient } from "./generado/client";

   const almacenGlobal = globalThis as unknown as { __prisma?: PrismaClient };

   export function obtenerPrisma(): PrismaClient {
     if (!almacenGlobal.__prisma) {
       const adaptador = new PrismaPg({ connectionString: obtenerDatabaseUrl() });
       almacenGlobal.__prisma = new PrismaClient({ adapter: adaptador });
     }
     return almacenGlobal.__prisma;
   }
   ```

   Orden sugerido para implementar los grupos del contrato, de lo más básico a lo más dependiente:

   | Paso | Grupo del contrato | Operaciones |
   |-|-|-|
   | 1 | Organización, museos y categorías | `obtenerOrganizacion`, `listarMuseos`, `obtenerMuseo`, `crearMuseo` (calcula el prefijo), `actualizarMuseo` (sin cambiar el prefijo), `cambiarActivoMuseo`, `listarCategorias` |
   | 2 | Usuarios | `listarUsuarios`, `obtenerUsuario`, `obtenerUsuarioPorEmail`, `crearUsuario`, `actualizarUsuario`, `cambiarActivoUsuario`, `actualizarContrasena` (esta última desaparece con Supabase Auth) |
   | 3 | Piezas e historial | `listarPiezas`, `obtenerPieza`, `buscarPiezaPorCodigoAnterior`, `crearPieza` (asigna el código), `crearPiezas` (asigna los códigos en orden), `actualizarPieza` (sin cambiar el código), `actualizarEstadoPieza`, `actualizarDisponibilidadPieza`, `listarHistorialPieza`, `registrarCambio` |
   | 4 | Exposiciones | `listarExposiciones`, `obtenerExposicion`, `crearExposicion`, `actualizarExposicion` (datos y piezas), `cancelarExposicion` |
   | 5 | Préstamos | `listarPrestamos`, `obtenerPrestamo`, `crearPrestamo`, `registrarDevolucion` |
   | 6 | Inventarios | `listarInventarios`, `obtenerInventario`, `crearInventario`, `marcarResultadoInventario`, `listarDetalleInventario`, `cerrarInventario` |
   | 7 | Demostración | `restablecerDatos` |

   Las operaciones que crean o actualizan varias filas a la vez, como `crearPiezas` o `actualizarExposicion` con sus piezas, deberían ejecutarse en una transacción.

   El correlativo del código se calcula con el mayor número del museo más uno, dentro de la misma operación que inserta la pieza. Al conectar la base de datos, la restricción de unicidad de (`museo_id`, `codigo`) debe proteger el caso de dos registros simultáneos: si dos inserciones calculan el mismo número, una falla por la restricción y debe reintentarse recalculando el correlativo. En la importación, el correlativo de todas las piezas del archivo debe asignarse dentro de la misma transacción, en el orden de las filas. Lo mismo vale para el prefijo de un museo nuevo y su unicidad por organización.

9. Activar la implementación en `lib/data/index.ts` (importar `lib/data/prisma` cuando `DATA_SOURCE` sea `prisma`), cambiar `DATA_SOURCE` a `prisma` en `.env.local` y cargar en la base los datos iniciales equivalentes a la semilla de `lib/data/memoria/semilla.ts`. Hoy ningún controlador usa `obtenerOrganizacion`, `obtenerExposicion`, `obtenerPrestamo` ni `obtenerInventario`, pero forman parte del contrato.

Otros comandos útiles de Prisma, todos sin banderas de doble guion:

```
npx prisma studio
npx prisma migrate deploy
```

## 6. Orden para el login real (Supabase Auth)

1. Instalar los paquetes de Supabase con versiones exactas:

   ```
   npm install -E @supabase/supabase-js@2.117.3 @supabase/ssr@0.12.7
   ```

2. Reemplazar la implementación de `lib/auth/session.ts` manteniendo las mismas funciones: `obtenerSesion`, `iniciarSesion`, `cerrarSesion`, `exigirSesion` y `exigirAdministrador`. Los controladores y las pantallas no cambian.
3. El id de la tabla `usuario` es el id de la cuenta de Supabase Auth, por lo que no hay un campo de enlace aparte. Al crear un usuario, el servidor crea primero la cuenta en Supabase Auth con la clave de servicio y luego la fila de `usuario` con ese mismo id y sus museos asignados.
4. `obtenerSesion` debe seguir devolviendo un usuario sin sesión cuando la cuenta está desactivada (`activo` falso). Al desactivar un usuario también habrá que impedir el acceso de su cuenta en Supabase Auth.
5. Desaparecen el campo `contrasena`, el campo `debeCambiarContrasena`, la contraseña temporal de 10 caracteres que hoy se muestra una sola vez (con su botón Copiar), la pantalla `/cambiar-contrasena` en su forma actual y la acción `actualizarContrasena`. La gestión de contraseñas pasa a Supabase Auth. Hay que decidir cómo se entrega la contraseña inicial o el enlace de acceso a cada usuario nuevo. También hay que decidir si las reglas de longitud de `lib/validaciones.ts` (mínimo 10 y máximo 15 caracteres, hoy compartidas por el cambio de contraseña y la nueva contraseña) se mantienen o se reemplazan por las de la política de Auth.
6. La cookie `sesion_demo` desaparece: la sesión la maneja `@supabase/ssr`.
7. La recuperación de contraseña por correo se implementa con Supabase Auth y reemplaza las dos pantallas actuales, que hoy son solo interfaz (`/recuperar-contrasena` con las acciones `cargarRecuperacion` y `solicitarRecuperacion`, y `/restablecer-contrasena` con `cargarRestablecimiento` y `definirNuevaContrasena`). El correo lo envía Supabase Auth y la nueva contraseña la define Auth, no la capa de datos. Las rutas de acceso (`/login` y las dos de recuperación) deben seguir siendo públicas.

## 7. Imágenes de pieza (Supabase Storage)

Hoy la imagen de una pieza se guarda como data URL (PNG o JPG de máximo 1 MB) en el campo `imagenUrl`, solo mientras el prototipo use memoria. Al conectar:

1. Crear en Supabase Storage un bucket público llamado `piezas`.
2. Subir la imagen desde el servidor con la clave de servicio, al registrar o editar una pieza, y guardar su URL pública en `imagen_url`. Se mantienen las reglas de PNG o JPG y 1 MB.
3. Una pieza sin imagen guarda `imagen_url` vacío. El marcador `public/piezas/sin-imagen.svg` solo se muestra en la interfaz y no pasa por Storage.
4. La ficha técnica en PDF solo incrusta imágenes que sean data URL PNG o JPG. Con URLs de Storage habrá que descargar la imagen en el servidor antes de generar el PDF. Hay que verificarlo al conectar.

## 8. Despliegue en Vercel

1. Importar el repositorio en Vercel y cargar las mismas variables de la sección 1 en Project Settings, Environment Variables.
2. Verificar el límite de tamaño del cuerpo de las solicitudes en las funciones de Vercel. El prototipo acepta archivos Excel de hasta 5 MB y está configurado en `next.config.ts` con 6 MB para el cuerpo de las Server Actions, y ese límite podría ser menor en Vercel.
3. La generación de PDF y Excel y la lectura de Excel corren en el servidor, en rutas de servidor y acciones, y usan `@react-pdf/renderer` y `exceljs`. Eso incluye la plantilla de importación, la ficha técnica y los cuatro reportes: categoría y estado, piezas, exposiciones y préstamos (`/reportes/<reporte>/pdf` y `/reportes/<reporte>/excel`). Los PDF y los Excel requieren el entorno Node: hay que confirmar que corren en él y no en el de borde, y revisar los límites de tiempo y de memoria de las funciones, sobre todo en los reportes con muchas filas.
4. Las respuestas de PDF (los cuatro reportes y la ficha técnica) son inline: llevan `Content-Type: application/pdf` y `Content-Disposition` inline con el nombre del archivo, y se muestran en el visor del navegador, donde el botón de descarga conserva ese nombre. Los botones de PDF abren una pestaña nueva. Excel y la plantilla de importación siguen como descarga. Hay que verificar al desplegar que Vercel conserva esos encabezados.
5. La zona horaria va fija en el código: `ZONA_HORARIA` (America/Lima) en `lib/constantes.ts`, que usan todas las funciones de `lib/fechas.ts`. No depende de la zona del entorno de Vercel ni de una variable `TZ`, así que no hay que configurarla en Project Settings. Las marcas con hora se guardan en UTC y el día y la hora que se calculan o se muestran se convierten a America/Lima. Las fechas de solo día no se desplazan. Con una base de datos, `pieza.fecha_registro`, `historial_cambio.fecha`, `inventario.fecha_inicio` y `inventario.fecha_cierre` deben guardarse como instantes en UTC, y las fechas de exposición y de préstamo como fecha sin hora.

## 9. Advertencias

- Nunca subir `.env.local` al repositorio.
- La clave secreta solo se usa en el servidor.
- El plan gratuito de Supabase pausa el proyecto tras 7 días sin actividad. Se restaura desde su panel.
- El plan gratuito de Vercel es solo para uso personal no comercial.
- Nada de lo descrito en esta guía se ha conectado ni probado: el prototipo corre solo con datos en memoria.
