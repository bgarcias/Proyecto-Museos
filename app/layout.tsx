import type { Metadata } from "next";
import { Anton, Inter } from "next/font/google";
import type { ReactNode } from "react";
import ContenedorAlertas from "@/components/ui/ContenedorAlertas";
import Navbar from "@/components/ui/Navbar";
import { obtenerUsuarioActual } from "@/lib/controllers/CC_Usuario";
import "./globals.css";

const anton = Anton({ weight: "400", subsets: ["latin"], variable: "--fuente-anton", display: "swap" });
const inter = Inter({ subsets: ["latin"], variable: "--fuente-sans", display: "swap" });

export const metadata: Metadata = {
  title: "VESTIGIO",
  description: "Prototipo del sistema de gestión de colecciones y exposiciones para museos",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const usuario = await obtenerUsuarioActual();
  // Con contraseña temporal solo se permite la pantalla de cambio de contraseña, sin menú.
  const mostrarMenu = usuario && !usuario.debeCambiarContrasena;

  return (
    <html lang="es" className={`${anton.variable} ${inter.variable}`}>
      <body>
        {mostrarMenu && <Navbar nombre={usuario.nombre} esAdministrador={usuario.rol === "administrador"} />}
        <main className="contenedor">{children}</main>
        <ContenedorAlertas />
      </body>
    </html>
  );
}
