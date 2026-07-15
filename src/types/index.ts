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
// 2. LANDING PAGE SECTION TYPES & INTERFACES
// ==========================================
export type SectionType = 'hero' | 'features' | 'pricing' | 'faq' | 'testimonials' | 'cta';

export interface SectionStyle {
    backgroundColor?: string;
    textColor?: string;
    paddingY?: string; // e.g., 'py-16' or 'py-24'
    alignment?: 'left' | 'center' | 'right';
}

export interface HeroSectionContent {
    headline: string;
    subheadline: string;
    ctaText: string;
    ctaLink: string;
    heroImageUrl?: string;
}

export interface FeatureItem {
    id: string;
    title: string;
    description: string;
    iconName?: string;
}

export interface FeaturesSectionContent {
    title: string;
    subtitle: string;
    features: FeatureItem[];
}

export interface PricingTier {
    id: string;
    name: string;
    price: string;
    period: string; // e.g., '/month'
    description: string;
    features: string[];
    isPopular?: boolean;
    ctaText: string;
}

export interface PricingSectionContent {
    title: string;
    subtitle: string;
    tiers: PricingTier[];
}

export interface FaqItem {
    id: string;
    question: string;
    answer: string;
}

export interface FaqSectionContent {
    title: string;
    subtitle: string;
    faqs: FaqItem[];
}

export interface TestimonialItem {
    id: string;
    quote: string;
    authorName: string;
    authorTitle: string;
    authorCompany: string;
    avatarUrl?: string;
}

export interface TestimonialsSectionContent {
    title: string;
    subtitle: string;
    testimonials: TestimonialItem[];
}

export interface CtaSectionContent {
    headline: string;
    subheadline: string;
    buttonText: string;
    buttonLink: string;
}

export type SectionContent =
    | HeroSectionContent
    | FeaturesSectionContent
    | PricingSectionContent
    | FaqSectionContent
    | TestimonialsSectionContent
    | CtaSectionContent;

export interface PageSection {
    id: string;
    type: SectionType;
    order: number;
    content: SectionContent;
    style?: SectionStyle;
}

// ==========================================
// 3. COMPLETE LANDING PAGE INTERFACE
// ==========================================
export interface LandingPage {
    id?: string;
    userId: string;
    title: string;
    slug: string;
    descriptionPrompt?: string;
    sections: PageSection[];
    theme: {
        primaryColor: string;
        secondaryColor: string;
        fontFamily: string;
    };
    isPublished: boolean;
    publishedUrl?: string;
    customDomain?: string;
    createdAt: number;
    updatedAt: number;
}

// ==========================================
// 4. ANALYTICS & A/B TESTING INTERFACES
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
    fieldName: string; // e.g., 'headline'
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