# Mapa del proyecto

Mapa de ubicación del prototipo de gestión de colecciones y exposiciones para museos. Describe dónde está cada cosa y cómo está construida hoy. Para correrlo, ver `README.md`. Para conectar base de datos, login e imágenes, ver `docs/CONEXION.md`.

Arquitectura MVC:

| Capa | Dónde vive | Qué hace |
|-|-|-|
| Vista | `components/CI_*` | Muestra datos y captura clics y formularios. Nunca lee ni escribe datos directamente |
| Controlador | `lib/controllers/CC_*.ts` | Server Actions con validaciones, reglas de negocio y permisos. Son los únicos que llaman a la capa de datos y a la sesión |
| Modelo | `lib/tipos.ts` y `lib/data/` | Tipos y capa de datos |

## 1. Estructura de carpetas

### Raíz

| Archivo o carpeta | Propósito | Contiene |
|-|-|-|
| `app/` | Rutas de la aplicación | 31 páginas `page.tsx`, diez rutas de servidor (`route.ts`), `layout.tsx`, `not-found.tsx` y `globals.css` |
| `components/` | Vistas y piezas compartidas | 27 carpetas `CI_*` (una por pantalla) y `ui/` |
| `lib/` | Lógica de la aplicación | Controladores, capa de datos, sesión, configuración, tipos, constantes y utilidades |
| `prisma/` | Esquema de la futura base de datos | `schema.prisma` con los 12 modelos, solo como archivo. No se ejecuta hoy |
| `public/` | Archivos estáticos | `piezas/` con el único marcador de posición, `sin-imagen.svg` |
| `docs/` | Documentación técnica | `CONEXION.md`, guía para conectar Prisma, Supabase y Vercel |
| `node_modules/` | Dependencias instaladas | Generado por `npm install` |
| `.next/` | Salida de compilación de Next.js | Generado por `npm run dev` y `npm run build` |
| `package.json` | Dependencias con versiones exactas, scripts (`dev`, `build`, `start`) y `engines` de Node 24.x | |
| `package-lock.json` | Bloqueo de versiones de npm | Generado |
| `tsconfig.json` | Configuración de TypeScript | Alias `@/*` apuntando a la raíz |
| `tsconfig.tsbuildinfo` | Caché incremental de TypeScript | Generado, excluido por `.gitignore` |
| `next.config.ts` | Configuración de Next.js | Desactiva las reglas de agentes que Next genera solo y sube a 6 MB el límite del cuerpo de las Server Actions (`experimental.serverActions.bodySizeLimit`) |
| `next-env.d.ts` | Tipos de Next.js | Generado, no se edita |
| `.env.example` | Lista de variables de entorno, sin valores | Un comentario por variable |
| `.env.local` | Valores locales de las variables | Solo `DATA_SOURCE=memoria`, el resto vacío. No se sube al repositorio |
| `.gitignore` | Exclusiones de Git | Excluye `.env`, `.env.local`, `.env.*.local`, `node_modules`, `.next` y `*.tsbuildinfo`. No excluye `.env.example` |
| `README.md` | Cómo correr, cuentas de demostración, funciones y cómo restablecer datos | |
| `MAPA.md` | Este archivo | |
| `AJUSTES_CODIGO_V2.md` | Documento de ajustes que describió la adaptación del código al diseño final | Ver el inventario de documentos en la sección 12 |

### Librerías (versiones exactas de `package.json`)

| Paquete | Versión | Para qué se usa |
|-|-|-|
| `next` | 16.3.8 | Framework (App Router) |
| `react` y `react-dom` | 19.3.0 | Interfaz |
| `typescript` | 5.9.3 | Tipado |
| `sonner` | 2.0.8 | Alertas (toasts) |
| `exceljs` | 4.4.0 | Lee y escribe archivos .xlsx (plantilla e importación de piezas, y reportes en Excel) |
| `@react-pdf/renderer` | 4.9.0 | Genera la ficha técnica y los reportes en PDF |
| `@types/node` | 24.19.2 | Tipos de desarrollo |
| `@types/react` y `@types/react-dom` | 19.3.0 | Tipos de desarrollo |

Las librerías no cambiaron con el bloque de reportes: los tres reportes nuevos usan las mismas `exceljs` y `@react-pdf/renderer`. No hay Prisma, Supabase ni otras librerías instaladas, y no se usan Tailwind, Bootstrap ni librerías de estilos.

### app/

| Ruta de archivo | Propósito |
|-|-|
| `app/layout.tsx` | Layout raíz: carga las fuentes (Anton e Inter con `next/font`), muestra el menú si hay sesión y no hay cambio de contraseña pendiente, y monta el contenedor de alertas una sola vez |
| `app/globals.css` | Variables CSS globales, base de estilos y contenedor. El `body` es una columna flex con `min-height: 100dvh` y `.contenedor` tiene `flex: 1`, para que una pantalla pueda centrarse en vertical con y sin menú |
| `app/not-found.tsx` y `app/not-found.module.css` | Página 404 propia, con `Celda estrecha` y `BotonEnlace` hacia `/`: muestra 404, "Esta página no se encontró" y el botón "Volver al inicio". Cubre las direcciones inexistentes y los `notFound()` de las páginas, con el mismo mensaje, sin indicar que el recurso exista ni que falte acceso. Sin sesión se ve sin menú, y con sesión bajo el menú del layout raíz. No es una ruta de la tabla de rutas ni una página con controlador |
| `app/**/page.tsx` | Una página por pantalla. Son componentes de servidor: llaman a un controlador y pasan los datos a la vista |
| `app/piezas/importar/plantilla/route.ts` | Ruta de servidor que descarga la plantilla de Excel |
| `app/piezas/[id]/ficha/route.ts` | Ruta de servidor que devuelve la ficha técnica en PDF, inline con `respuestaPdf` |
| `app/reportes/<reporte>/pdf/route.ts` | Cuatro rutas de servidor (categoría y estado, piezas, exposiciones y préstamos) que devuelven el reporte en PDF, en el visor del navegador (respuesta inline con `respuestaPdf`) |
| `app/reportes/<reporte>/excel/route.ts` | Cuatro rutas de servidor, una por reporte, que descargan el reporte en Excel |

### components/

| Carpeta | Pantalla |
|-|-|
| `CI_Login/` | Inicio de sesión, con validación por campo y botón para mostrar u ocultar la contraseña |
| `CI_Recuperar_Contrasena/` | Solicitar recuperación de contraseña (solo interfaz) |
| `CI_Restablecer_Contrasena/` | Definir una nueva contraseña (solo interfaz) |
| `CI_Cambiar_Contrasena/` | Cambio de contraseña temporal |
| `CI_Inicio/` | Inicio con las tarjetas de acceso según el rol y botón de restablecer (incluye `BotonRestablecer.tsx`) |
| `CI_Menu_Usuarios/` | Lista de usuarios, con desactivar y activar |
| `CI_Formulario_Usuario/` | Registrar y editar usuario |
| `CI_Menu_Museos/` | Lista de museos, con desactivar y activar |
| `CI_Formulario_Museo/` | Registrar y editar museo |
| `CI_Catalogo_Piezas/` | Catálogo de piezas |
| `CI_Detalle_Pieza/` | Detalle de una pieza: imagen grande, todos sus datos y las acciones |
| `CI_Formulario_Pieza/` | Registrar y editar pieza, en dos columnas |
| `CI_Actualizar_Estado/` | Actualizar estado de conservación |
| `CI_Historial_Pieza/` | Historial de cambios de una pieza |
| `CI_Importar_Piezas/` | Importar piezas desde Excel (formulario, vista previa y resultado) |
| `CI_Menu_Exposiciones/` | Módulo de exposiciones: lista, nueva, modificar y cancelar |
| `CI_Formulario_Exposicion/` | Nueva exposición y modificar exposición |
| `CI_Menu_Prestamos/` | Módulo de préstamos |
| `CI_Formulario_Prestamo/` | Nuevo préstamo (una sola pieza, con los botones "Seleccionar pieza" y "Quitar") |
| `CI_Devolucion_Prestamo/` | Registrar devolución (el estado de conservación al regresar arranca vacío) |
| `CI_Menu_Inventarios/` | Lista de inventarios y nuevo inventario |
| `CI_Realizar_Inventario/` | Conteo y cierre de un inventario, y vista de un inventario cerrado |
| `CI_Menu_Reportes/` | Menú de reportes: cuatro tarjetas, todas conectadas, que salen de la lista `REPORTES` |
| `CI_Reporte_Categoria_Estado/` | Reporte por categoría y estado, con filtros, resultado y exportación a PDF y Excel |
| `CI_Reporte_Piezas/` | Reporte de piezas: filtros de museo, disponibilidad y fecha de registro, listado por museo y exportación a PDF y Excel |
| `CI_Reporte_Exposiciones/` | Reporte de exposiciones: filtros de museo, estado y rango de fechas, una fila por exposición con sus piezas, y exportación a PDF y Excel |
| `CI_Reporte_Prestamos/` | Reporte de préstamos: filtros de museo, situación, institución destino y fecha de salida, once columnas y exportación a PDF y Excel |
| `ui/` | Piezas compartidas (sección 5) |

Cada carpeta `CI_*` tiene su componente `CI_*.tsx` y su CSS Module `CI_*.module.css`.

### lib/

| Archivo o carpeta | Propósito |
|-|-|
| `lib/controllers/` | Controladores `CC_*.ts` y `utilidades.ts` (funciones de apoyo que no son acciones, como `museosVisibles`, `piezasVisibles`, `exposicionesVisibles` y `prestamosVisibles`) |
| `lib/data/contratos.ts` | Contratos de la capa de datos |
| `lib/data/index.ts` | Elige la implementación según `DATA_SOURCE` |
| `lib/data/memoria/` | Implementación de hoy: `index.ts` (funciones sobre el almacén) y `semilla.ts` (datos de demostración) |
| `lib/data/prisma/` | Reservada para la implementación con Prisma. Hoy solo tiene un `README.md` |
| `lib/auth/session.ts` | Toda la lógica de sesión |
| `lib/config/env.ts` | Lectura central de variables de entorno |
| `lib/constantes.ts` | Valores fijos, sus etiquetas, la etiqueta de los valores del historial y las reglas de exposiciones y de préstamos compartidas por la vista y el controlador: `LIMITE_ANIOS_FECHAS` (3 años, para las fechas de exposiciones y la devolución prevista de un préstamo), los mensajes de "al menos una pieza", del tope de fechas, de la fecha de salida, del estado de devolución y de longitud de textos, y los máximos de longitud (`MAXIMO_INSTITUCION_DESTINO` y `MAXIMO_RESPONSABLE_RECEPTOR` de 100, `MAXIMO_NUMERO_CONVENIO` y `MAXIMO_NUMERO_POLIZA` de 40). También tiene `ZONA_HORARIA` ("America/Lima"), los textos y las etiquetas de los reportes (`TEXTO_TODOS`, `TEXTO_TODAS`, `TEXTO_SIN_LIMITE`, los títulos y totales, `ETIQUETAS_FILTROS_REPORTE`, `COLUMNAS_REPORTE_PIEZAS`, `COLUMNAS_REPORTE_EXPOSICIONES` y `COLUMNAS_REPORTE_PRESTAMOS`), los mensajes comunes de los reportes (`MENSAJE_RANGO_FECHAS_INVALIDO`, `MENSAJE_SIN_RESULTADOS`, `MENSAJE_FILTRO_INVALIDO`, `MENSAJE_FECHA_FORMATO` y `MENSAJE_SIN_ACCESO_MUSEO`), `errorDeRangoFechas` y `esFechaIso` |
| `lib/navegacion.ts` | Fuente única de las opciones de navegación (la usan el menú y las tarjetas de acceso del Inicio) y de la lista `REPORTES` del menú de reportes (cuatro reportes, todos con ruta y disponibles) |
| `lib/validaciones.ts` | Validaciones de formulario compartidas por las vistas y los controladores: formato de correo, contraseña no vacía al ingresar, las reglas de la contraseña nueva (`CONTRASENA_MINIMO` de 10 y `CONTRASENA_MAXIMO` de 15 caracteres, sus dos mensajes y `errorDeLongitudContrasena`) la validación estricta del año (`validarAnio`, `ANIO_MINIMO`, `anioActual` con el año de la zona de Lima, `anioEnRango` y sus dos mensajes) y la del valor asegurado de un préstamo (`validarValorAsegurado`, `VALOR_ASEGURADO_MINIMO` y `VALOR_ASEGURADO_MAXIMO` y su mensaje) |
| `lib/codigos.ts` | Prefijo del museo y código de la pieza: `calcularPrefijoMuseo`, `formatearCodigo`, `siguienteNumeroCodigo`, `compararCodigos` (orden por prefijo y luego por número), `claveCodigoAnterior` y las constantes del código anterior (máximo de 40 caracteres y sus dos mensajes) |
| `lib/tipos.ts` | Tipos del modelo y tipos de apoyo para vistas y controladores |
| `lib/fechas.ts` | Todo cálculo y formato de fechas, con la zona `ZONA_HORARIA` (America/Lima) de forma explícita: `aISO`, `hoyISO`, `diaLocal`, `formatearFecha`, `formatearFechaHora`, `instanteDeLima`, `sumarDias`, `diasDesdeHoy`, `diaSiguiente` y `fechaLimite()` (hoy más el límite de años, que usan las exposiciones y la devolución prevista de los préstamos). También el estado de una exposición, la situación de un préstamo y el cruce de rangos (`rangosSeCruzan`) |
| `lib/permisos.ts` | `puedeAccederMuseo`: regla de acceso por organización y por museo |
| `lib/importacion.ts` | Lectura, escritura y validación del Excel de importación de piezas. Vuelve a exportar los límites de `lib/limitesImportacion.ts` |
| `lib/limitesImportacion.ts` | Límites del archivo de importación: `MAXIMO_BYTES_ARCHIVO` (5 MB), `MAXIMO_MEGABYTES_ARCHIVO` y `MAXIMO_FILAS` (500). Están aparte para que las vistas los usen sin llevar `exceljs` al navegador |
| `lib/resultadoBusqueda.ts` | Texto de la línea de resultado de los buscadores (`textoResultadoBusqueda`): "N piezas", "1 pieza" o "X de N piezas", y lo mismo para exposiciones |
| `lib/ficha.tsx` | Documento PDF de la ficha técnica |
| `lib/exportacionReporte.tsx` | Archivos del reporte por categoría y estado: PDF con `@react-pdf/renderer` y Excel con ExcelJS |
| `lib/exportacionTabla.tsx` | Exportación genérica por columnas, para los reportes de piezas, exposiciones y préstamos: PDF apaisado con encabezado fijo en cada página y filas que no se parten, y Excel con la hoja "Reporte" y el valor asegurado como número con 2 decimales. Cada columna lleva un ancho relativo, alineado con el de la pantalla |
| `lib/formatos.ts` | `formatearMonto`: monto con separador de miles y 2 decimales |
| `lib/respuestaPdf.ts` | `respuestaPdf`: respuesta común de todo PDF del sistema (los cuatro reportes y la ficha técnica), con `application/pdf` y `Content-Disposition` inline con el nombre del archivo |
| `lib/reporteParametros.ts` | Conversión de los filtros a parámetros de dirección y de vuelta, para los enlaces y las rutas de exportación: `filtrosAParametros` y `parametrosAFiltros` para el reporte por categoría y estado, y `mapaAParametros` y `parametrosAMapa` para los otros tres |

## 2. Mapa de rutas

