import { API_BASE_URL } from '../config';
import SidebarSkeleton from './skeletons/SidebarSkeleton.jsx';
import toast from 'react-hot-toast';
import { Users } from "lucide-react";
import { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext.jsx';

export default function Contacts({ onSelectUser }) {
    const [users, setUsers] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [onlineUsers, setOnlineUsers] = useState({});

    const socket = useSocket();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res1 = await fetch(`${API_BASE_URL}/auth/check-auth`, { credentials: 'include' });
                const data1 = await res1.json();
                if (data1.isAuthenticated) {
                    setCurrentUser(data1.user);
                }
            } catch {
                toast.error('Failed to fetch current user');
            }

            try {
                const res2 = await fetch(`${API_BASE_URL}/auth/users`, { credentials: 'include' });
                if (!res2.ok) throw new Error('Network response was not ok');
                const data2 = await res2.json();
                setUsers(data2);
            } catch {
                toast.error('Failed to fetch users');
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, []);

    useEffect(() => {
        if (!socket) return;

        const handleAccountDeletion = ({ deletedUserId }) => {
            setUsers(prevUsers => prevUsers.filter(user => user._id !== deletedUserId));
            toast(`A user has left the chat.`, { icon: '👋' });
        };

        socket.on('accountDeleted', handleAccountDeletion);

        return () => {
            socket.off('accountDeleted', handleAccountDeletion);
        };
    }, [socket]);

    // This useEffect will be responsible for listening to online status updates from the server.
    useEffect(() => {
        if (!socket) return;
        
        // Listen for the 'onlineUsers' event from the server
        socket.on('onlineUsers', (usersArray) => {
            // The server sends an array of online user IDs. We convert it to
            // an object for fast lookups (O(1) vs O(n)).
            const usersObj = usersArray.reduce((acc, userId) => {
                acc[userId] = true;
                return acc;
            }, {});
            setOnlineUsers(usersObj);
        });

        // The cleanup function is important to prevent memory leaks
        return () => {
            socket.off('onlineUsers');
        };
    }, [socket]); // Dependency on socket ensures this runs when the socket connects

    // the below fun runs and return the array of users without the current user based on the condition that the current user should be true and the user id should not match the current user id
    const filteredUsers = users.filter(user => currentUser && user._id !== currentUser._id);

    // Main container now uses flex and h-full to adapt

    if (isLoading) {
        return (
            <SidebarSkeleton />
        );
    }

    return (
        <div className='h-full flex flex-col shadow-lg overflow-hidden p-2'>
            <h1 className='pl-4 py-4 text-xl flex items-center gap-2 flex-shrink-0'>
                <Users className="w-6 h-6" />Contacts
            </h1>

            {filteredUsers.length === 0 ? (
                <div className='flex items-center justify-center h-full'>
                    <p className='text-lg'>No contacts available</p>
                </div>
            ) : (
                // This inner div will grow and become scrollable if content overflows
                <div className='flex flex-col p-2 rounded-lg h-full overflow-y-auto'>
                    {filteredUsers.map(user => {
                        // --- NEW CHECK FOR ONLINE STATUS ---
                        const isOnline = onlineUsers[user._id];

                        return (
                            <div
                                key={user._id}
                                onClick={() => onSelectUser(user)}
                                className='flex flex-row items-center gap-4 py-3 px-4 m-1 rounded-lg hover:bg-base-300 cursor-pointer transition-colors duration-200'
                            >
                                {/* --- NEW VISUAL INDICATOR --- */}
                                {/* We wrap the image in a container to position the online dot. */}
                                <div className="relative">
                                    <img className='h-12 w-12 object-cover rounded-full' src={user.picture} alt={user.name} />
                                    {isOnline && (
                                        // This is the green dot. We position it at the bottom-right.
                                        <span className="absolute bottom-0 right-0 block h-3 w-3 rounded-full bg-green-500 ring-2 ring-base-200"></span>
                                    )}
                                </div>
                                
                                <p className='text-lg'>{user.name}</p>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}