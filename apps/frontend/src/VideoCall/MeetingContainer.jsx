import MeetingCard from './MeetingCard';

const MeetingContainer = ({ meetings, joinExistingMeeting, endMeeting, refreshMeetings }) => {
    return (
        <div className="flex flex-col items-center max-w-[1200px] mx-auto">
            <button 
                onClick={refreshMeetings}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md mb-4 flex items-center"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Actualizar reuniones
            </button>
            <div className="flex flex-wrap justify-center gap-6 py-5 w-full">
                {meetings.map(meeting => (
                    <div 
                        key={meeting._id || meeting.meetingId}
                        className="flex-none w-80 max-w-full mb-2.5"
                    >
                        <MeetingCard
                            meeting={meeting}
                            joinExistingMeeting={joinExistingMeeting}
                            endMeeting={endMeeting}
                        />
                    </div>
                ))}
            </div>
        </div>
    )
}

export default MeetingContainer;