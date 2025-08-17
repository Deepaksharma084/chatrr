import { useEffect, useRef } from 'react';

const useTypingListener = (socket, currentUser, selectedUser, setIsTyping) => {
    // Use a ref to hold the timer ID. A ref persists across renders
    // without causing the component to re-render itself.
    const typingTimerRef = useRef(null);

    useEffect(() => {
        if (!socket || !currentUser?._id || !selectedUser?._id) return;

        const handleTyping = (data) => {
            if (data.senderId === selectedUser._id && data.receiverId === currentUser._id) {
                // When a typing event arrives, set the indicator to true
                setIsTyping(true);

                // --- Stabilization Logic ---
                // Clear any *previous* timeout that was set. This prevents the
                // indicator from turning off prematurely if the user is still typing.
                if (typingTimerRef.current) {
                    clearTimeout(typingTimerRef.current);
                }

                // Set a *new* timeout. If we don't get another 'typing' event
                // within 3 seconds, we'll turn the indicator off.
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