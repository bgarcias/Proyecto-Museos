# Informe de estructura del repositorio

Se excluyen `node_modules` y `.next`. Los números salen de contar el código real: 31 páginas, 10 rutas de servidor, 27 carpetas CI_, 9 controladores, 121 archivos .ts y .tsx, y 45 archivos CSS.

## 1. Árbol

```
Proyecto-Museos/
  .env.example, .env.local, .gitignore
  package.json, package-lock.json, tsconfig.json, tsconfig.tsbuildinfo, next-env.d.ts, next.config.ts
  MAPA.md, README.md, AJUSTES_CODIGO_V2.md
  docs/
    CONEXION.md
    ESTRUCTURA_REPOSITORIO.md
  prisma/
    schema.prisma
  public/
    piezas/
      sin-imagen.svg
  app/
    layout.tsx, globals.css, page.tsx (inicio), not-found.tsx, not-found.module.css
    login, recuperar-contrasena, restablecer-contrasena, cambiar-contrasena   (cada una: page.tsx)
    usuarios (page, nuevo, [id])
    museos (page, nuevo, [id])
    piezas (page, nueva, [id], [id]/editar, [id]/estado, [id]/historial, [id]/ficha/route.ts,
            importar, importar/plantilla/route.ts)
    exposiciones (page, nueva, [id]/editar)
    prestamos (page, nuevo, devolucion)
    inventarios (page, [id])
    reportes (page; categoria-estado, piezas, exposiciones, prestamos: cada uno con page + pdf/route.ts + excel/route.ts)
  components/
    CI_* (27 carpetas, cada una con su .tsx y su .module.css; CI_Inicio suma BotonRestablecer.tsx)
    ui/ (34 archivos: Boton, BotonCopiar, BotonesReporte, BuscadorExposiciones, BuscadorPiezas, Campo,
         CampoContrasena, Celda, ContenedorAlertas, DialogoConfirmacion, Insignia, Mensaje, Menu, Miniatura,
         PantallaAcceso, Tabla, Ventana, alertas.ts, más sus CSS, incluidos FiltrosReporte y TablaReporte)
  lib/
    controllers/  CC_Exposicion, CC_Historial, CC_Importacion, CC_Inventario, CC_Museo, CC_Pieza,
                  CC_Prestamo, CC_Reporte, CC_Usuario, utilidades.ts
    data/         contratos.ts, index.ts, memoria/ (index.ts, semilla.ts), prisma/README.md
    auth/         session.ts
    config/       env.ts
    17 archivos sueltos: codigos, constantes, exportacionReporte, exportacionTabla, fechas, ficha,
      formatos, importacion, limitesImportacion, navegacion, permisos, reporteParametros,
      respuestaPdf, resultadoBusqueda, tipos, validaciones (.ts o .tsx)
```

## 2. Origen de cada elemento

| Elemento | Origen | Para qué sirve |
|-|-|-|
| `package.json`, `package-lock.json` | Herramienta (npm) | Dependencias y comandos |
| `tsconfig.json`, `next-env.d.ts`, `tsconfig.tsbuildinfo` | Herramienta (TypeScript y Next). El `.tsbuildinfo` es caché y ya está en `.gitignore` | Configuración y tipos de TypeScript |
| `next.config.ts` | Nombre exigido por Next.js | Configuración de Next, incluido el límite de las Server Actions |
| `.gitignore`, `.env.example`, `.env.local` | Herramienta (create-next-app) y convención de Next | Exclusiones de Git y variables de entorno |
| `prisma/schema.prisma` | Herramienta (Prisma), nombre convencional | Esquema futuro de 12 tablas, solo como archivo |
| `public/` | Nombre exigido por Next.js | Archivos estáticos servidos en `/` |
| `app/` | Nombre exigido por Next.js | Rutas |
| `layout.tsx`, `page.tsx`, `route.ts`, `not-found.tsx` | Nombre exigido por Next.js | Layout raíz, pantallas, rutas de servidor y página 404 |
| `app/globals.css` | Nombre libre. Next solo lo carga porque `layout.tsx` lo importa | Variables y base de estilos |
| `not-found.module.css` | Decisión del proyecto | Estilos de la 404 |
| Carpetas de `app/` (login, piezas, reportes, etc.) | Exigido: son direcciones web | Cada carpeta es una URL |
| `components/`, `components/ui/` | Decisión libre | Vistas y piezas compartidas |
| `CI_*` | Decisión libre, pero el nombre aparece en el informe | Una vista por pantalla |
| `lib/`, `lib/data/`, `lib/auth/`, `lib/config/` | Decisión libre | Lógica, datos, sesión y entorno |
| `lib/controllers/CC_*` | Decisión libre, pero el nombre aparece en el informe | Una clase de control por caso de uso |
| `docs/`, `MAPA.md`, `README.md`, `AJUSTES_CODIGO_V2.md` | Decisión libre | Documentación |

