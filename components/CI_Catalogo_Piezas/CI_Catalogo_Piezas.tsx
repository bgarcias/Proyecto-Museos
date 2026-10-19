import BuscadorPiezas from "@/components/ui/BuscadorPiezas";
import { BotonEnlace } from "@/components/ui/Boton";
import Celda, { EncabezadoPagina } from "@/components/ui/Celda";
import type { Categoria, Museo, PiezaListado } from "@/lib/tipos";
import estilos from "./CI_Catalogo_Piezas.module.css";

export default function CI_Catalogo_Piezas({
  piezas,
  museos,
  categorias,
}: {
  piezas: PiezaListado[];
  museos: Museo[];
  categorias: Categoria[];
}) {
  return (
    <div className={estilos.pagina}>
      <EncabezadoPagina
        etiqueta="Colección"
        titulo="Piezas"
        acciones={
          <>
            <BotonEnlace href="/piezas/nueva" variante="principal">
              Registrar pieza
            </BotonEnlace>
            <BotonEnlace href="/piezas/importar">Importar piezas</BotonEnlace>
          </>
        }
      />
      <Celda>
        <BuscadorPiezas modo="catalogo" museos={museos} categorias={categorias} piezasIniciales={piezas} />
      </Celda>
    </div>
  );
}
