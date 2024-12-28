import React, { createContext, useReducer, useContext } from 'react';
const initialState = {
    sidebarClose: false,
    user: null,
    selectedChat: null,  // ID текущего выбранного чата
    photoUrl: null,
    selectedUserName: null,
    selectedUserPhoto: null,
    currentChat: null,   // Полные данные текущего чата
    isBurgerOpen: false,
    selectedUserBio: null,
    selectedUserId: null,
    activeTab: 'chats' // Add this new property
}
function globalReducer(state, action) {
    switch (action.type) {
        case 'SET_COUNT':
            return { ...state, count: action.payload };
        case 'SIDEBAR_CLOSE':
            return { ...state, sidebarClose: action.payload };
        case 'SET_SELECTED_CHAT':
            return { ...state, selectedChat: action.payload };
        case 'SET_USER':
            return { ...state, user: action.payload };
        case 'SET_PHOTO_URL':
            return { ...state, photoUrl: action.payload };
        case 'SET_SELECTED_USER_NAME':
            return { ...state, selectedUserName: action.payload };
        case 'SET_SELECTED_USER_PHOTO':
            return { ...state, selectedUserPhoto: action.payload };
        case 'SET_CURRENT_CHAT':
            return { ...state, currentChat: action.payload };
        case 'SET_IS_BURGER_OPEN':
            return { ...state, isBurgerOpen: action.payload };
        case 'SET_SELECTED_USER_BIO':
            return { ...state, selectedUserBio: action.payload };
        case 'SET_ACTIVE_TAB':
            return { ...state, activeTab: action.payload };
        case "SET_SELECTED_USER_ID":
            return { ...state, selectedUserId: action.payload };
        default:
            throw new Error(`Unhandled action type: ${action.type}`);
    }
}

const GlobalContext = createContext();

export function GlobalProvider({ children }) {
    const [state, dispatch] = useReducer(globalReducer, initialState);

    return (
        <GlobalContext.Provider value={{ state, dispatch }}>
            {children}
        </GlobalContext.Provider>
    );
}

export function useGlobalContext() {
    const context = useContext(GlobalContext);
    if (!context) {
        throw new Error('useGlobalContext must be used within a GlobalProvider');
    }
    return context;
}