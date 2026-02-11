//import axios from 'axios';
import { getCurrentUser as getCurrentUserFromAmplify } from "aws-amplify/auth";

export const roleHierarchy = {
    guest: 0,
    user: 1,
    admin: 2,
};

export async function getCurrentUser() {
    const token = localStorage.getItem('token');
    if (!token) return null;
    if (token === 'demo-token') {
        return { username: 'Demo User', role: 'guest' }; // special case for demo user
    }

    try {

      const getUser = await getCurrentUserFromAmplify();

        return getUser;
    } catch {
        return null;
    }
}

export const login = (token: string, user: any) => {
    localStorage.setItem('token', token);
    localStorage.setItem('userData', JSON.stringify(user));
};
