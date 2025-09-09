import { useState, useEffect, useRef } from "react";
import { fetchWithAuth } from "../utils/fetchWithAuth";
import { LazyLoadImage } from 'react-lazy-load-image-component';
import { IoMdSend } from "react-icons/io";
import { BsCheckAll } from "react-icons/bs";
import toast from "react-hot-toast";
import { useSocket } from "../context/SocketContext";
import { AiFillCloseCircle } from "react-icons/ai";
import { FaImage } from "react-icons/fa6";
import { MdDelete } from "react-icons/md";
import { BsThreeDotsVertical } from "react-icons/bs";
import { FaStar, FaRegStar } from "react-icons/fa";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import useTypingListener from "../hooks/useTypingListener";
import { formatMessageTimestamp } from "../utils/messagingUtilities";
import { useNavigate } from "react-router-dom";

export default function ChatBox({ selectedUser, currentUser, onBack, onViewProfile }) {

    const navigate = useNavigate();

    const [messages, setMessages] = useState([]);
    const [messageText, setMessageText] = useState("");
    const [imageToSend, setImageToSend] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const socket = useSocket();
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isTyping, setIsTyping] = useState(false);
    const typingTimeoutRef = useRef(null);

    useTypingListener(socket, currentUser, selectedUser, setIsTyping);

    const scrollToBottom = () => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); };

    useEffect(scrollToBottom, [messages, isTyping]);

    useEffect(() => {
        if (!selectedUser || !currentUser) {
            setMessages([]);
            return;
        }
        const fetchInitialMessagesAndMarkRead = async () => {
            setMessages([]);
            setIsLoading(true);
            try {
                const res = await fetchWithAuth(`/msg/get/${selectedUser._id}`);
                if (!res.ok) throw new Error('Failed to fetch messages');
                const fetchedMessages = await res.json();
                setMessages(fetchedMessages);

                const unreadMessagesExist = fetchedMessages.some(m => m.senderId === selectedUser._id && !m.isRead);
                if (unreadMessagesExist) {
                    await fetchWithAuth(`/msg/mark-read/${selectedUser._id}`, { method: 'POST' });
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
                fetchWithAuth(`/msg/mark-read/${message.senderId}`, { method: 'POST' });
            }
        };
        const handleMessagesRead = ({ readerId }) => {
            if (readerId === selectedUser?._id) {
                setMessages(prev => prev.map(msg => msg.senderId === currentUser._id ? { ...msg, isRead: true } : msg));
            }
        };
        const handleMessageDeleted = ({ messageId }) => {
            setMessages(prev => prev.map(msg => msg._id === messageId ? { ...msg, text: "This message was deleted", isDeleted: true, image: null } : msg));
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

    const handleClearChat = async () => {
        if (!confirm('Are you sure you want to clear all messages in this chat? This cannot be undone.')) return;
        try {
            const res = await fetchWithAuth(`/msg/clear/${selectedUser._id}`, {
                method: 'POST',
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
            const res = await fetchWithAuth(`/msg/star/${messageId}`, {
                method: 'POST',
            });
            if (!res.ok) throw new Error('Failed to update star status');
        } catch (err) {
            toast.error('Could not star message.');
            setMessages(originalMessages);
        }
    };

    const handleInputChange = (e) => {
        setMessageText(e.target.value);
        if (!typingTimeoutRef.current) {
            socket.emit('typing', { senderId: currentUser._id, receiverId: selectedUser._id });
            typingTimeoutRef.current = setTimeout(() => { typingTimeoutRef.current = null; }, 2000);
        }
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            const previewUrl = URL.createObjectURL(file);
            setImageToSend({ file, preview: previewUrl });
        }
        e.target.value = null; // Allow selecting the same file again
    };

    const handleCancelImageSend = () => {
        if (imageToSend?.preview) {
            URL.revokeObjectURL(imageToSend.preview);
        }
        setImageToSend(null);
    };

    const handleSendMsg = async (e) => {
        e.preventDefault();
        if (!messageText.trim() && !imageToSend) return;

        setIsUploading(true);
        let imageUrl = null;

        try {
            // Step 1: Upload image to Cloudinary if it exists
            if (imageToSend) {
                const formData = new FormData();
                formData.append('file', imageToSend.file);
                formData.append('upload_preset', 'chatrr_unsigned');

                const res = await fetch(`https://api.cloudinary.com/v1_1/djbw8glgb/image/upload`, {
                    method: 'POST',
                    body: formData
                });

                if (!res.ok) throw new Error('Image upload failed');
                const data = await res.json();
                imageUrl = data.secure_url;
            }

            // Preparing message data and send to backend
            const messagePayload = {
                senderId: currentUser._id,
                receiverId: selectedUser._id,
                text: messageText.trim(),
                image: imageUrl
            };

            const res = await fetchWithAuth(`/msg/create`, {
                method: 'POST',
                body: JSON.stringify(messagePayload)
            });
            const savedMessage = await res.json();
            if (!res.ok) throw new Error('Failed to send message');

            setMessages(prev => [...prev, savedMessage]);
            socket.emit('sendMessage', savedMessage);

            // Reset input and image
            setMessageText("");
            handleCancelImageSend();

        } catch (err) {
            toast.error(err.message || 'Could not send message.');
        } finally {
            setIsUploading(false);
        }
    };

    const handleDeleteOwnMessage = async (messageId) => {
        const originalMessages = [...messages];
        setMessages(prev => prev.map(msg => {
            if (msg._id === messageId) {
                return {
                    ...msg,
                    text: "This message was deleted",
                    isDeleted: true,
                    image: null, // Also clear image on delete
                    starredBy: msg.starredBy?.filter(id => id !== currentUser._id)
                };
            }
            return msg;
        }));

        socket.emit('deleteMessage', { messageId: messageId, receiverId: selectedUser._id });

        try {
            const res = await fetchWithAuth(`/msg/delete/${messageId}`, {
                method: 'DELETE',
            });
            if (!res.ok) throw new Error('Server failed to delete message');
            toast.success("Message deleted");
        } catch (err) {
            toast.error('Could not delete message.');
            setMessages(originalMessages);
        }
    };

    const handleHideFriendsMessage = async (messageId) => {
        const originalMessages = [...messages];
        setMessages(prev => prev.filter(msg => msg._id !== messageId));

        try {
            const res = await fetchWithAuth(`/msg/hide/${messageId}`, {
                method: 'POST',
            });
            if (!res.ok) throw new Error('Server failed to hide message');
        } catch (err) {
            toast.error('Could not hide message.');
            setMessages(originalMessages);
        }
    };

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
                <p className="text-lg text-base-content/70">Select a friend to start a conversation</p>
            </div>
        );
    }

    if (isLoading) { return <MessageSkeleton />; }

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex-shrink-0 w-full p-3.5 flex items-center justify-between shadow-md bg-base-100">
                <div onClick={onViewProfile} className="flex items-center gap-4 flex-1">
                    <div className="flex flex-row items-center justify-center gap-6 cursor-pointer" onClick={() => navigate(`/selected_user_profile/${selectedUser._id}`)}>
                        <LazyLoadImage className="h-14 w-14 rounded-full object-cover" src={`${selectedUser.picture}=s48`} effect="blur" alt={selectedUser.name} />
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

                <button onClick={onBack} className="text-2xl p-2 rounded-full hover:bg-base-200 ">
                    <AiFillCloseCircle />
                </button>
            </div>

            {/* Message List */}
            <div className="flex-grow w-full overflow-y-auto p-4">
                <div className="space-y-2">
                    {messages.map((msg) => {
                        const isStarredByUser = msg.starredBy?.includes(currentUser._id);
                        const isMyMessage = msg.senderId.toString() === currentUser._id.toString();
                        const hasContent = msg.text || msg.image;

                        return (
                            <div key={msg._id} className={`flex flex-col w-full ${isMyMessage ? 'items-end' : 'items-start'}`}>
                                <div className={`flex items-center gap-2 group max-w-[70%] lg:max-w-[60%] ${isMyMessage ? 'flex-row' : 'flex-row-reverse'}`}>
                                    {!msg.isDeleted && hasContent && (
                                        <div className="p-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200" onClick={() => handleToggleStar(msg._id)}>
                                            {isStarredByUser ? <FaStar className="cursor-pointer text-yellow-400 h-4 w-4" title="Unstar message" /> : <FaRegStar className="cursor-pointer text-gray-400 hover:text-yellow-400 h-4 w-4" title="Star message" />}
                                        </div>
                                    )}

                                    {!msg.isDeleted && hasContent && (
                                        <div className="p-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200" onClick={() => handleDeleteClick(msg)}>
                                            <MdDelete className="cursor-pointer text-gray-400 hover:text-red-500 h-5 w-5" title="Delete message" />
                                        </div>
                                    )}

                                    <div className={`flex flex-col gap-1 w-full p-2 rounded-2xl ${msg.isDeleted ? 'bg-base-200' : (isMyMessage ? 'bg-primary text-primary-content rounded-br-sm' : 'bg-base-300 rounded-bl-sm')}`}>
                                        {msg.image && !msg.isDeleted && (
                                            <a href={msg.image} target="_blank" rel="noopener noreferrer">
                                                <img src={msg.image} alt="Sent content" className="rounded-lg w-full object-cover" />
                                            </a>
                                        )}
                                        {msg.text && (
                                            <p className={`break-words ${msg.isDeleted ? 'italic text-base-content/60' : ''}`}>{msg.text}</p>
                                        )
                                        }
                                    </div>
                                </div>
                                <div className="text-xs text-base-400 opacity-50 mt-1 px-1 flex items-center gap-1">
                                    {isStarredByUser && (<FaStar className="text-yellow-400 h-3 w-3" />)}
                                    <span>{formatMessageTimestamp(msg.timestamp)}</span>
                                    {isMyMessage && !msg.isDeleted && (
                                        msg.isRead ? <BsCheckAll className="text-green-500 w-4 h-4" /> : <BsCheckAll className="w-4 h-4" />
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {isTyping && (
                    <div className="flex flex-col items-start mt-2 p-4 pt-0">
                        <div className="max-w-md lg:max-w-xl p-3 rounded-2xl bg-base-300 rounded-bl-sm">
                            <p className="text-sm italic">typing...</p>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Image Preview and Message Input Form */}
            <div className="flex-shrink-0 w-full bg-base-200">
                {imageToSend && (
                    <div className="p-4 border-t border-base-300 flex justify-center">
                        <div className="relative">
                            <img src={imageToSend.preview} alt="Preview" className="max-h-40 rounded-lg object-contain" />
                            <button
                                onClick={handleCancelImageSend}
                                className="absolute -top-2 -right-2 text-2xl text-gray-300 bg-gray-800 rounded-full hover:text-white"
                                title="Cancel image"
                            >
                                <AiFillCloseCircle />
                            </button>
                        </div>
                    </div>
                )}
                <form onSubmit={handleSendMsg} className="flex gap-2 items-center justify-center p-4">
                    <input type="file" ref={fileInputRef} onChange={handleFileSelect} style={{ display: 'none' }} accept="image/*" />
                    <div onClick={() => fileInputRef.current.click()} className="p-3 rounded-lg bg-base-300 text-xl text-primary cursor-pointer hover:bg-base-400">
                        <FaImage />
                    </div>
                    <input type="text" value={messageText} onChange={handleInputChange} placeholder="Type a message..." className="flex-1 input input-bordered w-full" />
                    <button type="submit" className={`btn btn-primary text-2xl px-4 py-2 rounded-lg ${isUploading ? 'loading' : ''}`} disabled={(!messageText.trim() && !imageToSend) || isUploading}>
                        {!isUploading && <IoMdSend />}
                    </button>
                </form>
            </div>
        </div>
    );
}