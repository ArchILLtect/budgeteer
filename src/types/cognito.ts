// This is intentionally minimal: only the fields we actually use.
// Cognito ID token claims can include many more keys.
export type CognitoClaims = {
    sub: string;
    email?: string;

    // Common "display-ish" fields depending on your setup
    preferred_username?: string;
    "cognito:username"?: string;

    // Groups claim (only present if you use groups)
    "cognito:groups"?: string[];

    // JWT standard fields (optional, but handy later)
    iss?: string;
    aud?: string;
    exp?: number;
    iat?: number;
};
