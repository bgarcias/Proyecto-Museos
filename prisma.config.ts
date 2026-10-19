import { defineConfig, env } from "prisma/config";

// Excepción a la regla de process.env solo en lib/config/env.ts: esta configuración la lee la herramienta de
// línea de comandos de Prisma, fuera de Next, que no carga .env.local. La cadena se pide con env() de Prisma.
try {
  process.loadEnvFile(".env.local");
} catch {
  // Sin .env.local las variables deben venir del entorno
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    // Conexión directa (o session pooler), la que usan las herramientas. La aplicación usa DATABASE_URL.
    url: env("DIRECT_URL"),
  },
});
