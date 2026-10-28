import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyCn_dJ21ga0CuErOdvnYxO7mwIm9elFie8',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'login-data-680b9.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'login-data-680b9',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'login-data-680b9.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '153701949407',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:153701949407:web:166741a11eb5c58385ae6a',
};

const app = initializeApp(firebaseConfig);

export const firebaseAuth = getAuth(app);
