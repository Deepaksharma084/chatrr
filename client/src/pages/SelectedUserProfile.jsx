import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { API_BASE_URL } from '../config';
import { FaUserClock } from "react-icons/fa";
import toast from 'react-hot-toast';

const ProfilePage = () => {
  const { id } = useParams();
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/auth/selectedUserProfile/${id}`, {
          method: 'GET',
          credentials: 'include',
        });

        if (!res.ok) {
          toast.error("Unable to load profile.", err);
          return;
        }
        const data = await res.json();
        setSelectedUser(data);
      } catch {
        toast.error("Server error.", err);
      }
    };

    fetchProfile();
  }, [id]);

  if (!selectedUser) return <p className="text-center">Loading...</p>;

  return (
    <div className="h-full flex items-center justify-center p-4 bg-base-200">
      <div className="card rounded-2xl w-full max-w-md bg-base-100 shadow-xl">
        <figure className="px-10 pt-10">
          <img
            src={selectedUser.picture}
            alt={`${selectedUser.name}'s profile`}
            className="w-32 h-32 rounded-full ring ring-primary ring-offset-base-100 ring-offset-4"
          />
        </figure>
        <div className="card-body items-center text-center">
          <h2 className="card-title text-3xl">{selectedUser.name}</h2>
          <p className="text-base-content/70">{selectedUser.email}</p>
          <div className="flex items-center gap-2 mt-4 text-sm text-base-content/60">
            <FaUserClock />
            <span>
              Member since {format(new Date(selectedUser.createdAt), 'MMMM d, yyyy')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