Son 41 rutas: 31 páginas y 10 rutas de servidor. Todas exigen sesión, salvo las tres rutas públicas de acceso (`/login`, `/recuperar-contrasena` y `/restablecer-contrasena`), que redirigen a `/` si ya hay sesión. Las acciones de cada control están en la sección 3. "Sin ECU" quiere decir que la pantalla existe pero el informe no la especifica como caso de uso. La página 404 (`app/not-found.tsx`) no es una ruta de esta tabla ni cuenta entre las 31 páginas.

| Ruta | Pantalla | Control | Caso de uso |
|-|-|-|-|
| `/login` | `CI_Login` | `CC_Usuario` | Apoyo: iniciar sesión |
| `/recuperar-contrasena` | `CI_Recuperar_Contrasena` | `CC_Usuario` | Apoyo: solicitar recuperación de contraseña, solo interfaz (pública) |
| `/restablecer-contrasena` | `CI_Restablecer_Contrasena` | `CC_Usuario` | Apoyo: definir nueva contraseña, solo interfaz (pública) |
| `/cambiar-contrasena` | `CI_Cambiar_Contrasena` | `CC_Usuario` | Apoyo: cambio de contraseña temporal |
| `/` | `CI_Inicio` | `CC_Usuario` | Apoyo: inicio y restablecer datos |
| `/usuarios` | `CI_Menu_Usuarios` | `CC_Usuario` | ECUS01 Gestionar Usuarios del Museo (solo administrador) |
| `/usuarios/nuevo` | `CI_Formulario_Usuario` | `CC_Usuario` | ECUS01 (solo administrador) |
| `/usuarios/[id]` | `CI_Formulario_Usuario` | `CC_Usuario` | ECUS01, sub flujo editar (solo administrador) |
| `/museos` | `CI_Menu_Museos` | `CC_Museo` | Gestionar Museos, sin ECU (solo administrador) |
| `/museos/nuevo` | `CI_Formulario_Museo` | `CC_Museo` | Sin ECU (solo administrador) |
| `/museos/[id]` | `CI_Formulario_Museo` | `CC_Museo` | Sin ECU, editar (solo administrador) |
| `/reportes` | `CI_Menu_Reportes` | `CC_Reporte` | Menú de reportes, sin ECU en el informe |
| `/reportes/categoria-estado` | `CI_Reporte_Categoria_Estado` | `CC_Reporte` | ECUS02 Generar Reporte por Categoría y Estado |
| `/reportes/categoria-estado/pdf` | Ruta de servidor (PDF) | `CC_Reporte` | ECUS02, exportación sin ECU en el informe |
| `/reportes/categoria-estado/excel` | Ruta de servidor (descarga .xlsx) | `CC_Reporte` | ECUS02, exportación sin ECU en el informe |
| `/reportes/piezas` | `CI_Reporte_Piezas` | `CC_Reporte` | Reporte de piezas, sin ECU en el informe |
| `/reportes/piezas/pdf` | Ruta de servidor (PDF) | `CC_Reporte` | Exportación, sin ECU |
| `/reportes/piezas/excel` | Ruta de servidor (descarga .xlsx) | `CC_Reporte` | Exportación, sin ECU |
| `/reportes/exposiciones` | `CI_Reporte_Exposiciones` | `CC_Reporte` | Reporte de exposiciones, sin ECU en el informe |
| `/reportes/exposiciones/pdf` | Ruta de servidor (PDF) | `CC_Reporte` | Exportación, sin ECU |
| `/reportes/exposiciones/excel` | Ruta de servidor (descarga .xlsx) | `CC_Reporte` | Exportación, sin ECU |
| `/reportes/prestamos` | `CI_Reporte_Prestamos` | `CC_Reporte` | Reporte de préstamos, sin ECU en el informe |
| `/reportes/prestamos/pdf` | Ruta de servidor (PDF) | `CC_Reporte` | Exportación, sin ECU |
| `/reportes/prestamos/excel` | Ruta de servidor (descarga .xlsx) | `CC_Reporte` | Exportación, sin ECU |
| `/piezas` | `CI_Catalogo_Piezas` | `CC_Pieza` | Catálogo y búsqueda de piezas |
| `/piezas/nueva` | `CI_Formulario_Pieza` | `CC_Pieza` | Registrar pieza, sin ECU en el informe |
| `/piezas/[id]` | `CI_Detalle_Pieza` | `CC_Pieza` | Detalle de pieza, sin ECU en el informe. Pantalla de apoyo: la opción Piezas del menú sigue activa |
| `/piezas/[id]/editar` | `CI_Formulario_Pieza` | `CC_Pieza` | Editar pieza, sin ECU en el informe |
| `/piezas/[id]/estado` | `CI_Actualizar_Estado` | `CC_Pieza` | ECUS03 Actualizar Estado de Conservación de una Pieza |
| `/piezas/[id]/historial` | `CI_Historial_Pieza` | `CC_Historial` | Consultar historial, sin ECU en el informe |
| `/piezas/importar` | `CI_Importar_Piezas` | `CC_Importacion` | ECUS04 Importar Piezas desde Excel |
| `/piezas/importar/plantilla` | Ruta de servidor (descarga .xlsx) | `CC_Importacion` | ECUS04 |
| `/piezas/[id]/ficha` | Ruta de servidor (PDF, inline) | `CC_Pieza` | Ficha técnica, sin ECU |
| `/exposiciones` | `CI_Menu_Exposiciones` | `CC_Exposicion` | ECUS05 Gestionar Exposición |
| `/exposiciones/nueva` | `CI_Formulario_Exposicion` | `CC_Exposicion` | ECUS05 |
| `/exposiciones/[id]/editar` | `CI_Formulario_Exposicion` | `CC_Exposicion` | ECUS05, sub flujo modificar |
| `/prestamos` | `CI_Menu_Prestamos` | `CC_Prestamo` | ECUS06 Registrar Préstamo de una Pieza |
| `/prestamos/nuevo` | `CI_Formulario_Prestamo` | `CC_Prestamo` | ECUS06 |
| `/prestamos/devolucion` | `CI_Devolucion_Prestamo` | `CC_Prestamo` | ECUS06, sub flujo registrar devolución |
| `/inventarios` | `CI_Menu_Inventarios` | `CC_Inventario` | Realizar Inventario Físico, sin ECU |
| `/inventarios/[id]` | `CI_Realizar_Inventario` | `CC_Inventario` | Sin ECU |

Dónde se usan los buscadores:
- `BuscadorPiezas`: catálogo (modo catálogo, con acciones por fila), ventana "Buscar piezas" de `CI_Formulario_Exposicion`, que abre el botón "Agregar piezas" (selección múltiple, con el museo sede fijo), y ventana "Buscar piezas" de `CI_Formulario_Prestamo` (selección única).
- `BuscadorExposiciones`: lista de `CI_Menu_Exposiciones` (parte de la lista cargada por la página) y su ventana "Buscar exposición" (selección única, consulta al abrir), usada por Modificar exposición y Cancelar exposición.

## 3. Controladores

Están en `lib/controllers/`, junto con `utilidades.ts`. Los nueve controles `CC_*.ts` son Server Actions (`"use server"`) y todas sus funciones son asíncronas.

| Control | Acción | Pantalla que la usa |
|-|-|-|
| `CC_Usuario` | `cargarLogin`, `ingresar` | `CI_Login` |
| | `cargarRecuperacion`, `solicitarRecuperacion` | `CI_Recuperar_Contrasena` |
| | `cargarRestablecimiento`, `definirNuevaContrasena` | `CI_Restablecer_Contrasena` |
| | `obtenerUsuarioActual` | `app/layout.tsx` (menú) |
| | `cerrarSesionAccion` | menú, botón "Cerrar sesión" |
| | `cargarCambioContrasena`, `cambiarContrasena` | `CI_Cambiar_Contrasena` |
| | `cargarInicio` | `CI_Inicio` |
| | `restablecerDatosDemostracion` | `BotonRestablecer` (en `CI_Inicio`) |
| | `listarUsuarios`, `verificarDesactivacionUsuario`, `desactivarUsuario`, `activarUsuario` | `CI_Menu_Usuarios` |
| | `cargarFormularioUsuario`, `registrarUsuario`, `actualizarUsuario` | `CI_Formulario_Usuario` |
| `CC_Museo` | `listarMuseos`, `desactivarMuseo`, `activarMuseo` | `CI_Menu_Museos` |
| | `cargarFormularioMuseo`, `registrarMuseo`, `actualizarMuseo` | `CI_Formulario_Museo` |
| `CC_Reporte` | `cargarReporte` | `CI_Menu_Reportes`, `CI_Reporte_Categoria_Estado` |
| | `generarReporte` | `CI_Reporte_Categoria_Estado` |
| | `exportarReporte` | Rutas `/reportes/categoria-estado/pdf` y `/reportes/categoria-estado/excel` |
| | `cargarReportePiezas`, `generarReportePiezas` | `CI_Reporte_Piezas` |
| | `exportarReportePiezas` | Rutas `/reportes/piezas/pdf` y `/reportes/piezas/excel` |
| | `cargarReporteExposiciones`, `generarReporteExposiciones` | `CI_Reporte_Exposiciones` |
| | `exportarReporteExposiciones` | Rutas `/reportes/exposiciones/pdf` y `/reportes/exposiciones/excel` |
| | `cargarReportePrestamos`, `generarReportePrestamos` | `CI_Reporte_Prestamos` |
| | `exportarReportePrestamos` | Rutas `/reportes/prestamos/pdf` y `/reportes/prestamos/excel` |
| `CC_Pieza` | `buscarPiezas` | `BuscadorPiezas` |
| | `cargarCatalogo` | `CI_Catalogo_Piezas` |
| | `cargarDetallePieza` | `CI_Detalle_Pieza` |
| | `cargarFormularioPieza`, `registrarPieza`, `actualizarPieza` | `CI_Formulario_Pieza` |
| | `cargarActualizarEstado`, `actualizarEstado` | `CI_Actualizar_Estado` |
| | `generarFichaTecnica` | Ruta `/piezas/[id]/ficha` |
| `CC_Historial` | `consultarHistorial` | `CI_Historial_Pieza` |
| `CC_Importacion` | `cargarImportacion`, `validarArchivo`, `importarPiezas` | `CI_Importar_Piezas` |
| | `generarPlantilla` | Ruta `/piezas/importar/plantilla` |
| `CC_Exposicion` | `buscarExposiciones` | `BuscadorExposiciones` |
| | `cargarExposiciones`, `elegirExposicionParaModificar`, `elegirExposicionParaCancelar`, `cancelarExposicion` | `CI_Menu_Exposiciones` |
| | `cargarFormularioExposicion`, `registrarExposicion`, `actualizarExposicion` | `CI_Formulario_Exposicion` |
| `CC_Prestamo` | `cargarPrestamos` | `CI_Menu_Prestamos` |
| | `cargarFormularioPrestamo`, `registrarPrestamo` | `CI_Formulario_Prestamo` |
| | `cargarDevolucion`, `registrarDevolucionPrestamo` | `CI_Devolucion_Prestamo` |
| `CC_Inventario` | `cargarInventarios`, `crearInventario` | `CI_Menu_Inventarios` |
| | `cargarInventario`, `marcarPieza`, `cerrarInventario` | `CI_Realizar_Inventario` |

Iniciar y cerrar sesión no disparan alertas: `ingresar` y `cerrarSesionAccion` redirigen desde el controlador. La vista de login solo muestra una alerta cuando hay un error general (credenciales incorrectas o cuenta desactivada).

Recuperación de contraseña, solo interfaz: `solicitarRecuperacion` valida el formato del correo y devuelve un mensaje neutro, sin consultar usuarios ni enviar correo. `definirNuevaContrasena` valida el mínimo de 10 y el máximo de 15 caracteres (con `errorDeLongitudContrasena`) y que ambas coincidan, con los mismos textos que el cambio de contraseña, y con datos válidos no modifica ninguna contraseña: avisa que la función se activará al conectar la autenticación. Ninguna pantalla enlaza a `/restablecer-contrasena`: hoy se llega por su dirección. No cambia datos, así que no invalida el layout.

Cambio de contraseña temporal: `cambiarContrasena` valida el mínimo y el máximo con las mismas constantes (la vista `CI_Cambiar_Contrasena` los valida antes de enviar), rechaza que ambas no coincidan y que la nueva sea igual a la actual, guarda la contraseña y quita la marca de cambio pendiente. Antes de redirigir a `/` invoca `revalidatePath("/", "layout")`: el layout raíz decide en el servidor si muestra el menú según esa marca, y sin invalidarlo el menú no aparecía hasta recargar la página.

`lib/controllers/utilidades.ts` no es un control: tiene funciones de apoyo (`museosVisibles`, `museosActivosVisibles`, `puedeAccederAlMuseo`, `piezasVisibles`, `exposicionesVisibles`, `prestamosVisibles`, `coincideTexto`) que filtran por la organización y los museos de la persona y calculan museo, categoría, estado y situación. `coincideTexto` es una coincidencia parcial que ignora mayúsculas y tildes ("Ceramica" encuentra "Cerámica"): la usan el filtro de código, de código anterior y de nombre de `buscarPiezas` y el filtro de nombre de `buscarExposiciones`.

`cargarDetallePieza` usa los mismos permisos que las demás rutas de pieza: una pieza inexistente o de un museo no asignado responde 404. `actualizarEstado` devuelve en `datos` el campo `estadoActual`, que la vista ya no usa porque tras guardar vuelve al catálogo.

`prestamosVisibles` estaba en `CC_Prestamo` y se movió a `utilidades.ts` para que lo compartan el módulo de préstamos y el reporte de préstamos, y `PrestamoListado` incluye ahora `museoId`, el museo de la pieza. `cargarFormularioPrestamo` devuelve los museos, las categorías, `hoy` (`hoyISO()` del servidor, en la zona de Lima) y `limite`: la vista parte de esa fecha para la fecha de salida, así que no depende de la zona horaria del navegador. Los formularios de pieza (`anioMaximo`) y de exposición (`limite`) reciben igualmente sus valores ya calculados desde el servidor. `registrarPrestamo` recibe un único `piezaId`.

## 4. Capa de datos y sesión

### Modelo de datos: 12 entidades

Equivalen a 12 tablas de la futura base de datos (`prisma/schema.prisma`). Los ids son texto con formato uuid. Las relaciones muchos a muchos se representan con arreglos.

| Tabla | Tipo en `lib/tipos.ts` | Campos |
|-|-|-|
| `organizacion` | `Organizacion` | id, nombre |
| `usuario` | `Usuario` | id, organizacionId, nombre, email, rol, activo, museoIds[], contrasena y debeCambiarContrasena (estos dos existen solo en memoria) |
| `museo` | `Museo` | id, organizacionId, nombre, prefijo, tipo (tipo de colección), direccion?, activo |
| `usuario_museo` | `Usuario.museoIds` | Relación usuario y museo |
| `categoria` | `Categoria` | id, organizacionId, nombre |
| `pieza` | `Pieza` | id, museoId, categoriaId, codigo, codigoAnterior?, nombre, descripcion?, anio?, material?, estadoConservacion, ubicacionFisica?, imagenUrl?, disponibilidad, fechaRegistro |
| `historial_cambio` | `HistorialCambio` | id, piezaId, usuarioId, campoModificado, valorAnterior?, valorNuevo?, fecha |
| `exposicion` | `Exposicion` | id, museoId, nombre, descripcion?, fechaInicio, fechaFin, cancelada, piezaIds[] |
| `pieza_exposicion` | `Exposicion.piezaIds` | Relación pieza y exposición |
| `prestamo` | `Prestamo` | id, piezaId, usuarioId, institucionDestino, responsableReceptor, numeroConvenio, numeroPoliza, valorAsegurado, fechaSalida, fechaDevolucionPrevista, fechaDevolucionReal?, estadoConservacionSalida, estadoConservacionDevolucion? |
| `inventario` | `Inventario` | id, museoId, usuarioId (quien lo inició), usuarioCierreId? (quien lo cerró, vacío mientras está en curso), fechaInicio, fechaCierre?, estado |
| `detalle_inventario` | `DetalleInventario` | id, inventarioId, piezaId, resultado, observacion? |

