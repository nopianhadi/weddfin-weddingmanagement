import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Project, Client, ChatMessage, Profile } from '../types';
import { SendIcon, WhatsappIcon } from '../constants';
import { CHAT_TEMPLATES, cleanPhoneNumber } from '../constants';
import { useChatTemplates } from '../hooks/useChatTemplates';

interface ChatModalProps {
    isOpen: boolean;
    onClose: () => void;
    project: Project;
    client: Client;
    onSendMessage: (projectId: string, messageText: string) => void;
    userProfile?: Profile;
}

const ChatModal: React.FC<ChatModalProps> = ({ isOpen, onClose, project, client, onSendMessage, userProfile }) => {
    const { templates, processTemplate: processTemplateFunc } = useChatTemplates(userProfile);
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
        }
    }, [project.chatHistory, isOpen]);

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (newMessage.trim()) {
            onSendMessage(project.id, newMessage.trim());
            setNewMessage('');
        }
    };

    const handleSelectTemplate = (template: string) => {
        const processedMessage = processTemplateFunc(template, {
            clientName: client.name,
            projectName: project.projectName,
        });
        setNewMessage(processedMessage);
    };

    const handleShareToWhatsApp = () => {
        if (!client.phone) {
            alert('Nomor telepon pengantin tidak tersedia.');
            return;
        }
        if (!newMessage.trim()) {
            alert('Tulis pesan terlebih dahulu atau pilih dari template.');
            return;
        }
        const phoneNumber = cleanPhoneNumber(client.phone);
        const encodedMessage = encodeURIComponent(newMessage);
        const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
        window.open(whatsappUrl, '_blank');
    };

    if (!isOpen) return null;

    return createPortal(
        <>
            <div
                className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4 chat-modal-overlay"
                onClick={onClose}
                style={{
                    paddingTop: 'calc(1rem + var(--safe-area-inset-top, 0px))',
                    paddingBottom: 'calc(1rem + var(--safe-area-inset-bottom, 0px))',
                    paddingLeft: 'calc(1rem + var(--safe-area-inset-left, 0px))',
                    paddingRight: 'calc(1rem + var(--safe-area-inset-right, 0px))',
                }}
            >
                <div
                    className="bg-brand-surface text-brand-text-primary rounded-2xl shadow-2xl w-full max-w-lg flex flex-col border border-brand-border chat-modal-dialog"
                    style={{
                        height: 'calc(80vh - var(--safe-area-inset-bottom, 0px))',
                        maxHeight: 'calc(100vh - 2rem - var(--safe-area-inset-bottom, 0px))'
                    }}
                    onClick={e => e.stopPropagation()}
                >
                    <div className="p-4 border-b border-brand-border flex-shrink-0">
                        <h3 className="text-lg font-semibold text-brand-text-light">Chat dengan {client.name}</h3>
                        <p className="text-sm text-brand-text-secondary">Acara: {project.projectName}</p>
                    </div>

                    <div className="flex-grow p-4 overflow-y-auto space-y-4 chat-modal-messages">
                        {(project.chatHistory || []).map(msg => (
                            <div key={msg.id} className={`flex items-end gap-2 ${msg.sender === 'vendor' ? 'justify-end' : 'justify-start'}`}>
                                {msg.sender === 'client' && (
                                    <div className="w-8 h-8 rounded-full bg-brand-accent/20 flex items-center justify-center font-bold text-brand-accent text-sm flex-shrink-0">
                                        {client.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                                    </div>
                                )}
                                <div className={`max-w-xs md:max-w-md p-3 rounded-2xl ${msg.sender === 'vendor' ? 'bg-brand-accent text-white rounded-br-none' : 'bg-brand-bg text-brand-text-primary rounded-bl-none'}`}>
                                    <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>

                    <div className="p-4 border-t border-brand-border flex-shrink-0 chat-modal-input-area">
                        <div className="mb-2">
                            <label className="text-xs font-semibold text-brand-text-secondary">Gunakan Template Pesan:</label>
                            <div className="flex flex-wrap gap-2 mt-1">
                                {templates.map(template => (
                                    <button
                                        key={template.id}
                                        type="button"
                                        onClick={() => handleSelectTemplate(template.template)}
                                        className="button-secondary !text-xs !px-3 !py-1"
                                    >
                                        {template.title}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                            <textarea
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                placeholder="Ketik pesan..."
                                className="input-field !h-12 w-full !rounded-lg"
                                rows={1}
                            />
                            <button type="button" onClick={handleShareToWhatsApp} className="button-secondary !bg-green-500/10 hover:!bg-green-500/20 !border-green-500/20 !text-green-400 h-12 w-12 flex items-center justify-center flex-shrink-0" title="Bagikan ke WhatsApp">
                                <WhatsappIcon className="w-6 h-6" />
                            </button>
                            <button type="submit" className="button-primary !rounded-lg h-12 w-12 flex items-center justify-center flex-shrink-0" title="Kirim Pesan">
                                <SendIcon className="w-6 h-6" />
                            </button>
                        </form>
                    </div>
                </div>
            </div>
            <style>{`
            /* Mobile-specific styles for ChatModal */
            @media (max-width: 640px) {
                .chat-modal-overlay {
                    /* Account for bottom navigation bar */
                    padding-bottom: calc(5rem + var(--safe-area-inset-bottom, 0px)) !important;
                }

                .chat-modal-dialog {
                    /* Adjust height to prevent overlap with bottom nav */
                    height: calc(75vh - var(--safe-area-inset-bottom, 0px)) !important;
                    max-height: calc(100vh - 8rem - var(--safe-area-inset-bottom, 0px)) !important;
                }

                .chat-modal-input-area {
                    /* Ensure input area is accessible above keyboard */
                    padding-bottom: var(--safe-area-inset-bottom, 0px);
                }
            }

            /* iOS specific optimizations */
            @supports (-webkit-touch-callout: none) {
                .chat-modal-messages {
                    -webkit-overflow-scrolling: touch;
                }
            }
        `}</style>
        </>,
        document.body
    );
};

export default ChatModal;