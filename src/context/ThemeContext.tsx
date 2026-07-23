"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

type Theme = "dark" | "light";

interface ThemeContextType {
    theme: Theme;
    toggleTheme: () => void;
    setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType>({
    theme: "dark",
    toggleTheme: () => {},
    setTheme: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [theme, setThemeState] = useState<Theme>("dark");
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        // Read saved theme from localStorage or system preference
        const savedTheme = localStorage.getItem("pageforge_theme") as Theme | null;
        if (savedTheme === "light" || savedTheme === "dark") {
            setThemeState(savedTheme);
        } else {
            // Default to dark mode for PageForge
            setThemeState("dark");
        }
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!mounted) return;

        const root = document.documentElement;
        if (theme === "light") {
            root.classList.remove("dark");
            root.classList.add("light");
            root.setAttribute("data-theme", "light");
        } else {
            root.classList.remove("light");
            root.classList.add("dark");
            root.setAttribute("data-theme", "dark");
        }

        localStorage.setItem("pageforge_theme", theme);
    }, [theme, mounted]);

    const toggleTheme = () => {
        setThemeState((prev) => (prev === "dark" ? "light" : "dark"));
    };

    const setTheme = (newTheme: Theme) => {
        setThemeState(newTheme);
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);

/**
 * Reusable Theme Toggle Switch Component
 * Renders a compact, interactive Sun/Moon button that fits in any header/navbar
 */
export const ThemeToggle: React.FC<{ className?: string }> = ({ className = "" }) => {
    const { theme, toggleTheme } = useTheme();

    return (
        <button
            onClick={toggleTheme}
            type="button"
            className={`relative p-2 rounded-xl border transition-all flex items-center justify-center gap-2 text-xs font-semibold select-none ${
                theme === "light"
                    ? "bg-amber-500/10 border-amber-500/30 text-amber-600 hover:bg-amber-500/20"
                    : "bg-slate-800/80 border-slate-700/80 text-indigo-300 hover:bg-slate-800 hover:text-white"
            } ${className}`}
            title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
            aria-label="Toggle theme"
        >
            {theme === "dark" ? (
                <>
                    <Sun className="w-4 h-4 text-amber-400 animate-spin-slow" />
                    <span className="hidden sm:inline">Light</span>
                </>
            ) : (
                <>
                    <Moon className="w-4 h-4 text-indigo-600" />
                    <span className="hidden sm:inline">Dark</span>
                </>
            )}
        </button>
    );
};
