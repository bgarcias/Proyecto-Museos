/*
 * Reglas de unicidad que Prisma no puede expresar y seguridad de las 12 tablas.
 * Ejecutar después de 01_crear_tablas.sql, y de nuevo cada vez que se vuelva a ejecutar el 01:
 * al recrear las tablas, Supabase vuelve a darles permisos por defecto a anon y authenticated.
 */

/* El correo es único sin importar mayúsculas. La aplicación lo guarda en minúscula */
create unique index usuario_email_unico on public.usuario (lower(email));

/* El nombre del museo es único dentro de la organización, sin importar mayúsculas ni espacios al borde */
create unique index museo_organizacion_nombre_unico on public.museo (organizacion_id, lower(btrim(nombre)));

/*
 * El código anterior es único dentro del museo, solo cuando existe.
 * La expresión replica claveCodigoAnterior de lib/codigos.ts: espacios repetidos reducidos a uno,
 * espacios al borde fuera y todo en minúscula.
 */
create unique index pieza_museo_codigo_anterior_unico
  on public.pieza (museo_id, lower(btrim(regexp_replace(codigo_anterior, '\s+', ' ', 'g'))))
  where codigo_anterior is not null;

/* Un solo inventario en curso por museo */
create unique index inventario_en_curso_unico on public.inventario (museo_id) where estado = 'en_curso';

/* Un solo préstamo abierto por pieza */
create unique index prestamo_abierto_unico on public.prestamo (pieza_id) where fecha_devolucion_real is null;

/*
 * Seguridad por fila activada y sin ninguna política: la API pública de Supabase no puede leer
 * ni escribir estas tablas. La aplicación entra desde el servidor con una conexión directa.
 */
alter table public.organizacion enable row level security;
alter table public.usuario enable row level security;
alter table public.museo enable row level security;
alter table public.usuario_museo enable row level security;
alter table public.categoria enable row level security;
alter table public.pieza enable row level security;
alter table public.historial_cambio enable row level security;
alter table public.exposicion enable row level security;
alter table public.pieza_exposicion enable row level security;
alter table public.prestamo enable row level security;
alter table public.inventario enable row level security;
alter table public.detalle_inventario enable row level security;

/* Segunda barrera: se quitan todos los permisos a los roles de la API pública */
revoke all on table public.organizacion from anon, authenticated;
revoke all on table public.usuario from anon, authenticated;
revoke all on table public.museo from anon, authenticated;
revoke all on table public.usuario_museo from anon, authenticated;
revoke all on table public.categoria from anon, authenticated;
revoke all on table public.pieza from anon, authenticated;
revoke all on table public.historial_cambio from anon, authenticated;
revoke all on table public.exposicion from anon, authenticated;
revoke all on table public.pieza_exposicion from anon, authenticated;
revoke all on table public.prestamo from anon, authenticated;
revoke all on table public.inventario from anon, authenticated;
revoke all on table public.detalle_inventario from anon, authenticated;
