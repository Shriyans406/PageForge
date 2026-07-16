// Client-side/Server-side helper to fetch beautiful, topic-relevant stock photos

const accessKey = process.env.UNSPLASH_ACCESS_KEY;

// A robust dictionary of high-resolution, curated Unsplash templates to fall back on if API limits are exceeded
const CURATED_FALLBACKS: Record<string, string> = {
    saas: "https://images.unsplash.com/photo-1551434678-e076c223a692?q=80&w=1200",
    analytics: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=1200",
    dashboard: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1200",
    finance: "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?q=80&w=1200",
    fitness: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=1200",
    gym: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1200",
    education: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?q=80&w=1200",
    course: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1200",
    marketing: "https://images.unsplash.com/photo-1533750516457-a7f992034fec?q=80&w=1200",
    store: "https://images.unsplash.com/photo-1472851294608-062f824d296e?q=80&w=1200",
    ecommerce: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=1200",
    ai: "https://images.unsplash.com/photo-1677442136019-21780efad99a?q=80&w=1200",
    app: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?q=80&w=1200",
    workspace: "https://images.unsplash.com/photo-1499750310107-5fef28a66643?q=80&w=1200",
    office: "https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=1200",
    business: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=1200",
    default: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=1200" // Tech workstation
};

/**
 * Searches Unsplash's public API for a single high-quality photo matching a search query.
 * Falls back to local curated images if key is missing or API limit is reached.
 */
export async function searchUnsplashImage(query: string): Promise<string> {
    if (!accessKey) {
        console.log("No UNSPLASH_ACCESS_KEY configured. Using semantic curated fallbacks.");
        return getCuratedFallback(query);
    }

    try {
        const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`;
        const res = await fetch(url, {
            headers: {
                Authorization: `Client-ID ${accessKey}`
            },
            next: { revalidate: 86400 } // Cache results for 24h
        });

        if (!res.ok) {
            console.warn(`Unsplash API responded with ${res.status}. Falling back.`);
            return getCuratedFallback(query);
        }

        const data = await res.json();
        if (data.results && data.results.length > 0) {
            return data.results[0].urls.regular;
        }

        console.log("No Unsplash search results found. Using fallback.");
        return getCuratedFallback(query);
    } catch (error) {
        console.error("Error searching Unsplash image:", error);
        return getCuratedFallback(query);
    }
}

/**
 * Matches keywords inside a query to select the most relevant curated template image.
 */
function getCuratedFallback(query: string): string {
    const q = query.toLowerCase();

    if (q.includes("saas") || q.includes("software")) return CURATED_FALLBACKS.saas;
    if (q.includes("analytic") || q.includes("chart") || q.includes("graph")) return CURATED_FALLBACKS.analytics;
    if (q.includes("dashboard") || q.includes("metrics")) return CURATED_FALLBACKS.dashboard;
    if (q.includes("money") || q.includes("pay") || q.includes("finance") || q.includes("invoice")) return CURATED_FALLBACKS.finance;
    if (q.includes("fitness") || q.includes("sport") || q.includes("workout")) return CURATED_FALLBACKS.fitness;
    if (q.includes("gym") || q.includes("train")) return CURATED_FALLBACKS.gym;
    if (q.includes("education") || q.includes("learn") || q.includes("study") || q.includes("school")) return CURATED_FALLBACKS.education;
    if (q.includes("course") || q.includes("lecture") || q.includes("teach")) return CURATED_FALLBACKS.course;
    if (q.includes("marketing") || q.includes("agency") || q.includes("seo")) return CURATED_FALLBACKS.marketing;
    if (q.includes("store") || q.includes("shop") || q.includes("e-commerce") || q.includes("sell")) return CURATED_FALLBACKS.store;
    if (q.includes("ai") || q.includes("intelligence") || q.includes("gemini") || q.includes("bot")) return CURATED_FALLBACKS.ai;
    if (q.includes("app") || q.includes("phone") || q.includes("mobile")) return CURATED_FALLBACKS.app;
    if (q.includes("workspace") || q.includes("laptop")) return CURATED_FALLBACKS.workspace;
    if (q.includes("office") || q.includes("team")) return CURATED_FALLBACKS.office;
    if (q.includes("business") || q.includes("enterprise")) return CURATED_FALLBACKS.business;

    return CURATED_FALLBACKS.default;
}