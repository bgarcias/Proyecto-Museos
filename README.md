# Gestión de colecciones y exposiciones para museos

Prototipo del sistema de gestión de colecciones y exposiciones para museos. Todas las pantallas funcionan con datos de demostración guardados en la memoria del servidor. No hay base de datos ni login real: la sesión es una cookie de demostración.

Para el detalle de la estructura, las rutas, las clases y las reglas de negocio, ver `MAPA.md`. Para conectar base de datos, login e imágenes, ver `docs/CONEXION.md`.

## Requisitos

- Node.js 24.x

## Cómo correrlo

1. Instalar las dependencias:

   ```
   npm install
   ```

2. Iniciar el servidor de desarrollo:

   ```
   npm run dev
   ```

3. Abrir http://localhost:3000. Sin sesión, la aplicación redirige a `/login`.

Para comprobar que compila sin errores:

```
npm run build
```

El archivo `.env.local` ya viene con `DATA_SOURCE=memoria` y el resto de variables vacías. No hace falta llenarlas para el prototipo.

La primera compilación descarga las tipografías Anton e Inter desde Google Fonts, así que necesita conexión a internet.

## Cuentas de demostración

Las seis cuentas usan la misma contraseña: `Museos2026`.

| Persona | Correo | Rol | Museos | Estado |
|-|-|-|-|-|
| Brandon Garcia Sanchez | brandon.garcia@example.com | Administrador | Museo Municipal de Teatro, Pinacoteca Municipal Ignacio Merino y Museo Casa Quiñones | Activo |
| Gabriela Linares Ortega | gabriela.linares@example.com | Colaborador | Museo Municipal de Teatro y Pinacoteca Municipal Ignacio Merino | Activo |
| Marco Aguirre Soto | marco.aguirre@example.com | Colaborador | Museo Municipal de Teatro | Activo |
| Miguel Zambrano Melendez | miguel.zambrano@example.com | Colaborador | Pinacoteca Municipal Ignacio Merino | Activo |
| Lucía Paredes Vargas | lucia.paredes@example.com | Colaborador | Museo Casa Quiñones | Activo |
| Diego Salazar Rojas | diego.salazar@example.com | Colaborador | Museo Municipal de Teatro | Inactivo |

- El administrador ve todos los museos de su organización, incluida la Sala Cultural Santa Rosa (inactiva). Es el único que accede a Usuarios y a Museos.
- Cada colaborador ve y modifica solo los museos que tiene asignados.
- La cuenta de Diego Salazar Rojas está desactivada: al ingresar con su correo y contraseña correctos muestra el mensaje de cuenta desactivada. Sirve para probar la acción Activar en la lista de usuarios.
- Las cuentas nuevas que cree el administrador reciben una contraseña temporal de 10 caracteres, generada con un generador seguro y sin caracteres ambiguos (0, O, 1, l e I). Se muestra una sola vez, con un botón "Copiar" que la lleva al portapapeles. Al ingresar con ella, el sistema pide cambiarla antes de abrir cualquier otra pantalla, y el menú aparece al terminar el cambio sin recargar la página.
- Las contraseñas nuevas (cambio de contraseña temporal y pantalla de nueva contraseña) deben tener entre 10 y 15 caracteres. Las reglas están en `lib/validaciones.ts`. El inicio de sesión solo comprueba que la contraseña no esté vacía.

## Códigos de las piezas

El código de una pieza lo asigna el sistema al guardarla y no se puede cambiar: el prefijo del museo, un guion y un número correlativo de al menos 3 dígitos (por ejemplo MMT-009). El número es el mayor correlativo del museo más uno, así que los huecos no lo alteran. El formulario de registrar pieza no tiene campo de código, y editar pieza lo muestra en solo lectura.

El prefijo del museo también lo calcula el sistema al registrarlo y no cambia nunca, ni siquiera si se edita el nombre: las iniciales de las palabras significativas del nombre (sin de, del, la, las, el, los, y, e), o las tres primeras letras si hay una sola palabra, con un máximo de 5 letras y un número al final si ya existe. Se ve como columna en la lista de museos y en solo lectura al editar.

Cada pieza puede tener además un código anterior opcional (máximo 40 caracteres, único dentro del museo), que se puede editar y se muestra bajo el código en el catálogo.

Códigos de ejemplo de la semilla:

| Museo | Prefijo | Códigos |
|-|-|-|
| Museo Municipal de Teatro | MMT | MMT-001 a MMT-008 |
| Pinacoteca Municipal Ignacio Merino | PMIM | PMIM-001 a PMIM-006 |
| Museo Casa Quiñones | MCQ | MCQ-001 a MCQ-005 |
| Sala Cultural Santa Rosa | SCSR | SCSR-001 y SCSR-002 |

