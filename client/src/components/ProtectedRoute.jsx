import React from 'react';
import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { fetchWithAuth } from '../utils/fetchWithAuth';
import toast from 'react-hot-toast';

export default function ProtectedRoute({ children }) {
    const [isAuthenticated, setIsAuthenticated] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [user, setUser] = useState(null);

    useEffect(() => {
        const checkAuthentication = async () => {
            // 2. First, check if a token even exists in local storage.
            const token = localStorage.getItem('chat-token');
            if (!token) {
                // If no token, we know the user is not authenticated. No need for an API call.
                setIsAuthenticated(false);
                setIsLoading(false);
                return;
            }

            // 3. If a token exists, verify it with the backend.
            try {
                const res = await fetchWithAuth('/auth/check-auth');

                if (res.ok) {
                    const data = await res.json();
                    setIsAuthenticated(data.isAuthenticated);
                    if (data.isAuthenticated) {
                        setUser(data.user);
                    }
                } else {
                    // If the response is not ok (e.g., 401), the token is invalid.
                    toast.error("Session expired. Please log in again.");
                    setIsAuthenticated(false);
                    localStorage.removeItem('chat-token');
                }
            } catch (err) {
                toast.error('Authentication check failed. Please log in again.');
                setIsAuthenticated(false);
                localStorage.removeItem('chat-token'); // Clean up on error
            } finally {
                setIsLoading(false);
            }
        };

        checkAuthentication();
    }, []);

    if (isLoading) {
        return (
            <div className="h-full flex items-center justify-center">
                <span className="loading loading-spinner loading-lg"></span>
            </div>
        );
    }

    return isAuthenticated
        ? React.cloneElement(children, { currentUser: user })
        : <Navigate to="/" />;
}