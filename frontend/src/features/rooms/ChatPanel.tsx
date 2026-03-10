import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, Edit2, Trash2, Copy, Check } from 'lucide-react';

interface ChatMessage {
    id: string;
    userId: string;
    username: string;
    text: string;
    timestamp: string;
    isEdited?: boolean;
    isDeleted?: boolean;
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
    const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
    const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!socket) return;

        // Request message history when panel opens
        if (isOpen) {
            socket.emit('load-messages', { roomId });
        }

        const handleMessagesLoaded = (historicalMessages: ChatMessage[]) => {
            setMessages(historicalMessages);
        };

        const handleChatMessage = (message: ChatMessage) => {
            setMessages((prev) => [...prev, message]);
        };

        const handleMessageEdited = ({ id, text, isEdited }: { id: string, text: string, isEdited: boolean }) => {
            setMessages((prev) =>
                prev.map((msg) => (msg.id === id ? { ...msg, text, isEdited } : msg))
            );
        };

        const handleMessageDeleted = ({ id, text, isDeleted }: { id: string, text: string, isDeleted: boolean }) => {
            setMessages((prev) =>
                prev.map((msg) => (msg.id === id ? { ...msg, text, isDeleted } : msg))
            );
        };

        socket.on('messages-loaded', handleMessagesLoaded);
        socket.on('chat-message', handleChatMessage);
        socket.on('message-edited', handleMessageEdited);
        socket.on('message-deleted', handleMessageDeleted);

        return () => {
            socket.off('messages-loaded', handleMessagesLoaded);
            socket.off('chat-message', handleChatMessage);
            socket.off('message-edited', handleMessageEdited);
            socket.off('message-deleted', handleMessageDeleted);
        };
    }, [socket, isOpen, roomId]);

    useEffect(() => {
        // Scroll to bottom when messages update
        if (typeof messagesEndRef.current?.scrollIntoView === 'function') {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isOpen]);

    const handleSendMessage = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!newMessage.trim() || !socket) return;

        if (editingMsgId) {
            // Emit edit-message to server
            socket.emit('edit-message', {
                roomId,
                messageId: editingMsgId,
                userId: currentUserId,
                newText: newMessage.trim(),
            });
            setEditingMsgId(null);
        } else {
            // Emit new chat-message to server
            socket.emit('chat-message', {
                roomId,
                userId: currentUserId,
                username: currentUsername,
                message: newMessage.trim(),
            });
        }

        setNewMessage('');
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        } else if (e.key === 'Escape' && editingMsgId) {
            setEditingMsgId(null);
            setNewMessage('');
        }
    };

    const initiateEdit = (msg: ChatMessage) => {
        if (msg.isDeleted || msg.userId !== currentUserId) return;
        setEditingMsgId(msg.id);
        setNewMessage(msg.text);
    };

    const deleteMessage = (msgId: string) => {
        if (!socket) return;
        if (window.confirm('Delete this message?')) {
            socket.emit('delete-message', {
                roomId,
                messageId: msgId,
                userId: currentUserId,
            });
            if (editingMsgId === msgId) {
                setEditingMsgId(null);
                setNewMessage('');
            }
        }
    };

    const copyMessage = (msg: ChatMessage) => {
        if (msg.isDeleted) return;
        navigator.clipboard.writeText(msg.text);
        setCopiedMsgId(msg.id);
        setTimeout(() => setCopiedMsgId(null), 2000);
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
                        const isDeleted = msg.isDeleted;
                        return (
                            <div
                                key={msg.id}
                                className={`flex flex-col max-w-[90%] group ${isMe ? 'items-end self-end ml-auto' : 'items-start mr-auto'}`}
                            >
                                {!isMe && (
                                    <span className="text-xs text-slate-500 dark:text-slate-400 ml-1 mb-1">
                                        {msg.username}
                                    </span>
                                )}

                                <div className={`flex items-end gap-1 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                                    {/* Action buttons appear on hover next to message bubble */}
                                    <div className={`flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ${isDeleted ? 'hidden' : ''}`}>
                                        <button
                                            onClick={() => copyMessage(msg)}
                                            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                                            title="Copy message"
                                        >
                                            {copiedMsgId === msg.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                        </button>
                                        {isMe && !isDeleted && (
                                            <>
                                                <button
                                                    onClick={() => initiateEdit(msg)}
                                                    className="p-1 text-slate-400 hover:text-blue-500 transition-colors"
                                                    title="Edit message"
                                                >
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    onClick={() => deleteMessage(msg.id)}
                                                    className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                                                    title="Delete message"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </>
                                        )}
                                    </div>

                                    {/* Message Bubble */}
                                    <div
                                        className={`px-3 py-2 rounded-2xl ${isDeleted ? 'bg-slate-100 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500 italic' :
                                                isMe
                                                    ? 'bg-blue-600 text-white rounded-br-sm'
                                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-bl-sm border border-slate-200 dark:border-slate-700'
                                            } ${editingMsgId === msg.id ? 'ring-2 ring-blue-300' : ''}`}
                                        style={{ wordBreak: 'break-word' }}
                                    >
                                        <p className="text-sm shadow-sm whitespace-pre-wrap">{msg.text}</p>
                                    </div>
                                </div>

                                <div className={`flex items-center gap-1 mt-1 mx-1 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                                    <span className="text-[10px] text-slate-400">
                                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    {msg.isEdited && !isDeleted && (
                                        <span className="text-[10px] text-slate-400 italic">
                                            (edited)
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex flex-col">
                {editingMsgId && (
                    <div className="flex items-center justify-between text-xs text-blue-600 dark:text-blue-400 mb-2 px-1">
                        <span>Editing message...</span>
                        <button onClick={() => { setEditingMsgId(null); setNewMessage(''); }} className="hover:underline">Cancel</button>
                    </div>
                )}
                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                       
                        className="flex-1 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm dark:text-white transition-colors"
                        autoComplete="off"
                    />
                    <button
                        type="submit"
                        disabled={!newMessage.trim()}
                        className={`p-2 rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${editingMsgId
                                ? 'bg-green-600 hover:bg-green-700 text-white'
                                : 'bg-blue-600 hover:bg-blue-700 text-white'
                            }`}
                        aria-label={editingMsgId ? "Save edit" : "Send message"}
                    >
                        {editingMsgId ? <Check className="w-4 h-4" /> : <Send className="w-4 h-4 ml-0.5" />}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ChatPanel;
