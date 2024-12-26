import './chatingheader.scss';
import { MdBlock } from "react-icons/md";
import { MdReport } from "react-icons/md";
import { MdDelete } from "react-icons/md";
import { AiOutlineSound } from "react-icons/ai";
import { VscAccount } from "react-icons/vsc";
import { IoSettings } from "react-icons/io5";
import { SlArrowLeft } from "react-icons/sl";
import { SlArrowRight } from "react-icons/sl";
import { useGlobalContext } from '../../../context';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc, deleteDoc, collection, getDocs } from 'firebase/firestore';
import { ref, remove } from 'firebase/database';
import { firestoreDb, realtimeDb } from '../../../api/firebaseConfig';
import toast from 'react-hot-toast';

function ChatingHeader() {
    const { state, dispatch } = useGlobalContext();
    const navigate = useNavigate();
    const [windowWidth, setWindowWidth] = useState(window.innerWidth);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    useEffect(() => {
        const handleResize = () => {
            setWindowWidth(window.innerWidth);
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleArrowClick = () => {
        if (windowWidth < 1050) {
            navigate('/');
            dispatch({ type: "SET_SELECTED_CHAT", payload: null });
            dispatch({ type: "SET_SELECTED_USER_NAME", payload: null });
            dispatch({ type: "SET_SELECTED_USER_PHOTO", payload: null });
            dispatch({ type: "SET_CURRENT_CHAT", payload: null });
        } else {
            dispatch({ type: "SIDEBAR_CLOSE", payload: !state.sidebarClose });
        }
    };

    const handleSettingsClick = (e) => {
        e.stopPropagation();
        setIsSettingsOpen(!isSettingsOpen);
    };

    useEffect(() => {
        const closeSettings = () => setIsSettingsOpen(false);
        document.addEventListener('click', closeSettings);
        return () => document.removeEventListener('click', closeSettings);
    }, []);

    const handleDeleteChat = async (e) => {
        e.stopPropagation();
        setIsSettingsOpen(false);
        if (!state.selectedChat) {
            toast.error('No chat selected');
            return;
        }

        if (!window.confirm('Are you sure you want to delete this chat?')) {
            return;
        }

        try {
            const chatRef = doc(firestoreDb, 'chats', state.selectedChat);
            const chatDoc = await getDoc(chatRef);
            
            if (!chatDoc.exists()) return;
            
            const chatData = chatDoc.data();
            const participants = chatData.participants;

            const usersCollectionRef = collection(firestoreDb, 'users');
            const usersSnapshot = await getDocs(usersCollectionRef);
            const users = [];
            
            usersSnapshot.forEach(doc => {
                const userData = doc.data();
                if (participants.includes(userData.id)) {
                    users.push({
                        docId: doc.id,
                        ...userData
                    });
                }
            });

            const userUpdates = users.map(user => {
                const userRef = doc(firestoreDb, 'users', user.docId);
                const updatedContacts = (user.contacts || []).filter(
                    contact => contact.chatId !== state.selectedChat
                );
                
                return updateDoc(userRef, { contacts: updatedContacts });
            });

            const messagesRef = ref(realtimeDb, `chats/${state.selectedChat}/messages`);
            await remove(messagesRef);

            await deleteDoc(chatRef);

            await Promise.all(userUpdates);

            dispatch({ type: "SET_SELECTED_CHAT", payload: null });
            dispatch({ type: "SET_SELECTED_USER_NAME", payload: null });
            dispatch({ type: "SET_SELECTED_USER_PHOTO", payload: null });
            toast.success('Chat deleted successfully');
            navigate('/');

        } catch (error) {
            toast.error('Error deleting chat');
            console.error("Error deleting chat:", error);
        }
    };

    return (
        <div className="chating-header">
                <div>
                    {!state.sidebarClose ? (
                        <SlArrowLeft
                            className='chating-header-left-arrow'
                            onClick={handleArrowClick}
                            style={{
                                width: "40px",
                                height: "40px",
                                fontSize: "1.5rem",
                                padding: "10px",
                                cursor: "pointer",
                                color: "white",
                                backgroundColor: "#17212b",
                                borderRadius: "50%",
                            }}
                        />
                    ) : (
                        <SlArrowRight
                            className='chating-header-left-arrow'
                            onClick={handleArrowClick}
                            style={{
                                width: "40px",
                                height: "40px",
                                fontSize: "1.5rem",
                                padding: "10px",
                                cursor: "pointer",
                                color: "white",
                                backgroundColor: "#17212b",
                                borderRadius: "50%",
                            }}
                        />
                    )}
                </div>
            <div className="chating-user-info">
                <div className="chating-user-logo">
                    <img
                        width={40}
                        height={40}
                        src={state.selectedUserPhoto || 'default-avatar.png'}
                        alt={state.selectedUserName || 'User'}
                    />
                </div>
                <div className="chating-user-name">
                    <h1>{state.selectedUserName || 'Select a chat'}</h1>
                </div>
            </div>
            <div className="chating-user-setting">
                <IoSettings
                    className="chating-user-settings"
                    onClick={handleSettingsClick}
                    style={{ color: "white", width: "48px", height: "48px", fontSize: "1.5rem", padding: "10px", cursor: "pointer" }}
                />
                <div className={`chating-setting ${isSettingsOpen ? 'active' : ''}`}>
                    <div>
                        <span>Profile</span>
                        <span>
                            <VscAccount />
                        </span>
                    </div>
                    <div>
                        <span>Mute</span>
                        <span>
                            <AiOutlineSound />
                        </span>
                    </div>
                    <div>
                        <span>Block User</span>
                        <span>
                            <MdBlock />
                        </span>
                    </div>
                    <div>
                        <span>Report</span>
                        <span>
                            <MdReport />
                        </span>
                    </div>
                    <div onClick={handleDeleteChat} role="button" tabIndex={0}>
                        <span>Delete Chat</span>
                        <span>
                            <MdDelete />
                        </span>
                    </div>
                </div>
            </div>
        </div>
    )
}
export default ChatingHeader