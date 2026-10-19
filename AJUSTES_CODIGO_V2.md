# Adaptación del código al diseño final

Este documento describe todo lo que debe cambiar en el código existente para que coincida con el informe: entidades, campos, pantallas, clases de interfaz (CI_), clases de control (CC_), reglas y flujos. Léelo completo antes de tocar nada. Trabaja por bloques, en el orden de la sección 6.

El objetivo de esta tarea es que el prototipo, con datos en memoria, tenga todas las pantallas y la lógica del informe, para poder tomar las capturas de cada interfaz. Las especificaciones de la sección 7 son el texto oficial de cada caso de uso: los nombres de botones, opciones, campos y mensajes, y el orden de los pasos, deben coincidir con la interfaz.

## 0. Cómo trabajar

### 0.1 Protocolo por bloque

- Trabaja un bloque a la vez, en el orden de la sección 6.
- Al terminar cada bloque: ejecuta `npm run build`, corrige los errores y confirma que `npm run dev` sigue funcionando.
- Entrega un resumen corto con: archivos creados, modificados y eliminados; decisiones que tomaste; y cualquier punto donde el texto de una especificación (sección 7) no encaje con la interfaz. Los desajustes se reportan y no se resuelven por cuenta propia.
- Detente y espera confirmación antes de pasar al siguiente bloque.
- Al cerrar cada bloque no debe quedar código muerto ni referencias rotas de lo que ese bloque reemplazó.

### 0.2 Lo que NO se hace en esta tarea

- No modifiques `MAPA.md`, `README.md` ni `docs/CONEXION.md`.
- No inicialices Git ni crees commits.
- No conectes Prisma, Supabase, Storage ni Vercel. El prototipo sigue con `DATA_SOURCE=memoria`. El único cambio relacionado con Prisma es actualizar el archivo `prisma/schema.prisma` (solo como archivo, sin generator ni datasource, igual que hoy).
- No hagas pulido visual: no cambies colores, tipografías, transiciones ni puntos de quiebre. Las pantallas nuevas se arman con los componentes de `components/ui/`, las variables de `app/globals.css` y CSS Modules propios, con solo las dos media queries ya existentes (1025px y 768px). Sin Tailwind ni otras librerías de estilos.
- No cambies el comportamiento de nada que no aparezca en este documento.

### 0.3 Convenciones que se mantienen

- Las vistas (`CI_*`) no leen ni escriben datos. Solo los controladores (`CC_*`) llaman a la capa de datos y a la sesión. Todas las funciones de controladores y de datos son asíncronas.
- Las variables de entorno se leen solo desde `lib/config/env.ts`. Nunca escribas llaves, contraseñas reales ni direcciones de conexión en el código ni en documentos.
- Código, comentarios, textos de la interfaz y documentos en español. Sin dos guiones seguidos ni raya larga: usa guion simple, guion bajo, comas, puntos o dos puntos. Los comandos de terminal evitan banderas de doble guion.
- Dependencias con versiones exactas en `package.json`.
- Los nombres `CI_` y `CC_` aparecen en el informe y deben coincidir exactamente con los de este documento.

### 0.4 Lo que se conserva sin cambios (no romper)

Estas piezas existen hoy y deben seguir funcionando igual. No las borres ni las reescribas; solo se tocan donde un bloque lo indica de forma explícita.

- Sesión de demostración con cookie, login, cambio de contraseña temporal, pantalla de inicio y botón "Restablecer datos de demostración" (`CI_Login`, `CI_Cambiar_Contrasena`, `CI_Inicio`, `BotonRestablecer`, `lib/auth/session.ts`).
- Cuentas de demostración y su contraseña (`Museos2026`).
- Lista de usuarios (`CI_Menu_Usuarios`), catálogo (`CI_Catalogo_Piezas`), actualizar estado (`CI_Actualizar_Estado`), historial (`CI_Historial_Pieza` y `CC_Historial`), menú de reportes y reporte de inventario (`CI_Menu_Reportes`, `CI_Reporte_Inventario`, `CC_Reporte`).
- Los buscadores `BuscadorPiezas` y `BuscadorExposiciones`: se extienden, no se reemplazan.
- Todos los componentes de `components/ui/` (incluido `Mensaje.tsx`), `app/globals.css` y el `Menu.tsx` (solo se agregan opciones).
- Reglas vigentes: permisos por rol y por museo validados en los controladores, correo único, contraseña temporal de 8 caracteres mostrada una sola vez, estado de exposición calculado por fechas con fecha de fin exclusiva, historial por cambio de estado de conservación y rechazo de cambiar al mismo estado.

## 1. Decisiones de diseño ya tomadas

- **Ids:** texto con formato uuid en todas las entidades, porque el esquema final usa uuid. En la semilla, ids fijos con formato uuid para que las referencias sean estables; los registros nuevos usan `crypto.randomUUID()`. No uses `parseInt`, `Number` ni comparaciones numéricas sobre ids: rutas, cookie de sesión, formularios y controladores trabajan con texto.
- **Valores fijos en minúscula** en los datos y en los tipos (sección 2.2). La interfaz los muestra con sus etiquetas. Centraliza las etiquetas en `lib/constantes.ts`.
- **Aislamiento por organización:** toda lectura y escritura de los controladores se filtra por la organización de la persona en sesión. El administrador ve todos los museos de su organización y el colaborador solo los que tiene asignados (regla vigente).
- **Relaciones muchos a muchos** se mantienen como arreglos (`museoIds` en Usuario y `piezaIds` en Exposicion). Representan las tablas intermedias `usuario_museo` y `pieza_exposicion`.
- **Imagen de pieza:** en memoria se guarda como data URL en `imagenUrl` (PNG o JPG, máximo 1 MB). Más adelante pasará a un enlace de Storage.
- **Alertas:** Sonner.
- **Excel:** ExcelJS (lee y escribe .xlsx). **PDF:** `@react-pdf/renderer`.
- **Contraseñas:** la cuenta de demostración, la cookie y la contraseña temporal se mantienen. El esquema de Prisma no lleva contraseña.

## 2. Modelo de datos

### 2.1 Entidades (`lib/tipos.ts`)

Campos con `?` son opcionales. Todo lo demás es obligatorio.

| Entidad | Campos |
|-|-|
| Organizacion (nueva) | id, nombre |
| Usuario | id, organizacionId, nombre, email, rol, activo, museoIds[], contrasena, debeCambiarContrasena. `contrasena` y `debeCambiarContrasena` existen solo en memoria |
| Museo | id, organizacionId, nombre, tipo, direccion?, activo |
| Categoria (nueva) | id, organizacionId, nombre |
| Pieza | id, museoId, categoriaId, codigo, nombre, descripcion?, anio?, material?, estadoConservacion, ubicacionFisica?, imagenUrl?, disponibilidad, fechaRegistro |
| HistorialCambio | id, piezaId, usuarioId, campoModificado, valorAnterior?, valorNuevo?, fecha |
| Exposicion | id, museoId, nombre, descripcion?, fechaInicio, fechaFin, cancelada, piezaIds[] |
| Prestamo (nueva) | id, piezaId, usuarioId, institucionDestino, responsableReceptor, numeroConvenio, numeroPoliza, valorAsegurado (número), fechaSalida, fechaDevolucionPrevista, fechaDevolucionReal?, estadoConservacionSalida, estadoConservacionDevolucion? |
| Inventario (nueva) | id, museoId, usuarioId, fechaInicio, fechaCierre?, estado |
| DetalleInventario (nueva) | id, inventarioId, piezaId, resultado, observacion? |

Cambios sobre lo que existe hoy: `Pieza.categoria` (texto) pasa a `categoriaId`; `categoriaId`, `estadoConservacion`, `fechaInicio` y `fechaFin` dejan de ser opcionales; `Usuario` y `Museo` ganan `organizacionId` y `activo`; `Pieza` gana `codigo` y `disponibilidad`; `Exposicion` gana `cancelada`. Conserva la representación de fechas que ya usa `lib/fechas.ts`.

### 2.2 Valores fijos y etiquetas

