"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getUserLandingPages, createLandingPage, deleteLandingPage } from "@/lib/db";
import { LandingPage } from "@/types";
import { useRouter } from "next/navigation";
import { Sparkles, Plus, Trash2, LogOut, FileText, Loader2 } from "lucide-react";

export default function DashboardPage() {
    const { user, loading: authLoading, logout } = useAuth();
    const [pages, setPages] = useState<LandingPage[]>([]);
    const [loadingPages, setLoadingPages] = useState<boolean>(true);
    const [creating, setCreating] = useState<boolean>(false);
    const router = useRouter();

    // Redirect to login if unauthenticated
    useEffect(() => {
        if (!authLoading && !user) {
            router.push("/login");
        }
    }, [user, authLoading, router]);

    // Fetch user's pages when user loads
    useEffect(() => {
        async function fetchPages() {
            if (user) {
                try {
                    const userPages = await getUserLandingPages(user.uid);
                    setPages(userPages);
                } catch (error) {
                    console.error("Error fetching pages:", error);
                } finally {
                    setLoadingPages(false);
                }
            }
        }
        fetchPages();
    }, [user]);

    const handleCreateTestPage = async () => {
        if (!user) return;
        setCreating(true);
        try {
            const testPageTitle = `My Landing Page #${pages.length + 1}`;
            const slug = `landing-page-${Date.now()}`;

            await createLandingPage({
                userId: user.uid,
                title: testPageTitle,
                slug: slug,
                sections: [
                    {
                        id: "hero-1",
                        type: "hero",
                        order: 1,
                        content: {
                            headline: "Turn Your Ideas into High-Converting Landing Pages",
                            subheadline: "AI-powered builder that creates professional landing pages in seconds.",
                            ctaText: "Get Started Free",
                            ctaLink: "#pricing"
                        }
                    }
                ],
                theme: {
                    primaryColor: "#6366f1",
                    secondaryColor: "#a855f7",
                    fontFamily: "Inter"
                },
                isPublished: false,
                createdAt: Date.now(),
                updatedAt: Date.now()
            });

            // Reload pages list
            const updatedPages = await getUserLandingPages(user.uid);
            setPages(updatedPages);
        } catch (error) {
            console.error("Failed to create page:", error);
            alert("Error creating page. Check console and security rules.");
        } finally {
            setCreating(false);
        }
    };

    const handleDeletePage = async (pageId: string) => {
        if (!confirm("Are you sure you want to delete this landing page?")) return;
        try {
            await deleteLandingPage(pageId);
            setPages(pages.filter(p => p.id !== pageId));
        } catch (error) {
            console.error("Failed to delete page:", error);
        }
    };

    if (authLoading || !user) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white">
            {/* Top Navbar */}
            <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                            <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-300">
                            PageForge Dashboard
                        </span>
                    </div>

                    <div className="flex items-center gap-4">
                        <span className="text-sm text-slate-400 hidden sm:inline">
                            Logged in as: <strong className="text-slate-200">{user.email}</strong>
                        </span>
                        <button
                            onClick={logout}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-sm font-medium text-slate-300 transition-colors"
                        >
                            <LogOut className="w-4 h-4" />
                            Sign Out
                        </button>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-extrabold text-white">Your Landing Pages</h1>
                        <p className="text-slate-400 text-sm mt-1">
                            Create, edit, and publish AI-generated landing pages in seconds.
                        </p>
                    </div>

                    <button
                        onClick={handleCreateTestPage}
                        disabled={creating}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-sm font-semibold text-white shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
                    >
                        {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                        Create Test Page (Phase 1 Check)
                    </button>
                </div>

                {/* Pages Grid */}
                {loadingPages ? (
                    <div className="flex justify-center items-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                    </div>
                ) : pages.length === 0 ? (
                    <div className="border border-dashed border-slate-800 rounded-2xl p-12 text-center bg-slate-900/30">
                        <FileText className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-white mb-2">No landing pages created yet</h3>
                        <p className="text-slate-400 text-sm max-w-sm mx-auto mb-6">
                            Click the &quot;Create Test Page&quot; button above to verify that your Firebase Auth &amp; Firestore database are connected perfectly!
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {pages.map((page) => (
                            <div
                                key={page.id}
                                className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between hover:border-slate-700 transition-all shadow-xl"
                            >
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-indigo-400 border border-slate-700">
                                            {page.isPublished ? "Published" : "Draft"}
                                        </span>
                                        <span className="text-xs text-slate-500">
                                            {new Date(page.updatedAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <h3 className="text-lg font-bold text-white mb-1">{page.title}</h3>
                                    <p className="text-xs text-slate-400 font-mono mb-4">/{page.slug}</p>
                                </div>

                                <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
                                    <span className="text-xs text-slate-400 font-medium">
                                        {page.sections.length} Section(s)
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleDeletePage(page.id!)}
                                            className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                            title="Delete Page"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
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
