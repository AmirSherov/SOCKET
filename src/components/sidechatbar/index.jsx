import "./sidechatbar.scss";
import { useGlobalContext } from "../../context";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { firestoreDb } from '../../api/firebaseConfig';
import { collection, query, where, doc, onSnapshot, getDocs, setDoc, updateDoc, getDoc, serverTimestamp, addDoc } from 'firebase/firestore';
import Loader from '../ui/Loader';
import toast from 'react-hot-toast';
export default function SideChatBar() {
    const { state, dispatch } = useGlobalContext();
    const [contacts, setContacts] = useState([]);
    const [chatMessages, setChatMessages] = useState({});
    const [loading, setLoading] = useState(true);
    const [windowWidth, setWindowWidth] = useState(window.innerWidth);
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [userStatuses, setUserStatuses] = useState({});
    const navigate = useNavigate();
    const user = state.user;
    const currentUserId = state.user?.id || localStorage.getItem('userId');
    useEffect(() => {
        const handleResize = () => {
            setWindowWidth(window.innerWidth);
        };
        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, []);
    useEffect(() => {
        if (!user?.id) {
            setLoading(false);
            return;
        }
        const usersRef = collection(firestoreDb, 'users');
        const q = query(usersRef, where("id", "==", user.id));
        const unsubscribeContacts = onSnapshot(q, (querySnapshot) => {
            if (!querySnapshot.empty) {
                const userDoc = querySnapshot.docs[0];
                const userData = userDoc.data();
                setContacts(userData.contacts || []);
            }
            setLoading(false);
        });
        return () => unsubscribeContacts();
    }, [user?.id]);
    useEffect(() => {
        if (contacts.length === 0 || !state.user?.id) return;
        const usersRef = collection(firestoreDb, 'users');
        const contactUserIds = contacts
            .map(contact => contact.userId)
            .filter(id => id); 
        if (contactUserIds.length === 0) return;
        const q = query(usersRef, where("id", "in", contactUserIds));
        const unsubscribeUsers = onSnapshot(q, async (snapshot) => {
            let hasUpdates = false;
            const updatedContacts = contacts.map(contact => {
                if (!contact.userId) return contact; 
                const actualUserDoc = snapshot.docs.find(doc => doc.data().id === contact.userId);
                if (actualUserDoc) {
                    const userData = actualUserDoc.data();
                    if (
                        contact.name !== userData.displayName ||
                        contact.photoURL !== userData.photoURL ||
                        contact.bio !== userData.bio
                    ) {
                        hasUpdates = true;
                        return {
                            ...contact,
                            name: userData.displayName,
                            photoURL: userData.photoURL,
                            bio: userData.bio
                        };
                    }
                }
                return contact;
            });
            if (hasUpdates) {
                try {
                    const userQuery = query(usersRef, where("id", "==", state.user.id));
                    const userSnapshot = await getDocs(userQuery);
                    if (!userSnapshot.empty) {
                        const userDoc = userSnapshot.docs[0];
                        await updateDoc(userDoc.ref, {
                            contacts: updatedContacts
                        });
                        setContacts(updatedContacts);
                    }
                } catch (error) {
                    console.error("Error updating contacts:", error);
                }
            }
        });
        return () => unsubscribeUsers();
    }, [contacts, state.user?.id, currentUserId]);
    useEffect(() => {
        if (contacts.length === 0) return;
        const contactUserIds = contacts.map(contact => {
            const [user1, user2] = contact.chatId.split('-');
            return currentUserId === user1 ? user2 : user1;
        });
        const usersRef = collection(firestoreDb, 'users');
        const q = query(usersRef, where("id", "in", contactUserIds));
        const unsubscribeStatuses = onSnapshot(q, (snapshot) => {
            const statuses = {};
            snapshot.docs.forEach(doc => {
                const userData = doc.data();
                statuses[userData.id] = userData.status || false;
            });
            setUserStatuses(statuses);
        });
        return () => unsubscribeStatuses();
    }, [contacts, currentUserId]);
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
    useEffect(() => {
        if (!state.selectedUserId) return;
        const userRef = doc(firestoreDb, 'users', state.selectedUserId);
        const unsubscribe = onSnapshot(userRef, (doc) => {
            if (doc.exists()) {
                const userData = doc.data();
                dispatch({ 
                    type: 'SET_SELECTED_USER_STATUS', 
                    payload: userData.status || false
                });
            }
        });
        return () => unsubscribe();
    }, [state.selectedUserId, dispatch]);
    const searchUsers = async (searchTerm) => {
        if (!searchTerm.trim() || !searchTerm.startsWith('@') || searchTerm.length <= 1) {
            setFilteredUsers([]);
            return;
        }
        try {
            const usersRef = collection(firestoreDb, 'users');
            const querySnapshot = await getDocs(usersRef);
            const users = [];
            querySnapshot.forEach((doc) => {
                const userData = doc.data();
                if (userData && userData.id !== currentUserId) {
                    const searchValue = searchTerm.substring(1).toLowerCase();
                    const displayNameMatch = userData.displayName?.toLowerCase().includes(searchValue);

                    if (displayNameMatch) {
                        users.push({
                            id: userData.id,
                            photoURL: userData.photoURL,
                            displayName: userData.displayName,
                            docId: doc.id
                        });
                    }
                }
            });

            setFilteredUsers(users);
        } catch (error) {
            toast.error('Error searching users');
        }
    };
    const extendedContacts = [...contacts, ...Array(50).fill().map((_, i) => ({
        ...contacts[i % contacts.length],
        chatId: `test-${i}`,
        name: `Test User ${i + 1}`, 
        photoURL: 'default-avatar.png' 
    }))];
    const handleUserSelect = async (selectedUser) => {
        const chatId = [currentUserId, selectedUser.id].sort().join('-');
        try {
            const chatRef = doc(firestoreDb, 'chats', chatId);
            const chatDoc = await getDoc(chatRef);
            if (!chatDoc.exists()) {
                await setDoc(chatRef, {
                    participants: [currentUserId, selectedUser.id],
                    createdAt: serverTimestamp(),
                    messages: []
                });
            }
            dispatch({ type: "SET_SELECTED_CHAT", payload: chatId });
            dispatch({ type: "SET_SELECTED_USER_NAME", payload: selectedUser.displayName });
            dispatch({ type: "SET_SELECTED_USER_PHOTO", payload: selectedUser.photoURL });
            dispatch({ type: 'SET_SELECTED_USER_STATUS', payload: selectedUser.status });
            if (windowWidth < 600) {
                navigate(`/chating/${chatId}`);
            }
            setSearchQuery('');
            setFilteredUsers([]);
        } catch (error) {
            console.error("Error creating chat:", error);
            toast.error('Error creating chat');
        }
    };
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
            if(windowWidth < 600) {
                navigate(`/chating/${currentChat.id}`);
                dispatch({ type: 'SET_CURRENT_CHAT', payload: currentChat });
                dispatch({ type: 'SET_SELECTED_CHAT', payload: currentChat.id });
                dispatch({ type: 'SET_SELECTED_USER_NAME', payload: contact.displayName });
                dispatch({ type: 'SET_SELECTED_USER_PHOTO', payload: contact.photoURL });
                dispatch({ type: 'SET_SELECTED_USER_BIO', payload: contact.bio });
                dispatch({ type: 'SET_SELECTED_USER_STATUS', payload: contact.status });
            } else {
                dispatch({ type: 'SET_CURRENT_CHAT', payload: currentChat });
                dispatch({ type: 'SET_SELECTED_CHAT', payload: currentChat.id });
                dispatch({ type: 'SET_SELECTED_USER_NAME', payload: contact.displayName });
                dispatch({ type: 'SET_SELECTED_USER_PHOTO', payload: contact.photoURL });
                dispatch({ type: 'SET_SELECTED_USER_BIO', payload: contact.bio });
                dispatch({ type: 'SET_SELECTED_USER_STATUS', payload: contact.status });
            }
            dispatch({ type: 'SET_ACTIVE_TAB', payload: 'chats' });
        } catch (error) {
            console.error("Error handling contact click:", error);
        }
    };
    if (loading) {
        return (
            <div className="side-chat-bar-container">
                <Loader />
            </div>
        );
    }
    const selectChat = async (chatId) => {
        try {
            const [user1, user2] = chatId.split('-');
            const otherUserId = user1 === currentUserId ? user2 : user1;
            const usersRef = collection(firestoreDb, 'users');
            const userQuery = query(usersRef, where("id", "==", otherUserId));
            const userSnapshot = await getDocs(userQuery);
            if (!userSnapshot.empty) {
                const userData = userSnapshot.docs[0].data();
                if (windowWidth < 600) {
                    navigate(`/chating/${chatId}`);
                }
                dispatch({ type: 'SET_SELECTED_CHAT', payload: chatId });
                dispatch({ type: 'SET_SELECTED_USER_ID', payload: otherUserId });
                dispatch({ type: 'SET_SELECTED_USER_NAME', payload: userData.displayName });
                dispatch({ type: 'SET_SELECTED_USER_PHOTO', payload: userData.photoURL });
                dispatch({ type: 'SET_SELECTED_USER_BIO', payload: userData.bio });
                dispatch({ type: 'SET_SELECTED_USER_STATUS', payload: userStatuses[otherUserId] || false });
            }
        } catch (error) {
            console.error("Error selecting chat:", error);
            toast.error("Error selecting chat");
        }
        const chatRef = doc(firestoreDb, 'chats', chatId);
        updateDoc(chatRef, {
            'lastMessage.unread': false,
            'lastMessage.status': 'read'
        });
    };
    return (
        <div className={`side-chat-bar-container ${state.sidebarClose ? "sidebar-close-chat" : ""}`}>
            {!state.isBurgerOpen &&
                <div onClick={() => dispatch({ type: 'SET_IS_BURGER_OPEN', payload: !state.isBurgerOpen })}
                    className={`burger-menu ${state.isBurgerOpen ? "open" : ""}`}>
                    <div className="burger-line"></div>
                    <div className="burger-line"></div>
                    <div className="burger-line"></div>
                </div>
            }
            <div className={`search-container ${isSearching ? 'active-search' : ''}`}>
                <input
                    type="text"
                    placeholder="Search users by @name..."
                    value={searchQuery}
                    onChange={(e) => {
                        const value = e.target.value;
                        setSearchQuery(value);
                        searchUsers(value);
                    }}
                    onFocus={() => setIsSearching(true)}
                    onBlur={() => setTimeout(() => setIsSearching(false), 200)}
                />
                {(isSearching || searchQuery) && (
                    <div className="search-results">
                        {filteredUsers.length > 0 ? (
                            filteredUsers.map((user) => (
                                <div
                                    key={user.id}
                                    className="search-result-item"
                                    onClick={() => {
                                        handleUserSelect(user);
                                        setIsSearching(false);
                                    }}
                                >
                                    <img
                                        src={user.photoURL || 'default-avatar.png'}
                                        alt={user.displayName}
                                        className="user-avatar"
                                    />
                                    <div className="user-info">
                                        <span>{user.displayName}</span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="no-results">No users found</div>
                        )}
                    </div>
                )}
            </div>
            <div className={`side-chat-bar-header ${isSearching ? 'search-active' : ''}`}>
                {contacts.length > 0 ? (
                    contacts
                        .sort((a, b) => {
                            const messageA = chatMessages[a.chatId];
                            const messageB = chatMessages[b.chatId];
                            const timeA = messageA?.timestamp || 0;
                            const timeB = messageB?.timestamp || 0;
                            return timeB - timeA;
                        })
                        .map(contact => {
                            const [user1, user2] = contact.chatId.split('-');
                            const otherUserId = currentUserId === user1 ? user2 : user1;
                            const isOnline = userStatuses[otherUserId] || false;

                            return (
                                <div
                                    key={contact.chatId}
                                    className={`contact-item ${
                                        chatMessages[contact.chatId]?.senderId !== user.id &&
                                        chatMessages[contact.chatId]?.unread
                                            ? 'unread'
                                            : ''
                                    } ${isOnline ? 'online' : 'offline'}`}
                                    onClick={() => {
                                        selectChat(contact.chatId);
                                        dispatch({ type: 'SET_SELECTED_USER_NAME', payload: contact.name });
                                        dispatch({ type: 'SET_SELECTED_USER_PHOTO', payload: contact.photoURL });
                                        dispatch({ type: 'SET_SELECTED_USER_BIO', payload: contact.bio }); // Make sure bio is dispatched
                                        console.log(contact.bio);
                                        if (chatMessages[contact.chatId]?.unread) {
                                            const chatRef = doc(firestoreDb, 'chats', contact.chatId);
                                            updateDoc(chatRef, {
                                                'lastMessage.unread': false
                                            });
                                        }
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
                            );
                        })
                ) : (
                    <div className="no-contacts">
                        <span>No contacts chats</span>
                    </div>
                )}
            </div>
        </div>
    );
}