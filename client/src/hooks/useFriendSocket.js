import { useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import toast from 'react-hot-toast';

const useFriendSocket = () => {
    const socket = useSocket();

    useEffect(() => {
        if (!socket) return;

        // Listener for receiving a NEW friend request.
        const handleNewFriendRequest = (senderInfo) => {
            toast.success(`${senderInfo.name} sent you a friend request!`);
            
            // Dispatch a custom event to tell any listening component (like NavBar)
            // that the friend requests have changed and should be refetched.
            window.dispatchEvent(new Event('friendRequestsChanged'));
        };

        // Listener for when someone ACCEPTS your friend request.
        const handleRequestAccepted = (accepterInfo) => {
            toast.success(`${accepterInfo.name} accepted your friend request!`);
            
            // Also dispatch an event here so our friends list can update.
            window.dispatchEvent(new Event('friendsChanged'));
        };


        // Attach the listeners
        socket.on('newFriendRequest', handleNewFriendRequest);
        socket.on('requestAccepted', handleRequestAccepted);

        // Cleanup function
        return () => {
            socket.off('newFriendRequest', handleNewFriendRequest);
            socket.off('requestAccepted', handleRequestAccepted);
        };
    }, [socket]);
};

export default useFriendSocket;