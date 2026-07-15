import { NextRequest, NextResponse } from "next/server";
import { generateLandingPageAI } from "@/lib/gemini";

/**
 * POST /api/generate
 * Takes a JSON body: { prompt: string, userId: string }
 * Calls Gemini AI and returns the generated landing page structure.
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

        // Run the AI generation
        const generatedPage = await generateLandingPageAI(prompt);

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