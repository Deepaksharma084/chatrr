import { useState, useEffect, useRef } from "react";
import { API_BASE_URL } from "../config";
import { IoMdSend } from "react-icons/io";
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

    useEffect(scrollToBottom, [messages, isTyping]);

    useEffect(() => {
        if (!socket || !currentUser?._id) return;
        socket.emit('join', currentUser._id);
        const handleReceiveMessage = (message) => {
            // Only update state if the message is part of the current conversation
            if (message.senderId === selectedUser?._id || message.senderId === currentUser?._id) {
                setMessages(prev => [...prev, message]);
            }
        };
        socket.on('receiveMessage', handleReceiveMessage);
        return () => socket.off('receiveMessage', handleReceiveMessage);
    }, [socket, currentUser, selectedUser]);

    useEffect(() => {
        if (!selectedUser || !currentUser) { setMessages([]); return; }
        const fetchMessages = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/msg/get/${selectedUser._id}`, { credentials: 'include' });
                if (!res.ok) throw new Error('Failed to fetch messages');
                setMessages(await res.json());
            } catch (err) {
                toast.error('Failed to load messages');
            } finally {
                setIsLoading(false);
            }
        };
        fetchMessages();
    }, [selectedUser, currentUser]);

    const handleInputChange = (e) => {
        setMessageText(e.target.value);

        // --- Throttling Logic ---
        // If there is no active timeout...
        if (!typingTimeoutRef.current) {
            // ...send the typing event immediately.
            socket.emit('typing', {
                senderId: currentUser._id,
                receiverId: selectedUser._id
            });

            // Then, set a timeout. We won't be able to send another 
            // 'typing' event until this timeout clears.
            typingTimeoutRef.current = setTimeout(() => {
                typingTimeoutRef.current = null;
            }, 1000);
        }
    };
    const handleSendMsg = async (e) => {
        e.preventDefault();
        if (!messageText.trim() || !selectedUser || !currentUser) return;
        try {
            const messageData = { senderId: currentUser._id, receiverId: selectedUser._id, text: messageText.trim() };
            const res = await fetch(`${API_BASE_URL}/msg/create`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(messageData) });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to send message');
            setMessages(prev => [...prev, data]);
            socket.emit('sendMessage', data);
            setMessageText("");
        } catch (err) { toast.error(err.message || 'Error sending message'); }
    };

    if (!selectedUser) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center p-4">
                <h1 className='text-3xl font-bold'>Welcome to Chatrr</h1>
                <p className='text-lg'>Select a contact to start messaging</p>
            </div>
        );
    }

    if (isLoading) {
        return <MessageSkeleton />;
    }

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
                                {/* Formatted and styled timestamp */}
                                <p className="text-xs text-base-400 opacity-50 mt-1 px-1">
                                    {formatMessageTimestamp(msg.timestamp)}
                                </p>
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