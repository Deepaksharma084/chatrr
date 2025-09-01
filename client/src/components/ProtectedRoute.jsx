import React from 'react';
import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { API_BASE_URL } from '../config';
import toast from 'react-hot-toast';

export default function ProtectedRoute({ children }) {
    const [isAuthenticated, setIsAuthenticated] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [user, setUser] = useState(null);

    useEffect(() => {
        fetch(`${API_BASE_URL}/auth/check-auth`, {
            credentials: 'include'
        })
            .then(res => res.json())
            .then(data => {
                setIsAuthenticated(data.isAuthenticated);
                if (data.isAuthenticated) {
                    setUser(data.user);
                }
                setIsLoading(false);
            })
            .catch(err => {
                toast.error('Authentication check failed');
                setIsAuthenticated(false);
                setIsLoading(false);
            });
    }, []);

    if (isLoading) {
        return <div className='ml-4'>Please wait...</div>;
    }

    return isAuthenticated ? React.cloneElement(children, { currentUser: user }) : <Navigate to="/" />; // Passing user as prop
}