Tres piezas de Museo Casa Quiñones tienen código anterior para probar la función: MCQ-001 (INV-1987-0412), MCQ-002 (INV-1987-0418) y MCQ-005 (INV-1991-0107). La próxima pieza que se registre en cada museo recibe MMT-009, PMIM-007, MCQ-006 o SCSR-003.

## Funciones

- **Acceso:** inicio de sesión con validación por campo (correo vacío, correo inválido y contraseña vacía), botón para mostrar u ocultar la contraseña y cambio de contraseña temporal. Hay además dos pantallas públicas de recuperación de contraseña (`/recuperar-contrasena` y `/restablecer-contrasena`) que son solo interfaz: no envían correo ni modifican contraseñas. Iniciar y cerrar sesión no muestran alertas.
- **Usuarios** (solo administrador): lista, registrar, editar, desactivar y activar cuentas, con museos asignados. Todo usuario, de cualquier rol, necesita al menos un museo. Si no hay museos activos, el formulario muestra un aviso y el botón "Registrar museo", que lleva a `/museos/nuevo`. Nadie puede desactivar su propia cuenta ni cambiar su propio rol.
- **Museos** (solo administrador): lista, registrar, editar, desactivar y activar museos. Cada museo tiene un tipo de colección: arqueología, antropología o etnología; histórico; arte; ciencias naturales u otro. El prefijo lo calcula el sistema.
- **Piezas:** catálogo con seis filtros combinados (código, nombre, categoría, estado, disponibilidad y museo; la búsqueda ignora mayúsculas y tildes y el filtro de código también mira el código anterior) que se aplican con los botones Buscar y Limpiar o con Enter, y con la lista ordenada por código. Cada fila muestra la imagen, el código, el nombre, el estado, la disponibilidad y el museo, con cinco acciones: ver detalle, editar, actualizar el estado de conservación, ver el historial y generar la ficha técnica en PDF. Registrar y editar piezas usa un formulario de dos columnas, con imagen PNG o JPG, cuadrada y recomendada de 800 x 800 px, de máximo 1 MB. El año debe ser un entero entre -10000 y el año actual. Registrar, editar y actualizar el estado vuelven al catálogo al guardar.
- **Importar piezas:** descarga de la plantilla de Excel (sin columna de código y con la columna opcional Código anterior), validación fila por fila con vista previa e importación de las piezas válidas, al "Museo de destino" que se elige. El archivo debe ser .xlsx, de máximo 5 MB y 500 filas. Los códigos se asignan al importar, en el orden de las filas.
- **Exposiciones:** registrar, modificar y cancelar exposiciones, y asignarles piezas. Toda exposición necesita al menos una pieza y ninguna de sus dos fechas puede superar los 3 años desde hoy. El estado (programada, vigente, finalizada o cancelada) se calcula por las fechas, y una exposición cuya fecha de fin ya pasó queda finalizada y no se puede modificar ni cancelar. La lista se ordena por fecha de inicio, de la más reciente a la más antigua, y tiene filtros con los botones Buscar y Limpiar, como el catálogo de piezas.
- **Préstamos:** registrar préstamos de piezas a otras instituciones y registrar su devolución. Un préstamo admite una sola pieza, que se elige en una ventana que solo ofrece piezas disponibles (con "Quitar" para deshacer la elección). La fecha de salida aparece con la de hoy y no puede ser posterior a hoy, la devolución prevista no puede superar los 3 años desde hoy, el valor asegurado debe ser mayor que cero con hasta 2 decimales y no superar 100 millones, y los textos tienen un máximo de 100 caracteres (institución y responsable) y de 40 (convenio y póliza). En la devolución, el estado de conservación al regresar se elige sin valor por defecto. La situación (en préstamo, vencido o devuelto) se calcula por las fechas.
- **Inventarios:** inventario físico por museo, con conteo pieza por pieza, cierre y resumen de diferencias. Cada inventario registra quién lo inició y quién lo cerró ("Iniciado por" y "Cerrado por" en su pantalla). Lo puede cerrar cualquier persona con acceso al museo del inventario, incluido el administrador, y no solo quien lo inició. Inventarios de la semilla para probar: el del Teatro está cerrado (lo inició Gabriela y lo cerró Marco), el de la Pinacoteca está cerrado (lo inició y lo cerró Miguel) y el de Casa Quiñones sigue en curso, iniciado por Lucía. Para ver el cierre por otra persona, abrir con el administrador el de Casa Quiñones, marcar sus piezas y cerrarlo.
- **Reportes:** un menú de reportes (`/reportes`) con cuatro tarjetas, todas conectadas. Cada reporte tiene sus filtros, los botones Generar Reporte, Limpiar y Volver, y exportación a PDF y a Excel con los filtros con los que se generó. El PDF se abre en una pestaña nueva y el Excel se descarga. El colaborador solo ve los museos que tiene asignados, y la exportación vuelve a calcular el reporte en el servidor.
  - **Reporte por categoría y estado** (`/reportes/categoria-estado`): total de piezas por categoría y estado de conservación, con filtros por categoría, estado y fecha de registro (el día de la fecha de registro de la pieza, con los extremos incluidos).
  - **Reporte de piezas** (`/reportes/piezas`): listado por museo, con filtros de museo, disponibilidad y fecha de registro (Desde y Hasta). Columnas: código, nombre, categoría, estado, disponibilidad, museo, ubicación y fecha de registro, con el total de piezas.
  - **Reporte de exposiciones** (`/reportes/exposiciones`): una fila por exposición, con sus piezas, y filtros de museo, estado y rango de fechas (se muestran las exposiciones cuyo período se cruza con el rango).
  - **Reporte de préstamos** (`/reportes/prestamos`): once columnas, con filtros de museo, situación, institución destino y fecha de salida (Desde y Hasta, con los extremos incluidos).
