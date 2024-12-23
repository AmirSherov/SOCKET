import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, where, getDocs } from 'firebase/firestore';
import { firestoreDb } from '../../api/firebaseConfig';
import { useGlobalContext } from "../../context";
import InfoSideBar from "../../components/infosidebar";
import Chating from "../../components/chating/chatid";
import Sidechatbar from "../../components/sidechatbar";
import Loader from "../../components/ui/Loader";
import "./mainpage.scss";

export default function MainPage() {
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const { state, dispatch } = useGlobalContext();

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

                if (!querySnapshot.empty) {
                    const userDoc = querySnapshot.docs[0]; // Предполагается, что id уникален
                    dispatch({
                        type: 'SET_USER',
                        payload: userDoc.data(),
                    });
                } else {
                    // Если пользователь не найден
                    console.error('User not found');
                    navigate('/login');
                }
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
            <Sidechatbar />
            <Chating />
        </div>
    );
}
