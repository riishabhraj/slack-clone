import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
    const path = request.nextUrl.pathname;

    // Define public paths that don't require authentication
    const isPublicPath = path === "/login" || path === "/register";

    // Get the token
    const token = await getToken({
        req: request,
        secret: process.env.NEXTAUTH_SECRET,
    });

    // Redirect logic for authenticated and unauthenticated users
    if (isPublicPath && token) {
        // If user is authenticated but tries to access login/register page,
        // redirect them to the dashboard
        return NextResponse.redirect(new URL("/", request.url));
    }

    // If user is not authenticated and tries to access a protected route,
    // redirect them to the login page
    if (!isPublicPath && !token) {
        return NextResponse.redirect(new URL("/login", request.url));
    }

    // Allow the request to continue normally if none of the above conditions are met
    return NextResponse.next();
}

// Specify which paths this middleware should run on
export const config = {
    matcher: [
        // Match all routes except for static files, api routes, and _next files
        "/((?!api|_next/static|_next/image|images|favicon.ico).*)",
    ],
};