- **Inicio y menú:** el menú superior, con el logotipo VESTIGIO, y las tarjetas de acceso del Inicio salen de la misma lista de opciones, según el rol: 7 para el administrador y 5 para el colaborador. El Inicio incluye el botón para restablecer los datos de demostración.

## Rutas principales

| Ruta | Pantalla |
|-|-|
| `/login`, `/recuperar-contrasena`, `/restablecer-contrasena` | Inicio de sesión y pantallas públicas de recuperación de contraseña (solo interfaz) |
| `/cambiar-contrasena`, `/` | Cambio de contraseña temporal e inicio |
| `/usuarios`, `/museos` | Usuarios y museos (solo administrador) |
| `/piezas` | Catálogo de piezas, con registrar, detalle (`/piezas/[id]`), editar, estado, historial, ficha técnica e importar |
| `/exposiciones` | Módulo de exposiciones: nueva, modificar y cancelar |
| `/prestamos` | Módulo de préstamos: nuevo préstamo y registrar devolución |
| `/inventarios` | Lista de inventarios y conteo |
| `/reportes` | Menú de reportes |
| `/reportes/categoria-estado` | Reporte por categoría y estado, con exportación a PDF y Excel (`/pdf` y `/excel`) |
| `/reportes/piezas` | Reporte de piezas, con exportación a PDF y Excel (`/pdf` y `/excel`) |
| `/reportes/exposiciones` | Reporte de exposiciones, con exportación a PDF y Excel (`/pdf` y `/excel`) |
| `/reportes/prestamos` | Reporte de préstamos, con exportación a PDF y Excel (`/pdf` y `/excel`) |

La lista completa de rutas, con su pantalla y su control, está en `MAPA.md`.

## Restablecer los datos

Hay dos formas:

- En la pantalla de inicio (`/`), con el botón "Restablecer datos de demostración". Lo puede usar cualquier cuenta con sesión.
- Reiniciando el servidor (detener `npm run dev` y volver a iniciarlo).

Los datos viven en memoria, en `globalThis`, para que la recarga en caliente no los reinicie. Se pierden al reiniciar el servidor. Por lo mismo, al editar la semilla (`lib/data/memoria/semilla.ts`) hay que reiniciar el servidor de desarrollo: si no, el almacén anterior se conserva, con la semilla anterior, por ejemplo con la contraseña de demostración anterior. Las fechas de exposiciones, préstamos e inventarios de la semilla se calculan a partir del día actual en la zona horaria de Lima, por lo que los estados siempre son coherentes.

## Estructura