| Campo | Valores guardados | Etiqueta en la interfaz |
|-|-|-|
| Usuario.rol | administrador, colaborador | Administrador, Colaborador |
| Museo.tipo | privado, municipal | Privado, Municipal |
| Pieza.estadoConservacion y préstamo (estados de salida y devolución) | bueno, regular, malo | Bueno, Regular, Malo |
| Pieza.disponibilidad | disponible, en_prestamo, pendiente_verificacion | Disponible, En préstamo, Pendiente de verificación |
| Inventario.estado | en_curso, cerrado | En curso, Cerrado |
| DetalleInventario.resultado | encontrada, no_encontrada, con_dano | Encontrada, No encontrada, Con daño |
| Estado de exposición (calculado, no se guarda) | programada, vigente, finalizada, cancelada | Programada, Vigente, Finalizada, Cancelada |
| Situación de préstamo (calculada, no se guarda) | en_prestamo, vencido, devuelto | En préstamo, Vencido, Devuelto |

### 2.3 Prisma (`prisma/schema.prisma`)

Actualiza el archivo de 7 a 12 modelos, con los mismos criterios que hoy (solo modelos, nombres de tabla y columna en snake_case con `@map` y `@@map`). Las 12 tablas ya existen en la base con estos nombres: `organizacion`, `usuario`, `museo`, `usuario_museo`, `categoria`, `pieza`, `historial_cambio`, `exposicion`, `pieza_exposicion`, `prestamo`, `inventario`, `detalle_inventario`.

- Todos los ids son uuid (`@db.Uuid`). `usuario.id` es el mismo id de la cuenta de inicio de sesión (Supabase Auth), por lo que no lleva valor por defecto y se elimina el campo `authId` actual. No lleva contraseña.
- Claves compuestas: `usuario_museo (usuario_id, museo_id)` y `pieza_exposicion (pieza_id, exposicion_id)`.
- Únicos: `usuario.email`; `pieza (museo_id, codigo)`; `categoria (organizacion_id, nombre)`; `detalle_inventario (inventario_id, pieza_id)`.
- `valor_asegurado` es numérico con 2 decimales. Fechas de exposición y de préstamo son `@db.Date`; fechas y horas son `DateTime`.
- Regla que Prisma no puede expresar: una pieza solo puede tener un préstamo abierto (fecha de devolución real nula). Déjala como comentario en el modelo.

### 2.4 Datos de demostración (semilla)

La semilla (`lib/data/memoria/semilla.ts`) debe quedar con datos suficientes y coherentes entre sí: entre dos y cinco registros por cada cosa, de modo que cada pantalla tenga qué mostrar y que las relaciones tengan sentido. Conserva todo lo que ya existe (las 4 cuentas con sus correos y contraseña, los 2 museos, las 12 piezas con sus nombres, categorías, ubicaciones e imágenes, las 3 exposiciones y los 6 registros de historial) y agrega lo que sigue. Las fechas se calculan desde hoy, como hoy: "hace 10 días" significa hoy menos 10 días.

**Organización:** una, llamada "Organización de demostración".

**Museos (4):**

| Museo | Tipo | Estado |
|-|-|-|
| Museo Municipal de Teatro (existente) | municipal | activo |
| Pinacoteca Municipal Ignacio Merino (existente) | municipal | activo |
| Museo Casa Quiñones (nuevo, con dirección) | privado | activo |
| Sala Cultural Santa Rosa (nuevo, con dirección) | municipal | inactivo (cerrada por remodelación) |

**Usuarios (6).** Todos con la contraseña `Museos2026`. Los cuatro existentes conservan su estado actual de cambio de contraseña.

| Nombre | Correo | Rol | Museos asignados | Estado |
|-|-|-|-|-|
| Brandon Garcia Sanchez | brandon.garcia@example.com | administrador | Museo Municipal de Teatro, Pinacoteca y Museo Casa Quiñones | activo |
| Gabriela Linares Ortega | gabriela.linares@example.com | colaborador | Museo Municipal de Teatro y Pinacoteca | activo |
| Marco Aguirre Soto | marco.aguirre@example.com | colaborador | Museo Municipal de Teatro | activo |
| Miguel Zambrano Melendez | miguel.zambrano@example.com | colaborador | Pinacoteca | activo |
| Lucía Paredes Vargas (nuevo) | lucia.paredes@example.com | colaborador | Museo Casa Quiñones | activo |
| Diego Salazar Rojas (nuevo) | diego.salazar@example.com | colaborador | Museo Municipal de Teatro | inactivo |

**Categorías:** las que ya usan las piezas existentes, más Escultura, Pintura, Orfebrería, Cerámica, Textil y Documento (sin duplicar).

**Piezas.** Las 12 existentes se conservan y reciben un `codigo` único por museo (por ejemplo MMT-001 en adelante para el Museo Municipal de Teatro y PMI-001 en adelante para la Pinacoteca). Se agregan 7 nuevas, todas con la imagen de marcador `sin-imagen.svg`, con descripción, año y material verosímiles (deja vacío algún campo opcional en una o dos piezas, para probar los campos opcionales):

| Museo | Código | Nombre | Categoría | Estado | Ubicación |
|-|-|-|-|-|-|
| Museo Casa Quiñones | CQ-001 | Mantón bordado de seda | Textil | bueno | Sala principal, vitrina 1 |
| Museo Casa Quiñones | CQ-002 | Cántaro de cerámica vidriada | Cerámica | bueno | Sala principal, repisa 2 |
| Museo Casa Quiñones | CQ-003 | Retrato al óleo de la familia Quiñones | Pintura | regular | Galería alta |
| Museo Casa Quiñones | CQ-004 | Cubiertos de plata labrada | Orfebrería | bueno | Comedor, vitrina 3 |
| Museo Casa Quiñones | CQ-005 | Libro de cuentas de la hacienda | Documento | malo | Almacén, estante B |
| Sala Cultural Santa Rosa | SR-001 | Cartel de la fiesta patronal | Documento | regular | Almacén |
| Sala Cultural Santa Rosa | SR-002 | Banco de madera tallada | Escultura | bueno | Almacén |

Todas las piezas tienen `fechaRegistro` anterior a cualquier evento de su historial, de sus préstamos o de sus inventarios.

**Exposiciones (5).** Las 3 existentes se conservan (confirma que entre ellas haya una vigente, una programada y una finalizada; si falta alguno de esos estados, ajusta sus fechas). Se agregan:

| Exposición | Museo | Estado | Fechas | Piezas |
|-|-|-|-|-|
| Textiles y vida doméstica | Museo Casa Quiñones | programada | inicio hoy más 15 días, fin hoy más 45 días | CQ-001, CQ-002 y CQ-004 |
| Retratos de época | Pinacoteca | cancelada (`cancelada` verdadero) | inicio hoy más 5 días, fin hoy más 25 días | 2 piezas de la Pinacoteca que no estén en otra exposición activa |

Con esto la semilla muestra los cuatro estados: programada, vigente, finalizada y cancelada.

**Préstamos (4).** Las piezas se eligen entre las existentes siguiendo los criterios de la columna Pieza. Las piezas de los préstamos 1 y 2 no pertenecen a ninguna exposición, ni siquiera finalizada.

| N.º | Pieza | Institución destino | Responsable | Convenio | Póliza | Valor | Salida | Devolución prevista | Devolución real | Estado salida | Estado devolución | Situación |
|-|-|-|-|-|-|-|-|-|-|-|-|-|
| 1 | Una pieza del Museo Municipal de Teatro | Centro Cultural Universitario | María Torres Quispe | CONV-2026-014 | POL-88421 | 4500.00 | hace 10 días | hoy más 20 días | sin fecha | el estado actual de la pieza | sin dato | En préstamo |
| 2 | Una pieza de la Pinacoteca | Biblioteca Municipal de Cultura | Jorge Salas Ríos | CONV-2026-007 | POL-77310 | 12000.00 | hace 60 días | hace 15 días | sin fecha | el estado actual de la pieza | sin dato | Vencido |
| 3 | Otra pieza del Museo Municipal de Teatro | Instituto de Artes Escénicas | Rosa Medina Cruz | CONV-2026-003 | POL-65102 | 3000.00 | hace 90 días | hace 40 días | hace 30 días | bueno | regular | Devuelto |
| 4 | CQ-003 | Galería Municipal de Arte | Pedro Ugarte León | CONV-2026-010 | POL-90233 | 8000.00 | hace 70 días | hace 50 días | hace 48 días | regular | regular | Devuelto |

Consecuencias en las piezas: las de los préstamos 1 y 2 quedan con disponibilidad `en_prestamo`. La del préstamo 3 queda con estado de conservación `regular` y disponibilidad `disponible`. CQ-003 queda `disponible`.

**Inventarios (3).** Las piezas esperadas de un inventario son las del museo, menos las que estaban en préstamo en esa fecha.

