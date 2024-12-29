import "./infosidebar.scss";
import { FaComments, FaCog, FaAddressBook } from "react-icons/fa";
import { useGlobalContext } from "../../context";
import AccauntSettings from "../accauntSettings/index"
import { useState, useRef, useEffect } from "react";
import { motion } from 'framer-motion';  // Add this import

export default function InfoSideBar() {
    const [isOpen, setIsOpen] = useState(false);
    const { state, dispatch } = useGlobalContext();
    const sidebarRef = useRef(null);
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (sidebarRef.current && 
                !sidebarRef.current.contains(event.target) && 
                state.isBurgerOpen) {
                dispatch({ type: 'SET_IS_BURGER_OPEN', payload: false });
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('touchstart', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, [state.isBurgerOpen, dispatch]);

    const handleTabClick = (tab) => {
        dispatch({ type: 'SET_ACTIVE_TAB', payload: tab });
        if(state.activeTab !== tab) {
            dispatch({ type: 'SET_SELECTED_CHAT', payload: null });
        }
    };
    return (
        <>
            <motion.div 
                ref={sidebarRef} 
                className={`info-side-bar-container ${state.isBurgerOpen ? "isBurgerOpen" : ""}`}
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
            >
                <div className="sidebar-item-logo">
                    <div className="item-text"><i>SOCKET</i></div>
                </div>
                <div className="sidebar-item user-info-sideinfobar">
                    <img width={40} height={40} src={state.user?.photoURL} alt="Account Logo" />
                    <div className="item-text user-name">{state.user?.displayName}</div>
                </div>
                <div className={`sidebar-item ${state.activeTab === 'contacts' ? 'active' : ''}`} 
                     onClick={() => handleTabClick('contacts')}>
                    <FaAddressBook className="sidebar-icon" />
                    <div className="item-text">Contacts</div>
                </div>
                <div className={`sidebar-item ${state.activeTab === 'chats' ? 'active' : ''}`} 
                     onClick={() => handleTabClick('chats')}>
                    <FaComments className="sidebar-icon" />
                    <div className="item-text">Chats</div>
                </div>
                <div onClick={() => setIsOpen(true)} className="sidebar-item">
                    <FaCog className="sidebar-icon" />
                    <div className="item-text">Settings</div>
                </div>
            </motion.div>
            <AccauntSettings isOpen={isOpen} onClose={() => setIsOpen(false)} />
        </>
    );
}
