import { GoogleGenAI, Type } from "@google/genai";

const customFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minutos
  
  try {
    const response = await fetch(input, { ...init, signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
};

let aiInstance: GoogleGenAI | null = null;

const getAI = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("API_KEY_MISSING");
  }
  if (!aiInstance) {
    aiInstance = new GoogleGenAI({ 
      apiKey: apiKey,
      httpOptions: { fetch: customFetch } as any
    });
  }
  return aiInstance;
};

export const generateAIContent = async (prompt: string, schema?: any) => {
  const maxRetries = 6;
  let retryCount = 0;

  // Pequeña pausa inicial para evitar ráfagas (aumentada para mayor seguridad)
  await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

  while (retryCount <= maxRetries) {
    try {
      const ai = getAI();
      
      const timeoutPromise = new Promise<any>((_, reject) =>
        setTimeout(() => reject(new Error("Timeout (5 minutos)")), 300000)
      );

      const aiPromise = ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: schema ? "application/json" : "text/plain",
          responseSchema: schema,
        },
      });

      const response = await Promise.race([aiPromise, timeoutPromise]);
      return response.text;

    } catch (error: any) {
      if (error.message === "API_KEY_MISSING") {
        console.error("Error: No se ha configurado la API Key de Gemini.");
        alert("Por favor, configura tu API Key de Gemini en los ajustes.");
        return null;
      }
      
      const errorMsg = String(error).toLowerCase();
      const isQuotaError = errorMsg.includes("429") || errorMsg.includes("quota") || errorMsg.includes("too many requests");
      
      if (isQuotaError && retryCount < maxRetries) {
        retryCount++;
        // Exponencial backoff: 4, 8, 16, 32, 64, 128 segundos
        const delay = Math.pow(2, retryCount + 1) * 2000 + Math.random() * 3000;
        console.warn(`[SISTEMA] Límite de la API alcanzado. Reintentando automáticamente en ${Math.round(delay/1000)}s... (Intento ${retryCount}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      console.error("Error en generateAIContent:", error);
      return null;
    }
  }
  return null;
};

// --- AUXILIAR: DISCIPLINAS POR GRADO ---
const obtenerDisciplinasDelGrado = (campo: string, grado: string) => {
  const g = String(grado);
  if (campo === "Saberes y Pensamiento Científico") {
    if (g.includes("1")) return "Biología y Matemáticas";
    if (g.includes("2")) return "Física y Matemáticas";
    return "Química y Matemáticas";
  }
  if (campo === "Ética, Naturaleza y Sociedades") {
    if (g.includes("1")) return "Geografía, Historia y Formación Cívica y Ética";
    return "Historia y Formación Cívica y Ética";
  }
  if (campo === "Lenguajes") return "Español, Artes e Inglés";
  
  if (campo === "De lo Humano y lo Comunitario") {
    // Es vital separarlas por coma para que el frontend las divida correctamente
    return "Educación Física, Socioemocional, Tecnología"; 
  }

  return "las disciplinas del campo";
};

// --- PASO 1: PROBLEMÁTICAS NUTRIDAS Y DIRIGIDAS AL ALUMNO ---
export const generateProblemsPrompt = (problematizacion: string, campo: string, disciplina: string, grado: string, enfasis: string) => {
  const disciplinasActivas = obtenerDisciplinasDelGrado(campo, grado);

  let guiaCampo = "";
  if (campo === "Lenguajes") {
    guiaCampo = `FINALIDAD: Comunicación para la transformación y poder de expresión. REGLA: Usa conceptos como "manifestaciones creativas" o "mensajes que rompan el silencio". PROHIBIDO: No menciones Español, Inglés o Artes por separado; el reto debe requerir los tres a la vez.`;
  } else if (campo === "De lo Humano y lo Comunitario") {
    guiaCampo = `FINALIDAD: Bienestar, identidad y soluciones técnicas. REGLA: Usa conceptos como "gestión de proyectos" o "estilos de vida activos". PROHIBIDO: No separes Tecnología de Ed. Física o Socioemocional; el reto debe ser una solución integral para vivir mejor.`;
  } else if (campo === "Saberes y Pensamiento Científico") {
    guiaCampo = `FINALIDAD: Indagación y validación de fenómenos. REGLA: El reto debe exigir "explicar con datos" o "modelar soluciones con pruebas". PROHIBIDO: No separes Ciencia de Matemáticas; el pensamiento científico es uno solo.`;
  } else if (campo === "Ética, Naturaleza y Sociedades") {
    guiaCampo = `FINALIDAD: Justicia, historia y derechos. REGLA: El reto debe ser "defender el territorio" o "analizar el pasado para proponer justicia hoy". PROHIBIDO: No separes Historia de Geografía o Cívica.`;
  }

  return `Actúa como un adolescente líder de secundaria. Olvida que eres docente y olvida términos burocráticos. Tu misión es diseñar 20 "Misiones de Vida" interdisciplinares que nos interesen a nosotros los alumnos.

CONTEXTO:
- Lo que vivimos: "${problematizacion}"
- Campo Formativo: "${campo}"
- Team de materias que nos respaldan: ${disciplinasActivas}

REGLAS DE ORO (SÍGUELAS O NO SERVIRÁ):
1. FUSIÓN TOTAL (INTERDISCIPLINARIEDAD): PROHIBIDO dividir las problemáticas por disciplina. El reto debe ser un "paraguas" tan grande que una sola materia no pueda resolverlo. No menciones nombres de materias en los retos.
2. VOZ Y GANCHO JUVENIL: Redacta desde el "NOSOTROS". Usa vocabulario de pasillo: "la neta", "la mala vibra", "que no nos vean la cara", "lo que nos hace ruido". El interés debe ser real: nuestra imagen, nuestra libertad y nuestro grupo.
3. TEMAS FUERTES IMPLÍCITOS: Mete el suicidio, alcoholismo y promiscuidad como contextos de "sentir que no hay salida", "presión para ser alguien que no somos" o "escapes que nos dañan". El reto final debe ser construir FACTORES DE PROTECCIÓN (autoestima, redes de apoyo, salud mental).
4. ESTRUCTURA: [Emoción/Vivencia real de secundaria] + [Por qué sin los saberes de ${campo} seguiremos igual] + [Misión final en pregunta].

IMPORTANTE: Responde ÚNICAMENTE con un arreglo JSON de 20 strings. Si separas por disciplinas, la respuesta será rechazada.`;
};

export const PROBLEMS_SCHEMA = { type: Type.ARRAY, items: { type: Type.STRING } };

// --- PASO 2A: GENERAR NOMBRES DE PROYECTOS ---
export const generateProjectsPrompt = (problem: string, campo: string, disciplina: string, grado: string) => {
  const disciplinasActivas = obtenerDisciplinasDelGrado(campo, grado);
  
  return `Actúa como un experto en diseño de proyectos de la Nueva Escuela Mexicana (NEM) para la Fase 6 (Secundaria).
  
  CONTEXTO:
  - Problemática a resolver: "${problem}"
  - Campo Formativo: "${campo}"
  - Grado: ${grado}º de Secundaria
  - Disciplinas articuladas: ${disciplinasActivas}
  
  TAREA:
  Genera exactamente 15 opciones de NOMBRES DE PROYECTOS que funcionen como respuesta directa a la problemática planteada.
 
  REGLAS CRÍTICAS:
  1. ACCIÓN Y COMUNIDAD: Inicia con frases gancho, retos o verbos en primera persona del plural (ej. "¡Rescatemos...!", "Voces de...", "Guardianes de...").
  2. LENGUAJE PARA ADOLESCENTES: Cero lenguaje burocrático. Que suenen a un reto real y atractivo para alumnos de secundaria.
  3. ENFOQUE: Deben respirar la esencia del Campo Formativo (${campo}).
 
  IMPORTANTE PARA AUTOMATIZACIÓN: Responde ÚNICAMENTE con un arreglo de 15 strings en formato JSON válido: ["Proyecto 1", "Proyecto 2", ...]. No agregues texto introductorio ni formato fuera del JSON.`;
};

export const PROJECTS_SCHEMA = { type: Type.ARRAY, items: { type: Type.STRING } };


// --- PASO 2B: GENERAR PRODUCTOS FINALES (BASADOS EN EL PROYECTO) ---
export const generateProductsPrompt = (problem: string, projectName: string, campo: string, disciplina: string, grado: string) => {
  // Sacamos las disciplinas activas para obligar a la interdisciplinariedad
  const disciplinasActivas = obtenerDisciplinasDelGrado(campo, grado);
  
  return `Actúa como un experto en diseño de proyectos de la Nueva Escuela Mexicana (NEM) para la Fase 6 (Secundaria).
  
  CONTEXTO ESPECÍFICO:
  - Problemática original: "${problem}"
  - PROYECTO SELECCIONADO POR EL DOCENTE: "${projectName}"
  - Campo Formativo: "${campo}"
  - Grado: ${grado}º de Secundaria
  - Disciplinas a integrar: ${disciplinasActivas}
  
  TAREA:
  El docente ya eligió el nombre del proyecto. Ahora, genera exactamente 15 opciones de PRODUCTOS FINALES INTEGRADORES que correspondan perfectamente a ese proyecto y resuelvan la problemática.
 
  REGLAS CRÍTICAS:
  1. TANGIBILIDAD: El producto debe ser algo visible, medible o experimentable (ej. un podcast, un mural interactivo, un tianguis cultural, una asamblea, un prototipo tecnológico, una campaña en la comunidad).
  2. INTERDISCIPLINARIEDAD (CLAVE): El producto NO debe ser exclusivo de una sola materia. Debe ser lo suficientemente amplio para que TODAS las disciplinas del grado (${disciplinasActivas}) puedan aportar saberes para su construcción.
  3. COHERENCIA ABSOLUTA: El producto tiene que ser la materialización lógica de lo que sugiere el nombre del proyecto ("${projectName}").
  4. LENGUAJE: Escríbelos de forma clara, directa y motivadora.
 
  IMPORTANTE PARA AUTOMATIZACIÓN: Responde ÚNICAMENTE con un arreglo de 15 strings en formato JSON válido: ["Producto 1", "Producto 2", ...]. No agregues texto introductorio ni formato fuera del JSON.`;
};

export const PRODUCTS_SCHEMA = { type: Type.ARRAY, items: { type: Type.STRING } };

// --- PASO 4: VINCULACIÓN INTELIGENTE DE PDA (TRIMESTRAL CON EXCEPCIONES Y VISIÓN GLOBAL) ---
export const generateAutoLinkPrompt = (
  problematica: string,
  proyecto: string,
  producto: string,
  proyectosFuturos: string[],
  disciplina: string,
  grado: string,
  pdasDisponibles: any[],
  enfasis: string
) => {
  const contextoEnfasis = enfasis ? ` (Énfasis en: ${enfasis})` : "";
  
  return `Actúa como un experto Asesor Técnico Pedagógico de la NEM.
  Tu objetivo es seleccionar los PDA (Procesos de Desarrollo de Aprendizaje) más pertinentes para el TRIMESTRE ACTUAL, garantizando una dosificación inteligente.
 
  CONTEXTO DEL TRIMESTRE ACTUAL:
  - Disciplina a vincular: ${disciplina}${contextoEnfasis}
  - Grado: ${grado}º de Secundaria
  - Problemática: "${problematica}"
  - Proyecto del trimestre: "${proyecto}"
  - Producto a lograr: "${producto}"
 
  TAREA:
  Analiza la "LISTA DE PDAs DISPONIBLES" en su totalidad y selecciona los IDs de aquellos que sirvan como HERRAMIENTA DIRECTA para resolver la problemática y construir el producto final de este trimestre.
 
  REGLAS DE SELECCIÓN ESTRICTAS:
  1. VISIÓN GLOBAL Y NO SECUENCIAL (CLAVE): Los PDA en la lista oficial NO están ordenados por importancia ni cronológicamente. Oblígate a revisar TODA la lista hasta el final antes de decidir. Selecciona de cualquier parte de la lista basándote en la progresión lógica del aprendizaje del alumno a lo largo del ciclo escolar y lo que necesite para el proyecto actual, NO en el orden en que aparecen.
  2. INTEGRACIÓN NATURAL (PERTINENCIA): El PDA seleccionado debe tener una relación lógica con el producto "${producto}". El alumno debe necesitar este aprendizaje para lograr el proyecto.
  3. 3. COBERTURA TOTAL Y CIERRE: Absolutamente TODOS los PDA deben ser asignados. Si la lista de "pdasSobrantes" está vacía, el sistema debe validar que la disciplina está completada al 100% para que el dashboard se actualice correctamente.
  4. DOSIFICACIÓN ESTRATÉGICA Y EXCEPCIÓN HISTORIA: Para la mayoría de las disciplinas, selecciona de 2 a 3 PDAs. EXCEPCIÓN CRÍTICA: Si la disciplina es "Historia", puedes seleccionar de 3 a 5 PDAs, debido a lo extenso de su programa. Deja los contenidos sobrantes para los siguientes trimestres: ${proyectosFuturos.length > 0 ? proyectosFuturos.join(", ") : "proyectos por definir"}.
  5. EXCEPCIÓN PARA DISCIPLINAS CORTAS: Si la lista de PDAs es muy reducida (ej. Educación Física, Tecnología, Educación Socioemocional/Tutoría), flexibiliza el candado y selecciona de 1 a 2 PDAs libremente; sus procesos son muy amplios.
  
  LISTA DE PDAs DISPONIBLES (Formato JSON):
  ${JSON.stringify(pdasDisponibles)}
  
  IMPORTANTE PARA AUTOMATIZACIÓN: Responde ÚNICAMENTE con un arreglo JSON puro de IDs seleccionados: ["id1", "id2"]. No agregues texto introductorio, ni explicaciones, ni comillas invertidas de markdown.`;
};


export const AUTO_LINK_SCHEMA = { type: Type.ARRAY, items: { type: Type.STRING } };

// --- PASO 6: ARTICULACIÓN INTERDISCIPLINAR ---
export const generateArticulationTablePrompt = (proyecto: string, producto: string, disciplinas: string[], grado: string) => {
  return `Actúa como un experto en diseño curricular de la Nueva Escuela Mexicana.
  
  PROYECTO: "${proyecto}"
  PRODUCTO FINAL: "${producto}"
  GRADO: "${grado}º de Secundaria"
  DISCIPLINAS PARTICIPANTES: ${disciplinas.join(", ")}
  
  TAREA: Genera una tabla de articulación interdisciplinar que explique cómo cada materia contribuye técnicamente al producto final.
  
  Para cada disciplina, genera:
  1. Enfoque de Abordaje (Naturaleza): Cómo se aborda el tema desde la perspectiva de esa materia y el grado.
  2. Acción Técnica: La tarea específica, aporte práctico o producto parcial que la materia da al producto final.
  3. Contenidos Conceptuales: Los conceptos técnicos, científicos o teóricos necesarios.
  
  Responde ÚNICAMENTE con un arreglo JSON de objetos con las llaves: disciplina, grado, enfoque, accion, conceptos.`;
};

export const ARTICULATION_SCHEMA = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      disciplina: { type: Type.STRING },
      grado: { type: Type.STRING },
      enfoque: { type: Type.STRING },
      accion: { type: Type.STRING },
      conceptos: { type: Type.STRING }
    },
    required: ["disciplina", "grado", "enfoque", "accion", "conceptos"]
  }
};
export const generateDosificacionPrompt = (
  trimestres: any[], // Arreglo con los 3 proyectos actuales [{proyecto: "...", producto: "..."}, ...]
  disciplina: string,
  grado: string,
  pdasSobrantes: any[],
  enfasis: string
) => {
  const contextoEnfasis = enfasis ? ` (Énfasis en: ${enfasis})` : "";
  
  // Regla extra exclusiva para De lo Humano y lo Comunitario
  const esCampoHumano = disciplina.includes("Física") || disciplina.includes("Socioemocional") || disciplina.includes("Tutoría") || disciplina.includes("Tecnología");
  let regla5 = "";
  if (esCampoHumano) {
      regla5 = `\n  5. DOSIFICACIÓN OBLIGATORIA (CAMPO DE LO HUMANO): Como estas disciplinas tienen muy pocos contenidos oficiales, es OBLIGATORIO que repartas los PDAs sobrantes asegurando que quede al menos uno en cada trimestre. No los amontones en un solo periodo. Si es Tecnología, contextualízalos hacia el énfasis ("${enfasis}").`;
  }

  return `Actúa como un Asesor Técnico Pedagógico experto en la Nueva Escuela Mexicana (NEM).
  Tu tarea es DOSIFICAR (distribuir) los PDA sobrantes del programa sintético a lo largo de los 3 trimestres del ciclo escolar de manera lógica e inteligente.
 
  CONTEXTO DEL CICLO ESCOLAR:
  - Disciplina: ${disciplina}${contextoEnfasis}
  - Grado: ${grado}º de Secundaria
  
  PROYECTOS DEL AÑO YA DEFINIDOS:
  - Trimestre 1: Proyecto "${trimestres && trimestres[0] ? trimestres[0].proyecto : "Por definir"}" (Producto: "${trimestres && trimestres[0] ? trimestres[0].producto : "Por definir"}")
  - Trimestre 2: Proyecto "${trimestres && trimestres[1] ? trimestres[1].proyecto : "Por definir"}" (Producto: "${trimestres && trimestres[1] ? trimestres[1].producto : "Por definir"}")
  - Trimestre 3: Proyecto "${trimestres && trimestres[2] ? trimestres[2].proyecto : "Por definir"}" (Producto: "${trimestres && trimestres[2] ? trimestres[2].producto : "Por definir"}")
 
  PDAs SOBRANTES A DOSIFICAR (Contenidos no vinculados directamente a los proyectos):
  ${JSON.stringify(pdasSobrantes)}
 
  REGLAS ESTRICTAS DE DOSIFICACIÓN:
  1. AFINIDAD TEMÁTICA: Analiza de qué trata cada PDA sobrante. Asígnalo al trimestre cuyo proyecto tenga la mayor cercanía temática o contextual, para que el docente pueda trabajarlo de manera paralela sin sentir que "brinca" a un tema totalmente desconectado.
  2. MADUREZ COGNITIVA Y PROGRESIÓN: Si un PDA es muy complejo, abstracto o requiere conocimientos previos, envíalo preferentemente al Trimestre 2 o 3, respetando el nivel cognitivo de los adolescentes.
  3. COBERTURA TOTAL (CANDADO): Absolutamente TODOS los PDA de la lista de sobrantes deben ser asignados a algún trimestre. No puedes dejar ninguno fuera; el programa sintético debe cubrirse al 100%.
  4. EQUILIBRIO: Trata de no cargar todos los PDA sobrantes a un solo trimestre. Busca un balance razonable en la carga de trabajo, a menos que la afinidad temática exija lo contrario.${regla5}
 
  IMPORTANTE PARA AUTOMATIZACIÓN: Responde ÚNICAMENTE con un objeto JSON válido con la siguiente estructura exacta:
  {
    "trimestre1": ["id_x", "id_y"],
    "trimestre2": ["id_z"],
    "trimestre3": ["id_a", "id_b"]
  }
  No agregues texto introductorio, ni explicaciones, ni comillas invertidas de markdown. Si a un trimestre no le toca ningún PDA, déjalo como un arreglo vacío [].`;
};

// Esquema para asegurar que la IA devuelva los 3 arreglos bien armados:
export const DOSIFICACION_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    trimestre1: { type: Type.ARRAY, items: { type: Type.STRING } },
    trimestre2: { type: Type.ARRAY, items: { type: Type.STRING } },
    trimestre3: { type: Type.ARRAY, items: { type: Type.STRING } }
  },
  required: ["trimestre1", "trimestre2", "trimestre3"]
};

