"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getLandingPageById, updateLandingPage } from "@/lib/db";
import { LandingPage, PageSection, SectionType } from "@/types";
import {
    Sparkles, ArrowLeft, ArrowUp, ArrowDown, Trash2,
    Copy, Plus, Save, Monitor, Smartphone, Loader2, Edit3, Check, RotateCw,
    GripVertical, GripHorizontal, Move, Maximize2, ArrowLeftRight
} from "lucide-react";
import Link from "next/link";
import { exportPageToHTML } from "@/lib/exporter";

import toast from "react-hot-toast";
import { ThemeToggle } from "@/context/ThemeContext";

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

    // Canvas Interactive Drag & Drop and Resizing States
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
    const [resizingSectionId, setResizingSectionId] = useState<string | null>(null);
    const [resizeTooltip, setResizeTooltip] = useState<{ height: number; y: number } | null>(null);
    const [horizontalTooltip, setHorizontalTooltip] = useState<{ width: number; x: number } | null>(null);

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

    if (loading || !page) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
        );
    }

    // Save Page changes to Firestore
    const handleSave = async () => {
        if (!page || !pageId) return;
        setSaving(true);
        setSaveSuccess(false);

        try {
            const updatedPage: LandingPage = {
                ...page,
                themeColor: globalThemeColor,
                updatedAt: Date.now()
            };

            await updateLandingPage(pageId, updatedPage);
            setPage(updatedPage);
            setSaveSuccess(true);
            toast.success("Page configuration saved successfully!");
            setTimeout(() => setSaveSuccess(false), 2500);
        } catch (error) {
            console.error("Error saving page:", error);
            toast.error("Failed to save changes.");
        } finally {
            setSaving(false);
        }
    };

    // Export HTML code
    const handleExportHTML = () => {
        if (!page) return;
        const htmlCode = exportPageToHTML({ ...page, themeColor: globalThemeColor });
        const blob = new Blob([htmlCode], { type: "text/html" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${page.title.toLowerCase().replace(/[^a-z0-9]/g, "-")}-pageforge.html`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Exported standalone HTML file!");
    };

    // Reorder sections via sidebar buttons
    const handleSectionReorder = (index: number, direction: "up" | "down") => {
        if (!page) return;
        const targetIndex = direction === "up" ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= page.sections.length) return;

        const updatedSections = [...page.sections];
        const temp = updatedSections[index];
        updatedSections[index] = updatedSections[targetIndex];
        updatedSections[targetIndex] = temp;

        setPage({ ...page, sections: updatedSections });
    };

    // Canvas HTML5 Drag & Drop Handlers
    const handleCanvasDragStart = (e: React.DragEvent, index: number) => {
        setDraggedIndex(index);
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", index.toString());
    };

    const handleCanvasDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        e.stopPropagation();
        if (dragOverIndex !== index) {
            setDragOverIndex(index);
        }
    };

    const handleCanvasDrop = (e: React.DragEvent, targetIndex: number) => {
        e.preventDefault();
        e.stopPropagation();

        if (draggedIndex === null || draggedIndex === targetIndex) {
            setDraggedIndex(null);
            setDragOverIndex(null);
            return;
        }

        const updatedSections = [...page.sections];
        const [movedSection] = updatedSections.splice(draggedIndex, 1);
        updatedSections.splice(targetIndex, 0, movedSection);

        setPage({ ...page, sections: updatedSections });
        setSelectedSectionId(movedSection.id);
        toast.success(`Reordered ${movedSection.type.toUpperCase()} section!`, { duration: 1500 });

        setDraggedIndex(null);
        setDragOverIndex(null);
    };

    const handleCanvasDragEnd = () => {
        setDraggedIndex(null);
        setDragOverIndex(null);
    };

    // Mouse Drag Resizing Handler for Vertical Section Height
    const handleStartVerticalResize = (e: React.MouseEvent, sectionId: string, currentMinHeight: number = 280) => {
        e.preventDefault();
        e.stopPropagation();

        setResizingSectionId(sectionId);
        const startY = e.clientY;
        const startHeight = currentMinHeight;

        const handleMouseMove = (moveEvent: MouseEvent) => {
            const deltaY = moveEvent.clientY - startY;
            const newHeight = Math.max(120, Math.min(900, Math.round(startHeight + deltaY)));

            setResizeTooltip({ height: newHeight, y: moveEvent.clientY });

            setPage((prevPage) => {
                if (!prevPage) return null;
                return {
                    ...prevPage,
                    sections: prevPage.sections.map((sec) =>
                        sec.id === sectionId ? { ...sec, minHeight: newHeight } : sec
                    ),
                };
            });
        };

        const handleMouseUp = () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
            setResizingSectionId(null);
            setResizeTooltip(null);
            toast.success("Section height updated!", { id: "resize-toast", duration: 1200 });
        };

        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);
    };

    // Mouse Drag Resizing Handler for Horizontal Section Width (Max-Width)
    const handleStartHorizontalResize = (
        e: React.MouseEvent,
        sectionId: string,
        side: "left" | "right",
        currentMaxWidth: number = 800
    ) => {
        e.preventDefault();
        e.stopPropagation();

        setResizingSectionId(sectionId);
        const startX = e.clientX;
        const startWidth = currentMaxWidth;

        const handleMouseMove = (moveEvent: MouseEvent) => {
            const deltaX = side === "right"
                ? moveEvent.clientX - startX
                : startX - moveEvent.clientX;

            const newWidth = Math.max(380, Math.min(1400, Math.round(startWidth + deltaX * 2)));

            setHorizontalTooltip({ width: newWidth, x: moveEvent.clientX });

            setPage((prevPage) => {
                if (!prevPage) return null;
                return {
                    ...prevPage,
                    sections: prevPage.sections.map((sec) =>
                        sec.id === sectionId ? { ...sec, maxWidth: newWidth } : sec
                    ),
                };
            });
        };

        const handleMouseUp = () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
            setResizingSectionId(null);
            setHorizontalTooltip(null);
            toast.success("Section width updated!", { id: "resize-w-toast", duration: 1200 });
        };

        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);
    };

    // Update section fields
    const updateSectionData = (sectionId: string, fields: Partial<PageSection>) => {
        if (!page) return;
        const updated = page.sections.map(s => s.id === sectionId ? { ...s, ...fields } : s);
        setPage({ ...page, sections: updated });
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
            minHeight: 280,
            paddingY: 40,
            maxWidth: 800,
            paddingX: 16,
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
                        <h1 className="text-sm font-bold text-white flex items-center gap-2">
                            {page.title}
                            <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                Visual Editor Sandbox
                            </span>
                        </h1>
                        <p className="text-[11px] text-slate-400">Drag handles to adjust vertical height & horizontal container width</p>
                    </div>
                </div>

                {/* Center Device View Switcher */}
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
                    <ThemeToggle />
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
                                        <GripVertical className="w-3.5 h-3.5 text-slate-500 hover:text-white cursor-grab" />
                                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-slate-400">
                                            {section.type.toUpperCase()}
                                        </span>
                                        <span className="text-xs font-bold truncate max-w-[90px]">{section.title}</span>
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
                            Customize Section Content & Dimensions
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
                                            rows={3}
                                        />
                                    </div>
                                )}

                                {/* Interactive Section Height & Width Dimension Sliders */}
                                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-4">
                                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                                        <span className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1">
                                            <Maximize2 className="w-3.5 h-3.5" /> Dimensions
                                        </span>
                                        <span className="text-[10px] text-slate-500">Mouse Drag Compliant</span>
                                    </div>

                                    {/* Vertical Height Slider */}
                                    <div>
                                        <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase mb-1">
                                            <span>Min Height (Vertical)</span>
                                            <span className="text-indigo-400 font-mono">{selectedSection.minHeight || 280}px</span>
                                        </div>
                                        <input
                                            type="range"
                                            min={120}
                                            max={900}
                                            step={10}
                                            value={selectedSection.minHeight || 280}
                                            onChange={(e) => updateSectionData(selectedSection.id, { minHeight: parseInt(e.target.value) })}
                                            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                        />
                                    </div>

                                    {/* Horizontal Max Width Slider */}
                                    <div>
                                        <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase mb-1">
                                            <span>Container Max Width (Horizontal)</span>
                                            <span className="text-indigo-400 font-mono">{selectedSection.maxWidth || 800}px</span>
                                        </div>
                                        <input
                                            type="range"
                                            min={380}
                                            max={1400}
                                            step={20}
                                            value={selectedSection.maxWidth || 800}
                                            onChange={(e) => updateSectionData(selectedSection.id, { maxWidth: parseInt(e.target.value) })}
                                            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                        />

                                        {/* Width Presets */}
                                        <div className="flex items-center gap-1.5 mt-2">
                                            {[
                                                { label: "Compact", width: 640 },
                                                { label: "Medium", width: 800 },
                                                { label: "Wide", width: 1024 },
                                                { label: "Full", width: 1280 }
                                            ].map((preset) => (
                                                <button
                                                    key={preset.label}
                                                    type="button"
                                                    onClick={() => updateSectionData(selectedSection.id, { maxWidth: preset.width })}
                                                    className={`text-[9px] px-2 py-0.5 rounded border transition-colors ${selectedSection.maxWidth === preset.width
                                                        ? "bg-indigo-600 text-white border-indigo-500"
                                                        : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
                                                        }`}
                                                >
                                                    {preset.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Vertical Padding Slider */}
                                    <div>
                                        <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase mb-1">
                                            <span>Vertical Padding (Top/Bottom)</span>
                                            <span className="text-indigo-400 font-mono">{selectedSection.paddingY || 40}px</span>
                                        </div>
                                        <input
                                            type="range"
                                            min={16}
                                            max={160}
                                            step={4}
                                            value={selectedSection.paddingY || 40}
                                            onChange={(e) => updateSectionData(selectedSection.id, { paddingY: parseInt(e.target.value) })}
                                            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                        />
                                    </div>

                                    {/* Horizontal Padding Slider */}
                                    <div>
                                        <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase mb-1">
                                            <span>Horizontal Side Padding</span>
                                            <span className="text-indigo-400 font-mono">{selectedSection.paddingX || 16}px</span>
                                        </div>
                                        <input
                                            type="range"
                                            min={8}
                                            max={120}
                                            step={4}
                                            value={selectedSection.paddingX || 16}
                                            onChange={(e) => updateSectionData(selectedSection.id, { paddingX: parseInt(e.target.value) })}
                                            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                        />
                                    </div>
                                </div>

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
                    <div className="p-5 border-t border-slate-800 bg-slate-950/40 space-y-4">

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
                        <div className="pt-3 border-t border-slate-800/80">
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

                        {/* Export Standalone HTML */}
                        <div className="pt-3 border-t border-slate-800/80">
                            <button
                                onClick={handleExportHTML}
                                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition-all flex items-center justify-center gap-2"
                            >
                                <Save className="w-3.5 h-3.5 text-indigo-400" />
                                Export Standalone HTML
                            </button>
                        </div>
                    </div>
                </aside>

                {/* 2B. Right Canvas Workspace & Simulator */}
                <main className="flex-1 bg-slate-950 p-6 sm:p-10 overflow-y-auto flex flex-col items-center justify-start relative">

                    {/* Vertical Resize Live Tooltip Overlay */}
                    {resizingSectionId && resizeTooltip && (
                        <div
                            className="fixed z-50 px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-2xl pointer-events-none animate-pulse flex items-center gap-2"
                            style={{ top: resizeTooltip.y - 40, left: "50%", transform: "translateX(-50%)" }}
                        >
                            <Maximize2 className="w-3.5 h-3.5" />
                            <span>Height: {resizeTooltip.height}px</span>
                        </div>
                    )}

                    {/* Horizontal Resize Live Tooltip Overlay */}
                    {resizingSectionId && horizontalTooltip && (
                        <div
                            className="fixed z-50 px-3 py-1.5 rounded-xl bg-violet-600 text-white text-xs font-bold shadow-2xl pointer-events-none animate-pulse flex items-center gap-2"
                            style={{ top: "120px", left: horizontalTooltip.x, transform: "translateX(-50%)" }}
                        >
                            <ArrowLeftRight className="w-3.5 h-3.5" />
                            <span>Width: {horizontalTooltip.width}px</span>
                        </div>
                    )}

                    {/* Mobile Device Simulation Toolbar Controls */}
                    {isPreviewMobile && (
                        <div className="mb-6 flex flex-wrap items-center justify-center gap-3 bg-slate-900/90 p-2.5 rounded-2xl border border-slate-800 shadow-xl z-10 backdrop-blur text-xs">
                            <div className="flex items-center gap-1.5 text-slate-400 font-medium px-2">
                                <Smartphone className="w-4 h-4 text-indigo-400" />
                                <span>Preset:</span>
                                <select
                                    value={mobileWidth}
                                    onChange={(e) => setMobileWidth(Number(e.target.value))}
                                    className="bg-slate-950 border border-slate-800 text-white rounded-lg px-2 py-1 text-xs focus:outline-none cursor-pointer"
                                >
                                    <option value={375}>iPhone SE / Mini (375px)</option>
                                    <option value={390}>iPhone 14 / 15 Pro (390px)</option>
                                    <option value={430}>iPhone Pro Max (430px)</option>
                                    <option value={412}>Google Pixel (412px)</option>
                                    <option value={360}>Android Compact (360px)</option>
                                </select>
                            </div>

                            <div className="h-4 w-px bg-slate-800" />

                            <button
                                onClick={() => setIsLandscape(!isLandscape)}
                                className={`px-2.5 py-1 rounded-lg flex items-center gap-1 font-semibold transition-all ${isLandscape ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-300 hover:text-white"}`}
                                title="Toggle Screen Orientation"
                            >
                                <RotateCw className="w-3.5 h-3.5" />
                                {isLandscape ? "Landscape" : "Portrait"}
                            </button>

                            <div className="h-4 w-px bg-slate-800" />

                            <span className="text-slate-400 font-mono">
                                {isLandscape ? `700px × ${mobileWidth}px` : `${mobileWidth}px × 700px`}
                            </span>
                        </div>
                    )}

                    {/* The Simulator Frame */}
                    <div className="relative max-w-full">
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

                            {/* Section Canvas List with Interactive Drag & Resize Handles */}
                            <div className="space-y-8 py-8 px-2 sm:px-4">
                                {page.sections.map((section, idx) => {
                                    const isSelected = selectedSectionId === section.id;
                                    const isDragging = draggedIndex === idx;
                                    const isTarget = dragOverIndex === idx;

                                    return (
                                        <div
                                            key={section.id}
                                            draggable
                                            onDragStart={(e) => handleCanvasDragStart(e, idx)}
                                            onDragOver={(e) => handleCanvasDragOver(e, idx)}
                                            onDrop={(e) => handleCanvasDrop(e, idx)}
                                            onDragEnd={handleCanvasDragEnd}
                                            onClick={() => setSelectedSectionId(section.id)}
                                            className={`group relative rounded-3xl border transition-all duration-200 ${isSelected
                                                ? "border-indigo-500 shadow-xl ring-2 ring-indigo-500/50 bg-slate-900/10"
                                                : "border-slate-800 hover:border-slate-700"
                                                } ${isDragging ? "opacity-30 scale-[0.98] border-dashed border-indigo-400" : ""} ${isTarget ? "border-t-4 border-t-indigo-500 ring-4 ring-indigo-500/20" : ""}`}
                                        >
                                            {/* Left Interactive Side Resize Handle (Horizontal Width) */}
                                            <div
                                                onMouseDown={(e) => handleStartHorizontalResize(e, section.id, "left", section.maxWidth || 800)}
                                                className="group/hresize-l absolute -left-2 top-4 bottom-4 w-4 hover:w-5 cursor-ew-resize flex items-center justify-center z-20 transition-all select-none"
                                                title="Click and drag horizontally to resize section container width"
                                            >
                                                <div className="w-1.5 h-12 bg-slate-700/60 group-hover/hresize-l:bg-indigo-500 rounded-full shadow-lg transition-colors" />
                                            </div>

                                            {/* Right Interactive Side Resize Handle (Horizontal Width) */}
                                            <div
                                                onMouseDown={(e) => handleStartHorizontalResize(e, section.id, "right", section.maxWidth || 800)}
                                                className="group/hresize-r absolute -right-2 top-4 bottom-4 w-4 hover:w-5 cursor-ew-resize flex items-center justify-center z-20 transition-all select-none"
                                                title="Click and drag horizontally to resize section container width"
                                            >
                                                <div className="w-1.5 h-12 bg-slate-700/60 group-hover/hresize-r:bg-indigo-500 rounded-full shadow-lg transition-colors" />
                                            </div>

                                            {/* Canvas Section Control Bar Header (Appears on Hover / Selection) */}
                                            <div className={`absolute -top-4 left-4 right-4 h-8 px-3 rounded-xl bg-slate-900 border border-slate-700/80 shadow-lg flex items-center justify-between z-20 backdrop-blur transition-opacity duration-200 ${isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
                                                <div className="flex items-center gap-2">
                                                    {/* Drag Handle Icon */}
                                                    <div
                                                        className="p-1 rounded hover:bg-slate-800 text-indigo-400 cursor-grab active:cursor-grabbing flex items-center gap-1"
                                                        title="Drag with cursor to reorder section"
                                                    >
                                                        <GripVertical className="w-4 h-4" />
                                                        <Move className="w-3 h-3 text-slate-400" />
                                                    </div>
                                                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-300 font-mono">
                                                        {section.type.toUpperCase()}
                                                    </span>
                                                </div>

                                                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                                    {/* Size Badge */}
                                                    <span className="text-[10px] text-slate-400 font-mono px-2 py-0.5 rounded bg-slate-950 border border-slate-800">
                                                        📏 {section.minHeight || 280}px × ↔️ {section.maxWidth || 800}px
                                                    </span>

                                                    <button
                                                        onClick={() => handleSectionReorder(idx, "up")}
                                                        disabled={idx === 0}
                                                        className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-30"
                                                        title="Move Up"
                                                    >
                                                        <ArrowUp className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleSectionReorder(idx, "down")}
                                                        disabled={idx === page.sections.length - 1}
                                                        className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-30"
                                                        title="Move Down"
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

                                            {/* Render Section Content */}
                                            <div className="pt-2">
                                                <SectionPreviewer section={section} themeColor={globalThemeColor} />
                                            </div>

                                            {/* Bottom Interactive Mouse Resize Bar (Vertical Height) */}
                                            <div
                                                onMouseDown={(e) => handleStartVerticalResize(e, section.id, section.minHeight || 280)}
                                                className="group/resize h-4 w-full bg-slate-900/60 hover:bg-indigo-600/80 cursor-ns-resize flex items-center justify-center rounded-b-3xl border-t border-slate-800 transition-all select-none relative z-10"
                                                title="Click and drag vertically to resize section height with cursor"
                                            >
                                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 group-hover/resize:text-white">
                                                    <GripHorizontal className="w-4 h-3" />
                                                    <span className="hidden sm:inline">Drag to Resize Height</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}

// ==========================================
// RENDER SANDBOX SECTION PREVIEWER
// ==========================================

function SectionPreviewer({ section, themeColor }: { section: PageSection; themeColor: string }) {
    const customStyle: React.CSSProperties = {
        minHeight: section.minHeight ? `${section.minHeight}px` : undefined,
        paddingTop: section.paddingY ? `${section.paddingY}px` : undefined,
        paddingBottom: section.paddingY ? `${section.paddingY}px` : undefined,
        maxWidth: section.maxWidth ? `${section.maxWidth}px` : undefined,
        width: section.maxWidth ? "100%" : undefined,
        paddingLeft: section.paddingX ? `${section.paddingX}px` : undefined,
        paddingRight: section.paddingX ? `${section.paddingX}px` : undefined,
    };

    switch (section.type) {
        case "hero":
            return (
                <section style={customStyle} className="py-12 sm:py-16 px-4 text-center relative overflow-hidden flex flex-col justify-center mx-auto">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full blur-3xl opacity-10 pointer-events-none" style={{ backgroundColor: themeColor }} />
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center max-w-4xl mx-auto text-left w-full">
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
                <section style={customStyle} className="py-10 px-4 border-t border-slate-900 max-w-4xl mx-auto flex flex-col justify-center">
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
                <section style={customStyle} className="py-10 px-4 border-t border-slate-900 max-w-4xl mx-auto flex flex-col justify-center">
                    <h2 className="text-xl font-bold text-center text-white mb-2">{section.title}</h2>
                    {section.subtitle && <p className="text-slate-400 text-xs text-center mb-8">{section.subtitle}</p>}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto w-full">
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
                <section style={customStyle} className="py-10 px-4 border-t border-slate-900 max-w-3xl mx-auto flex flex-col justify-center">
                    <h2 className="text-xl font-bold text-center text-white mb-8">{section.title}</h2>
                    <div className="space-y-3 text-left w-full">
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
                <section style={customStyle} className="py-10 px-6 my-6 text-center rounded-2xl border border-slate-850 bg-gradient-to-b from-slate-900 to-slate-950 max-w-4xl mx-auto relative overflow-hidden flex flex-col justify-center items-center">
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
