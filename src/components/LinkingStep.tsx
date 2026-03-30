import React from 'react';
import { ChevronLeft, Upload, CheckCircle2, Trash2, Loader2 } from 'lucide-react';
import { TrimesterData, PDAContent, DISCIPLINAS_POR_CAMPO, CAMPOS_FORMATIVOS } from '../types';

interface LinkingStepProps {
  trimester: TrimesterData;
  trimesterIndex: number;
  campoFormativo: string;
  grado: string; 
  uploadedFiles: Record<string, boolean>;
  pdaDatabase: PDAContent[];
  linkingDisc: string | null;
  onBack: () => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>, type: string) => void;
  onAutoLink: (disc: string) => void;
  onAutoLinkAll: () => void;
  onRemovePda: (pdaId: string, discName: string) => void;
  onNext: () => void;
}

export const LinkingStep: React.FC<LinkingStepProps> = (props) => {
  const trimesterName = ["Primer", "Segundo", "Tercer"][props.trimesterIndex];
  
// --- FILTRO INTELIGENTE POR GRADO (NEM SECUNDARIA) ---
  const disciplines = (DISCIPLINAS_POR_CAMPO[props.campoFormativo] || []).filter(disc => {
    // Convertimos a texto por seguridad y buscamos si contiene el número
    const gradoSeleccionado = String(props.grado);
    const esPrimero = gradoSeleccionado.includes("1");
    const esSegundo = gradoSeleccionado.includes("2");
    const esTercero = gradoSeleccionado.includes("3");

    // 1. Reglas para Saberes y Pensamiento Científico
    if (props.campoFormativo === "Saberes y Pensamiento Científico") {
      if (esPrimero && (disc === "Física" || disc === "Química")) return false;
      if (esSegundo && (disc === "Biología" || disc === "Química")) return false;
      if (esTercero && (disc === "Biología" || disc === "Física")) return false;
    }
    
    // 2. Reglas para Ética, Naturaleza y Sociedades
    if (props.campoFormativo === "Ética, Naturaleza y Sociedades") {
      // Geografía solo se imparte en 1er Grado
      if ((esSegundo || esTercero) && disc === "Geografía") return false;
    }

    return true; 
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-8 bg-white rounded-2xl shadow-xl">
      <div className="flex items-center justify-between">
        <button onClick={props.onBack} className="text-blue-600 flex items-center gap-1 hover:underline">
          <ChevronLeft size={18} /> Regresar
        </button>
        <div className="text-right">
          <h2 className="text-2xl font-bold text-blue-900">Vinculación de Contenidos y PDA</h2>
          <p className="text-blue-600 font-medium">{trimesterName} Trimestre (Grado: {props.grado}°)</p>
        </div>
      </div>

      {/* Panel de Carga de Archivos */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">1. Carga de Programas Sintéticos (PDF)</h3>
        <p className="text-xs text-slate-500 italic">Sube los archivos de los campos formativos para que la IA pueda vincular los contenidos.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {CAMPOS_FORMATIVOS.map(campo => (
            <div key={campo} className={`p-4 rounded-xl border-2 border-dashed transition-all flex flex-col items-center justify-center text-center gap-2 relative ${props.uploadedFiles[campo] ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
              {props.uploadedFiles[campo] ? (
                <>
                  <CheckCircle2 className="text-green-600" size={24} />
                  <span className="text-[10px] font-bold text-green-800 leading-tight">{campo} Cargado</span>
                </>
              ) : (
                <>
                  <Upload className="text-gray-400" size={24} />
                  <span className="text-[10px] font-bold text-gray-600 leading-tight">Cargar PDF: {campo}</span>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => props.onFileUpload(e, campo)}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-6 pt-6 border-t border-gray-100">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-800">2. Disciplinas Disponibles: {props.campoFormativo}</h3>
          {props.pdaDatabase.length > 0 && (
            <button
              onClick={props.onAutoLinkAll}
              disabled={props.linkingDisc !== null}
              className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg text-xs font-bold hover:bg-blue-200 transition-all flex items-center gap-2"
            >
              {props.linkingDisc ? <Loader2 className="animate-spin" size={14} /> : "🤖 Vincular Todo con IA"}
            </button>
          )}
        </div>

        {props.pdaDatabase.length === 0 && (
          <div className="p-6 bg-amber-50 border border-amber-200 rounded-2xl text-amber-800 flex flex-col items-center gap-3 text-center">
            <p className="font-bold">⚠️ No se han cargado contenidos aún.</p>
            <p className="text-sm">Sube los archivos PDF arriba para habilitar la vinculación automática con IA.</p>
          </div>
        )}

        <div className="space-y-4">
          {disciplines.map(disc => {
            const vinculacion = props.trimester.vinculaciones.find(v => v.disciplina === disc);

            return (
              <div key={disc} className="p-6 border border-gray-100 rounded-2xl bg-gray-50/50 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-bold text-blue-900">{disc}</h4>
                  <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                    {vinculacion?.pdaIds.length || 0} vinculados
                  </span>
                </div>

                {/* Lista de PDAs vinculados */}
                <div className="space-y-2">
                  {vinculacion?.pdaIds.map(id => {
                    const pda = props.pdaDatabase.find(p => p.id === id);
                    return (
                      <div key={id} className="p-3 bg-white border border-green-100 rounded-lg flex justify-between items-center text-sm shadow-sm">
                        <div className="flex-1">
                          <span className="font-bold text-green-700 block mb-1">{pda?.contenido}</span>
                          <p className="text-gray-600 italic leading-relaxed">{pda?.pda}</p>
                        </div>
                        <button 
                          onClick={() => props.onRemovePda(id, disc)}
                          className="ml-4 text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-colors"
                          title="Quitar PDA"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Botón de Auto-Vinculación con IA */}
                <div className="relative mt-4">
                  {!vinculacion || vinculacion.pdaIds.length === 0 ? (
                    <button
                      onClick={() => props.onAutoLink(disc)}
                      disabled={props.linkingDisc !== null || props.pdaDatabase.length === 0}
                      className="w-full p-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all flex justify-center items-center gap-2 disabled:opacity-50 shadow-lg shadow-blue-100"
                    >
                      {props.linkingDisc === disc ? (
                        <>
                          <Loader2 className="animate-spin" size={20} />
                          <span>Analizando contenidos de {disc}...</span>
                        </>
                      ) : (
                        <>🤖 Vincular contenidos de {disc} con IA</>
                      )}
                    </button>
                  ) : (
                    <div className="flex gap-2">
                       <button
                        onClick={() => props.onAutoLink(disc)}
                        disabled={props.linkingDisc !== null}
                        className="flex-1 p-3 bg-white border-2 border-blue-200 text-blue-600 font-bold rounded-xl hover:bg-blue-50 transition-all flex justify-center items-center gap-2"
                      >
                        {props.linkingDisc === disc ? <Loader2 className="animate-spin" size={18} /> : "🔄 Re-vincular"}
                      </button>
                      <div className="flex-[2] p-3 bg-green-50 border border-green-200 rounded-xl text-center flex items-center justify-center gap-2">
                        <CheckCircle2 size={18} className="text-green-600" />
                        <p className="text-sm text-green-700 font-bold">Listos para el proyecto</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <button
          disabled={props.trimester.vinculaciones.length < disciplines.length}
          onClick={props.onNext}
          className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-xl hover:bg-slate-800 disabled:opacity-30 transition-all shadow-xl"
        >
          {props.trimesterIndex < 2 ? "SIGUIENTE TRIMESTRE →" : "FINALIZAR Y VER ORGANIZACIÓN"}
        </button>
      </div>
    </div>
  );
};