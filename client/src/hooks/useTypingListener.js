import { useEffect, useRef } from 'react';

const useTypingListener = (socket, currentUser, selectedUser, setIsTyping) => {
    // Usimg a ref to hold the timer ID. A ref persists across renders
    // without causing the component to re-render itself.
    const typingTimerRef = useRef(null);

    useEffect(() => {
        if (!socket || !currentUser?._id || !selectedUser?._id) return;

        const handleTyping = (data) => {
            if (data.senderId === selectedUser._id && data.receiverId === currentUser._id) {
                // When a typing event arrives, set the indicator to true
                setIsTyping(true);
                if (typingTimerRef.current) {
                    clearTimeout(typingTimerRef.current);
                }
                typingTimerRef.current = setTimeout(() => {
                    setIsTyping(false);
                }, 1000);
            }
        };

        socket.on('typing', handleTyping);

        // Cleanup function: remove the listener and clear any lingering timer
        // when the component unmounts or dependencies change.
        return () => {
            socket.off('typing', handleTyping);
            if (typingTimerRef.current) {
                clearTimeout(typingTimerRef.current);
            }
        };

    }, [socket, currentUser, selectedUser, setIsTyping]);
};

export default useTypingListener;