Las fechas de exposición y de préstamo son solo día (`YYYY-MM-DD`). Las fechas de historial, inventario y registro de pieza son fecha y hora ISO, guardadas en UTC.

**Zona horaria única.** `ZONA_HORARIA` (`lib/constantes.ts`) vale "America/Lima" y es el único criterio de día y de hora del sistema. Las funciones de `lib/fechas.ts` (`aISO`, `hoyISO`, `diaLocal`, `formatearFecha`, `formatearFechaHora`, `instanteDeLima`, `sumarDias`, `diasDesdeHoy`, `diaSiguiente` y `fechaLimite`) la usan de forma explícita, con `Intl.DateTimeFormat`. Una marca con hora se guarda en UTC y el día y la hora que se calculan o se muestran se convierten a America/Lima. Una fecha de solo día se trata como texto y no se desplaza nunca. `anioActual` y `esFechaIso` usan la misma zona (la segunda valida el calendario en UTC, que no depende de ninguna zona), la semilla parte del hoy de Lima (`instanteDeLima` arma sus marcas con hora) y los formularios de pieza, exposición y préstamo reciben `anioMaximo`, `limite` y `hoy` ya calculados desde el servidor. Ningún cálculo depende de la zona del proceso, del servidor ni del navegador.

### Prefijo del museo y código de la pieza: `lib/codigos.ts`

- **Prefijo del museo.** Lo calcula la capa de datos al crear el museo (`crearMuseo`), nunca lo escribe la persona y no cambia después, ni siquiera si se edita el nombre. Regla: la inicial de cada palabra significativa del nombre, sin artículos, preposiciones ni conjunciones (de, del, la, las, el, los, y, e), en mayúsculas y sin tildes. Si hay una sola palabra significativa, sus tres primeras letras. Máximo 5 letras. Si el prefijo ya existe en la organización, se agrega un número al final (2, 3 y así) hasta que sea único. Ejemplos: Museo Municipal de Teatro da MMT, Museo Casa Quiñones da MCQ, Pinacoteca Municipal Ignacio Merino da PMIM, Sala Cultural Santa Rosa da SCSR y Herbario da HER. Se muestra como columna Prefijo en la lista de museos y en solo lectura al editar. El registro de museo no tiene campo de prefijo.
- **Código de la pieza.** Lo asigna el sistema al guardar y es inmutable: prefijo del museo, guion y número correlativo de al menos 3 dígitos con ceros a la izquierda (MMT-009). El número es el mayor correlativo existente en ese museo con ese prefijo más uno, no la cantidad de piezas, así que los huecos no lo alteran. Se calcula dentro de la capa de datos, en la misma operación que inserta la pieza (`crearPieza`, y `crearPiezas` en el orden de las filas), y no en los controladores ni en las vistas. La persona nunca lo escribe: registrar pieza no tiene campo de código y editar pieza lo muestra en solo lectura.
- **Código anterior.** Campo opcional de la pieza, de máximo 40 caracteres y sin validación de formato. Si se llena, no puede repetirse dentro del mismo museo (la comparación ignora mayúsculas y espacios repetidos). Se puede editar y su cambio queda en el historial como "código anterior". Mensajes: "El código anterior no puede tener más de 40 caracteres" y "Ya existe una pieza con ese código anterior en el museo".

### Valores fijos y etiquetas: `lib/constantes.ts`

Los valores se guardan en minúscula y la interfaz muestra la etiqueta.

| Campo | Valores guardados | Etiqueta en la interfaz |
|-|-|-|
| `Usuario.rol` | administrador, colaborador | Administrador, Colaborador |
| `Museo.tipo` (tipo de colección) | arqueologia, historico, arte, ciencias_naturales, otro | Arqueología, antropología o etnología; Histórico; Arte; Ciencias naturales; Otro |
| Estado de conservación (pieza y préstamo) | bueno, regular, malo | Bueno, Regular, Malo |
| `Pieza.disponibilidad` | disponible, en_prestamo, pendiente_verificacion | Disponible, En préstamo, Pendiente de verificación |
| `Inventario.estado` | en_curso, cerrado | En curso, Cerrado |
| `DetalleInventario.resultado` | encontrada, no_encontrada, con_dano | Encontrada, No encontrada, Con daño |
| Estado de exposición (calculado) | programada, vigente, finalizada, cancelada | Programada, Vigente, Finalizada, Cancelada |
| Situación de préstamo (calculada) | en_prestamo, vencido, devuelto | En préstamo, Vencido, Devuelto |

Textos de la página 404: `TEXTO_CODIGO_404` ("404"), `TEXTO_MENSAJE_404` ("Esta página no se encontró") y `ETIQUETA_VOLVER_AL_INICIO` ("Volver al inicio").

El tipo de museo es el tipo de colección y se representa con `TipoColeccion`, `TIPOS_COLECCION` y `ETIQUETAS_TIPO_COLECCION`. Es obligatorio y su mensaje de validación es "Selecciona el tipo de museo". Las categorías ya no son fijas: son datos de cada organización. En el historial, los cambios de estado de conservación y de disponibilidad se guardan con su valor fijo y se muestran con su etiqueta (`etiquetaValorHistorial`). Los demás campos se guardan como texto libre. El nombre del campo modificado se guarda en minúscula y la pantalla de historial lo muestra con la primera letra en mayúscula mediante `etiquetaCampoHistorial`, sin cambiar lo guardado.

### Contratos: `lib/data/contratos.ts`

Interfaz `Datos`. Toda implementación debe cumplirla. Todas las funciones devuelven promesas.

| Grupo | Funciones |
|-|-|
| Organización | `obtenerOrganizacion` |
| Museos | `listarMuseos` (por organización), `obtenerMuseo`, `crearMuseo` (calcula el prefijo), `actualizarMuseo` (no admite cambiar el prefijo), `cambiarActivoMuseo` |
| Usuarios | `listarUsuarios` (por organización), `obtenerUsuario`, `obtenerUsuarioPorEmail`, `crearUsuario`, `actualizarUsuario`, `cambiarActivoUsuario`, `actualizarContrasena` |
| Categorías | `listarCategorias` (por organización) |
| Piezas | `listarPiezas`, `obtenerPieza`, `buscarPiezaPorCodigoAnterior`, `crearPieza` (asigna el código), `crearPiezas` (en lote, asigna los códigos en orden), `actualizarPieza`, `actualizarEstadoPieza`, `actualizarDisponibilidadPieza` |
| Exposiciones | `listarExposiciones`, `obtenerExposicion`, `crearExposicion`, `actualizarExposicion`, `cancelarExposicion` |
| Préstamos | `listarPrestamos`, `obtenerPrestamo`, `crearPrestamo`, `registrarDevolucion` |
| Inventarios | `listarInventarios`, `obtenerInventario`, `crearInventario`, `marcarResultadoInventario`, `listarDetalleInventario`, `cerrarInventario` (recibe el id, la fecha de cierre y la persona que cierra) |
| Historial | `listarHistorialPieza`, `registrarCambio` |
| Demostración | `restablecerDatos` |

En `prisma/schema.prisma`, `Inventario` tiene `usuarioCierreId` (columna `usuario_cierre_id`, opcional) con su relación al usuario. Como ahora hay dos relaciones entre `Inventario` y `Usuario`, ambas llevan nombre (`InventarioIniciadoPor` e `InventarioCerradoPor`) y `Usuario` tiene los dos lados (`inventariosIniciados` e `inventariosCerrados`). El esquema solo se editó: no se ejecutó ninguna migración.

Hoy ningún controlador usa `obtenerOrganizacion`, `obtenerExposicion`, `obtenerPrestamo` ni `obtenerInventario`. Se conservan porque forman parte del contrato mínimo que se definió para la futura implementación con Prisma.

También se exportan los tipos `NuevoMuseo` (sin prefijo), `CambiosMuseo`, `NuevoUsuario`, `CambiosUsuario`, `NuevaPieza` (sin código), `CambiosPieza` (sin código), `NuevaExposicion`, `CambiosExposicion`, `NuevoPrestamo`, `DevolucionPrestamo`, `NuevoInventario` y `NuevoCambio`.

### Selección: `lib/data/index.ts`

`obtenerDatos()` devuelve la implementación según `DATA_SOURCE`. Por defecto es `memoria`. Con `prisma` lanza un error claro mientras no exista la implementación.

### Implementación en memoria: `lib/data/memoria/`

| Archivo | Contiene |
|-|-|
| `index.ts` | `datosMemoria`, que cumple `Datos`. Guarda el almacén en `globalThis` (`__museosDemo`) para sobrevivir a la recarga en caliente y devuelve copias. Por eso, al editar la semilla hay que reiniciar el servidor de desarrollo: de lo contrario se conserva el almacén anterior, con la semilla anterior Los registros nuevos usan `crypto.randomUUID()`. Calcula el prefijo de cada museo nuevo y el código de cada pieza nueva con `lib/codigos.ts` |
| `semilla.ts` | `crearDatosIniciales()`: datos de demostración con ids uuid fijos. Las fechas se calculan desde hoy. `restablecerDatos` vuelve a llamar a esta función |

### Semilla de demostración

Cantidades (comprobadas con un script temporal de consistencia): 1 organización, 4 museos, 6 usuarios, 8 categorías, 21 piezas, 18 registros de historial, 6 exposiciones, 5 préstamos, 3 inventarios y 15 detalles de inventario.

Cuentas (todas con la contraseña de demostración `Museos2026`, que sale de la constante `CONTRASENA_DEMO` de `semilla.ts`, se valida con las reglas de longitud al cargar la semilla y también usa "Restablecer datos de demostración"):

| Persona | Correo | Rol | Museos asignados | Estado |
|-|-|-|-|-|
| Brandon Garcia Sanchez | brandon.garcia@example.com | administrador | Museo Municipal de Teatro, Pinacoteca Municipal Ignacio Merino, Museo Casa Quiñones | activo |
| Gabriela Linares Ortega | gabriela.linares@example.com | colaborador | Museo Municipal de Teatro, Pinacoteca Municipal Ignacio Merino | activo |
| Marco Aguirre Soto | marco.aguirre@example.com | colaborador | Museo Municipal de Teatro | activo |
| Miguel Zambrano Melendez | miguel.zambrano@example.com | colaborador | Pinacoteca Municipal Ignacio Merino | activo |
| Lucía Paredes Vargas | lucia.paredes@example.com | colaborador | Museo Casa Quiñones | activo |
| Diego Salazar Rojas | diego.salazar@example.com | colaborador | Museo Municipal de Teatro | inactivo |

Museos, prefijo, tipo de colección y piezas (los prefijos se calculan con la regla de `lib/codigos.ts`):

| Museo | Prefijo | Tipo | Piezas |
|-|-|-|-|
| Museo Municipal de Teatro | MMT | otro | 8 (MMT-001 a MMT-008) |
| Pinacoteca Municipal Ignacio Merino | PMIM | arte | 6 (PMIM-001 a PMIM-006) |
| Museo Casa Quiñones | MCQ | historico | 5 (MCQ-001 a MCQ-005) |
| Sala Cultural Santa Rosa | SCSR | otro | 2 (SCSR-001 y SCSR-002), inactiva, cerrada por remodelación |

El administrador ve todos los museos de su organización, incluida la sala inactiva. Los códigos conservan el número de antes y solo cambió el prefijo: PMI pasa a PMIM, CQ pasa a MCQ, SR pasa a SCSR y MMT queda igual. Tres piezas de Museo Casa Quiñones tienen código anterior, para probar la función: MCQ-001 (INV-1987-0412), MCQ-002 (INV-1987-0418) y MCQ-005 (INV-1991-0107). La próxima pieza que se registre recibe MMT-009, PMIM-007, MCQ-006 o SCSR-003, según el museo.

Categorías: ocho (Arqueológico, Pintura, Escultura, Cerámica, Textil, Orfebrería, Documento y Otro). "Otro" es la categoría general. Hoy ninguna pantalla crea, edita ni desactiva categorías: el contrato de datos solo tiene `listarCategorias`, y para cambiarlas hay que editar la semilla. En el esquema de Prisma existe la tabla `categoria` por organización, y su gestión queda pendiente.

Contenido relevante:
- Exposiciones: una vigente (Teatro), tres programadas (Teatro, Casa Quiñones y Pinacoteca), una finalizada (Pinacoteca) y una cancelada (Pinacoteca).
- Préstamos: dos en curso (MMT-006 en el Teatro y MCQ-003 en Casa Quiñones), uno vencido (PMIM-004) y dos devueltos (MMT-005 y un préstamo anterior de MCQ-003).
- Inventarios: el del Teatro está cerrado, lo inició Gabriela y lo cerró Marco; el de la Pinacoteca está cerrado, y lo inició y lo cerró Miguel; el de Casa Quiñones está en curso, iniciado por Lucía, y no tiene persona de cierre. Las personas de cierre tienen acceso al museo de su inventario, y en el del Teatro es distinta de quien lo inició, para ver ambos datos.
- Una pieza pendiente de verificación (MMT-008), resultado del inventario cerrado de Teatro.
- Ninguna pieza de la semilla tiene imagen: su `imagenUrl` queda vacío y la interfaz muestra el marcador `sin-imagen.svg` solo al mostrarla.

### Sesión: `lib/auth/session.ts`

Única parte que lee o escribe la cookie `httpOnly` `sesion_demo` (guarda el id del usuario, en texto).

| Función | Qué hace |
|-|-|
| `obtenerSesion` | Devuelve el usuario de la sesión (sin contraseña) o `null`. Una cuenta desactivada no tiene sesión |
| `iniciarSesion` | Escribe la cookie |
| `cerrarSesion` | Borra la cookie |
| `exigirSesion` | Exige sesión. Sin sesión redirige a `/login`. Con contraseña temporal redirige a `/cambiar-contrasena`, salvo con la opción `permitirCambioPendiente` |
| `exigirAdministrador` | Exige sesión de administrador. Un colaborador vuelve a `/` |

### Variables de entorno: `lib/config/env.ts`

Único archivo que lee `process.env`. Cada variable falla con un mensaje en español solo cuando se usa su función.

| Función | Variable |
|-|-|
| `obtenerDataSource` | `DATA_SOURCE` (`memoria` por defecto) |
| `obtenerDatabaseUrl` | `DATABASE_URL` |
| `obtenerDirectUrl` | `DIRECT_URL` |
| `obtenerSupabaseUrl` | `NEXT_PUBLIC_SUPABASE_URL` |
| `obtenerSupabaseAnonKey` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `obtenerSupabaseServiceRoleKey` | `SUPABASE_SERVICE_ROLE_KEY` |

## 5. Componentes compartidos: `components/ui/`

