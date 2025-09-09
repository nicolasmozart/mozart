import React from 'react';
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels';

const MeetingPanel = ({
  currentMeetingId,
  localVideoRef,
  remoteVideoRef,
  toggleMute,
  toggleVideo,
  leaveMeeting,
  toggleTranscription,
  saveTranscription,
  restartAudio,
  isMuted,
  isVideoEnabled,
  isTranscribing,
  isSavingTranscription,
  transcriptions,
  selectedAudioDevice,
  selectedVideoDevice,
  selectedAudioOutputDevice,
  changeAudioDevice,
  changeVideoDevice,
  changeAudioOutputDevice,
  availableDevices,
  audioOutputDevices,
}) => {
  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between mb-2 items-center">
        <h2 className="text-lg font-semibold">Reunión: {currentMeetingId}</h2>
      </div>

      <div className="flex flex-col flex-grow">
        {/* Video y controles */}
        <div className="flex-grow flex flex-col">
          <div className="flex gap-4 mb-2 flex-grow">
            <div className="flex-1 min-h-0">
              <video
                ref={localVideoRef}
                id="local-video"
                autoPlay
                muted
                playsInline
                className="w-full h-full bg-black rounded-lg object-cover"
              />
            </div>
            <div className="flex-1 min-h-0">
              <video
                ref={remoteVideoRef}
                id="remote-video"
                autoPlay
                playsInline
                className="w-full h-full bg-black rounded-lg object-cover"
              />
            </div>
          </div>

          {/* Controles de reunión */}
          <div className="flex justify-center gap-4 p-4 bg-gray-100 rounded-lg mb-4">
            <ControlButton
              onClick={toggleMute}
              active={isMuted}
              icon={isMuted ? "fas fa-microphone-slash" : "fas fa-microphone"}
              color={isMuted ? '#EA4335' : '#fff'}
              tooltip={isMuted ? 'Activar micrófono' : 'Silenciar micrófono'}
            />

            <ControlButton
              onClick={toggleVideo}
              active={!isVideoEnabled}
              icon={isVideoEnabled ? "fas fa-video" : "fas fa-video-slash"}
              color={!isVideoEnabled ? '#EA4335' : '#fff'}
              tooltip={isVideoEnabled ? 'Desactivar cámara' : 'Activar cámara'}
            />

            <ControlButton
              onClick={leaveMeeting}
              icon="fas fa-phone-slash"
              color="#EA4335"
              tooltip="Salir de la reunión"
              fixedColor
            />

            {/* Comentamos los botones de transcripción
            <ControlButton
              onClick={toggleTranscription}
              icon={isTranscribing ? "fas fa-stop" : "fas fa-closed-captioning"}
              color={isTranscribing ? '#ff9800' : '#2196F3'}
              tooltip={isTranscribing ? 'Detener transcripción' : 'Iniciar transcripción'}
              fixedColor
            />

            <ControlButton
              onClick={saveTranscription}
              icon="fas fa-save"
              color={transcriptions.length === 0 ? '#ccc' : '#4CAF50'}
              tooltip={isSavingTranscription ? 'Guardando...' : 'Guardar transcripción'}
              disabled={transcriptions.length === 0 || isSavingTranscription}
              fixedColor
            />
            */}

            <ControlButton
              onClick={restartAudio}
              icon="fas fa-sync-alt"
              color="#FF9800"
              tooltip="Reiniciar audio"
              fixedColor
            />
          </div>

          {/* Panel de configuración */}
          <details className="mb-2 bg-gray-50 rounded-lg p-2">
            <summary className="cursor-pointer font-bold">
              <i className="fas fa-cog"></i> Configuración de dispositivos
            </summary>
            <div className="py-2.5 flex gap-5 flex-wrap">
              <DeviceSelector
                label="Micrófono"
                icon="fas fa-microphone"
                value={selectedAudioDevice}
                onChange={changeAudioDevice}
                options={availableDevices.audioInputs}
              />
              <DeviceSelector
                label="Cámara"
                icon="fas fa-video"
                value={selectedVideoDevice}
                onChange={changeVideoDevice}
                options={availableDevices.videoInputs}
              />
              <DeviceSelector
                label="Altavoces/Auriculares"
                icon="fas fa-headphones"
                value={selectedAudioOutputDevice}
                onChange={changeAudioOutputDevice}
                options={audioOutputDevices}
              />
            </div>
          </details>
        </div>

        {/* Comentamos el panel de transcripción 
        <div className="flex-[1.5] flex flex-col">
          <h3 className="mt-0 mb-2.5">
            <i className="fas fa-comments"></i> Transcripción
          </h3>
          <div className="flex-grow overflow-y-auto bg-gray-100 p-2.5 rounded-lg">
            {transcriptions.length === 0 ? (
              <div className="text-gray-600 italic text-center mt-5">
                No hay transcripciones disponibles.<br />
                Inicia la transcripción para comenzar.
              </div>
            ) : (
              transcriptions.map((item, index) => (
                <div key={index} className={`mb-2.5 p-2 ${item.isPartial ? 'bg-blue-50' : 'bg-white'} rounded shadow-sm`}>
                  <div className="text-xs text-gray-600 mb-1.5">
                    <i className="far fa-clock"></i> {new Date(item.timestamp).toLocaleTimeString()} - {item.attendeeId || 'Desconocido'}
                  </div>
                  <div>{item.text}</div>
                </div>
              ))
            )}
          </div>
        </div>
        */}
      </div>
    </div>
  );
};

// Subcomponentes
const ControlButton = ({ onClick, icon, tooltip, color, active, disabled, fixedColor }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`w-[50px] h-[50px] rounded-full border border-gray-300 font-bold flex items-center justify-center text-lg
      ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}
      ${fixedColor ? getBgColorClass(color) : active ? getBgColorClass(color) : 'bg-white'}
      ${fixedColor ? 'text-white' : active ? 'text-white' : 'text-black'}`}
    title={tooltip}
  >
    <i className={icon}></i>
  </button>
);

// Helper function to map colors to Tailwind classes (simplified for the main colors)
const getBgColorClass = (color) => {
  const colorMap = {
    '#EA4335': 'bg-red-500',
    '#ff9800': 'bg-orange-500',
    '#2196F3': 'bg-blue-500',
    '#4CAF50': 'bg-green-500',
    '#FF9800': 'bg-orange-500',
    '#ccc': 'bg-gray-300',
    '#fff': 'bg-white'
  };
  return colorMap[color] || 'bg-gray-500'; // Default fallback
};

const DeviceSelector = ({ label, icon, value, onChange, options }) => (
  <div className="flex-1 min-w-[200px]">
    <label className="block mb-1.5 text-sm">
      <i className={icon}></i> {label}:
    </label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full p-1.5 rounded border border-gray-300 text-sm"
    >
      {options.map(device => (
        <option key={device.deviceId} value={device.deviceId}>
          {device.label || `${label} ${device.deviceId.substring(0, 5)}...`}
        </option>
      ))}
    </select>
  </div>
);

export default MeetingPanel;
