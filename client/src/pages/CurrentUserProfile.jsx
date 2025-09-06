import React from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { API_BASE_URL } from '../config';
import { LazyLoadImage } from 'react-lazy-load-image-component';
import 'react-lazy-load-image-component/src/effects/blur.css';
import { MdSettings, MdLogout, MdDeleteForever } from 'react-icons/md';
import { FaUserClock } from "react-icons/fa";
import toast from 'react-hot-toast';
import ProfileSkeleton from '../components/skeletons/ProfileSkeleton';

// The ProfilePage will receive the currently logged-in user as a prop form protected route
const ProfilePage = ({ currentUser }) => {
    const navigate = useNavigate();

    const handleLogout = () => {
        window.location.href = `${API_BASE_URL}/auth/logout`;
    };

    const handleDeleteAccount = async () => {
        if (confirm('Are you absolutely sure you want to delete your account? This action cannot be undone.')) {
            const toastId = toast.loading("Deleting account...");
            try {
                const res = await fetch(`${API_BASE_URL}/auth/delete`, {
                    method: 'POST',
                    credentials: 'include'
                });

                if (res.ok) {
                    toast.success("Account deleted successfully.", { id: toastId });
                    handleLogout();
                } else {
                    toast.error("Failed to delete account. Please try again.", { id: toastId });
                }
            } catch (error) {
                toast.error("An error occurred. Could not contact the server.", { id: toastId });
            }
        }
    };

    if (!currentUser) {
        return <ProfileSkeleton />;
    }

    return (
        <div className="h-full flex items-center justify-center p-4 bg-base-200">
            {/* DaisyUI Card Component */}
            <div className="card rounded-2xl w-full max-w-md bg-base-100 shadow-xl">
                <figure className="px-10 pt-10">
                    <LazyLoadImage
                        src={`${currentUser.picture}=s128`}
                        alt={`${currentUser.name}'s profile picture`}
                        className="w-32 h-32 rounded-full ring ring-primary ring-offset-base-100 ring-offset-4"
                    />
                </figure>
                <div className="card-body items-center text-center">
                    <h2 className="card-title text-3xl">{currentUser.name}</h2>
                    <p className="text-base-content/70">{currentUser.email}</p>
                    <div className="flex items-center gap-2 mt-4 text-sm text-base-content/60">
                        <FaUserClock />
                        <span>
                            Member since {format(new Date(currentUser.createdAt), 'MMMM d, yyyy')}
                        </span>
                    </div>

                    {/* Divider */}
                    <div className="divider my-4">Actions</div>

                    {/* Action Buttons */}
                    <div className="card-actions w-full flex flex-col gap-2">
                        <button onClick={() => navigate('/settings')} className="btn btn-outline btn-secondary w-full">
                            <MdSettings />
                            Theme Settings
                        </button>
                        <button onClick={handleLogout} className="btn btn-outline w-full">
                            <MdLogout />
                            Logout
                        </button>
                        <button onClick={handleDeleteAccount} className="btn btn-error btn-outline w-full mt-2">
                            <MdDeleteForever />
                            Delete Account
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;