| Componente | Descripción |
|-|-|
| `Boton.tsx` | `Boton` y `BotonEnlace`, con tres variantes: principal (negro), secundario (borde) y peligro (texto y borde de `--color-error`, sin relleno, y con fondo de error y texto sobre error al pasar el cursor), con tamaño pequeño opcional y dos opciones reutilizables: `bloque` (ancho completo del contenedor, con altura mínima común y texto centrado que puede partirse en dos líneas) y `compacto`, que se usa con `bloque` y da una altura fija (`--alto-boton-compacto`, la de un texto de dos líneas), menos relleno y letra menor, para pilas de botones dentro de una fila de tabla. La variante peligro se usa en Desactivar (usuarios y museos) y en Cancelar exposición; los demás Cancelar de formularios y diálogos son secundarios. `BotonEnlace` puede descargar un archivo (`descarga`) o abrir en una pestaña nueva (`nuevaPestana`, con `noopener noreferrer`) |
| `Celda.tsx` | `Celda` (sección con borde, con las opciones `estrecha` y `ancha` para formularios de una y de dos columnas), `EncabezadoPagina` (etiqueta, título y acciones) y `Acciones` (fila de botones) |
| `Campo.tsx` | Piezas de formulario: `Campo` (con marca de obligatorio y propiedad `error` para el mensaje debajo del control), `Entrada`, `AreaTexto`, `Seleccion` (con tratamiento central de la opción de placeholder), `Casilla`, `GrupoCasillas`, `AyudaCampo` (línea de ayuda en texto secundario bajo un control: la usan el campo de imagen del formulario de pieza y los campos de museo y de archivo de la importación), `DatoLectura`, `Formulario` (con la opción `dosColumnas`, que reparte sus hijos en una rejilla de dos columnas, y los componentes `ColumnaFormulario` y `FilaCompleta`; en tablet y mobile pasa a una columna) y `Filtros` |
| `CampoContrasena.tsx` | Campo de contraseña con un botón dentro del campo que alterna entre ocultar y mostrar. Es un botón de tipo `button` con etiqueta accesible "Mostrar contraseña" u "Ocultar contraseña". Se usa en `CI_Login`, `CI_Cambiar_Contrasena` y `CI_Restablecer_Contrasena` |
| `PantallaAcceso.tsx` | Bloque público de acceso (login y recuperación): logotipo VESTIGIO sobre fondo amarillo y tarjeta del mismo ancho, centrados en horizontal y en vertical |
| `Tabla.tsx` | Tabla con líneas negras y cabecera en mayúsculas. Fila resaltada con `data-seleccionada="true"`. La propiedad opcional `clase` agrega reglas propias a una sola tabla, sin afectar a las demás: la usan los tres reportes nuevos con `TablaReporte.module.css` y la tabla de piezas del inventario con el CSS Module de `CI_Realizar_Inventario` |
| `BotonesReporte.tsx` | Fila de botones de los reportes: Generar Reporte, Limpiar y Volver a la izquierda, y las exportaciones a la derecha, que solo se ven con un reporte en pantalla. El PDF abre en una pestaña nueva y el Excel se descarga. La usan los reportes de piezas, de exposiciones y de préstamos. El reporte por categoría y estado arma la misma fila en su propia vista. Su CSS Module es `BotonesReporte.module.css` |
| `FiltrosReporte.module.css` | Fila de filtros de los reportes de piezas, exposiciones y préstamos, con un ancho propio por filtro (`.amplio`, `.medio` y `.corto`, con anchos de variables globales). La clase `.medio` quedó sin uso: el reporte de piezas ahora usa clases propias para sus filtros |
| `TablaReporte.module.css` | Reglas comunes de las tablas de los tres reportes nuevos: encabezados que pueden partirse en dos líneas, columnas ajustadas a su contenido (`.ajustada`), códigos, convenios, pólizas y fechas en una sola línea (`.linea`), columna centrada (`.centrada`) y texto secundario bajo un dato principal (`.debajo`) |
| `Ventana.tsx` | Ventana emergente con título, contenido y pie, con un máximo de `--ancho-ventana` (960px). Versión angosta para diálogos. La propiedad `seleccion` usa `--ancho-ventana-seleccion` (960px) y la usan las ventanas de selección de piezas de exposiciones y préstamos. La propiedad `ancha` (hasta `--ancho-maximo`) quedó sin uso. La ventana de selección no tiene reglas propias para tablet y mobile: aplican las generales de `Ventana` |
| `DialogoConfirmacion.tsx` | Ventana angosta con los botones Confirmar y Cancelar |
| `Mensaje.tsx` | Mensaje que queda visible dentro de la pantalla, con tres variantes: éxito (verde), error (rojo) y neutro (gris claro). Texto blanco en éxito y error, borde grueso del proyecto |
| `BotonCopiar.tsx` | Botón "Copiar" que lleva un texto al portapapeles. Al copiar pasa a "Copiada" durante 2,5 segundos y vuelve a "Copiar". El éxito no lanza alerta. Si el navegador impide copiar, lanza una alerta de error. Se usa junto a la contraseña temporal en `CI_Formulario_Usuario` |
| `ContenedorAlertas.tsx` | Monta el `Toaster` de Sonner (una sola vez, en `app/layout.tsx`) y fija su ancho. No define posición ni duración: usa los valores por defecto de Sonner, abajo a la derecha, con entrada desde abajo y 4 segundos de permanencia. Su CSS Module da el estilo: éxito en verde y error en rojo, ambos con texto blanco y borde grueso, con todas las medidas multiplicadas por `--escala-alertas` |
| `alertas.ts` | Helper con `alertaExito` y `alertaError`. Las pantallas no llaman a Sonner directamente. Cada alerta crea su propio id con un contador del módulo y descarta antes la anterior por su id: solo hay una vigente, la anterior hace su salida animada y la nueva entra con su animación |
| `Menu.tsx` | Barra de navegación superior de celdas. El logotipo VESTIGIO tiene siempre fondo amarillo con texto negro, se invierte al pasar el cursor (fondo negro y texto amarillo) y nunca se marca como activo. La opción activa va en amarillo. El logotipo queda como bloque de marca aparte: un espacio con borde a ambos lados lo separa de la primera opción, de modo que no se funde con ella cuando está activa (en mobile ocupa toda la fila). "Cerrar sesión" pasa a fondo rojo con texto blanco al pasar el cursor. Las opciones salen de `lib/navegacion.ts` |
| `Insignia.tsx` | Insignia rectangular para todos los estados (conservación, disponibilidad, exposición, préstamo, inventario, resultado de inventario, activo o inactivo y exhibición o almacén). Un único mapa de estado a color, con el borde grueso del proyecto: verde (Activo, Bueno, Disponible, Vigente, Encontrada, En exhibición), amarillo con texto negro (Regular, En préstamo, En curso, Con daño), rojo (Malo, Vencido, Cancelada, No encontrada, Pendiente de verificación), gris con texto negro (Inactivo, Finalizada, Cerrado, Devuelto, En almacén) y solo borde sin relleno (Programada). Un valor que no está en el mapa recibe el gris. El texto largo se parte en dos líneas (ancho máximo de 12em, texto centrado), así que "Pendiente de verificación" no ensancha su columna, y las de una línea no cambian |
| `Miniatura.tsx` | Imagen cuadrada de una pieza, con recorte centrado y marcador si no tiene. Cinco tamaños: `pequena` (listas dentro de formularios), `seleccion` (ventanas de selección de piezas, de 5rem con `--ancho-miniatura-seleccion`), `lista` (catálogo, llena la celda de su columna), `grande` (historial, actualizar estado y vista previa del formulario) y `detalle` (pantalla de detalle). El marcador mide lo mismo que una imagen real |
| `BuscadorPiezas.tsx` | Buscador de piezas. Seis filtros en una fila (Código, Nombre, Categoría, Estado, Disponibilidad y Museo, sin Ubicación; con el museo fijo quedan cinco) y botones Buscar y Limpiar. La búsqueda se ejecuta al pulsar Buscar o Enter dentro de un campo de texto, no al cambiar un filtro. Limpiar vacía los filtros y vuelve a mostrar la lista completa. Sobre la tabla muestra "N piezas" (o "1 pieza") y, con filtros aplicados, "X de N piezas", y "No se encontraron piezas" si no hay coincidencias. El orden es por código (`compararCodigos`). Modos: catálogo (acciones por fila; parte de la lista cargada por la página), selección múltiple y selección única (ambos consultan al abrir). El catálogo tiene siete columnas: Imagen, Código (con el código anterior debajo, en texto secundario, solo si existe), Nombre (con la categoría debajo), Estado, Disponibilidad, Museo y Acciones. Ubicación y Situación pasan a la pantalla de detalle. La columna Acciones tiene cinco botones del mismo tamaño, apilados: Ver detalle, Editar, Actualizar estado de conservación, Ver historial y Generar ficha técnica. Los modos de selección (exposiciones y préstamos) tienen seis columnas: Elegir, Imagen, Código, Nombre con la categoría debajo (como en el catálogo), Estado y Disponibilidad, con la miniatura de 5rem en una columna de ancho fijo y el código en una sola línea. En la selección única (préstamos) los filtros son solo Código y Nombre, más Buscar y Limpiar, y la lista muestra solo las piezas con disponibilidad "disponible" de los museos de la persona: el filtro lo aplica el servidor con `soloDisponibles` en `buscarPiezas`, también en la carga inicial, y la línea de resultado cuenta solo esas piezas. La ventana de exposiciones y el catálogo conservan todos sus filtros. La línea de resultado sale de `lib/resultadoBusqueda.ts`. Si la página le entrega una lista inicial nueva (por ejemplo tras refrescar la ruta después de cancelar o modificar), actualiza el total y vuelve a consultar conservando los filtros aplicados. |
| `BuscadorExposiciones.tsx` | Buscador de exposiciones, que funciona como el de piezas en sus dos modos (lista y ventana de selección única): filtros de Nombre, Vigencia y Museo, botones Buscar y Limpiar al final de la fila, búsqueda al pulsar Buscar o Enter dentro de un campo de texto (no al cambiar un filtro), y línea de resultado "N exposiciones", "1 exposición" o "X de N exposiciones" (N es el total visible para la persona), con "No se encontraron exposiciones" si no hay coincidencias. El orden es por fecha de inicio, de la más reciente a la más antigua, aplicado al final de `buscarExposiciones`. Si la página le entrega una lista inicial nueva (por ejemplo tras refrescar la ruta después de cancelar o modificar), actualiza el total y vuelve a consultar conservando los filtros aplicados. |
| `Buscador.module.css` | Estilos compartidos de los dos buscadores y anchos de las columnas de la tabla de piezas |

El menú y las tarjetas de acceso del Inicio salen de la misma lista (`lib/navegacion.ts`), con el mismo orden y los mismos permisos: Piezas, Exposiciones, Préstamos, Inventarios y Reportes para ambos roles, y Usuarios y Museos solo para el administrador. La opción Reportes lleva a `/reportes` y queda activa tanto en el menú de reportes como en la pantalla del reporte. El menú ocupa todo el ancho de la pantalla. Las tarjetas del Inicio son 7 para el administrador y 5 para el colaborador, en una cuadrícula de 12 columnas con filas de 4 y 3 (administrador) o de 3 y 2 (colaborador). Cada tarjeta tiene borde completo y las vecinas comparten una sola línea. En tablet pasa a 2 columnas, con la última tarjeta a todo el ancho si queda sola, y en mobile a 1 columna.

**Selectores con placeholder.** `Seleccion` trata como placeholder la opción de valor vacío cuyo texto empieza con "Selecciona" (por ejemplo "Selecciona un tipo"): la renderiza deshabilitada y oculta, así que se ve como texto inicial del campo vacío, no se puede elegir y no aparece en la lista abierta. Con un valor ya elegido, como al editar, no se muestra. Los controladores tratan un valor ausente como vacío y devuelven su mensaje de campo obligatorio. Límite del criterio: se reconoce por convención de texto, así que una opción vacía nueva cuyo texto empiece con "Selecciona" se tratará como placeholder, y un placeholder con otro texto no se ocultará. Las opciones vacías de los filtros ("Todas", "Todos") no se tocan.

| Con placeholder | Sin placeholder |
|-|-|
| Tipo en `CI_Formulario_Museo` | Rol en `CI_Formulario_Usuario` |
| Categoría, Estado de conservación y Museo en `CI_Formulario_Pieza` | Categoría y Estado en `CI_Reporte_Categoria_Estado` ("Todas" y "Todos") |
| Museo sede en `CI_Formulario_Exposicion` | Categoría, Estado, Disponibilidad y Museo en `BuscadorPiezas` ("Todas" y "Todos") |
| Museo en `CI_Importar_Piezas` | Vigencia y Museo en `BuscadorExposiciones` |
| Museo en la ventana de `CI_Menu_Inventarios` | Museo, Disponibilidad, Estado y Situación en `CI_Reporte_Piezas`, `CI_Reporte_Exposiciones` y `CI_Reporte_Prestamos` ("Todos" y "Todas") |
| Nuevo estado en `CI_Actualizar_Estado` | |
| Estado al regresar en `CI_Devolucion_Prestamo` | |

## 6. Estilos

- **Variables globales:** `app/globals.css`, en `:root`. Ahí están colores, tipografías, tamaños de texto, grosores de borde, espaciados, medidas y las medidas de las alertas. Ningún otro archivo define valores de diseño sueltos: los CSS Modules usan `var(...)`.
- **Ancho del contenido:** `--ancho-maximo` vale 1400px (antes 1200px) y lo usa el contenedor de todas las vistas, con relleno lateral para que en pantallas menores ocupe el ancho disponible. El menú queda a todo el ancho. Las pantallas de acceso no cambian.
- **Formularios:** la tarjeta de formulario (`Celda estrecha`) mantiene su ancho (`--ancho-formulario`) y queda centrada horizontalmente bajo el encabezado, resuelto en un solo punto, `Celda.module.css`. Los formularios de registrar y editar pieza usan `Celda ancha` (`--ancho-formulario-doble`) y dos columnas; en tablet y mobile la tarjeta vuelve al ancho estrecho y una columna.
- **Página 404 y alto de pantalla:** la variable `--texto-codigo-error` (tamaño del 404) tiene valor de escritorio y se redefine dentro de las dos media queries existentes. Cambio global: el `body` pasó a ser una columna flex con `min-height: 100dvh` y `.contenedor` recibió `flex: 1`, para centrar el recuadro de la 404 en vertical con y sin menú. En las demás pantallas el contenido sigue arriba.
- **Variables nuevas de medidas y tamaño de texto:** `--texto-destacado` (nombre de la pieza en el catálogo), `--ancho-columna-imagen` y `--ancho-columna-acciones` (columnas de la tabla de piezas), `--alto-boton-compacto` (botones de acciones), `--ancho-imagen-detalle` (imagen de la pantalla de detalle) y `--ancho-formulario-doble`. La miniatura del catálogo llena la celda de su columna y no tiene variable propia.
- **Filtros y tablas de los reportes nuevos:** los anchos salen de variables de `app/globals.css`: `--ancho-filtro-amplio`, `--ancho-filtro-medio`, `--ancho-filtro-corto` y, para los filtros de Museo y de Disponibilidad del reporte de piezas, `--ancho-filtro-museo-piezas` y `--ancho-filtro-disponibilidad-piezas`, más `--crecimiento-filtro-principal` y `--crecimiento-filtro-fecha`, que reparten el espacio sobrante de la fila en proporción. Cada filtro tiene el ancho que necesita su contenido y la fila llena el ancho de la sección. En las tablas, cada columna toma su ancho de su contenido, los encabezados pueden partirse en dos líneas y los códigos, convenios, pólizas y fechas no se parten. En escritorio la tabla cabe sin desplazamiento horizontal, que queda como respaldo en pantallas menores (el contenedor de `Tabla` tiene `overflow-x: auto`).
- **Fuentes:** `app/layout.tsx` carga Anton (títulos) e Inter (texto) con `next/font` y expone `--fuente-anton` y `--fuente-sans`, que `globals.css` usa en `--tipografia-titulos` y `--tipografia-texto`.
- **CSS Modules:** cada componente tiene su `Nombre.module.css` al lado, con clases locales importadas como `estilos`.
- **Dirección visual:** brutalista editorial de retícula. Fondo crema suave, texto negro, bordes negros gruesos y rectos, sin sombras ni esquinas redondeadas, un acento amarillo, un rojo para errores y un verde para éxitos.
- **Alertas de Sonner:** 20 por ciento más grandes que el tamaño por defecto, con éxito en verde y error en rojo, ambos con texto blanco y el borde grueso del proyecto (que no se escala). Medidas base y escala en `:root`: `--escala-alertas` (1.2), `--alerta-ancho` (356px), `--alerta-texto` (13px), `--alerta-icono` (20px) y `--alerta-separacion` (6px).
- **Paleta (variables de `:root`):**

