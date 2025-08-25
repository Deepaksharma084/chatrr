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

    useTypingListener(socket, currentUser, selectedUser, setIsTyping);

    const scrollToBottom = () => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); };

    useEffect(scrollToBottom, [messages,isTyping]);

    // This effect ONLY handles fetching the initial message history.
    useEffect(() => {
        if (!selectedUser || !currentUser) {
            setMessages([]);
            return;
        }

        const fetchInitialMessages = async () => {
            setIsLoading(true);
            try {
                const res = await fetch(`${API_BASE_URL}/msg/get/${selectedUser._id}`, { credentials: 'include' });
                if (!res.ok) throw new Error('Failed to fetch');
                const fetchedMessages = await res.json();
                setMessages(fetchedMessages);
            } catch (err) {
                toast.error(err.message || 'Failed to load messages');
            } finally {
                setIsLoading(false);
            }
        };

        fetchInitialMessages();
    }, [selectedUser, currentUser]);

    // This UNIFIED effect handles ALL real-time socket events and logic.
    useEffect(() => {
        if (!socket || !currentUser) return;
        
        // Join the user's personal room on the server
        socket.emit('join', currentUser._id);

        const handleReceiveMessage = (message) => {
            // Check if the incoming message belongs to the currently open chat
            if (message.senderId === selectedUser?._id) {
                setMessages(prevMessages => [...prevMessages, message]);
                
                // --- THIS IS THE CRUCIAL ADDITION ---
                // Because we just received and displayed this message, it is now "read".
                // 1. Immediately notify the sender for a real-time UI update.
                socket.emit('mark-as-read', { 
                    currentUserId: currentUser._id, 
                    contactId: message.senderId // This is the selectedUser
                });
                
                // 2. Also, update the database in the background. We don't need to await this.
                fetch(`${API_BASE_URL}/msg/mark-read/${message.senderId}`, { method: 'POST', credentials: 'include' });
            }
        };
        
        const handleMessagesRead = ({ readerId }) => {
            if (readerId === selectedUser?._id) {
                setMessages(prevMessages => 
                    prevMessages.map(msg => 
                        msg.senderId === currentUser._id ? { ...msg, isRead: true } : msg
                    )
                );
            }
        };

        // Attach listeners
        socket.on('receiveMessage', handleReceiveMessage);
        socket.on('messages-read', handleMessagesRead);

        // Cleanup function removes listeners for the previous chat
        return () => {
            socket.off('receiveMessage', handleReceiveMessage);
            socket.off('messages-read', handleMessagesRead);
        };
    }, [socket, currentUser, selectedUser]);


    // --- Other handlers ---
    const handleInputChange = (e) => {
        setMessageText(e.target.value);
        if (!typingTimeoutRef.current) {
            socket.emit('typing', { senderId: currentUser._id, receiverId: selectedUser._id });
            typingTimeoutRef.current = setTimeout(() => { typingTimeoutRef.current = null; }, 2000);
        }
    };
    
    // Optimistic UI update for sending messages
    const handleSendMsg = async (e) => {
        e.preventDefault();
        if (!messageText.trim()) return;
        const tempId = `temp_${Date.now()}`;
        const messageData = { senderId: currentUser._id, receiverId: selectedUser._id, text: messageText.trim(), isRead: false, timestamp: new Date().toISOString() };
        
        setMessages(prev => [...prev, { ...messageData, _id: tempId }]);
        setMessageText("");
        
        try {
            const res = await fetch(`${API_BASE_URL}/msg/create`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ senderId: messageData.senderId, receiverId: messageData.receiverId, text: messageData.text }) });
            const savedMessage = await res.json();
            if (!res.ok) throw new Error('Failed to send');

            setMessages(prev => prev.map(msg => msg._id === tempId ? savedMessage : msg));
            socket.emit('sendMessage', savedMessage);
        } catch (err) { 
            toast.error('Could not send message.');
            setMessages(prev => prev.filter(msg => msg._id !== tempId)); // Remove failed message
        }
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