| N.º | Museo | Estado | Responsable | Fechas | Resultados |
|-|-|-|-|-|-|
| 1 | Museo Municipal de Teatro | cerrado | Gabriela Linares Ortega | inicio y cierre hace 5 días | Todas las piezas esperadas encontradas, salvo una con daño (observación "Fisura en la base") y una no encontrada (observación "No se ubicó en su vitrina"). Esas dos piezas son distintas de las de los préstamos y no están en una exposición vigente |
| 2 | Pinacoteca | cerrado | Miguel Zambrano Melendez | inicio y cierre hace 12 días | Todas encontradas. No incluye la pieza del préstamo 2, que ya estaba en préstamo |
| 3 | Museo Casa Quiñones | en curso | Lucía Paredes Vargas | inicio ayer | CQ-001 y CQ-002 encontradas, CQ-005 con daño (observación "Lomo desprendido"). CQ-003 y CQ-004 sin marcar |

Consecuencias de los cierres (se aplicaron en la fecha de cierre): en el inventario 1, la pieza con daño queda en estado `malo` y la no encontrada queda en `pendiente_verificacion`. En el inventario 3, que sigue en curso, no se aplica ningún efecto todavía. El Museo Casa Quiñones es el único con un inventario en curso. La Sala Cultural Santa Rosa no tiene inventarios.

**Historial adicional** (además de los 6 registros existentes). El usuario de cada registro tiene acceso al museo de la pieza.

| Cuándo | Pieza | Usuario | Campo | Anterior | Nuevo |
|-|-|-|-|-|-|
| hace 90 días | pieza del préstamo 3 | Marco Aguirre Soto | disponibilidad | disponible | en_prestamo |
| hace 70 días | CQ-003 | Lucía Paredes Vargas | disponibilidad | disponible | en_prestamo |
| hace 60 días | pieza del préstamo 2 | Miguel Zambrano Melendez | disponibilidad | disponible | en_prestamo |
| hace 48 días | CQ-003 | Lucía Paredes Vargas | disponibilidad | en_prestamo | disponible |
| hace 30 días | pieza del préstamo 3 | Marco Aguirre Soto | disponibilidad | en_prestamo | disponible |
| hace 30 días | pieza del préstamo 3 | Marco Aguirre Soto | estado de conservación | bueno | regular |
| hace 20 días | una pieza del Museo Municipal de Teatro no involucrada en préstamos | Gabriela Linares Ortega | ubicación física | la ubicación anterior | la ubicación actual |
| hace 10 días | pieza del préstamo 1 | Gabriela Linares Ortega | disponibilidad | disponible | en_prestamo |
| hace 8 días | CQ-001 | Lucía Paredes Vargas | ubicación física | Almacén | Sala principal, vitrina 1 |
| hace 5 días | pieza con daño del inventario 1 | Gabriela Linares Ortega | estado de conservación | su estado anterior | malo |
| hace 5 días | pieza no encontrada del inventario 1 | Gabriela Linares Ortega | disponibilidad | disponible | pendiente_verificacion |

Si las piezas existentes no alcanzan para cumplir estos criterios (por ejemplo, no hay suficientes piezas sin exposición en un museo), agrega piezas nuevas a ese museo en lugar de alterar las exposiciones existentes.

**Reglas de consistencia que la semilla debe cumplir:**

1. Todas las piezas de una exposición pertenecen al museo de esa exposición.
2. Toda pieza con disponibilidad `en_prestamo` tiene exactamente un préstamo abierto, y ninguna otra pieza tiene un préstamo abierto.
3. Una pieza con préstamo abierto no pertenece a ninguna exposición activa (no cancelada) cuyas fechas se crucen con el rango del préstamo.
4. Ninguna pieza está en dos exposiciones activas con fechas cruzadas.
5. Todo préstamo cerrado tiene fecha real y estado de devolución; su pieza está `disponible`, y su estado de conservación coincide con el estado de devolución.
6. Las piezas con disponibilidad `pendiente_verificacion` son exactamente las que quedaron no encontradas en un inventario cerrado.
7. Un inventario cerrado tiene un detalle por cada pieza esperada, y solo de piezas de su museo. Un inventario en curso solo tiene detalle de las piezas ya marcadas. No hay más de un inventario en curso por museo.
8. Cada usuario tiene asignados únicamente museos de su organización. El correo es único y el código de pieza es único dentro de cada museo.
9. Todo registro de historial está a nombre de un usuario con acceso al museo de la pieza, y sus fechas respetan el orden de los eventos (registro de la pieza, préstamo, devolución, inventario).
10. Los efectos de cada evento histórico están reflejados en el estado actual de las piezas (sección 5).

Escribe una comprobación temporal que recorra la semilla y verifique estas reglas, ejecútala, reporta el resultado en el resumen del Bloque 1 y elimínala del código.

## 3. Mapa de cambios de clases y rutas

### 3.1 Se renombran o se reemplazan

| Hoy | Pasa a | Nota |
|-|-|-|
| `CI_Registrar_Usuario` y `CI_Editar_Museos_Usuario` | `CI_Formulario_Usuario` | Un solo formulario para registrar (`/usuarios/nuevo`) y editar (`/usuarios/[id]`) |
| `CI_Registrar_Pieza` | `CI_Formulario_Pieza` | Registrar (`/piezas/nueva`) y editar (`/piezas/[id]/editar`, ruta nueva) |
| `CI_Lista_Exposiciones` | `CI_Menu_Exposiciones` | Módulo de exposiciones con las opciones del flujo |
| `CI_Programar_Exposicion` | `CI_Formulario_Exposicion` | Nueva (`/exposiciones/nueva`) y modificar (`/exposiciones/[id]/editar`, ruta nueva) |

### 3.2 Se eliminan (solo cuando su reemplazo funcione)

| Se elimina | Reemplazo | Rutas que desaparecen |
|-|-|-|
| `CI_Asignar_Piezas` | Selección de piezas dentro de `CI_Formulario_Exposicion` | `/exposiciones/asignar` |
| `CI_Finalizar_Exposicion` | Cancelar exposición desde `CI_Menu_Exposiciones` | `/exposiciones/finalizar` |
| `CC_Asignacion` | Su lógica pasa a `CC_Exposicion` | |

### 3.3 Clases nuevas

| Clase | Pantalla o función | Ruta |
|-|-|-|
| `CC_Museo` | Lógica de museos | |
| `CI_Menu_Museos` | Lista de museos | `/museos` |
| `CI_Formulario_Museo` | Registrar y editar museo | `/museos/nuevo`, `/museos/[id]` |
| `CC_Importacion` | Lógica de importación desde Excel | |
| `CI_Importar_Piezas` | Formulario, vista previa y resultado | `/piezas/importar` |
| `CC_Prestamo` | Lógica de préstamos y devoluciones | |
| `CI_Menu_Prestamos` | Módulo de préstamos | `/prestamos` |
| `CI_Formulario_Prestamo` | Nuevo préstamo | `/prestamos/nuevo` |
| `CI_Devolucion_Prestamo` | Registrar devolución | `/prestamos/devolucion` |
| `CC_Inventario` | Lógica de inventario físico | |
| `CI_Menu_Inventarios` | Lista de inventarios | `/inventarios` |
| `CI_Realizar_Inventario` | Conteo y cierre de un inventario | `/inventarios/[id]` |

Además: la plantilla de Excel se descarga desde `/piezas/importar/plantilla` y la ficha técnica en PDF desde `/piezas/[id]/ficha` (ambas son rutas de servidor, no pantallas). El menú (`Menu.tsx`) agrega las opciones Préstamos, Inventarios y, solo para administrador, Museos.

### 3.4 Siguen igual (sin cambios de nombre)

`CC_Usuario` (se amplía), `CC_Pieza` (se amplía), `CC_Exposicion` (se amplía y absorbe `CC_Asignacion`), `CC_Reporte`, `CC_Historial`, `CI_Login`, `CI_Cambiar_Contrasena`, `CI_Inicio`, `CI_Menu_Usuarios`, `CI_Catalogo_Piezas`, `CI_Actualizar_Estado`, `CI_Historial_Pieza`, `CI_Menu_Reportes`, `CI_Reporte_Inventario`. La pantalla de historial se mantiene aunque el informe ya no la especifique.

## 4. Capa de datos: operaciones nuevas o modificadas

Actualiza `lib/data/contratos.ts` y `lib/data/memoria/index.ts` con el mismo estilo actual (promesas, copias). Los nombres exactos los decides tú siguiendo el patrón existente. Debe existir al menos:

