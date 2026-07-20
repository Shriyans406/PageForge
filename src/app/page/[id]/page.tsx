"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getLandingPageById } from "@/lib/db";
import { LandingPage, PageSection } from "@/types";
import { Sparkles, CheckCircle2, Loader2, ArrowRight } from "lucide-react";
import Link from "next/link";

import Script from "next/script";

export default function LiveLandingPageViewer() {
    const params = useParams();
    const pageId = params?.id as string;

    const [page, setPage] = useState<LandingPage | null>(null);
    const [activeVariant, setActiveVariant] = useState<"A" | "B">("A");
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        async function loadPage() {
            if (!pageId) return;
            try {
                const fetchedPage = await getLandingPageById(pageId);
                if (fetchedPage && fetchedPage.abTestEnabled && fetchedPage.variantBHeadline) {
                    setActiveVariant(Math.random() > 0.5 ? "B" : "A");
                }
                setPage(fetchedPage);
            } catch (error) {
                console.error("Error loading live page:", error);
            } finally {
                setLoading(false);
            }
        }
        loadPage();
    }, [pageId]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
        );
    }

    if (!page) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white px-4 text-center">
                <h1 className="text-3xl font-extrabold mb-2">Landing Page Not Found</h1>
                <p className="text-slate-400 mb-6">This page may have been deleted or does not exist.</p>
                <Link href="/dashboard" className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-bold text-sm">
                    Back to Dashboard
                </Link>
            </div>
        );
    }

    const themeColor = page.themeColor || "#6366f1";

    return (
        <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-indigo-500 selection:text-white scroll-smooth">

            {/* Top Preview Banner — Only visible in draft/preview mode */}
            {!page.isPublished && (
                <div className="bg-slate-900/80 border-b border-slate-800 px-4 py-2.5 text-xs text-slate-400 flex items-center justify-between sticky top-0 z-50 backdrop-blur">
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                        <span>PageForge Preview — <strong className="text-white">{page.title}</strong></span>
                    </div>
                    <Link href="/dashboard" className="hover:text-white underline font-medium">
                        Back to Dashboard →
                    </Link>
                </div>
            )}

            {/* Render Each AI-Generated Section */}
            {page.sections.map((section: PageSection) => {
                // Swap the headline if it's the hero section and Variant B is active
                const displaySection = { ...section };
                if (displaySection.type === "hero" && activeVariant === "B" && page.variantBHeadline) {
                    displaySection.title = page.variantBHeadline;
                }

                return (
                    <SectionRenderer key={displaySection.id} section={displaySection} themeColor={themeColor} />
                );
            })}

            {/* Footer */}
            <footer className="border-t border-slate-900 py-12 text-center text-xs text-slate-500 bg-slate-950/50">
                <p className="font-semibold text-slate-400 mb-1">{page.title}</p>
                <p>&copy; {new Date().getFullYear()} All rights reserved. Created effortlessly with PageForge AI.</p>
            </footer>

            {/* PageForge Analytics Tracker (Only run on published pages) */}
            {page.isPublished && (
                <Script 
                    src="/tracker.js" 
                    strategy="afterInteractive" 
                    data-page-id={page.id} 
                    data-variant={activeVariant}
                />
            )}
        </div>
    );
}

/**
 * Helper component that renders the right UI layout based on section type (`hero`, `features`, `pricing`, `faq`, `cta`).
 */
