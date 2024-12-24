import "./sidechatbar.scss";
import { useGlobalContext } from "../../context";
import { useState, useEffect} from "react";
import { useNavigate } from "react-router-dom";
import { firestoreDb } from '../../api/firebaseConfig';
import { collection, query, where, doc, onSnapshot } from 'firebase/firestore';
import Loader from '../ui/Loader';
export default function SideChatBar() {
    const { state, dispatch } = useGlobalContext();
    const [contacts, setContacts] = useState([]);
    const [chatMessages, setChatMessages] = useState({});
    const [loading, setLoading] = useState(true);
    const [windowWidth, setWindowWidth] = useState(window.innerWidth);
    const navigate = useNavigate();
    const user = state.user;
    useEffect(() => {
        const handleResize = () => {
            setWindowWidth(window.innerWidth);
        };
        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
        };
    })
    useEffect(() => {
        if (!user?.id) {
            setLoading(false);
            return;
        }

        const usersRef = collection(firestoreDb, 'users');
        const q = query(usersRef, where("id", "==", user.id));

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            if (!querySnapshot.empty) {
                const userDoc = querySnapshot.docs[0];
                const userData = userDoc.data();
                setContacts(userData.contacts || []);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user?.id]);

    useEffect(() => {
        const unsubscribers = contacts.map(contact => {
            if (!contact.chatId) return null;

            const chatRef = doc(firestoreDb, 'chats', contact.chatId);
            return onSnapshot(chatRef, (chatDoc) => {
                if (chatDoc.exists()) {
                    const chatData = chatDoc.data();
                    setChatMessages(prev => ({
                        ...prev,
                        [contact.chatId]: chatData.lastMessage
                    }));
                }
            });
        });

        return () => {
            unsubscribers.forEach(unsub => unsub && unsub());
        };
    }, [contacts]);

    if (loading) {
        return (
            <div className="side-chat-bar-container">
                <Loader />
            </div>
        );
    }
    const selectChat = (chatId) => {
        if(windowWidth < 600){
            navigate(`/chating/${chatId}`);
        } else{
            dispatch({ type: 'SET_SELECTED_CHAT', payload: chatId });
        }
    };

    return (
        <div className={`side-chat-bar-container ${state.sidebarClose ? "sidebar-close-chat" : ""}`}>
            <div onClick={() => dispatch({ type: 'SET_IS_BURGER_OPEN', payload: !state.isBurgerOpen })} className={`burger-menu ${state.isBurgerOpen ? "open" : ""}`}>
                <div className="burger-line"></div>
                <div className="burger-line"></div>
                <div className="burger-line"></div>
            </div>
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
                            <div onClick={() => selectChat(contact.chatId)} className="contact-info">
                                <div className="contact-name">{contact.name}</div>
                                <div className="contact-details">
                                    <div className="contact-last-message">
                                       {chatMessages[contact.chatId]?.senderId === user.id ? 'Вы: ' : ''} {chatMessages[contact.chatId]?.text || 'Нет сообщений'}
                                    </div>
                                    {chatMessages[contact.chatId]?.timestamp && (
                                        <div className="contact-time">
                                            {new Date(chatMessages[contact.chatId].timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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