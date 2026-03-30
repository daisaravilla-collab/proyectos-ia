export interface PDAContent {
  id: string;
  contenido: string;
  pda: string;
  grado: string;
  disciplina: string;
  used: boolean;
  vinculado?: boolean;
}

export interface TrimesterData {
  problematica: string;
  proyecto: string;
  producto: string;
  vinculaciones: {
    disciplina: string;
    pdaIds: string[];
  }[];
  dosificaciones: {
    disciplina: string;
    pdaIds: string[];
  }[];
  entramado?: any;
}

export const WATERMARK = "@mtra.maravilla";

export const CAMPOS_FORMATIVOS = [
  "Lenguajes",
  "Saberes y Pensamiento Científico",
  "Ética, Naturaleza y Sociedades",
  "De lo Humano y lo Comunitario"
];

export const METODOLOGIAS = [
  "Proyectos comunitarios",
  "Indagación STEM",
  "Aprendizaje Basado en Problemas",
  "Aprendizaje de Servicios"
];

export const DISCIPLINAS_POR_CAMPO: Record<string, string[]> = {
  "Lenguajes": ["Español", "Inglés", "Artes"],
  "Saberes y Pensamiento Científico": ["Matemáticas", "Biología", "Física", "Química"],
  "Ética, Naturaleza y Sociedades": ["Geografía", "Historia", "Formación Cívica y Ética"],
  "De lo Humano y lo Comunitario": ["Educación Física",
   "Socioemocional", "Tecnología"]
};

export const ENFASIS_ARTES = ["Música", "Teatro", "Danza"];
export const ENFASIS_TECNOLOGIAS = [
  "CORTE Y CONFECCION", "Carpintería", "Electricidad", "Electrónica", "Mecánica", 
  "Herrería", "Alimentos y conservación", "Artes gráficas", "Informática", 
  "Computación", "Ofimática", "Programación básica", "Diseño digital", 
  "Robótica educativa", "Diseño arquitectónico", "Dibujo técnico", "Construcción", 
  "Topografía básica", "Diseño industrial básico", "Agricultura", "Agroecología", 
  "Producción sustentable", "Procesos artesanales", "Emprendimiento"
];

export const GRADOS = ["1°", "2°", "3°"];
