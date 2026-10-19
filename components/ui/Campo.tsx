import {
  Children,
  cloneElement,
  isValidElement,
  type InputHTMLAttributes,
  type OptionHTMLAttributes,
  type ReactElement,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import estilos from "./Campo.module.css";

/** Campo de formulario: la etiqueta va encima del control. */
export function Campo({
  etiqueta,
  htmlFor,
  obligatorio,
  error,
  children,
}: {
  etiqueta: string;
  htmlFor: string;
  /** Marca el campo como obligatorio con un asterisco, sin cambiar el texto de la etiqueta. */
  obligatorio?: boolean;
  /** Mensaje de error del campo, debajo del control. El control puede enlazarlo con aria-describedby={`${htmlFor}-error`}. */
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className={estilos.campo}>
      <label htmlFor={htmlFor} className={estilos.etiqueta}>
        {etiqueta}
        {obligatorio && <span aria-hidden="true"> *</span>}
      </label>
      {children}
      {error && (
        <p id={`${htmlFor}-error`} className={estilos.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/** Línea de ayuda en texto secundario, para colocar bajo el control de un `Campo`. */
export function AyudaCampo({ children }: { children: ReactNode }) {
  return <p className={estilos.ayuda}>{children}</p>;
}

export function Entrada(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={estilos.control} {...props} />;
}

export function AreaTexto(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${estilos.control} ${estilos.area}`} rows={4} {...props} />;
}

/**
 * Opción de placeholder: la de valor vacío cuyo texto empieza con "Selecciona" (por ejemplo "Selecciona un tipo").
 * Las opciones vacías de los filtros ("Todas", "Todos") son opciones reales y no se tocan.
 */
function esPlaceholder(hijo: ReactNode): hijo is ReactElement<OptionHTMLAttributes<HTMLOptionElement>> {
  if (!isValidElement<OptionHTMLAttributes<HTMLOptionElement>>(hijo) || hijo.type !== "option") return false;
  return hijo.props.value === "" && typeof hijo.props.children === "string" && hijo.props.children.startsWith("Selecciona");
}

/**
 * Selector de formulario. La opción de placeholder se ve como texto inicial del campo cuando está vacío,
 * pero no se puede elegir y no aparece en la lista desplegable abierta (deshabilitada y oculta).
 * Con un valor ya elegido, como al editar un registro, tampoco se muestra.
 * Al estar deshabilitada, un envío nativo no la incluye: los controladores tratan un valor ausente como vacío.
 */
export function Seleccion({ children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  const opciones = Children.map(children, (hijo) => (esPlaceholder(hijo) ? cloneElement(hijo, { disabled: true, hidden: true }) : hijo));
  return (
    <select className={estilos.control} {...props}>
      {opciones}
    </select>
  );
}

/** Casilla con su texto al lado. */
export function Casilla({ etiqueta, ...resto }: InputHTMLAttributes<HTMLInputElement> & { etiqueta: string }) {
  return (
    <label className={estilos.casilla}>
      <input type="checkbox" {...resto} />
      <span>{etiqueta}</span>
    </label>
  );
}

/** Grupo de casillas con su título encima. */
export function GrupoCasillas({
  etiqueta,
  obligatorio,
  children,
}: {
  etiqueta: string;
  obligatorio?: boolean;
  children: ReactNode;
}) {
  return (
    <fieldset className={estilos.grupo}>
      <legend className={estilos.etiqueta}>
        {etiqueta}
        {obligatorio && <span aria-hidden="true"> *</span>}
      </legend>
      {children}
    </fieldset>
  );
}

/** Dato de solo lectura con su etiqueta encima. */
export function DatoLectura({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <div className={estilos.campo}>
      <span className={estilos.etiqueta}>{etiqueta}</span>
      <div className={estilos.lectura}>{children}</div>
    </div>
  );
}

/**
 * Formulario de una sola columna con ancho máximo cómodo. Con `dosColumnas` los hijos se reparten en una
 * rejilla de dos columnas: cada `ColumnaFormulario` ocupa una y `FilaCompleta` ocupa todo el ancho.
 * El orden en el código es el orden de lectura y de tabulación, y en tablet y mobile pasa a una sola columna.
 */
export function Formulario({
  children,
  onSubmit,
  dosColumnas,
}: {
  children: ReactNode;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  dosColumnas?: boolean;
}) {
  return (
    <form className={`${estilos.formulario} ${dosColumnas ? estilos.dosColumnas : ""}`} onSubmit={onSubmit} noValidate>
      {children}
    </form>
  );
}

/** Una de las dos columnas de un `Formulario` con `dosColumnas`. */
export function ColumnaFormulario({ children }: { children: ReactNode }) {
  return <div className={estilos.columna}>{children}</div>;
}

/** Bloque que ocupa todo el ancho de un `Formulario` con `dosColumnas`. */
export function FilaCompleta({ children }: { children: ReactNode }) {
  return <div className={estilos.filaCompleta}>{children}</div>;
}

/** Rejilla de filtros. */
export function Filtros({ children }: { children: ReactNode }) {
  return <div className={estilos.filtros}>{children}</div>;
}
