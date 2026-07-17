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
        return result || localProfile;
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
 * Saves to localStorage instantly and fires off background Firestore request with identical ID.
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

    // Fire-and-forget Firestore write using the exact same ID
    if (db) {
        const docRef = doc(db, "pages", generatedId);
        setDoc(docRef, pageData).catch((err) => {
            console.warn("Background Firestore write failed:", err);
        });
    }

    return generatedId;
}

/**
 * Fetches a single landing page by its unique ID.
 * Checks localStorage first for immediate render, then checks Firestore.
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

    // If we already have the page locally, return it immediately so preview opens instantly
    if (localPage) {
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
        return result || localPage;
    } catch (e) {
        console.warn("Firestore error getting page, returning local:", e);
        return localPage;
    }
}

/**
 * Fetches all landing pages belonging to a specific user.
 * Merges localStorage pages and Firestore pages safely without wiping local state.
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
                const allPages: LandingPage[] = stored ? JSON.parse(stored) : [];

                // Merge local pages and fetched pages safely by ID
                const mergedMap = new Map<string, LandingPage>();
                for (const p of allPages) if (p.id) mergedMap.set(p.id, p);
                for (const p of fetchedPages) if (p.id) mergedMap.set(p.id, p);

                const combined = Array.from(mergedMap.values());
                localStorage.setItem("pageforge_local_pages", JSON.stringify(combined));
                return combined.filter(p => p.userId === userId);
            }
            return fetchedPages;
        });

        const result = await Promise.race([
            getPromise,
            new Promise<LandingPage[]>((resolve) => setTimeout(() => resolve(localPages), 1500))
        ]);

        // Ensure that local pages are always combined with any fetched result
        const resultMap = new Map<string, LandingPage>();
        for (const p of localPages) if (p.id) resultMap.set(p.id, p);
        for (const p of result) if (p.id) resultMap.set(p.id, p);
        return Array.from(resultMap.values()).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    } catch (e) {
        console.warn("Firestore error fetching pages, returning local pages:", e);
        return localPages.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    }
}

/**
 * Updates an existing landing page.
 * Updates localStorage instantly and fires off background Firestore update.
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

    if (db) {
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
 * Deletes from localStorage instantly and fires off background Firestore deletion.
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

    if (db) {
        const docRef = doc(db, "pages", pageId);
        deleteDoc(docRef).catch((err) => {
            console.warn("Background Firestore delete failed:", err);
        });
    }
}

/**
 * Tracks an analytics event by incrementing the views or clicks count.
 * Works seamlessly with both Firestore and the LocalStorage fallback.
 */
export async function trackAnalyticsEvent(pageId: string, eventType: "view" | "click"): Promise<void> {
    try {
        const page = await getLandingPageById(pageId);
        if (!page) return;

        const currentViews = page.views || 0;
        const currentClicks = page.clicks || 0;

        const updates: Partial<LandingPage> = {};
        if (eventType === "view") {
            updates.views = currentViews + 1;
        } else if (eventType === "click") {
            updates.clicks = currentClicks + 1;
        }

        await updateLandingPage(pageId, updates);
    } catch (error) {
        console.error(`Failed to track ${eventType} event for page ${pageId}:`, error);
    }
}