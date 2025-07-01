import NextAuth, { DefaultSession } from "next-auth";
import { JWT } from "next-auth/jwt";

declare module "next-auth" {
    /**
     * Extending the built-in session types
     */
    interface Session {
        user: {
            id: string;
        } & DefaultSession["user"];
    }

    /**
     * Extending the built-in JWT types
     */
}

declare module "next-auth/jwt" {
    interface JWT {
        id: string;
        // Add other properties you need in the JWT token
    }
}
