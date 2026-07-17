import { NextResponse } from "next/server";
import { trackAnalyticsEvent } from "@/lib/db";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { pageId, eventType } = body;

        if (!pageId || !eventType || (eventType !== "view" && eventType !== "click")) {
            return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
        }

        await trackAnalyticsEvent(pageId, eventType);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Analytics Tracking API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}