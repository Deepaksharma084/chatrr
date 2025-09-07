import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { fetchWithAuth } from "../utils/fetchWithAuth";
import { LazyLoadImage } from 'react-lazy-load-image-component';
import 'react-lazy-load-image-component/src/effects/blur.css';
import { FaUserClock } from "react-icons/fa";
import { GiHighKick } from "react-icons/gi";
import toast from 'react-hot-toast';
import ProfileSkeleton from '../components/skeletons/ProfileSkeleton';

const ProfilePage = () => {
  const { id } = useParams();
  const [selectedUser, setSelectedUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetchWithAuth(`/auth/selectedUserProfile/${id}`);

        if (!res.ok) {
          toast.error("Unable to load profile.", err);
          return;
        }
        const data = await res.json();
        setSelectedUser(data);
      } catch {
        toast.error("Server error.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [id]);

  const handleUnFriend = async (id) => {
    if (!confirm("Are you sure you want to unfriend?")) return;

    try {
      const res = await fetchWithAuth(`/friends/unfriend/${id}`, {
        method: "POST",
      });

      if (!res.ok) {
        toast.error("Unable to unfriend.");
        return;
      }
      toast.success("Unfriend successful");
      //---Dispatch the event to tell Contacts.jsx to refetch ---
      window.dispatchEvent(new Event('friendsChanged'));
      navigate("/messenger");
    } catch (err) {
      toast.error("Internal server error.");
    }
  };

  if (isLoading) {
    return <ProfileSkeleton />;
  }

  if (!selectedUser) return <p className="text-center">Loading...</p>;

  return (
    <div className="h-full flex items-center justify-center p-4 bg-base-200">
      <div className="card rounded-2xl w-full max-w-md bg-base-100 shadow-xl">
        <figure className="px-10 pt-10">
          <LazyLoadImage
            src={`${selectedUser.picture}=s128`}
            alt={`${selectedUser.name}'s profile`}
            className="w-32 h-32 rounded-full ring ring-primary ring-offset-base-100 ring-offset-4"
            effect="blur"
          />
        </figure>
        <div className="card-body items-center text-center">
          <h2 className="card-title text-3xl">{selectedUser.name}</h2>
          <p className="text-base-content/70">{selectedUser.email}</p>
          <div className="flex items-center gap-2 mt-4 text-sm">
            <div className='flex flex-col items-center justify-center gap-4'>
              <span className='flex gap-2 items-center justify-center text-base-content/60'>
                <FaUserClock />
                Member since {format(new Date(selectedUser.createdAt), 'MMMM d, yyyy')}
              </span>
              <span onClick={() => { handleUnFriend(selectedUser._id) }} className='flex gap-2 items-center justify-center text-xl p-2 bg-base-300 rounded-xl text-base-content/80 btn'>
                <GiHighKick /> Unfriend
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
