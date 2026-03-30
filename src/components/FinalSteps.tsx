import React, { useState, useEffect } from 'react';
import { Download, LayoutDashboard, FileText, Table as TableIcon, Loader2 } from 'lucide-react'; 
import { TrimesterData, PDAContent, DISCIPLINAS_POR_CAMPO, WATERMARK } from '../types';
import { generateAIContent, generateArticulationTablePrompt, ARTICULATION_SCHEMA } from '../services/aiService';

interface FinalStepsProps {
  step: number;
  trimesters: TrimesterData[];
  campoFormativo: string;
  pdaDatabase: PDAContent[];
  grado: string;
  onDosificar: (disc: string) => void;
  onDownload: () => void;
  onGenerarEntramado: (idx: number) => void; 
  onNext: () => void; 
  articulationData: Record<number, any[]>;
  loadingArt: Record<number, boolean>;
} 

export const FinalSteps: React.FC<FinalStepsProps> = (props) => {
  const allDisciplines = DISCIPLINAS_POR_CAMPO[props.campoFormativo] || [];
  const disciplines = allDisciplines.filter(disc => {
    const normalize = (str: string) => str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : "";
    return props.pdaDatabase.some(p => {
      const pDisc = normalize(p.disciplina);
      const dDisc = normalize(disc);
      return pDisc.includes(dDisc) || dDisc.includes(pDisc);
    });
  });

 // Sumamos los "usados" (dosificados) MÁS los "vinculados" (proyectos)
const usedPdas = (props.pdaDatabase || []).filter(p => p.used || p.vinculado).length;
  const coveragePercent = Math.round((usedPdas / (props.pdaDatabase?.length || 1)) * 100) || 0;

  const agruparPorContenido = (pdaIds: string[]) => {
    const agrupado = pdaIds.reduce((acc: Record<string, PDAContent[]>, id) => {
      const pdaObj = props.pdaDatabase.find(p => p.id === id);
      if (pdaObj) {
        if (!acc[pdaObj.contenido]) acc[pdaObj.contenido] = [];
        acc[pdaObj.contenido].push(pdaObj);
      }
      return acc;
    }, {});
    return Object.entries(agrupado);
  };

// VISTA PASO 7 (ORGANIZACIÓN)
  if (props.step === 7) {
    return (
      <div className="space-y-8 max-w-5xl mx-auto p-8 bg-white rounded-2xl shadow-xl">
        <h2 className="text-3xl font-black text-blue-900 text-center">Organización Curricular</h2>
        {(props.trimesters || []).map((tri, idx) => (
          <div key={idx} className="p-6 border border-blue-100 rounded-2xl bg-blue-50/30 space-y-4">
            <div className="font-black text-blue-600 uppercase italic">Trimestre {idx + 1}</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white p-4 rounded-xl shadow-sm">
              <div><label className="text-[10px] font-black text-slate-400 uppercase">Problemática</label><p className="text-xs">{tri.problematica}</p></div>
              <div><label className="text-[10px] font-black text-slate-400 uppercase">Proyecto</label><p className="text-xs font-bold text-blue-700">{tri.proyecto}</p></div>
              <div><label className="text-[10px] font-black text-slate-400 uppercase">Producto</label><p className="text-xs font-bold text-green-700">{tri.producto}</p></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
              {(tri.vinculaciones || []).map(v => (
                <div key={v.disciplina} className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm">
                  <span className="text-[10px] font-black text-blue-700 uppercase block mb-2">{v.disciplina}</span>
                  {agruparPorContenido(v.pdaIds || []).map(([cont, pdas]) => (
                    <div key={cont} className="mb-2">
                      <p className="font-bold text-slate-800 text-[10px]">● {cont}</p>
                      <ul className="ml-3 space-y-1">{(pdas || []).map(p => <li key={p.id} className="text-[10px] text-slate-600">{p.pda}</li>)}</ul>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        ))}
        <button onClick={props.onNext} className="w-full py-4 bg-blue-600 text-white rounded-xl font-black">Continuar a Dosificación</button>
      </div>
    );
  }

  if (props.step === 8) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto p-8 bg-white rounded-2xl shadow-xl">
        <h2 className="text-3xl font-black text-blue-900 text-center">Dosificación Restante</h2>
        <div className="bg-blue-900 p-6 rounded-2xl text-white mb-6">
          <p className="text-xs font-bold uppercase opacity-70">Cobertura Curricular</p>
          <h3 className="text-2xl font-black">{coveragePercent}% Cubierto</h3>
        </div>
        <div className="grid gap-3">
          {disciplines.map(disc => {
            const normalize = (str: string) => str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : "";
            // 1. Buscamos si a esta materia todavía le faltan contenidos por acomodar
            const pendientes = props.pdaDatabase.filter(p => {
              const pDisc = normalize(p.disciplina);
              const dDisc = normalize(disc);
              return (pDisc.includes(dDisc) || dDisc.includes(pDisc)) && !p.used && !p.vinculado;
            });
            
            // 2. Si no hay pendientes, es que la materia ya está al 100%
            const estaListo = pendientes.length === 0;

            return (
              <div key={disc} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                <span className="font-black text-slate-700 text-sm uppercase">{disc}</span>
                
                {estaListo ? (
                  <span className="text-green-600 font-black text-xs">✓ 100% CUBIERTO</span>
                ) : (
                  <button 
                    onClick={() => props.onDosificar(disc)} 
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold"
                  >
                    Dosificar
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Botón para pasar al final */}
        <button onClick={props.onNext} className="w-full py-4 bg-slate-900 text-white rounded-xl font-black mt-3">
          Ver PROYECTOS ESCOLARES
        </button>
      </div>
    );
  }

  // --- VISTA PASO 9: DISEÑO OPTIMIZADO (Contenidos abajo) ---
  return (
    <div className="space-y-10 max-w-7xl mx-auto p-8 bg-white rounded-3xl shadow-2xl border border-slate-100">
      <div className="flex items-center justify-between border-b border-slate-100 pb-8">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tighter italic">PROYECTOS ESCOLARES</h2>
          <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.3em]">{WATERMARK}</p>
        </div>
        <button onClick={props.onDownload} className="flex items-center gap-3 px-8 py-4 bg-green-600 text-white rounded-2xl font-black hover:bg-green-700 transition-all shadow-xl shadow-green-100">
          <Download size={22} /> DESCARGAR WORD
        </button>
      </div>

      <div className="space-y-16">
        {(props.trimesters || []).map((tri, idx) => (
          <div key={idx} className="bg-slate-50/50 rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
            {/* Encabezado Trimestre */}
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <h3 className="text-xl font-black uppercase tracking-widest italic">{["Primer", "Segundo", "Tercer"][idx]} Trimestre</h3>
              <span className="text-[10px] font-bold bg-white/10 px-3 py-1 rounded-full">NEM 2026</span>
            </div>

            {/* Fila superior: Datos del Proyecto */}
            <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-200 bg-white border-b border-slate-200">
              <div className="p-6 bg-blue-50/10">
                <label className="text-[10px] font-black text-blue-500 uppercase block mb-1">Problemática</label>
                <p className="text-sm text-slate-700 font-medium leading-tight">{tri.problematica}</p>
              </div>
              <div className="p-6 bg-blue-50/20">
                <label className="text-[10px] font-black text-blue-600 uppercase block mb-1">Proyecto</label>
                <p className="text-sm text-slate-900 font-black leading-tight uppercase tracking-tight">{tri.proyecto}</p>
              </div>
              <div className="p-6 bg-green-50/10">
                <label className="text-[10px] font-black text-green-500 uppercase block mb-1">Producto Final</label>
                <p className="text-sm font-black text-green-700 uppercase tracking-tight">{tri.producto}</p>
              </div>
            </div>

            {/* TABLA DE ARTICULACIÓN INTERDISCIPLINAR DINÁMICA */}
            <div className="p-8 bg-white border-b border-slate-200">
              <div className="flex items-center gap-2 mb-6 border-b-4 border-amber-500 pb-2 w-fit">
                <TableIcon className="text-amber-500" size={20} />
                <h4 className="text-sm font-black text-slate-800 uppercase italic">Articulación Interdisciplinar (Naturaleza y Técnica)</h4>
              </div>

              {props.loadingArt[idx] ? (
                <div className="flex flex-col items-center justify-center py-10 gap-3">
                  <Loader2 className="animate-spin text-amber-500" size={32} />
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Generando análisis técnico con IA...</p>
                </div>
              ) : props.articulationData[idx] ? (
                <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-wider">
                        <th className="p-4 border-r border-white/10">Disciplina</th>
                        <th className="p-4 border-r border-white/10">Grado</th>
                        <th className="p-4 border-r border-white/10">Enfoque de Abordaje (Naturaleza)</th>
                        <th className="p-4 border-r border-white/10">Acción Técnica (Aporte)</th>
                        <th className="p-4">Contenidos Conceptuales</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {props.articulationData[idx].map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-amber-50/30 transition-colors">
                          <td className="p-4 text-[11px] font-black text-blue-900 uppercase bg-slate-50/50">{row.disciplina}</td>
                          <td className="p-4 text-[11px] font-bold text-slate-600 text-center">{row.grado}</td>
                          <td className="p-4 text-[11px] text-slate-700 leading-tight italic">{row.enfoque}</td>
                          <td className="p-4 text-[11px] font-bold text-slate-800 leading-tight">{row.accion}</td>
                          <td className="p-4 text-[11px] text-slate-600 leading-tight">{row.conceptos}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-6 bg-slate-50 rounded-2xl border border-dashed border-slate-300 text-center">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">No hay datos de articulación disponibles para este trimestre.</p>
                </div>
              )}
            </div>

            {/* Sección Inferior: Contenidos aprovechando todo el ancho */}
            <div className="p-8 bg-white grid grid-cols-1 md:grid-cols-2 gap-10">
              
              {/* Columna Vinculados */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4 border-b-4 border-blue-600 pb-2 w-fit">
                  <FileText className="text-blue-600" size={20} />
                  <h4 className="text-sm font-black text-slate-800 uppercase italic">Contenidos del Proyecto (Vinculados)</h4>
                </div>
                <div className="space-y-6">
                  {disciplines.map(disc => {
                    const vinc = (tri.vinculaciones || []).find(v => v.disciplina === disc);
                    if (!vinc || (vinc.pdaIds || []).length === 0) return null;
                    return (
                      <div key={disc} className="bg-blue-50/30 p-5 rounded-3xl border border-blue-100 shadow-sm">
                        <span className="text-[10px] font-black text-blue-700 uppercase mb-3 block tracking-tighter border-b border-blue-100 pb-1">{disc}</span>
                        {agruparPorContenido(vinc.pdaIds || []).map(([cont, pdas]) => (
                          <div key={cont} className="mb-4 last:mb-0">
                            <p className="font-black text-slate-800 text-[11px] mb-2 leading-tight uppercase">● {cont}</p>
                            <ul className="space-y-1.5 ml-4">
                              {(pdas || []).map(p => <li key={p.id} className="text-[11px] text-slate-600 leading-relaxed font-medium">{p.pda}</li>)}
                            </ul>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Columna Dosificados */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4 border-b-4 border-slate-400 pb-2 w-fit">
                  <LayoutDashboard className="text-slate-400" size={20} />
                  <h4 className="text-sm font-black text-slate-500 uppercase italic">Complemento (Dosificados)</h4>
                </div>
                <div className="space-y-6">
                  {disciplines.map(disc => {
                    const dosif = (tri.dosificaciones || []).find(d => d.disciplina === disc);
                    if (!dosif || (dosif.pdaIds || []).length === 0) return null;
                    return (
                      <div key={disc} className="bg-slate-50 p-5 rounded-3xl border border-slate-200 opacity-80">
                        <span className="text-[10px] font-black text-slate-400 uppercase mb-3 block tracking-tighter border-b border-slate-200 pb-1">{disc}</span>
                        {agruparPorContenido(dosif.pdaIds || []).map(([cont, pdas]) => (
                          <div key={cont} className="mb-4 last:mb-0">
                            <p className="font-bold text-slate-500 text-[11px] mb-2 leading-tight italic uppercase">○ {cont}</p>
                            <ul className="space-y-1.5 ml-4">
                              {(pdas || []).map(p => <li key={p.id} className="text-[11px] text-slate-400 leading-relaxed italic">{p.pda}</li>)}
                            </ul>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          </div>
        ))}
      </div>
      
      <div className="text-center pt-12 border-t border-slate-100">
        <p className="text-slate-300 font-black text-[10px] tracking-[0.5em] uppercase">{WATERMARK} - NEM 2026</p>
      </div>
    </div>
  );
};
