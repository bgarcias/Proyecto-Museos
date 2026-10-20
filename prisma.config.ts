import { defineConfig } from "prisma/config";

// Excepción a la regla de process.env solo en lib/config/env.ts: esta configuración la lee la herramienta de
// línea de comandos de Prisma, fuera de Next, que no carga .env.local.
try {
  process.loadEnvFile(".env.local");
} catch {
  // Sin .env.local las variables deben venir del entorno
}

// Se pide aquí, con un mensaje claro, porque prisma generate corre en la instalación (postinstall)
const conexionDirecta = process.env.DIRECT_URL;
if (!conexionDirecta) {
  throw new Error(
    "Falta la variable de entorno DIRECT_URL, necesaria para generar el cliente de Prisma. Defínela en .env.local o en las variables de entorno del proyecto en Vercel (ver .env.example).",
  );
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    // Conexión directa (o session pooler), la que usan las herramientas. La aplicación usa DATABASE_URL.
    url: conexionDirecta,
  },
});