| Grupo | Operaciones |
|-|-|
| Organización | obtener la organización de una persona |
| Museos | listar (con filtro por organización), obtener, crear, actualizar (nombre, tipo, dirección), cambiar estado activo |
| Usuarios | crear (con organización), actualizar (nombre, email, rol, museos), cambiar estado activo. Reemplaza la actual que solo cambia museos |
| Categorías | listar por organización |
| Piezas | listar, obtener, crear, crear en lote (importación), actualizar datos, actualizar estado de conservación, actualizar disponibilidad, buscar por código dentro de un museo |
| Exposiciones | listar, obtener, crear, actualizar (datos y piezas), cancelar. Reemplazan `actualizarFechaFinExposicion` y `agregarPiezasAExposicion` |
| Préstamos | listar, obtener, crear, registrar devolución |
| Inventarios | listar, obtener, crear, marcar resultado de una pieza, listar detalle, cerrar |
| Historial | igual que hoy (listar y registrar cambio) |
| Demostración | restablecer datos (debe reconstruir también las entidades nuevas) |

## 5. Reglas de negocio nuevas o modificadas

**Usuarios y museos**
- Una cuenta desactivada no puede iniciar sesión. Si se desactiva una cuenta con sesión abierta, su siguiente petición cierra la sesión.
- Nadie puede desactivar su propia cuenta.
- Las cuentas y los museos desactivados pueden volver a activarse con la acción "Activar" de la lista, con ventana de confirmación. Activar un usuario conserva sus museos asignados y su historial. Activar un museo hace que vuelva a ofrecerse en los formularios nuevos. Un usuario inactivo no puede iniciar sesión hasta que se active.
- Desactivar un museo no borra nada: el museo deja de aparecer en las listas de selección de formularios nuevos (usuarios, piezas, exposiciones, importación, préstamos, inventarios), pero sus piezas y exposiciones siguen visibles.
- El nombre de un museo es único dentro de la organización.

**Piezas**
- El código es obligatorio y único dentro del museo.
- La categoría se elige de las categorías de la organización.
- Una pieza nueva queda con disponibilidad `disponible`.
- La situación "en exhibición" o "en almacén" sigue calculándose por las exposiciones vigentes, y no incluye exposiciones canceladas. Es independiente de la disponibilidad.
- Al editar una pieza (Gestionar Piezas), cada campo que cambia genera un registro de historial, con el nombre del campo en minúscula (código, nombre, categoría, descripción, año, material, ubicación física, imagen). El estado de conservación no se edita ahí: se cambia solo desde Actualizar estado. El museo de una pieza no se puede cambiar.
- Registrar una pieza a mano sigue sin generar historial (regla vigente). Importar piezas sí lo genera, según ECUS04.
- En el historial, los cambios de estado de conservación y de disponibilidad se guardan con su valor fijo en minúscula (por ejemplo `en_prestamo`) y se muestran con su etiqueta. Los demás campos se guardan como texto libre.

**Exposiciones**
- Estado: cancelada si el campo `cancelada` es verdadero; si no, el cálculo actual por fechas (fin exclusivo).
- Cancelar libera las piezas: la lista de piezas se conserva como registro, pero una exposición cancelada no cuenta para cruces de fechas ni para "en exhibición".
- Solo se pueden modificar o cancelar exposiciones no finalizadas y no canceladas.
- Se puede asignar una pieza a exposiciones no finalizadas y no canceladas (regla vigente: mismo museo, sin cruce de fechas con otra exposición).
- Una pieza no se puede asignar si hay un préstamo abierto cuyo rango de fechas (salida a devolución prevista) se cruza con el de la exposición. Reutiliza la función de cruce de rangos de `lib/fechas.ts`.

**Préstamos**
- Solo se puede prestar una pieza con disponibilidad `disponible`, y que no esté asignada a una exposición (no cancelada) cuyas fechas se crucen con las del préstamo.
- Solo hay un préstamo abierto por pieza (sin fecha de devolución real).
- Al crear un préstamo: el estado de conservación de salida se toma del estado actual de la pieza, la pieza pasa a `en_prestamo` y se registra el cambio en el historial.
- Al registrar la devolución: se guarda la fecha real (hoy) y el estado de devolución elegido; el estado de conservación de la pieza pasa a ese estado (con registro de historial si cambia, igual que ECUS03); la pieza vuelve a `disponible` y se registra el cambio en el historial.
- Situación: Devuelto si tiene fecha real; Vencido si no la tiene y la fecha prevista es anterior a hoy; En préstamo en los demás casos.

**Inventario físico**
- Se hace por museo. Solo puede haber un inventario en curso por museo.
- Las piezas esperadas son las del museo, excepto las que están en préstamo.
- Cada marca (encontrada, no encontrada, con daño, con observación opcional) se guarda al marcarla, así se puede retomar un inventario en curso.
- No se puede cerrar hasta que todas las piezas esperadas estén marcadas.
- Al cerrar: las no encontradas pasan a `pendiente_verificacion`; las con daño pasan a estado de conservación `malo` si no lo estaban; las encontradas que estaban en `pendiente_verificacion` vuelven a `disponible`. Cada cambio se registra en el historial. Luego se muestra el resumen de diferencias.

## 6. Bloques de trabajo

Orden obligatorio. La aplicación debe quedar funcionando al cerrar cada bloque.

### Bloque 0: dependencias y configuración

1. Instala `sonner`, `exceljs` y `@react-pdf/renderer`, cada una con versión exacta (instala con `npm install paquete@versión` y luego quita el prefijo `^` en `package.json`). Elige las últimas versiones estables compatibles con Next.js 16.3.8 y React 19.3.0.
2. Verifica que `@react-pdf/renderer` funciona con esa versión de Next.js generando un PDF mínimo desde una ruta de servidor temporal; elimina la ruta de prueba al terminar. Si no funciona, detente y repórtalo: la alternativa propuesta es `pdf-lib`.
3. Next.js limita por defecto el cuerpo de las Server Actions a 1 MB. Ajusta el límite a 6 MB en `next.config.ts` (verifica la clave correcta para la versión instalada), porque se subirán archivos Excel de hasta 5 MB e imágenes de hasta 1 MB. Si alguna librería necesita declararse como paquete externo del servidor, hazlo ahí.
4. Ejecuta `npm run build`.

### Bloque 1: modelo y datos (sin pantallas nuevas)

1. `lib/tipos.ts`: entidades de la sección 2.1.
2. `lib/constantes.ts`: valores fijos y etiquetas de la sección 2.2. Elimina la lista fija de categorías (pasa a datos). Agrega `cancelada` a las vigencias de exposición.
3. `lib/fechas.ts`: el estado de exposición considera `cancelada`; deja la función de cruce de rangos reutilizable para préstamos.
4. `lib/permisos.ts` y `lib/controllers/utilidades.ts`: filtros por organización y por museos asignados; helper de museos activos para listas de selección.
5. `lib/data/memoria/semilla.ts`: reconstruye la semilla completa según la sección 2.4, con las reglas de consistencia y la comprobación temporal que ahí se piden.
6. `lib/data/contratos.ts` y `lib/data/memoria/index.ts`: operaciones de la sección 4. El almacén en `globalThis` y la devolución de copias se mantienen. `restablecerDatos` reconstruye todo.
7. `prisma/schema.prisma`: sección 2.3.
8. Adapta lo mínimo de los controladores y pantallas existentes para que todo siga funcionando como hoy con ids de texto, valores en minúscula (con etiquetas en pantalla), categoría por id y exposición con `cancelada`. No agregues pantallas ni cambies flujos en este bloque. Al terminar deben seguir funcionando: login, cambio de contraseña, usuarios, catálogo, registrar pieza, actualizar estado, historial, exposiciones (programar, asignar, finalizar) y reportes.

### Bloque 2: alertas

1. Agrega un componente cliente en `components/ui/` que monte el `Toaster` de Sonner, y móntalo una vez en `app/layout.tsx`. Crea un helper pequeño con funciones de éxito y de error para centralizar su uso.
2. Reemplaza los mensajes de éxito y de error de las acciones existentes por alertas. Mantén `Mensaje.tsx` para mensajes que deben quedarse visibles dentro de la pantalla (listas de piezas en conflicto, contraseña temporal mostrada una sola vez, errores de campo).
3. Las alertas deben seguir visibles tras una redirección posterior a guardar. No cambies el estilo por defecto de Sonner.

### Bloque 3: Museos y Usuarios

