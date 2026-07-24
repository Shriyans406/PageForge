import { LandingPage, PageSection } from "@/types";

/**
 * Compiles a LandingPage JSON config into a single standalone HTML document.
 */
export function exportPageToHTML(page: LandingPage): string {
    const themeColor = page.themeColor || "#6366f1";

    // Generate sections markup
    const sectionsHTML = page.sections.map(s => renderSectionHTML(s, themeColor)).join("\n");

    return `<!DOCTYPE html>
<html lang="en" class="scroll-smooth">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHTML(page.title)}</title>
    <meta name="description" content="${escapeHTML(page.description)}">
    
    <!-- Tailwind CSS CDN -->
    <script src="https://cdn.tailwindcss.com"></script>
    
    <!-- Google Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
    
    <!-- Lucide Icons CDN -->
    <script src="https://unpkg.com/lucide@latest"></script>
    
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    fontFamily: {
                        sans: ['Inter', 'sans-serif'],
                        outfit: ['Outfit', 'sans-serif'],
                    }
                }
            }
        }
    </script>
    
    <style>
        body {
            font-family: 'Inter', sans-serif;
            background-color: #020617;
            color: #ffffff;
        }
        h1, h2, h3 {
            font-family: 'Outfit', sans-serif;
        }
    </style>
</head>
<body class="selection:bg-indigo-500 selection:text-white">

    ${sectionsHTML}

    <!-- Footer -->
    <footer class="border-t border-slate-900 py-12 text-center text-xs text-slate-500 bg-slate-950/50">
        <p class="font-semibold text-slate-400 mb-1">${escapeHTML(page.title)}</p>
        <p>&copy; ${new Date().getFullYear()} All rights reserved. Created effortlessly with PageForge AI.</p>
    </footer>

    <!-- Initialize Lucide Icons -->
    <script>
        lucide.createIcons();
    </script>
</body>
</html>`;
}

