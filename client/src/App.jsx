// client/src/App.jsx

import React from 'react';
import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import GoogleAuth from './pages/GoogleAuth.jsx';
import Messenger from './pages/Messenger.jsx';
import Settings from './pages/Settings.jsx';
import CurrentUserProfilePage from './pages/CurrentUserProfile.jsx';
import SelectedUserProfilePage from './pages/SelectedUserProfile.jsx';
import NavBar from './components/NavBar.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import { SocketProvider } from './context/SocketContext';
import { getTheme } from './utils/themeStorage.js';
import useFriendSocket from './hooks/useFriendSocket';

// STEP 1: Create a new component that holds all your UI.
// This component will live *inside* the SocketProvider.
function AppContent() {
  // ✅ Now this hook is called correctly from INSIDE the provider's scope.
  useFriendSocket();

  return (
    <div className='h-screen bg-base-100 text-base-content flex flex-col'>
      <NavBar />
      <main className='flex-grow overflow-y-auto'>
        <Routes>
          <Route path="/" element={<GoogleAuth />} />
          <Route path="/messenger" element={<ProtectedRoute><Messenger /></ProtectedRoute>} />
          <Route path="/current_user_profile" element={<ProtectedRoute><CurrentUserProfilePage /></ProtectedRoute>} />
          <Route path="/selected_user_profile/:id" element={<ProtectedRoute><SelectedUserProfilePage /></ProtectedRoute>} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  );
}


function App() {
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", getTheme());
  }, []);

  // The main App component's only jobs are to set up the Router and the global Provider.
  return (
    <Router>
      <SocketProvider>
        <Toaster position="top-center" reverseOrder={false} />

        {/* STEP 2: Render your new AppContent component here. */}
        <AppContent />

      </SocketProvider>
    </Router>
  );
}

export default App;