1. **Museos (sin ECU en el informe, sección 7.7).** `CC_Museo`, `CI_Menu_Museos`, `CI_Formulario_Museo`, rutas `/museos`, `/museos/nuevo` y `/museos/[id]`, y opción "Museos" en el menú solo para administrador. Un colaborador que abra `/museos` vuelve a `/`. En un museo inactivo, la acción Desactivar se reemplaza por Activar.
2. **Usuarios (ECUS01, sección 7.1).** Unifica `CI_Registrar_Usuario` y `CI_Editar_Museos_Usuario` en `CI_Formulario_Usuario`; amplía `CC_Usuario` con editar y desactivar, y elimina lo que quede sin uso (por ejemplo la acción que solo editaba museos). La lista agrega la columna de estado (Activo o Inactivo) y las acciones Editar y Desactivar. En una cuenta inactiva, la acción Desactivar se reemplaza por Activar (con ventana de confirmación y el mensaje "Usuario activado exitosamente"). Eso es una extensión que el informe no incluye.
3. **Login:** una cuenta desactivada no puede ingresar (mensaje en la sección 7.10). Una sesión de una cuenta desactivada se cierra.
4. Elimina `CI_Editar_Museos_Usuario` y su CSS Module cuando el formulario unificado funcione.

### Bloque 4: Gestionar Piezas y Actualizar estado

1. Renombra `CI_Registrar_Pieza` a `CI_Formulario_Pieza` y haz que sirva para registrar (`/piezas/nueva`) y editar (`/piezas/[id]/editar`). Campos en este orden: Código, Nombre, Categoría, Descripción, Año, Material, Estado de conservación, Ubicación física, Museo, Imagen. En edición, el estado de conservación y el museo se muestran de solo lectura. Conserva las validaciones que ya existen y agrega: código, nombre, categoría, estado y museo obligatorios; código único por museo; imagen PNG o JPG de máximo 1 MB, guardada como data URL, con vista previa, opción de reemplazar y de quitar.
2. Catálogo (`CI_Catalogo_Piezas` y `BuscadorPiezas`): agrega las columnas Código y Disponibilidad y los filtros Código y Disponibilidad. Las acciones por fila pasan a: Editar, Actualizar estado de conservación y Ver historial (la acción Generar ficha técnica se agrega en el bloque 9). En la parte superior, junto a registrar pieza, agrega el botón "Importar piezas" (su pantalla llega en el bloque 5, deja la ruta apuntando a `/piezas/importar`). El filtro y el formulario de categoría leen las categorías de la organización.
3. Agrega a `BuscadorPiezas` un modo de selección única (hoy solo tiene selección múltiple), que usará préstamos. En los dos modos de selección (única y múltiple) agrega también las columnas Código y Disponibilidad.
4. ECUS03 (sección 7.3): la funcionalidad ya existe. Verifica que la opción, el botón y los mensajes coincidan literalmente con el texto y ajusta solo los textos que difieran.
5. Elimina `CI_Registrar_Pieza` cuando el formulario nuevo funcione.

### Bloque 5: Importar piezas (ECUS04)

Sección 7.4. Detalles técnicos:

- `CC_Importacion` y `CI_Importar_Piezas`, con tres estados en un mismo componente: formulario, vista previa y resultado, en ese orden.
- **Plantilla:** ruta `/piezas/importar/plantilla`, requiere sesión, genera con ExcelJS un .xlsx llamado `plantilla-importacion-piezas.xlsx`. Hoja "Piezas" con solo la fila de encabezados: Código, Nombre, Categoría, Descripción, Año, Material, Estado de conservación, Ubicación física. Hoja "Instrucciones" con las categorías válidas de la organización, los estados válidos (Bueno, Regular, Malo) y cuáles columnas son obligatorias (Código, Nombre, Categoría y Estado de conservación).
- **Subida:** solo .xlsx, máximo 5 MB y 500 filas. Se lee en el servidor con ExcelJS dentro de una Server Action. Si los encabezados no coinciden con la plantilla, se aplica el flujo alterno 1.
- **Validación por fila:** campos obligatorios completos; categoría existente en la organización (sin distinguir mayúsculas ni espacios sobrantes); estado válido (sin distinguir mayúsculas); año numérico entero si viene; código no registrado en el museo elegido ni repetido dentro del archivo.
- **Vista previa:** total de filas válidas, total de filas con error y detalle de cada fila inválida (número de fila y motivo).
- **Confirmación:** el cliente envía de vuelta las filas válidas y el servidor vuelve a validar todo antes de insertar (nunca confiar en el cliente). Inserta en lote, con disponibilidad `disponible`, y registra en el historial de cada pieza el alta por importación (campo modificado "alta por importación", usuario y fecha).
- Resultado: mensaje con el total de piezas registradas.

### Bloque 6: Gestionar Exposición (ECUS05)

Sección 7.5. Detalles técnicos:

- `CI_Menu_Exposiciones` en `/exposiciones`: muestra la lista actual (`BuscadorExposiciones`, con el filtro de vigencia ampliado con Cancelada) y las tres opciones del flujo: "Nueva exposición" (va a `/exposiciones/nueva`), "Modificar exposición" y "Cancelar exposición". Las dos últimas abren una ventana con `BuscadorExposiciones` en selección única (así se cumple el paso de buscar exposición del flujo). Al elegir para modificar, va a `/exposiciones/[id]/editar`. Al elegir para cancelar, se muestra en una ventana angosta el resumen (nombre, museo sede, fechas y piezas asignadas) con los botones de confirmar y de volver.
- `CI_Formulario_Exposicion`: campos Nombre, Descripción, Museo sede (museos activos asignados a la persona), Fecha de inicio, Fecha de fin y la opción "Agregar piezas", que abre una ventana con `BuscadorPiezas` en selección múltiple, filtrado por el museo sede elegido. Las piezas elegidas se listan en el formulario, cada una con un botón para quitarla. En edición se cargan los datos y las piezas actuales.
- Validaciones al guardar, en este orden: fechas; museo de las piezas igual al museo sede; disponibilidad de cada pieza según la sección 5. Si hay piezas en conflicto, no se guarda nada y se muestran cuáles son (en un `Mensaje` visible) para quitarlas de la selección.
- Si hoy ya existe un mensaje para fecha de fin igual a la de inicio, consérvalo. Para fecha de fin anterior a la de inicio usa el texto del Word.
- Elimina `CI_Asignar_Piezas`, `CI_Finalizar_Exposicion`, `CC_Asignacion` y sus rutas, y las operaciones de datos que queden sin uso.
- Verifica que ninguna otra pantalla enlace a las rutas eliminadas (inicio, menú, buscadores).

### Bloque 7: Préstamos (ECUS06)

Sección 7.6. Detalles técnicos:

- `CI_Menu_Prestamos` en `/prestamos`: botones "Nuevo préstamo" y "Registrar devolución", y una tabla con todos los préstamos de los museos de la persona: Pieza, Institución destino, Fecha de salida, Fecha de devolución prevista, Fecha de devolución y Situación.
- `CI_Formulario_Prestamo` en `/prestamos/nuevo`: campos en el orden del flujo, con "Seleccionar pieza" abriendo `BuscadorPiezas` en selección única. Tras elegir, se muestran la pieza y su estado de conservación actual.
- `CI_Devolucion_Prestamo` en `/prestamos/devolucion`: lista de préstamos vigentes (En préstamo o Vencido), selección de uno, resumen y lista de estados para registrar el estado de la pieza al regresar, con el botón "Confirmar devolución".
- Opción "Préstamos" en el menú para ambos roles.

### Bloque 8: Inventario físico

Sección 7.8.

- `CC_Inventario`, `CI_Menu_Inventarios` en `/inventarios` y `CI_Realizar_Inventario` en `/inventarios/[id]`.
- La opción "Inventarios" se agrega al menú para ambos roles.

### Bloque 9: Reporte y ficha técnica

1. ECUS02 (sección 7.2): la funcionalidad ya existe. Verifica que las opciones, botones y mensajes coincidan literalmente y ajusta solo los textos que difieran. El reporte agrupa por las categorías de la organización y debe seguir funcionando con los valores en minúscula.
2. **Ficha técnica (sección 7.9).** Ruta `/piezas/[id]/ficha`, que devuelve un PDF generado con `@react-pdf/renderer`. Agrega la acción "Generar ficha técnica" por fila en el catálogo, abriendo el PDF en una pestaña nueva. Solo puede generar la ficha quien tenga acceso al museo de la pieza; en otro caso, no se encuentra.

