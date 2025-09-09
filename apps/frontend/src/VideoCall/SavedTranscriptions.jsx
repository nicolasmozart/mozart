import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api';

const SavedTranscriptions = () => {
  const [transcriptions, setTranscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTranscription, setSelectedTranscription] = useState(null);
  const [error, setError] = useState(null);
  
  // Estados para GPT
  const [gptAnalysis, setGptAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    loadTranscriptions();
  }, []);

  const loadTranscriptions = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/transcriptions`);
      
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }
      
      const data = await response.json();
      setTranscriptions(data.data || []);
      setError(null);
    } catch (error) {
      console.error('Error al cargar transcripciones:', error);
      setError('No se pudieron cargar las transcripciones. Por favor, intente de nuevo más tarde.');
    } finally {
      setLoading(false);
    }
  };

  const viewTranscription = async (transcriptionId) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/transcriptions/${transcriptionId}`);
      
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }
      
      const data = await response.json();
      setSelectedTranscription(data.data);
      
      if (data.data.gptAnalysis) {
        setGptAnalysis(data.data.gptAnalysis);
      } else {
        setGptAnalysis(null);
      }
    } catch (error) {
      console.error('Error al cargar transcripción:', error);
      setError('No se pudo cargar la transcripción seleccionada.');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const processWithGPT = async () => {
    if (!selectedTranscription) return;
    
    setIsAnalyzing(true);
    setGptAnalysis(null);
    
    try {
      const response = await api.processTranscriptionWithGPT(selectedTranscription._id);
      
      if (!response.success) {
        throw new Error(response.error || 'Error al procesar con GPT');
      }
      
      setGptAnalysis(response.result);
    } catch (error) {
      console.error('Error al procesar con GPT:', error);
      setError('Error al procesar la transcripción con GPT: ' + error.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const renderGptAnalysis = () => {
    if (!gptAnalysis) return null;
    
    if (typeof gptAnalysis === 'object' && gptAnalysis !== null) {
      return (
        <div>
          {Object.entries(gptAnalysis).map(([key, value]) => (
            <div key={key} className="mb-4">
              <h4 className="my-2.5 text-lg font-semibold">{key}</h4>
              <div className="bg-white p-3 rounded-md whitespace-pre-wrap text-sm">
                {typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
              </div>
            </div>
          ))}
        </div>
      );
    }
    
    return (
      <div className="whitespace-pre-wrap bg-white p-4 rounded-md text-sm">
        {gptAnalysis}
      </div>
    );
  };

  return (
    <div className="p-6 max-w-full flex flex-col gap-3">
      <h2 className="text-2xl font-bold mb-5">Transcripciones Guardadas</h2>
      
      {error && (
        <div className="p-3 bg-red-100 text-red-700 rounded-md mb-5">
          {error}
        </div>
      )}
      
      {loading ? (
        <div className="text-center text-gray-600">Cargando transcripciones...</div>
      ) : (
        <div className="flex gap-3">
          {/* Lista de transcripciones ajustada a la izquierda */}
          <div className="w-[200px] max-w-[200px] flex-shrink-0">
            {transcriptions.length === 0 ? (
              <div className="p-4 bg-gray-100 rounded-md text-center text-sm">
                No hay transcripciones guardadas
              </div>
            ) : (
              <ul className="list-none p-0 m-0">
                {transcriptions.map(transcription => (
                  <li 
                    key={transcription._id}
                    className={`p-3 mb-2 rounded-md cursor-pointer text-sm transition-all duration-300 ease-in-out ${
                      selectedTranscription?._id === transcription._id ? 'bg-blue-100' : 'bg-gray-50 hover:bg-gray-200'
                    }`}
                    onClick={() => viewTranscription(transcription._id)}
                  >
                    <div><strong>ID:</strong> {transcription.meetingId.substring(0, 10)}...</div>
                    <div><strong>Fecha:</strong> {formatDate(transcription.createdAt)}</div>
                    <div><strong>Segmentos:</strong> {transcription.segments.length}</div>
                  </li>
                ))}
              </ul>
            )}
            
            <button 
              onClick={loadTranscriptions}
              className="mt-4 p-3 bg-blue-500 text-white rounded-md w-full shadow-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              Actualizar lista
            </button>
          </div>
          
          {/* Área principal  */}
          {selectedTranscription && (
            <div className="flex-1 flex flex-col w-full">
              {/* Información de la transcripción */}
              <div className="bg-gray-50 p-4 rounded-md mb-4 shadow-md">
                <h3 className="text-xl font-semibold">Transcripción: {selectedTranscription.meetingId}</h3>
                <div className="text-sm text-gray-600 mb-2.5 flex gap-5 flex-wrap">
                  <div>Fecha: {formatDate(selectedTranscription.createdAt)}</div>
                  <div>Idioma: {selectedTranscription.language}</div>
                  <div>Segmentos: {selectedTranscription.segments.length}</div>
                </div>
                
                {/* Mostrar botón Analizar solo si no hay análisis */}
                {!gptAnalysis && !isAnalyzing && (
                  <button 
                    onClick={processWithGPT}
                    className="p-3 bg-green-500 text-white rounded-md w-full hover:bg-green-600"
                  >
                    Analizar con GPT
                  </button>
                )}
                
                {isAnalyzing && (
                  <div className="p-3 bg-gray-200 rounded-md inline-block text-sm">
                    Analizando...
                  </div>
                )}
              </div>
              
              {/* Contenedores de segmentos y análisis */}
              <div className="flex gap-6 h-[calc(100vh-250px)] w-full">
                {/* Panel de segmentos más ancho */}
                <div className="flex-1 min-w-0 w-[50%] bg-white border border-gray-200 bg-red  rounded-md overflow-y-auto">
                  <h3 className="p-4 text-lg font-semibold ">Segmentos</h3>
                  <div className="p-4">
                    {selectedTranscription.segments.map((segment, index) => (
                      <div key={index} className="mb-4 border-b border-gray-200 pb-2">
                        <div className="flex justify-between">
                          <span className="font-bold text-gray-800">{segment.speakerId || 'Desconocido'}</span>
                          <span className="text-xs text-gray-500">{formatDate(segment.timestamp)}</span>
                        </div>
                        <div className="text-sm">{segment.text}</div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Panel de análisis GPT más ancho */}
                {gptAnalysis && (
                  <div className="flex-1 min-w-0 bg-white border border-green-200 rounded-md overflow-y-auto">
                    <h3 className="p-4 text-lg font-semibold">Análisis con GPT</h3>
                    <div className="p-4">{renderGptAnalysis()}</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SavedTranscriptions;