function SectionRenderer({ section, themeColor }: { section: PageSection; themeColor: string }) {
    switch (section.type) {
        case "hero":
            return (
                <section id="hero" className="py-20 lg:py-28 px-4 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center relative overflow-hidden">
                    {/* Glowing background blob decor */}
                    <div
                        className="absolute right-0 top-1/4 w-96 h-96 rounded-full blur-3xl opacity-15 pointer-events-none"
                        style={{ backgroundColor: themeColor }}
                    />

                    {/* Left Column: Copy & Call-To-Action */}
                    <div className="lg:col-span-7 text-left flex flex-col justify-center">
                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white mb-6 leading-tight">
                            {section.title}
                        </h1>
                        <p className="text-base sm:text-lg text-slate-400 mb-8 leading-relaxed max-w-xl">
                            {section.subtitle}
                        </p>
                        {section.ctaText && (
                            <div>
                                <a
                                    href={section.ctaLink || "#"}
                                    className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-white text-base sm:text-lg shadow-xl hover:shadow-2xl hover:opacity-90 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
                                    style={{ backgroundColor: themeColor }}
                                >
                                    {section.ctaText}
                                    <ArrowRight className="w-5 h-5" />
                                </a>
                            </div>
                        )}
                    </div>

                    {/* Right Column: Premium Glowing Floating Image Mockup */}
                    {section.imageUrl && (
                        <div className="lg:col-span-5 flex justify-center lg:justify-end">
                            <div className="relative group w-full max-w-md lg:max-w-none">
                                {/* Ambient outer glow border */}
                                <div
                                    className="absolute -inset-1 rounded-[2.5rem] blur-xl opacity-35 group-hover:opacity-50 transition-opacity duration-500 pointer-events-none"
                                    style={{ backgroundColor: themeColor }}
                                />

                                {/* Glassmorphic card frame */}
                                <div className="relative bg-slate-900/80 p-3 sm:p-4 rounded-[2rem] border border-slate-700/50 shadow-2xl backdrop-blur overflow-hidden flex items-center justify-center">
                                    {/* Unsplash Dynamic Hero Image */}
                                    <img
                                        src={section.imageUrl}
                                        alt={section.title}
                                        className="rounded-2xl w-full h-auto object-cover aspect-video sm:aspect-square lg:aspect-auto shadow-inner hover:scale-[1.01] transition-transform duration-500"
                                        loading="eager"
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </section>
            );

        case "features":
            return (
                <section id="features" className="py-20 px-4 max-w-7xl mx-auto border-t border-slate-900">
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">{section.title}</h2>
                        {section.subtitle && <p className="text-slate-400 text-lg">{section.subtitle}</p>}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {Array.isArray(section.content) && section.content.map((item: any, idx: number) => (
                            <div key={idx} className="p-8 rounded-3xl bg-slate-900/40 border border-slate-800/80 hover:border-slate-700 transition-all">
                                <div
                                    className="w-12 h-12 rounded-2xl flex items-center justify-center mb-6 text-white font-bold text-lg shadow-lg"
                                    style={{ backgroundColor: `${themeColor}33`, color: themeColor }}
                                >
                                    {idx + 1}
                                </div>
                                <h3 className="text-xl font-bold text-white mb-3">{item.title}</h3>
                                <p className="text-slate-400 leading-relaxed text-sm">{item.description}</p>
                            </div>
                        ))}
                    </div>
                </section>
            );

        case "pricing":
            return (
                <section id="pricing" className="py-20 px-4 max-w-6xl mx-auto border-t border-slate-900">
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">{section.title}</h2>
                        {section.subtitle && <p className="text-slate-400 text-lg">{section.subtitle}</p>}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                        {Array.isArray(section.content) && section.content.map((plan: any, idx: number) => (
                            <div
                                key={idx}
                                className={`p-8 rounded-3xl border flex flex-col justify-between relative ${idx === 1
                                    ? "bg-slate-900/80 border-indigo-500/50 shadow-2xl shadow-indigo-500/10"
                                    : "bg-slate-900/30 border-slate-800"
                                    }`}
                            >
                                {idx === 1 && (
                                    <span className="absolute -top-3.5 right-8 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-500 text-white">
                                        Most Popular
                                    </span>
                                )}
                                <div>
                                    <h3 className="text-xl font-bold text-white mb-2">{plan.plan}</h3>
                                    <div className="flex items-baseline gap-1 mb-6">
                                        <span className="text-4xl font-extrabold text-white">{plan.price}</span>
                                        <span className="text-slate-400 text-sm">{plan.period}</span>
                                    </div>
                                    <ul className="space-y-3.5 mb-8">
                                        {Array.isArray(plan.features) && plan.features.map((feat: string, fIdx: number) => (
                                            <li key={fIdx} className="flex items-center gap-2.5 text-sm text-slate-300">
                                                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                                                {feat}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <button
                                    className="w-full py-3.5 rounded-xl font-bold text-sm transition-all shadow-md"
                                    style={idx === 1 ? { backgroundColor: themeColor, color: "#ffffff" } : { backgroundColor: "#1e293b", color: "#e2e8f0" }}
                                >
                                    {plan.ctaText || "Choose Plan"}
                                </button>
                            </div>
                        ))}
                    </div>
                </section>
            );

        case "faq":
            return (
                <section id="faq" className="py-20 px-4 max-w-4xl mx-auto border-t border-slate-900">
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">{section.title}</h2>
                        {section.subtitle && <p className="text-slate-400 text-lg">{section.subtitle}</p>}
                    </div>

                    <div className="space-y-4">
                        {Array.isArray(section.content) && section.content.map((faq: any, idx: number) => (
                            <div key={idx} className="p-6 sm:p-8 rounded-2xl bg-slate-900/40 border border-slate-800">
                                <h3 className="text-lg font-bold text-white mb-2 flex items-start gap-3">
                                    <span className="text-indigo-400 font-extrabold">Q.</span>
                                    {faq.question}
                                </h3>
                                <p className="text-slate-400 text-sm sm:text-base leading-relaxed pl-7">
                                    {faq.answer}
                                </p>
                            </div>
                        ))}
                    </div>
                </section>
            );

        case "cta":
            return (
                <section id="cta" className="py-20 px-4 max-w-5xl mx-auto my-12 text-center rounded-3xl border border-slate-800 bg-gradient-to-b from-slate-900 to-slate-900/40 p-12 relative overflow-hidden">
                    <div
                        className="absolute inset-0 opacity-10 blur-3xl pointer-events-none"
                        style={{ backgroundColor: themeColor }}
                    />
                    <h2 className="text-3xl sm:text-5xl font-extrabold text-white mb-4 max-w-2xl mx-auto">
                        {section.title}
                    </h2>
                    {section.subtitle && <p className="text-slate-400 text-lg max-w-xl mx-auto mb-8">{section.subtitle}</p>}
                    {section.ctaText && (
                        <a
                            href={section.ctaLink || "#"}
                            className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-white text-lg shadow-xl hover:opacity-90 transition-all"
                            style={{ backgroundColor: themeColor }}
                        >
                            {section.ctaText}
                            <ArrowRight className="w-5 h-5" />
                        </a>
                    )}
                </section>
            );

        default:
            return null;
    }
}