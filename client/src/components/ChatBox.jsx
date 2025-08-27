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

    // This effect ONLY handles fetching the initial message history when you select a new chat.
    useEffect(() => {
        if (!selectedUser || !currentUser) {
            setMessages([]);
            return;
        }
        const fetchInitialMessages = async () => {
            setIsLoading(true);
            try {
                const res = await fetch(`${API_BASE_URL}/msg/get/${selectedUser._id}`, { credentials: 'include' });
                if (!res.ok) throw new Error('Failed to fetch messages');
                setMessages(await res.json());
            } catch (err) {
                toast.error(err.message || 'Failed to load messages');
            } finally {
                setIsLoading(false);
            }
        };
        fetchInitialMessages();
    }, [selectedUser, currentUser]);

    // This is the unified effect that handles ALL real-time socket events.
    useEffect(() => {
        if (!socket || !currentUser) return;
        
        socket.emit('join', currentUser._id);

        // Handler for receiving a new message
        const handleReceiveMessage = (message) => {
            if (message.senderId === selectedUser?._id) {
                setMessages(prev => [...prev, message]);
                socket.emit('mark-as-read', { currentUserId: currentUser._id, contactId: message.senderId });
                fetch(`${API_BASE_URL}/msg/mark-read/${message.senderId}`, { method: 'POST', credentials: 'include' });
            }
        };
        
        // Handler for seeing that the other user read sender messages
        const handleMessagesRead = ({ readerId }) => {
            if (readerId === selectedUser?._id) {
                setMessages(prev => prev.map(msg => msg.senderId === currentUser._id ? { ...msg, isRead: true } : msg));
            }
        };

        // Handler for seeing that the other user deleted a message
        const handleMessageDeleted = ({ messageId }) => {
            setMessages(prev => prev.map(msg => msg._id === messageId ? { ...msg, text: "This message was deleted", isDeleted: true } : msg));
        };

        // Attach all event listeners
        socket.on('receiveMessage', handleReceiveMessage);
        socket.on('messages-read', handleMessagesRead);
        socket.on('messageDeleted', handleMessageDeleted);

        // Cleanup function removes listeners for the previous chat, preventing bugs
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

    const handleSendMsg = async (e) => {
        e.preventDefault();
        if (!messageText.trim()) return;

        const tempId = `temp_${Date.now()}`;
        const messageData = { 
            _id: tempId,
            senderId: currentUser._id, 
            receiverId: selectedUser._id, 
            text: messageText.trim(), 
            isRead: false, 
            isDeleted: false,
            timestamp: new Date().toISOString() 
        };
        
        // Optimistically update senders UI so the message appears instantly
        setMessages(prev => [...prev, messageData]);
        setMessageText("");
        
        try {
            const res = await fetch(`${API_BASE_URL}/msg/create`, { 
                method: 'POST', 
                credentials: 'include', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ senderId: messageData.senderId, receiverId: messageData.receiverId, text: messageData.text }) 
            });
            const savedMessage = await res.json();
            if (!res.ok) throw new Error('Failed to send message');

            setMessages(prev => prev.map(msg => msg._id === tempId ? savedMessage : msg));
            socket.emit('sendMessage', savedMessage);

        } catch (err) { 
            toast.error('Could not send message.');
            // If sending failed, remove the optimistic message from the UI
            setMessages(prev => prev.filter(msg => msg._id !== tempId));
        }
    };

    const handleDeleteMessage = async (messageId) => {
        if (!confirm('Are you sure you want to delete this message?')) return;

        const originalMessages = [...messages]; // Backup state in case of an error

        // Optimistically update senders UI to show the message as deleted instantly
        setMessages(prev => prev.map(msg => 
            msg._id === messageId ? { ...msg, text: "This message was deleted", isDeleted: true } : msg
        ));

        // Notify the other user in real-time
        socket.emit('deleteMessage', {
            messageId: messageId,
            receiverId: selectedUser._id
        });

        // Make the permanent change in the database
        try {
            const res = await fetch(`${API_BASE_URL}/msg/delete/${messageId}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            if (!res.ok) throw new Error('Server failed to delete message');
            toast.success("Message deleted");
        } catch (err) {
            toast.error('Could not delete message.');
            // If the permanent delete fails, revert your UI to the original state
            setMessages(originalMessages);
        }
    };

    if (!selectedUser) {
        return (
            <div className="flex flex-col gap-4 items-center justify-center h-full text-center p-4">
                <h1 className="text-3xl font-bold">Welcome to Chatrr</h1>
                <p className="text-lg text-base-content/70">Select a contact to start a conversation</p>
            </div>
        );
    }
    
    if (isLoading) { return <MessageSkeleton />; }
    
    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex-shrink-0 w-full p-3.5 flex items-center gap-4 shadow-md bg-base-100">
                <button onClick={onBack} className="text-2xl p-2 rounded-full hover:bg-base-200 md:hidden">
                    <IoArrowBack />
                </button>
                <img className="h-14 w-14 rounded-full object-cover" src={selectedUser.picture} alt={selectedUser.name} />
                <h1 className='text-2xl font-bold'>{selectedUser.name}</h1>
            </div>

            {/* Message List */}
            <div className="flex-grow w-full overflow-y-auto p-4">
                <div className="space-y-2">
                    {messages.map((msg) => (
                        <div key={msg._id} className={`flex flex-col ${msg.senderId === currentUser._id ? 'items-end' : 'items-start'}`}>
                            <div className="flex flex-row items-center gap-2 group">
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
                                {msg.senderId === currentUser._id && !msg.isDeleted && (
                                    msg.isRead ?
                                    <BsCheckAll className="text-green-500 w-4 h-4" /> :
                                    <BsCheckAll className="w-4 h-4" />
                                )}
                            </div>
                        </div>
                    ))}
                </div>
                {isTyping && (
                    <div className="flex flex-col items-start mt-2">
                        <div className="max-w-md lg:max-w-xl p-3 rounded-2xl bg-base-300 rounded-bl-sm">
                            <p className="text-sm italic">typing...</p>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Message Input Form */}
            <div className="flex-shrink-0 w-full p-4 bg-base-200">
                <form onSubmit={handleSendMsg} className="flex gap-2">
                    <input type="text" value={messageText} onChange={handleInputChange} placeholder="Type a message..." className="flex-1 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <button type="submit" className='btn btn-primary text-2xl px-4 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed' disabled={!messageText.trim()}>
                        <IoMdSend />
                    </button>
                </form>
            </div>
        </div>
    );
}