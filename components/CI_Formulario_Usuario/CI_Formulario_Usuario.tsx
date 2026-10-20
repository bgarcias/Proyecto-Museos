"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { actualizarUsuario, registrarUsuario } from "@/lib/controllers/CC_Usuario";
import { ETIQUETAS_ROL, ROLES } from "@/lib/constantes";
import type { Museo, Usuario } from "@/lib/tipos";
import { alertaError, alertaExito } from "@/components/ui/alertas";
import BotonCopiar from "@/components/ui/BotonCopiar";
import Boton, { BotonEnlace } from "@/components/ui/Boton";
import { Campo, Casilla, DatoLectura, Entrada, Formulario, GrupoCasillas, Seleccion } from "@/components/ui/Campo";
import Celda, { Acciones, EncabezadoPagina } from "@/components/ui/Celda";
import Mensaje from "@/components/ui/Mensaje";
import Popup from "@/components/ui/Popup";
import estilos from "./CI_Formulario_Usuario.module.css";

/** Registrar un usuario (sin datos) o editarlo (con el usuario actual). Campos: nombre, email, rol y museos. */
export default function CI_Formulario_Usuario({
  usuario,
  museos,
  esCuentaPropia,
}: {
  usuario: Usuario | null;
  museos: Museo[];
  /** Al editar la propia cuenta, el rol se muestra de solo lectura. */
  esCuentaPropia: boolean;
}) {
  const router = useRouter();
  const [nombre, setNombre] = useState(usuario?.nombre ?? "");
  const [email, setEmail] = useState(usuario?.email ?? "");
  const [rol, setRol] = useState<string>(usuario?.rol ?? "colaborador");
  const [museoIds, setMuseoIds] = useState<string[]>(usuario?.museoIds ?? []);
  const [enviando, setEnviando] = useState(false);
  const [contrasenaTemporal, setContrasenaTemporal] = useState<string | null>(null);

  const alternarMuseo = (id: string) =>
    setMuseoIds((actuales) => (actuales.includes(id) ? actuales.filter((m) => m !== id) : [...actuales, id]));

  async function alEnviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEnviando(true);
    const entrada = { nombre, email, rol, museoIds };
    const resultado = usuario ? await actualizarUsuario(usuario.id, entrada) : await registrarUsuario(entrada);
    if (!resultado.ok) {
      alertaError(resultado.error);
      setEnviando(false);
      return;
    }
    // La alerta se dispara antes de navegar: el Toaster del layout sigue visible en la lista.
    alertaExito(resultado.mensaje ?? "");
    if (!usuario && "datos" in resultado && resultado.datos) {
      // La contraseña temporal se muestra una sola vez; al cerrar el popup vuelve a la lista.
      setContrasenaTemporal(resultado.datos.contrasenaTemporal);
      return;
    }
    router.push("/usuarios");
  }

  return (
    <div className={estilos.pagina}>
      <EncabezadoPagina etiqueta="Usuarios" titulo={usuario ? "Editar usuario" : "Nuevo usuario"} />
      <Celda estrecha>
        <Formulario onSubmit={alEnviar}>
          <Campo etiqueta="Nombre" htmlFor="nombre" obligatorio>
            <Entrada id="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </Campo>
          <Campo etiqueta="Email" htmlFor="email" obligatorio>
            <Entrada id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Campo>
          {usuario && esCuentaPropia ? (
            <DatoLectura etiqueta="Rol">{ETIQUETAS_ROL[usuario.rol]}</DatoLectura>
          ) : (
            <Campo etiqueta="Rol" htmlFor="rol" obligatorio>
              <Seleccion id="rol" value={rol} onChange={(e) => setRol(e.target.value)}>
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ETIQUETAS_ROL[r]}
                  </option>
                ))}
              </Seleccion>
            </Campo>
          )}
          <GrupoCasillas etiqueta="Museos" obligatorio>
            {museos.length === 0 ? (
              <>
                <Mensaje tipo="neutro">No hay museos registrados. Registra un museo para poder asignarlo.</Mensaje>
                <div className={estilos.accionMuseo}>
                  <BotonEnlace href="/museos/nuevo">Registrar museo</BotonEnlace>
                </div>
              </>
            ) : (
              museos.map((m) => (
                <Casilla
                  key={m.id}
                  etiqueta={m.activo ? m.nombre : `${m.nombre} (inactivo)`}
                  checked={museoIds.includes(m.id)}
                  onChange={() => alternarMuseo(m.id)}
                />
              ))
            )}
          </GrupoCasillas>
          <Acciones>
            <Boton type="submit" disabled={enviando}>
              Guardar
            </Boton>
            <BotonEnlace href="/usuarios">Cancelar</BotonEnlace>
          </Acciones>
        </Formulario>
      </Celda>

      {contrasenaTemporal && (
        <Popup
          titulo="Usuario registrado"
          angosto
          onCerrar={() => router.push("/usuarios")}
          pie={<Boton onClick={() => router.push("/usuarios")}>Volver a la lista</Boton>}
        >
          <Mensaje tipo="exito">
            <span>Contraseña temporal (se muestra una sola vez):</span>
            <strong>{contrasenaTemporal}</strong>
            <div className={estilos.accionCopiar}>
              <BotonCopiar texto={contrasenaTemporal} />
            </div>
          </Mensaje>
        </Popup>
      )}
    </div>
  );
}
