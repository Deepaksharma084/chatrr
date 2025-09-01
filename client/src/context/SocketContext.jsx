import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';
import { API_BASE_URL } from '../config';

const SocketContext = createContext();

export function SocketProvider({ children }) {
    const [socket, setSocket] = useState(null);

    useEffect(() => {
        // initialize the connection.
        const newSocket = io(API_BASE_URL, {
            reconnectionAttempts: 5,
            transports: ['websocket'],
        });
        setSocket(newSocket);

        // Cleanup on unmount
        return () => {
            if (newSocket) newSocket.close();
        };
    }, []);
    // This prevents any child component from trying to use a socket that doesn't exist yet.
    if (!socket) {
        return null;
    }

    return (
        <SocketContext.Provider value={socket}>
            {children}
        </SocketContext.Provider>
    );
}

export const useSocket = () => {
    const socket = useContext(SocketContext);
    if (!socket) {
        throw new Error('useSocket must be used within a SocketProvider');
    }
    return socket;
};
