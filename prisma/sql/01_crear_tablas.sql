/*
 * ADVERTENCIA: este script DESTRUYE DATOS.
 * Borra las 12 tablas de la aplicación en el esquema public y las vuelve a crear vacías.
 * No toca ninguna otra tabla ni el esquema auth. Ejecutar solo en una base que se puede perder.
 * Después de este script hay que ejecutar 02_reglas_y_seguridad.sql.
 */

drop table if exists public.detalle_inventario cascade;
drop table if exists public.inventario cascade;
drop table if exists public.prestamo cascade;
drop table if exists public.pieza_exposicion cascade;
drop table if exists public.exposicion cascade;
drop table if exists public.historial_cambio cascade;
drop table if exists public.pieza cascade;
drop table if exists public.categoria cascade;
drop table if exists public.usuario_museo cascade;
drop table if exists public.museo cascade;
drop table if exists public.usuario cascade;
drop table if exists public.organizacion cascade;

/* Organización: agrupa usuarios, museos y categorías */
create table public.organizacion (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  creado_en timestamptz not null default now()
);

/*
 * Usuario: el id es el de la cuenta de Supabase Auth, por eso no tiene valor por defecto.
 * No guarda contraseña. Al borrar la cuenta de Auth se borra el usuario.
 */
create table public.usuario (
  id uuid primary key references auth.users (id) on delete cascade,
  organizacion_id uuid not null references public.organizacion (id) on delete restrict,
  nombre text not null,
  email text not null,
  rol text not null check (rol in ('administrador', 'colaborador')),
  activo boolean not null default true,
  creado_en timestamptz not null default now()
);

/*
 * Museo: el prefijo lo calcula la aplicación al crearlo (lib/codigos.ts) y no cambia nunca.
 * ultimo_correlativo es de uso interno: último número usado en el código de las piezas del museo.
 * El prefijo solo lleva letras mayúsculas y dígitos, y puede pasar de 5 caracteres si lleva número al final.
 */
create table public.museo (
  id uuid primary key default gen_random_uuid(),
  organizacion_id uuid not null references public.organizacion (id) on delete restrict,
  nombre text not null,
  prefijo text not null check (prefijo ~ '^[A-Z0-9]+$'),
  ultimo_correlativo integer not null default 0 check (ultimo_correlativo >= 0),
  tipo text not null check (tipo in ('arqueologia', 'historico', 'arte', 'ciencias_naturales', 'otro')),
  direccion text,
  activo boolean not null default true,
  constraint museo_organizacion_prefijo_unico unique (organizacion_id, prefijo)
);

/* Museos asignados a cada usuario: reemplaza al arreglo museoIds */
create table public.usuario_museo (
  usuario_id uuid not null references public.usuario (id) on delete cascade,
  museo_id uuid not null references public.museo (id) on delete cascade,
  primary key (usuario_id, museo_id)
);

/* Categorías: datos de cada organización */
create table public.categoria (
  id uuid primary key default gen_random_uuid(),
  organizacion_id uuid not null references public.organizacion (id) on delete restrict,
  nombre text not null,
  constraint categoria_organizacion_nombre_unico unique (organizacion_id, nombre)
);

/*
 * Pieza: el código es el prefijo del museo, un guion y el correlativo (por ejemplo MMT-001).
 * codigo_anterior es opcional y de máximo 40 caracteres (MAXIMO_CODIGO_ANTERIOR).
 * El año va desde -10000 y la cota superior (el año actual) la valida la aplicación.
 * imagen_url queda vacío cuando la pieza no tiene imagen.
 */
create table public.pieza (
  id uuid primary key default gen_random_uuid(),
  museo_id uuid not null references public.museo (id) on delete restrict,
  categoria_id uuid not null references public.categoria (id) on delete restrict,
  codigo text not null check (codigo ~ '^[A-Z0-9]+-[0-9]+$'),
  codigo_anterior text check (char_length(codigo_anterior) <= 40),
  nombre text not null,
  descripcion text,
  anio integer check (anio >= -10000),
  material text,
  estado_conservacion text not null check (estado_conservacion in ('bueno', 'regular', 'malo')),
  ubicacion_fisica text,
  imagen_url text,
  disponibilidad text not null default 'disponible'
    check (disponibilidad in ('disponible', 'en_prestamo', 'pendiente_verificacion')),
  fecha_registro timestamptz not null default now(),
  constraint pieza_museo_codigo_unico unique (museo_id, codigo)
);

/* Historial de cambios de una pieza: se borra con la pieza */
create table public.historial_cambio (
  id uuid primary key default gen_random_uuid(),
  pieza_id uuid not null references public.pieza (id) on delete cascade,
  usuario_id uuid not null references public.usuario (id) on delete restrict,
  campo_modificado text not null,
  valor_anterior text,
  valor_nuevo text,
  fecha timestamptz not null default now()
);

