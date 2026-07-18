/**
 * PageForge Analytics & A/B Test Tracker
 */
(function () {
    const scriptTag = document.currentScript;
    const pageId = scriptTag ? scriptTag.getAttribute("data-page-id") : null;
    const variant = scriptTag ? scriptTag.getAttribute("data-variant") || "A" : "A";

    if (!pageId) return;

    function sendEvent(eventType) {
        // Fallback tracking: Update LocalStorage directly for localhost
        try {
            const stored = localStorage.getItem("pageforge_local_pages");
            if (stored) {
                let pages = JSON.parse(stored);
                pages = pages.map(p => {
                    if (p.id === pageId) {
                        const updates = { ...p };

                        // Global stats
                        if (eventType === 'view') updates.views = (p.views || 0) + 1;
                        if (eventType === 'click') updates.clicks = (p.clicks || 0) + 1;

                        // Variant specific stats
                        if (variant === "A") {
                            if (eventType === 'view') updates.viewsA = (p.viewsA || 0) + 1;
                            if (eventType === 'click') updates.clicksA = (p.clicksA || 0) + 1;
                        } else if (variant === "B") {
                            if (eventType === 'view') updates.viewsB = (p.viewsB || 0) + 1;
                            if (eventType === 'click') updates.clicksB = (p.clicksB || 0) + 1;
                        }

                        return updates;
                    }
                    return p;
                });
                localStorage.setItem("pageforge_local_pages", JSON.stringify(pages));
            }
        } catch (err) {
            console.error("PageForge Tracker: Local tracking failed", err);
        }

        // Production tracking (Server API)
        fetch("/api/track", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pageId, eventType, variant }),
            keepalive: true
        }).catch(() => { });
    }

    window.addEventListener("load", () => sendEvent("view"));

    document.addEventListener("click", (e) => {
        if (e.target.closest("a, button")) {
            sendEvent("click");
        }
    });
})();