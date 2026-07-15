import {
    collection,
    doc,
    setDoc,
    getDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy
} from "firebase/firestore";
import { db } from "./firebase";
import { LandingPage, UserProfile } from "@/types";

// ==========================================
// USER PROFILE OPERATIONS
// ==========================================
export async function createOrUpdateUserProfile(uid: string, data: Partial<UserProfile>): Promise<void> {
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
        const newUserProfile: UserProfile = {
            uid,
            email: data.email || null,
            displayName: data.displayName || null,
            photoURL: data.photoURL || null,
            plan: 'free',
            pagesCreated: 0,
            createdAt: Date.now(),
            ...data
        };
        await setDoc(userRef, newUserProfile);
    } else {
        await updateDoc(userRef, data);
    }
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
    const userRef = doc(db, "users", uid);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
        return snap.data() as UserProfile;
    }
    return null;
}

// ==========================================
// LANDING PAGE OPERATIONS
// ==========================================

/**
 * Creates a new landing page in Firestore under the 'pages' collection
 */
export async function createLandingPage(page: Omit<LandingPage, "id">): Promise<string> {
    // Generate a new document reference with a unique ID automatically
    const newDocRef = doc(collection(db, "pages"));

    const pageData: LandingPage = {
        ...page,
        id: newDocRef.id,
        createdAt: Date.now(),
        updatedAt: Date.now(),
    };

    await setDoc(newDocRef, pageData);
    return newDocRef.id;
}

/**
 * Fetches a single landing page by its unique ID
 */
export async function getLandingPageById(pageId: string): Promise<LandingPage | null> {
    const docRef = doc(db, "pages", pageId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
        return snap.data() as LandingPage;
    }
    return null;
}

/**
 * Fetches all landing pages belonging to a specific user
 */
export async function getUserLandingPages(userId: string): Promise<LandingPage[]> {
    const pagesQuery = query(
        collection(db, "pages"),
        where("userId", "==", userId),
        orderBy("updatedAt", "desc")
    );

    const querySnapshot = await getDocs(pagesQuery);
    const pages: LandingPage[] = [];
    querySnapshot.forEach((docSnap) => {
        pages.push(docSnap.data() as LandingPage);
    });

    return pages;
}

/**
 * Updates an existing landing page with new data (like edits or reordered sections)
 */
export async function updateLandingPage(pageId: string, updates: Partial<LandingPage>): Promise<void> {
    const docRef = doc(db, "pages", pageId);
    await updateDoc(docRef, {
        ...updates,
        updatedAt: Date.now(),
    });
}

/**
 * Deletes a landing page completely from Firestore
 */
export async function deleteLandingPage(pageId: string): Promise<void> {
    const docRef = doc(db, "pages", pageId);
    await deleteDoc(docRef);
}