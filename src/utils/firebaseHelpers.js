import { doc, updateDoc, getDoc, arrayUnion, collection, query, where, getDocs } from 'firebase/firestore';
import { firestoreDb } from '../api/firebaseConfig';

export const updateUserContacts = async (userId, contactData) => {
    try {
        const usersRef = collection(firestoreDb, 'users');
        const q = query(usersRef, where("uid", "==", userId)); // Изменено с id на uid
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const userDoc = querySnapshot.docs[0];
            const userRef = doc(firestoreDb, 'users', userDoc.id);
            const userData = userDoc.data();
            const contacts = userData.contacts || [];
            
            // Проверяем существующий контакт
            const existingContact = contacts.find(c => c.chatId === contactData.chatId);

            if (!existingContact) {
                await updateDoc(userRef, {
                    contacts: arrayUnion(contactData)
                });
            }
        }
    } catch (error) {
        console.error("Error updating contacts:", error);
    }
};

export const updateLastMessage = async (userId, chatId, message) => {
    try {
        const usersRef = collection(firestoreDb, 'users');
        const q = query(usersRef, where("uid", "==", userId)); // Изменено с id на uid
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const userDoc = querySnapshot.docs[0];
            const userRef = doc(firestoreDb, 'users', userDoc.id);
            const userData = userDoc.data();
            const contacts = userData.contacts || [];
            
            // Обновляем последнее сообщение
            const updatedContacts = contacts.map(contact => {
                if (contact.chatId === chatId) {
                    return {
                        ...contact,
                        lastMessage: message
                    };
                }
                return contact;
            });

            await updateDoc(userRef, {
                contacts: updatedContacts
            });
        }
    } catch (error) {
        console.error("Error updating last message:", error);
    }
};