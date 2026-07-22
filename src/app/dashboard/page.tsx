"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getUserLandingPages, createLandingPage, deleteLandingPage } from "@/lib/db";
import { LandingPage } from "@/types";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
    Sparkles, Plus, Trash2, ExternalLink, Loader2, Wand2, FileText,
    Search, Filter, TrendingUp, Eye, MousePointerClick, LogOut, Copy,
    BarChart3, Layers, Globe, ArrowUpDown
} from "lucide-react";

import confetti from "canvas-confetti";
import toast from "react-hot-toast";

const PROMPT_SUGGESTIONS = [
    "AI invoice app for freelancers with automated reminders",
    "Fitness & workout tracking platform for busy professionals",
    "No-code developer portfolio builder with instant sync",
    "Online cohort-based course for product managers",
];

export default function DashboardPage() {
    const { user, loading: authLoading, logout } = useAuth();
    const router = useRouter();

    const [pages, setPages] = useState<LandingPage[]>([]);
    const [loadingPages, setLoadingPages] = useState<boolean>(true);
    const [creating, setCreating] = useState<boolean>(false);

    // AI Generator States
    const [promptText, setPromptText] = useState<string>("");
    const [aiGenerating, setAiGenerating] = useState<boolean>(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Search & Filter States
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [filterStatus, setFilterStatus] = useState<"all" | "published" | "draft">("all");
    const [sortBy, setSortBy] = useState<"newest" | "oldest" | "views" | "clicks">("newest");

    // Redirect if not logged in
    useEffect(() => {
        if (!authLoading && !user) {
            router.push("/login");
        }
    }, [user, authLoading, router]);

    // Fetch user's pages when user loads (with 10s timeout to prevent infinite spinner)
    useEffect(() => {
        async function fetchPages() {
            if (user) {
                try {
                    const timeoutPromise = new Promise<LandingPage[]>((_, reject) =>
                        setTimeout(() => reject(new Error("Firestore request timed out")), 10000)
                    );
                    const userPages = await Promise.race([
                        getUserLandingPages(user.uid),
                        timeoutPromise,
                    ]);
                    setPages(userPages);
                } catch (error) {
                    console.warn("Could not fetch pages (Firestore may be offline):", error);
                } finally {
                    setLoadingPages(false);
                }
            }
        }
        fetchPages();
    }, [user]);

    // Logout Handler
    const handleLogout = async () => {
        try {
            await logout();
            toast.success("Logged out successfully");
            router.push("/login");
        } catch (err) {
            console.error("Logout failed:", err);
            toast.error("Failed to log out");
        }
    };

    // 1. Create simple test page
    const handleCreateTestPage = async () => {
        if (!user) return;
        setCreating(true);
        setErrorMessage(null);
        try {
            const testPageTitle = `My Landing Page #${pages.length + 1}`;
            await createLandingPage({
                title: testPageTitle,
                description: "A quick test landing page draft.",
                userId: user.uid,
                isPublished: false,
                themeColor: "#6366f1",
                sections: [
                    {
                        id: "hero-1",
                        type: "hero",
                        title: "Welcome to My Gorgeous Landing Page",
                        subtitle: "Created with PageForge AI in seconds without writing code.",
                        ctaText: "Get Started Now",
                        ctaLink: "#signup",
                    },
                ],
            });

            const userPages = await getUserLandingPages(user.uid);
            setPages(userPages);
            toast.success("Draft created successfully!");
        } catch (error: any) {
            console.error("Error creating test page:", error);
            setErrorMessage(error.message || "Failed to create page. Ensure Firestore Database is created in your console.");
        } finally {
            setCreating(false);
        }
    };

    // 2. Generate complete page with Google Gemini AI
    const handleGenerateWithAI = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !promptText.trim()) return;

        setAiGenerating(true);
        setErrorMessage(null);

        try {
            const response = await fetch("/api/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt: promptText, userId: user.uid }),
            });

            const data = await response.json();

            if (!response.ok || data.error) {
                throw new Error(data.error || "Failed to generate AI page.");
            }

            await createLandingPage(data.page);

            const userPages = await getUserLandingPages(user.uid);
            setPages(userPages);
            setPromptText("");

            confetti({
                particleCount: 150,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#6366f1', '#8b5cf6', '#ec4899', '#ffffff']
            });
            toast.success("AI successfully built your page!");
        } catch (error: any) {
            console.error("Error generating AI page:", error);
            setErrorMessage(error.message || "Error generating page with Gemini.");
        } finally {
            setAiGenerating(false);
        }
    };

    // Delete a landing page
    const handleDeletePage = async (pageId: string) => {
        if (!confirm("Are you sure you want to delete this landing page?")) return;
        try {
            await deleteLandingPage(pageId);
            setPages((prev) => prev.filter((p) => p.id !== pageId));
            toast.success("Landing page deleted.");
        } catch (error) {
            console.error("Error deleting page:", error);
            toast.error("Failed to delete page.");
        }
    };

    // Copy public link
    const handleCopyLink = (pageId: string) => {
        const publicUrl = `${window.location.origin}/page/${pageId}`;
        navigator.clipboard.writeText(publicUrl);
        toast.success("Public link copied to clipboard!");
    };

    // Aggregate Analytics Metrics
    const totalViews = pages.reduce((acc, p) => acc + (p.views || 0), 0);
    const totalClicks = pages.reduce((acc, p) => acc + (p.clicks || 0), 0);
    const publishedCount = pages.filter((p) => p.isPublished).length;
    const avgConvRate = totalViews > 0 ? Math.round((totalClicks / totalViews) * 100) : 0;

    // Filter & Sort pages
    const filteredPages = pages
        .filter((p) => {
            const matchesSearch =
                p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.description.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesStatus =
                filterStatus === "all"
                    ? true
                    : filterStatus === "published"
                    ? p.isPublished
                    : !p.isPublished;
            return matchesSearch && matchesStatus;
        })
        .sort((a, b) => {
            if (sortBy === "oldest") return (a.createdAt || 0) - (b.createdAt || 0);
            if (sortBy === "views") return (b.views || 0) - (a.views || 0);
            if (sortBy === "clicks") return (b.clicks || 0) - (a.clicks || 0);
            return (b.createdAt || 0) - (a.createdAt || 0);
        });

    if (authLoading || !user) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-indigo-500 selection:text-white">
            {/* Navigation Bar */}
            <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                            <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-slate-400">
                            PageForge
                        </span>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-850 border border-slate-800 text-xs text-slate-300">
                            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            <span>{user.email}</span>
                        </div>

                        <button
                            onClick={handleLogout}
                            className="px-3 py-1.5 rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold border border-slate-800 transition-colors flex items-center gap-1.5"
                            title="Sign Out"
                        >
                            <LogOut className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Sign Out</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

                {/* Performance Analytics Overview Bar */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800/80 shadow-sm flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                            <Layers className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-slate-400">Total Pages</p>
                            <p className="text-xl font-extrabold text-white">{pages.length}</p>
                        </div>
                    </div>

                    <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800/80 shadow-sm flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                            <Globe className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-slate-400">Published</p>
                            <p className="text-xl font-extrabold text-emerald-400">{publishedCount}</p>
                        </div>
                    </div>

                    <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800/80 shadow-sm flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                            <Eye className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-slate-400">Total Views</p>
                            <p className="text-xl font-extrabold text-white">{totalViews}</p>
                        </div>
                    </div>

                    <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800/80 shadow-sm flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 shrink-0">
                            <TrendingUp className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-slate-400">Avg Conv. Rate</p>
                            <p className="text-xl font-extrabold text-violet-400">{avgConvRate}%</p>
                        </div>
                    </div>
                </div>

                {/* AI Prompt Creation Bar */}
                <div className="mb-12 p-8 rounded-3xl bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-900/50 border border-indigo-500/20 shadow-2xl relative overflow-hidden">
                    <div className="absolute -right-20 -top-20 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

                    <div className="max-w-3xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-xs font-semibold mb-4">
                            <Wand2 className="w-3.5 h-3.5 animate-pulse text-indigo-400" />
                            Gemini AI Generator
                        </div>
                        <h1 className="text-3xl font-extrabold text-white tracking-tight mb-2">
                            Describe Your Idea, Let AI Build Your Page
                        </h1>
                        <p className="text-slate-400 text-sm sm:text-base mb-6">
                            Enter any product, SaaS idea, course, or service below. Gemini 2.5 Flash will write persuasive headlines, feature lists, pricing plans, and FAQs instantly.
                        </p>

                        <form onSubmit={handleGenerateWithAI} className="flex flex-col sm:flex-row gap-3 mb-4">
                            <input
                                type="text"
                                value={promptText}
                                onChange={(e) => setPromptText(e.target.value)}
                                disabled={aiGenerating}
                                placeholder="e.g., An AI invoice app for freelancers with automated client follow-ups and expense tracking..."
                                className="flex-1 px-5 py-4 rounded-2xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm sm:text-base shadow-inner disabled:opacity-50 transition-all"
                            />
                            <button
                                type="submit"
                                disabled={aiGenerating || !promptText.trim()}
                                className="px-6 py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-sm sm:text-base shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                            >
                                {aiGenerating ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Generating Page...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-5 h-5" />
                                        Generate with AI
                                    </>
                                )}
                            </button>
                        </form>

                        {/* Quick Suggestion Chips */}
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs text-slate-500 font-medium mr-1">Quick ideas:</span>
                            {PROMPT_SUGGESTIONS.map((suggestion, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => setPromptText(suggestion)}
                                    className="text-xs px-2.5 py-1 rounded-lg bg-slate-800/60 hover:bg-indigo-600/20 text-slate-300 hover:text-indigo-300 border border-slate-700/50 transition-colors"
                                >
                                    {suggestion}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Error Banner if something goes wrong */}
                {errorMessage && (
                    <div className="mb-8 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm flex items-center justify-between">
                        <span>{errorMessage}</span>
                        <button onClick={() => setErrorMessage(null)} className="text-xs font-bold underline ml-4">
                            Dismiss
                        </button>
                    </div>
                )}

                {/* Section Header & Toolbar Controls */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h2 className="text-2xl font-bold text-white tracking-tight">Your Landing Pages</h2>
                        <p className="text-slate-400 text-sm mt-1">
                            Manage, preview, and edit your generated landing pages below.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        {/* Search Input */}
                        <div className="relative flex-1 sm:w-64">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search pages..."
                                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                            />
                        </div>

                        {/* Status Filter */}
                        <div className="flex items-center bg-slate-900 rounded-xl p-1 border border-slate-800 text-xs">
                            <button
                                onClick={() => setFilterStatus("all")}
                                className={`px-2.5 py-1 rounded-lg transition-all ${filterStatus === "all" ? "bg-indigo-600 text-white font-semibold" : "text-slate-400 hover:text-white"}`}
                            >
                                All ({pages.length})
                            </button>
                            <button
                                onClick={() => setFilterStatus("published")}
                                className={`px-2.5 py-1 rounded-lg transition-all ${filterStatus === "published" ? "bg-indigo-600 text-white font-semibold" : "text-slate-400 hover:text-white"}`}
                            >
                                Live ({publishedCount})
                            </button>
                            <button
                                onClick={() => setFilterStatus("draft")}
                                className={`px-2.5 py-1 rounded-lg transition-all ${filterStatus === "draft" ? "bg-indigo-600 text-white font-semibold" : "text-slate-400 hover:text-white"}`}
                            >
                                Draft ({pages.length - publishedCount})
                            </button>
                        </div>

                        {/* Sort Dropdown */}
                        <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-400">
                            <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as any)}
                                className="bg-transparent text-slate-200 focus:outline-none cursor-pointer font-medium"
                            >
                                <option value="newest" className="bg-slate-900">Newest</option>
                                <option value="oldest" className="bg-slate-900">Oldest</option>
                                <option value="views" className="bg-slate-900">Most Views</option>
                                <option value="clicks" className="bg-slate-900">Most Clicks</option>
                            </select>
                        </div>

                        {/* Create Quick Draft Button */}
                        <button
                            onClick={handleCreateTestPage}
                            disabled={creating || aiGenerating}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs border border-slate-700 transition-all disabled:opacity-50 shrink-0"
                        >
                            {creating ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                                <Plus className="w-3.5 h-3.5 text-slate-400" />
                            )}
                            + Quick Draft
                        </button>
                    </div>
                </div>

                {/* Pages Grid */}
                {loadingPages ? (
                    <div className="py-20 flex justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                    </div>
                ) : pages.length === 0 ? (
                    <div className="text-center py-20 bg-slate-900/30 rounded-3xl border border-slate-800/80 p-8">
                        <div className="w-16 h-16 rounded-2xl bg-slate-800/50 flex items-center justify-center mx-auto mb-4 text-slate-500">
                            <FileText className="w-8 h-8" />
                        </div>
                        <h3 className="text-lg font-semibold text-white mb-2">No landing pages created yet</h3>
                        <p className="text-slate-400 text-sm max-w-sm mx-auto mb-6">
                            Type your product idea inside the AI prompt box above and let Gemini build your first high-converting page!
                        </p>
                    </div>
                ) : filteredPages.length === 0 ? (
                    <div className="text-center py-16 bg-slate-900/20 rounded-3xl border border-slate-800/50 p-8">
                        <p className="text-slate-400 text-sm mb-4">No pages match your search or filter settings.</p>
                        <button
                            onClick={() => { setSearchQuery(""); setFilterStatus("all"); }}
                            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
                        >
                            Clear Filters
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredPages.map((page) => (
                            <div
                                key={page.id}
                                className="bg-slate-900/60 rounded-2xl border border-slate-800 p-6 flex flex-col justify-between hover:border-slate-700 transition-all shadow-lg group relative overflow-hidden"
                            >
                                <div
                                    className="absolute top-0 left-0 right-0 h-1"
                                    style={{ backgroundColor: page.themeColor || "#6366f1" }}
                                />

                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${page.isPublished
                                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                                : "bg-slate-800 text-slate-400 border-slate-700/60"
                                                }`}>
                                                {page.isPublished ? "Published" : "Draft"}
                                            </span>

                                            {page.abTestEnabled && (
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-indigo-500/10 text-indigo-400 border-indigo-500/20">
                                                    A/B Active
                                                </span>
                                            )}

                                            {page.isPublished && (
                                                <button
                                                    onClick={() => handleCopyLink(page.id!)}
                                                    className="text-[10px] text-slate-400 hover:text-white underline font-semibold transition-colors flex items-center gap-1"
                                                    title="Copy Public Link"
                                                >
                                                    <Copy className="w-3 h-3" />
                                                    Copy Link
                                                </button>
                                            )}
                                        </div>
                                        <span
                                            className="w-3 h-3 rounded-full shadow-sm"
                                            style={{ backgroundColor: page.themeColor || "#6366f1" }}
                                            title="Theme Color"
                                        />
                                    </div>

                                    <h3 className="text-lg font-bold text-white mb-2 group-hover:text-indigo-400 transition-colors line-clamp-1">
                                        {page.title}
                                    </h3>
                                    <p className="text-sm text-slate-400 mb-6 line-clamp-2">
                                        {page.description}
                                    </p>
                                </div>

                                <div className="pt-4 border-t border-slate-800/80 flex flex-col gap-4">
                                    {/* Analytics Metrics */}
                                    <div className="flex items-center justify-between px-1">
                                        <div className="text-center">
                                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Views</p>
                                            <p className="text-sm font-extrabold text-slate-200">{page.views || 0}</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Clicks</p>
                                            <p className="text-sm font-extrabold text-slate-200">{page.clicks || 0}</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Conv. Rate</p>
                                            <p className="text-sm font-extrabold text-indigo-400">
                                                {page.views && page.views > 0
                                                    ? Math.round(((page.clicks || 0) / page.views) * 100)
                                                    : 0}%
                                            </p>
                                        </div>
                                    </div>

                                    {page.abTestEnabled && (
                                        <div className="mt-2 p-3 bg-indigo-950/30 border border-indigo-500/20 rounded-xl flex flex-col gap-2">
                                            <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider text-center">A/B Test Results</p>
                                            <div className="flex items-center justify-between">
                                                <div className="text-center">
                                                    <p className="text-[10px] text-slate-400 mb-1">Variant A</p>
                                                    <p className="text-xs font-bold text-slate-200">
                                                        {page.viewsA && page.viewsA > 0 ? Math.round(((page.clicksA || 0) / page.viewsA) * 100) : 0}% Conv.
                                                    </p>
                                                </div>
                                                <div className="w-px h-6 bg-slate-700/50"></div>
                                                <div className="text-center">
                                                    <p className="text-[10px] text-slate-400 mb-1">Variant B</p>
                                                    <p className="text-xs font-bold text-slate-200">
                                                        {page.viewsB && page.viewsB > 0 ? Math.round(((page.clicksB || 0) / page.viewsB) * 100) : 0}% Conv.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Actions */}
                                    <div className="flex items-center justify-between pt-2">
                                        <span className="text-xs text-slate-500 font-medium">
                                            {page.sections.length} Section(s)
                                        </span>

                                        <div className="flex items-center gap-2">
                                            <Link
                                                href={`/editor/${page.id}`}
                                                className="px-3 py-1.5 rounded-lg bg-slate-850 hover:bg-slate-800 text-slate-200 text-xs font-semibold transition-colors flex items-center gap-1.5 border border-slate-700/50"
                                                title="Open Visual Builder"
                                            >
                                                Edit Page
                                            </Link>
                                            <Link
                                                href={`/page/${page.id}`}
                                                target="_blank"
                                                className="px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-xs font-semibold transition-colors flex items-center gap-1.5"
                                                title="View Live Preview"
                                            >
                                                View Page
                                                <ExternalLink className="w-3.5 h-3.5" />
                                            </Link>
                                            <button
                                                onClick={() => handleDeletePage(page.id!)}
                                                className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                                title="Delete Page"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}