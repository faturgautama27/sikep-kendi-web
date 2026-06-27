importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyBdmzD_pzmOukOOOvY6-06Lbds2_fcohMU',
  authDomain: 'sikep-kendi.firebaseapp.com',
  projectId: 'sikep-kendi',
  storageBucket: 'sikep-kendi.firebasestorage.app',
  messagingSenderId: '506725239952',
  appId: '1:506725239952:web:cb6a8fa2e5f75796e31c15',
  vapidKey: 'BARqKYoB-74ejflxLQz_COYrxdvdPGx5rE_aUgsYD2cgjVZOsmrMlhlczcUMuVoHIhKD_D6XSu2q-mxBQkcsczE'
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title || 'Notification';
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/favicon.ico'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