### Bloque 10: limpieza final

1. Busca referencias a todo lo eliminado (`CI_Registrar_Usuario`, `CI_Editar_Museos_Usuario`, `CI_Registrar_Pieza`, `CI_Lista_Exposiciones`, `CI_Programar_Exposicion`, `CI_Asignar_Piezas`, `CI_Finalizar_Exposicion`, `CC_Asignacion`, rutas `/exposiciones/asignar` y `/exposiciones/finalizar`) y elimina lo que sobre: CSS Modules, importaciones y operaciones de datos sin uso.
2. Confirma que no quedan ids tratados como números, ni valores con mayúscula guardados en los datos.
3. Recorre todas las rutas con ambos roles (administrador y colaborador) y confirma permisos, estados vacíos y botones de volver.
4. `npm run build` sin errores ni advertencias nuevas.
5. Ejecuta de nuevo la comprobación de consistencia de la semilla (sección 2.4) y elimínala otra vez al terminar.
6. Entrega el resumen final: lista de rutas, de clases `CI_` y `CC_`, y los puntos de la sección 9.

## 7. Especificaciones de casos de uso

Los textos de ECUS01 a ECUS06 son los del informe. Los nombres de botones y opciones, los nombres de campos, los mensajes y el orden de los pasos se toman literalmente. Un flujo básico describe el orden en que la persona ve y usa la interfaz: la pantalla debe permitir ese orden.

### ECUS01 - Gestionar Usuarios del Museo

**Actores**

Administrador

**Propósito**

Permitir al administrador registrar, editar y desactivar las cuentas de los colaboradores de los museos que gestiona.

**Breve Descripción**

Este caso de uso permite al administrador registrar a los colaboradores en el sistema, asignándoles sus credenciales y los museos a los que tendrán acceso, así como editar sus datos y desactivar sus cuentas cuando ya no deban acceder.

**Flujo Básico de Eventos**

El caso de uso inicia cuando el administrador selecciona la opción "Usuarios" en el menú del sistema.

1. El sistema muestra la lista de usuarios registrados en los museos que gestiona el administrador, con las opciones "Editar" y "Desactivar" para cada usuario.

2. El administrador selecciona la opción "Nuevo Usuario".

3. El sistema muestra el formulario de registro con los campos: nombre, email, rol y museos, este último como una lista con los museos que gestiona el administrador.

4. El administrador ingresa los datos, selecciona uno o más museos y presiona el botón "Guardar".

5. El sistema valida que el email no esté previamente registrado.

6. El sistema crea la cuenta y la asocia a los museos seleccionados.

7. El sistema muestra el mensaje "Usuario registrado exitosamente", retornando a la lista de usuarios y finaliza el caso de uso.

**Sub Flujos**

_Sub flujo 1: Editar usuario_

El sub flujo inicia cuando el administrador selecciona la opción "Editar" de un usuario en la lista de usuarios.

1. El sistema muestra el formulario con los datos actuales del usuario: nombre, email, rol y museos asignados.

2. El administrador modifica los datos necesarios y presiona el botón "Guardar".

3. El sistema valida que el email no pertenezca a otro usuario.

4. El sistema actualiza los datos del usuario y sus museos asignados.

5. El sistema muestra el mensaje "Usuario actualizado exitosamente", retorna a la lista de usuarios y finaliza el sub flujo.

_Sub flujo 2: Desactivar usuario_

El sub flujo inicia cuando el administrador selecciona la opción "Desactivar" de un usuario en la lista de usuarios.

1. El sistema verifica que el usuario seleccionado no sea el propio administrador.

2. El sistema solicita la confirmación de la desactivación.

3. El administrador confirma la acción.

4. El sistema marca la cuenta como inactiva.

5. El sistema muestra el mensaje "Usuario desactivado exitosamente", actualiza la lista de usuarios y finaliza el sub flujo.

**Flujos Alternos**

En el paso 5 del flujo básico, si el email ya está registrado, el sistema muestra el mensaje "Este correo ya se encuentra registrado" y permite corregir el dato.

En el paso 3 del sub flujo "Editar usuario", si el email ya pertenece a otro usuario, el sistema muestra el mensaje "Este correo ya se encuentra registrado" y permite corregir el dato.

En el paso 1 del sub flujo "Desactivar usuario", si el usuario seleccionado es el propio administrador, el sistema muestra el mensaje "No puede desactivar su propia cuenta" y cancela la operación.

En el paso 3 del sub flujo "Desactivar usuario", si el administrador no confirma la acción, el sistema cancela la operación y la cuenta se mantiene activa.

**Precondiciones**

El administrador debe haber iniciado sesión en el sistema.

**Post condiciones**

El nuevo colaborador queda habilitado para iniciar sesión en el sistema. Si se editó un usuario, sus datos y museos asignados quedan actualizados. Si se desactivó un usuario, no podrá iniciar sesión y su historial de cambios se conserva.

**Puntos de Extensión**

No aplica

**Requerimientos Especiales**

No aplica


Implementación: además de lo descrito, al registrar un usuario se mantiene la contraseña temporal de 8 caracteres mostrada una sola vez. Los campos del formulario son nombre, email, rol y museos, en ese orden. Los museos que se ofrecen son los museos activos de la organización. Extensión fuera del informe: en la lista, un usuario inactivo muestra "Activar" en lugar de "Desactivar", con ventana de confirmación y el mensaje "Usuario activado exitosamente".

### ECUS02 - Generar Reporte de Inventario por Categoría y Estado

**Actores**

Colaborador

**Propósito**

Permitir al colaborador obtener información consolidada de la colección, agrupada por categoría y por estado de conservación.

**Breve Descripción**

Este caso de uso permite al colaborador generar un reporte que muestra el total de piezas registradas, agrupadas por categoría y por estado de conservación, para apoyar la toma de decisiones del museo.

**Flujo Básico de Eventos**

El caso de uso inicia cuando el colaborador selecciona la opción "Reportes" en el menú del sistema.

1. El sistema muestra las opciones de filtro disponibles (categoría, estado de conservación, rango de fechas).

2. El colaborador selecciona los filtros deseados y presiona el botón "Generar Reporte".

3. El sistema consulta la información de las piezas registradas según los filtros seleccionados.

4. El sistema muestra el reporte consolidado, con el total de piezas agrupado por categoría y por estado de conservación, y finaliza el caso de uso.

**Sub Flujos**

No aplica

**Flujos Alternos**

1. En el paso 3, si no existen piezas registradas que cumplan con los filtros seleccionados, el sistema muestra el mensaje "No se encontraron resultados para los filtros aplicados".

**Precondiciones**

El colaborador debe haber iniciado sesión en el sistema.

**Post condiciones**

El reporte generado puede visualizarse en pantalla.

**Puntos de Extensión**

No aplica

**Requerimientos Especiales**

No aplica


### ECUS03 - Actualizar Estado de Conservación de una Pieza

**Actores**

Colaborador

**Propósito**

Permitir al colaborador actualizar el estado de conservación de una pieza de la colección.

**Breve Descripción**

Este caso de uso permite al colaborador registrar el nuevo estado de conservación de una pieza, dejando constancia del cambio en el historial de la misma.

**Flujo Básico de Eventos**

El caso de uso inicia cuando el colaborador selecciona una pieza del catálogo y elige la opción "Actualizar estado de conservación".

1. El sistema muestra el estado de conservación actual de la pieza y la lista de estados disponibles.

2. El colaborador selecciona el nuevo estado y presiona el botón "Guardar".

3. El sistema valida que el nuevo estado sea distinto del estado actual.

4. El sistema actualiza el estado de conservación de la pieza.

5. El sistema registra el cambio en el historial de la pieza, con el dato modificado (estado de conservación), el valor anterior, el valor nuevo, el usuario que lo realizó y la fecha.

6. El sistema muestra el mensaje "Estado de conservación actualizado correctamente" y finaliza el caso de uso.

**Sub Flujos**

No aplica

**Flujos Alternos**

1. En el paso 3, si el nuevo estado es igual al actual, el sistema muestra el mensaje "El estado seleccionado es el mismo que el actual" y permite elegir otro.

**Precondiciones**

El colaborador debe haber iniciado sesión en el sistema y la pieza debe estar registrada.

**Post condiciones**

La pieza queda con su nuevo estado de conservación y el cambio queda registrado en su historial.

**Puntos de Extensión**

No aplica

**Requerimientos Especiales**

No aplica


### ECUS04 - Importar Piezas desde Excel

**Actores**

Colaborador

