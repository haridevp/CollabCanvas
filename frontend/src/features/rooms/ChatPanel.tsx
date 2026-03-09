import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send } from 'lucide-react';

interface ChatMessage {
    id: string;
    userId: string;
    username: string;
    text: string;
    timestamp: string;
}

interface ChatPanelProps {
    roomId: string;
    currentUserId: string;
    currentUsername: string;
    isOpen: boolean;
    onClose: () => void;
    socket?: any;
}

const ChatPanel: React.FC<ChatPanelProps> = ({
    roomId,
    currentUserId,
    currentUsername,
    isOpen,
    onClose,
    socket,
}) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!socket) return;

        const handleChatMessage = (message: ChatMessage) => {
            setMessages((prev) => [...prev, message]);
        };

        socket.on('chat-message', handleChatMessage);

        return () => {
            socket.off('chat-message', handleChatMessage);
        };
    }, [socket]);

    useEffect(() => {
        // Scroll to bottom when messages update
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isOpen]);

    const handleSendMessage = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!newMessage.trim() || !socket) return;

        // Emit message to server
        socket.emit('chat-message', {
            roomId,
            userId: currentUserId,
            username: currentUsername,
            message: newMessage.trim(),
        });

        setNewMessage('');
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-y-0 right-0 w-full md:w-80 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-xl z-50 flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <h2 className="font-bold text-slate-900 dark:text-white">Room Chat</h2>
                </div>
                <button
                    onClick={onClose}
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-500 dark:text-slate-400"
                    aria-label="Close chat panel"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-500 dark:text-slate-400 space-y-2">
                        <MessageSquare className="w-8 h-8 opacity-20" />
                        <p className="text-sm">No messages yet. Start the conversation!</p>
                    </div>
                ) : (
                    messages.map((msg) => {
                        const isMe = msg.userId === currentUserId;
                        return (
                            <div
                                key={msg.id}
                                className={`flex flex-col max-w-[85%] ${isMe ? 'items-end self-end ml-auto' : 'items-start mr-auto'}`}
                            >
                                {!isMe && (
                                    <span className="text-xs text-slate-500 dark:text-slate-400 ml-1 mb-1">
                                        {msg.username}
                                    </span>
                                )}
                                <div
                                    className={`px-3 py-2 rounded-2xl ${isMe
                                        ? 'bg-blue-600 text-white rounded-br-sm'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-bl-sm border border-slate-200 dark:border-slate-700'
                                        }`}
                                    style={{ wordBreak: 'break-word' }}
                                >
                                    <p className="text-sm shadow-sm">{msg.text}</p>
                                </div>
                                <span className="text-[10px] text-slate-400 mt-1 mx-1">
                                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Type a message..."
                        className="flex-1 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm dark:text-white"
                        autoComplete="off"
                    />
                    <button
                        type="submit"
                        disabled={!newMessage.trim()}
                        className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        aria-label="Send message"
                    >
                        <Send className="w-4 h-4 ml-0.5" />
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ChatPanel;
