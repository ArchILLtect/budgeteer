export type SidebarLink = { to: string; label: string };

export const SIDEBAR_WIDTH = {
  small: "200px",
  medium: "250px",
  large: "300px",
} as const;

export const sidebarItems: SidebarLink[] = [
    { to: "/planner", label: "Planner" },
    { to: "/accounts", label: "Accounts" },
    { to: "/tracker", label: "Tracker" },
    { to: "/imports", label: "Imports" },
    { to: "/profile", label: "Profile" },
    { to: "/settings", label: "Settings" },
];

export const publicSidebarItems: SidebarLink[] = [
  { to: "/", label: "Home" },
    { to: "/about", label: "About" },
    { to: "/login", label: "Login / Signup" },
];