**Propósito**

Permitir al colaborador registrar varias piezas a la vez a partir de un archivo Excel con el formato de la plantilla del sistema.

**Breve Descripción**

Este caso de uso permite al colaborador cargar un archivo Excel con los datos de las piezas de un museo, validar su contenido fila por fila y registrar en el catálogo las piezas válidas, evitando el ingreso manual una por una.

**Flujo Básico de Eventos**

El caso de uso inicia cuando el colaborador selecciona la opción "Importar piezas" en el módulo de Colecciones.

1. El sistema muestra el formulario de importación con la lista de museos asignados al colaborador, la opción "Descargar plantilla" y el campo para cargar el archivo.

2. El colaborador selecciona el museo de destino, carga el archivo Excel y presiona el botón "Validar archivo".

3. El sistema verifica que el archivo tenga el formato de la plantilla.

4. El sistema valida cada fila del archivo: campos obligatorios completos, categoría y estado de conservación válidos, y código de pieza no registrado previamente en el museo ni repetido en el archivo.

5. El sistema muestra la vista previa con el total de filas válidas, el total de filas con error y el detalle del error de cada fila inválida.

6. El colaborador presiona el botón "Importar piezas válidas".

7. El sistema registra las piezas válidas en el museo seleccionado.

8. El sistema registra en el historial de cada pieza su alta por importación, con el usuario que la realizó y la fecha.

9. El sistema muestra el mensaje "Importación finalizada correctamente" con el total de piezas registradas y finaliza el caso de uso.

**Sub Flujos**

No aplica

**Flujos Alternos**

En el paso 3, si el archivo no tiene el formato de la plantilla, el sistema muestra el mensaje "El archivo no tiene el formato de la plantilla" y permite cargar otro archivo.

En el paso 5, si todas las filas tienen errores, el sistema muestra el mensaje "No hay piezas válidas para importar" y no habilita el botón "Importar piezas válidas".

En el paso 6, si el colaborador cancela la importación, el sistema no registra ninguna pieza.

**Precondiciones**

El colaborador debe haber iniciado sesión en el sistema y tener asignado al menos un museo.

**Post condiciones**

Las piezas válidas del archivo quedan registradas en el catálogo del museo seleccionado y su alta queda registrada en el historial. Las filas con error no se registran.

**Puntos de Extensión**

No aplica

**Requerimientos Especiales**

El archivo debe ser de tipo Excel (.xlsx) y respetar las columnas de la plantilla descargable.


Implementación: el botón "Importar piezas" vive en el catálogo de piezas. La plantilla se descarga con "Descargar plantilla". El botón de validar se llama "Validar archivo" y el de confirmar "Importar piezas válidas".

### ECUS05 - Gestionar Exposición

**Actores**

Colaborador

**Propósito**

Permitir al colaborador registrar, modificar y cancelar las exposiciones de los museos, asignándoles las piezas que se exhibirán.

**Breve Descripción**

Este caso de uso permite al colaborador crear una exposición con sus datos generales y sus piezas en un mismo proceso, modificarla posteriormente (datos y piezas) y cancelarla cuando corresponda, verificando que las piezas estén disponibles en las fechas indicadas.

**Flujo Básico de Eventos**

El caso de uso inicia cuando el colaborador selecciona la opción "Exposiciones" en el menú del sistema.

1. El sistema muestra el módulo de exposiciones con las opciones "Nueva exposición", "Modificar exposición" y "Cancelar exposición".

2. El colaborador selecciona la opción "Nueva exposición".

3. El sistema muestra el formulario de registro con los campos: nombre, descripción, museo sede (lista de los museos asignados al colaborador), fecha de inicio, fecha de fin y la opción "Agregar piezas".

4. El colaborador ingresa los datos y selecciona la opción "Agregar piezas".

5. El sistema ejecuta el caso de uso "Buscar Piezas por Criterios" para que el colaborador seleccione las piezas de la exposición.

6. El colaborador confirma la selección de piezas y presiona el botón "Guardar".

7. El sistema valida que la fecha de fin no sea anterior a la fecha de inicio.

8. El sistema valida que ninguna de las piezas seleccionadas esté en préstamo ni asignada a otra exposición cuyas fechas se crucen con las de la nueva exposición.

9. El sistema registra la exposición con sus piezas.

10. El sistema muestra el mensaje "Exposición registrada correctamente", retorna al módulo de exposiciones y finaliza el caso de uso.

**Sub Flujos**

_Sub flujo 1: Modificar exposición_

El sub flujo inicia cuando el colaborador selecciona la opción "Modificar exposición" en el módulo de exposiciones.

1. El sistema ejecuta el caso de uso "Buscar Exposición" para que el colaborador elija la exposición a modificar.

2. El sistema muestra el formulario con los datos actuales de la exposición y sus piezas asignadas.

3. El colaborador modifica los datos necesarios (nombre, descripción, museo sede, fechas) y, si lo requiere, agrega o quita piezas ejecutando el caso de uso "Buscar Piezas por Criterios", y presiona el botón "Guardar".

4. El sistema valida que la fecha de fin no sea anterior a la fecha de inicio y que ninguna pieza esté en préstamo ni asignada a otra exposición cuyas fechas se crucen.

5. El sistema actualiza la exposición y sus piezas.

6. El sistema muestra el mensaje "Exposición actualizada correctamente", retorna al módulo de exposiciones y finaliza el sub flujo.

_Sub flujo 2: Cancelar exposición_

El sub flujo inicia cuando el colaborador selecciona la opción "Cancelar exposición" en el módulo de exposiciones.

1. El sistema ejecuta el caso de uso "Buscar Exposición" para que el colaborador elija la exposición a cancelar.

2. El sistema muestra el resumen de la exposición: nombre, museo sede, fechas y piezas asignadas.

3. El colaborador confirma la cancelación.

4. El sistema marca la exposición como cancelada y libera sus piezas.

5. El sistema muestra el mensaje "Exposición cancelada correctamente", retorna al módulo de exposiciones y finaliza el sub flujo.

**Flujos Alternos**

En el paso 7 del flujo básico, si la fecha de fin es anterior a la fecha de inicio, el sistema muestra el mensaje "La fecha de fin no puede ser anterior a la fecha de inicio" y permite corregir el dato.

En el paso 8 del flujo básico, si alguna pieza está en préstamo o asignada a otra exposición en fechas que se cruzan, el sistema indica cuáles piezas no pueden asignarse y permite quitarlas de la selección.

En el paso 4 del sub flujo "Modificar exposición", se aplican los mismos mensajes y acciones de los flujos alternos 1 y 2.

En el paso 1 del sub flujo "Cancelar exposición", si la exposición elegida ya finalizó o ya fue cancelada, el sistema muestra el mensaje "No es posible cancelar esta exposición" y finaliza el sub flujo.

En el paso 3 del sub flujo "Cancelar exposición", si el colaborador no confirma la acción, el sistema cancela la operación y la exposición se mantiene sin cambios.

**Precondiciones**

El colaborador debe haber iniciado sesión en el sistema y tener asignado al menos un museo. Para modificar o cancelar, debe existir al menos una exposición registrada.

**Post condiciones**

La exposición queda registrada o actualizada con sus piezas asociadas. Si se canceló, la exposición queda cancelada y sus piezas quedan liberadas.

**Puntos de Extensión**

No aplica

**Requerimientos Especiales**

El estado de la exposición (programada, vigente o finalizada) se determina automáticamente a partir de sus fechas de inicio y fin.


Implementación: las opciones "Nueva exposición", "Modificar exposición" y "Cancelar exposición" se muestran en la pantalla del módulo de exposiciones.

### ECUS06 - Registrar Préstamo de una Pieza

**Actores**

Colaborador

**Propósito**

Permitir al colaborador registrar el préstamo de una pieza a otra institución y controlar su devolución.

**Breve Descripción**

Este caso de uso permite al colaborador registrar la salida temporal de una pieza hacia otra institución, con los datos del convenio y la póliza que respaldan el préstamo, dejar la pieza bloqueada para otras exposiciones mientras dure el préstamo y registrar su devolución.

**Flujo Básico de Eventos**

El caso de uso inicia cuando el colaborador selecciona la opción "Préstamos" en el menú del sistema.

1. El sistema muestra el módulo de préstamos con las opciones "Nuevo préstamo" y "Registrar devolución".

2. El colaborador selecciona la opción "Nuevo préstamo".

