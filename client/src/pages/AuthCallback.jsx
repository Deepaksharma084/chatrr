import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const AuthCallback = () => {
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        // A self-invoking function to handle the logic
        const processToken = () => {
            const params = new URLSearchParams(location.search);
            const token = params.get('token');
            const error = params.get('error'); // Check for an error from the backend

            // 1. Handle the error case first
            if (error) {
                toast.error(`Authentication failed: ${error}`);
                navigate('/'); // Redirect back to the login page
                return;
            }

            // 2. Handle the success case
            if (token) {
                // Save the token to the browser's local storage. This is the proof of login.
                localStorage.setItem('chat-token', token);

                // Force a full page reload to the messenger page.
                // This is more robust than navigate() because it guarantees that the
                // entire application state is refreshed with the new user credentials.
                window.location.href = '/messenger';

            } else {
                // 3. Handle the unlikely case of no token and no error
                toast.error("An unknown authentication error occurred. No token received.");
                navigate('/');
            }
        };

        processToken();

    }, [location, navigate]);

    return (
        <div className="h-full flex flex-col items-center justify-center gap-4">
            <span className="loading loading-spinner loading-lg text-primary"></span>
            <p className="text-xl text-base-content/70">Finalizing authentication, please wait...</p>
        </div>
    );
};

export default AuthCallback;