**Nombres que son direcciones web** (no se renombran sin cambiar la URL): `login`, `recuperar-contrasena`, `restablecer-contrasena`, `cambiar-contrasena`, `usuarios`, `museos`, `piezas` con `nueva`, `importar`, `editar`, `estado`, `historial` y `ficha`, `exposiciones`, `prestamos` con `devolucion`, `inventarios`, `reportes` con `categoria-estado`, `pdf` y `excel`, `plantilla`, `[id]` y `nuevo` o `nueva`.

## 3. Dónde vive cada elemento

| Elemento | Vista | CSS | Controlador o lógica |
|-|-|-|-|
| Login | `components/CI_Login/CI_Login.tsx` (usa `ui/PantallaAcceso`) | `CI_Login.module.css` y `ui/PantallaAcceso.module.css` | `CC_Usuario.ts` (`ingresar`) y `lib/auth/session.ts` |
| Menú de navegación | `components/ui/Menu.tsx` | `ui/Menu.module.css` | Opciones en `lib/navegacion.ts`. El layout carga el usuario con `CC_Usuario` |
| Inicio | `components/CI_Inicio/CI_Inicio.tsx` | `CI_Inicio.module.css` | `CC_Usuario.cargarInicio`, tarjetas en `lib/navegacion.ts` |
| Catálogo de piezas | `CI_Catalogo_Piezas.tsx`, más `ui/BuscadorPiezas.tsx` | `CI_Catalogo_Piezas.module.css` y `ui/Buscador.module.css` | `CC_Pieza.ts` |
| Formulario de pieza | `CI_Formulario_Pieza.tsx` | `CI_Formulario_Pieza.module.css` | `CC_Pieza.ts`, `lib/codigos.ts` |
| Reporte por categoría y estado | `CI_Reporte_Categoria_Estado.tsx` | su `.module.css` | `CC_Reporte.ts`, `lib/exportacionReporte.tsx` |
| Reportes de piezas, exposiciones y préstamos | `CI_Reporte_Piezas`, `_Exposiciones`, `_Prestamos` | su `.module.css`, más `ui/FiltrosReporte`, `ui/TablaReporte` y `ui/BotonesReporte` | `CC_Reporte.ts`, `lib/exportacionTabla.tsx`, `lib/reporteParametros.ts` |
| Página 404 | `app/not-found.tsx` | `app/not-found.module.css` | Sin controlador. Textos en `lib/constantes.ts` |
| Estilos globales | `app/layout.tsx` los importa | `app/globals.css` | No aplica |
| Valores y mensajes fijos | No aplica | No aplica | `lib/constantes.ts`. Los mensajes de error de cada caso están dentro de cada `CC_*` |
| Validaciones | No aplica | No aplica | `lib/validaciones.ts` (compartidas) y cada `CC_*` |
| Fechas | No aplica | No aplica | `lib/fechas.ts` |
| Sesión | No aplica | No aplica | `lib/auth/session.ts` |
| Capa de datos | No aplica | No aplica | `lib/data/contratos.ts`, `index.ts`, `memoria/` |

## 4. Lo que dificulta encontrar un archivo

**Diez archivos más grandes (líneas)**

| Archivo | Líneas |
|-|-|
| `lib/controllers/CC_Reporte.ts` | 490 |
| `lib/data/memoria/semilla.ts` | 396 |
| `lib/controllers/CC_Pieza.ts` | 322 |
| `lib/controllers/CC_Usuario.ts` | 298 |
| `lib/tipos.ts` | 280 |
| `components/CI_Realizar_Inventario/CI_Realizar_Inventario.tsx` | 275 |
| `lib/controllers/CC_Exposicion.ts` | 274 |
| `components/ui/BuscadorPiezas.tsx` | 273 |
| `lib/importacion.ts` | 258 |
| `components/CI_Importar_Piezas/CI_Importar_Piezas.tsx` | 238 |

Ninguno es enorme. El que más mezcla responsabilidades es `CC_Reporte.ts`, que reúne cuatro reportes en un archivo. `CC_Usuario.ts` también mezcla sesión, recuperación de contraseña y administración de usuarios.

**Problemas concretos**

- **`lib/` suelto:** tiene 17 archivos sin agrupar. El PDF y el Excel (`exportacionReporte`, `exportacionTabla`, `respuestaPdf`, `ficha`) y la importación (`importacion`, `limitesImportacion`) se mezclan con tipos y constantes.
- **Nombres que no dicen su función:**
  - `lib/controllers/utilidades.ts` en realidad es la visibilidad por museo (`museosVisibles`, `piezasVisibles` y similares), más `coincideTexto`.
  - `lib/formatos.ts` tiene una sola función (`formatearMonto`).
  - `lib/permisos.ts` y las funciones de acceso de `utilidades.ts` se parecen, y los dos tienen una sola función de uso real.
  - `CI_Menu_Exposiciones` y las demás `CI_Menu_*` son las pantallas de lista de cada módulo, pero el nombre sugiere el menú de navegación, que en realidad es `ui/Menu.tsx`.
