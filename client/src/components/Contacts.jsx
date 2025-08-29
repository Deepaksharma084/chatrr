// client/src/pages/Contacts.jsx

import { API_BASE_URL } from '../config';
import SidebarSkeleton from './skeletons/SidebarSkeleton.jsx';
import toast from 'react-hot-toast';
import { Users } from "lucide-react";
import { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext.jsx';

export default function Contacts({ onSelectUser, selectedUser }) {
    // STATE MANAGEMENT: Now tracks 'friends' instead of all 'users'
    const [friends, setFriends] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [onlineUsers, setOnlineUsers] = useState({});
    const socket = useSocket();

    // --- EFFECT #1: FETCH FRIENDS & HANDLE GLOBAL UPDATES ---
    // This effect handles fetching the initial friends list and also
    // listens for a global event to refetch when the list changes.
    useEffect(() => {
        // Function to fetch the user's friend list from the new API endpoint
        const fetchFriends = async () => {
            setIsLoading(true);
            try {
                const res = await fetch(`${API_BASE_URL}/friends/list`, { credentials: 'include' });
                if (!res.ok) throw new Error('Could not fetch friends list');

                const friendsData = await res.json();
                setFriends(friendsData);
            } catch (err) {
                toast.error(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchFriends(); // Fetch the friends list when the component mounts

        // This is the global listener. When the NavBar accepts a new friend,
        // it dispatches 'friendsChanged', and this listener will trigger a refetch.
        window.addEventListener('friendsChanged', fetchFriends);

        // Cleanup: remove the event listener when the component unmounts
        return () => {
            window.removeEventListener('friendsChanged', fetchFriends);
        };
    }, []); // This effect should only run once on mount


    // --- EFFECT #2: REAL-TIME SOCKET LISTENERS ---
    // This effect is for events that specifically affect the display of contacts,
    // like online status and account deletions.
    useEffect(() => {
        if (!socket) return;

        // Listener for online user updates
        const handleOnlineUsers = (usersArray) => {
            const usersObj = usersArray.reduce((acc, userId) => {
                acc[userId] = true;
                return acc;
            }, {});
            setOnlineUsers(usersObj);
        };

        // Listener for when any user deletes their account
        const handleAccountDeletion = ({ deletedUserId }) => {
            // Remove the deleted user from the friends list
            setFriends(prevFriends => prevFriends.filter(friend => friend._id !== deletedUserId));
            toast(`A user has left Chatrr.`, { icon: '👋' });
        };

        // Listener for when a new friend is added (to update the list in real-time)
        const handleFriendListUpdated = (newFriend) => {
            // Instantly add the new friend to the UI without a full refresh.
            setFriends(prevFriends => {
                // Prevent duplicates in case of race conditions
                if (prevFriends.some(friend => friend._id === newFriend._id)) {
                    return prevFriends;
                }
                return [...prevFriends, newFriend];
            });
            toast.success(`You are now friends with ${newFriend.name}!`);
        };

        // Attach listeners
        socket.on('onlineUsers', handleOnlineUsers);
        socket.on('accountDeleted', handleAccountDeletion);
        socket.on('friendListUpdated', handleFriendListUpdated);

        // Cleanup function
        return () => {
            socket.off('onlineUsers', handleOnlineUsers);
            socket.off('accountDeleted', handleAccountDeletion);
            socket.off('friendListUpdated', handleFriendListUpdated);
        };
    }, [socket]);


    // --- JSX RENDERING ---
    if (isLoading) {
        return <SidebarSkeleton />;
    }

    return (
        <div className='h-full flex flex-col shadow-lg overflow-hidden bg-base-200 p-2'>
            {/* Header for the contacts list */}
            <h1 className='pl-4 py-4 text-xl flex items-center gap-2 flex-shrink-0'>
                <Users className="w-6 h-6" />Friends
            </h1>

            {/* Conditional rendering based on whether the user has friends */}
            {friends.length === 0 ? (
                <div className='flex items-center justify-center text-center h-full p-4'>
                    <p className='text-lg text-base-content/60'>
                        You have no friends yet. <br />
                        Add friends from the Friends menu in the navbar.
                    </p>
                </div>
            ) : (
                <div className='flex flex-col p-2 rounded-lg h-full overflow-y-auto'>
                    {friends.map(friend => {
                        const isOnline = onlineUsers[friend._id];
                        // This checks if the current friend is the one selected in the chat window
                        const isSelected = selectedUser?._id === friend._id;

                        return (
                            <div
                                key={friend._id}
                                onClick={() => onSelectUser(friend)}
                                // Conditionally apply a different background color if this contact is selected
                                className={`flex flex-row items-center gap-4 py-3 px-4 m-1 rounded-lg cursor-pointer transition-colors duration-200 ${isSelected ? 'bg-primary/20' : 'hover:bg-base-300'
                                    }`}
                            >
                                <div className="relative">
                                    <img className='h-12 w-12 object-cover rounded-full' src={friend.picture} alt={friend.name} />
                                    {isOnline && (
                                        <span className="absolute bottom-0 right-0 block h-3 w-3 rounded-full bg-green-500 ring-2 ring-base-100"></span>
                                    )}
                                </div>

                                <p className='text-lg font-medium'>{friend.name}</p>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}