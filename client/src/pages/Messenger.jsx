import React, { useState, useEffect } from 'react';
import Contacts from '../components/Contacts';
import ChatBox from '../components/ChatBox';
import { useSocket } from '../context/SocketContext';

export default function Messenger({ currentUser }) {
    const [selectedUser, setSelectedUser] = useState(null);
    const [showProfile, setShowProfile] = useState(false);

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

    useEffect(() => {
        // Push state when user is selected or profile is toggled
        if (selectedUser) {
            window.history.pushState(
                {
                    selectedUser: selectedUser,
                    showProfile: showProfile
                },
                ''
            );
        }

        const handlePopState = (event) => {
            if (!event.state) {
                setSelectedUser(null);
                setShowProfile(false);
                return;
            }

            // If we're showing profile, go back to chat
            if (event.state.selectedUser && !event.state.showProfile) {
                setShowProfile(false);
            }
            // If we're in chat and no profile flag, go back to contacts
            else if (!event.state.selectedUser) {
                setSelectedUser(null);
                setShowProfile(false);
            }
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [selectedUser, showProfile]);

    const handleBackToContacts = () => {
        setSelectedUser(null);
    };

    const handleViewProfile = () => {
        setShowProfile(true);
        // Push new state when viewing profile
        window.history.pushState(
            {
                selectedUser: selectedUser,
                showProfile: true
            },
            ''
        );
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
                {showProfile ? (
                    <SelectedUserProfile
                        user={selectedUser}
                        onBack={() => setShowProfile(false)}
                    />
                ) : (
                    <ChatBox
                        selectedUser={selectedUser}
                        currentUser={currentUser}
                        onBack={handleBackToContacts}
                        onViewProfile={handleViewProfile}
                    />
                )}
            </div>
        </div>
    );
}