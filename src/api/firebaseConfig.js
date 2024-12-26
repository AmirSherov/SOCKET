import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getMessaging, getToken } from "firebase/messaging";
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import toast from 'react-hot-toast';

const firebaseConfig = {
  apiKey: "AIzaSyC-xtGARuxmJn0uC25SXlz7PSHk33LPXsQ",
  authDomain: "telegram-76dde.firebaseapp.com",
  databaseURL: "https://telegram-76dde-default-rtdb.firebaseio.com",
  projectId: "telegram-76dde",
  storageBucket: "telegram-76dde.firebasestorage.app",
  messagingSenderId: "52195159082",
  appId: "1:52195159082:web:5271f2f4f344b74ac9a753"
};

const app = initializeApp(firebaseConfig);
export const realtimeDb = getDatabase(app);
export const firestoreDb = getFirestore(app);
export const auth = getAuth(app);
export const messaging = getMessaging(app);

const provider = new GoogleAuthProvider();
provider.addScope('profile');
provider.addScope('email');
export const googleProvider = provider;

export const initializeNotifications = async (userId) => {
  if (!checkNotificationSupport()) {
    toast.error('Ваш браузер не поддерживает уведомления');
    return;
  }

  try {
    const existingPermission = Notification.permission;
    if (existingPermission === 'denied') {
      toast.error('Вы заблокировали уведомления. Пожалуйста, измените настройки браузера');
      return;
    }

    if ('serviceWorker' in navigator) {
      // Ждем регистрации и активации Service Worker
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      await navigator.serviceWorker.ready;

      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        // Проверяем существующую подписку
        const existingSubscription = await registration.pushManager.getSubscription();
        if (existingSubscription) {
          await existingSubscription.unsubscribe();
        }

        try {
          const token = await getToken(messaging, {
            serviceWorkerRegistration: registration,
            vapidKey: 'BIfIc5Dr7hpbQe4sF0V_uFyKSrkjSqmup4JH3lwGNCNd00oJDqkxxAV8SSAVcSanY2DUXQmDTA4CtDx_ER1kOGE'
          });

          if (token) {
            const usersRef = collection(firestoreDb, 'users');
            const q = query(usersRef, where("id", "==", userId));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
              const userDoc = querySnapshot.docs[0];
              await updateDoc(doc(firestoreDb, 'users', userDoc.id), {
                fcmToken: token
              });
              console.log('Токен уведомлений успешно сохранен');
              return token;
            }
          }
        } catch (tokenError) {
          console.error('Ошибка получения токена:', tokenError);
          throw tokenError;
        }
      }
    }
  } catch (error) {
    console.error('Ошибка инициализации уведомлений:', error);
    toast.error('Не удалось настроить уведомления');
    throw error;
  }
};

// Функция для проверки поддержки уведомлений
export const checkNotificationSupport = () => {
  if (!('Notification' in window)) {
    console.log('Этот браузер не поддерживает push-уведомления');
    return false;
  }
  if (!('serviceWorker' in navigator)) {
    console.log('Этот браузер не поддерживает service workers');
    return false;
  }
  return true;
};

// Функция для получения текущего токена
export const getCurrentToken = async () => {
  try {
    const currentToken = await getToken(messaging, {
      vapidKey: 'BIfIc5Dr7hpbQe4sF0V_uFyKSrkjSqmup4JH3lwGNCNd00oJDqkxxAV8SSAVcSanY2DUXQmDTA4CtDx_ER1kOGE'
    });
    return currentToken;
  } catch (error) {
    console.error('Ошибка получения текущего токена:', error);
    return null;
  }
};

// Функция для обновления токена
export const updateNotificationToken = async (userId, newToken) => {
  try {
    const usersRef = collection(firestoreDb, 'users');
    const q = query(usersRef, where("id", "==", userId));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const userDoc = querySnapshot.docs[0];
      await updateDoc(doc(firestoreDb, 'users', userDoc.id), {
        fcmToken: newToken
      });
      console.log('Token обновлен успешно');
    }
  } catch (error) {
    console.error('Ошибка обновления токена:', error);
  }
};