export type UserRole = "Admin" | "User";

export type User = {
    id: string;
    username: string;
    email: string;
    role: UserRole;
};

export type UserUI = {
    username: string;
    email?: string;
    role?: string;
};

// Minimal structural type for Authenticator's `user` prop.
// We intentionally do NOT pass this around the app as a domain/UI model.
export type AuthUserLike = {
    username?: string;
    userId?: string;
    // Some implementations may put role-like info here (non-standard); keep optional.
    role?: string;
};
