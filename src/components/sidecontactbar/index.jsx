import { useState, useEffect } from "react";
import { collection, query, getDocs, where, addDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import { firestoreDb } from '../../api/firebaseConfig';
import { useGlobalContext } from "../../context"
import { useNavigate } from "react-router-dom";
import "./sidecontatbar.scss";
export default function SideContactBar() {
    const [contacts, setContacts] = useState([]);
    const { state, dispatch } = useGlobalContext();
    const [searchTerm, setSearchTerm] = useState('');
    const navigate = useNavigate();
    const [windowWidth, setWindowWidth] = useState(window.innerWidth);
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
        const fetchSavedContacts = async () => {
            if (!state.user || !state.user.id) return;
            try {
                const userRef = collection(firestoreDb, 'users');
                const userQuery = query(userRef, where("id", "==", state.user.id));
                const userSnapshot = await getDocs(userQuery);
                
                if (!userSnapshot.empty) {
                    const userData = userSnapshot.docs[0].data();
                    const savedContacts = userData.saved || [];
                    setContacts(savedContacts);
                }
            } catch (error) {
                console.error("Error fetching saved contacts:", error);
            }
        };
        fetchSavedContacts();
    }, [state.user]);

    useEffect(() => {
        if (contacts.length === 0 || !state.user?.id) return;
        const usersRef = collection(firestoreDb, 'users');
        const contactUserIds = contacts.map(contact => contact.id);
        const q = query(usersRef, where("id", "in", contactUserIds));
        const unsubscribeUsers = onSnapshot(q, async (snapshot) => {
            const updates = [];
            const userDocs = {};
            snapshot.docs.forEach(doc => {
                userDocs[doc.data().id] = doc.data();
            });
            contacts.forEach(contact => {
                const actualUserData = userDocs[contact.id];

                if (actualUserData && (
                    contact.displayName !== actualUserData.displayName ||
                    contact.photoURL !== actualUserData.photoURL ||
                    contact.bio !== actualUserData.bio
                )) {
                    const updatedContact = {
                        ...contact,
                        displayName: actualUserData.displayName,
                        photoURL: actualUserData.photoURL,
                        bio: actualUserData.bio
                    };
                    updates.push(updatedContact);
                }
            });
            if (updates.length > 0) {
                try {
                    const currentUserQuery = query(usersRef, where("id", "==", state.user.id));
                    const currentUserDocs = await getDocs(currentUserQuery);
                    if (!currentUserDocs.empty) {
                        const currentUserDoc = currentUserDocs.docs[0];
                        const updatedContacts = contacts.map(contact => {
                            const update = updates.find(u => u.id === contact.id);
                            return update || contact;
                        });
                        await updateDoc(currentUserDoc.ref, {
                            saved: updatedContacts
                        });
                        setContacts(updatedContacts);
                    }
                } catch (error) {
                    console.error("Error updating saved contacts:", error);
                }
            }
        });
        return () => unsubscribeUsers();
    }, [contacts, state.user]);
    const filteredContacts = contacts.filter(contact =>
        contact.displayName?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const handleContactClick = async (contact) => {
        try {
            const chatsRef = collection(firestoreDb, 'chats');
            const chatQuery = query(
                chatsRef,
                where('participants', 'array-contains', state.user.id)
            );
            const chatSnapshot = await getDocs(chatQuery);
            let existingChat = null;
            chatSnapshot.forEach(doc => {
                const chat = { ...doc.data(), id: doc.id };
                if (chat.participants.includes(contact.id)) {
                    existingChat = chat;
                }
            });
            let currentChat;
            if (existingChat) {
                currentChat = existingChat;
            } else {
                const newChat = {
                    participants: [state.user.id, contact.id],
                    lastMessage: null,
                    createdAt: new Date().toISOString(),
                    messages: []
                };
                const docRef = await addDoc(chatsRef, newChat);
                currentChat = { ...newChat, id: docRef.id };
            }
            dispatch({ type: 'SET_CURRENT_CHAT', payload: currentChat });
            dispatch({ type: 'SET_SELECTED_CHAT', payload: currentChat.id });
            dispatch({ type: 'SET_SELECTED_USER_NAME', payload: contact.displayName });
            dispatch({ type: 'SET_SELECTED_USER_PHOTO', payload: contact.photoURL });
            dispatch({ type: 'SET_SELECTED_USER_BIO', payload: contact.bio });
            if (windowWidth < 600) {
                navigate(`/chating/${currentChat.id}`);
                dispatch({ type: 'SET_CURRENT_CHAT', payload: currentChat });
                dispatch({ type: 'SET_SELECTED_CHAT', payload: currentChat.id });
                dispatch({ type: 'SET_SELECTED_USER_NAME', payload: contact.displayName });
                dispatch({ type: 'SET_SELECTED_USER_PHOTO', payload: contact.photoURL });
                dispatch({ type: 'SET_SELECTED_USER_BIO', payload: contact.bio });
            } else {
                dispatch({ type: 'SET_CURRENT_CHAT', payload: currentChat });
                dispatch({ type: 'SET_SELECTED_CHAT', payload: currentChat.id });
                dispatch({ type: 'SET_SELECTED_USER_NAME', payload: contact.displayName });
                dispatch({ type: 'SET_SELECTED_USER_PHOTO', payload: contact.photoURL });
                dispatch({ type: 'SET_SELECTED_USER_BIO', payload: contact.bio });
            }
            dispatch({ type: 'SET_ACTIVE_TAB', payload: 'chats' });

        } catch (error) {
            console.error("Error handling contact click:", error);
        }
    };
    return (
        <div className="sidecontactbar-container">
              {!state.isBurgerOpen &&
                <div onClick={() => dispatch({ type: 'SET_IS_BURGER_OPEN', payload: !state.isBurgerOpen })}
                    className={`burger-menu ${state.isBurgerOpen ? "open" : ""}`}>
                    <div className="burger-line"></div>
                    <div className="burger-line"></div>
                    <div className="burger-line"></div>
                </div>
            }
            <div className="search-container">
                <input
                    type="text"
                    placeholder="Search contacts..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <div className="contacts-list">
                {filteredContacts.map((contact) => (
                    <div
                        key={contact.id}
                        className="contact-item"
                        onClick={() => handleContactClick(contact)}
                    >
                        <img
                            src={contact.photoURL || 'default-avatar.png'}
                            alt={contact.displayName}
                            className="contact-avatar"
                        />
                        <div className="contact-info">
                            <div className="contact-name">{contact.displayName}</div>
                            <div className="contact-bio">{contact.bio}</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}