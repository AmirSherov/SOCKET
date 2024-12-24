import "./infosidebar.scss";
import { FaUserCircle, FaComments, FaCog, FaAddressBook } from "react-icons/fa";
import { useGlobalContext } from "../../context";
import AccauntSettings from "../accauntSettings/index"
import { useState } from "react";
export default function InfoSideBar() {
    const [isOpen, setIsOpen] = useState(false);
    const { state } = useGlobalContext();
    return (
        <>
            <div className={`info-side-bar-container ${state.isBurgerOpen ? "isBurgerOpen" : ""}`}>
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
