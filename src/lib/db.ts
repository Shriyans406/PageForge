import {
    collection,
    doc,
    setDoc,
    getDoc,
    getDocs,
    deleteDoc,
    query,
    where,
    orderBy
} from "firebase/firestore";
import { db } from "./firebase";
import { LandingPage, UserProfile } from "@/types";

// Helper to determine if we are running in the browser
const isBrowser = typeof window !== "undefined";

// ==========================================
// USER PROFILE OPERATIONS
// ==========================================

/**
 * Creates or updates a user profile.
 * Falls back to localStorage in the browser if Firestore is offline.
 */
export async function createOrUpdateUserProfile(uid: string, data: Partial<UserProfile>): Promise<void> {
    if (isBrowser) {
        const localProfile = {
            uid,
            email: data.email || null,
            displayName: data.displayName || null,
            photoURL: data.photoURL || null,
            plan: 'free' as const,
            pagesCreated: 0,
            createdAt: Date.now(),
            ...data
        };
        localStorage.setItem(`pageforge_profile_${uid}`, JSON.stringify(localProfile));
    }

    if (db) {
        const userRef = doc(db, "users", uid);
        setDoc(userRef, {
            uid,
            ...data,
            createdAt: data.createdAt || Date.now(),
        }, { merge: true }).catch((e) => {
            console.warn("Background Firestore user profile write failed:", e);
        });
    }
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
    let localProfile: UserProfile | null = null;
    if (isBrowser) {
        const stored = localStorage.getItem(`pageforge_profile_${uid}`);
        if (stored) {
            localProfile = JSON.parse(stored) as UserProfile;
        }
    }

    try {
        const userRef = doc(db, "users", uid);
        const getPromise = getDoc(userRef).then((snap) => {
            if (snap.exists()) {
                const data = snap.data() as UserProfile;
                if (isBrowser) {
                    localStorage.setItem(`pageforge_profile_${uid}`, JSON.stringify(data));
                }
                return data;
            }
            return null;
        });
        
        // Timeout after 1.5 seconds to prevent hanging
        const result = await Promise.race([
            getPromise,
            new Promise<UserProfile | null>((resolve) => setTimeout(() => resolve(localProfile), 1500))
        ]);
        return result;
    } catch (e) {
        console.warn("Firestore error getting user profile, returning local:", e);
        return localProfile;
    }
}

// ==========================================
// LANDING PAGE OPERATIONS
// ==========================================

/**
 * Creates a new landing page.
 * Saves to localStorage instantly and fires off background Firestore request.
 */
export async function createLandingPage(page: Omit<LandingPage, "id">): Promise<string> {
    const generatedId = "local_" + Math.random().toString(36).substring(2, 11);
    const pageData: LandingPage = {
        ...page,
        id: generatedId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
    };

    if (isBrowser) {
        const stored = localStorage.getItem("pageforge_local_pages");
        const localPages: LandingPage[] = stored ? JSON.parse(stored) : [];
        localPages.push(pageData);
        localStorage.setItem("pageforge_local_pages", JSON.stringify(localPages));
    }

    // Fire-and-forget Firestore write
    if (db) {
        const newDocRef = doc(collection(db, "pages"));
        const firestorePageData: LandingPage = {
            ...page,
            id: newDocRef.id,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };
        
        setDoc(newDocRef, firestorePageData)
            .then(() => {
                if (isBrowser) {
                    const stored = localStorage.getItem("pageforge_local_pages");
                    let localPages: LandingPage[] = stored ? JSON.parse(stored) : [];
                    localPages = localPages.map(p => p.id === generatedId ? firestorePageData : p);
                    localStorage.setItem("pageforge_local_pages", JSON.stringify(localPages));
                }
            })
            .catch((err) => {
                console.warn("Background Firestore write failed:", err);
            });
    }

    return generatedId;
}

/**
 * Fetches a single landing page by its unique ID.
 * If the page is prefixed with "local_", returns it immediately from localStorage.
 */
