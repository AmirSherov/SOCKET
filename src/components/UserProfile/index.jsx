import './userprofile.scss';
import { IoClose } from "react-icons/io5";
import { useGlobalContext } from '../../context';
function UserProfile({ isOpen, onClose, userData }) {
    const { state } = useGlobalContext();
    if (!isOpen) return null;
    console.log(userData);
    return (
        <div className="selected-user-profile-overlay" onClick={onClose}>
            <div className="selected-user-profile-modal" onClick={e => e.stopPropagation()}>
                <button className="selected-close-button-profile-info" onClick={onClose}>
                    <IoClose />
                </button>
                <div className="selected-user-profile-content">
                    <img
                        src={userData.photo || 'default-avatar.png'}
                        alt={userData.name}
                        className="selected-user-profile-avatar"
                    />
                    <h2 className="selected-user-profile-name">{userData.name}</h2>
                    <p className="selected-user-profile-nickname">@{userData.nickname || 'username'}</p>
                    <p className="selected-user-profile-bio">
                        {state.selectedUserBio || 'No bio available'}
                    </p>
                    <div className="selected-user-profile-info-section">
                        <div className="info-item">
                            <span className="info-label">Username:</span>
                            <span className="info-value">@{userData.nickname || 'username'}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default UserProfile;
