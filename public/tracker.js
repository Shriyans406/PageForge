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