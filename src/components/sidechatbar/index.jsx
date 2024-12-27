import "./sidechatbar.scss";
import { useGlobalContext } from "../../context";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { firestoreDb } from '../../api/firebaseConfig';
import { collection, query, where, doc, onSnapshot, getDocs, setDoc, updateDoc, getDoc, arrayUnion, serverTimestamp } from 'firebase/firestore';
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
    })
    useEffect(() => {
        if (!user?.id) {
            setLoading(false);
            return;
        }

        // Подписка на контакты текущего пользователя
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

    // Добавляем новый useEffect для отслеживания изменений данных пользователей
    useEffect(() => {
        if (contacts.length === 0) return;

        // Получаем ID всех пользователей из контактов
        const contactUserIds = contacts.map(contact => {
            const [user1, user2] = contact.chatId.split('-');
            return currentUserId === user1 ? user2 : user1;
        });

        // Создаем подписку на данные пользователей
        const usersRef = collection(firestoreDb, 'users');
        const q = query(usersRef, where("id", "in", contactUserIds));

        const unsubscribeUsers = onSnapshot(q, async (snapshot) => {
            const updates = [];
            const userDocs = {};

            // Создаем map пользователей для быстрого доступа
            snapshot.docs.forEach(doc => {
                userDocs[doc.data().id] = doc.data();
            });

            // Проверяем каждый контакт
            contacts.forEach(contact => {
                const [user1, user2] = contact.chatId.split('-');
                const contactUserId = currentUserId === user1 ? user2 : user1;
                const actualUserData = userDocs[contactUserId];

                if (actualUserData && (
                    contact.name !== actualUserData.displayName ||
                    contact.photoURL !== actualUserData.photoURL ||
                    contact.bio !== actualUserData.bio  // Добавляем проверку bio
                )) {
                    const updatedContact = {
                        ...contact,
                        name: actualUserData.displayName,
                        photoURL: actualUserData.photoURL,
                        bio: actualUserData.bio  // Добавляем bio
                    };
                    updates.push(updatedContact);
                }
            });

            // Если есть обновления, применяем их
            if (updates.length > 0) {
                try {
                    const currentUserQuery = query(usersRef, where("id", "==", currentUserId));
                    const currentUserDocs = await getDocs(currentUserQuery);

                    if (!currentUserDocs.empty) {
                        const currentUserDoc = currentUserDocs.docs[0];
                        const updatedContacts = contacts.map(contact => {
                            const update = updates.find(u => u.chatId === contact.chatId);
                            return update || contact;
                        });

                        await updateDoc(currentUserDoc.ref, {
                            contacts: updatedContacts
                        });
                    }
                } catch (error) {
                    console.error("Error updating contacts:", error);
                }
            }
        });

        return () => unsubscribeUsers();
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
                    const searchValue = searchTerm.substring(1).toLowerCase(); // Remove '@' for search
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
        ...contacts[i % contacts.length], // Дублирует существующий контакт
        chatId: `test-${i}`, // Генерирует уникальный `chatId` для каждого нового контакта
        name: `Test User ${i + 1}`, // Генерирует уникальное имя
        photoURL: 'default-avatar.png' // Устанавливает аватар по умолчанию
    }))];

    const handleUserSelect = async (selectedUser) => {
        const chatId = [currentUserId, selectedUser.id].sort().join('-');

        try {
            // Get both users' documents
            const usersRef = collection(firestoreDb, 'users');
            const [currentUserDocs, selectedUserDocs] = await Promise.all([
                getDocs(query(usersRef, where("id", "==", currentUserId))),
                getDocs(query(usersRef, where("id", "==", selectedUser.id)))
            ]);

            const currentUserDoc = currentUserDocs.docs[0];
            const selectedUserDoc = selectedUserDocs.docs[0];

            const currentUserData = currentUserDoc.data();
            const selectedUserData = selectedUserDoc.data();

            // Check if chat exists in contacts
            const currentUserHasChat = currentUserData.contacts?.some(contact => contact.chatId === chatId) || false;
            const selectedUserHasChat = selectedUserData.contacts?.some(contact => contact.chatId === chatId) || false;

            // If chat doesn't exist for at least one user
            if (!currentUserHasChat || !selectedUserHasChat) {
                // Create chat if it doesn't exist
                const chatRef = doc(firestoreDb, 'chats', chatId);
                const chatDoc = await getDoc(chatRef);

                if (!chatDoc.exists()) {
                    await setDoc(chatRef, {
                        participants: [currentUserId, selectedUser.id],
                        createdAt: serverTimestamp(),
                        lastMessage: {
                            text: 'Начало диалога',
                            timestamp: serverTimestamp(),
                            senderId: currentUserId,
                            unread: false
                        }
                    });
                }

                // Prepare contact data for both users
                const currentUserContactData = {
                    chatId: chatId,
                    name: selectedUserData.displayName,
                    photoURL: selectedUserData.photoURL,
                    bio: selectedUserData.bio || ''
                };

                const selectedUserContactData = {
                    chatId: chatId,
                    name: currentUserData.displayName,
                    photoURL: currentUserData.photoURL,
                    bio: currentUserData.bio || ''
                };

                // Update contacts only if needed
                const updatePromises = [];

                if (!currentUserHasChat) {
                    updatePromises.push(
                        updateDoc(currentUserDoc.ref, {
                            contacts: arrayUnion(currentUserContactData)
                        })
                    );
                }

                if (!selectedUserHasChat) {
                    updatePromises.push(
                        updateDoc(selectedUserDoc.ref, {
                            contacts: arrayUnion(selectedUserContactData)
                        })
                    );
                }

                await Promise.all(updatePromises);
            }

            // Update the UI state
            dispatch({ type: "SET_SELECTED_CHAT", payload: chatId });
            dispatch({ type: "SET_SELECTED_USER_NAME", payload: selectedUser.displayName });
            dispatch({ type: "SET_SELECTED_USER_PHOTO", payload: selectedUser.photoURL });
            setSearchQuery('');
            setFilteredUsers([]);
            toast.success('Chat created successfully');

        } catch (error) {
            console.error("Error creating chat:", error);
            toast.error('Error creating chat');
        }
    };

    if (loading) {
        return (
            <div className="side-chat-bar-container">
                <Loader />
            </div>
        );
    }

    // В функции selectChat добавляем обновление статуса сообщения
    const selectChat = async (chatId) => {
        if (windowWidth < 600) {
            navigate(`/chating/${chatId}`);
            dispatch({ type: 'SET_SELECTED_CHAT', payload: chatId });
        } else {
            dispatch({ type: 'SET_SELECTED_CHAT', payload: chatId });
        }

        // Find the other user's ID
        const [user1, user2] = chatId.split('-');
        const otherUserId = user1 === currentUserId ? user2 : user1;

        // Fetch the other user's data to get their bio
        try {
            const usersRef = collection(firestoreDb, 'users');
            const q = query(usersRef, where("id", "==", otherUserId));
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
                const userData = querySnapshot.docs[0].data();
                dispatch({ type: 'SET_SELECTED_USER_BIO', payload: userData.bio || 'No bio available' });
            }
        } catch (error) {
            console.error("Error fetching user bio:", error);
            dispatch({ type: 'SET_SELECTED_USER_BIO', payload: 'No bio available' });
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
            <div className="search-container">
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
                    onBlur={() => {
                        // Delay hiding results to allow for clicking
                        setTimeout(() => setIsSearching(false), 200);
                    }}
                />
                {isSearching && searchQuery && filteredUsers.length > 0 && (
                    <div className="search-results">
                        {filteredUsers.map((user) => (
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
                        ))}
                    </div>
                )}
            </div>
            <div className="side-chat-bar-header">
                {contacts.length > 0 ? (
                    contacts
                        .sort((a, b) => {
                            const messageA = chatMessages[a.chatId];
                            const messageB = chatMessages[b.chatId];
                            const timeA = messageA?.timestamp || 0;
                            const timeB = messageB?.timestamp || 0;
                            return timeB - timeA;
                        })
                        .map(contact => (
                            <div
                                key={contact.chatId}
                                className={`contact-item ${chatMessages[contact.chatId]?.senderId !== user.id &&
                                    (chatMessages[contact.chatId]?.unread || chatMessages[contact.chatId]?.status !== 'read')
                                    ? 'unread'
                                    : ''
                                    }`}
                                onClick={() => {
                                    selectChat(contact.chatId);
                                    dispatch({ type: 'SET_SELECTED_USER_NAME', payload: contact.name });
                                    dispatch({ type: 'SET_SELECTED_USER_PHOTO', payload: contact.photoURL });
                                    dispatch({ type: 'SET_SELECTED_USER_BIO', payload: contact.bio }); // Make sure bio is dispatched
                                    console.log(contact.bio);
                                    // Mark message as read when clicked
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
