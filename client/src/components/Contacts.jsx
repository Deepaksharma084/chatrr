import { API_BASE_URL } from '../config';
import SidebarSkeleton from './skeletons/SidebarSkeleton.jsx';
import styles from './SearchYourFriendInput.module.css';
import toast from 'react-hot-toast';
import { Users } from "lucide-react";
import { useState, useEffect, useRef } from 'react';
import { useSocket } from '../context/SocketContext.jsx';

export default function Contacts({ onSelectUser, selectedUser }) {
    const [friends, setFriends] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [onlineUsers, setOnlineUsers] = useState({});
    const socket = useSocket();
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredFriends, setFilteredFriends] = useState([]);
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const searchContainerRef = useRef(null);
    useEffect(() => {
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

        fetchFriends();
        window.addEventListener('friendsChanged', fetchFriends);
        return () => window.removeEventListener('friendsChanged', fetchFriends);
    }, []);

    // This effect handles real-time updates for online status, deletions, etc.
    useEffect(() => {
        if (!socket) return;

        const handleOnlineUsers = (usersArray) => {
            const usersObj = usersArray.reduce((acc, userId) => {
                acc[userId] = true;
                return acc;
            }, {});
            setOnlineUsers(usersObj);
        };

        // Listener for when any user deletes their account
        const handleAccountDeletion = ({ deletedUserId }) => {
            setFriends(prevFriends => prevFriends.filter(friend => friend._id !== deletedUserId));
            toast(`A user has left Chatrr.`, { icon: '👋' });
        };

        // Listener for when a new friend is added
        const handleFriendListUpdated = (newFriend) => {
            setFriends(prevFriends => {
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

    useEffect(() => {
        if (searchTerm.trim() === '') {
            setFilteredFriends([]);
            return;
        }

        const filtered = friends.filter(friend =>
            friend.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setFilteredFriends(filtered);
    }, [searchTerm, friends]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
                setIsSearchFocused(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleResultClick = (friend) => {
        onSelectUser(friend);
        setSearchTerm('');
        setIsSearchFocused(false);
    };

    if (isLoading) {
        return <SidebarSkeleton />;
    }

    return (
        <div className='h-full flex flex-col shadow-lg overflow-hidden bg-base-200 p-2'>
            <h1 className='pl-4 py-4 text-xl flex items-center gap-2 flex-shrink-0'>
                <Users className="w-6 h-6" />Friends
            </h1>

            <div ref={searchContainerRef} className="relative mx-1">
                    <form className={styles.searchForm} onSubmit={(e) => e.preventDefault()}>
                        <label htmlFor="search" className={styles.searchLabel}>Search friends</label>
                        <input
                            required=""
                            type="search"
                            className={`${styles.searchInput} !bg-base-300 !text-base-content !w-full`}
                            id="search"
                            placeholder="Search friends"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onFocus={() => setIsSearchFocused(true)}
                        />
                        <span className={styles.searchCaret}></span>
                    </form>

                {isSearchFocused && searchTerm && (
                    <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-base-100 rounded-lg shadow-xl overflow-hidden max-h-60 overflow-y-auto">
                        {filteredFriends.length > 0 ? (
                            filteredFriends.map(friend => (
                                <div
                                    key={friend._id}
                                    onClick={() => handleResultClick(friend)}
                                    className="flex items-center gap-4 p-3 cursor-pointer hover:bg-base-300 transition-colors"
                                >
                                    <img className='h-10 w-10 object-cover rounded-full' src={friend.picture} alt={friend.name} />
                                    <p className='text-md font-medium'>{friend.name}</p>
                                </div>
                            ))
                        ) : (
                            <p className="p-3 text-base-content/60 text-center">No friend with this name exists</p>
                        )}
                    </div>
                )}
            </div>

            {/* Conditional rendering: Show full list only when not searching */}
            {searchTerm.trim() === '' ? (
                friends.length === 0 ? (
                    <div className='flex items-center justify-center text-center h-full p-4'>
                        <p className='text-lg text-base-content/60'>
                            You have no friends yet. <br />
                            Add friends from the Friends menu in the navbar.
                        </p>
                    </div>
                ) : (
                    <div className='flex flex-col p-2 rounded-lg h-full overflow-y-auto mt-2'>
                        {friends.map(friend => {
                            const isOnline = onlineUsers[friend._id];
                            const isSelected = selectedUser?._id === friend._id;

                            return (
                                <div
                                    key={friend._id}
                                    onClick={() => onSelectUser(friend)}
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
                )
            ) : (
                <div className='flex-grow pt-4'>
                    <p className='text-center text-base-content/50 italic'>
                        Showing search results...
                    </p>
                </div>
            )}
        </div>
    );
}