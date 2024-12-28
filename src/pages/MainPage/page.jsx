import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, where, getDocs } from 'firebase/firestore';
import { firestoreDb } from '../../api/firebaseConfig';
import { useGlobalContext } from "../../context";
import InfoSideBar from "../../components/infosidebar";
import Chating from "../../components/chating/chatid";
import Sidechatbar from "../../components/sidechatbar";
import Loader from "../../components/ui/Loader";
import SideContactBar from "../../components/sidecontactbar/index"
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import "./mainpage.scss";

export default function MainPage() {
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const { state, dispatch } = useGlobalContext();
    
    // Add online status tracking
    useOnlineStatus(state.user?.id);

    useEffect(() => {
        const checkAuth = async () => {
            const userId = localStorage.getItem('userId');
            if (!userId) {
                navigate('/login');
                return;
            }
            try {
                // Создаем запрос для поиска пользователя по id
                const usersRef = collection(firestoreDb, 'users');
                const q = query(usersRef, where("id", "==", userId));
                const querySnapshot = await getDocs(q);

                if (querySnapshot.empty) {
                    throw new Error('User not found');
                }

                const userData = querySnapshot.docs[0].data();
                dispatch({
                    type: 'SET_USER',
                    payload: userData
                });
            } catch (error) {
                console.error('Error loading user:', error);
            } finally {
                setLoading(false);
            }
        };

        checkAuth();
    }, [dispatch, navigate]);

    if (loading) {
        return <Loader />;
    }

    return (
        <div className={`main-page-container ${state.sidebarClose ? "sidebar-close-main" : ""}`}>
            <InfoSideBar />
            {state.activeTab === 'chats' ? <Sidechatbar /> : <SideContactBar />}
            <Chating />
        </div>
    );
}
