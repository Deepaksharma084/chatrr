import React, { useState, useEffect, useRef } from 'react';
import { fetchWithAuth } from "../utils/fetchWithAuth";
import { useNavigate } from 'react-router-dom';
import { MdLogout } from "react-icons/md";
import { CgProfile } from "react-icons/cg";
import { MdOutlineSettingsSuggest } from "react-icons/md";
import { FaUserFriends } from "react-icons/fa";
import { UserPlus, UserCheck, UserX } from "lucide-react";
import toast from "react-hot-toast";
import { AiOutlineMenu } from "react-icons/ai";

export default function NavBar() {
    const navigate = useNavigate();
    const [friendRequests, setFriendRequests] = useState([]);
    const [addFriendEmail, setAddFriendEmail] = useState("");

    const dropdownRef = useRef(null);

    // Function to fetch the latest friend requests
    const fetchFriendRequests = async () => {

        // Check if the user is logged in before fetching.
        const token = localStorage.getItem('chat-token');
        if (!token) {
            // If no token, do nothing. The user is logged out.
            return;
        }

        try {
            const res = await fetchWithAuth(`/friends/requests`);
            if (res.ok) {
                const data = await res.json();
                setFriendRequests(data);
            } else if (res.status === 401) {
                // If the token is invalid, ProtectedRoute will handle the logout.
                console.error("Navbar: Invalid token, session expired.");
            }
        } catch (error) {
            console.error("Failed to fetch friend requests:", error);
        }
    };

    // This effect runs on component mount AND whenever our custom event is dispatched.
    useEffect(() => {
        fetchFriendRequests();
        // Listen for the custom event dispatched by our socket hook
        window.addEventListener('friendRequestsChanged', fetchFriendRequests);

        // Cleanup
        return () => {
            window.removeEventListener('friendRequestsChanged', fetchFriendRequests);
        };
    }, []);

    const handleSendRequest = async (e) => {
        e.preventDefault();
        if (!addFriendEmail.trim()) return;
        try {
            const res = await fetchWithAuth(`/friends/send-request`, {
                method: 'POST',
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

        //Optimistic UI Update: Instantly remove the request from the list.
        setFriendRequests(prev => prev.filter(req => req._id !== requesterId));

        try {
            const res = await fetchWithAuth(`/friends/accept-request/${requesterId}`, { method: 'POST' });
            if (!res.ok) throw new Error("Failed to accept request");

            toast.success("Friend request accepted!");
            // Dispatch the event to tell the Contacts page to refresh its friend list.
            window.dispatchEvent(new Event('friendsChanged'));
        } catch {
            toast.error("Failed to accept request.");
            //On failure, revert the UI to the original state.
            setFriendRequests(originalRequests);
        }
    };

    const handleRejectRequest = async (requesterId) => {
        const originalRequests = [...friendRequests];

        setFriendRequests(prev => prev.filter(req => req._id !== requesterId));

        try {
            const res = await fetchWithAuth(`/friends/reject-request/${requesterId}`, { method: 'POST' });
            if (!res.ok) throw new Error("Failed to reject request");

            toast.success("Friend request rejected");
        } catch (err) {
            toast.error("Failed to reject request.");
            setFriendRequests(originalRequests);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('chat-token');
        navigate('/');
        toast.success("You have been logged out.");
    };

    return (
        <>
            <nav className="navbar bg-base-200 px-4 md:px-8 py-2 flex justify-between items-center">
                <h1 onClick={() => navigate('/messenger')} className='text-3xl cursor-pointer'>Chatrr</h1>

                {/* Desktop Navigation */}
                <ul className="nav-links hidden md:flex items-center justify-center gap-4 md:gap-6">
                    {/* Friend Request Dropdown */}
                    <li className="dropdown dropdown-end">
                        <label ref={dropdownRef} tabIndex={0} className="btn text-lg rounded-xl btn-ghost">
                            <FaUserFriends className="w-5 h-5" />
                            <span className="ml-1">Connections</span>
                            {friendRequests.length > 0 && (
                                <div className="indicator-item badge badge-secondary badge-sm">{friendRequests.length}</div>
                            )}
                        </label>
                        {/* Existing friend request dropdown content */}
                        <div tabIndex={0} className="dropdown-content z-[1] menu p-4 shadow bg-base-100 rounded-box w-96">
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
                                                <img src={`${req.picture}=s40`} alt={req.name} className="w-10 h-10 rounded-full" />
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

                    <li>
                        <a className='flex text-lg items-center gap-2 btn rounded-xl btn-ghost' onClick={() => navigate('/current_user_profile')}>
                            <CgProfile />
                            <span>Profile</span>
                        </a>
                    </li>
                    <li>
                        <a className='flex text-lg items-center gap-2 btn rounded-xl btn-ghost' onClick={() => navigate('/settings')}>
                            <MdOutlineSettingsSuggest />
                            <span>Settings</span>
                        </a>
                    </li>
                    <li>
                        <a className='flex text-lg items-center gap-2 btn rounded-xl btn-ghost' onClick={handleLogout}>
                            <MdLogout />
                            <span>Logout</span>
                        </a>
                    </li>
                </ul>

                {/* Mobile Navigation */}
                <div className="dropdown dropdown-end md:hidden">
                    <label tabIndex={0} className="btn btn-ghost btn-circle">
                        <AiOutlineMenu className="w-6 h-6" />
                        {friendRequests.length > 0 && (
                            <div className="indicator-item badge badge-secondary badge-sm">{friendRequests.length}</div>
                        )}
                    </label>
                    <ul tabIndex={0} className="text-xl menu dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-72">
                        {/* Mobile Friend Request Section */}
                        <li>
                            <details>
                                <summary className="flex items-center gap-2">
                                    <FaUserFriends className="w-5 h-5" />
                                    <span>Connections</span>
                                    {friendRequests.length > 0 && (
                                        <div className="badge badge-secondary badge-sm">{friendRequests.length}</div>
                                    )}
                                </summary>
                                <ul className="p-2 bg-base-100">
                                    {/* Add Friend Form */}
                                    <li>
                                        <form onSubmit={handleSendRequest} className="w-full">
                                            <div className="flex flex-col gap-2 w-full">
                                                <input
                                                    type="email"
                                                    placeholder="Enter user's email"
                                                    className="input input-bordered w-full"
                                                    value={addFriendEmail}
                                                    onChange={(e) => setAddFriendEmail(e.target.value)}
                                                />
                                                <button type="submit" className="btn btn-primary w-full">
                                                    <UserPlus className="w-4 h-4" /> Add Friend
                                                </button>
                                            </div>
                                        </form>
                                    </li>
                                    <div className="divider">Pending Requests</div>
                                    {friendRequests.map(req => (
                                        <li key={req._id}>
                                            <div className="flex flex-col gap-2 w-full">
                                                <div className="flex items-center gap-2">
                                                    <img src={`${req.picture}=s32`} alt={req.name} className="w-8 h-8 rounded-full" />
                                                    <span>{req.name}</span>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button onClick={() => handleAcceptRequest(req._id)} className="btn btn-success btn-sm flex-1">
                                                        <UserCheck className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => handleRejectRequest(req._id)} className="btn btn-error btn-sm flex-1">
                                                        <UserX className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </details>
                        </li>

                        <li>
                            <a onClick={() => navigate('/current_user_profile')}>
                                <CgProfile />Profile
                            </a>
                        </li>
                        <li>
                            <a onClick={() => navigate('/settings')}>
                                <MdOutlineSettingsSuggest />Settings
                            </a>
                        </li>
                        <li>
                            <a onClick={handleLogout}>
                                <MdLogout />Logout
                            </a>
                        </li>
                    </ul>
                </div>
            </nav>
            <div className='divider m-0'></div>
        </>
    );
}