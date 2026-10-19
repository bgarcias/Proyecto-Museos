"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { activarUsuario, desactivarUsuario, verificarDesactivacionUsuario } from "@/lib/controllers/CC_Usuario";
import { ETIQUETAS_ROL } from "@/lib/constantes";
import type { UsuarioListado } from "@/lib/tipos";
import { alertaError, alertaExito } from "@/components/ui/alertas";
import Boton, { BotonEnlace } from "@/components/ui/Boton";
import Celda, { EncabezadoPagina } from "@/components/ui/Celda";
import DialogoConfirmacion from "@/components/ui/DialogoConfirmacion";
import Insignia from "@/components/ui/Insignia";
import Tabla from "@/components/ui/Tabla";
import estilos from "./CI_Menu_Usuarios.module.css";

export default function CI_Menu_Usuarios({ usuarios }: { usuarios: UsuarioListado[] }) {
  const router = useRouter();
  const [seleccionado, setSeleccionado] = useState<UsuarioListado | null>(null);
  const [procesando, setProcesando] = useState(false);

  /** Desactivar verifica primero que no sea la propia cuenta; Activar pide confirmación directamente. */
  async function elegir(u: UsuarioListado) {
    if (u.activo) {
      const verificacion = await verificarDesactivacionUsuario(u.id);
      if (!verificacion.ok) {
        alertaError(verificacion.error);
        return;
      }
    }
    setSeleccionado(u);
  }

  async function confirmar() {
    if (!seleccionado) return;
    setProcesando(true);
    const resultado = seleccionado.activo
      ? await desactivarUsuario(seleccionado.id)
      : await activarUsuario(seleccionado.id);
    setProcesando(false);
    setSeleccionado(null);
    if (resultado.ok) {
      alertaExito(resultado.mensaje ?? "");
      router.refresh();
    } else {
      alertaError(resultado.error);
    }
  }

  return (
    <div className={estilos.pagina}>
      <EncabezadoPagina
        etiqueta="Administración"
        titulo="Usuarios"
        acciones={<BotonEnlace href="/usuarios/nuevo" variante="principal">Nuevo Usuario</BotonEnlace>}
      />
      <Celda>
        <Tabla resumen="Usuarios">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Email</th>
              <th>Rol</th>
              <th>Museos</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.length === 0 && (
              <tr>
                <td colSpan={6}>No hay usuarios registrados</td>
              </tr>
            )}
            {usuarios.map((u) => (
              <tr key={u.id}>
                <td>{u.nombre}</td>
                <td>{u.email}</td>
                <td>{ETIQUETAS_ROL[u.rol]}</td>
                <td>{u.museos.join(", ")}</td>
                <td>
                  <Insignia valor={u.activo ? "Activo" : "Inactivo"} />
                </td>
                <td>
                  <div className={estilos.acciones}>
                    <BotonEnlace href={`/usuarios/${u.id}`} pequeno>
                      Editar
                    </BotonEnlace>
                    <Boton variante={u.activo ? "peligro" : "secundario"} pequeno onClick={() => elegir(u)}>
                      {u.activo ? "Desactivar" : "Activar"}
                    </Boton>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </Tabla>
      </Celda>

      {seleccionado && (
        <DialogoConfirmacion
          titulo={seleccionado.activo ? "Desactivar usuario" : "Activar usuario"}
          procesando={procesando}
          onConfirmar={confirmar}
          onCancelar={() => setSeleccionado(null)}
        >
          {seleccionado.activo
            ? `¿Desactivar la cuenta de ${seleccionado.nombre}? No podrá iniciar sesión y su historial de cambios se conserva.`
            : `¿Activar la cuenta de ${seleccionado.nombre}? Podrá iniciar sesión y conserva sus museos asignados.`}
        </DialogoConfirmacion>
      )}
    </div>
  );
}
