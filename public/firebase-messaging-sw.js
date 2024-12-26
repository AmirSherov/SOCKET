importScripts('https://www.gstatic.com/firebasejs/9.1.3/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.1.3/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyC-xtGARuxmJn0uC25SXlz7PSHk33LPXsQ",
  authDomain: "telegram-76dde.firebaseapp.com",
  projectId: "telegram-76dde",
  storageBucket: "telegram-76dde.firebasestorage.app",
  messagingSenderId: "52195159082",
  appId: "1:52195159082:web:5271f2f4f344b74ac9a753"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const notificationTitle = payload.notification.title || 'New Message';
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/logo.webp',
    badge: '/logo.webp',
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});