3. El sistema muestra el formulario de préstamo con los campos: institución destino, responsable que recibe, número de convenio, número de póliza, valor asegurado, fecha de salida, fecha de devolución prevista y la opción "Seleccionar pieza".

4. El colaborador ingresa los datos y selecciona la opción "Seleccionar pieza".

5. El sistema ejecuta el caso de uso "Buscar Piezas por Criterios" para que el colaborador elija la pieza a prestar.

6. El sistema muestra la pieza seleccionada con su estado de conservación actual.

7. El colaborador presiona el botón "Guardar".

8. El sistema valida que todos los campos estén completos y que la fecha de devolución prevista sea posterior a la fecha de salida.

9. El sistema valida que la pieza no esté en préstamo ni asignada a una exposición cuyas fechas se crucen con las del préstamo.

10. El sistema registra el préstamo con el estado de conservación de la pieza al momento de la salida y cambia la pieza a "En préstamo".

11. El sistema registra el cambio en el historial de la pieza.

12. El sistema muestra el mensaje "Préstamo registrado correctamente", retorna al módulo de préstamos y finaliza el caso de uso.

**Sub Flujos**

_Sub flujo 1: Registrar devolución_

El sub flujo inicia cuando el colaborador selecciona la opción "Registrar devolución" en el módulo de préstamos.

1. El sistema muestra la lista de préstamos vigentes con su pieza, institución destino y fecha de devolución prevista.

2. El colaborador selecciona el préstamo que desea cerrar.

3. El sistema muestra el resumen del préstamo y la lista de estados de conservación para registrar el estado de la pieza al regresar.

4. El colaborador selecciona el estado de conservación y presiona el botón "Confirmar devolución".

5. El sistema registra la fecha de devolución, marca el préstamo como devuelto, actualiza el estado de conservación de la pieza y la deja disponible.

6. El sistema registra el cambio en el historial de la pieza.

7. El sistema muestra el mensaje "Devolución registrada correctamente", retorna al módulo de préstamos y finaliza el sub flujo.

**Flujos Alternos**

En el paso 8 del flujo básico, si algún campo está incompleto o la fecha de devolución prevista no es posterior a la fecha de salida, el sistema muestra el mensaje "Complete todos los campos y verifique que la fecha de devolución sea posterior a la fecha de salida" y permite corregir los datos.

En el paso 9 del flujo básico, si la pieza está en préstamo o asignada a una exposición en fechas que se cruzan, el sistema muestra el mensaje "La pieza no está disponible en las fechas indicadas" y permite elegir otra pieza o modificar las fechas.

En el paso 1 del sub flujo "Registrar devolución", si no existen préstamos vigentes, el sistema muestra el mensaje "No existen préstamos vigentes" y finaliza el sub flujo.

**Precondiciones**

El colaborador debe haber iniciado sesión en el sistema y la pieza a prestar debe estar registrada.

**Post condiciones**

El préstamo queda registrado, la pieza figura "En préstamo" y no puede asignarse a exposiciones durante ese periodo. Al registrar la devolución, el préstamo queda cerrado y la pieza vuelve a estar disponible con su estado de conservación actualizado.

**Puntos de Extensión**

No aplica

**Requerimientos Especiales**

Un préstamo cuya fecha de devolución prevista ya pasó y que no tiene devolución registrada se muestra como "Vencido" en la lista de préstamos vigentes.


Implementación: las opciones "Nuevo préstamo" y "Registrar devolución" se muestran en la pantalla del módulo de préstamos. El estado de conservación al salir se muestra de solo lectura.

### 7.7 Gestionar Museos (sin especificación en el informe)

Actor: administrador. Pantallas: lista (`CI_Menu_Museos`) y formulario (`CI_Formulario_Museo`).

1. El administrador selecciona la opción "Museos" en el menú.
2. El sistema muestra la lista de museos de su organización (Nombre, Tipo, Dirección, Estado) con el botón "Nuevo Museo" y las acciones "Editar" y "Desactivar" por fila (un museo inactivo muestra "Activar" en lugar de "Desactivar").
3. Nuevo: el formulario tiene Nombre, Tipo (Privado o Municipal) y Dirección (opcional); botón "Guardar". Editar: el mismo formulario con los datos actuales.
4. Validaciones: nombre y tipo obligatorios; nombre único en la organización.
5. Desactivar: ventana de confirmación; el museo queda inactivo y deja de ofrecerse en formularios nuevos.
6. Activar: ventana de confirmación; el museo vuelve a ofrecerse en formularios nuevos.

Mensajes: "Museo registrado exitosamente", "Museo actualizado exitosamente", "Museo desactivado exitosamente", "Museo activado exitosamente", "Ya existe un museo con ese nombre".

### 7.8 Realizar Inventario Físico (sin especificación en el informe)

Actor: colaborador (y administrador). Pantallas: `CI_Menu_Inventarios` y `CI_Realizar_Inventario`.

1. La persona selecciona la opción "Inventarios" en el menú.
2. El sistema muestra la lista de inventarios (Museo, Fecha de inicio, Fecha de cierre, Estado) y el botón "Nuevo inventario".
3. Nuevo inventario: se elige el museo (activo y asignado) y se crea el inventario en curso. Si el museo ya tiene uno en curso, se muestra "Ya existe un inventario en curso para este museo".
4. En el inventario en curso, el sistema lista las piezas esperadas (Imagen, Código, Nombre, Ubicación). Por cada una, la persona marca Encontrada, No encontrada o Con daño y puede escribir una observación. Cada marca se guarda al marcarla.
5. Con todas las piezas marcadas, la persona presiona "Cerrar inventario". Si falta alguna: "Debe marcar todas las piezas antes de cerrar el inventario".
6. El sistema aplica las reglas de cierre de la sección 5, registra los cambios en el historial y muestra el resumen: totales de encontradas, no encontradas y con daño, y la lista de piezas no encontradas y con daño. Mensaje: "Inventario cerrado correctamente".
7. Un inventario cerrado se abre en modo de solo lectura con el mismo resumen.

### 7.9 Generar Ficha Técnica de una Pieza (sin especificación en el informe)

1. En el catálogo, la persona busca la pieza y elige "Generar ficha técnica".
2. El sistema abre en una pestaña nueva un PDF de una página, con: nombre del museo, nombre y código de la pieza, imagen, categoría, descripción, año, material, estado de conservación, ubicación física, disponibilidad, fecha de registro, y al pie la fecha de generación.
3. Imagen: `@react-pdf/renderer` solo admite PNG y JPG. Si la pieza tiene una imagen en esos formatos, se incluye. Las imágenes de marcador de la semilla son SVG: en ese caso, y cuando no hay imagen, dibuja un recuadro neutro con el texto "Sin imagen".
4. Usa la fuente por defecto de la librería, de forma que no se necesiten archivos de fuentes. El nombre del archivo es `ficha-tecnica-` seguido del código de la pieza.

### 7.10 Mensajes definidos fuera del informe

Estos textos no están en el informe. Úsalos tal cual y repórtalos en el resumen del bloque para que se revisen:

- Login con cuenta desactivada: "La cuenta se encuentra desactivada. Comuníquese con el administrador."
- Pieza: "Ya existe una pieza con ese código en el museo", "Pieza actualizada correctamente", "La imagen debe ser PNG o JPG de máximo 1 MB".
- Exposición: "No es posible modificar esta exposición" (si está finalizada o cancelada).
- Activar: "Usuario activado exitosamente" y "Museo activado exitosamente".
- Inventario y museos: los de las secciones 7.7 y 7.8.

## 8. Checklist por pantalla

Cada pantalla nueva o modificada debe cumplir estos cinco puntos antes de cerrar su bloque:

1. Campos obligatorios marcados y validados.
2. Mensajes de error y de éxito (alertas, o `Mensaje` donde corresponda).
3. Permisos por rol y por museo validados en el controlador.
4. Estado vacío cuando no hay datos (listas, buscadores, reportes).
5. Acción de cancelar o volver.

## 9. Puntos que quedan abiertos (repórtalos, no los resuelvas)

- Activar usuarios y museos desactivados es una mejora acordada que el informe no incluye. Si la asesora lo pide, se agrega a ECUS01 como sub flujo 3.
- Registrar una pieza a mano no genera historial, pero importar sí: es lo que dicen la regla vigente y ECUS04.
- Las imágenes de pieza se guardan como data URL solo mientras el prototipo use memoria.
- Las imágenes de marcador de la semilla son SVG y no se incluyen en la ficha técnica en PDF.
- Cualquier otro desajuste entre un texto del informe y la interfaz.
