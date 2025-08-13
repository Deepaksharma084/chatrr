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
                    {filteredUsers.map(user => (
                        <div
                            key={user._id}
                            onClick={() => onSelectUser(user)}
                            className='flex flex-row items-center gap-4 py-3 px-4 m-1 rounded-lg hover:bg-base-300 cursor-pointer transition-colors duration-200'
                        >
                            <img className='h-12 w-12 object-cover rounded-full' src={user.picture} alt={user.name} />
                            <p className='text-lg'>{user.name}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}