import React from 'react';
import { motion } from 'motion/react';
import { ChevronRight } from 'lucide-react';
import { CAMPOS_FORMATIVOS, METODOLOGIAS, DISCIPLINAS_POR_CAMPO, ENFASIS_ARTES, ENFASIS_TECNOLOGIAS, GRADOS } from '../types';

interface Step1Props {
  docente: string;
  setDocente: (v: string) => void;
  centroTrabajo: string;
  setCentroTrabajo: (v: string) => void;
  campoFormativo: string;
  setCampoFormativo: (v: string) => void;
  metodologia: string;
  setMetodologia: (v: string) => void;
  disciplina: string;
  setDisciplina: (v: string) => void;
  enfasis: string;
  setEnfasis: (v: string) => void;
  grado: string;
  setGrado: (v: string) => void;
  onNext: () => void;
}

export const Step1: React.FC<Step1Props> = (props) => {
  return (
    <div className="space-y-6 max-w-2xl mx-auto p-8 bg-white rounded-2xl shadow-xl border border-blue-50">
      <div className="flex justify-center mb-4">
        <img 
          src="https://i.ibb.co/ZRxxVvRc/Gemini-Generated-Image-7g7nn27g7nn27g7n.png" 
          alt="Mi Logotipo" 
          className="w-[200px] h-auto object-contain"
          referrerPolicy="no-referrer"
        />
      </div>
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-blue-900">Datos de Identificación</h2>
        <p className="text-blue-600 font-medium">Paso 1: Parámetros Iniciales</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">Nombre del Docente</label>
          <input 
            type="text" 
            value={props.docente} 
            onChange={(e) => props.setDocente(e.target.value)}
            className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            placeholder="Ej. María García"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">Nombre del Centro de Trabajo</label>
          <input 
            type="text" 
            value={props.centroTrabajo} 
            onChange={(e) => props.setCentroTrabajo(e.target.value)}
            className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            placeholder="Ej. Escuela Primaria Benito Juárez"
          />
        </div>
      </div>

      {props.docente && props.centroTrabajo && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 pt-4 border-t border-gray-100">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Campo Formativo</label>
            <select 
              value={props.campoFormativo} 
              onChange={(e) => {
                props.setCampoFormativo(e.target.value);
                props.setDisciplina("");
                props.setEnfasis("");
              }}
              className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">Selecciona un campo...</option>
              {CAMPOS_FORMATIVOS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Metodología de Trabajo</label>
            <select 
              value={props.metodologia} 
              onChange={(e) => props.setMetodologia(e.target.value)}
              className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">Selecciona una metodología...</option>
              {METODOLOGIAS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          {props.campoFormativo && (
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Disciplina</label>
              <select 
                value={props.disciplina} 
                onChange={(e) => {
                  props.setDisciplina(e.target.value);
                  props.setEnfasis("");
                }}
                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">Selecciona una disciplina...</option>
                {DISCIPLINAS_POR_CAMPO[props.campoFormativo].map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Grado Escolar</label>
            <div className="flex gap-4">
              {GRADOS.map(g => (
                <button
                  key={g}
                  onClick={() => props.setGrado(g)}
                  className={`flex-1 p-3 rounded-xl border transition-all ${props.grado === g ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'}`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          <button
            disabled={!props.grado || !props.metodologia || !props.disciplina}
            onClick={props.onNext}
            className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold text-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            Siguiente <ChevronRight size={20} />
          </button>
        </motion.div>
      )}
    </div>
  );
};
