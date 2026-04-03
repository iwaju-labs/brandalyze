import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const allowedPaths = ["/", "/sign-in", "/sign-up", "/privacy", "/terms"];

export default clerkMiddleware(async (auth, req) => {
  const path = req.nextUrl.pathname;

  if (!allowedPaths.some((p) => path === p || path.startsWith(p + "/"))) {
    return NextResponse.redirect(new URL("/", req.url));
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
