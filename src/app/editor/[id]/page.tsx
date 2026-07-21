"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getLandingPageById, updateLandingPage } from "@/lib/db";
import { LandingPage, PageSection, SectionType } from "@/types";
import {
    Sparkles, ArrowLeft, ArrowUp, ArrowDown, Trash2,
    Copy, Plus, Save, Monitor, Smartphone, Loader2, Edit3, Check, RotateCw
} from "lucide-react";
import Link from "next/link";
import { exportPageToHTML } from "@/lib/exporter";

import toast from "react-hot-toast";

export default function VisualEditorPage() {
    const params = useParams();
    const router = useRouter();
    const pageId = params?.id as string;

    const [page, setPage] = useState<LandingPage | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [saving, setSaving] = useState<boolean>(false);
    const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

    // Editor Panel States
    const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
    const [isPreviewMobile, setIsPreviewMobile] = useState<boolean>(false);
    const [mobileWidth, setMobileWidth] = useState<number>(390);
    const [isLandscape, setIsLandscape] = useState<boolean>(false);
    const [globalThemeColor, setGlobalThemeColor] = useState<string>("#6366f1");

    useEffect(() => {
        async function loadPageData() {
            if (!pageId) return;
            try {
                const pageData = await getLandingPageById(pageId);
                if (pageData) {
                    setPage(pageData);
                    setGlobalThemeColor(pageData.themeColor || "#6366f1");
                    if (pageData.sections.length > 0) {
                        setSelectedSectionId(pageData.sections[0].id);
                    }
                }
            } catch (error) {
                console.error("Failed to load page config:", error);
            } finally {
                setLoading(false);
            }
        }
        loadPageData();
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
                <h1 className="text-3xl font-extrabold mb-2">Page Configuration Not Found</h1>
                <p className="text-slate-400 mb-6">We could not retrieve the builder setup for this ID.</p>
                <Link href="/dashboard" className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-bold text-sm">
                    Back to Dashboard
                </Link>
            </div>
        );
    }

    // ==========================================
    // SECTION OPERATIONS
    // ==========================================

    const handleSave = async () => {
        if (!page || !page.id) return;
        setSaving(true);
        setSaveSuccess(false);
        try {
            await updateLandingPage(page.id, {
                sections: page.sections,
                themeColor: globalThemeColor,
                title: page.title,
                description: page.description,
                isPublished: page.isPublished
            });
            toast.success("Page layout saved successfully!");
        } catch (err) {
            console.error("Error saving layout updates:", err);
            alert("Failed to save changes. Please try again.");
            toast.error("Failed to save changes.");
        } finally {
            setSaving(false);
        }
    };

    const updateSectionData = (sectionId: string, fieldsToUpdate: Partial<PageSection>) => {
        if (!page) return;
        const updatedSections = page.sections.map(s => {
            if (s.id === sectionId) {
                return { ...s, ...fieldsToUpdate };
            }
            return s;
        });
        setPage({ ...page, sections: updatedSections });
    };

    const handleSectionReorder = (index: number, direction: "up" | "down") => {
        if (!page) return;
        const newSections = [...page.sections];
        const targetIndex = direction === "up" ? index - 1 : index + 1;

        if (targetIndex < 0 || targetIndex >= newSections.length) return;

        // Swap sections
        const temp = newSections[index];
        newSections[index] = newSections[targetIndex];
        newSections[targetIndex] = temp;

        setPage({ ...page, sections: newSections });
    };

    const handleAddSection = (type: SectionType) => {
        if (!page) return;
        const newId = `section_${Date.now()}`;
        const newSection: PageSection = {
            id: newId,
            type,
            title: `New ${type.toUpperCase()} Title`,
            subtitle: type === "hero" || type === "cta" || type === "features" ? "Catchy sub-text details explaining values..." : undefined,
            ctaText: type === "hero" || type === "cta" ? "Get Started" : undefined,
            ctaLink: type === "hero" || type === "cta" ? "#" : undefined,
            imageUrl: type === "hero" ? "https://images.unsplash.com/photo-1551434678-e076c223a692?q=80&w=1000" : undefined,
            content: type === "features" ? [
                { title: "Feature 1", description: "Details about value 1" },
                { title: "Feature 2", description: "Details about value 2" },
                { title: "Feature 3", description: "Details about value 3" }
            ] : type === "pricing" ? [
                { plan: "Free", price: "$0", period: "forever", features: ["Basic access", "Community support"], ctaText: "Start Free" },
                { plan: "Pro", price: "$29", period: "month", features: ["Unlimited edits", "Premium Support"], ctaText: "Go Pro" }
            ] : type === "faq" ? [
                { question: "Question 1?", answer: "Answer 1 detail." },
                { question: "Question 2?", answer: "Answer 2 detail." }
            ] : undefined
        };

        const updated = [...page.sections, newSection];
        setPage({ ...page, sections: updated });
        setSelectedSectionId(newId);
    };

    const handleDuplicateSection = (index: number) => {
        if (!page) return;
        const target = page.sections[index];
        const duplicated: PageSection = {
            ...target,
            id: `section_${Date.now()}_dup`,
            title: `${target.title} (Copy)`
        };
        const newSections = [...page.sections];
        newSections.splice(index + 1, 0, duplicated);
        setPage({ ...page, sections: newSections });
        setSelectedSectionId(duplicated.id);
    };

    const handleDeleteSection = (sectionId: string) => {
        if (!page) return;
        if (page.sections.length <= 1) {
            alert("Your landing page must have at least one section!");
            return;
        }
        const updated = page.sections.filter(s => s.id !== sectionId);
        setPage({ ...page, sections: updated });
        if (selectedSectionId === sectionId) {
            setSelectedSectionId(updated[0].id);
        }
    };

    const selectedSection = page.sections.find(s => s.id === selectedSectionId);

    return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col font-sans">

            {/* 1. Header Toolbar */}
            <header className="h-16 border-b border-slate-800 bg-slate-900 px-6 flex items-center justify-between z-10 shrink-0">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard" className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                    </Link>
                    <div>
                        <h1 className="text-sm font-bold leading-tight">{page.title}</h1>
                        <span className="text-xs text-slate-400">Visual Editor Sandbox</span>
                    </div>
                </div>

                {/* Desktop/Mobile Simulator Toggle */}
                <div className="flex items-center bg-slate-950 rounded-xl p-1 border border-slate-800">
                    <button
                        onClick={() => setIsPreviewMobile(false)}
                        className={`p-2 rounded-lg transition-all flex items-center gap-1.5 text-xs font-semibold ${!isPreviewMobile ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"}`}
                        title="Desktop Preview"
                    >
                        <Monitor className="w-4 h-4" />
                        <span className="hidden sm:inline">Desktop</span>
                    </button>
                    <button
                        onClick={() => setIsPreviewMobile(true)}
                        className={`p-2 rounded-lg transition-all flex items-center gap-1.5 text-xs font-semibold ${isPreviewMobile ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"}`}
                        title="Mobile Preview"
                    >
                        <Smartphone className="w-4 h-4" />
                        <span className="hidden sm:inline">Mobile</span>
                    </button>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-sm shadow-md flex items-center gap-2 disabled:opacity-50 transition-all"
                    >
                        {saving ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : saveSuccess ? (
                            <Check className="w-4 h-4 text-emerald-400" />
                        ) : (
                            <Save className="w-4 h-4" />
                        )}
                        {saving ? "Saving..." : saveSuccess ? "Saved!" : "Save Changes"}
                    </button>
                </div>
            </header>

            {/* 2. Main Work Area (Left Panel, Right Preview Canvas) */}
            <div className="flex-1 flex overflow-hidden">

                {/* 2A. Left Sidebar: Section Navigator & Property Editor */}
                <aside className="w-80 border-r border-slate-800 bg-slate-900/60 backdrop-blur flex flex-col justify-between overflow-y-auto shrink-0">

                    {/* Outline & Layout List */}
                    <div className="p-5 border-b border-slate-800/80">
                        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                            Page Outline / Sections
                        </h2>

                        <div className="space-y-2 mb-6">
                            {page.sections.map((section, idx) => (
                                <div
                                    key={section.id}
                                    onClick={() => setSelectedSectionId(section.id)}
                                    className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${selectedSectionId === section.id
                                        ? "bg-indigo-600/10 border-indigo-500 text-white"
                                        : "bg-slate-950/40 border-slate-800 hover:border-slate-700 text-slate-300"
                                        }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-slate-400">
                                            {section.type.toUpperCase()}
                                        </span>
                                        <span className="text-xs font-bold truncate max-w-[100px]">{section.title}</span>
                                    </div>

                                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                        <button
                                            onClick={() => handleSectionReorder(idx, "up")}
                                            disabled={idx === 0}
                                            className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-30"
                                        >
                                            <ArrowUp className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            onClick={() => handleSectionReorder(idx, "down")}
                                            disabled={idx === page.sections.length - 1}
                                            className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-30"
                                        >
                                            <ArrowDown className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            onClick={() => handleDuplicateSection(idx)}
                                            className="p-1 rounded text-slate-400 hover:text-indigo-400"
                                            title="Duplicate"
                                        >
                                            <Copy className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteSection(section.id)}
                                            className="p-1 rounded text-slate-400 hover:text-red-400"
                                            title="Delete"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Add Section Buttons */}
                        <div className="grid grid-cols-2 gap-2">
                            {(["hero", "features", "pricing", "faq", "cta"] as SectionType[]).map(type => (
                                <button
                                    key={type}
                                    onClick={() => handleAddSection(type)}
                                    className="p-2 text-left rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 text-xs font-semibold text-slate-300 flex items-center gap-1.5 transition-colors"
                                >
                                    <Plus className="w-3.5 h-3.5 text-slate-500" />
                                    + {type.toUpperCase()}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Section Property Editor Tab */}
                    <div className="flex-1 p-5 overflow-y-auto">
                        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1.5 border-b border-slate-800 pb-2">
                            <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
                            Customize Section Content
                        </h2>

                        {selectedSection ? (
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Section Headline / Title</label>
                                    <textarea
                                        value={selectedSection.title}
                                        onChange={(e) => updateSectionData(selectedSection.id, { title: e.target.value })}
                                        className="w-full mt-1.5 p-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                        rows={3}
                                    />
                                </div>

                                {selectedSection.subtitle !== undefined && (
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase">Subheadline / Details</label>
                                        <textarea
                                            value={selectedSection.subtitle}
                                            onChange={(e) => updateSectionData(selectedSection.id, { subtitle: e.target.value })}
                                            className="w-full mt-1.5 p-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                            rows={4}
                                        />
                                    </div>
                                )}

                                {selectedSection.ctaText !== undefined && (
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 uppercase">CTA Button Text</label>
                                            <input
                                                type="text"
                                                value={selectedSection.ctaText}
                                                onChange={(e) => updateSectionData(selectedSection.id, { ctaText: e.target.value })}
                                                className="w-full mt-1.5 p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 uppercase">CTA Link</label>
                                            <input
                                                type="text"
                                                value={selectedSection.ctaLink || ""}
                                                onChange={(e) => updateSectionData(selectedSection.id, { ctaLink: e.target.value })}
                                                className="w-full mt-1.5 p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                                            />
                                        </div>
                                    </div>
                                )}

                                {selectedSection.imageUrl !== undefined && (
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase">Image / Mockup URL</label>
                                        <input
                                            type="text"
                                            value={selectedSection.imageUrl}
                                            onChange={(e) => updateSectionData(selectedSection.id, { imageUrl: e.target.value })}
                                            className="w-full mt-1.5 p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                                        />
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-center py-10 text-xs text-slate-500">
                                Select a section from the list above to customize its content.
                            </div>
                        )}
                    </div>


                    {/* Global Page Settings, Publishing & Exporting */}
                    <div className="p-5 border-t border-slate-800 bg-slate-950/40 space-y-5">

                        {/* Theme Customizer */}
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-2">Global Page Theme Color</label>
                            <div className="flex items-center gap-3">
                                <input
                                    type="color"
                                    value={globalThemeColor}
                                    onChange={(e) => setGlobalThemeColor(e.target.value)}
                                    className="w-8 h-8 rounded-lg border border-slate-700 bg-transparent cursor-pointer"
                                />
                                <input
                                    type="text"
                                    value={globalThemeColor}
                                    onChange={(e) => setGlobalThemeColor(e.target.value)}
                                    className="flex-1 p-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 font-mono focus:outline-none"
                                />
                            </div>
                        </div>

                        {/* Public / Draft Toggle */}
                        <div className="pt-4 border-t border-slate-800/80">
                            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-2">Publishing Status</label>
                            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
                                <span className="text-xs text-slate-300 font-semibold">
                                    {page.isPublished ? "🟢 Live Public Site" : "⚪ Private Draft"}
                                </span>
                                <button
                                    onClick={() => setPage({ ...page, isPublished: !page.isPublished })}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${page.isPublished
                                        ? "bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30"
                                        : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                                        }`}
                                >
                                    {page.isPublished ? "Make Draft" : "Go Live"}
                                </button>
                            </div>
                        </div>

                        {/* A/B Testing Toggle */}
                        <div className="flex items-center gap-3 bg-slate-900/80 px-4 py-2 rounded-xl border border-slate-700/50 mb-4">
                            <label className="text-sm font-semibold text-slate-300">A/B Testing</label>
                            <button
                                onClick={() => setPage({ ...page, abTestEnabled: !page.abTestEnabled })}
                                className={`w-11 h-6 rounded-full transition-colors relative ${page.abTestEnabled ? 'bg-indigo-500' : 'bg-slate-700'}`}
                            >
                                <span className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white transition-all ${page.abTestEnabled ? 'left-6' : 'left-1'}`} />
                            </button>
                        </div>

                        {page.abTestEnabled && (
                            <div className="flex items-center gap-3 bg-indigo-500/10 px-4 py-3 rounded-xl border border-indigo-500/30 mb-4 w-full">
                                <label className="text-sm font-bold text-indigo-300 whitespace-nowrap">Variant B Headline:</label>
                                <input
                                    type="text"
                                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                                    placeholder="Enter an alternative headline..."
                                    value={page.variantBHeadline || ""}
                                    onChange={(e) => setPage({ ...page, variantBHeadline: e.target.value })}
                                />
                            </div>
                        )}

                        {/* Standalone HTML Export */}
                        <div className="pt-1">
                            <button
                                onClick={() => {
                                    const compiledHTML = exportPageToHTML(page);
                                    const blob = new Blob([compiledHTML], { type: "text/html" });
                                    const link = document.createElement("a");
                                    link.href = URL.createObjectURL(blob);
                                    link.download = `${page.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-landing-page.html`;
                                    link.click();
                                }}
                                className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all border border-slate-700/60 flex items-center justify-center gap-2"
                            >
                                <Save className="w-4 h-4 text-indigo-400" />
                                Export Standalone HTML
                            </button>
                        </div>
                    </div>
                </aside>

                {/* 2B. Right Canvas: Live Sandbox Sandbox */}
                <main className="flex-1 bg-slate-950 p-6 sm:p-10 flex flex-col items-center justify-start overflow-y-auto h-full">
                    {/* Device Simulator Control Bar */}
                    {isPreviewMobile && (
                        <div className="mb-6 bg-slate-900/90 border border-slate-800/80 px-4 py-2 rounded-2xl flex items-center gap-4 text-xs shadow-lg backdrop-blur shrink-0">
                            <div className="flex items-center gap-1.5 border-r border-slate-800 pr-4">
                                <span className="text-slate-500">Preset:</span>
                                <select 
                                    value={mobileWidth}
                                    onChange={(e) => setMobileWidth(Number(e.target.value))}
                                    className="bg-slate-950 text-slate-200 border border-slate-800 rounded px-2 py-1 focus:outline-none cursor-pointer font-medium"
                                >
                                    <option value={360}>iPhone SE (360px)</option>
                                    <option value={390}>iPhone Pro (390px)</option>
                                    <option value={430}>iPhone Pro Max (430px)</option>
                                    <option value={768}>iPad Mini (768px)</option>
                                </select>
                            </div>
                            
                            <div className="flex items-center gap-2 border-r border-slate-800 pr-4">
                                <span className="text-slate-500">Dimensions:</span>
                                <span className="font-mono text-indigo-400 font-bold">
                                    {isLandscape ? "700px" : `${mobileWidth}px`} x {isLandscape ? `${mobileWidth}px` : "700px"}
                                </span>
                            </div>

                            <button 
                                onClick={() => setIsLandscape(!isLandscape)}
                                className={`p-1.5 rounded-lg border transition-all flex items-center justify-center ${isLandscape ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'}`}
                                title="Rotate Device"
                            >
                                <RotateCw className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    )}

                    {/* The Simulator Frame */}
                    <div className="relative">
                        {/* Device Physical Buttons (Mock) */}
                        {isPreviewMobile && (
                            <>
                                {/* Left Side Buttons (Volume Up/Down) */}
                                <div className="absolute -left-[14px] top-24 w-[3px] h-10 bg-slate-700 rounded-l" />
                                <div className="absolute -left-[14px] top-38 w-[3px] h-10 bg-slate-700 rounded-l" />
                                {/* Right Side Button (Power) */}
                                <div className="absolute -right-[14px] top-28 w-[3px] h-14 bg-slate-700 rounded-r" />
                            </>
                        )}

                        <div
                            className={`transition-all duration-300 bg-slate-950 relative ${isPreviewMobile
                                ? "border-[12px] border-slate-900 rounded-[2.5rem] shadow-2xl overflow-y-auto"
                                : "w-full max-w-5xl"
                                }`}
                            style={isPreviewMobile ? {
                                width: isLandscape ? "700px" : `${mobileWidth}px`,
                                height: isLandscape ? `${mobileWidth}px` : "700px"
                            } : undefined}
                        >
                            {/* Simulation Screen Header */}
                            {isPreviewMobile && (
                                <div className="h-6 bg-slate-900 flex items-center justify-between px-6 text-[10px] text-slate-500 font-semibold sticky top-0 z-20">
                                    <span>9:41 AM</span>
                                    <div className="w-16 h-3 bg-slate-950 rounded-full mx-auto" />
                                    <span>100%</span>
                                </div>
                            )}

                            <div className="space-y-12 py-10">
                                {page.sections.map((section) => (
                                    <div
                                        key={section.id}
                                        onClick={() => setSelectedSectionId(section.id)}
                                        className={`relative rounded-3xl border transition-all ${selectedSectionId === section.id
                                            ? "border-indigo-500 shadow-lg ring-1 ring-indigo-500 bg-slate-900/10"
                                            : "border-transparent hover:border-slate-800"
                                            }`}
                                    >
                                        {/* Action Selector Indicator overlay */}
                                        {selectedSectionId === section.id && (
                                            <span className="absolute -top-3 left-4 px-2 py-0.5 rounded bg-indigo-600 text-[9px] font-bold uppercase text-white shadow z-10">
                                                Selected: {section.type.toUpperCase()}
                                            </span>
                                        )}

                                        <SectionPreviewer section={section} themeColor={globalThemeColor} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}

// ==========================================
// RENDER SANBOX SECTION PREVIEWER
// ==========================================

function SectionPreviewer({ section, themeColor }: { section: PageSection; themeColor: string }) {
    switch (section.type) {
        case "hero":
            return (
                <section className="py-12 sm:py-16 px-4 text-center relative overflow-hidden">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full blur-3xl opacity-10 pointer-events-none" style={{ backgroundColor: themeColor }} />
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center max-w-4xl mx-auto text-left">
                        <div className="lg:col-span-7">
                            <h1 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight mb-4">{section.title}</h1>
                            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed mb-6">{section.subtitle}</p>
                            {section.ctaText && (
                                <button className="px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-md" style={{ backgroundColor: themeColor }}>
                                    {section.ctaText}
                                </button>
                            )}
                        </div>
                        {section.imageUrl && (
                            <div className="lg:col-span-5 flex justify-center">
                                <div className="p-2 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-lg">
                                    <img src={section.imageUrl} alt="Hero View" className="rounded-xl w-full h-auto object-cover max-h-[160px]" />
                                </div>
                            </div>
                        )}
                    </div>
                </section>
            );

        case "features":
            return (
                <section className="py-10 px-4 border-t border-slate-900 max-w-4xl mx-auto">
                    <h2 className="text-xl font-bold text-center text-white mb-2">{section.title}</h2>
                    {section.subtitle && <p className="text-slate-400 text-xs text-center mb-8">{section.subtitle}</p>}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {Array.isArray(section.content) && section.content.map((item: any, idx: number) => (
                            <div key={idx} className="p-5 rounded-2xl bg-slate-900/30 border border-slate-800 text-left">
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-4 text-xs font-bold" style={{ backgroundColor: `${themeColor}33`, color: themeColor }}>
                                    {idx + 1}
                                </div>
                                <h3 className="text-sm font-bold text-white mb-2">{item.title}</h3>
                                <p className="text-xs text-slate-400 leading-relaxed">{item.description}</p>
                            </div>
                        ))}
                    </div>
                </section>
            );

        case "pricing":
            return (
                <section className="py-10 px-4 border-t border-slate-900 max-w-4xl mx-auto">
                    <h2 className="text-xl font-bold text-center text-white mb-2">{section.title}</h2>
                    {section.subtitle && <p className="text-slate-400 text-xs text-center mb-8">{section.subtitle}</p>}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
                        {Array.isArray(section.content) && section.content.map((plan: any, idx: number) => (
                            <div key={idx} className={`p-6 rounded-2xl border flex flex-col justify-between ${idx === 1 ? "bg-slate-900/60 border-indigo-500/50" : "bg-slate-900/20 border-slate-850"}`}>
                                <div>
                                    <h3 className="text-sm font-bold text-white mb-2">{plan.plan}</h3>
                                    <div className="flex items-baseline gap-1 mb-4">
                                        <span className="text-2xl font-extrabold text-white">{plan.price}</span>
                                        <span className="text-[10px] text-slate-400">{plan.period}</span>
                                    </div>
                                    <ul className="space-y-2 mb-6">
                                        {Array.isArray(plan.features) && plan.features.map((feat: string, fIdx: number) => (
                                            <li key={fIdx} className="text-xs text-slate-300 flex items-center gap-1.5">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                                {feat}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <button className="w-full py-2.5 rounded-xl font-bold text-xs" style={idx === 1 ? { backgroundColor: themeColor, color: "white" } : { backgroundColor: "#1e293b", color: "#e2e8f0" }}>
                                    {plan.ctaText}
                                </button>
                            </div>
                        ))}
                    </div>
                </section>
            );

        case "faq":
            return (
                <section className="py-10 px-4 border-t border-slate-900 max-w-3xl mx-auto">
                    <h2 className="text-xl font-bold text-center text-white mb-8">{section.title}</h2>
                    <div className="space-y-3 text-left">
                        {Array.isArray(section.content) && section.content.map((faq: any, idx: number) => (
                            <div key={idx} className="p-5 rounded-xl bg-slate-900/30 border border-slate-850">
                                <h3 className="text-xs font-bold text-white mb-1.5">{faq.question}</h3>
                                <p className="text-xs text-slate-400 leading-relaxed">{faq.answer}</p>
                            </div>
                        ))}
                    </div>
                </section>
            );

        case "cta":
            return (
                <section className="py-10 px-6 my-6 text-center rounded-2xl border border-slate-850 bg-gradient-to-b from-slate-900 to-slate-950 max-w-4xl mx-auto relative overflow-hidden">
                    <div className="absolute inset-0 opacity-5 blur-xl pointer-events-none" style={{ backgroundColor: themeColor }} />
                    <h2 className="text-xl sm:text-2xl font-bold text-white mb-2 max-w-xl mx-auto">{section.title}</h2>
                    {section.subtitle && <p className="text-slate-400 text-xs mb-6">{section.subtitle}</p>}
                    {section.ctaText && (
                        <button className="px-6 py-3 rounded-xl text-xs font-bold text-white shadow-md" style={{ backgroundColor: themeColor }}>
                            {section.ctaText}
                        </button>
                    )}
                </section>
            );

        default:
            return null;
    }
}

