// Personal navigation links data configuration file
// Used to manage data for the personal navigation page
const navLinkModules = import.meta.glob('../content/navigation/**/*.json', { eager: true });

export interface NavLink {
    id: string;
    title: string;
    url: string;
    icon?: string;
    description?: string;
    category?: string;
    pinned?: boolean;
    tags?: string[];
}

export const navLinksData: NavLink[] = Object.entries(navLinkModules).map(([path, mod]: [string, any]) => {
    const id = path.split('/').pop()?.replace('.json', '') || '';
    const data = mod.default;
    return { id, ...data } as NavLink;
});

/**
 * Get all unique categories from navigation links
 */
export function getNavLinkCategories(): string[] {
    const categories = new Set<string>();
    navLinksData.forEach(link => {
        if (link.category) {
            categories.add(link.category);
        }
    });
    return Array.from(categories).sort();
}

/**
 * Get navigation links grouped by category
 */
export function getNavLinksByCategory(): Record<string, NavLink[]> {
    const grouped: Record<string, NavLink[]> = {};
    navLinksData.forEach(link => {
        const category = link.category || 'uncategorized';
        if (!grouped[category]) {
            grouped[category] = [];
        }
        grouped[category].push(link);
    });
    return grouped;
}

/**
 * Get pinned navigation links
 */
export function getPinnedNavLinks(): NavLink[] {
    return navLinksData.filter(link => link.pinned);
}
