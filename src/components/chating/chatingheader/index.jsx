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
function ChatingHeader() {
    const { state, dispatch } = useGlobalContext();
    
    return(
        <div className="chating-header">
        <div>
            {!state.sidebarClose ? (
                <SlArrowLeft
                    onClick={() => dispatch({ type: "SIDEBAR_CLOSE", payload: !state.sidebarClose })}
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
                    onClick={() => dispatch({ type: "SIDEBAR_CLOSE", payload: !state.sidebarClose })}
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
                style={{ color: "white", width: "48px", height: "48px", fontSize: "1.5rem", padding: "10px", cursor: "pointer" }}
            />
            <div className="chating-setting">
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
                <div>
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