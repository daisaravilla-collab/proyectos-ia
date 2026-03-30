import * as pdfjs from 'pdfjs-dist';
import { generateAIContent } from './aiService';
import { Type } from "@google/genai";

pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.mjs`;

export const parsePdf = async (file: File, type: string, grado: string) => { 
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  let fullText = "";
  
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item: any) => item.str).join(" | ");
    fullText += pageText + "\n";
  }

  const prompt = `Actúa como un experto analista curricular de la Nueva Escuela Mexicana (NEM). 
  Estás procesando el Programa Sintético del Campo Formativo: "${type}". 

  TU TAREA:
  Extrae TODOS los Contenidos y Procesos de Desarrollo de Aprendizaje (PDA) que pertenezcan al grado: ${grado}º de secundaria.

  REGLAS DE ORO:
  1. IDENTIFICA EL GRADO: El PDF contiene los 3 grados. Busca los encabezados de grado (ej. "PRIMER GRADO", "1º GRADO", "SEGUNDO GRADO", "2º GRADO", "TERCER GRADO", "3º GRADO"). Extrae ÚNICAMENTE los contenidos de ${grado}º grado.
  2. ESTRUCTURA: Los datos suelen venir en tablas o listas con el formato [Contenido | PDA]. 
  3. CONSERVA LA NUMERACIÓN: No quites los números de los PDAs (ej. "1.", "14."). Déjalos al inicio del texto.
  4. REPETICIÓN: Si un Contenido tiene varios PDAs, repite el nombre del Contenido para cada objeto.
  5. DISCIPLINA: Identifica la materia (ej. Español, Matemáticas, Historia, Geografía, Biología, Física, Química, Inglés, Artes, Educación Física, Tecnología, Socioemocional).

  IMPORTANTE: Si el PDF es de un campo formativo distinto al seleccionado ("${type}"), procésalo de todas formas e identifica correctamente las disciplinas que contiene.

  Organiza en un arreglo JSON de objetos con: "contenido", "pda", "disciplina".

  Texto del PDF:
  ${fullText}`;

  const schema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        contenido: { type: Type.STRING },
        pda: { type: Type.STRING },
        disciplina: { type: Type.STRING }
      },
      required: ["contenido", "pda", "disciplina"]
    }
  };

  const result = await generateAIContent(prompt, schema);
  if (result) {
    try {
      const cleanJsonString = result.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsedData = JSON.parse(cleanJsonString);
      return parsedData
        .filter((item: any) => item.pda && item.pda.length > 1) // Filtro más suave para permitir números
        .map((item: any) => ({
          ...item,
          grado: grado,
          id: Math.random().toString(36).substr(2, 9),
          used: false
        }));
    } catch (e) { return null; }
  }
  return null;
};