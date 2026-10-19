import { BotonEnlace } from "@/components/ui/Boton";
import Celda from "@/components/ui/Celda";
import { ETIQUETA_VOLVER_AL_INICIO, TEXTO_CODIGO_404, TEXTO_MENSAJE_404 } from "@/lib/constantes";
import estilos from "./not-found.module.css";

/** 404 global: rutas inexistentes y recursos que responden con notFound. */
export default function NoEncontrada() {
  return (
    <div className={estilos.pantalla}>
      <Celda estrecha>
        <div className={estilos.contenido}>
          <h1 className={estilos.codigo}>{TEXTO_CODIGO_404}</h1>
          <p className={estilos.mensaje}>{TEXTO_MENSAJE_404}</p>
          <BotonEnlace href="/" variante="principal">
            {ETIQUETA_VOLVER_AL_INICIO}
          </BotonEnlace>
        </div>
      </Celda>
    </div>
  );
}
