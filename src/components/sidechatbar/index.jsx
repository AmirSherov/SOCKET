import "./sidechatbar.scss";
import { useGlobalContext } from "../../context";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { firestoreDb } from '../../api/firebaseConfig';
import { collection, query, where, doc, onSnapshot, getDocs, getDoc, setDoc, updateDoc, arrayUnion, serverTimestamp } from 'firebase/firestore';
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
                    contact.photoURL !== actualUserData.photoURL
                )) {
                    const updatedContact = {
                        ...contact,
                        name: actualUserData.displayName,
                        photoURL: actualUserData.photoURL
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
        if (!searchTerm.trim()) {
            setFilteredUsers([]);
            return;
        }

        try {
            const usersRef = collection(firestoreDb, 'users');
            const querySnapshot = await getDocs(usersRef);

            const users = [];
            querySnapshot.forEach((doc) => {
                const userData = doc.data();
                if (userData && userData.nickname && userData.id !== currentUserId) {
                    const searchValue = searchTerm.startsWith('@')
                        ? searchTerm.toLowerCase()
                        : '@' + searchTerm.toLowerCase();

                    if (userData.nickname.toLowerCase().includes(searchValue.toLowerCase())) {
                        users.push({
                            id: userData.id,
                            nickname: userData.nickname,
                            photoURL: userData.photoURL,
                            displayName: userData.displayName,  // Add displayName to the user object
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

    const handleUserSelect = async (selectedUser) => {
        const chatId = [currentUserId, selectedUser.id].sort().join('-');

        try {
            // Найдем документы обоих пользователей
            const usersRef = collection(firestoreDb, 'users');
            const [currentUserDocs, selectedUserDocs] = await Promise.all([
                getDocs(query(usersRef, where("id", "==", currentUserId))),
                getDocs(query(usersRef, where("id", "==", selectedUser.id)))
            ]);

            const currentUserDoc = currentUserDocs.docs[0];
            const selectedUserDoc = selectedUserDocs.docs[0];

            const currentUserData = currentUserDoc.data();
            const selectedUserData = selectedUserDoc.data();

            // Проверяем существование чата в контактах
            const currentUserHasChat = currentUserData.contacts?.some(contact => contact.chatId === chatId) || false;
            const selectedUserHasChat = selectedUserData.contacts?.some(contact => contact.chatId === chatId) || false;

            // Если чат не существует хотя бы у одного из пользователей
            if (!currentUserHasChat || !selectedUserHasChat) {
                // Создаем чат если его нет
                const chatRef = doc(firestoreDb, 'chats', chatId);
                const chatDoc = await getDoc(chatRef);

                if (!chatDoc.exists()) {
                    await setDoc(chatRef, {
                        participants: [currentUserId, selectedUser.id],
                        createdAt: serverTimestamp(),
                        lastMessage: null
                    });
                }

                // Подготавливаем данные контактов
                const contactData = {
                    chatId: chatId,
                    name: selectedUser.displayName,  // Use displayName here
                    photoURL: selectedUser.photoURL
                };

                const otherContactData = {
                    chatId: chatId,
                    name: user.displayName,
                    photoURL: user.photoURL
                };

                // Обновляем контакты только если их нет
                const updatePromises = [];

                if (!currentUserHasChat) {
                    updatePromises.push(
                        updateDoc(doc(firestoreDb, 'users', currentUserDoc.id), {
                            contacts: arrayUnion(contactData)
                        })
                    );
                }

                if (!selectedUserHasChat) {
                    updatePromises.push(
                        updateDoc(doc(firestoreDb, 'users', selectedUserDoc.id), {
                            contacts: arrayUnion(otherContactData)
                        })
                    );
                }

                await Promise.all(updatePromises);
            }

            dispatch({ type: "SET_SELECTED_CHAT", payload: chatId });
            dispatch({ type: "SET_SELECTED_USER_NAME", payload: selectedUser.displayName });
            dispatch({ type: "SET_SELECTED_USER_PHOTO", payload: selectedUser.photoURL });
            setSearchQuery('');
            setFilteredUsers([]);
            toast.success('Chat created successfully');
        } catch (error) {
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

    const selectChat = (chatId) => {
        if (windowWidth < 600) {
            navigate(`/chating/${chatId}`);
        } else {
            dispatch({ type: 'SET_SELECTED_CHAT', payload: chatId });
        }
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
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => {
                        setSearchQuery(e.target.value);
                        searchUsers(e.target.value);
                    }}
                    onFocus={() => setIsSearching(true)}
                />
                {isSearching && filteredUsers.length > 0 && (
                    <div className="search-results">
                        {filteredUsers.map((user) => (
                            <div
                                key={user.id}
                                className="search-result-item"
                                onClick={() => handleUserSelect(user)}
                            >
                                <img
                                    src={user.photoURL || 'default-avatar.png'}
                                    alt={user.nickname}
                                    className="user-avatar"
                                />
                                <span>{user.nickname}</span>
                            </div>
                        ))}
                    </div>
                )}
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