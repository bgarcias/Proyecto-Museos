# Gestión de colecciones y exposiciones para museos

Sistema web (VESTIGIO) para gestionar la colección de uno o varios museos: catálogo de piezas con su historial de cambios, exposiciones, préstamos a otras instituciones, inventarios físicos y reportes con exportación a PDF y Excel. Cada organización tiene sus museos, y cada persona ve y modifica solo los museos que se le asignaron. Los datos viven en PostgreSQL en Supabase, con Prisma, y el inicio de sesión es de Supabase Auth.

Es un prototipo: todos los registros son de demostración, y los cuatro museos que trae se usan solo como ejemplo.

Para el detalle de la estructura, las rutas, la capa de datos, las reglas de negocio y el estado de verificación, ver `MAPA.md`.

## Requisitos

- Node.js 24.x
- Un proyecto de Supabase (PostgreSQL y Auth)
- Conexión a internet: la primera compilación descarga las tipografías Anton e Inter desde Google Fonts

## Cómo correrlo

El orden importa: las variables de entorno van antes de instalar, porque la instalación genera el cliente de Prisma y necesita `DIRECT_URL`.

1. Crear un proyecto en Supabase.

2. Copiar `.env.example` a `.env.local` y completar los valores. Los valores van solo en `.env.local`, que nunca se sube al repositorio. Las variables son:

   | Variable | Para qué sirve | Tipo |
   |-|-|-|
   | `DATABASE_URL` | Conexión con pool que usa la aplicación (en Supabase, la del pooler en modo transacción) | Secreta |
   | `DIRECT_URL` | Conexión directa o session pooler, para las herramientas de Prisma | Secreta |
   | `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto de Supabase | Pública |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave anónima de Supabase | Pública |
   | `SUPABASE_SERVICE_ROLE_KEY` | Clave de servicio, para crear y borrar cuentas desde el servidor | Secreta |
   | `CARGA_ADMIN_EMAIL` | Correo del administrador de los datos de demostración | Secreta |
   | `CARGA_COLABORADOR_EMAIL` | Correo de Miguel Zambrano Meléndez en los datos de demostración | Secreta |
   | `CARGA_CONTRASENA` | Contraseña que comparten las cuatro cuentas de demostración, de 10 a 15 caracteres | Secreta |
   | `MOSTRAR_DATOS_DEMO` | Con el valor `true`, el login muestra las cuentas de demostración. Opcional | Solo servidor |

   Las URL y las claves de Supabase se obtienen en el panel del proyecto (botón Connect y Project Settings, API).

3. Instalar las dependencias:

   ```
   npm install
   ```

   La instalación ejecuta `prisma generate`, que crea el cliente de Prisma. Si `DIRECT_URL` no está definida, falla con un mensaje que lo explica.

4. Crear las tablas, ejecutando en el editor SQL de Supabase (o con otro cliente de PostgreSQL conectado a la base), en este orden, `prisma/sql/01_crear_tablas.sql` y después `prisma/sql/02_reglas_y_seguridad.sql`. El primero borra las 12 tablas de la aplicación y las vuelve a crear vacías: úsalo solo en una base que se puede perder. Si se repite el primero, hay que repetir también el segundo, que crea las unicidades que Prisma no puede expresar y activa la seguridad por fila.

5. En el panel de Supabase (Authentication), configurar para la recuperación de contraseña: agregar `http://localhost:3000/restablecer-contrasena` a las URLs de redirección y fijar en 10 la longitud mínima de contraseña.

6. Revisar y cargar los datos de demostración:

   ```
   npm run db:simular
   npm run db:cargar
   ```

   El primero no se conecta a nada: construye los datos y comprueba sus reglas. El segundo pide escribir `CARGAR`, crea las cuatro cuentas en Supabase Auth y llena las 12 tablas.

7. Opcional: `npm run db:verificar` comprueba la capa de datos contra la base cargada. Escribe datos temporales y los borra al terminar.

8. Iniciar el servidor de desarrollo:

   ```
   npm run dev
   ```

9. Abrir http://localhost:3000. Sin sesión, la aplicación redirige a `/login`.

Para comprobar que compila sin errores:

```
npm run build
```

