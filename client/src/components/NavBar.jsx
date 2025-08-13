import React from 'react';
import { API_BASE_URL } from '../config';
import { useNavigate } from 'react-router-dom';
import { MdLogout } from "react-icons/md";
import { CgProfile } from "react-icons/cg";
import { MdOutlineSettingsSuggest } from "react-icons/md";

export default function NavBar() {
    const navigate = useNavigate();

    const handleLogout = () => {
        window.location.href = `${API_BASE_URL}/auth/logout`;
    };

    return (
        <>
        <nav className="navbar bg-base-200 px-4 md:px-8 py-3 flex justify-between items-center">
            <h1 onClick={() => navigate('/messenger')} className='text-3xl cursor-pointer'>Chatrr</h1>
            <ul className="nav-links flex items-center justify-center gap-8">
                <li><a onClick={() => navigate('/profile')} className='flex text-center items-center gap-1 cursor-pointer hover:text-primary'><CgProfile />profile</a></li>

                <li><a className='flex text-center items-center gap-1 cursor-pointer hover:text-primary' onClick={()=>{navigate("/settings")}}><MdOutlineSettingsSuggest /> Settings</a></li>

                <li><a onClick={handleLogout} className='cursor-pointer flex text-center items-center gap-1 hover:text-primary'><MdLogout />Logout</a></li>
            </ul>
        </nav>
        {/* DaisyUI 'divider' component for a themed line */}
        <div className='divider m-0'></div>
        </>
    );
}