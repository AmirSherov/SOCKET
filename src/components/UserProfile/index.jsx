import './userprofile.scss';
import { IoClose } from "react-icons/io5";

function UserProfile({ isOpen, onClose, userData }) {
    if (!isOpen) return null;

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
                    <p className="selected-user-profile-bio">{userData.bio || 'No bio available'}</p>
                </div>
            </div>
        </div>
    );
}

export default UserProfile;