## Scripts disponibles

| Comando | Qué hace |
|-|-|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Compila la aplicación |
| `npm run start` | Sirve la aplicación compilada |
| `npm run db:generar` | Genera el cliente de Prisma (lo mismo hace `postinstall` al instalar) |
| `npm run db:validar` | Valida `prisma/schema.prisma` |
| `npm run db:simular` | Revisa los datos de demostración sin conectarse: cantidades, usuarios, restricciones y las 10 reglas de consistencia |
| `npm run db:cargar` | Carga los datos de demostración: crea las cuentas de Auth y reemplaza el contenido de las 12 tablas. Pide confirmación |
| `npm run db:verificar` | Verifica la capa de datos contra la base cargada (27 pruebas) |

No se usan `prisma migrate`, `prisma db push` ni `prisma db pull`: la estructura de la base está en los scripts de `prisma/sql/`, que son su fuente de verdad.

## Cuentas de demostración

Las cuatro cuentas usan la misma contraseña, que está en `CARGA_CONTRASENA` de `.env.local`. No se escribe en ningún archivo del repositorio. El login la muestra, junto con las cuentas, solo si `MOSTRAR_DATOS_DEMO` es `true`: aparece un botón "Mostrar datos demo" que despliega la lista.

| Persona | Correo | Rol | Museos |
|-|-|-|-|
| Brandon Garcia Sanchez | El de `CARGA_ADMIN_EMAIL` | Administrador | Museo Municipal de Teatro, Pinacoteca Municipal Ignacio Merino, Museo Amano y Museo Andrés del Castillo |
| Miguel Zambrano Meléndez | El de `CARGA_COLABORADOR_EMAIL` | Colaborador | Pinacoteca Municipal Ignacio Merino y Museo Amano |
| Gabriela Linares Ortega | gabriela@vestigio.com | Colaborador | Museo Municipal de Teatro y Pinacoteca Municipal Ignacio Merino |
| Marco Aguirre Soto | marco@vestigio.com | Colaborador | Museo Municipal de Teatro |

- El administrador ve todos los museos de su organización. Es el único que accede a Usuarios y a Museos, y el único que ve el Museo Andrés del Castillo.
- Cada colaborador ve y modifica solo los museos que tiene asignados.
- Las cuentas nuevas que cree el administrador reciben una contraseña temporal de 10 caracteres, generada con un generador seguro y sin caracteres ambiguos (0, O, 1, l e I). Se muestra una sola vez, con un botón "Copiar" que la lleva al portapapeles. Al ingresar con ella, el sistema pide cambiarla antes de abrir cualquier otra pantalla, y el menú aparece al terminar el cambio sin recargar la página.
- Las contraseñas nuevas (cambio de contraseña temporal y pantalla de nueva contraseña) deben tener entre 10 y 15 caracteres. Las reglas están en `lib/validaciones.ts`. El inicio de sesión solo comprueba que la contraseña no esté vacía.
- Los museos, las piezas y los demás registros son de demostración. Los museos son ejemplos de Lima: los dos primeros, municipales, y los otros dos, privados.

## Estructura del proyecto

```
app/                  Rutas de la aplicación. Cada carpeta es una dirección web y cada page.tsx es una pantalla
  layout.tsx          Layout raíz: fuentes, barra de navegación y alertas
  template.tsx        Plantilla que anima la entrada de cada pantalla
  globals.css         Variables de diseño y estilos base
  not-found.tsx       Página 404 propia
components/
  CI_*/               Las vistas: una carpeta por pantalla, con su .tsx y su .module.css
  ui/                 Piezas compartidas: botones, campos, tablas, popups, alertas y la barra de navegación (Navbar)
lib/
  controllers/        Controladores CC_*: reglas de negocio y permisos. acceso.ts filtra por museo y errores.ts captura los errores
  data/               Contratos de la capa de datos, implementación con Prisma, traducción de errores de la base y el cliente generado
  auth/               Sesión de Supabase Auth y cuentas
  supabase/           Clientes de Supabase y renovación de la sesión en cada petición
  config/             Variables de entorno
  exportacion/        PDF y Excel de los reportes y de la ficha técnica
  importacion/        Importación de piezas desde Excel y sus límites
  (sueltos)           tipos, constantes, validaciones, fechas, codigos, formatos, navegacion, datosDemo, busquedaTexto, reporteParametros, resultadoBusqueda
prisma/               Esquema para generar el cliente y, en sql/, los dos scripts que crean y protegen la base
scripts/              Carga de los datos de demostración y verificación de la capa de datos
public/               Archivos estáticos: el marcador de las piezas sin imagen
proxy.ts              Renueva la sesión de Supabase Auth en cada petición
```

