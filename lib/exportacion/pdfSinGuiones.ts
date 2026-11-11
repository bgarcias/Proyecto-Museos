import { Font } from "@react-pdf/renderer";

/**
 * Sin separación automática de palabras en los PDF: la librería agrega su propio guion en cada corte, así que la palabra se devuelve entera.
 * Los códigos con guiones se parten aparte (opción partirEnGuiones de exportacionTabla). Se importa desde cada generador de PDF.
 */
Font.registerHyphenationCallback((palabra) => [palabra]);
