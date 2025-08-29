// client/src/context/SocketContext.jsx

import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';
import { API_BASE_URL } from '../config';

const SocketContext = createContext();

export function SocketProvider({ children }) {
    const [socket, setSocket] = useState(null);

    useEffect(() => {
        // This part is correct: initialize the connection.
        const newSocket = io(API_BASE_URL, {
            // Optional but good for reliability
            reconnectionAttempts: 5,
            transports: ['websocket'],
        });
        setSocket(newSocket);

        // Cleanup on unmount is correct.
        return () => {
            if (newSocket) newSocket.close();
        };
    }, []); // Runs once after initial render.

    // --- THIS IS THE GUARANTEED FIX ---
    // If the socket connection has not been established yet (the value is still null),
    // DO NOT render the rest of the application.
    // This prevents any child component from trying to use a socket that doesn't exist yet.
    if (!socket) {
        // You can return a full-page loading spinner here for a better UX,
        // but for now, returning null is the simplest and most effective fix.
        // The app will be blank for a fraction of a second.
        return null;
    }

    return (
        <SocketContext.Provider value={socket}>
            {children}
        </SocketContext.Provider>
    );
}

export const useSocket = () => {
    // This hook is now safe, because it will never be called when the context value is null.
    const socket = useContext(SocketContext);
    if (!socket) {
        // This error should theoretically never be thrown again, but it's good practice to keep it.
        throw new Error('useSocket must be used within a SocketProvider');
    }
    return socket;
};
