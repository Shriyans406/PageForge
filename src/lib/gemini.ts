import { GoogleGenAI } from "@google/genai";
import { LandingPage, PageSection } from "@/types";

// Initialize the Google Gen AI SDK using our confidential server-side environment variable
const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

/**
 * Sends a prompt to Google Gemini (gemini-2.5-flash) asking for a complete, structured landing page in JSON format.
 */
export async function generateLandingPageAI(promptText: string): Promise<Omit<LandingPage, "id" | "createdAt" | "updatedAt">> {
    if (!ai) {
        throw new Error("GEMINI_API_KEY is missing inside your .env.local file. Please add it and restart your dev server!");
    }

    // This is the strict instructions we send to Gemini so it acts as an expert copywriter & web designer
    const systemPrompt = `
You are PageForge AI, a world-class landing page copywriter, conversion rate optimization (CRO) expert, and UX designer.
The user will describe their product, service, SaaS, or course idea.
Your job is to generate a complete, high-converting landing page structured exactly as a JSON object.

CRITICAL REQUIREMENT:
You MUST respond ONLY with a valid JSON object matching the exact structure below. Do NOT include markdown formatting (\`\`\`json), explanations, or intro text outside the JSON.

JSON Structure Schema:
{
  "title": "Short, catchy internal name for the page (e.g. 'SaaS Invoice Pro')",
  "description": "Short 1-sentence description of the landing page",
  "themeColor": "A sleek CSS hex color code that fits the brand vibe (e.g. '#6366f1' for tech/violet, '#10b981' for finance/emerald, '#f43f5e' for bold/rose)",
  "sections": [
    {
      "id": "hero-1",
      "type": "hero",
      "title": "A bold, punchy, high-converting main headline (8-10 words)",
      "subtitle": "A persuasive subheadline explaining exactly how the product solves the customer's biggest pain point (15-25 words)",
      "ctaText": "Action-oriented button text (e.g., 'Start Your Free 14-Day Trial', 'Get Instant Access')",
      "ctaLink": "#signup"
    },
    {
      "id": "features-1",
      "type": "features",
      "title": "Everything You Need to Succeed",
      "subtitle": "Designed specifically for modern teams and creators who want results fast.",
      "content": [
        {
          "title": "Benefit / Feature Title 1",
          "description": "Clear 2-sentence explanation of why this feature saves time, money, or stress."
        },
        {
          "title": "Benefit / Feature Title 2",
          "description": "Clear 2-sentence explanation of why this feature saves time, money, or stress."
        },
        {
          "title": "Benefit / Feature Title 3",
          "description": "Clear 2-sentence explanation of why this feature saves time, money, or stress."
        }
      ]
    },
    {
      "id": "pricing-1",
      "type": "pricing",
      "title": "Simple, Transparent Pricing",
      "subtitle": "No hidden fees. Pick the plan that fits your goals right now.",
      "content": [
        {
          "plan": "Starter / Free",
          "price": "$0",
          "period": "forever",
          "features": ["Core feature access", "Up to 100 items", "Community support"],
          "ctaText": "Get Started Free"
        },
        {
          "plan": "Pro / Growth",
          "price": "$29",
          "period": "per month",
          "features": ["All Starter features", "Unlimited generation", "Priority 24/7 VIP support", "Custom branding"],
          "ctaText": "Start Pro Trial"
        }
      ]
    },
    {
      "id": "faq-1",
      "type": "faq",
      "title": "Frequently Asked Questions",
      "subtitle": "Everything you need to know before getting started.",
      "content": [
        {
          "question": "How fast can I get set up and running?",
          "answer": "You can get up and running in less than 2 minutes without writing a single line of code."
        },
        {
          "question": "Can I cancel or change my plan anytime?",
          "answer": "Yes, absolutely! There are no long-term contracts. You can upgrade, downgrade, or cancel directly from your account settings."
        },
        {
          "question": "Do you offer refunds or guarantees?",
          "answer": "We offer a 100% satisfaction guarantee. If you aren't thrilled within your first 14 days, we will refund every penny."
        }
      ]
    },
    {
      "id": "cta-1",
      "type": "cta",
      "title": "Ready to Transform Your Workflow Today?",
      "subtitle": "Join thousands of happy customers and start seeing incredible results instantly.",
      "ctaText": "Create Your Free Account Now",
      "ctaLink": "#signup"
    }
  ]
}
`.trim();

    try {
        // Call the Gemini 2.5 Flash model requesting pure JSON output
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [
                { role: "user", parts: [{ text: `Generate a high-converting landing page for: ${promptText}` }] }
            ],
            config: {
                systemInstruction: systemPrompt,
                responseMimeType: "application/json",
                temperature: 0.7,
            },
        });

        const rawJsonText = response.text || "{}";
        const parsedData = JSON.parse(rawJsonText);

        // Return the clean structured page object ready to be saved to Firestore
        return {
            title: parsedData.title || "AI Generated Page",
            description: parsedData.description || promptText,
            userId: "", // Will be assigned by the API route to the logged-in user
            isPublished: false,
            sections: Array.isArray(parsedData.sections) ? parsedData.sections : [],
            themeColor: parsedData.themeColor || "#6366f1",
        };
    } catch (error) {
        console.error("Error calling Google Gemini API:", error);
        throw new Error("Failed to generate landing page with AI. Please check your API key or network connection.");
    }
}