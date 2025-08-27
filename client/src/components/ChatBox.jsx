// client/src/pages/ChatBox.jsx

import { useState, useEffect, useRef } from "react";
import { API_BASE_URL } from "../config";
import { IoMdSend } from "react-icons/io";
import { BsCheckAll } from "react-icons/bs";
import toast from "react-hot-toast";
import { useSocket } from "../context/SocketContext";
import { IoArrowBack } from "react-icons/io5";
import { MdDelete } from "react-icons/md";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import useTypingListener from "../hooks/useTypingListener";
import { formatMessageTimestamp } from "../utils/messagingUtilities";

export default function ChatBox({ selectedUser, currentUser, onBack }) {
    // --- STATE AND REFS ---
    const [messages, setMessages] = useState([]);
    const [messageText, setMessageText] = useState("");
    const socket = useSocket();
    const messagesEndRef = useRef(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isTyping, setIsTyping] = useState(false);
    const typingTimeoutRef = useRef(null);

    // --- HOOKS ---
    useTypingListener(socket, currentUser, selectedUser, setIsTyping);

    const scrollToBottom = () => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); };
    
    // FIX #1: REMOVED `isTyping` from dependency array to prevent UI jitter.
    useEffect(scrollToBottom, [messages]);

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
                setMessages(await res.json());
            } catch (err) {
                toast.error(err.message || 'Failed to load messages');
            } finally {
                setIsLoading(false);
            }
        };
        fetchInitialMessages();
    }, [selectedUser, currentUser]);

    // FIX #2: REBUILT the UNIFIED effect with correct syntax and all handlers.
    useEffect(() => {
        if (!socket || !currentUser) return;
        
        socket.emit('join', currentUser._id);

        const handleReceiveMessage = (message) => {
            if (message.senderId === selectedUser?._id) {
                setMessages(prev => [...prev, message]);
                socket.emit('mark-as-read', { currentUserId: currentUser._id, contactId: message.senderId });
                fetch(`${API_BASE_URL}/msg/mark-read/${message.senderId}`, { method: 'POST', credentials: 'include' });
            }
        };
        
        const handleMessagesRead = ({ readerId }) => {
            if (readerId === selectedUser?._id) {
                setMessages(prev => prev.map(msg => msg.senderId === currentUser._id ? { ...msg, isRead: true } : msg));
            }
        };

        const handleMessageDeleted = ({ messageId }) => {
            setMessages(prev => prev.map(msg => msg._id === messageId ? { ...msg, text: "This message was deleted", isDeleted: true } : msg));
        };

        socket.on('receiveMessage', handleReceiveMessage);
        socket.on('messages-read', handleMessagesRead);
        socket.on('messageDeleted', handleMessageDeleted);

        return () => {
            socket.off('receiveMessage', handleReceiveMessage);
            socket.off('messages-read', handleMessagesRead);
            socket.off('messageDeleted', handleMessageDeleted);
        };
    }, [socket, currentUser, selectedUser]);


    // --- HANDLER FUNCTIONS ---

    const handleInputChange = (e) => {
        setMessageText(e.target.value);
        if (!typingTimeoutRef.current) {
            socket.emit('typing', { senderId: currentUser._id, receiverId: selectedUser._id });
            typingTimeoutRef.current = setTimeout(() => { typingTimeoutRef.current = null; }, 2000);
        }
    };

    const handleSendMsg = async (e) => { /* ... Your existing code is correct ... */ };

    // FIX #3: ADDED the full handleDeleteMessage function back into the component.
    const handleDeleteMessage = async (messageId) => {
        if (!confirm('Are you sure you want to delete this message?')) return;
        const originalMessages = [...messages];
        setMessages(prev => prev.map(msg => 
            msg._id === messageId ? { ...msg, text: "This message was deleted", isDeleted: true } : msg
        ));
        socket.emit('deleteMessage', {
            messageId: messageId,
            receiverId: selectedUser._id
        });
        try {
            const res = await fetch(`${API_BASE_URL}/msg/delete/${messageId}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            if (!res.ok) throw new Error('Server failed to delete message');
            toast.success("Message deleted");
        } catch (err) {
            toast.error('Could not delete message.');
            setMessages(originalMessages);
        }
    };

    // --- JSX RENDERING ---
    if (!selectedUser) { return <div className="...">{/* Welcome message */}</div>; }
    if (isLoading) { return <MessageSkeleton />; }
    
    return (
        <div className="flex flex-col h-full">
            <div className="flex-shrink-0 ...">{/* Header */}</div>
            <div className="flex-grow w-full overflow-y-auto p-4">
                <div className="space-y-2">
                    {messages.map((msg) => (
                        <div key={msg._id} className={`flex flex-col ${msg.senderId === currentUser._id ? 'items-end' : 'items-start'}`}>
                            <div className="flex flex-row items-center gap-2 group">
                                
                                {/* FIX #4: Corrected conditional rendering for the delete icon */}
                                {msg.senderId === currentUser._id && !msg.isDeleted && (
                                    <div
                                        className="p-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 order-1"
                                        onClick={() => handleDeleteMessage(msg._id)}
                                    >
                                        <MdDelete className="cursor-pointer text-gray-400 hover:text-red-500 h-5 w-5" />
                                    </div>
                                )}
                                
                                <div className={`max-w-md lg:max-w-xl p-3 rounded-2xl ${
                                    msg.isDeleted ? 'bg-base-200' : (msg.senderId === currentUser._id ? 'bg-primary text-primary-content rounded-br-sm order-2' : 'bg-base-300 rounded-bl-sm')
                                }`}>
                                    <p className={`${msg.isDeleted ? 'italic text-base-content/60' : ''}`}>
                                        {msg.text}
                                    </p>
                                </div>
                            </div>
                            <div className="text-xs text-base-400 opacity-50 mt-1 px-1 flex items-center gap-1">
                                <span>{formatMessageTimestamp(msg.timestamp)}</span>
                                {msg.senderId === currentUser._id && (
                                    msg.isRead ?
                                    <BsCheckAll className="text-green-500 w-4 h-4" /> :
                                    <BsCheckAll className="w-4 h-4" />
                                )}
                            </div>
                        </div>
                    ))}
                </div>
                <div ref={messagesEndRef} />
            </div>
            <div className="flex-shrink-0 ...">{/* Message Input Form */}</div>
        </div>
    );
}