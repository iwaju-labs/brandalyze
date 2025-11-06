import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isProtectedRoute = createRouteMatcher([
  "/analyze(.*)",
  "/subscription/success(.*)",
  "/settings(.*)",
  "/admin(.*)"
]);

const isAdminRoute = createRouteMatcher([
  "/admin(.*)"
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }

  // Additional check for admin routes
  if (isAdminRoute(req)) {
    const { userId, getToken } = await auth();
    
    if (!userId) {
      return NextResponse.redirect(new URL('/', req.url));
    }

    try {
      // Check admin status via backend API
      const token = await getToken();
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/payments/admin/check-status/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        return NextResponse.redirect(new URL('/', req.url));
      }

      const data = await response.json();
      if (!data.is_admin) {
        return NextResponse.redirect(new URL('/', req.url));
      }
    } catch (error) {
      console.error('Error checking admin status in middleware:', error);
      return NextResponse.redirect(new URL('/', req.url));
    }
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