Las carpetas de `app/` son las direcciones web del sistema, y cada `page.tsx` solo llama al controlador y a la vista.

### Dónde busco

| Elemento | Vista | Estilos | Lógica |
|-|-|-|-|
| Login | `components/CI_Login/CI_Login.tsx` y `DesplegableDemo.tsx` | `CI_Login.module.css`, `DesplegableDemo.module.css`, `components/ui/PantallaAcceso.module.css` | `lib/controllers/CC_Usuario.ts` y `lib/auth/session.ts` |
| Barra de navegación | `components/ui/Navbar.tsx` | `components/ui/Navbar.module.css` | Opciones en `lib/navegacion.ts` |
| Inicio | `components/CI_Inicio/CI_Inicio.tsx` | `CI_Inicio.module.css` | `lib/controllers/CC_Usuario.ts` y `lib/navegacion.ts` |
| Catálogo de piezas | `components/CI_Catalogo_Piezas/CI_Catalogo_Piezas.tsx` y `components/ui/BuscadorPiezas.tsx` | `CI_Catalogo_Piezas.module.css`, `components/ui/Buscador.module.css` | `lib/controllers/CC_Pieza.ts` |
| Formulario de pieza | `components/CI_Formulario_Pieza/CI_Formulario_Pieza.tsx` | `CI_Formulario_Pieza.module.css` | `lib/controllers/CC_Pieza.ts` y `lib/codigos.ts` |
| Reporte por categoría y estado | `components/CI_Reporte_Categoria_Estado/CI_Reporte_Categoria_Estado.tsx` | `CI_Reporte_Categoria_Estado.module.css` | `lib/controllers/CC_Reporte.ts` |
| Reporte de piezas | `components/CI_Reporte_Piezas/CI_Reporte_Piezas.tsx` | `CI_Reporte_Piezas.module.css` | `lib/controllers/CC_Reporte.ts` |
| Reporte de exposiciones | `components/CI_Reporte_Exposiciones/CI_Reporte_Exposiciones.tsx` | `CI_Reporte_Exposiciones.module.css` | `lib/controllers/CC_Reporte.ts` |
| Reporte de préstamos | `components/CI_Reporte_Prestamos/CI_Reporte_Prestamos.tsx` | `CI_Reporte_Prestamos.module.css` | `lib/controllers/CC_Reporte.ts` |
| Popups | `components/ui/Popup.tsx`, `PopupSeleccion.tsx` y `PopupConfirmacion.tsx` | `components/ui/Popup.module.css` | No aplica |
| Página 404 | `app/not-found.tsx` | `app/not-found.module.css` | Sin controlador, textos en `lib/constantes.ts` |
| Estilos globales, transiciones y entrada animada | `app/layout.tsx` y `app/template.tsx` | `app/globals.css` y `app/template.module.css` | No aplica |
| Valores y mensajes fijos | No aplica | No aplica | `lib/constantes.ts` y cada `CC_*` |
| Validaciones | No aplica | No aplica | `lib/validaciones.ts` y cada `CC_*` |
| Fechas y zona horaria | No aplica | No aplica | `lib/fechas.ts` |
| Sesión y cuentas | No aplica | No aplica | `lib/auth/session.ts`, `lib/auth/cuentas.ts`, `proxy.ts` y `lib/supabase/` |
| Permisos de acceso por museo | No aplica | No aplica | `lib/controllers/acceso.ts` |
| Captura de errores de las acciones | No aplica | No aplica | `lib/controllers/errores.ts` y `lib/data/errores.ts` |
| Exportación a PDF y Excel | Botones en `components/ui/BotonesReporte.tsx` | `components/ui/BotonesReporte.module.css` | `lib/exportacion/` y rutas `pdf` y `excel` de `app/reportes/` |
| Importación de Excel | `components/CI_Importar_Piezas/CI_Importar_Piezas.tsx` | `CI_Importar_Piezas.module.css` | `lib/importacion/` y `lib/controllers/CC_Importacion.ts` |
| Capa de datos | No aplica | No aplica | `lib/data/contratos.ts`, `lib/data/index.ts` y `lib/data/prisma/` |
| Estructura de la base | No aplica | No aplica | `prisma/sql/01_crear_tablas.sql` y `prisma/sql/02_reglas_y_seguridad.sql` |
| Datos de demostración | No aplica | No aplica | `scripts/datosCarga.ts`, `scripts/cargaInicial.ts` y `lib/datosDemo.ts` |

