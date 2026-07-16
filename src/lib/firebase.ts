import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore, getFirestore, connectFirestoreEmulator } from "firebase/firestore";

// Read Firebase configuration from our secret .env.local file
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase only once (prevents duplicate errors when Next.js reloads)
let app;
let dbInstance: ReturnType<typeof getFirestore>;

if (!getApps().length) {
    app = initializeApp(firebaseConfig);
    try {
        dbInstance = initializeFirestore(app, {
            experimentalForceLongPolling: true,
            // Increase the cache size to reduce network dependency
            cacheSizeBytes: 50 * 1024 * 1024, // 50MB
        });
    } catch {
        dbInstance = getFirestore(app);
    }
} else {
    app = getApp();
    dbInstance = getFirestore(app);
}

// Export the Auth and Firestore Database instances to use across our app
export const auth = getAuth(app);
export const db = dbInstance;
export default app;