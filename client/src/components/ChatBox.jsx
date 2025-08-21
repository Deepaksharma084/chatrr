import { useState, useEffect, useRef } from "react";
import { API_BASE_URL } from "../config";
import { IoMdSend } from "react-icons/io";
import { BsCheckAll } from "react-icons/bs";
import toast from "react-hot-toast";
import { useSocket } from "../context/SocketContext";
import { IoArrowBack } from "react-icons/io5";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import useTypingListener from "../hooks/useTypingListener";
import { formatMessageTimestamp } from "../utils/messagingUtilities";

export default function ChatBox({ selectedUser, currentUser, onBack }) {
    const [messages, setMessages] = useState([]);
    const [messageText, setMessageText] = useState("");
    const socket = useSocket();
    const messagesEndRef = useRef(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isTyping, setIsTyping] = useState(false);
    const typingTimeoutRef = useRef(null);

    // This custom hook for the typing indicator is self-contained and safe.
    useTypingListener(socket, currentUser, selectedUser, setIsTyping);

    const scrollToBottom = () => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); };

    // --- FIX #1: THE JITTER BUG ---
    // The scroll should ONLY be triggered by a change in the messages array.
    useEffect(scrollToBottom, [messages ,isTyping]);

    // --- EFFECT FOR FETCHING & MARKING MESSAGES (NO SOCKETS HERE) ---
    useEffect(() => {
        // Don't run if we don't have the necessary info
        if (!selectedUser || !currentUser || !socket) {
            setMessages([]);
            return;
        }

        const fetchAndMarkMessages = async () => {
            setIsLoading(true);
            try {
                // Step 1: Fetch the conversation history
                const res = await fetch(`${API_BASE_URL}/msg/get/${selectedUser._id}`, { credentials: 'include' });
                if (!res.ok) throw new Error('Failed to fetch messages');
                const fetchedMessages = await res.json();
                setMessages(fetchedMessages);

                // Step 2: Check if there are any unread messages from this contact
                const unreadMessagesExist = fetchedMessages.some(msg => msg.senderId === selectedUser._id && !msg.isRead);

                // Step 3: If so, mark them as read in the DB and notify the contact
                if (unreadMessagesExist) {
                    await fetch(`${API_BASE_URL}/msg/mark-read/${selectedUser._id}`, { method: 'POST', credentials: 'include' });
                    socket.emit('mark-as-read', { currentUserId: currentUser._id, contactId: selectedUser._id });
                }
            } catch (err) {
                toast.error(err.message || 'Failed to load messages');
            } finally {
                setIsLoading(false);
            }
        };

        fetchAndMarkMessages();
    }, [selectedUser, currentUser, socket]); // This re-runs when you switch chats

    // --- FIX #2 & #3: UNIFIED EFFECT FOR ALL REAL-TIME SOCKET EVENTS ---
    useEffect(() => {
        // Don't set up listeners if socket or user isn't ready
        if (!socket || !currentUser) return;

        // This line is essential for receiving any messages directed to this user
        socket.emit('join', currentUser._id);

        const handleReceiveMessage = (message) => {
            // Check if the incoming message belongs to the currently open chat
            if (message.senderId === selectedUser?._id) {
                setMessages(prevMessages => [...prevMessages, message]);
            }
        };

        const handleMessagesRead = ({ readerId }) => {
            // Check if the read confirmation is from the currently open chat
            if (readerId === selectedUser?._id) {
                setMessages(prevMessages =>
                    prevMessages.map(msg =>
                        // Only update messages that YOU sent
                        msg.senderId === currentUser._id ? { ...msg, isRead: true } : msg
                    )
                );
            }
        };

        // Attach listeners
        socket.on('receiveMessage', handleReceiveMessage);
        socket.on('messages-read', handleMessagesRead);

        // This cleanup function is CRITICAL to prevent race conditions.
        // It runs whenever a dependency changes (e.g., when `selectedUser` changes).
        // It removes the old listeners for the previous chat before creating new ones for the new chat.
        return () => {
            socket.off('receiveMessage', handleReceiveMessage);
            socket.off('messages-read', handleMessagesRead);
        };
    }, [socket, currentUser, selectedUser]); // Correct dependency array


    // --- Other handlers (These are fine as they are) ---
    const handleInputChange = (e) => {
        setMessageText(e.target.value);
        if (!typingTimeoutRef.current) {
            socket.emit('typing', { senderId: currentUser._id, receiverId: selectedUser._id });
            typingTimeoutRef.current = setTimeout(() => { typingTimeoutRef.current = null; }, 2000);
        }
    };
    const handleSendMsg = async (e) => {
        e.preventDefault();
        if (!messageText.trim()) return;
        const messageData = { senderId: currentUser._id, receiverId: selectedUser._id, text: messageText.trim() };
        // Optimistically update UI
        setMessages(prev => [...prev, { ...messageData, _id: Date.now().toString(), timestamp: new Date().toISOString() }]);
        setMessageText("");
        try {
            const res = await fetch(`${API_BASE_URL}/msg/create`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(messageData) });
            const savedMessage = await res.json();
            if (!res.ok) throw new Error('Failed to send');
            // Replace optimistic message with actual saved message from server
            setMessages(prev => prev.map(msg => msg._id === messageData._id ? savedMessage : msg));
            socket.emit('sendMessage', savedMessage);
        } catch (err) { toast.error('Error sending message'); /* Add logic to show message failed */ }
    };

    if (!selectedUser) {
        return <div className="flex flex-col gap-4 items-center justify-center h-full">
            <p className="text-gray-500 text-2xl">
            Welcome to chatrr
            </p>
            <p className="text-gray-500 text-lg">Have a conversation</p>
        </div>;
    }
    if (isLoading) { return <MessageSkeleton />; }
    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex-shrink-0 w-full p-3.5 flex items-center gap-4 shadow-md">
                <button onClick={onBack} className="text-2xl p-2 rounded-full hover:bg-base-200 md:hidden">
                    <IoArrowBack />
                </button>
                <img className="h-14 w-14 rounded-full object-cover" src={selectedUser.picture} alt={selectedUser.name} />
                <h1 className='text-2xl font-bold'>{selectedUser.name}</h1>
            </div>

            {/* Message List */}
            <div className="flex-grow w-full overflow-y-auto p-4">
                {/* --- MAPPING MESSAGES --- */}
                <div className="space-y-2">
                    {messages.length > 0 ? (
                        messages.map((msg) => (
                            <div
                                key={msg._id}
                                className={`flex flex-col ${msg.senderId === currentUser._id ? 'items-end' : 'items-start'}`}
                            >
                                {/* Message bubble */}
                                <div className={`max-w-md lg:max-w-xl p-3 rounded-2xl ${msg.senderId === currentUser._id ? 'bg-primary text-primary-content rounded-br-sm' : 'bg-base-300 rounded-bl-sm'}`}>
                                    <p>{msg.text}</p>
                                </div>
                                <div className="text-xs text-base-400 opacity-50 mt-1 px-1 flex items-center gap-1">
                                    <span>{formatMessageTimestamp(msg.timestamp)}</span>
                                    {/* *** THIS IS THE NEW PART *** */}
                                    {msg.senderId === currentUser._id && (
                                        msg.isRead ?
                                            <BsCheckAll className="text-green-500 w-4 h-4" /> // Read Icon
                                            : <BsCheckAll className="w-4 h-4" /> // Sent Icon
                                    )}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full">
                            <p className=''>No messages yet. Start the conversation!</p>
                        </div>
                    )}
                </div>

                {/* Typing Indicator */}
                {isTyping && (
                    <div className="flex flex-col items-start">
                        <div className="max-w-md lg:max-w-xl p-3 rounded-2xl bg-base-300 rounded-bl-sm">
                            <p className="text-sm italic">typing...</p>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Message Input Form */}
            <div className="flex-shrink-0 w-full p-4 bg-base-200 ">
                <form onSubmit={handleSendMsg} className="flex gap-2">
                    <input type="text" value={messageText} onChange={handleInputChange} placeholder="Type a message..." className="flex-1 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <button type="submit" className='btn btn-primary text-2xl px-4 py-2 rounded-lg hover:bg-base-200 disabled:opacity-99 disabled:cursor-not-allowed' disabled={!messageText.trim()}>
                        <IoMdSend />
                    </button>
                </form>
            </div>
        </div>
    );
}