| Variable | Valor | Dónde se usa |
|-|-|-|
| `--color-fondo` | `#f6f0e1` (crema suave, antes `#ffffff`) | Fondo del sitio, celdas y encabezados de página, tarjetas de acceso del Inicio, menú, tablas, campos (incluida la caja de contraseña), botones secundarios, cuerpo de las ventanas, alertas por defecto de Sonner y la insignia Programada. También es el color del texto del botón principal, de las etiquetas negras de las celdas y de la cabecera de las tablas |
| `--color-texto` | `#000000` | Texto, bordes, botón principal, cabecera de tablas y texto de las insignias amarillas, grises y de solo borde |
| `--color-acento` | `#ffe600` | Opción activa y logotipo del menú, logotipo de las pantallas de acceso, hover de botones, enlaces y tarjetas del Inicio, cabecera de ventanas, fila seleccionada, anillo de foco e insignias amarillas |
| `--color-error` | `#e10600` | Mensaje y alerta de error, insignias rojas, texto de error por campo, hover de Cerrar sesión y botón de peligro (texto, borde y fondo al pasar el cursor) |
| `--color-sobre-error` | `#ffffff` | Texto sobre el rojo (mensaje, alerta, insignias rojas y hover de Cerrar sesión y del botón de peligro) |
| `--color-exito` | `#1a7f37` | Mensaje y alerta de éxito e insignias verdes |
| `--color-sobre-exito` | `#ffffff` | Texto sobre el verde (mensaje, alerta e insignias verdes) |
| `--color-gris` | `#d9d9d9` | Botón deshabilitado, miniaturas, fila de totales e insignias grises |
| `--color-gris-claro` | `#f2f2f2` | Datos de solo lectura y Mensaje neutro |
| `--color-resalte-fila` | `#fff7a8` | Hover de fila y de enlaces del menú, foco de campos |
| `--color-velo` | `rgba(0, 0, 0, 0.6)` | Fondo detrás de las ventanas emergentes |

Esta paleta es la base vigente y puede ajustarse. El texto sobre rojo y sobre verde sigue siendo blanco puro porque usa sus propias variables (`--color-sobre-error` y `--color-sobre-exito`), que no cambian con `--color-fondo`.

- **Responsive, desktop first:** los estilos base son de escritorio y se adapta hacia abajo. Solo existen estas dos media queries, en los CSS Modules y en los estilos globales:

| Variación | Media query |
|-|-|
| Tablet | `@media (max-width: 1025px)` |
| Mobile | `@media (max-width: 768px)` |

No se permiten otros puntos de quiebre ni otros valores.

## 7. Reglas de negocio vigentes

Implementadas en los controladores.

**Permisos y aislamiento por organización**
- Toda lectura y escritura se filtra por la organización de la persona en sesión (`lib/permisos.ts` y `lib/controllers/utilidades.ts`).
- Administrador: ve todos los museos de su organización. Es el único que accede a Usuarios y a Museos. Un colaborador que abre esas rutas vuelve a `/`.
- Colaborador: ve y modifica solo los museos que tiene asignados. Una pieza, exposición, préstamo o inventario de otro museo no se encuentra (404 o mensaje).
- Los permisos se validan en los controladores, no solo en el menú. No hay registro público: las cuentas las crea el administrador.

**Acceso**
- El login valida por campo, tanto en la vista como en el controlador: correo vacío, correo con formato inválido y contraseña vacía. No valida la longitud ni otras reglas de contraseña. Las credenciales incorrectas y la cuenta desactivada muestran un mensaje general, sin indicar qué campo falló.
- La recuperación de contraseña es solo interfaz: no envía correo, no consulta usuarios y no modifica contraseñas.

**Usuarios y museos**
- El correo es único. Al crear una cuenta se genera una contraseña temporal de 10 caracteres, con `randomInt` de `node:crypto` y un alfabeto sin caracteres ambiguos (0, O, 1, l e I), que se muestra una sola vez junto a un botón "Copiar". La cuenta queda con cambio de contraseña obligatorio. Con contraseña temporal solo se permite `/cambiar-contrasena`.
- La contraseña nueva, en el cambio de contraseña y en la pantalla de nueva contraseña, debe tener entre 10 y 15 caracteres, validado en la vista y en el controlador con las constantes de `lib/validaciones.ts`. La temporal y la de demostración (`Museos2026`) cumplen esa misma regla.
- Todo usuario, de cualquier rol, necesita al menos un museo: `registrarUsuario` y `actualizarUsuario` devuelven "Selecciona al menos un museo" sin mirar el rol. Esa regla coincide con ECUS01, que pide seleccionar uno o más museos. Si no hay museos activos, el formulario muestra un `Mensaje` neutro con "No hay museos registrados. Registra un museo para poder asignarlo." y el botón "Registrar museo" hacia `/museos/nuevo`; mientras no exista un museo activo no se puede registrar ningún usuario.
- Una cuenta desactivada no puede iniciar sesión, y si se desactiva con sesión abierta su siguiente petición queda sin sesión. Nadie puede desactivar su propia cuenta ni cambiar su propio rol.
- Desactivar y activar usuarios y museos piden confirmación. Activar conserva los museos asignados y el historial.
- Desactivar un museo no borra nada: deja de ofrecerse en las listas de selección de formularios nuevos, pero sus piezas y exposiciones siguen visibles. El nombre de un museo es único dentro de la organización. El tipo de colección es obligatorio y debe ser uno de los cinco valores.

**Piezas**
- El código lo asigna el sistema y es inmutable (prefijo del museo, guion y correlativo, sección 4). La persona no lo escribe y el formulario no tiene campo de código. El código anterior es opcional, de máximo 40 caracteres y único dentro del museo. La categoría se elige de las categorías de la organización. Una pieza nueva queda `disponible`.
- El año es opcional y se valida con `validarAnio` en registrar, editar e importar: se recorta el texto, solo se acepta un signo menos opcional seguido de dígitos (sin decimales, notación científica, hexadecimales ni signo más), con "El año debe ser un número entero", y debe estar entre -10000 y el año actual, calculado en el servidor al validar, con "El año debe estar entre -10000 y el año actual". El campo de la vista lleva `min` y `max`, pero manda el controlador.
- Registrar una pieza a mano no genera historial. Editarla genera un registro por cada campo que cambia (código anterior, nombre, categoría, descripción, año, material, ubicación física, imagen), y guardar sin cambios no genera registros. Tras guardar con éxito, registrar y editar vuelven al catálogo. El estado de conservación se cambia solo desde Actualizar estado y el museo de una pieza no se puede cambiar.
- Actualizar estado rechaza el mismo estado actual ("El estado seleccionado es el mismo que el actual"), exige elegir un estado ("Selecciona el nuevo estado") y registra el cambio en el historial. Tras guardar con éxito vuelve al catálogo.
- Imagen: PNG o JPG de máximo 1 MB, guardada como data URL en memoria. El formulario sugiere una imagen cuadrada de 800 x 800 px con un texto de ayuda, sin validar las dimensiones. En el catálogo y en el detalle la imagen se muestra cuadrada y con recorte centrado, y el marcador ocupa el mismo cuadrado que una imagen real.
- La pantalla de detalle (`/piezas/[id]`) muestra la imagen grande y todos los datos: código, código anterior (solo si existe), nombre, categoría, descripción, año, material, estado de conservación, disponibilidad, situación (en exhibición o en almacén), ubicación física, museo y fecha de registro. Los opcionales vacíos se muestran con un guion simple. Tiene las acciones Editar, Actualizar estado de conservación, Ver historial, Generar ficha técnica y Volver al catálogo.
- La situación "en exhibición" o "en almacén" se calcula por las exposiciones vigentes y es independiente de la disponibilidad.

**Importación de piezas**
- Solo .xlsx de máximo 5 MB y 500 filas, con los encabezados de la plantilla. Se valida fila por fila (obligatorios: nombre, categoría y estado; categoría existente; estado válido; año con la regla compartida de `validarAnio`; y, solo cuando la celda tiene valor, código anterior de máximo 40 caracteres, no registrado en el museo y no repetido en el archivo).
- La pantalla muestra el campo "Museo de destino" con la ayuda "Todas las piezas del archivo se registrarán en este museo" y, bajo el campo de archivo, la ayuda "Solo archivos .xlsx, de máximo 5 MB y 500 filas", cuyos valores salen de `lib/limitesImportacion.ts`.
- La plantilla tiene las columnas Nombre, Categoría, Descripción, Año, Material, Estado de conservación, Ubicación física y Código anterior (opcional). No tiene columna de código. La vista previa no muestra códigos.
- El servidor vuelve a validar todo antes de insertar y asigna los códigos correlativos a las piezas válidas en el orden de las filas del archivo. Las piezas quedan `disponible` y cada una registra "alta por importación" en el historial.

**Exposiciones**
- Estado: cancelada si así está marcada. Si no, se calcula por fechas con la fecha de fin exclusiva: programada, vigente o finalizada. No existe un campo de estado.
- Registrar y modificar exigen al menos una pieza ("Agrega al menos una pieza a la exposición"), validado en el controlador y también en la vista.
- Ninguna de las dos fechas puede superar los 3 años desde hoy ("Las fechas no pueden superar los 3 años desde hoy"). El límite es `LIMITE_ANIOS_FECHAS` en `lib/constantes.ts` (antes `LIMITE_ANIOS_FECHAS_EXPOSICION`), la fecha tope sale de `fechaLimite()` en `lib/fechas.ts` (antes `fechaLimiteExposicion()`) y los campos de fecha de la vista llevan `max` con ese tope, pero manda el controlador.
- Hoy no hay restricción de fechas pasadas: se puede registrar o modificar con fechas anteriores a hoy, y si la fecha de fin ya pasó la exposición queda finalizada y no se puede modificar ni cancelar.
- Solo se pueden modificar o cancelar exposiciones no finalizadas y no canceladas. Cancelar conserva la lista de piezas como registro, pero la exposición ya no cuenta para cruces ni para "en exhibición".
- Al guardar se valida, en este orden: fechas (la de fin posterior a la de inicio), tope de 3 años en las dos fechas, al menos una pieza, museo de las piezas igual al museo sede, y disponibilidad de cada pieza. Una pieza no se puede asignar si hay un préstamo abierto cuyo rango (salida a devolución prevista) se cruza con el de la exposición, ni si está en otra exposición no cancelada con fechas cruzadas. Si hay conflictos no se guarda nada y se listan las piezas en un `Mensaje` visible.

**Préstamos**
- Un préstamo admite una sola pieza: `Prestamo.piezaId` es un único texto y no existe tabla intermedia.
- Al registrar se valida en el controlador, en este orden: campos completos y devolución prevista posterior a la salida (mensaje general sin cambios), fecha de salida no posterior a hoy, tope de la devolución prevista, longitudes de los textos, valor asegurado y, después, pieza, disponibilidad y cruces con exposiciones.
- La fecha de salida no puede ser posterior a hoy ("La fecha de salida no puede ser posterior a hoy"), con `hoyISO()` en el servidor. El campo de la vista lleva `max` y aparece completado con la fecha de hoy del servidor, y se puede cambiar.
- La devolución prevista no puede superar los 3 años desde hoy ("La fecha de devolución no puede superar los 3 años desde hoy"), con `LIMITE_ANIOS_FECHAS` y `fechaLimite()`, que también usan las exposiciones. El campo de la vista lleva `max`.
- El valor asegurado se valida con `validarValorAsegurado`: solo dígitos con hasta 2 decimales con punto, mayor que cero y máximo 100.000.000. Rechaza notación científica, hexadecimales, signos y separadores de miles, con "El valor asegurado debe ser un número mayor que cero, con hasta 2 decimales, y no superar 100 millones". El campo de la vista lleva `min`, `max` y `step`.
- Longitudes máximas: 100 caracteres en institución destino y en responsable que recibe, y 40 en número de convenio y de póliza, con `maxLength` en la vista y sus cuatro mensajes. En el controlador mandan las validaciones. La vista valida antes de enviar la fecha de salida, el tope y el valor con los mismos mensajes, y las longitudes con `maxLength`.
- Solo se presta una pieza con disponibilidad `disponible` y sin cruce con exposiciones no canceladas. Al crear el préstamo, el estado de salida se toma del estado actual de la pieza, la pieza pasa a `en_prestamo` y se registra en el historial.
- En registrar devolución, el selector de estado de conservación al regresar arranca vacío con el placeholder "Selecciona el estado de conservación de la pieza" (la constante `MENSAJE_PRESTAMO_ESTADO_DEVOLUCION`), no preselecciona el estado de salida y vuelve a quedar vacío al elegir otro préstamo. Sin estado, vista y controlador rechazan con ese mismo mensaje.
- Al registrar la devolución se guarda la fecha real (hoy) y el estado de devolución. El estado de la pieza pasa a ser ese estado (con historial solo si cambia), la pieza vuelve a `disponible` y se registra en el historial.
- La situación (En préstamo, Vencido, Devuelto) se calcula y no se guarda.

**Inventario físico**
- Se hace por museo activo y asignado. Solo puede haber un inventario en curso por museo. Las piezas esperadas son las del museo, menos las que están en préstamo. Cada inventario registra quién lo inició (`usuarioId`) y quién lo cerró (`usuarioCierreId`, vacío mientras está en curso).
- Cada marca (Encontrada, No encontrada, Con daño, con observación opcional) se guarda al marcarla. No se puede cerrar hasta marcar todas las piezas esperadas.
- Cerrar guarda a la persona de la sesión como quien lo cerró (`usuarioCierreId`). Puede cerrar cualquier persona con acceso al museo del inventario, administrador incluido, y no solo quien lo inició: no existe una restricción de cierre por persona. Las validaciones son las de siempre, en este orden: el inventario existe y la persona tiene acceso a su museo y a su organización (si no, "No se encontró el inventario"), no está ya cerrado y todas las piezas esperadas están marcadas. Una persona sin acceso al museo recibe el mismo mensaje de siempre.
- Al cerrar: las no encontradas pasan a `pendiente_verificacion`; toda pieza encontrada (Encontrada o Con daño) que estuviera pendiente de verificación vuelve a `disponible`; las marcadas Con daño pasan a estado `malo` si no lo estaban. Cada cambio se registra en el historial, a nombre de quien cierra. Estos efectos no cambiaron. Un inventario cerrado se abre en solo lectura con su resumen.
- La pantalla del inventario (`CI_Realizar_Inventario`) muestra "Iniciado por" (antes "Responsable") y, solo con el inventario cerrado, "Cerrado por" (un guion simple si no hubiera persona de cierre). Los dos textos son constantes de `lib/constantes.ts` (`ETIQUETA_INVENTARIO_INICIADO_POR` y `ETIQUETA_INVENTARIO_CERRADO_POR`). `InventarioListado` trae `iniciadoPorNombre` y `cerradoPorNombre`. La lista de inventarios (`CI_Menu_Inventarios`) no muestra personas.
- En la tabla de piezas esperadas (y de piezas contadas, con el inventario cerrado), el código va siempre en una sola línea y la columna Guardado es angosta, con lo justo para su texto. Las reglas están solo en el CSS Module de esa pantalla, aplicadas con la propiedad `clase` de `Tabla`, así que no afectan a las demás tablas.
- Inventarios no tiene caso de uso en el informe, y este cambio no altera ECUS01 a ECUS06.

