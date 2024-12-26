import "./infosidebar.scss";
import { FaUserCircle, FaComments, FaCog, FaAddressBook } from "react-icons/fa";
import { useGlobalContext } from "../../context";
import AccauntSettings from "../accauntSettings/index"
import { useState, useRef, useEffect } from "react";

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

    return (
        <>
            <div ref={sidebarRef} className={`info-side-bar-container ${state.isBurgerOpen ? "isBurgerOpen" : ""}`}>
                <div className="sidebar-item-logo">
                    <div className="item-text"><i>SOCKET</i></div>
                </div>
                <div className="sidebar-item">
                    <img width={40} height={40} src={state.user?.photoURL} alt="Account Logo" />
                    <div className="item-text">{state.user?.displayName}</div>
                </div>
                <div className="sidebar-item">
                    <FaAddressBook className="sidebar-icon" />
                    <div className="item-text">Contacts</div>
                </div>
                <div className="sidebar-item">
                    <FaComments className="sidebar-icon" />
                    <div className="item-text">Chats</div>
                </div>
                <div onClick={() => setIsOpen(true)} className="sidebar-item">
                    <FaCog className="sidebar-icon" />
                    <div className="item-text">Settings</div>
                </div>
            </div>
            <AccauntSettings isOpen={isOpen} onClose={() => setIsOpen(false)} />
        </>
    );
}
