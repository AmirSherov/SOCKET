import "./sidechatbar.scss";
import { useGlobalContext } from "../../context";
import { useState, useEffect } from "react";
import { firestoreDb } from '../../api/firebaseConfig';
import { collection, query, where, getDocs, doc, onSnapshot } from 'firebase/firestore';
import Loader from '../ui/Loader';

export default function SideChatBar() {
    const { state, dispatch } = useGlobalContext();
    const [contacts, setContacts] = useState([]);
    const [loading, setLoading] = useState(true);
    const user = state.user;

    useEffect(() => {
        const loadUserContacts = async () => {
            if (!user?.id) {  // Изменено с user.id на user.uid
                setLoading(false);
                return;
            }
            
            try {
                const usersRef = collection(firestoreDb, 'users');
                // Изменено условие where
                const q = query(usersRef, where("id", "==", user.id));
                const querySnapshot = await getDocs(q);
                
                if (!querySnapshot.empty) {
                    const userDoc = querySnapshot.docs[0];
                    const userData = userDoc.data();
                    console.log("Loaded contacts:", userData.contacts); // Для отладки
                    setContacts(userData.contacts || []);
                }
            } catch (error) {
                console.error("Error loading contacts:", error);
            } finally {
                setLoading(false);
            }
        };

        loadUserContacts();
    }, [user?.uid]); // Изменено с user.id на user.uid

    if (loading) {
        return (
            <div className="side-chat-bar-container">
                <Loader />
            </div>
        );
    }

    const selectChat = (chatId) => {
        dispatch({ type: 'SET_SELECTED_CHAT', payload: chatId });
    };

    return (
        <div className={`side-chat-bar-container ${state.sidebarClose ? "sidebar-close-chat" : ""}`}>
            <div className="side-chat-bar-header">
                {contacts.length > 0 ? (
                    contacts.map(contact => (
                        <div 
                            key={contact.chatId} 
                            className="contact-item" 
                            onClick={() => {
                                selectChat(contact.chatId);
                                dispatch({ type: 'SET_SELECTED_USER_NAME', payload: contact.name });
                                dispatch({ type: 'SET_SELECTED_USER_PHOTO', payload: contact.photoURL });
                            }}
                        >
                            <div className="contact-avatar">
                                <img 
                                    src={contact.photoURL || 'default-avatar.png'} 
                                    alt={contact.name} 
                                />
                            </div>
                            <div className="contact-info">
                                <div className="contact-name">{contact.name}</div>
                                <div className="contact-details">
                                    <div className="contact-last-message">
                                        {contact.lastMessage ? contact.lastMessage.text : 'Нет сообщений'}
                                    </div>
                                    {contact.lastMessage && (
                                        <div className="contact-time">
                                            {new Date(contact.lastMessage.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="no-contacts">
                        <span>No contacts yet</span>
                    </div>
                )}
            </div>
        </div>
    );
}