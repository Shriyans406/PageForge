/**
 * PageForge Analytics Tracker
 * Automatically tracks page views and button clicks.
 */
(function () {
    // Extract the pageId from the script tag's data attribute
    const scriptTag = document.currentScript;
    const pageId = scriptTag ? scriptTag.getAttribute("data-page-id") : null;

    if (!pageId) {
        console.warn("PageForge Tracker: Missing data-page-id attribute.");
        return;
    }

    const API_URL = "/api/track";

    function sendEvent(eventType) {
        // 1. Fallback tracking: Update LocalStorage directly (so it works on localhost testing without Firebase)
        try {
            const stored = localStorage.getItem("pageforge_local_pages");
            if (stored) {
                let pages = JSON.parse(stored);
                pages = pages.map(p => {
                    if (p.id === pageId) {
                        return {
                            ...p,
                            views: eventType === 'view' ? (p.views || 0) + 1 : (p.views || 0),
                            clicks: eventType === 'click' ? (p.clicks || 0) + 1 : (p.clicks || 0)
                        };
                    }
                    return p;
                });
                localStorage.setItem("pageforge_local_pages", JSON.stringify(pages));
            }
        } catch (err) {
            console.error("PageForge Tracker: Local tracking failed", err);
        }

        // 2. Production tracking: Send event to the API route (for Firestore/backend)
        fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pageId: pageId, eventType: eventType }),
            // Use keepalive so requests succeed even if the user navigates away
            keepalive: true
        }).catch(err => console.error("PageForge Tracker Error:", err));
    }

    // 1. Track Page View on load
    window.addEventListener("load", () => {
        sendEvent("view");
    });

    // 2. Track Clicks (Conversations) on CTAs and Buttons
    document.addEventListener("click", (e) => {
        const target = e.target.closest("a, button");
        if (target) {
            sendEvent("click");
        }
    });
})();