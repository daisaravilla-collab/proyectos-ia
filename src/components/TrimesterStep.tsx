import React from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, Loader2 } from 'lucide-react';
import { TrimesterData } from '../types';

interface TrimesterStepProps {
  trimester: TrimesterData;
  trimesterIndex: number;
  generatedProjects: string[];
  generatedProducts: string[];
  customProject: string;
  setCustomProject: (v: string) => void;
  customProduct: string;
  setCustomProduct: (v: string) => void;
  loading: boolean;
  loadingProducts: boolean;
  onBack: () => void;
  onGenerate: () => void;
  onSelectProject: (v: string) => void;
  onSelectProduct: (v: string) => void;
  onNext: () => void;
}

export const TrimesterStep: React.FC<TrimesterStepProps> = (props) => {
  const trimesterName = ["Primer", "Segundo", "Tercer"][props.trimesterIndex];

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-8 bg-white rounded-2xl shadow-xl">
      <div className="flex items-center justify-between">
        <button onClick={props.onBack} className="text-blue-600 flex items-center gap-1 hover:underline">
          <ChevronLeft size={18} /> Regresar
        </button>
        <div className="text-right">
          <h2 className="text-2xl font-bold text-blue-900">{trimesterName} Trimestre</h2>
          <p className="text-blue-600 font-medium">Paso 3: Proyecto y Producto</p>
        </div>
      </div>

      <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
        <h3 className="text-sm font-bold text-blue-900 uppercase tracking-wider mb-1">Problemática Seleccionada:</h3>
        <p className="text-blue-800">{props.trimester.problematica}</p>
      </div>

      {!props.generatedProjects.length ? (
        <button
          onClick={props.onGenerate}
          className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 flex items-center justify-center gap-2"
        >
          {props.loading ? <Loader2 className="animate-spin" /> : "Generar Opciones de Proyecto"}
        </button>
      ) : (
        <div className="space-y-8">
          <div className="space-y-4">
            <h3 className="font-bold text-gray-800">1. Nombre del Proyecto (Selecciona uno)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {props.generatedProjects.map((proj, idx) => (
                <button
                  key={idx}
                  onClick={() => props.onSelectProject(proj)}
                  className={`p-3 text-sm text-left rounded-lg border transition-all ${props.trimester.proyecto === proj ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-gray-200 hover:border-blue-300'}`}
                >
                  {proj}
                </button>
              ))}
              <div className="col-span-full space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase">Otro:</label>
                <input
                  type="text"
                  value={props.customProject}
                  onChange={(e) => props.setCustomProject(e.target.value)}
                  onBlur={() => { if (props.customProject) props.onSelectProject(props.customProject); }}
                  className="w-full p-3 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Escribe tu propio nombre de proyecto..."
                />
              </div>
            </div>
          </div>

          {props.trimester.proyecto && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <h3 className="font-bold text-gray-800">2. Producto Interdisciplinario (Selecciona uno)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {props.loadingProducts ? (
                  <div className="col-span-full py-10 flex flex-col items-center justify-center gap-3 text-blue-600">
                    <Loader2 className="animate-spin" size={40} />
                    <p className="font-bold animate-pulse">Generando productos interdisciplinarios...</p>
                  </div>
                ) : (
                  <>
                    {props.generatedProducts.map((prod, idx) => (
                      <button
                        key={idx}
                        onClick={() => props.onSelectProduct(prod)}
                        className={`p-3 text-sm text-left rounded-lg border transition-all ${props.trimester.producto === prod ? 'bg-green-600 text-white border-green-600' : 'bg-white border-gray-200 hover:border-green-300'}`}
                      >
                        {prod}
                      </button>
                    ))}
                    <div className="col-span-full space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase">Otro:</label>
                      <input
                        type="text"
                        value={props.customProduct}
                        onChange={(e) => props.setCustomProduct(e.target.value)}
                        onBlur={() => { if (props.customProduct) props.onSelectProduct(props.customProduct); }}
                        className="w-full p-3 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-green-500"
                        placeholder="Escribe tu propio producto final..."
                      />
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          )}

          {props.trimester.proyecto && props.trimester.producto && (
            <button
              onClick={props.onNext}
              className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold text-lg hover:bg-blue-700 transition-all"
            >
              Continuar a Vinculación de Contenidos
            </button>
          )}
        </div>
      )}
    </div>
  );
};
