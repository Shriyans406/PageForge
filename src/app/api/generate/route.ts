import { NextRequest, NextResponse } from "next/server";
import { generateLandingPageAI } from "@/lib/gemini";
import { searchUnsplashImage } from "@/lib/unsplash";

/**
 * POST /api/generate
 * Takes a JSON body: { prompt: string, userId: string }
 * Calls Gemini AI, retrieves a contextually matched Unsplash image, and returns the landing page.
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { prompt, userId } = body;

        if (!prompt || typeof prompt !== "string") {
            return NextResponse.json({ error: "Please provide a valid description prompt." }, { status: 400 });
        }

        if (!userId) {
            return NextResponse.json({ error: "User authentication required." }, { status: 401 });
        }

        // 1. Run the copy and layout generation using Gemini AI
        const generatedPage = await generateLandingPageAI(prompt);

        // 2. Scan sections to find the 'hero' section and resolve its image
        for (const section of generatedPage.sections) {
            if (section.type === "hero") {
                const queryTerm = section.imageSearchQuery || prompt.substring(0, 30);
                try {
                    // Search Unsplash (falls back automatically to curated niches)
                    const resolvedUrl = await searchUnsplashImage(queryTerm);
                    section.imageUrl = resolvedUrl;
                } catch (imgError) {
                    console.error("Image search failed, using default placeholder:", imgError);
                    section.imageUrl = "https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=1200";
                }
            }
        }

        // Attach the logged-in user's ID
        generatedPage.userId = userId;

        return NextResponse.json({ success: true, page: generatedPage }, { status: 200 });
    } catch (error: any) {
        console.error("API /api/generate error:", error);
        return NextResponse.json(
            { error: error.message || "An unexpected error occurred while generating the page." },
            { status: 500 }
        );
    }
}