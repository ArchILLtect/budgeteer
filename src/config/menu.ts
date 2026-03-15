export type MenuItemLink = { to: string; label: string };

export const signedOutMenuItemLinks: MenuItemLink[] = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About" },
  { to: "/login", label: "Login / Signup" },
];

export const signedInMenuItemLinks: MenuItemLink[] = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About" },
  { to: "/profile", label: "Profile" },
  { to: "/settings", label: "Settings" },

];