**Reportes y ficha técnica**
- El menú de reportes (`/reportes`, `CI_Menu_Reportes`) muestra cuatro tarjetas que salen de la lista `REPORTES` de `lib/navegacion.ts` (id, título, detalle, ruta y disponible). Las cuatro están conectadas, con su ruta y `disponible` en verdadero: Reporte por categoría y estado (`/reportes/categoria-estado`), Reporte de piezas (`/reportes/piezas`), Reporte de exposiciones (`/reportes/exposiciones`) y Reporte de préstamos (`/reportes/prestamos`). Un reporte con `disponible` en falso se muestra sin enlace, con la etiqueta "Próximamente" (`ETIQUETA_PROXIMAMENTE`), pero hoy no hay ninguno. Los textos son constantes de `lib/constantes.ts` (entre ellas `TITULO_REPORTE`, `TITULO_RESULTADOS_REPORTE`, `DETALLE_REPORTES_INICIO` y los títulos y detalles de los reportes nuevos).
- `generarReporte` recibe categoría, estado, desde y hasta (vacío significa no usado) y comparte con las exportaciones la lógica de `calcularReporte`, dentro de `CC_Reporte`. Valida la sesión, que desde no sea posterior a hasta ("La fecha desde no puede ser posterior a la fecha hasta") y que haya resultados ("No se encontraron resultados para los filtros aplicados"). No valida que la categoría o el estado existan. Filtra por la fecha de registro de la pieza, con los extremos incluidos, tomando el día de la fecha de registro en la zona de Lima (`diaLocal`). Respeta los museos visibles (el colaborador solo los asignados, el administrador todos los de su organización, incluidos los inactivos) y no filtra por museo.
- El resultado se agrupa por categoría (orden alfabético en español, sin categorías vacías), con el conteo Bueno, Regular y Malo, el total de cada fila y una fila "Totales". Un error o un aviso se muestran como alerta y quitan el reporte mostrado.
- La pantalla del reporte (`/reportes/categoria-estado`, `CI_Reporte_Categoria_Estado`) tiene el título "Reporte por categoría y estado", con la etiqueta "Reportes", la sección de filtros y, tras generar, la sección "Total de piezas por categoría y estado". Los botones de la izquierda son "Generar Reporte", "Limpiar" (vacía los filtros y quita el reporte mostrado) y "Volver" (lleva a `/reportes`).
- Los botones "Exportar a PDF" y "Exportar a Excel" van a la derecha de la misma fila y solo se ven con un reporte en pantalla. Usan los filtros con los que se generó el reporte, no los valores actuales de los campos. El botón de PDF abre el archivo en una pestaña nueva y el de Excel lo descarga. Las rutas son `/reportes/categoria-estado/pdf` y `/reportes/categoria-estado/excel`, y la acción `exportarReporte` de `CC_Reporte` (formato y filtros) recalcula el reporte con `calcularReporte`, con la sesión y los museos visibles, sin confiar en los datos de la pantalla. Los filtros viajan como parámetros de la dirección (`lib/reporteParametros.ts`).
- Ambos archivos llevan el título, la fecha y hora de generación (hora de Lima), la persona que lo generó, los filtros ("Todas", "Todos" o "Sin límite") y la tabla con la fila "Totales". El PDF se genera con `@react-pdf/renderer` y el Excel con ExcelJS (hoja "Reporte"), en `lib/exportacionReporte.tsx`. Los nombres son `reporte_categoria_estado_AAAA-MM-DD.pdf` y `.xlsx`, con el día de Lima. El PDF se responde inline con `respuestaPdf`, para verlo en el visor del navegador. Con filtros inválidos o sin resultados responden 400 con el texto del error y sin archivo, y sin sesión redirigen a `/login`.
- **Reporte de piezas** (`/reportes/piezas`, `CI_Reporte_Piezas`). Filtros: Museo, Disponibilidad, y Desde y Hasta sobre la fecha de registro de la pieza (día de Lima, extremos incluidos). No filtra por categoría ni por estado de conservación, que son del reporte por categoría y estado. Columnas: Código, Nombre, Categoría, Estado, Disponibilidad, Museo, Ubicación y Fecha de registro, con el total de piezas ("Total de piezas"). Orden por nombre de museo y luego por código (`compararCodigos`). Título de resultados: "Listado de piezas por museo".
- **Reporte de exposiciones** (`/reportes/exposiciones`, `CI_Reporte_Exposiciones`). Filtros: Museo, Estado (programada, vigente, finalizada o cancelada), y Desde y Hasta. El rango pedido incluye los dos extremos y se cruza con el de cada exposición con `rangosSeCruzan`, que usa la fecha de fin exclusiva (el extremo Hasta se pasa a su día siguiente con `diaSiguiente`). Una fila por exposición, con sus piezas en una columna (una pieza por línea). Columnas: Nombre, Museo, Estado, Inicio, Fin, Cantidad de piezas y Piezas. Total: "Total de exposiciones". Orden por fecha de inicio, de la más reciente a la más antigua.
- **Reporte de préstamos** (`/reportes/prestamos`, `CI_Reporte_Prestamos`). Filtros: Museo (el de la pieza, por `PrestamoListado.museoId`), Situación (en préstamo, vencido o devuelto), Institución destino (`coincideTexto`, coincidencia parcial sin mayúsculas ni tildes) y Desde y Hasta sobre la fecha de salida, con los extremos incluidos. Once columnas: Pieza (el código y, debajo, el nombre), Museo, Institución destino, Responsable, Convenio, Póliza, Valor asegurado, Salida, Devolución prevista, Devolución real y Situación. Total: "Total de préstamos". Orden por fecha de salida, de la más reciente a la más antigua.
- **Acciones de los tres reportes nuevos** (`CC_Reporte`): `cargarReportePiezas`, `generarReportePiezas`, `exportarReportePiezas`, `cargarReporteExposiciones`, `generarReporteExposiciones`, `exportarReporteExposiciones`, `cargarReportePrestamos`, `generarReportePrestamos` y `exportarReportePrestamos`. Cada `cargar*` devuelve los museos para el selector. Cada reporte comparte su cálculo entre `generar*` y `exportar*`.
- **Seguridad y validación de los reportes nuevos.** Parten solo de `piezasVisibles`, `exposicionesVisibles` y `prestamosVisibles` (de `lib/controllers/utilidades.ts`), así que un colaborador solo ve los museos asignados. Orden de validación: sesión, acceso al museo ("No tienes acceso al museo seleccionado"), valores permitidos de estado, disponibilidad y situación ("Alguno de los filtros del reporte no es válido"), formato AAAA-MM-DD de las fechas ("Las fechas del reporte deben tener el formato AAAA-MM-DD"), rango de fechas (`MENSAJE_RANGO_FECHAS_INVALIDO`) y resultados (`MENSAJE_SIN_RESULTADOS`). Los dos últimos mensajes son constantes que usa también el reporte por categoría y estado. La exportación recalcula el reporte en el servidor, con la sesión y los filtros recibidos, sin confiar en los datos de la pantalla. Los selectores de museo muestran los museos visibles, incluidos los inactivos.
- **Exportación de los tres reportes nuevos.** Cada uno tiene PDF y Excel en `/reportes/<reporte>/pdf` y `/reportes/<reporte>/excel`, con los nombres `reporte_piezas_AAAA-MM-DD`, `reporte_exposiciones_AAAA-MM-DD` y `reporte_prestamos_AAAA-MM-DD` (`.pdf` y `.xlsx`, con el día de Lima). Los filtros viajan como parámetros de la dirección (`mapaAParametros` y `parametrosAMapa` de `lib/reporteParametros.ts`). El archivo lleva título, fecha y hora de generación, la persona, los filtros ("Todos", "Todas" o "Sin límite") y la tabla con su total. Los genera `lib/exportacionTabla.tsx`: el PDF es apaisado, con el encabezado fijo en cada página y filas que no se parten, y el Excel tiene la hoja "Reporte" con el valor asegurado como número con 2 decimales. Las proporciones de las columnas coinciden con las de la pantalla (ancho relativo en el PDF y anchos en el Excel). Con filtros inválidos o sin resultados responden 400 con el texto del error y sin archivo.
- **Pantallas de los reportes nuevos.** Tienen la misma forma que la del reporte por categoría y estado: filtros, los botones Generar Reporte, Limpiar y Volver con las exportaciones a la derecha, y el resultado. Los filtros llenan el ancho de la fila, cada uno con el ancho de su contenido. La tabla de cada reporte usa `Tabla` con la propiedad `clase`.
- La ficha técnica es un PDF de una página, que se responde inline con `respuestaPdf`. Incluye el código, el código anterior solo si existe, y la imagen solo si es un data URL PNG o JPG. Sin imagen dibuja un recuadro con el texto "Sin imagen".

## 8. Guía rápida

| Si quiero cambiar | Voy a |
|-|-|
| Colores, bordes, espaciados o tamaños de texto | Variables de `:root` en `app/globals.css` |
| La página 404 (textos, aspecto o botón) | `app/not-found.tsx`, `app/not-found.module.css` y sus textos en `lib/constantes.ts` |
| Las fuentes | `app/layout.tsx` (carga) y `app/globals.css` (variables de tipografía) |
| Valores fijos, etiquetas, roles o tipos de colección | `lib/constantes.ts` |
| Las opciones del menú y las tarjetas del Inicio | `lib/navegacion.ts` |
| Las validaciones de correo, contraseña y año compartidas | `lib/validaciones.ts` |
| El prefijo del museo, el código de la pieza o su orden | `lib/codigos.ts` (y su uso en `lib/data/memoria/index.ts`) |
| El ancho máximo del contenido | `--ancho-maximo` en `app/globals.css` |
| Los colores de alertas y mensajes, o el tamaño de las alertas | Variables de `:root` en `app/globals.css`, `components/ui/ContenedorAlertas.module.css` y `components/ui/Mensaje.module.css` |
| El tratamiento del placeholder de los selectores | `Seleccion` en `components/ui/Campo.tsx` |
| Las categorías | Datos de la organización: `lib/data/memoria/semilla.ts`. No hay pantalla para gestionarlas (y, más adelante, la tabla `categoria`) |
| Un campo o tipo del modelo | `lib/tipos.ts` y `prisma/schema.prisma` |
| Los datos de demostración o las cuentas | `lib/data/memoria/semilla.ts` y `README.md` |
| Una regla de negocio o un mensaje | El controlador del caso en `lib/controllers/CC_*.ts` |
| Cómo se calcula el estado de una exposición, la situación de un préstamo o el cruce de fechas | `lib/fechas.ts` |
| Quién puede ver qué museo | `lib/permisos.ts` y `lib/controllers/utilidades.ts` |
| Una pantalla (campos, botones, textos) | `components/CI_*/CI_*.tsx` y su CSS Module |
| Un componente compartido (botón, tabla, ventana, alerta) | `components/ui/` |
| Los filtros o columnas de los buscadores | `components/ui/BuscadorPiezas.tsx` o `BuscadorExposiciones.tsx`, y los anchos en `Buscador.module.css` |
| Los campos o el orden del formulario de pieza | `components/CI_Formulario_Pieza/CI_Formulario_Pieza.tsx` |
| El menú de navegación | `components/ui/Menu.tsx` y `Menu.module.css` |
| La plantilla o la validación del Excel | `lib/importacion.ts` y `lib/controllers/CC_Importacion.ts` |
| El diseño del PDF de la ficha técnica | `lib/ficha.tsx` |
| La lista de reportes del menú de reportes | `REPORTES` en `lib/navegacion.ts` y sus textos en `lib/constantes.ts` |
| La lógica del reporte por categoría y estado o el contenido de sus archivos | `lib/controllers/CC_Reporte.ts` y `lib/exportacionReporte.tsx` |
| Los reportes de piezas, exposiciones y préstamos: filtros, columnas, orden o validaciones | `lib/controllers/CC_Reporte.ts`, con sus textos y etiquetas en `lib/constantes.ts` |
| El PDF y el Excel de esos tres reportes, o el ancho relativo de sus columnas | `lib/exportacionTabla.tsx` y las columnas de cada reporte en `lib/controllers/CC_Reporte.ts` |
| Que un PDF se abra en el visor o se descargue | `lib/respuestaPdf.ts` y `BotonEnlace` en `components/ui/Boton.tsx` |
| Los anchos de filtros y de columnas de los reportes nuevos | Variables de ancho en `app/globals.css`, `components/ui/FiltrosReporte.module.css`, `components/ui/TablaReporte.module.css` y el CSS Module de cada reporte |
| La zona horaria o cualquier cálculo y formato de fechas | `ZONA_HORARIA` en `lib/constantes.ts` y `lib/fechas.ts` |
| El límite de tamaño de las Server Actions | `next.config.ts` |
| Una ruta nueva | Carpeta nueva en `app/` con su `page.tsx`, que llama a un controlador y pasa los datos a una vista `CI_` |
| Cómo funciona la sesión o el login | `lib/auth/session.ts` |
| Una variable de entorno | `lib/config/env.ts`, `.env.example` y `.env.local` |
| Pasar de memoria a base de datos | `lib/data/prisma/`, `lib/data/index.ts` y `docs/CONEXION.md` |
| El marcador de las piezas sin imagen | `public/piezas/sin-imagen.svg` y `IMAGEN_MARCADOR` en `lib/constantes.ts` |

## 9. Convenciones