export async function getLandingPageById(pageId: string): Promise<LandingPage | null> {
    let localPage: LandingPage | null = null;
    if (isBrowser) {
        const stored = localStorage.getItem("pageforge_local_pages");
        if (stored) {
            const localPages: LandingPage[] = JSON.parse(stored);
            localPage = localPages.find(p => p.id === pageId) || null;
        }
    }

    // If it's a client-only local page, return it immediately with no Firestore latency
    if (pageId.startsWith("local_")) {
        return localPage;
    }

    try {
        const docRef = doc(db, "pages", pageId);
        const getPromise = getDoc(docRef).then((snap) => {
            if (snap.exists()) {
                const data = snap.data() as LandingPage;
                if (isBrowser) {
                    const stored = localStorage.getItem("pageforge_local_pages");
                    const localPages: LandingPage[] = stored ? JSON.parse(stored) : [];
                    const index = localPages.findIndex(p => p.id === pageId);
                    if (index > -1) {
                        localPages[index] = data;
                    } else {
                        localPages.push(data);
                    }
                    localStorage.setItem("pageforge_local_pages", JSON.stringify(localPages));
                }
                return data;
            }
            return null;
        });

        const result = await Promise.race([
            getPromise,
            new Promise<LandingPage | null>((resolve) => setTimeout(() => resolve(localPage), 1500))
        ]);
        return result;
    } catch (e) {
        console.warn("Firestore error getting page, returning local:", e);
        return localPage;
    }
}

/**
 * Fetches all landing pages belonging to a specific user.
 * Combines localStorage pages and Firestore pages.
 */
export async function getUserLandingPages(userId: string): Promise<LandingPage[]> {
    let localPages: LandingPage[] = [];
    if (isBrowser) {
        const stored = localStorage.getItem("pageforge_local_pages");
        if (stored) {
            const allPages: LandingPage[] = JSON.parse(stored);
            localPages = allPages.filter(p => p.userId === userId);
        }
    }

    try {
        const pagesQuery = query(
            collection(db, "pages"),
            where("userId", "==", userId),
            orderBy("updatedAt", "desc")
        );

        const getPromise = getDocs(pagesQuery).then((querySnapshot) => {
            const fetchedPages: LandingPage[] = [];
            querySnapshot.forEach((docSnap) => {
                fetchedPages.push(docSnap.data() as LandingPage);
            });
            if (isBrowser) {
                const stored = localStorage.getItem("pageforge_local_pages");
                let allPages: LandingPage[] = stored ? JSON.parse(stored) : [];
                allPages = allPages.filter(p => p.userId !== userId);
                allPages.push(...fetchedPages);
                localStorage.setItem("pageforge_local_pages", JSON.stringify(allPages));
            }
            return fetchedPages;
        });

        const result = await Promise.race([
            getPromise,
            new Promise<LandingPage[]>((resolve) => setTimeout(() => resolve(localPages), 1500))
        ]);
        return result;
    } catch (e) {
        console.warn("Firestore error fetching pages, returning local pages:", e);
        return localPages;
    }
}

/**
 * Updates an existing landing page.
 * Falls back to localStorage instantly and fires off background Firestore update.
 */
export async function updateLandingPage(pageId: string, updates: Partial<LandingPage>): Promise<void> {
    if (isBrowser) {
        const stored = localStorage.getItem("pageforge_local_pages");
        if (stored) {
            let localPages: LandingPage[] = JSON.parse(stored);
            localPages = localPages.map(p => {
                if (p.id === pageId) {
                    return { ...p, ...updates, updatedAt: Date.now() };
                }
                return p;
            });
            localStorage.setItem("pageforge_local_pages", JSON.stringify(localPages));
        }
    }

    // Fire-and-forget Firestore write (only if not a client-only local page)
    if (db && !pageId.startsWith("local_")) {
        const docRef = doc(db, "pages", pageId);
        setDoc(docRef, {
            ...updates,
            updatedAt: Date.now(),
        }, { merge: true }).catch((err) => {
            console.warn("Background Firestore update failed:", err);
        });
    }
}

/**
 * Deletes a landing page completely.
 * Falls back to localStorage instantly and fires off background Firestore deletion.
 */
export async function deleteLandingPage(pageId: string): Promise<void> {
    if (isBrowser) {
        const stored = localStorage.getItem("pageforge_local_pages");
        if (stored) {
            let localPages: LandingPage[] = JSON.parse(stored);
            localPages = localPages.filter(p => p.id !== pageId);
            localStorage.setItem("pageforge_local_pages", JSON.stringify(localPages));
        }
    }

    // Fire-and-forget Firestore deletion (only if not a client-only local page)
    if (db && !pageId.startsWith("local_")) {
        const docRef = doc(db, "pages", pageId);
        deleteDoc(docRef).catch((err) => {
            console.warn("Background Firestore delete failed:", err);
        });
    }
}