### Librerías utilizadas

| Librería | Versión | Para qué se usa |
|-|-|-|
| Next.js | 16.3.8 | Framework y rutas: el App Router, las Server Actions de los controladores, el proxy y las rutas de servidor de PDF y Excel |
| React | 19.3.0 | Las vistas y los componentes de cada pantalla |
| React DOM | 19.3.0 | Renderizado de React en el navegador |
| TypeScript | 5.9.3 | Tipado de todo el código |
| Prisma (`@prisma/client` y `prisma`) | 7.10.1 | Acceso a PostgreSQL. El cliente se genera con `prisma generate` en `lib/data/prisma/generado`, que no se versiona. La herramienta de línea de comandos solo se usa para generar y validar |
| `@prisma/adapter-pg` y `pg` | 7.10.1 y 8.23.1 | Adaptador y controlador de PostgreSQL del cliente de Prisma |
| `@supabase/supabase-js` | 2.118.0 | API de administración de Auth (crear y borrar cuentas) y scripts de carga |
| `@supabase/ssr` | 0.12.7 | Sesión de Supabase Auth en cookies, para el servidor y el proxy |
| Sonner | 2.0.8 | Alertas de éxito y de error (`components/ui/ContenedorAlertas.tsx` y `components/ui/alertas.ts`) |
| ExcelJS | 4.4.0 | Plantilla de importación de piezas, lectura del Excel importado y exportación de los reportes a Excel |
| @react-pdf/renderer | 4.9.0 | Ficha técnica de la pieza y exportación de los reportes a PDF |
| tsx | 4.23.15 | Ejecuta los scripts de `scripts/`, solo para desarrollo |
| Anton e Inter | Sin paquete propio | Tipografías de títulos y de texto, cargadas con `next/font/google` en `app/layout.tsx` |
| @types/node, @types/pg, @types/react, @types/react-dom | 24.19.2, 8.23.1, 19.3.0, 19.3.0 | Tipos de TypeScript, solo para desarrollo |

No se usan Tailwind, Bootstrap ni librerías de estilos: todo es CSS propio con CSS Modules y variables globales.

## Códigos de las piezas

El código de una pieza lo asigna el sistema al guardarla y no se puede cambiar: el prefijo del museo, un guion y un número correlativo de al menos 3 dígitos (por ejemplo MMT-009). El número sale de un contador del museo que solo sube, así que un número no se reutiliza y los huecos no lo alteran. El formulario de registrar pieza no tiene campo de código, y editar pieza lo muestra en solo lectura.

El prefijo del museo también lo calcula el sistema al registrarlo y no cambia nunca, ni siquiera si se edita el nombre: las iniciales de las palabras significativas del nombre (sin de, del, la, las, el, los, y, e), o las tres primeras letras si hay una sola palabra, con un máximo de 5 letras y un número al final si ya existe. Se ve como columna en la lista de museos y en solo lectura al editar.

Cada pieza puede tener además un código anterior opcional (máximo 40 caracteres, único dentro del museo), que se puede editar y se muestra bajo el código en el catálogo.

Códigos de los datos de demostración:

| Museo | Prefijo | Códigos |
|-|-|-|
| Museo Municipal de Teatro | MMT | MMT-001 a MMT-008 |
| Pinacoteca Municipal Ignacio Merino | PMIM | PMIM-001 a PMIM-006 |
| Museo Amano | MA | MA-001 a MA-005 |
| Museo Andrés del Castillo | MAC | MAC-001 y MAC-002 |

