import React, { useState, useEffect } from 'react';
import Contacts from '../components/Contacts';
import ChatBox from '../components/ChatBox';
import { useSocket } from '../context/SocketContext';

export default function Messenger({ currentUser }) {
    const [selectedUser, setSelectedUser] = useState(null);

    const socket = useSocket();

    useEffect(() => {
        if (!socket) return;

        const handleAccountDeletion = ({ deletedUserId }) => {
            // If we are currently chatting with the user who was deleted...
            if (selectedUser && selectedUser._id === deletedUserId) {
                // ...close the chat window by setting selectedUser to null.
                setSelectedUser(null);
            }
        };

        socket.on('accountDeleted', handleAccountDeletion);

        return () => {
            socket.off('accountDeleted', handleAccountDeletion);
        };
    }, [socket, selectedUser]);

    const handleBackToContacts = () => {
        setSelectedUser(null);
    };

    return (
        <div className='messenger flex h-full w-full'>
            {/* Contacts Panel */}
            <div className={`
                ${selectedUser ? 'hidden md:flex' : 'flex'} 
                flex-col w-full md:w-4/12 lg:w-3/12 h-full bg-base-200
            `}>
                <Contacts onSelectUser={setSelectedUser} />
            </div>

            {/* Chat Window Panel */}
            <div className={`
                ${selectedUser ? 'flex' : 'hidden md:flex'} 
                flex-col w-full md:w-8/12 lg:w-9/12 h-full bg-base-100
            `}>
                <ChatBox
                    selectedUser={selectedUser}
                    currentUser={currentUser}
                    onBack={handleBackToContacts}
                />
            </div>
        </div>
    );
}