function renderSectionHTML(section: PageSection, themeColor: string): string {
    const customStyles = [
        section.minHeight ? `min-height: ${section.minHeight}px;` : "",
        section.paddingY ? `padding-top: ${section.paddingY}px; padding-bottom: ${section.paddingY}px;` : "",
        section.maxWidth ? `max-width: ${section.maxWidth}px; width: 100%;` : "",
        section.paddingX ? `padding-left: ${section.paddingX}px; padding-right: ${section.paddingX}px;` : ""
    ].filter(Boolean).join(" ");
    const styleAttr = customStyles ? `style="${customStyles}"` : "";

    switch (section.type) {
        case "hero":
            return `
    <section ${styleAttr} class="py-24 sm:py-32 px-4 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center relative overflow-hidden">
        <div class="absolute right-0 top-1/4 w-96 h-96 rounded-full blur-3xl opacity-15 pointer-events-none" style="background-color: ${themeColor}"></div>
        <div class="lg:col-span-7 text-left flex flex-col justify-center">
            <h1 class="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white mb-6 leading-tight">
                ${escapeHTML(section.title)}
            </h1>
            <p class="text-base sm:text-lg text-slate-400 mb-8 leading-relaxed max-w-xl">
                ${escapeHTML(section.subtitle || "")}
            </p>
            ${section.ctaText ? `
            <div>
                <a href="${escapeHTML(section.ctaLink || "#")}" class="inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-white text-base sm:text-lg shadow-xl hover:shadow-2xl hover:opacity-90 transition-all transform hover:-translate-y-0.5" style="background-color: ${themeColor}">
                    ${escapeHTML(section.ctaText)}
                    <i data-lucide="arrow-right" class="w-5 h-5"></i>
                </a>
            </div>` : ""}
        </div>
        ${section.imageUrl ? `
        <div class="lg:col-span-5 flex justify-center lg:justify-end">
            <div class="relative group w-full max-w-md lg:max-w-none">
                <div class="absolute -inset-1 rounded-[2.5rem] blur-xl opacity-35 transition-opacity duration-505" style="background-color: ${themeColor}"></div>
                <div class="relative bg-slate-900/80 p-4 rounded-[2rem] border border-slate-700/50 shadow-2xl backdrop-blur overflow-hidden flex items-center justify-center">
                    <img src="${escapeHTML(section.imageUrl)}" alt="${escapeHTML(section.title)}" class="rounded-2xl w-full h-auto object-cover aspect-video sm:aspect-square lg:aspect-auto">
                </div>
            </div>
        </div>` : ""}
    </section>`;

        case "features":
            const featuresList = Array.isArray(section.content) ? section.content.map((item: any, idx: number) => `
            <div class="p-8 rounded-3xl bg-slate-900/40 border border-slate-800/80 hover:border-slate-700 transition-all">
                <div class="w-12 h-12 rounded-2xl flex items-center justify-center mb-6 font-bold text-lg shadow-lg" style="background-color: ${themeColor}33; color: ${themeColor}">
                    ${idx + 1}
                </div>
                <h3 class="text-xl font-bold text-white mb-3">${escapeHTML(item.title || "")}</h3>
                <p class="text-slate-400 leading-relaxed text-sm">${escapeHTML(item.description || "")}</p>
            </div>`).join("\n") : "";

            return `
    <section ${styleAttr} class="py-20 px-4 max-w-7xl mx-auto border-t border-slate-900">
        <div class="text-center max-w-3xl mx-auto mb-16">
            <h2 class="text-3xl sm:text-4xl font-extrabold text-white mb-4">${escapeHTML(section.title)}</h2>
            ${section.subtitle ? `<p class="text-slate-400 text-lg">${escapeHTML(section.subtitle)}</p>` : ""}
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
            ${featuresList}
        </div>
    </section>`;

        case "pricing":
            const plansList = Array.isArray(section.content) ? section.content.map((plan: any, idx: number) => `
            <div class="p-8 rounded-3xl border flex flex-col justify-between relative ${idx === 1 ? "bg-slate-900/80 border-indigo-500/50 shadow-2xl" : "bg-slate-900/30 border-slate-800"}">
                ${idx === 1 ? `<span class="absolute -top-3.5 right-8 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-500 text-white">Most Popular</span>` : ""}
                <div>
                    <h3 class="text-xl font-bold text-white mb-2">${escapeHTML(plan.plan || "")}</h3>
                    <div class="flex items-baseline gap-1 mb-6">
                        <span class="text-4xl font-extrabold text-white">${escapeHTML(plan.price || "")}</span>
                        <span class="text-slate-400 text-sm">${escapeHTML(plan.period || "")}</span>
                    </div>
                    <ul class="space-y-3.5 mb-8">
                        ${Array.isArray(plan.features) ? plan.features.map((feat: string) => `
                        <li class="flex items-center gap-2.5 text-sm text-slate-300">
                            <i data-lucide="check-circle-2" class="w-4 h-4 text-emerald-400 shrink-0"></i>
                            ${escapeHTML(feat)}
                        </li>`).join("\n") : ""}
                    </ul>
                </div>
                <button class="w-full py-3.5 rounded-xl font-bold text-sm transition-all" style="${idx === 1 ? `background-color: ${themeColor}; color: #ffffff;` : `background-color: #1e293b; color: #e2e8f0;`}">
                    ${escapeHTML(plan.ctaText || "Choose Plan")}
                </button>
            </div>`).join("\n") : "";

            return `
    <section ${styleAttr} class="py-20 px-4 max-w-6xl mx-auto border-t border-slate-900">
        <div class="text-center max-w-3xl mx-auto mb-16">
            <h2 class="text-3xl sm:text-4xl font-extrabold text-white mb-4">${escapeHTML(section.title)}</h2>
            ${section.subtitle ? `<p class="text-slate-400 text-lg">${escapeHTML(section.subtitle)}</p>` : ""}
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            ${plansList}
        </div>
    </section>`;

        case "faq":
            const faqList = Array.isArray(section.content) ? section.content.map((faq: any) => `
            <div class="p-6 sm:p-8 rounded-2xl bg-slate-900/40 border border-slate-800">
                <h3 class="text-lg font-bold text-white mb-2 flex items-start gap-3">
                    <span class="text-indigo-400 font-extrabold">Q.</span>
                    ${escapeHTML(faq.question || "")}
                </h3>
                <p class="text-slate-400 text-sm sm:text-base leading-relaxed pl-7">
                    ${escapeHTML(faq.answer || "")}
                </p>
            </div>`).join("\n") : "";

            return `
    <section ${styleAttr} class="py-20 px-4 max-w-3xl mx-auto border-t border-slate-900">
        <div class="text-center max-w-3xl mx-auto mb-16">
            <h2 class="text-3xl sm:text-4xl font-extrabold text-white mb-4">${escapeHTML(section.title)}</h2>
        </div>
        <div class="space-y-4">
            ${faqList}
        </div>
    </section>`;

        case "cta":
            return `
    <section ${styleAttr} class="py-20 px-8 my-12 text-center rounded-3xl border border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950 max-w-5xl mx-auto relative overflow-hidden shadow-2xl">
        <div class="absolute inset-0 opacity-10 blur-2xl pointer-events-none" style="background-color: ${themeColor}"></div>
        <h2 class="text-3xl sm:text-4xl font-extrabold text-white mb-4 max-w-2xl mx-auto leading-tight">${escapeHTML(section.title)}</h2>
        ${section.subtitle ? `<p class="text-slate-400 text-base sm:text-lg mb-8 max-w-xl mx-auto">${escapeHTML(section.subtitle)}</p>` : ""}
        ${section.ctaText ? `
        <div>
            <a href="${escapeHTML(section.ctaLink || "#")}" class="inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-white text-base shadow-xl hover:shadow-2xl transition-all" style="background-color: ${themeColor}">
                ${escapeHTML(section.ctaText)}
                <i data-lucide="arrow-right" class="w-5 h-5"></i>
            </a>
        </div>` : ""}
    </section>`;

        default:
            return "";
    }
}

function escapeHTML(str: string): string {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}