- `app/`: rutas, un `page.tsx` por pantalla (31) y diez rutas de servidor: la plantilla de Excel, la ficha técnica en PDF y el PDF y el Excel de cada uno de los cuatro reportes. Además, `app/not-found.tsx` es la página 404 propia y no cuenta entre las 31 páginas.
- `components/CI_*/`: las vistas, una carpeta por pantalla (27). `components/ui/`: piezas compartidas, incluidas las alertas, el botón Copiar y los componentes de los reportes (`BotonesReporte`, `FiltrosReporte` y `TablaReporte`).
- `lib/controllers/CC_*.ts`: los controladores (Server Actions) con la lógica, las reglas de negocio y los permisos.
- `lib/data/`: contratos de la capa de datos, implementación en memoria con la semilla y carpeta reservada para Prisma.
- `lib/auth/session.ts`: toda la lógica de sesión.
- `lib/navegacion.ts`: opciones del menú y de las tarjetas del Inicio. `lib/validaciones.ts`: validaciones de formulario compartidas (correo, contraseña y año). `lib/codigos.ts`: prefijo del museo y código de la pieza.
- `lib/config/env.ts`: lectura central de variables de entorno.
- `lib/importacion.ts` y `lib/ficha.tsx`: Excel de importación y PDF de la ficha técnica. `lib/exportacionReporte.tsx` y `lib/exportacionTabla.tsx`: PDF y Excel de los reportes (el segundo es genérico por columnas, para piezas, exposiciones y préstamos). `lib/respuestaPdf.ts`: respuesta común de los PDF, que se abren en el visor del navegador.
- `lib/fechas.ts`: todo cálculo y formato de fechas, con una zona horaria única, America/Lima (`ZONA_HORARIA` en `lib/constantes.ts`). Las marcas con hora se guardan en UTC y el día y la hora que se muestran se convierten a esa zona. Ningún cálculo depende de la zona del servidor ni del navegador.
- `prisma/schema.prisma`: esquema de 12 tablas, solo como archivo. No se ejecuta.
- `docs/CONEXION.md`: guía para conectar Prisma, Supabase y Vercel más adelante.

## Alcance y verificación

Este es un prototipo de interfaces. Se compila sin errores y sus acciones se comprobaron con rutas temporales y `curl`. Con clics en el navegador se probaron el inicio de sesión, las pantallas de recuperación y de nueva contraseña, el Inicio en escritorio y el menú con el administrador y con un colaborador, el centrado de los formularios, las alertas de éxito y de error y su reemplazo, el módulo de Museos, el módulo de Exposiciones, el módulo de Préstamos, el módulo de Inventarios con la cuenta de administrador (lista, conteo con guardado automático, cierre con sus efectos y los datos Iniciado por y Cerrado por), el módulo de Reportes (los tres reportes nuevos con sus filtros, listados y maquetación, la exportación a PDF y a Excel del reporte de piezas con sus 21 filas, y el PDF del reporte por categoría y estado en una pestaña nueva con su nombre de archivo), el módulo de Usuarios completo (incluidos el copiado de la contraseña temporal, el primer ingreso con las validaciones de longitud, el menú sin recargar y el aviso sin museos) y el módulo de Piezas (catálogo, filtros, registrar con código automático, editar, detalle, ficha técnica, historial, actualizar estado, ventanas de selección y la importación desde Excel). Los controladores de los tres reportes nuevos se comprobaron con rutas temporales, con el administrador, con Gabriela y con Marco, incluidos el rechazo de un museo ajeno y de valores inválidos y la equivalencia de resultados con el proceso en UTC y en America/Lima. La persona de cierre de los inventarios también se comprobó con rutas temporales y las cuentas de demostración. También con clics, con cuentas de colaborador (una con dos museos y otra con uno), las pantallas de consulta: el menú y las tarjetas del Inicio, la redirección desde Usuarios y Museos, los totales de piezas, exposiciones, préstamos, inventarios y reportes de cada una, el PDF de piezas con 14 filas, los selectores de museo limitados a sus museos y la página 404 al abrir una pieza de otro museo. Con el administrador se probaron los límites de 500 filas y de 5 MB de la importación, un archivo sin la columna Categoría y la página 404 propia. Quedan sin probar así restablecer datos, las acciones que modifican datos con cuentas de colaborador (registrar, editar, marcar y cerrar inventarios y devoluciones), el esquema de Prisma (solo se editó), los PDF de los reportes de exposiciones y de préstamos en el visor, el comportamiento en un servidor con una zona horaria distinta a la de esta máquina (Windows, en hora de Lima), el cruce de una exposición con un préstamo abierto desde el registro de la exposición, la subida de un archivo que no sea imagen, el comportamiento ante un error inesperado y el comportamiento en tablet y mobile, incluidos los reportes nuevos, Inventarios y la página 404. No existe `error.tsx` ni `global-error.tsx`: ante un error inesperado se ve la pantalla de error por defecto de Next.js, en inglés y sin el estilo del proyecto, y una página de error propia queda como mejora pendiente. El detalle está en la sección "Estado de verificación" de `MAPA.md`.