- **`ui/` con 34 archivos** de naturaleza distinta: botones, campos, buscadores, tablas, ventanas, alertas y piezas de reportes. Los CSS de reportes (`FiltrosReporte.module.css`, `TablaReporte.module.css`) no tienen `.tsx` propio con ese nombre.
- **Piezas poco obvias:** `BotonRestablecer.tsx` vive dentro de `CI_Inicio`, y `alertas.ts` es una utilidad dentro de `ui/`.
- **Sin uso o casi:**
  - `lib/data/prisma/` solo tiene un README.
  - La propiedad `ancha` de `Ventana` no se usa.
  - La clase `.medio` de `FiltrosReporte.module.css` no se usa.
  - El componente `Filtros` de `Campo.tsx` solo lo usa un reporte.
  - Cuatro operaciones del contrato de datos no se llaman (`obtenerOrganizacion`, `obtenerExposicion`, `obtenerPrestamo`, `obtenerInventario`).
  - `tsconfig.tsbuildinfo` es caché que no se versiona.

## 5. Cómo se importan los archivos y qué costaría mover cada carpeta

El alias `@/*` apunta a la raíz del proyecto (`tsconfig.json`). Se usa de dos formas:

- **Alias `@/`:** 75 archivos lo usan.
- **Rutas relativas:** 69 archivos las usan, sobre todo dentro de `ui/` (los componentes se importan entre sí con `./Campo`, `./Tabla`, etc.), dentro de `lib/` (por ejemplo `./tipos`) y para los `.module.css`.

| Si muevo o renombro | Archivos que cambian |
|-|-|
| `components/` | 61 archivos que importan con `@/components/` |
| `components/ui/` | 30 archivos externos con `@/components/ui/`, más hasta 44 con importaciones relativas dentro de `components/` |
| `lib/` | 75 archivos con `@/lib/`, más unos 24 con importaciones relativas dentro de `lib/` |
| `lib/controllers/` | 68 archivos |

Las referencias directas a `@/lib/tipos` (43 archivos) y a `@/lib/constantes` (37) son las más caras de mover.

**No conviene renombrar** los prefijos `CI_` ni `CC_`: aparecen en el informe y en MAPA.md, y todas las vistas y controladores los llevan. Tampoco conviene renombrar las carpetas de `app/`, que son las direcciones.

## 6. Propuesta de reorganización (sin aplicar)

Mantiene `app/`, `public/`, `CI_*` y `CC_*`, y mueve lo mínimo. El orden va del movimiento más barato al más caro.

| # | Movimiento | Archivos afectados |
|-|-|-|
| 1 | Renombrar `lib/controllers/utilidades.ts` a `acceso.ts` (visibilidad por museo) | unos 8 importadores |
| 2 | Fusionar `lib/permisos.ts` y `lib/formatos.ts` en archivos con nombre claro, o moverlos a `lib/dominio/` | 1 y 2 importadores |
| 3 | Crear `lib/exportacion/` con `exportacionReporte`, `exportacionTabla`, `respuestaPdf` y `ficha` | 1, 1, 5 y 1 importadores |
| 4 | Crear `lib/importacion/` con `importacion` y `limitesImportacion` | 2 y 2 importadores |
| 5 | Mover `reporteParametros` y `resultadoBusqueda` junto a su uso (`lib/exportacion/` y `lib/dominio/`) | 12 y 2 importadores |
| 6 | Dividir `ui/` en subcarpetas (`ui/formulario`, `ui/tablas`, `ui/reportes`, `ui/ventanas`) | unos 30 externos y 44 relativos, el movimiento más caro |
| 7 | Dividir `CC_Reporte.ts` en un archivo por reporte con un común | solo `app/reportes/**` y `CI_Reporte_*` |
| 8 | Quitar `lib/data/prisma/` hasta que exista Prisma, o dejar su README en `docs/` | 0 |
| 9 | Retirar el código sin uso de la sección 4 | pocos |

Antes de mover nada hay que cambiar también `MAPA.md`, `README.md` y `docs/CONEXION.md`, que citan estas rutas, y dejar `AJUSTES_CODIGO_V2.md` como está. Si solo hace falta una mejora rápida, los movimientos 1, 3 y 4 resuelven la mayor parte de la confusión con menos de 25 archivos tocados.

## Pendientes antes de reestructurar

- [x] **1. MAPA.md desactualizado por la eliminación de los marcadores numerados de piezas.** La línea 23 todavía menciona `pieza-01.svg` a `pieza-12.svg`, y otra frase dice que las 12 piezas más antiguas conservan sus imágenes de marcador. Ambas deben corregirse.
- [x] **2. Imagen vacía de las piezas sin imagen.** Hoy la semilla y las altas por defecto guardan la ruta `/piezas/sin-imagen.svg` como valor de `imagenUrl`. Eso hace que, al subir una imagen real a una pieza que no tenía, el historial registre "imagen reemplazada" en vez de "con imagen", y que al conectar el almacenamiento esa columna guarde una ruta local. La solución acordada es que una pieza sin imagen tenga el valor vacío, sin ruta, y que la interfaz muestre el marcador `sin-imagen.svg` solo al mostrarla, como ya hace `Miniatura`. Hay que revisar semilla, registro e importación de piezas, edición, historial y ficha técnica.

Resuelto: MAPA.md y docs/CONEXION.md quedaron al día, y la semilla ya no guarda la ruta del marcador como valor de imagenUrl.