/* Exposición: fechas de solo día. El estado (programada, vigente, finalizada) se calcula y no se guarda */
create table public.exposicion (
  id uuid primary key default gen_random_uuid(),
  museo_id uuid not null references public.museo (id) on delete restrict,
  nombre text not null,
  descripcion text,
  fecha_inicio date not null,
  fecha_fin date not null,
  cancelada boolean not null default false,
  check (fecha_fin > fecha_inicio)
);

/* Piezas de cada exposición: reemplaza al arreglo piezaIds */
create table public.pieza_exposicion (
  pieza_id uuid not null references public.pieza (id) on delete cascade,
  exposicion_id uuid not null references public.exposicion (id) on delete cascade,
  primary key (pieza_id, exposicion_id)
);

/*
 * Préstamo: una sola pieza por préstamo. La situación (en préstamo, vencido, devuelto) se calcula.
 * Los dos datos de la devolución van juntos: ambos vacíos mientras el préstamo está abierto.
 */
create table public.prestamo (
  id uuid primary key default gen_random_uuid(),
  pieza_id uuid not null references public.pieza (id) on delete restrict,
  usuario_id uuid not null references public.usuario (id) on delete restrict,
  institucion_destino text not null check (char_length(institucion_destino) <= 100),
  responsable_receptor text not null check (char_length(responsable_receptor) <= 100),
  numero_convenio text not null check (char_length(numero_convenio) <= 40),
  numero_poliza text not null check (char_length(numero_poliza) <= 40),
  valor_asegurado numeric(12, 2) not null check (valor_asegurado > 0 and valor_asegurado <= 100000000),
  fecha_salida date not null,
  fecha_devolucion_prevista date not null,
  fecha_devolucion_real date,
  estado_conservacion_salida text not null check (estado_conservacion_salida in ('bueno', 'regular', 'malo')),
  estado_conservacion_devolucion text check (estado_conservacion_devolucion in ('bueno', 'regular', 'malo')),
  check (fecha_devolucion_prevista > fecha_salida),
  check ((fecha_devolucion_real is null) = (estado_conservacion_devolucion is null))
);

/*
 * Inventario: en curso no tiene fecha ni persona de cierre. Cerrado exige las dos.
 * usuario_id es quien lo inició y usuario_cierre_id quien lo cerró.
 */
create table public.inventario (
  id uuid primary key default gen_random_uuid(),
  museo_id uuid not null references public.museo (id) on delete restrict,
  usuario_id uuid not null references public.usuario (id) on delete restrict,
  usuario_cierre_id uuid references public.usuario (id) on delete restrict,
  fecha_inicio timestamptz not null default now(),
  fecha_cierre timestamptz,
  estado text not null check (estado in ('en_curso', 'cerrado')),
  check (
    (estado = 'cerrado' and fecha_cierre is not null and usuario_cierre_id is not null)
    or (estado = 'en_curso' and fecha_cierre is null and usuario_cierre_id is null)
  )
);

/* Resultado del conteo de cada pieza en un inventario: se borra con su inventario */
create table public.detalle_inventario (
  id uuid primary key default gen_random_uuid(),
  inventario_id uuid not null references public.inventario (id) on delete cascade,
  pieza_id uuid not null references public.pieza (id) on delete restrict,
  resultado text not null check (resultado in ('encontrada', 'no_encontrada', 'con_dano')),
  observacion text,
  constraint detalle_inventario_inventario_pieza_unico unique (inventario_id, pieza_id)
);

/*
 * Índices de las claves foráneas. Las que son la primera columna de una clave primaria o de un único
 * ya tienen índice: usuario_museo.usuario_id, pieza_exposicion.pieza_id, museo.organizacion_id,
 * categoria.organizacion_id, pieza.museo_id y detalle_inventario.inventario_id.
 */
create index usuario_organizacion_idx on public.usuario (organizacion_id);
create index museo_organizacion_idx on public.museo (organizacion_id);
create index usuario_museo_museo_idx on public.usuario_museo (museo_id);
create index categoria_organizacion_idx on public.categoria (organizacion_id);
create index pieza_museo_idx on public.pieza (museo_id);
create index pieza_categoria_idx on public.pieza (categoria_id);
create index historial_cambio_pieza_fecha_idx on public.historial_cambio (pieza_id, fecha desc);
create index historial_cambio_usuario_idx on public.historial_cambio (usuario_id);
create index exposicion_museo_idx on public.exposicion (museo_id);
create index pieza_exposicion_exposicion_idx on public.pieza_exposicion (exposicion_id);
create index prestamo_pieza_idx on public.prestamo (pieza_id);
create index prestamo_usuario_idx on public.prestamo (usuario_id);
create index inventario_museo_idx on public.inventario (museo_id);
create index inventario_usuario_idx on public.inventario (usuario_id);
create index inventario_usuario_cierre_idx on public.inventario (usuario_cierre_id);
create index detalle_inventario_pieza_idx on public.detalle_inventario (pieza_id);