- **Prefijos:** `CI_` es una clase de interfaz (una pantalla) y `CC_` es una clase de control (la lógica de un caso). Las entidades no llevan prefijo. Estos nombres aparecen en el informe y no se cambian.
- **Capas:** las vistas no leen ni escriben datos. Solo los controladores llaman a la capa de datos y a la sesión. Todas las funciones de controladores y de la capa de datos son asíncronas.
- **Ids:** texto con formato uuid en todas las entidades. En la semilla son fijos y los registros nuevos usan `crypto.randomUUID()`. Rutas, cookie de sesión, formularios y controladores trabajan con texto, sin `parseInt` ni `Number` sobre ids.
- **Valores fijos:** se guardan en minúscula y se muestran con su etiqueta, que está centralizada en `lib/constantes.ts`.
- **Alertas:** los mensajes de éxito y de error de las acciones se muestran como alertas con `alertaExito` y `alertaError` (Sonner). `Mensaje` se reserva para lo que debe quedar visible dentro de la pantalla, con su variante: éxito (la contraseña temporal y el resultado de la importación), error (la lista de piezas en conflicto, "No hay piezas válidas para importar" y "No existen préstamos vigentes") y neutro (el aviso de la recuperación de contraseña y el aviso del formulario de usuario sin museos). Las listas y buscadores vacíos usan una fila de tabla con texto simple, no `Mensaje`. Los errores de un campo concreto se muestran debajo del campo con la propiedad `error` de `Campo`. Iniciar y cerrar sesión no disparan alertas. Si una acción guarda y luego navega, la alerta se dispara antes de navegar. Solo hay una alerta vigente a la vez: cada alerta usa su propio id y descarta la anterior, de modo que la nueva entra con su animación. Copiar la contraseña con éxito no lanza alerta.
- **Formularios:** una sola columna, salvo registrar y editar pieza, que usan dos columnas con la opción `dosColumnas` de `Formulario`; etiqueta encima, campos obligatorios con asterisco (`obligatorio`), y botón Cancelar o Volver. Las opciones de placeholder de los selectores empiezan con "Selecciona", que es lo que `Seleccion` reconoce.
- **Navegación:** las opciones del menú y las tarjetas del Inicio salen de `lib/navegacion.ts`. El nombre VESTIGIO se usa en el logotipo del menú y de las pantallas de acceso.
- **Listas:** las acciones que cambian datos revalidan sus rutas en el controlador y las vistas de lista leen sus propiedades, por lo que se actualizan al volver o al refrescar la ruta. Los buscadores `BuscadorPiezas` y `BuscadorExposiciones` guardan su lista en estado local, así que vuelven a consultar, conservando los filtros aplicados, cuando la página les entrega datos nuevos.
- **Escritura:** en código, comentarios, textos de la interfaz y documentos no se usan dos guiones seguidos ni la raya larga. Se usan guion simple, guion bajo, comas, puntos o dos puntos. La única excepción son los nombres de variables CSS, que la sintaxis exige. Los comandos de terminal evitan las banderas de doble guion.
- **Zona horaria única:** todo día y toda hora que se calculan o se muestran salen de `ZONA_HORARIA` (America/Lima) con las funciones de `lib/fechas.ts`. Las marcas con hora se guardan en UTC y se convierten a esa zona; las fechas de solo día no se desplazan. Ningún cálculo depende de la zona del proceso, del servidor ni del navegador: para obtener un día o una hora se usan siempre las funciones de `lib/fechas.ts`.
- **PDF:** toda respuesta de PDF usa `respuestaPdf` (inline, con el nombre del archivo) y los botones que lo abren usan `nuevaPestana`. Excel y la plantilla de importación se descargan.
- **Variables de entorno:** se leen solo desde `lib/config/env.ts`. Nunca se escribe una llave, contraseña real o dirección de conexión en el código ni en la documentación.
- **Estilos:** CSS Modules propios, con todos los valores de diseño en variables globales y solo las dos media queries de la sección 6.
- **Dependencias:** versiones exactas en `package.json`, sin rangos.
- **Idioma:** la interfaz, los comentarios y los documentos están en español.

## 10. Estado de verificación

Qué se verificó, con qué método, y qué queda sin verificar.

**Verificado**
- `npm run build` compila sin errores ni advertencias al cierre de cada bloque, y `npm run dev` arranca.
- Rutas y permisos, con `curl` y cookies de sesión de las cuentas de demostración: redirección al login sin sesión, redirección de colaboradores desde `/usuarios` y `/museos`, 404 en piezas, exposiciones e inventarios de museos no asignados y 404 en exposiciones finalizadas o canceladas en edición. Descarga de la plantilla y generación del PDF con sus encabezados HTTP.
- Acciones de los controladores, mediante rutas temporales que se eliminaron al terminar cada prueba: registrar y editar piezas con historial, actualizar estado, importar piezas (plantilla, lectura con ExcelJS, filas correctas e incorrectas, encabezados distintos, revalidación en el servidor), exposiciones (registrar, modificar, cancelar y conflictos), préstamos (crear y devolver con historial), inventarios (crear, marcar, cerrar y efectos), ficha técnica (con imagen PNG, con marcador SVG y sin imagen, una página en los tres casos), reporte y rol propio.
- Consistencia de la semilla: un script temporal comprobó las 10 reglas de la sección 2.4 de `AJUSTES_CODIGO_V2.md` (con la precisión sobre la regla 5 que se indica en la sección 11) y se eliminó.
- `@react-pdf/renderer` genera un PDF válido con Next.js 16.3.8, en desarrollo y en producción.
- Con clics en el navegador: el login (validaciones por campo, botón de mostrar u ocultar contraseña y cuenta desactivada), el Inicio y el menú con la cuenta de administrador, el módulo de Museos completo (registrar, editar, nombre duplicado, desactivar y activar, y su efecto en los selectores de Piezas, Exposiciones e Inventarios) y los selectores con placeholder. Las insignias y la paleta nueva (fondo crema) se comprobaron visualmente en las listas del navegador. También las pantallas de recuperación de contraseña y de nueva contraseña (botón de mostrar u ocultar y validación del correo), el centrado de los formularios en escritorio, las alertas de Sonner de éxito y de error (tamaño y colores) y la cuadrícula de tarjetas del Inicio en escritorio con el administrador.
- Con clics en el navegador, también: el módulo de reportes (el menú de reportes con la tarjeta conectada y las no conectadas; el reporte sin filtros, por categoría, por estado, combinado y con rangos de fechas; el rango inválido; el aviso de sin resultados; Limpiar; Volver; la exportación a PDF y a Excel con los filtros del reporte mostrado, sin tomar los valores nuevos de los campos; el título y la navegación).
- Con clics en el navegador, también, con la cuenta de administrador: el módulo de Inventarios. La lista y sus acciones (Continuar y Ver); el inventario en curso de Casa Quiñones con sus cuatro piezas esperadas (sin la pieza en préstamo); el guardado automático al marcar y su persistencia al recargar; el rechazo de cerrar con piezas sin marcar; el selector de museo al crear un inventario (tres museos activos, con el botón de crear desactivado hasta elegir uno, así que el mensaje del servidor "Selecciona el museo del inventario" queda como respaldo); el rechazo de un segundo inventario en curso para el mismo museo; cerrar un inventario y verlo cerrado en solo lectura con su resumen; un inventario nuevo del Teatro con sus siete piezas esperadas; los efectos al cerrar (la pieza no encontrada pasa a pendiente de verificación, la pendiente que se encontró vuelve a disponible y la pieza con daño pasa a estado malo) con sus registros en el historial; los datos Iniciado por y Cerrado por en pantalla, incluido el cierre hecho por el administrador de un inventario iniciado por Lucía; y el código en una línea con la columna Guardado angosta.
- Con rutas temporales, que se eliminaron al terminar: la persona de cierre con las cuentas de demostración (un inventario iniciado por Gabriela y cerrado por Marco guarda y devuelve ambos datos, el administrador cierra uno iniciado por un colaborador y un inventario en curso no tiene persona de cierre), el acceso ajeno rechazado con el mismo mensaje de siempre, cerrar un inventario ya cerrado y la equivalencia de los efectos sobre las piezas y el historial.
- Con clics en el navegador, también: los tres reportes nuevos (de piezas, de exposiciones y de préstamos), con los filtros probados a mano, los listados, el conteo de 21 piezas del reporte de piezas sin filtros, y la maquetación de las pantallas y de los filtros. La exportación a PDF y a Excel del reporte de piezas, con sus 21 filas, y el PDF del reporte por categoría y estado abierto en una pestaña nueva con su nombre de archivo.
- Con rutas temporales, que se eliminaron al terminar: los controladores de los tres reportes nuevos con el administrador, con Gabriela (dos museos) y con Marco (un museo), el rechazo de un museo ajeno y de valores inválidos, y la equivalencia de los resultados con el proceso en UTC y en America/Lima.
- Con clics en el navegador, también: el módulo de préstamos (la lista y sus insignias; el formulario de nuevo préstamo con todas sus validaciones: campos vacíos y fechas invertidas con el aviso general, salida futura, valor asegurado inválido, devolución lejana y longitud de textos; el registro de un préstamo válido y sus efectos, con la pieza en préstamo y en el historial; el rechazo por cruce de fechas con una exposición en ambos sentidos, que con cruce lo rechaza y sin cruce lo registra; quitar la pieza elegida; la fecha de salida por defecto; la devolución con el estado vacío por defecto, el aviso al confirmar sin estado, el cambio de estado y de disponibilidad con su historial; el aviso "No existen préstamos vigentes"; y la ventana de selección simplificada).
- Con clics en el navegador, también: el módulo de exposiciones (la lista y sus insignias, las validaciones al crear, crear con piezas desde la ventana de selección incluido el aviso de piezas con cruce de fechas, el buscador de piezas dentro de la ventana, la exigencia de al menos una pieza, el tope de fechas, modificar con cambio de nombre, fechas y piezas, el rechazo de exposiciones finalizadas y canceladas al modificar y al cancelar, cancelar con confirmación y sin confirmar, la liberación de piezas al cancelar, la actualización inmediata de la lista, los filtros y el buscador con Buscar y Limpiar).
- Con clics en el navegador, también: el catálogo de piezas, los filtros combinados, la búsqueda sin tildes y por código anterior, registrar con código automático, el año (rango y formato), la imagen (peso y vista previa), editar, el detalle, la ficha técnica en PDF, el historial (incluidas las mayúsculas del nombre del campo y que guardar sin cambios no genera registros), actualizar estado de conservación (incluido el mensaje de estado igual al actual), las ventanas de selección de piezas y la importación desde Excel (archivo válido, archivo con errores, archivo sin formato de plantilla y archivo con todas las filas con error).
- Con clics en el navegador, también: el módulo de Usuarios completo (lista, validaciones por campo, correo duplicado, registrar, copiar la contraseña temporal, editar, restricciones sobre la propia cuenta, desactivar y activar), el primer ingreso con contraseña temporal y las validaciones de longitud, el bloqueo de rutas con contraseña temporal pendiente, el menú que aparece sin recargar tras cambiar la contraseña, el Inicio con rol de colaborador, la sesión abierta de una cuenta desactivada, el aviso del formulario de usuario sin museos y el reemplazo de alertas (una sola vigente, de éxito y de error).
- Con clics en el navegador, con cuentas de colaborador (una con dos museos y otra con uno): el menú de cinco opciones y las cinco tarjetas del Inicio; la redirección al Inicio al escribir las direcciones de Usuarios y de Museos; que cada colaborador ve solo las piezas, exposiciones, préstamos e inventarios de sus museos, con los totales esperados (14 piezas, 5 exposiciones y 3 préstamos con dos museos; 5 piezas, 1 exposición y 2 préstamos con uno); los cuatro reportes con los totales de sus museos y el PDF de piezas con 14 filas; los selectores de museo de reportes, de nuevo inventario y de importación limitados a sus museos; y la respuesta 404 al abrir, desde su sesión, la dirección de una pieza de otro museo, en el detalle y en editar.
- Con clics en el navegador, con la cuenta de administrador: los límites de la importación (un archivo de 501 filas se rechaza con "El archivo supera el máximo de 500 filas" y uno de 5.4 MB con "El archivo supera el tamaño máximo de 5 MB"), un archivo sin la columna Categoría, con el aviso de que no tiene el formato de la plantilla, y la página 404 propia.
- Reemplazo de dos cuentas de demostración por Gabriela Linares Ortega y Marco Aguirre Soto, con rutas temporales que se eliminaron al terminar: el ingreso con ambas y la contraseña de demostración, el rechazo de los correos anteriores, los totales de cada una (Gabriela: 14 piezas, 5 exposiciones y 3 préstamos; Marco: 8 piezas, 2 exposiciones y 2 préstamos) y, en el inventario cerrado del Teatro, Iniciado por Gabriela y Cerrado por Marco.
- Retirada de los marcadores numerados de piezas y de la ruta `sin-imagen.svg` como valor guardado: se comprobó con `npm run build` y revisando el código de `Miniatura`, la ficha técnica, el registro, la edición y la importación. No se vio en el navegador.
- Las validaciones de acceso y de recuperación (correo vacío o inválido, contraseña vacía, credenciales incorrectas, cuenta desactivada, mensaje neutro y reglas de la nueva contraseña) también se comprobaron llamando a los controladores desde una ruta temporal.

**No verificado**
- Con clics en el navegador se probaron las acciones de Museos, de Usuarios, de Piezas, de Exposiciones, de Préstamos, de Reportes, de Inventarios (con la cuenta de administrador), la importación y el inicio de sesión, y las pantallas de consulta con cuentas de colaborador. Restablecer datos se ejercitó solo llamando al controlador desde una ruta temporal.
- Tampoco se comprobó en el navegador la subida de un archivo que no sea imagen.
- Tampoco se comprobaron en el navegador el cruce de una exposición con un préstamo abierto desde el registro de la exposición ni la ventana de selección de piezas en tablet y mobile.
- No se comprobó el comportamiento ante un error inesperado (ver los puntos abiertos).
- Con cuentas de colaborador no se comprobaron en el navegador las acciones que modifican datos (registrar, editar, marcar y cerrar inventarios y devoluciones), solo las pantallas de consulta. Tampoco se comprobó el comportamiento en tablet y mobile, incluidos los reportes nuevos, Inventarios y la página 404.
- El esquema de Prisma solo se editó: no se ejecutó ni se comprobó contra una base de datos.
- No se comprobó el comportamiento en un servidor con una zona horaria distinta a la de la máquina de desarrollo (Windows, en hora de Lima). El código no depende de esa zona, y la equivalencia con el proceso en UTC se comprobó, pero no se ejecutó en otro servidor.
- No se ha comprobado visualmente el resto de la interfaz interactiva: reemplazo de imágenes, la permanencia de las alertas de Sonner tras navegar y el comportamiento responsive en tablet y mobile, incluidos el catálogo, el detalle y los formularios de dos columnas. Tampoco se comprobaron en el navegador la cuadrícula de tarjetas del Inicio en tablet y mobile ni el color verde de `Mensaje` en la contraseña temporal y en el resumen de importación. Tampoco se comprobaron el hover del botón de peligro ni el aspecto de las insignias en tablet y mobile.
- Se comprobó la exportación a PDF del reporte de piezas y el PDF del reporte por categoría y estado en una pestaña nueva. No se abrieron en el visor los PDF de los reportes de exposiciones y de préstamos, ni se comprobó la maquetación visual de la ficha técnica: se comprobó que se generan, su número de páginas y si incrustan imagen, pero no su aspecto.
- No hay conexión a Prisma, Supabase, Storage ni Vercel. No hay pruebas automáticas ni lint configurados.

## 11. Puntos abiertos y textos que no están en el informe

### Puntos abiertos

