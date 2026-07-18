// ==========================================
// 1. USER INTERFACE
// ==========================================
export interface UserProfile {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
    plan: 'free' | 'pro' | 'enterprise';
    pagesCreated: number;
    createdAt: number;
}

// ==========================================
// 2. PAGE SECTION (Phase 2 — flat structure for AI generation)
// ==========================================
export type SectionType = 'hero' | 'features' | 'pricing' | 'faq' | 'testimonials' | 'cta';

export interface PageSection {
    id: string;
    type: SectionType;
    title: string;
    subtitle?: string;
    ctaText?: string;
    ctaLink?: string;
    imageUrl?: string;        // <-- ADD THIS: Holds the final visual URL
    imageSearchQuery?: string; // <-- ADD THIS: Holds the search term used for Unsplash
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    content?: any[];
}

// ==========================================
// 3. COMPLETE LANDING PAGE INTERFACE
// ==========================================
export interface LandingPage {
    id?: string;
    userId: string;
    title: string;
    description: string;
    sections: PageSection[];
    themeColor: string;
    isPublished: boolean;
    publishedUrl?: string;
    createdAt?: number;
    updatedAt?: number;
    // New Analytics Fields
    views?: number;
    clicks?: number;
    abTestEnabled?: boolean;
    variantBHeadline?: string;

    viewsA?: number;
    clicksA?: number;

    viewsB?: number;
    clicksB?: number;
}

// ==========================================
// 4. ANALYTICS & A/B TESTING INTERFACES (future phases)
// ==========================================
export interface AnalyticsEvent {
    id?: string;
    pageId: string;
    eventType: 'view' | 'cta_click' | 'scroll_depth' | 'form_submit';
    sessionId: string;
    deviceType: 'desktop' | 'mobile' | 'tablet';
    referrer?: string;
    metadata?: Record<string, any>;
    timestamp: number;
}

export interface ABTest {
    id?: string;
    pageId: string;
    sectionId: string;
    fieldName: string;
    variantA: string;
    variantB: string;
    viewsA: number;
    viewsB: number;
    conversionsA: number;
    conversionsB: number;
    status: 'active' | 'completed' | 'paused';
    winner?: 'A' | 'B' | 'inconclusive';
    createdAt: number;
}