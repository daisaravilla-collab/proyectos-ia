import React from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, Loader2, CheckCircle2 } from 'lucide-react';

interface Step2Props {
  problematizacion: string;
  setProblematizacion: (v: string) => void;
  generatedProblems: string[];
  selectedProblems: string[];
  setSelectedProblems: (v: string[]) => void;
  loading: boolean;
  onBack: () => void;
  onGenerate: () => void;
  onConfirm: () => void;
}

export const Step2: React.FC<Step2Props> = (props) => {
  return (
    <div className="space-y-6 max-w-4xl mx-auto p-8 bg-white rounded-2xl shadow-xl">
      <div className="flex items-center justify-between">
        <button onClick={props.onBack} className="text-blue-600 flex items-center gap-1 hover:underline">
          <ChevronLeft size={18} /> Regresar
        </button>
        <div className="text-right">
          <h2 className="text-2xl font-bold text-blue-900">Problematización Escolar</h2>
          <p className="text-blue-600 font-medium">Paso 2: Definición de Problemáticas</p>
        </div>
      </div>

      <div className="space-y-4">
        <label className="block text-sm font-semibold text-gray-700">Pega aquí tu Problematización Escolar</label>
        <textarea
          value={props.problematizacion}
          onChange={(e) => props.setProblematizacion(e.target.value)}
          className="w-full h-48 p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none"
          placeholder="Describe el contexto y las necesidades de tu escuela..."
        />
        
        <button
          disabled={!props.problematizacion || props.loading}
          onClick={props.onGenerate}
          className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
        >
          {props.loading ? <Loader2 className="animate-spin" /> : "Generar 20 Problemáticas"}
        </button>
      </div>

      {props.generatedProblems.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 pt-6 border-t border-gray-100">
          <p className="text-sm font-medium text-gray-600">Selecciona exactamente 3 problemáticas (una para cada trimestre):</p>
          <div className="grid grid-cols-1 gap-3">
            {props.generatedProblems.map((prob, idx) => (
              <button
                key={idx}
                onClick={() => {
                  if (props.selectedProblems.includes(prob)) {
                    props.setSelectedProblems(props.selectedProblems.filter(p => p !== prob));
                  } else if (props.selectedProblems.length < 3) {
                    props.setSelectedProblems([...props.selectedProblems, prob]);
                  }
                }}
                className={`p-4 text-left rounded-xl border transition-all flex items-start gap-3 ${props.selectedProblems.includes(prob) ? 'bg-blue-50 border-blue-600 text-blue-900' : 'bg-white border-gray-200 hover:border-blue-300'}`}
              >
                <div className={`mt-1 w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 ${props.selectedProblems.includes(prob) ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300'}`}>
                  {props.selectedProblems.includes(prob) && <CheckCircle2 size={14} />}
                </div>
                <span>{prob}</span>
              </button>
            ))}
          </div>

          {props.selectedProblems.length === 3 && (
            <button
              onClick={props.onConfirm}
              className="w-full py-4 bg-green-600 text-white rounded-xl font-bold text-lg hover:bg-green-700 transition-all"
            >
              Confirmar Selección y Continuar
            </button>
          )}
        </motion.div>
      )}
    </div>
  );
};
