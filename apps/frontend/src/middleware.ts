import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const url = request.nextUrl;
  const hiddenRoutes = ["/sign-in", "/sign-up", "/upload", "/analyze"];
  if (hiddenRoutes.includes(url.pathname)) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  // Redirect to landing page if route does not exist
  // Only allow / and static files
  if (
    url.pathname !== "/" &&
    !url.pathname.startsWith("/_next") &&
    !url.pathname.startsWith("/static") &&
    !url.pathname.startsWith("/favicon.ico") &&
    !url.pathname.startsWith("/api") &&
    !url.pathname.startsWith("/assets") &&
    !url.pathname.startsWith("/public")
  ) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return NextResponse.next();
}

export default clerkMiddleware();

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
