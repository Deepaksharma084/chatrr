import React from 'react';
import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import GoogleAuth from './pages/GoogleAuth.jsx';
import Messenger from './pages/Messenger.jsx';
import Settigs from './pages/Settings.jsx';
import ProfilePage from './pages/Profile.jsx';
import NavBar from './components/NavBar.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import { SocketProvider } from './context/SocketContext';
import { getTheme } from './utils/themeStorage.js';

function App() {
  useEffect(() => {
    // here it gets the theme from localStorage (or the default)
    // and applies it to the entire document.
    document.documentElement.setAttribute("data-theme", getTheme());
  }, []);

  return (
    <Router>
      <SocketProvider>
        <Toaster position="top-center" reverseOrder={false} />
        <div className='h-screen bg-base-100 text-base-content flex flex-col'>
          <NavBar />
          {/* here the main section will grow to fill the remaining vertical space */}
          <main className='flex-grow overflow-y-auto'>
            <Routes>
              <Route path="/" element={<GoogleAuth />} />
              <Route
                path="/messenger"
                element={
                  <ProtectedRoute>
                    <Messenger />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <ProfilePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <Settigs />
                }
              />
            </Routes>
          </main>
        </div>
      </SocketProvider>
    </Router>
  );
}

export default App;