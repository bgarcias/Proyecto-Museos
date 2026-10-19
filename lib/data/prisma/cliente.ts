import { PrismaPg } from "@prisma/adapter-pg";
import { obtenerDatabaseUrl } from "../../config/env";
import { PrismaClient } from "./generado/client";

// Solo para el servidor: no importar desde componentes de cliente.

/* Pool pequeño: cada función de Vercel abre sus propias conexiones y la base tiene un límite total */
const MAXIMO_CONEXIONES = 3;
const ESPERA_CONEXION_MS = 5_000;
const INACTIVIDAD_MS = 10_000;

// Se guarda en globalThis para que la recarga en caliente no abra un pool nuevo en cada cambio.
const global = globalThis as unknown as { __prismaMuseos?: PrismaClient };

/** Cliente de Prisma, creado la primera vez que se pide. Usa la cadena con pool (DATABASE_URL). */
export function obtenerPrisma(): PrismaClient {
  if (!global.__prismaMuseos) {
    const adaptador = new PrismaPg({
      connectionString: obtenerDatabaseUrl(),
      max: MAXIMO_CONEXIONES,
      connectionTimeoutMillis: ESPERA_CONEXION_MS,
      idleTimeoutMillis: INACTIVIDAD_MS,
      // Supabase exige SSL. Cifra la conexión sin validar el certificado, que no es de una autoridad pública.
      // Si la cadena trae sslmode, la librería pg lo aplica en lugar de esto.
      ssl: { rejectUnauthorized: false },
    });
    global.__prismaMuseos = new PrismaClient({ adapter: adaptador });
  }
  return global.__prismaMuseos;
}
