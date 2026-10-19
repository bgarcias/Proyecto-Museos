import Link from "next/link";
import Celda, { EncabezadoPagina } from "@/components/ui/Celda";
import { ETIQUETAS_ROL } from "@/lib/constantes";
import { opcionesDeNavegacion } from "@/lib/navegacion";
import type { UsuarioPublico } from "@/lib/tipos";
import BotonRestablecer from "./BotonRestablecer";
import estilos from "./CI_Inicio.module.css";

export default function CI_Inicio({ usuario }: { usuario: UsuarioPublico }) {
  const esAdministrador = usuario.rol === "administrador";
  // Mismas opciones, orden y permisos que el menú
  const accesos = opcionesDeNavegacion(esAdministrador);

  return (
    <div className={estilos.pagina}>
      <EncabezadoPagina etiqueta={ETIQUETAS_ROL[usuario.rol]} titulo={`Hola, ${usuario.nombre}`} />
      <div className={`${estilos.accesos} ${esAdministrador ? estilos.administrador : estilos.colaborador}`}>
        {accesos.map((a) => (
          <Link key={a.href} href={a.href} className={estilos.acceso}>
            <span className={estilos.tituloAcceso}>{a.texto}</span>
            <span>{a.detalle}</span>
          </Link>
        ))}
      </div>
      <Celda etiqueta="Prototipo" titulo="Datos de demostración">
        <p>Devuelve todos los datos a su estado inicial.</p>
        <BotonRestablecer />
      </Celda>
    </div>
  );
}