- Activar usuarios y museos desactivados es una mejora acordada que el informe no incluye. Si la asesora lo pide, se agrega a ECUS01 como sub flujo 3.
- Diferencias entre el informe y el sistema en ECUS01: tras guardar un usuario nuevo, el sistema se queda en la pantalla para mostrar la contraseña temporal una sola vez, y el informe dice que retorna a la lista. Tampoco figuran en el informe la contraseña temporal con cambio obligatorio en el primer ingreso ni la regla de que nadie puede cambiar su propio rol.
- Diferencias entre el informe y el sistema en ECUS04: el informe habla de "módulo de Colecciones" y el menú se llama "Piezas". Los límites de 5 MB y de 500 filas del archivo no figuran en el informe.
- Diferencias entre el informe y el sistema en ECUS05: el informe solo rechaza una fecha de fin anterior a la de inicio. El código usa dos mensajes: "La fecha de fin no puede ser anterior a la fecha de inicio" y "La fecha de fin debe ser posterior a la fecha de inicio", este último también para fechas iguales. Está por revisar si debe rechazarse también la fecha igual.
- ECUS05 no menciona que se exija al menos una pieza ni el tope de 3 años en las fechas de una exposición.
- El código rechaza fechas de inicio y de fin iguales, y el informe solo prohíbe una fecha de fin anterior a la de inicio.
- "No es posible modificar esta exposición" es un texto definido fuera del informe.
- El informe no indica qué ocurre al registrar fechas ya pasadas. Hoy se pueden registrar o modificar exposiciones con fechas anteriores a hoy, y si la fecha de fin ya pasó la exposición queda finalizada y no se puede modificar ni cancelar.
- ECUS06 define un solo aviso para campos incompletos y fechas. El sistema mantiene ese aviso y agrega avisos propios para la fecha de salida, el tope de la devolución prevista, el valor asegurado y las longitudes.
- El informe no indica que la fecha de salida no pueda ser futura, ni topes de fecha, ni formato del valor asegurado, ni longitudes de los campos.
- El préstamo admite una sola pieza. Agrupar varias piezas bajo un mismo convenio queda como mejora futura, y exigiría una tabla intermedia, una devolución por pieza y cambios en el modelo.
- La pieza queda "En préstamo" desde el registro, y el informe no distingue fechas de salida futuras, que ahora no se admiten.
- La ventana de selección de pieza del préstamo ofrece solo piezas disponibles y los filtros de Código y Nombre, mientras que ECUS06 invoca "Buscar Piezas por Criterios".
- En la devolución, el estado de conservación se elige sin valor por defecto.
- Registrar una pieza a mano no genera historial, pero importar sí.
- Cambios del modelo respecto del informe: se suman `Museo.prefijo` y `Pieza.codigoAnterior`.
- La plantilla de importación cambia respecto de ECUS04: no tiene columna de código y suma la columna opcional Código anterior.
- Registrar una pieza, el detalle de una pieza y la ficha técnica no tienen caso de uso en el informe.
- El buscador de piezas tiene los botones Buscar y Limpiar, y la búsqueda ya no se ejecuta al cambiar un filtro.
- En la pantalla Nueva exposición, el botón que abre la búsqueda de piezas se llama "Agregar piezas" y la ventana que abre, "Buscar piezas".
- El controlador `actualizarEstado` devuelve un dato (`estadoActual`) que la vista ya no usa.
- La propiedad `ancha` del componente `Ventana` quedó sin uso: las ventanas de selección usan `seleccion`.
- El componente `Filtros` de `Campo.tsx` ya no lo usan los buscadores y solo lo usa `CI_Reporte_Categoria_Estado`.
- Las categorías no se gestionan desde la aplicación: no hay pantalla ni operación del contrato para crearlas, editarlas o desactivarlas.
- Las imágenes de pieza se guardan como data URL solo mientras el prototipo use memoria.
- Una pieza sin imagen tiene `imagenUrl` vacío. El marcador `sin-imagen.svg` solo se muestra en pantalla (`Miniatura`) y la ficha técnica dibuja el recuadro "Sin imagen".
- Los reportes de piezas, de exposiciones y de préstamos figuran en el informe como casos de uso propios, sin detallar, y el sistema los implementa. Sus filtros, columnas, orden y exportaciones se definieron fuera del informe.
- ECUS02: el informe nombra el caso de uso con la palabra "Inventario"; el sistema usa "Reporte por categoría y estado" para no confundirlo con el módulo de Inventarios. El informe inicia mostrando directamente los filtros; el sistema pasa antes por el menú de reportes. El informe no incluye la exportación a PDF y Excel ni los botones Limpiar y Volver, y tampoco figuran en él para los tres reportes nuevos. El filtro de fechas usa la fecha de registro de la pieza, y el reporte por categoría y estado sigue sin filtro por museo.
- Resuelto: el día del filtro de fechas del reporte por categoría y estado se calculaba en UTC mientras el resto del sistema usaba la fecha local del servidor. Ahora todo el sistema usa el día de America/Lima (`ZONA_HORARIA` y `lib/fechas.ts`), incluido ese filtro (`diaLocal`), así que este punto ya no está abierto.
- La clase `.medio` de `components/ui/FiltrosReporte.module.css` quedó sin uso, porque solo la usaba el filtro de Disponibilidad del reporte de piezas, que ahora tiene clases propias. Se dejó para no tocar los anchos compartidos.
- `BotonesReporte` lo usan los reportes de piezas, de exposiciones y de préstamos. El reporte por categoría y estado arma en su propia vista la misma fila de botones, sin usar ese componente.
- No existe `error.tsx` ni `global-error.tsx`. Ante un error inesperado la persona ve la pantalla de error por defecto de Next.js, en inglés y sin el estilo del proyecto. Una página de error propia queda como mejora pendiente.
- El proyecto aún no es un repositorio Git: no hay historial de cambios ni diferencias que consultar.
- La regla 5 de consistencia de la semilla dice que toda pieza con préstamo cerrado está disponible. Con un préstamo posterior abierto sobre la misma pieza (MCQ-003) debe estar en préstamo. La comprobación se aplicó con esa precisión y el documento de ajustes no se modificó.
- Cambios de la semilla respecto de lo que describía el documento de ajustes: la exposición "Libretos y bocetos" quedó sin la pieza 3 (regla 4); se agregaron las piezas MMT-007 y MMT-008 para el inventario del Teatro; la pieza MMT-005 se registró hace 220 días; MCQ-003 tiene un préstamo abierto, por lo que el inventario en curso de Casa Quiñones espera 4 piezas.
- El sistema registra quién inició y quién cerró un inventario, pero no quién marcó cada pieza. Queda como mejora futura.
- Al conectar Prisma, la columna `usuario_cierre_id` de `inventario` se incluye al recrear las 12 tablas (ver `docs/CONEXION.md`).
- Inventarios no tiene caso de uso en el informe. El registro de quién inició y quién cerró un inventario se definió fuera del informe y no cambia ECUS01 a ECUS06.
- Quedan cuatro operaciones del contrato de datos sin uso (`obtenerOrganizacion`, `obtenerExposicion`, `obtenerPrestamo`, `obtenerInventario`). Se conservan por ser parte del contrato mínimo.
- Una exposición finalizada por fechas sigue contando para los cruces de fechas. Las canceladas no cuentan.
- Los ids se crean con `crypto.randomUUID()` en memoria. En el esquema de Prisma los demás ids llevan `gen_random_uuid()` y el de `usuario` no lleva valor por defecto, porque será el de la cuenta de inicio de sesión.
- `npm install` muestra avisos de `npm audit` por dependencias transitivas. No se aplicó `npm audit fix`.
- La recuperación de contraseña es solo interfaz. Al conectar Supabase Auth se implementa por correo y reemplaza las dos pantallas actuales. Hoy no hay enlace hacia `/restablecer-contrasena`, y con datos válidos esa pantalla muestra su aviso como una alerta de error.
- El criterio con que `Seleccion` reconoce el placeholder (valor vacío y texto que empieza con "Selecciona") es una convención de texto, con el límite descrito en la sección 5.
- "No existen préstamos vigentes" es un aviso informativo de lista vacía y se muestra como `Mensaje` de error (rojo), a diferencia del resto de listas vacías, que usan una fila de tabla.
- Las alertas de Sonner usan el borde grueso del proyecto, que no se escala con el 20 por ciento de las demás medidas.
- Modo oscuro opcional, que se evaluará al cerrar la paleta. Consistiría en redefinir las variables de `:root` bajo `prefers-color-scheme`, con un botón para alternar y persistencia de la elección. En ese caso el crema pasaría a ser el modo claro.
- Ajustar los colores en las filas donde coinciden el estado de conservación y la disponibilidad, que hoy muestran dos insignias de colores que pueden competir entre sí.
- Propuestas de semilla menores, sin aplicar: Miguel solo ve un préstamo vencido y Lucía solo ve préstamos de una situación, por lo que no hay mezcla de situaciones en esas cuentas.

### Textos que no están en el informe

Los textos de ECUS01 a ECUS06 son los del informe. Estos otros se definieron fuera de él.

- **Definidos en el documento de ajustes (sección 7.10 y 7.7 y 7.8):** "La cuenta se encuentra desactivada. Comuníquese con el administrador.", "Pieza actualizada correctamente", "La imagen debe ser PNG o JPG de máximo 1 MB", "No es posible modificar esta exposición", "Usuario activado exitosamente", "Museo activado exitosamente", "Museo registrado exitosamente", "Museo actualizado exitosamente", "Museo desactivado exitosamente", "Ya existe un museo con ese nombre", "Ya existe un inventario en curso para este museo", "Debe marcar todas las piezas antes de cerrar el inventario" e "Inventario cerrado correctamente".
- **Inicio de sesión y contraseña:** "Ingresa tu correo electrónico", "Ingresa un correo electrónico válido", "Ingresa tu contraseña", "Correo electrónico o contraseña incorrectos", "La contraseña debe tener al menos 10 caracteres", "La contraseña no puede tener más de 15 caracteres", "Las contraseñas no coinciden", "La nueva contraseña debe ser distinta de la actual" y "Datos de demostración restablecidos". Etiquetas del botón de contraseña: "Mostrar", "Ocultar", "Mostrar contraseña" y "Ocultar contraseña".
- **Recuperación de contraseña:** "¿Olvidaste tu contraseña?", "Recuperar contraseña", "Enviar enlace", "Volver al inicio de sesión", "Si el correo está registrado, recibirás un enlace para restablecer tu contraseña", "Nueva contraseña", "Guardar contraseña" y "Esta función se activará cuando se conecte la autenticación. Tu contraseña no se modificó".
- **Tarjetas de acceso del Inicio:** los detalles de Préstamos ("Registrar préstamos y devoluciones de piezas"), Inventarios ("Conteo físico de piezas por museo") y Museos ("Altas, ediciones y estado de los museos"). Los de Piezas, Exposiciones y Usuarios ya existían, y el de Reportes pasó a ser "Reportes de la colección".
- **Usuarios y museos:** "Ingresa el nombre", "Ingresa un correo electrónico válido", "Selecciona un rol", "Selecciona al menos un museo", "No hay museos registrados. Registra un museo para poder asignarlo.", "Registrar museo", "Copiar", "Copiada", "No se pudo copiar al portapapeles", "No se encontró el usuario", "No puede cambiar su propio rol", "Ingresa el nombre del museo", "Selecciona el tipo de museo" y "No se encontró el museo". Las ventanas de confirmación de desactivar y activar tienen textos propios.
- **Piezas:** "Ingresa el nombre de la pieza", "Selecciona una categoría", "El año debe ser un número entero", "El año debe estar entre -10000 y el año actual", "El código anterior no puede tener más de 40 caracteres", "Ya existe una pieza con ese código anterior en el museo", la ayuda "Imagen cuadrada recomendada de 800 x 800 px, en PNG o JPG, de máximo 1 MB", los botones "Ver detalle", "Buscar", "Limpiar" y "Volver al catálogo", la línea de resultado "N piezas" o "X de N piezas", "Detalle de la pieza", "Selecciona el estado de conservación", "Selecciona un museo", "No tienes acceso al museo seleccionado", "No se encontró la pieza" y "Selecciona el nuevo estado". En el historial, el cambio de imagen se guarda como "con imagen", "sin imagen" o "imagen reemplazada".
- **Importación:** "El archivo supera el tamaño máximo de 5 MB", "El archivo supera el máximo de 500 filas", "Selecciona el archivo Excel a importar", "Selecciona el museo de destino", la etiqueta "Museo de destino", las ayudas "Todas las piezas del archivo se registrarán en este museo" y "Solo archivos .xlsx, de máximo 5 MB y 500 filas", y los motivos de error por fila ("Falta el nombre", "Falta la categoría", "Falta el estado de conservación", categoría o estado inexistente, los mensajes del año, "El código anterior no puede tener más de 40 caracteres", "El código anterior ya está registrado en el museo" y "El código anterior está repetido en el archivo"). Además, el total de piezas registradas y los listados de la vista previa.
- **Exposiciones:** "Ingresa el nombre de la exposición", "Selecciona el museo sede", "Ingresa la fecha de inicio", "Ingresa la fecha de fin", "La fecha de fin debe ser posterior a la fecha de inicio", "No se encontró la exposición", "Alguna de las piezas seleccionadas no existe o no está disponible", "Las siguientes piezas no pueden asignarse a la exposición", "Quítalas de la selección para continuar", "Agrega al menos una pieza a la exposición", "Las fechas no pueden superar los 3 años desde hoy", la línea de resultado "N exposiciones", "1 exposición" o "X de N exposiciones" y los motivos por pieza.
- **Préstamos:** "Selecciona el estado de conservación de la pieza", "No se encontró el préstamo", "Quitar", "La fecha de salida no puede ser posterior a hoy", "La fecha de devolución no puede superar los 3 años desde hoy", "El valor asegurado debe ser un número mayor que cero, con hasta 2 decimales, y no superar 100 millones", "La institución destino no puede tener más de 100 caracteres", "El responsable no puede tener más de 100 caracteres", "El número de convenio no puede tener más de 40 caracteres" y "El número de póliza no puede tener más de 40 caracteres".
- **Inventarios:** "Inventario iniciado", "Selecciona el museo del inventario", "Selecciona el resultado de la pieza", "La pieza no forma parte de este inventario", "No es posible modificar un inventario cerrado", "No se encontró el inventario" y "Este museo no tiene piezas para inventariar". Etiquetas de la pantalla del inventario: "Iniciado por" y "Cerrado por".
- **Reportes y ficha técnica:** "La fecha desde no puede ser posterior a la fecha hasta", "No se encontraron resultados para los filtros aplicados", "No se encontró la pieza" (respuesta 404 de la ficha), y los textos del menú de reportes y de la pantalla del reporte: "Informes", "Reportes", "Reporte por categoría y estado", "Reporte de piezas", "Reporte de exposiciones", "Reporte de préstamos", "Total de piezas por categoría y estado", "Listado de piezas con sus datos", "Listado de exposiciones con sus piezas", "Listado de préstamos y devoluciones", "Próximamente", "Reportes de la colección", "Generar Reporte", "Limpiar", "Volver", "Exportar a PDF" y "Exportar a Excel". De los tres reportes nuevos: "Listado de piezas por museo", "Total de piezas", "Total de exposiciones", "Total de préstamos", "Todos", "Todas", "Sin límite", "Alguno de los filtros del reporte no es válido", "Las fechas del reporte deben tener el formato AAAA-MM-DD" y "No tienes acceso al museo seleccionado". Etiquetas de filtros: Museo, Disponibilidad, Estado, Situación, Institución destino, Desde y Hasta. Columnas del reporte de piezas: Código, Nombre, Categoría, Estado, Disponibilidad, Museo, Ubicación y Fecha de registro. Columnas del reporte de exposiciones: Nombre, Museo, Estado, Inicio, Fin, Cantidad de piezas y Piezas. Columnas del reporte de préstamos: Pieza, Museo, Institución destino, Responsable, Convenio, Póliza, Valor asegurado, Salida, Devolución prevista, Devolución real y Situación.
- **Página 404:** "404", "Esta página no se encontró" y "Volver al inicio". El mismo mensaje se usa para una dirección inexistente y para un recurso que el sistema no muestra, por ejemplo una pieza de un museo no asignado.
- **Avisos de lista vacía:** cada lista y buscador tiene el suyo, por ejemplo "No se encontraron piezas", "No hay préstamos registrados" o "No hay inventarios registrados".

## 12. Inventario de documentos

Archivos .md del repositorio y su función:

| Archivo | Para qué sirve |
|-|-|
| `README.md` | Cómo correr el prototipo, cuentas de demostración, funciones y restablecer datos |
| `MAPA.md` | Este mapa del proyecto |
| `docs/CONEXION.md` | Guía para conectar Prisma, Supabase Auth, Storage y Vercel |
| `lib/data/prisma/README.md` | Nota de que ahí irá la implementación con Prisma |
| `AJUSTES_CODIGO_V2.md` | Documento de ajustes que describió la adaptación del código al diseño final. Solo se editaron sus menciones de la contraseña de demostración, que ahora es `Museos2026`. Contiene códigos de pieza y una longitud de contraseña temporal anteriores a los cambios actuales |
