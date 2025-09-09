import React from 'react';

/**
 * Componente para mostrar y gestionar la lista de reuniones
 */
const MeetingCard = ({meeting, joinExistingMeeting, endMeeting}) => {
    // Determinar el color del estado y texto
    let statusColor, statusText, statusBgClass, statusBorderClass;
    switch (meeting.status) {
      case 'active':
        statusColor = '#4CAF50';
        statusText = 'Activa';
        statusBgClass = 'bg-green-500';
        statusBorderClass = 'border-green-500';
        break;
      case 'ended':
        statusColor = '#9E9E9E';
        statusText = 'Finalizada';
        statusBgClass = 'bg-gray-500';
        statusBorderClass = 'border-gray-500';
        break;
      case 'expired':
        statusColor = '#FF9800';
        statusText = 'Expirada';
        statusBgClass = 'bg-orange-500';
        statusBorderClass = 'border-orange-500';
        break;
      default: // created
        statusColor = '#2196F3';
        statusText = 'Creada';
        statusBgClass = 'bg-blue-500';
        statusBorderClass = 'border-blue-500';
    }
    
    const isActive = ['active', 'created'].includes(meeting.status);
    
    return (
        <div
            key={meeting.meetingId}
            onClick={() => isActive ? joinExistingMeeting(meeting.meetingId) : null}
            className={`border border-gray-300 ${statusBorderClass} border-l-4 rounded p-4 shadow transition-transform duration-200
                ${isActive ? 'cursor-pointer bg-white opacity-100 hover:translate-y-[-3px] hover:shadow-md' : 
                'cursor-default bg-gray-50 opacity-80'}`}
        >
            <div className="flex justify-between items-center mb-2.5">
                <h3 className="m-0">Reunión {meeting.meetingId.substring(0, 8)}...</h3>
                <span className={`${statusBgClass} text-white py-0.5 px-2 rounded-full text-xs font-bold`}>
                    {statusText}
                </span>
            </div>

            <div className="text-sm text-gray-600 mb-2.5">
                Creada: {new Date(meeting.createdAt).toLocaleString()}
            </div>

            <div className="flex justify-between mt-4">
                {isActive && (
                    <>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                joinExistingMeeting(meeting.meetingId);
                            }}
                            className="bg-blue-500 text-white border-none py-1 px-2.5 rounded cursor-pointer flex-1 mr-1 text-sm"
                        >
                            <i className="fas fa-sign-in-alt mr-1"></i> Unirse
                        </button>
                        <button
                            onClick={(e) => endMeeting(meeting.meetingId, e)}
                            className="bg-red-500 text-white border-none py-1 px-2.5 rounded cursor-pointer flex-1 ml-1 text-sm"
                        >
                            <i className="fas fa-times-circle mr-1"></i> Finalizar
                        </button>
                    </>
                )}
                {['ended', 'expired'].includes(meeting.status) && (
                    <div className="text-center w-full text-gray-600 italic">
                        No disponible
                    </div>
                )}
            </div>
        </div>
    );
};

export default MeetingCard; 