Tres piezas del Museo Amano tienen código anterior para probar la función: MA-001 (INV-1987-0412), MA-002 (INV-1987-0418) y MA-005 (INV-1991-0107). La próxima pieza que se registre en cada museo recibe MMT-009, PMIM-007, MA-006 o MAC-003.

## Funciones

- **Acceso:** inicio de sesión con validación por campo (correo vacío, correo inválido y contraseña vacía), botón para mostrar u ocultar la contraseña y cambio de contraseña temporal. La recuperación de contraseña envía por correo, con Supabase Auth, un enlace que lleva a `/restablecer-contrasena`, donde se define la nueva contraseña (`/recuperar-contrasena` es la pantalla que lo solicita). Iniciar y cerrar sesión no muestran alertas. Con `MOSTRAR_DATOS_DEMO` en `true`, el login incluye el desplegable de datos demo.
- **Usuarios** (solo administrador): lista, registrar, editar, desactivar y activar cuentas, con museos asignados. Todo usuario, de cualquier rol, necesita al menos un museo. Si no hay museos activos, el formulario muestra un aviso y el botón "Registrar museo", que lleva a `/museos/nuevo`. Nadie puede desactivar su propia cuenta ni cambiar su propio rol. Una cuenta desactivada no puede iniciar sesión.
- **Museos** (solo administrador): lista, registrar, editar, desactivar y activar museos. Cada museo tiene un tipo de colección: arqueología, antropología o etnología; histórico; arte; ciencias naturales u otro. El prefijo lo calcula el sistema.
- **Piezas:** catálogo con seis filtros combinados (código, nombre, categoría, estado, disponibilidad y museo; la búsqueda ignora mayúsculas y tildes y el filtro de código también mira el código anterior) que se aplican con los botones Buscar y Limpiar o con Enter, y con la lista ordenada por código. Cada fila muestra la imagen, el código, el nombre, el estado, la disponibilidad y el museo, con cinco acciones: ver detalle, editar, actualizar el estado de conservación, ver el historial y generar la ficha técnica en PDF. Registrar y editar piezas usa un formulario de dos columnas, con imagen PNG o JPG, cuadrada y recomendada de 800 x 800 px, de máximo 1 MB. El año debe ser un entero entre -10000 y el año actual. Registrar, editar y actualizar el estado vuelven al catálogo al guardar.
- **Importar piezas:** descarga de la plantilla de Excel (sin columna de código y con la columna opcional Código anterior), validación fila por fila con vista previa e importación de las piezas válidas, al "Museo de destino" que se elige. El archivo debe ser .xlsx, de máximo 4 MB y 500 filas. Los códigos se asignan al importar, en el orden de las filas.
- **Exposiciones:** registrar, modificar y cancelar exposiciones, y asignarles piezas. Toda exposición necesita al menos una pieza y ninguna de sus dos fechas puede superar los 3 años desde hoy. El estado (programada, vigente, finalizada o cancelada) se calcula por las fechas, y una exposición cuya fecha de fin ya pasó queda finalizada y no se puede modificar ni cancelar. La lista se ordena por fecha de inicio, de la más reciente a la más antigua, y tiene filtros con los botones Buscar y Limpiar, como el catálogo de piezas.
- **Préstamos:** registrar préstamos de piezas a otras instituciones y registrar su devolución. Un préstamo admite una sola pieza, que se elige en un popup que solo ofrece piezas disponibles (con "Quitar" para deshacer la elección). La fecha de salida aparece con la de hoy y no puede ser posterior a hoy, la devolución prevista no puede superar los 3 años desde hoy, el valor asegurado debe ser mayor que cero con hasta 2 decimales y no superar 100 millones, y los textos tienen un máximo de 100 caracteres (institución y responsable) y de 40 (convenio y póliza). En la devolución, el estado de conservación al regresar se elige sin valor por defecto. La situación (en préstamo, vencido o devuelto) se calcula por las fechas.
- **Inventarios:** inventario físico por museo, con conteo pieza por pieza, cierre y resumen de diferencias. Cada inventario registra quién lo inició y quién lo cerró ("Iniciado por" y "Cerrado por" en su pantalla). Lo puede cerrar cualquier persona con acceso al museo del inventario, incluido el administrador, y no solo quien lo inició. Inventarios de los datos de demostración para probar: el del Teatro está cerrado (lo inició Gabriela y lo cerró Marco), el de la Pinacoteca está cerrado (lo inició y lo cerró Miguel) y el del Museo Amano sigue en curso, iniciado por Miguel. Para ver el cierre por otra persona, abrir con el administrador el del Museo Amano, marcar sus piezas y cerrarlo.
- **Reportes:** un menú de reportes (`/reportes`) con cuatro tarjetas, todas conectadas. Cada reporte tiene sus filtros, los botones Generar Reporte, Limpiar y Volver, y exportación a PDF y a Excel con los filtros con los que se generó. El PDF se abre en una pestaña nueva y el Excel se descarga. El colaborador solo ve los museos que tiene asignados, y la exportación vuelve a calcular el reporte en el servidor.
  - **Reporte por categoría y estado** (`/reportes/categoria-estado`): total de piezas por categoría y estado de conservación, con filtros por categoría, estado y fecha de registro (el día de la fecha de registro de la pieza, con los extremos incluidos).
  - **Reporte de piezas** (`/reportes/piezas`): listado por museo, con filtros de museo, disponibilidad y fecha de registro (Desde y Hasta). Columnas: código, nombre, categoría, estado, disponibilidad, museo, ubicación y fecha de registro, con el total de piezas.
  - **Reporte de exposiciones** (`/reportes/exposiciones`): una fila por exposición, con sus piezas, y filtros de museo, estado y rango de fechas (se muestran las exposiciones cuyo período se cruza con el rango).
  - **Reporte de préstamos** (`/reportes/prestamos`): once columnas, con filtros de museo, situación, institución destino y fecha de salida (Desde y Hasta, con los extremos incluidos).
