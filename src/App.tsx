/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { FileText, CheckCircle2, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, AlignmentType, WidthType, ShadingType, BorderStyle, VerticalAlign, ImageRun } from 'docx';
import { saveAs } from 'file-saver';
import { 
  PDAContent, 
  TrimesterData, 
  WATERMARK, 
  DISCIPLINAS_POR_CAMPO,
  CAMPOS_FORMATIVOS 
} from './types';

import { Step1 } from './components/Step1';
import { Step2 } from './components/Step2';
import { TrimesterStep } from './components/TrimesterStep';
import { LinkingStep } from './components/LinkingStep';
import { FinalSteps } from './components/FinalSteps';

import { 
  generateAIContent, 
  generateProblemsPrompt, 
  PROBLEMS_SCHEMA, 
  generateProjectsPrompt, 
  PROJECTS_SCHEMA,
  generateProductsPrompt,
  PRODUCTS_SCHEMA,
  generateAutoLinkPrompt,
  AUTO_LINK_SCHEMA,
  generateDosificacionPrompt, 
  DOSIFICACION_SCHEMA,
  generateArticulationTablePrompt,
  ARTICULATION_SCHEMA
} from './services/aiService';
import { parsePdf } from './services/pdfService';

export default function App() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  
  // Step 1 State
  const [docente, setDocente] = useState("");
  const [centroTrabajo, setCentroTrabajo] = useState("");
  const [campoFormativo, setCampoFormativo] = useState("");
  const [metodologia, setMetodologia] = useState("Aprendizaje Basado en Problemas (ABP)");
  const [disciplina, setDisciplina] = useState("");
  const [enfasis, setEnfasis] = useState("");
  const [grado, setGrado] = useState("");

  // Step 2 State
  const [problematizacion, setProblematizacion] = useState("");
  const [generatedProblems, setGeneratedProblems] = useState<string[]>([]);
  const [selectedProblems, setSelectedProblems] = useState<string[]>([]);

  // Step 3-6 State
  const [trimesters, setTrimesters] = useState<TrimesterData[]>([
    { problematica: "", proyecto: "", producto: "", vinculaciones: [], dosificaciones: [] },
    { problematica: "", proyecto: "", producto: "", vinculaciones: [], dosificaciones: [] },
    { problematica: "", proyecto: "", producto: "", vinculaciones: [], dosificaciones: [] }
  ]);
  const [currentTrimesterIndex, setCurrentTrimesterIndex] = useState(0);
  const [generatedProjects, setGeneratedProjects] = useState<string[]>([]);
  const [generatedProducts, setGeneratedProducts] = useState<string[]>([]);
  const [customProject, setCustomProject] = useState("");
  const [customProduct, setCustomProduct] = useState("");

  // Step 4 State
  const [pdaDatabase, setPdaDatabase] = useState<PDAContent[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    CAMPOS_FORMATIVOS.forEach(c => {
      initial[c] = false;
    });
    return initial;
  });

  // NUEVO ESTADO: Para saber qué disciplina está cargando la IA
  const [linkingDisc, setLinkingDisc] = useState<string | null>(null);

  // --- PASO 6: LÓGICA DEL ENTRAMADO INTERDISCIPLINAR ---
  const [tiemposDisciplinas, setTiemposDisciplinas] = useState<Record<string, any>>({}); 
  const [entramadoResultado, setEntramadoResultado] = useState<any>(null);

  // --- ESTADO DE ARTICULACIÓN (LEVANTADO PARA WORD) ---
  const [articulationData, setArticulationData] = useState<Record<number, any[]>>({});
  const [loadingArt, setLoadingArt] = useState<Record<number, boolean>>({});

  const generateArticulation = async (idx: number) => {
    if (loadingArt[idx] || articulationData[idx]) return;
    
    const tri = trimesters[idx];
    const disciplinas = (tri.vinculaciones || []).map(v => v.disciplina);
    
    if (disciplinas.length === 0) return;

    setLoadingArt(prev => ({ ...prev, [idx]: true }));
    try {
      const prompt = generateArticulationTablePrompt(tri.proyecto, tri.producto, disciplinas, grado);
      const result = await generateAIContent(prompt, ARTICULATION_SCHEMA);
      if (result) {
        const data = JSON.parse(result);
        setArticulationData(prev => ({ ...prev, [idx]: data }));
      }
    } catch (error) {
      console.error("Error generating articulation:", error);
    } finally {
      setLoadingArt(prev => ({ ...prev, [idx]: false }));
    }
  };

  React.useEffect(() => {
    if (step === 9) {
      trimesters.forEach((_, idx) => {
        generateArticulation(idx);
      });
    }
  }, [step, trimesters]);

  const handleGenerateProblems = async () => {
    setLoading(true);
    try {
      // AQUÍ YA LE PASAMOS EL "ENFASIS" A LA IA
      const prompt = generateProblemsPrompt(problematizacion, campoFormativo, disciplina, grado, enfasis);
      const result = await generateAIContent(prompt, PROBLEMS_SCHEMA);
      
      if (result) {
        setGeneratedProblems(JSON.parse(result));
      } else {
        alert("La IA no devolvió resultados. Intenta hacer tu problemática un poco más detallada.");
      }
    } catch (error) {
      console.error("Error de la IA:", error);
      alert("Hubo un pequeño tropiezo de conexión con la IA. Por favor, intenta de nuevo.");
    } finally {
      // Esto asegura que la pantalla de carga SIEMPRE se quite, pase lo que pase
      setLoading(false);
    }
  };

  const handleGenerateProjects = async () => {
    setLoading(true);
    try {
      const problem = trimesters[currentTrimesterIndex].problematica;
      const prompt = generateProjectsPrompt(problem, campoFormativo, disciplina, grado);
      const result = await generateAIContent(prompt, PROJECTS_SCHEMA);
      if (result) {
        setGeneratedProjects(JSON.parse(result));
      }
    } catch (error) {
      console.error("Error en handleGenerateProjects:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateProducts = async (projectName: string) => {
    setLoadingProducts(true);
    try {
      const problem = trimesters[currentTrimesterIndex].problematica;
      const prompt = generateProductsPrompt(problem, projectName, campoFormativo, disciplina, grado);
      const result = await generateAIContent(prompt, PRODUCTS_SCHEMA);
      if (result) {
        setGeneratedProducts(JSON.parse(result));
      }
    } catch (error) {
      console.error("Error en handleGenerateProducts:", error);
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      // Le enviamos el GRADO exacto para que ignore los demás al leer el PDF
      const newPdas = await parsePdf(file, type, grado); 
      if (newPdas) {
        setPdaDatabase(prev => {
          const existingIds = new Set(prev.map(p => p.id));
          const uniqueNewPdas = newPdas.filter(p => !existingIds.has(p.id));
          return [...prev, ...uniqueNewPdas];
        });
        setUploadedFiles(prev => ({ ...prev, [type]: true }));
      }
    } catch (error) {
      console.error("Error en handleFileUpload:", error);
      alert("Error al procesar el PDF. Asegúrate de que sea un archivo válido.");
    } finally {
      setLoading(false);
    }
  };

const handleAutoLinkDisc = async (disc: string) => {
    setLinkingDisc(disc);
    const tri = trimesters[currentTrimesterIndex];

    const proyectosFuturos = trimesters
      .filter((_, idx) => idx !== currentTrimesterIndex)
      .map(t => t.proyecto || "Proyecto por definir");

    const normalize = (str: string) => str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : "";

    const pdasDisponibles = pdaDatabase.filter(p => {
      const pdaDisc = normalize(p.disciplina);
      const searchDisc = normalize(disc);
      
      const matchDisc = pdaDisc.includes(searchDisc) || 
                        searchDisc.includes(pdaDisc) ||
                        (searchDisc.includes("tecnologia") && pdaDisc.includes("tecnologia")) ||
                        (searchDisc.includes("artes") && pdaDisc.includes("arte"));

      const isNotUsed = !p.used;
      const isValidText = p.pda && p.pda.trim() !== "" && p.pda.trim() !== "-";
      const matchGrado = p.grado ? String(p.grado).includes(String(grado)) : true;

      return matchDisc && isNotUsed && isValidText && matchGrado;
    }).map(p => ({ id: p.id, contenido: p.contenido, pda: p.pda, grado: p.grado }));

    if (pdasDisponibles.length === 0) {
      alert(`No hay PDAs de ${disc} disponibles para ${grado}º grado.`);
      setLinkingDisc(null);
      return;
    }

    const prompt = generateAutoLinkPrompt(
      tri.problematica, 
      tri.proyecto, 
      tri.producto, 
      proyectosFuturos, 
      disc, 
      grado, 
      pdasDisponibles,
      enfasis 
    );

    const result = await generateAIContent(prompt, AUTO_LINK_SCHEMA);

    if (result) {
      try {
        const selectedIds = JSON.parse(result) as string[];
        if (selectedIds.length > 0) {
          const uniqueSelectedIds = Array.from(new Set(selectedIds.filter(id => pdasDisponibles.some(p => p.id === id))));
          setPdaDatabase(prev => prev.map(p => uniqueSelectedIds.includes(p.id) ? { ...p, used: true } : p));
          setTrimesters(prev => prev.map((t, idx) => {
            if (idx !== currentTrimesterIndex) return t;
            const vinculaciones = [...t.vinculaciones];
            const vIdx = vinculaciones.findIndex(v => v.disciplina === disc);
            if (vIdx >= 0) {
              vinculaciones[vIdx] = { ...vinculaciones[vIdx], pdaIds: uniqueSelectedIds };
            } else {
              vinculaciones.push({ disciplina: disc, pdaIds: uniqueSelectedIds });
            }
            return { ...t, vinculaciones };
          }));
        }
      } catch (e) {
        console.error("Error en vinculación", e);
      }
    }
    setLinkingDisc(null);
  };

  const handleAutoLinkAll = async () => {
    const trimesterName = ["Primer", "Segundo", "Tercer"][currentTrimesterIndex];
    if (confirm(`¿Deseas vincular automáticamente todas las disciplinas del ${trimesterName} Trimestre? Esto reemplazará las vinculaciones actuales de este trimestre.`)) {
      setLoading(true);
      try {
        const allDisciplines = (DISCIPLINAS_POR_CAMPO[campoFormativo] || []).filter(disc => {
          const gradoSeleccionado = String(grado);
          const esPrimero = gradoSeleccionado.includes("1");
          const esSegundo = gradoSeleccionado.includes("2");
          const esTercero = gradoSeleccionado.includes("3");
          if (campoFormativo === "Saberes y Pensamiento Científico") {
            if (esPrimero && (disc === "Física" || disc === "Química")) return false;
            if (esSegundo && (disc === "Biología" || disc === "Química")) return false;
            if (esTercero && (disc === "Biología" || disc === "Física")) return false;
          }
          if (campoFormativo === "Ética, Naturaleza y Sociedades") {
            if ((esSegundo || esTercero) && disc === "Geografía") return false;
          }
          return true;
        });

        for (const disc of allDisciplines) {
          await handleAutoLinkDisc(disc);
          // Pausa más larga entre disciplinas para no saturar la cuota de la API gratuita
          await new Promise(resolve => setTimeout(resolve, 4000));
        }
      } catch (error) {
        console.error("Error en handleAutoLinkAll:", error);
      } finally {
        setLoading(false);
      }
    }
  };

  // 2. VINCULACIÓN MANUAL
  const handleLinkPda = (pdaId: string, discName: string) => {
    setPdaDatabase(prev => prev.map(p => p.id === pdaId ? { ...p, used: true } : p));
    setTrimesters(prev => prev.map((tri, idx) => {
      if (idx !== currentTrimesterIndex) return tri;
      const vinculaciones = [...tri.vinculaciones];
      const vIdx = vinculaciones.findIndex(v => v.disciplina === discName);
      if (vIdx >= 0) {
        const pdaIds = [...vinculaciones[vIdx].pdaIds];
        if (!pdaIds.includes(pdaId)) pdaIds.push(pdaId);
        vinculaciones[vIdx] = { ...vinculaciones[vIdx], pdaIds };
      } else {
        vinculaciones.push({ disciplina: discName, pdaIds: [pdaId] });
      }
      return { ...tri, vinculaciones };
    }));
  };

  // 3. QUITAR VINCULACIÓN
  const handleRemovePda = (pdaId: string, discName: string) => {
    setPdaDatabase(prev => prev.map(p => p.id === pdaId ? { ...p, used: false } : p));
    setTrimesters(prev => prev.map((tri, idx) => {
      if (idx !== currentTrimesterIndex) return tri;
      const vinculaciones = tri.vinculaciones.map(v => {
        if (v.disciplina !== discName) return v;
        return { ...v, pdaIds: v.pdaIds.filter(id => id !== pdaId) };
      });
      return { ...tri, vinculaciones };
    }));
  };

  // 4. DOSIFICACIÓN INTELIGENTE (CON IA)
  const handleDosificar = async (disc: string) => {
    setLoading(true); // Prendemos la pantalla de carga para que el maestro espere
    
    try {
      const normalize = (str: string) => str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : "";
      
      // 1. Recolectar solo los PDA que NO se han usado de esta disciplina
      const pdasSobrantes = pdaDatabase.filter(p => {
        const matchDisc = normalize(p.disciplina).includes(normalize(disc));
        const isNotUsed = !p.used;
        const isValidText = p.pda && p.pda.trim() !== "" && p.pda.trim() !== "NO APLICA" && p.pda.trim() !== "-";
        const matchGrado = String(p.grado) === String(grado);
        return matchDisc && isNotUsed && isValidText && matchGrado;
      });

      if (pdasSobrantes.length === 0) {
        alert(`¡Listo! Ya no hay contenidos sobrantes de ${disc} para ${grado}º grado.`);
        return;
      }

      // 2. Armar el resumen de los proyectos para que la IA los lea
      const resumenProyectos = trimesters.map(t => ({
        proyecto: t.proyecto || "Proyecto por definir",
        producto: t.producto || "Producto por definir"
      }));

      // 3. Mandar la instrucción a la IA
      const prompt = generateDosificacionPrompt(
        resumenProyectos, 
        disc, 
        String(grado), 
        pdasSobrantes.map(p => ({id: p.id, pda: p.pda})), 
        enfasis
      );
      
      const result = await generateAIContent(prompt, DOSIFICACION_SCHEMA);

      // 4. Procesar la respuesta de la IA
      if (result) {
        try {
          const distribucion = JSON.parse(result);

          setTrimesters(prev => {
            const updated = [...prev];

            const asignarAlTrimestre = (triIndex: number, pdaIds: string[]) => {
              if (!pdaIds || pdaIds.length === 0) return;
              // Evitar que la IA invente IDs que no existen
              const validIds = pdaIds.filter(id => pdasSobrantes.some(p => p.id === id));
              if (validIds.length === 0) return;

              updated[triIndex] = { ...updated[triIndex], dosificaciones: [...updated[triIndex].dosificaciones] };

              const dIdx = updated[triIndex].dosificaciones.findIndex(d => d.disciplina === disc);
              if (dIdx >= 0) {
                const mergedIds = Array.from(new Set([...updated[triIndex].dosificaciones[dIdx].pdaIds, ...validIds]));
                updated[triIndex].dosificaciones[dIdx] = { ...updated[triIndex].dosificaciones[dIdx], pdaIds: mergedIds };
              } else {
                updated[triIndex].dosificaciones.push({ disciplina: disc, pdaIds: validIds });
              }
            };

            // Repartimos lo que la IA decidió
            asignarAlTrimestre(0, distribucion.trimestre1);
            asignarAlTrimestre(1, distribucion.trimestre2);
            asignarAlTrimestre(2, distribucion.trimestre3);

            return updated;
          });

       // 5. Marcamos TODO como "usado" para que la barra suba al 100% real
setPdaDatabase(prev => prev.map(p => {
  const normalize = (str: string) => str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : "";
  // Verificamos si el contenido pertenece a la materia que estamos trabajando
  const pDisc = normalize(p.disciplina);
  const dDisc = normalize(disciplina);
  const esDeEstaMateria = pDisc.includes(dDisc) || dDisc.includes(pDisc);

  // Si la IA dijo que este ID se usa, o si la materia es "Tecnología" (o similar),
  // lo marcamos como terminado (used: true)
  if (pdasSobrantes.some(pd => pd.id === p.id) || (esDeEstaMateria && p.used)) {
    return { ...p, used: true };
  }

  return p;
}));

        } catch (e) {
          console.error("Error al parsear la dosificación", e);
          alert("Hubo un error al acomodar los contenidos. Por favor, intenta de nuevo.");
        }
      } else {
        alert("Hubo un pequeño tropiezo de conexión con la IA. Por favor, intenta de nuevo.");
      }
    } catch (error) {
      console.error("Error en handleDosificar:", error);
      alert("Ocurrió un error inesperado. Por favor, intenta de nuevo.");
    } finally {
      setLoading(false); // Apagamos la pantalla de carga siempre
    }
  };


  // --- AQUÍ EMPIEZA TU FUNCIÓN DE WORD QUE YA TIENES ---

const handleDownloadWord = async () => {
    setLoading(true);
    try {
      const fetchImage = async (url: string) => {
        const response = await fetch(url);
        const buffer = await response.arrayBuffer();
        return new Uint8Array(buffer);
      };

      const [logoMain, logoSup] = await Promise.all([
        fetchImage("https://i.ibb.co/ZRxxVvRc/Gemini-Generated-Image-7g7nn27g7nn27g7n.png"),
        fetchImage("https://i.ibb.co/tMzQhjyt/LOGO1.jpg")
      ]);

      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            new Paragraph({
              children: [
                new ImageRun({
                  data: logoMain,
                  transformation: { width: 150, height: 150 },
                } as any),
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 200 }
            }),
            new Paragraph({
              children: [new TextRun({ text: "VINCULACION Y DOSIFICACION DE CONTENIDOS", bold: true, size: 32, color: "1E3A8A" })],
              alignment: AlignmentType.CENTER,
              spacing: { after: 100 }
            }),
            new Paragraph({
              children: [new TextRun({ text: "@mtra.maravilla", color: "94A3B8", size: 20, italics: true })],
              alignment: AlignmentType.CENTER,
              spacing: { after: 200 }
            }),
            new Paragraph({
              children: [
                new TextRun({ text: `DOCENTE: `, bold: true }),
                new TextRun({ text: `${docente.toUpperCase()}   |   ` }),
                new TextRun({ text: `ESCUELA: `, bold: true }),
                new TextRun({ text: `${centroTrabajo.toUpperCase()}` })
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 100 }
            }),
            new Paragraph({
              children: [
                new TextRun({ text: `CAMPO: `, bold: true }),
                new TextRun({ text: `${campoFormativo}   |   ` }),
                new TextRun({ text: `DISCIPLINA: `, bold: true }),
                new TextRun({ text: `${disciplina}${enfasis ? ` (${enfasis})` : ""}   |   ` }),
                new TextRun({ text: `GRADO: `, bold: true }),
                new TextRun({ text: `${grado}º Secundaria` })
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 100 }
            }),
            new Paragraph({
              children: [
                new TextRun({ text: `METODOLOGÍA: `, bold: true }),
                new TextRun({ text: `${metodologia}` })
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 400 }
            }),
            ...trimesters.map((tri, idx) => [
              new Paragraph({ text: "", spacing: { before: 400 } }),
              new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                borders: {
                  top: { style: BorderStyle.SINGLE, size: 4, color: "CBD5E1" },
                  bottom: { style: BorderStyle.SINGLE, size: 4, color: "CBD5E1" },
                  left: { style: BorderStyle.SINGLE, size: 4, color: "CBD5E1" },
                  right: { style: BorderStyle.SINGLE, size: 4, color: "CBD5E1" },
                  insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: "E2E8F0" },
                  insideVertical: { style: BorderStyle.SINGLE, size: 4, color: "E2E8F0" },
                },
                rows: [
                  new TableRow({
                    tableHeader: true,
                    children: [
                      new TableCell({
                        columnSpan: 2,
                        shading: { fill: "1E40AF", type: ShadingType.CLEAR, color: "auto" },
                        margins: { top: 150, bottom: 150, left: 150, right: 150 },
                        verticalAlign: VerticalAlign.CENTER,
                        children: [new Paragraph({ children: [new TextRun({ text: `TRIMESTRE ${idx + 1}`, bold: true, color: "FFFFFF", size: 28 })], alignment: AlignmentType.CENTER })]
                      })
                    ]
                  }),
                  new TableRow({
                    children: [
                      new TableCell({ shading: { fill: "F8FAFC" }, margins: { top: 100, bottom: 100, left: 100, right: 100 }, children: [new Paragraph({ children: [new TextRun({ text: "PROBLEMÁTICA", bold: true })] })] }),
                      new TableCell({ margins: { top: 100, bottom: 100, left: 100, right: 100 }, children: [new Paragraph({ text: tri.problematica })] })
                    ]
                  }),
                  new TableRow({
                    children: [
                      new TableCell({ shading: { fill: "F8FAFC" }, margins: { top: 100, bottom: 100, left: 100, right: 100 }, children: [new Paragraph({ children: [new TextRun({ text: "PROYECTO", bold: true })] })] }),
                      new TableCell({ margins: { top: 100, bottom: 100, left: 100, right: 100 }, children: [new Paragraph({ text: tri.proyecto })] })
                    ]
                  }),
                  new TableRow({
                    children: [
                      new TableCell({ shading: { fill: "F8FAFC" }, margins: { top: 100, bottom: 100, left: 100, right: 100 }, children: [new Paragraph({ children: [new TextRun({ text: "PRODUCTO", bold: true })] })] }),
                      new TableCell({ margins: { top: 100, bottom: 100, left: 100, right: 100 }, children: [new Paragraph({ text: tri.producto })] })
                    ]
                  }),
                  // --- ARTICULACIÓN INTERDISCIPLINAR (NUEVO EN WORD) ---
                  new TableRow({
                    children: [
                      new TableCell({
                        columnSpan: 2,
                        shading: { fill: "FFFBEB" },
                        margins: { top: 100, bottom: 100, left: 100, right: 100 },
                        children: [new Paragraph({ children: [new TextRun({ text: "ARTICULACIÓN INTERDISCIPLINAR (NATURALEZA Y TÉCNICA)", bold: true, color: "92400E" })], alignment: AlignmentType.CENTER })]
                      })
                    ]
                  }),
                  ...(articulationData[idx] || []).map(art => new TableRow({
                    children: [
                      new TableCell({ width: { size: 30, type: WidthType.PERCENTAGE }, margins: { top: 100, bottom: 100, left: 100, right: 100 }, children: [new Paragraph({ children: [new TextRun({ text: art.disciplina, bold: true })] })] }),
                      new TableCell({
                        width: { size: 70, type: WidthType.PERCENTAGE },
                        margins: { top: 100, bottom: 100, left: 100, right: 100 },
                        children: [
                          new Paragraph({ children: [new TextRun({ text: "Enfoque: ", bold: true }), new TextRun({ text: art.enfoque, italics: true })] }),
                          new Paragraph({ children: [new TextRun({ text: "Acción Técnica: ", bold: true }), new TextRun({ text: art.accion })] }),
                          new Paragraph({ children: [new TextRun({ text: "Conceptos: ", bold: true }), new TextRun({ text: art.conceptos })] })
                        ]
                      })
                    ]
                  })),
                  new TableRow({
                    children: [
                      new TableCell({
                        columnSpan: 2,
                        shading: { fill: "DBEAFE" }, 
                        margins: { top: 100, bottom: 100, left: 100, right: 100 },
                        children: [new Paragraph({ children: [new TextRun({ text: "CONTENIDOS VINCULADOS AL PROYECTO", bold: true, color: "1E3A8A" })], alignment: AlignmentType.CENTER })]
                      })
                    ]
                  }),
                  ...tri.vinculaciones.map(v => new TableRow({
                    children: [
                      new TableCell({ width: { size: 30, type: WidthType.PERCENTAGE }, margins: { top: 100, bottom: 100, left: 100, right: 100 }, children: [new Paragraph({ children: [new TextRun({ text: v.disciplina, bold: true })] })] }),
                      new TableCell({
                        width: { size: 70, type: WidthType.PERCENTAGE },
                        margins: { top: 100, bottom: 100, left: 100, right: 100 },
                        children: v.pdaIds.map(id => {
                          const item = pdaDatabase.find(p => p.id === id);
                          return new Paragraph({
                            spacing: { after: 150 },
                            children: [
                              new TextRun({ text: `• Contenido: `, bold: true }),
                              new TextRun({ text: `${item?.contenido}`, break: 0 }),
                              new TextRun({ text: `PDA: `, bold: true, break: 1 }),
                              new TextRun({ text: `${item?.pda}`, break: 0 })
                            ]
                          });
                        })
                      })
                    ]
                  })),
                  ...(tri.dosificaciones.length > 0 ? [
                    new TableRow({
                      children: [
                        new TableCell({
                          columnSpan: 2,
                          shading: { fill: "F1F5F9" },
                          margins: { top: 100, bottom: 100, left: 100, right: 100 },
                          children: [new Paragraph({ children: [new TextRun({ text: "COMPLEMENTO (DOSIFICACIÓN RESTANTE)", bold: true, color: "475569" })], alignment: AlignmentType.CENTER })]
                        })
                      ]
                    }),
                    ...tri.dosificaciones.map(d => new TableRow({
                      children: [
                        new TableCell({ width: { size: 30, type: WidthType.PERCENTAGE }, margins: { top: 100, bottom: 100, left: 100, right: 100 }, children: [new Paragraph({ children: [new TextRun({ text: d.disciplina, bold: true, color: "64748b" })] })] }),
                        new TableCell({
                          width: { size: 70, type: WidthType.PERCENTAGE },
                          margins: { top: 100, bottom: 100, left: 100, right: 100 },
                          children: d.pdaIds.map(id => {
                            const item = pdaDatabase.find(p => p.id === id);
                            return new Paragraph({
                              spacing: { after: 150 },
                              children: [
                                new TextRun({ text: `• Contenido: `, bold: true, color: "475569" }),
                                new TextRun({ text: `${item?.contenido}`, color: "475569" }),
                                new TextRun({ text: `PDA: `, bold: true, break: 1, color: "475569" }),
                                new TextRun({ text: `${item?.pda}`, color: "475569" })
                              ]
                            });
                          })
                        })
                      ]
                    }))
                  ] : [])
                ]
              })
            ]).flat(),
            new Paragraph({
              children: [
                new ImageRun({
                  data: logoSup,
                  transformation: { width: 80, height: 80 },
                } as any),
                new TextRun({ text: "SUPERVISIÓN ESCOLAR ZONA 02", bold: true, size: 24, break: 1 })
              ],
              alignment: AlignmentType.RIGHT,
              spacing: { before: 800 }
            })
          ]
        }]
      });
      const blob = await Packer.toBlob(doc);
      const projectName = trimesters[0].proyecto || "PROYECTO_ESCOLAR";
      saveAs(blob, `${projectName.toUpperCase().replace(/\s+/g, '_')}.docx`);
    } catch (error) {
      console.error("Error al generar Word:", error);
      alert("Hubo un error al generar el documento Word.");
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200"><FileText size={24} /></div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-blue-900">MARAVILL-AULA</h1>
              <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">{WATERMARK}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col items-end">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Supervisión</span>
              <span className="text-xs font-black text-blue-900">Zona 02</span>
            </div>
            <img 
              src="https://i.ibb.co/tMzQhjyt/LOGO1.jpg" 
              alt="Logo Supervisión" 
              className="h-10 w-auto object-contain rounded-lg shadow-sm"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8 overflow-x-auto pb-4">
          {[1, 2, 3, 7, 8, 9].map((s, i) => (
            <div key={s} className="flex flex-col items-center gap-2 min-w-[100px]">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${step === s || (step >= 3 && step <= 6 && s === 3) ? 'bg-blue-600 text-white scale-110 shadow-lg shadow-blue-200' : step > s || (step > 6 && s === 3) ? 'bg-green-500 text-white' : 'bg-white text-gray-400 border border-gray-200'}`}>
                {step > s || (step > 6 && s === 3) ? <CheckCircle2 size={20} /> : i + 1}
              </div>
              <span className={`text-[10px] font-bold uppercase tracking-wider ${step === s ? 'text-blue-600' : 'text-gray-400'}`}>
                {["Identificación", "Problemas", "Trimestres", "Organización", "Dosificación", "Final"][i]}
              </span>
            </div>
          ))}
        </div>

        <main>
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
              {step === 1 && <Step1 docente={docente} setDocente={setDocente} centroTrabajo={centroTrabajo} setCentroTrabajo={setCentroTrabajo} campoFormativo={campoFormativo} setCampoFormativo={setCampoFormativo} metodologia={metodologia} setMetodologia={setMetodologia} disciplina={disciplina} setDisciplina={setDisciplina} enfasis={enfasis} setEnfasis={setEnfasis} grado={grado} setGrado={setGrado} onNext={() => setStep(2)} />}
              
              {step === 2 && <Step2 problematizacion={problematizacion} setProblematizacion={setProblematizacion} generatedProblems={generatedProblems} selectedProblems={selectedProblems} setSelectedProblems={setSelectedProblems} loading={loading} onBack={() => setStep(1)} onGenerate={handleGenerateProblems} onConfirm={() => { setTrimesters(prev => prev.map((t, i) => ({ ...t, problematica: selectedProblems[i] }))); setStep(3); }} />}
              
              {(step >= 3 && step <= 6) && (step % 2 !== 0 
                ? <TrimesterStep 
                    trimester={trimesters[currentTrimesterIndex]} 
                    trimesterIndex={currentTrimesterIndex} 
                    generatedProjects={generatedProjects} 
                    generatedProducts={generatedProducts} 
                    customProject={customProject} 
                    setCustomProject={setCustomProject} 
                    customProduct={customProduct} 
                    setCustomProduct={setCustomProduct} 
                    loading={loading} 
                    loadingProducts={loadingProducts}
                    onBack={() => setStep(step === 3 ? 2 : step - 1)} 
                    onGenerate={handleGenerateProjects} 
                    onSelectProject={(v) => {
                      const u = [...trimesters];
                      u[currentTrimesterIndex].proyecto = v;
                      setTrimesters(u);
                      handleGenerateProducts(v);
                    }} 
                    onSelectProduct={(v) => {
                      const u = [...trimesters];
                      u[currentTrimesterIndex].producto = v;
                      setTrimesters(u);
                    }} 
                    onNext={() => setStep(step + 1)} 
                  />
                : <LinkingStep 
                    trimester={trimesters[currentTrimesterIndex]} 
                    trimesterIndex={currentTrimesterIndex} 
                    campoFormativo={campoFormativo}
                    grado={grado} 
                    uploadedFiles={uploadedFiles} 
                    pdaDatabase={pdaDatabase} 
                    linkingDisc={linkingDisc} 
                    onBack={() => setStep(step - 1)} 
                    onFileUpload={handleFileUpload} 
                    onAutoLink={handleAutoLinkDisc} 
                    onAutoLinkAll={handleAutoLinkAll}
                    onRemovePda={handleRemovePda} 
                    onNext={() => { if (currentTrimesterIndex < 2) { setCurrentTrimesterIndex(prev => prev + 1); setGeneratedProjects([]); setGeneratedProducts([]); setStep(3); } else setStep(7); }} 
                  />
              )}

              {(step >= 7 && step <= 9) && (
                <FinalSteps 
                  step={step} 
                  trimesters={trimesters} 
                  campoFormativo={campoFormativo} 
                  pdaDatabase={pdaDatabase} 
                  onDosificar={handleDosificar} 
                  onDownload={handleDownloadWord} 
                  onGenerarEntramado={() => {}} 
                  onNext={() => setStep(step + 1)} 
                  grado={grado}
                  articulationData={articulationData}
                  loadingArt={loadingArt}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <footer className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-slate-200 py-3 text-center">
        <p className="text-xs font-bold text-slate-400 tracking-[0.2em] uppercase">{WATERMARK} - Zona 02 - NEM 2026</p>
      </footer>

      {loading && (
        <div className="fixed inset-0 bg-white/60 backdrop-blur-sm z-[100] flex flex-col items-center justify-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-100 rounded-full animate-spin border-t-blue-600" />
            <div className="absolute inset-0 flex items-center justify-center"><FileText className="text-blue-600 animate-pulse" size={24} /></div>
          </div>
          <p className="text-blue-900 font-black text-lg animate-pulse">Procesando con IA...</p>
          <p className="text-blue-500 text-sm font-bold uppercase tracking-widest">{WATERMARK}</p>
        </div>
      )}
    </div>
  );
}