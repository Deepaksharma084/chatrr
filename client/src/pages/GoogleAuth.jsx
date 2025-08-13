import React from 'react';
import { API_BASE_URL } from '../config';

const GoogleAuth = () => {
  const handleLogin = () => {
    window.location.href = `${API_BASE_URL}/auth/google`;
  };

  return (
    <div className='h-full flex items-center justify-center p-4'>

      <button
        onClick={handleLogin}
        className="btn h-auto flex flex-col md:flex-row items-center justify-center gap-6 md:gap-4
                   w-full max-w-sm md:w-auto 
                   p-6 md:py-6 md:pr-12 md:pl-3 
                   rounded-3xl hover:scale-105 duration-300 transition-transform"
      >
        <div className="w-24 h-24 md:w-48 md:h-48 rounded-full overflow-hidden flex-shrink-0">
          <svg aria-label="Google logo" className="w-full h-full" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
            <g>
              <path d="m0 0H512V512H0" fill="#33363a"></path>
              <path fill="#34a853" d="M153 292c30 82 118 95 171 60h62v48A192 192 0 0190 341"></path>
              <path fill="#4285f4" d="m386 400a140 175 0 0053-179H260v74h102q-7 37-38 57"></path>
              <path fill="#fbbc02" d="m90 341a208 200 0 010-171l63 49q-12 37 0 73"></path>
              <path fill="#ea4335" d="m153 219c22-69 116-109 179-50l55-54c-78-75-230-72-297 55"></path>
            </g>
          </svg>
        </div>

        <span className='flex flex-col gap-2 items-center justify-center'>
          <span className='text-xl md:text-3xl'>
            Sign in with
          </span>
          <span className='text-5xl md:text-7xl font-bold'>
            Google
          </span>
        </span>
      </button>

    </div>
  );
};

export default GoogleAuth;