- **Inicio y menú:** el menú superior, con el logotipo VESTIGIO, y las tarjetas de acceso del Inicio salen de la misma lista de opciones, según el rol: 7 para el administrador y 5 para el colaborador. En pantallas compactas el menú pasa a un botón de hamburguesa. Las pantallas entran con una animación breve, y las transiciones se apagan con el ajuste de movimiento reducido del sistema.

## Rutas principales

| Ruta | Pantalla |
|-|-|
| `/login`, `/recuperar-contrasena`, `/restablecer-contrasena` | Inicio de sesión, solicitud de recuperación de contraseña y nueva contraseña (esta última solo con el enlace del correo) |
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

## Recargar los datos

Para volver a los datos de demostración originales, ejecutar de nuevo `npm run db:cargar` y escribir `CARGAR`: vacía las 12 tablas, borra las cuentas de demostración anteriores de Auth y las crea otra vez. Las fechas de exposiciones, préstamos e inventarios se calculan a partir del día de la carga en la zona horaria de Lima, por lo que los estados siempre son coherentes. La aplicación no tiene un botón para restablecer datos.

## Estructura

- `app/`: rutas, un `page.tsx` por pantalla (31) y diez rutas de servidor: la plantilla de Excel, la ficha técnica en PDF y el PDF y el Excel de cada uno de los cuatro reportes. Además, `app/not-found.tsx` es la página 404 propia y no cuenta entre las 31 páginas.
- `components/CI_*/`: las vistas, una carpeta por pantalla (27). `components/ui/`: piezas compartidas (35 archivos), incluidas las alertas, el botón Copiar, la familia de popups (`Popup`, `PopupSeleccion` y `PopupConfirmacion`), la barra de navegación (`Navbar`) y los componentes de los reportes (`BotonesReporte`, `FiltrosReporte` y `TablaReporte`).
- `lib/controllers/`: nueve controladores `CC_*.ts` (Server Actions) con la lógica, las reglas de negocio y los permisos, más `acceso.ts` y `errores.ts`.
- `lib/data/`: el contrato de la capa de datos (`contratos.ts`), la implementación con Prisma por grupos de entidades (`prisma/`, diez archivos), las conversiones, las transacciones y la traducción de los errores de la base a mensajes en español (`errores.ts`). Toda función del contrato recibe `organizacionId` y filtra por organización.
- `lib/auth/` y `lib/supabase/`: sesión de Supabase Auth, cuentas con la API de administración y renovación de la sesión en cada petición. `proxy.ts` es el proxy de Next que la invoca.
- `lib/` (46 archivos en total): además, `navegacion.ts` (opciones del menú y de las tarjetas del Inicio), `validaciones.ts` (correo, contraseña y año), `codigos.ts` (prefijo del museo y código de la pieza), `datosDemo.ts` (las cuatro cuentas de demostración) y `config/env.ts` (lectura central de variables de entorno).
- `lib/exportacion/` e `lib/importacion/`: Excel de importación, PDF de la ficha técnica, y PDF y Excel de los reportes (`exportacionTabla.tsx` es genérico por columnas, para piezas, exposiciones y préstamos). `respuestaPdf.ts` es la respuesta común de los PDF, que se abren en una pestaña nueva con el visor del navegador.
- `lib/fechas.ts`: todo cálculo y formato de fechas, con una zona horaria única, America/Lima (`ZONA_HORARIA` en `lib/constantes.ts`). Las marcas con hora se guardan en UTC y el día y la hora que se muestran se convierten a esa zona. Ningún cálculo depende de la zona del servidor ni del navegador.
- `prisma/`: `schema.prisma` (12 modelos, solo para generar el cliente) y `sql/` con los dos scripts que crean y protegen la base. Los scripts son la fuente de verdad: crean las restricciones, los índices únicos y la seguridad por fila activada sin políticas, con los permisos de `anon` y `authenticated` quitados. El proyecto de Supabase está en la región West US (Oregon).
- `scripts/`: `datosCarga.ts` (los datos de demostración), `cargaInicial.ts` (`db:simular` y `db:cargar`) y `verificarCapaDatos.ts` (`db:verificar`).
- Límites: el Excel de importación admite hasta 4 MB y 500 filas, y el cuerpo de las Server Actions está fijado en 4.25 MB en `next.config.ts`, porque el tope del cuerpo de las funciones de Vercel es de 4.5 MB.

