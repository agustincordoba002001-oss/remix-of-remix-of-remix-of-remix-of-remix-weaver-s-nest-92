/** Material que el usuario sube al proyecto como referencia de estilo. */
export type Referencia = {
  id: string;
  nombre: string;
  tipo: string;
  bytes: number;
  fecha: string;
  /** Activado: el agente puede abrirlo y estudiarlo. */
  activo: boolean;
  /** El estilo de este material queda guardado para siempre en el proyecto. */
  permanente: boolean;
  notas: string;
};
