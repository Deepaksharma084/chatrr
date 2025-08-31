// ChatBox.jsx

import { useState, useEffect, useRef } from "react";
import { API_BASE_URL } from "../config";
import { IoMdSend } from "react-icons/io";
import { BsCheckAll } from "react-icons/bs";
import toast from "react-hot-toast";
import { useSocket } from "../context/SocketContext";
import { IoArrowBack } from "react-icons/io5";
import { MdDelete } from "react-icons/md";
import { BsThreeDotsVertical } from "react-icons/bs";
import { FaStar, FaRegStar } from "react-icons/fa";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import useTypingListener from "../hooks/useTypingListener";
import { formatMessageTimestamp } from "../utils/messagingUtilities";
import { useNavigate } from "react-router-dom";

export default function ChatBox({ selectedUser, currentUser, onBack }) {

    const navigate = useNavigate();

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

    // --- No significant changes to initial fetch or socket effects ---
    useEffect(() => {
        if (!selectedUser || !currentUser) {
            setMessages([]);
            return;
        }
        const fetchInitialMessagesAndMarkRead = async () => {
            setIsLoading(true);
            try {
                const res = await fetch(`${API_BASE_URL}/msg/get/${selectedUser._id}`, { credentials: 'include' });
                if (!res.ok) throw new Error('Failed to fetch messages');
                const fetchedMessages = await res.json();
                setMessages(fetchedMessages);

                const unreadMessagesExist = fetchedMessages.some(m => m.senderId === selectedUser._id && !m.isRead);
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
        fetchInitialMessagesAndMarkRead();
    }, [selectedUser, currentUser, socket]);

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

    // --- No changes to clear chat or star ---
    const handleClearChat = async () => {
        if (!confirm('Are you sure you want to clear all messages in this chat? This cannot be undone.')) return;
        try {
            const res = await fetch(`${API_BASE_URL}/msg/clear/${selectedUser._id}`, {
                method: 'POST',
                credentials: 'include'
            });
            if (!res.ok) throw new Error('Server failed to clear chat');
            toast.success("Chat cleared");
            // Optimistically update UI
            setMessages(prev => prev.filter(msg => msg.starredBy?.includes(currentUser._id)));

        } catch (err) {
            toast.error('Could not clear chat. Please refresh and try again.');
        }
        if (document.activeElement) {
            document.activeElement.blur();
        }
    };

    const handleToggleStar = async (messageId) => {
        const originalMessages = [...messages];
        setMessages(prev => prev.map(msg => {
            if (msg._id === messageId) {
                const isStarred = msg.starredBy?.includes(currentUser._id);
                const newStarredBy = isStarred
                    ? msg.starredBy.filter(id => id !== currentUser._id)
                    : [...(msg.starredBy || []), currentUser._id];
                return { ...msg, starredBy: newStarredBy };
            }
            return msg;
        }));
        try {
            const res = await fetch(`${API_BASE_URL}/msg/star/${messageId}`, {
                method: 'POST',
                credentials: 'include'
            });
            if (!res.ok) throw new Error('Failed to update star status');
        } catch (err) {
            toast.error('Could not star message.');
            setMessages(originalMessages);
        }
    };

    // --- No changes to input or send message ---
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
            setMessages(prev => prev.filter(msg => msg._id !== tempId));
        }
    };

    // --- MODIFIED DELETE LOGIC ---

    // Renamed from handleDeleteMessage -> handleDeleteOwnMessage
    const handleDeleteOwnMessage = async (messageId) => {
        const originalMessages = [...messages];
        setMessages(prev => prev.map(msg => {
            if (msg._id === messageId) {
                return {
                    ...msg,
                    text: "This message was deleted",
                    isDeleted: true,
                    starredBy: msg.starredBy?.filter(id => id !== currentUser._id)
                };
            }
            return msg;
        }));

        socket.emit('deleteMessage', { messageId: messageId, receiverId: selectedUser._id });

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

    // NEW function to hide a friend's message just for you
    const handleHideFriendsMessage = async (messageId) => {
        const originalMessages = [...messages];
        // Optimistically remove the message from view immediately
        setMessages(prev => prev.filter(msg => msg._id !== messageId));

        try {
            // Call the new API endpoint
            const res = await fetch(`${API_BASE_URL}/msg/hide/${messageId}`, {
                method: 'POST',
                credentials: 'include'
            });
            if (!res.ok) throw new Error('Server failed to hide message');
            // No toast needed for a simple hide operation
        } catch (err) {
            toast.error('Could not hide message.');
            // Revert on failure
            setMessages(originalMessages);
        }
    };

    // NEW dispatcher function that decides which delete/hide action to take
    const handleDeleteClick = (message) => {
        if (message.senderId === currentUser._id) {
            if (!confirm('Are you sure you want to delete this message? This will be deleted for everyone.')) return;
            handleDeleteOwnMessage(message._id);
        } else {
            if (!confirm('Hide this message? You will not be able to see it anymore.')) return;
            handleHideFriendsMessage(message._id);
        }
    }


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
            {/* Header (No changes) */}
            <div className="flex-shrink-0 w-full p-3.5 flex items-center justify-between gap-4 shadow-md bg-base-100">
                <div className="flex items-center gap-4 flex-1">
                    <button onClick={onBack} className="text-2xl p-2 rounded-full hover:bg-base-200 md:hidden">
                        <IoArrowBack />
                    </button>
                    <div className="flex flex-row items-center justify-center gap-6" onClick={() => navigate(`/selected_user_profile/${selectedUser._id}`)}>
                        <img className="h-14 w-14 rounded-full object-cover" src={selectedUser.picture} alt={selectedUser.name} />
                        <h1 className='text-2xl font-bold truncate'>{selectedUser.name}</h1>
                    </div>
                </div>
                <div className="dropdown dropdown-end">
                    <label tabIndex={0} className="btn btn-ghost btn-circle">
                        <BsThreeDotsVertical className="w-5 h-5" />
                    </label>
                    <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-200 rounded-box w-52">
                        <li><a onClick={handleClearChat}><MdDelete className="w-5 h-5" /> Clear Chat</a></li>
                    </ul>
                </div>
            </div>

            {/* Message List */}
            <div className="flex-grow w-full overflow-y-auto p-4">
                <div className="space-y-2">
                    {messages.map((msg) => {
                        const isStarredByUser = msg.starredBy?.includes(currentUser._id);
                        const isMyMessage = msg.senderId === currentUser._id;

                        return (
                            <div key={msg._id} className={`flex flex-col ${isMyMessage ? 'items-end' : 'items-start'}`}>
                                <div className={`flex items-center gap-2 group ${isMyMessage ? 'flex-row' : 'flex-row-reverse'}`}>

                                    {/* Star Icon: Now appears on ALL non-deleted messages */}
                                    {!msg.isDeleted && (
                                        <div
                                            className="p-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                                            onClick={() => handleToggleStar(msg._id)}
                                        >
                                            {isStarredByUser ? (
                                                <FaStar className="cursor-pointer text-yellow-400 h-4 w-4" title="Unstar message" />
                                            ) : (
                                                <FaRegStar className="cursor-pointer text-gray-400 hover:text-yellow-400 h-4 w-4" title="Star message" />
                                            )}
                                        </div>
                                    )}

                                    {/* Delete Icon: Now appears on ALL non-deleted messages and calls the dispatcher */}
                                    {!msg.isDeleted && (
                                        <div
                                            className="p-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                                            onClick={() => handleDeleteClick(msg)}
                                        >
                                            <MdDelete className="cursor-pointer text-gray-400 hover:text-red-500 h-5 w-5" title="Delete message" />
                                        </div>
                                    )}

                                    {/* The Message Bubble Itself (No Changes) */}
                                    <div className={`max-w-md lg:max-w-xl p-3 rounded-2xl ${msg.isDeleted ? 'bg-base-200' : (isMyMessage ? 'bg-primary text-primary-content rounded-br-sm' : 'bg-base-300 rounded-bl-sm')}`}>
                                        <p className={`${msg.isDeleted ? 'italic text-base-content/60' : ''}`}>{msg.text}</p>
                                    </div>
                                </div>
                                <div className="text-xs text-base-400 opacity-50 mt-1 px-1 flex items-center gap-1">
                                    {isStarredByUser && (<FaStar className="text-yellow-400 h-3 w-3" />)}
                                    <span>{formatMessageTimestamp(msg.timestamp)}</span>
                                    {isMyMessage && !msg.isDeleted && (
                                        msg.isRead ?
                                            <BsCheckAll className="text-green-500 w-4 h-4" /> :
                                            <BsCheckAll className="w-4 h-4" />
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Typing Indicator and Ref (No changes) */}
                {isTyping && (
                    <div className="flex flex-col items-start mt-2 p-4 pt-0">
                        <div className="max-w-md lg:max-w-xl p-3 rounded-2xl bg-base-300 rounded-bl-sm">
                            <p className="text-sm italic">typing...</p>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Message Input Form (No changes) */}
            <div className="flex-shrink-0 w-full p-4 bg-base-200">
                <form onSubmit={handleSendMsg} className="flex gap-2">
                    <input type="text" value={messageText} onChange={handleInputChange} placeholder="Type a message..." className="flex-1 input input-bordered w-full" />
                    <button type="submit" className='btn btn-primary text-2xl px-4 py-2 rounded-lg' disabled={!messageText.trim()}>
                        <IoMdSend />
                    </button>
                </form>
            </div>
        </div>
    );
}