## Alcance y verificación

Es un prototipo con datos de demostración. Se comprobó que compila sin errores (34 páginas), que se construye desde cero sin archivos `.env` generando el cliente de Prisma al instalar, que los datos de demostración cumplen sus 10 reglas de consistencia (`db:simular`) y que la capa de datos funciona contra la base real de Supabase (`db:verificar`: 27 pruebas, incluidas las de operaciones simultáneas). Con la base real y clics en el navegador se comprobaron el login de las cuatro cuentas con sus museos, el registro de un usuario con contraseña temporal y su cambio obligatorio (con rechazo de una contraseña corta), el rechazo de una cuenta desactivada y de credenciales incorrectas, el registro de una pieza (MMT-009, con fecha de registro en hora de Lima), el catálogo y el historial, el reporte de piezas con su PDF, la ficha técnica y las listas de exposiciones y de préstamos. El resto de pantallas y las acciones de los otros roles se probaron con la versión anterior, que aún no usaba la base de datos, y la capa de datos las cubre con `db:verificar`.

No se ha verificado: el despliegue en Vercel y la velocidad en producción, la recuperación de contraseña con un correo real, las imágenes de las piezas en Supabase Storage (hoy se guardan en la base), el comportamiento en tablet y mobile (incluidos los reportes), la importación de Excel y las exportaciones de los otros tres reportes con la base real, y las acciones de escritura de cada rol en producción.

Pendientes: publicar en Vercel (variables de entorno, región cercana a la base y `DIRECT_URL` definida en el build; el proyecto de Supabase está en West US (Oregon)), mover las imágenes de las piezas a Supabase Storage, que editar el correo de un usuario también cambie el de su cuenta de Auth, una pantalla de error propia (hoy se ve la de Next.js por defecto, sin el estilo del proyecto) y capturar los errores de las acciones de solo lectura. Un proyecto gratuito de Supabase se pausa tras una semana sin uso y se restaura desde su panel. El detalle está en las secciones 10 y 11 de `MAPA.md`.
