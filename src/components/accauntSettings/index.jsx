import React, { useState, useEffect } from 'react';
import './accountSettings.scss';
import { auth, firestoreDb } from '../../api/firebaseConfig';
import { signOut } from 'firebase/auth';
import { collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { useGlobalContext } from '../../context/index';
import { FaCamera } from 'react-icons/fa';
import { init } from "filestack-js";
import toast from 'react-hot-toast';
const client = init("A9SyIIcLaSvaAOwQJBrC4z");
export default function AccountSettings({ isOpen, onClose }) {
    const { state } = useGlobalContext();
    const [username, setUsername] = useState('');
    const [nickname, setNickname] = useState('');
    const [bio, setBio] = useState('');
    const [avatar, setAvatar] = useState('');
    useEffect(() => {
        if (state.user) {
            setUsername(state.user.displayName || '');
            setNickname(state.user.nickname || '');
            setBio(state.user.bio || '');
            setAvatar(state.user.photoURL || '');
        }
    }, [state.user]);
    if (!state.user) {
        return null;
    }
    if (!isOpen) return null;
    const openFilestack = () => {
        const options = {
            accept: ['image/*'],
            maxFiles: 1,
            transformations: {
                crop: {
                    force: true,
                    aspectRatio: 1
                }
            },
            onUploadDone: async (response) => {
                if (response.filesUploaded.length > 0) {
                    const uploadedFileUrl = response.filesUploaded[0].url;
                    setAvatar(uploadedFileUrl);
                }
            },
        };
        client.picker(options).open();
    };
    const handleUpdateProfile = async () => {
        try {
            if (!nickname.startsWith('@')) {
                toast.error('Nickname must start with "@"');
                return;
            }

            if (username.length > 8) {
                toast.error("Username must be under 8 characters");
                return;
            }
            const usersRef = collection(firestoreDb, 'users');
            if (nickname !== state.user.nickname) {
                const nicknameQuery = query(usersRef, where("nickname", "==", nickname));
                const querySnapshot = await getDocs(nicknameQuery);

                if (!querySnapshot.empty) {
                    toast.error('This nickname is already taken');
                    return;
                }
            }
            const userQuery = query(usersRef, where("id", "==", state.user.id));
            const userSnapshot = await getDocs(userQuery);

            if (!userSnapshot.empty) {
                const userDoc = userSnapshot.docs[0];
                const updatedData = {
                    displayName: username,
                    nickname: nickname,
                    bio: bio,
                    photoURL: avatar,
                };
                await updateDoc(userDoc.ref, updatedData);
                toast.success('Profile updated successfully!');
                onClose();
                window.location.reload();
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            toast.error('Error updating profile');
        }
    };
    const handleSignOut = async () => {
        try {
            await signOut(auth);
            localStorage.removeItem('userId');
            window.location.href = '/';
            toast.success('Successfully signed out');
        } catch (error) {
            toast.error('Error signing out');
        }
    };
    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h2>Account Settings</h2>
                <div className="avatar-section">
                    <div className="avatar-container">
                        <img src={avatar || 'default-avatar.png'} alt="Profile" />
                        <button className="change-avatar-btn" onClick={openFilestack}>
                            <FaCamera />
                        </button>
                    </div>
                </div>
                <div className="settings-section">
                    <label>
                        Username
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Enter new nickname"
                        />
                    </label>
                </div>
                <div className="settings-section">
                    <label>
                        Nickname
                        <input
                            type="text"
                            value={nickname}
                            onChange={(e) => setNickname(e.target.value)}
                            placeholder="Example: @JohnDoe"
                        />
                    </label>
                </div>
                <div className="settings-section">
                    <label>
                        {'Bio: (max 100 characters)'}
                        <textarea
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                            placeholder="Tell about yourself"
                        />
                    </label>
                </div>
                <div className="modal-buttons">
                    <button className="save-btn" onClick={handleUpdateProfile}>
                        Save Changes
                    </button>
                    <button className="signout-btn" onClick={handleSignOut}>
                        Sign Out
                    </button>
                    <button className="close-btn" onClick={onClose}>
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}