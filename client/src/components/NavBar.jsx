import React, { useState, useEffect,useRef } from 'react';
import { API_BASE_URL } from '../config';
import { useNavigate } from 'react-router-dom';
import { MdLogout, MdDelete } from "react-icons/md";
import { CgProfile } from "react-icons/cg";
import { MdOutlineSettingsSuggest } from "react-icons/md";
import { FaUserFriends } from "react-icons/fa";
import { UserPlus, UserCheck, UserX } from "lucide-react";
import toast from "react-hot-toast";


export default function NavBar() {
    const navigate = useNavigate();

    // --- NEW STATE for the friend request dropdown ---
    const [friendRequests, setFriendRequests] = useState([]);
    const [addFriendEmail, setAddFriendEmail] = useState("");

    const dropdownRef = useRef(null);

    // Function to fetch the latest friend requests
    const fetchFriendRequests = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/friends/requests`, { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                setFriendRequests(data);
            }
        } catch (error) {
            console.error("Failed to fetch friend requests:", error);
        }
    };

    // This effect runs on component mount AND whenever our custom event is dispatched.
    useEffect(() => {
        fetchFriendRequests(); // Fetch initially

        // Listen for the custom event dispatched by our socket hook
        window.addEventListener('friendRequestsChanged', fetchFriendRequests);

        // Cleanup
        return () => {
            window.removeEventListener('friendRequestsChanged', fetchFriendRequests);
        };
    }, []);

     const closeDropdown = () => {
        if (dropdownRef.current) {
            dropdownRef.current.blur();
        }
    };

    const handleSendRequest = async (e) => {
        e.preventDefault();
        if (!addFriendEmail.trim()) return;
        try {
            const res = await fetch(`${API_BASE_URL}/friends/send-request`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ recipientEmail: addFriendEmail })
            });
            const data = await res.json();
             if (!res.ok) {
                // `data.error` will contain "User not found", "Already friends", etc.
                throw new Error(data.error || 'An unknown error occurred');
            }
            toast.success('Friend request sent!');
            setAddFriendEmail("");
        } catch (err) {
            toast.error(err.message || 'Failed to send request.');
        }
    };

    const handleAcceptRequest = async (requesterId) => {
        // Store a backup of the current state
        const originalRequests = [...friendRequests];

        // 1. Optimistic UI Update: Instantly remove the request from the list.
        setFriendRequests(prev => prev.filter(req => req._id !== requesterId));

        try {
            const res = await fetch(`${API_BASE_URL}/friends/accept-request/${requesterId}`, { method: 'POST', credentials: 'include' });
            if (!res.ok) throw new Error("Failed to accept request");
            
            toast.success("Friend request accepted!");
            // Dispatch the event to tell the Contacts page to refresh its friend list.
            window.dispatchEvent(new Event('friendsChanged')); 
        } catch {
            toast.error("Failed to accept request.");
            // 2. On failure, revert the UI to the original state.
            setFriendRequests(originalRequests);
        }
    };

    const handleRejectRequest = async (requesterId) => {
        // Store a backup of the current state
        const originalRequests = [...friendRequests];

        // 1. Optimistic UI Update: Instantly remove the request from the list.
        setFriendRequests(prev => prev.filter(req => req._id !== requesterId));
        
        try {
            const res = await fetch(`${API_BASE_URL}/friends/reject-request/${requesterId}`, { method: 'POST', credentials: 'include' });
            if (!res.ok) throw new Error("Failed to reject request");
            
            toast.success("Friend request rejected");
            // No need to dispatch a global event on rejection.
        } catch (err) {
            toast.error("Failed to reject request.");
            // 2. On failure, revert the UI to the original state.
            setFriendRequests(originalRequests);
        }
    };

    const handleLogout = () => { window.location.href = `${API_BASE_URL}/auth/logout`; };

    return (
        <>
            <nav className="navbar bg-base-200 px-4 md:px-8 py-3 flex justify-between items-center">
                <h1 onClick={() => navigate('/messenger')} className='text-3xl cursor-pointer'>Chatrr</h1>
                <ul className="nav-links flex items-center justify-center gap-4 md:gap-8">

                    {/* --- NEW FRIEND REQUEST DROPDOWN --- */}
                    <li className="dropdown dropdown-end">
                        <label ref={dropdownRef} tabIndex={0} className="btn rounded-xl btn-ghost">
                            <FaUserFriends className="w-5 h-5" />
                            <span className="hidden md:inline ml-1">Friends</span>
                            {friendRequests.length > 0 && (
                                <div className="indicator-item badge badge-secondary badge-sm">{friendRequests.length}</div>
                            )}
                        </label>
                        <div tabIndex={0} className="dropdown-content z-[1] menu p-4 shadow bg-base-100 rounded-box w-80 md:w-96">
                            {/* Add Friend Form */}
                            <form onSubmit={handleSendRequest} className="flex flex-col gap-2 p-2">
                                <h3 className="font-bold text-lg">Add Friend</h3>
                                <div className="flex gap-2">
                                    <input
                                        type="email"
                                        placeholder="Enter user's email"
                                        className="input input-bordered w-full"
                                        value={addFriendEmail}
                                        onChange={(e) => setAddFriendEmail(e.target.value)}
                                    />
                                    <button type="submit" className="btn btn-primary btn-square"><UserPlus /></button>
                                </div>
                            </form>

                            <div className="divider px-2">Pending Requests</div>

                            {/* Requests List */}
                            <div className="max-h-60 overflow-y-auto">
                                {friendRequests.length === 0 ? (
                                    <p className="text-center p-4 text-base-content/60">No pending requests</p>
                                ) : (
                                    friendRequests.map(req => (
                                        <div key={req._id} className="flex items-center justify-between p-2 rounded-lg hover:bg-base-200">
                                            <div className="flex items-center gap-3">
                                                <img src={req.picture} alt={req.name} className="w-10 h-10 rounded-full" />
                                                <span>{req.name}</span>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => handleAcceptRequest(req._id)} className="btn btn-success btn-sm btn-square"><UserCheck className="w-4 h-4" /></button>
                                                <button onClick={() => handleRejectRequest(req._id)} className="btn btn-error btn-sm btn-square"><UserX className="w-4 h-4" /></button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </li>
                    {/* --- END OF NEW DROPDOWN --- */}

                    <li>
                        <a className='flex items-center gap-2 btn rounded-xl btn-ghost' onClick={() => navigate('/current_user_profile')}>
                            <CgProfile />
                            <span>profile</span>
                        </a>
                    </li>
                    <li>
                        <a className='flex items-center gap-2 btn rounded-xl btn-ghost' onClick={() => navigate('/settings')}>
                            <MdOutlineSettingsSuggest />
                            <span>Settings</span>
                        </a>
                    </li>
                    <li>
                        <a className='flex items-center gap-2 btn rounded-xl btn-ghost' onClick={handleLogout}>
                            <MdLogout />
                            <span>Logout</span>
                        </a>
                    </li>
                </ul>
            </nav>
            <div className='divider m-0'></div>
        </>
    );
}