import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import {
  NextResponse,
  type NextFetchEvent,
  type NextMiddleware,
  type NextRequest,
} from "next/server";
import { isLocalMode } from "@/lib/auth-mode";

const isProtectedRoute = createRouteMatcher(["/dashboard(.*)"]);

// Built lazily so a local-mode boot never initialises Clerk.
let clerkHandler: NextMiddleware | null = null;

function getClerkHandler(): NextMiddleware {
  if (!clerkHandler) {
    clerkHandler = clerkMiddleware(async (auth, request) => {
      if (isProtectedRoute(request)) {
        await auth.protect();
      }
      return NextResponse.next();
    });
  }
  return clerkHandler;
}

export default function proxy(
  request: NextRequest,
  event: NextFetchEvent,
): ReturnType<NextMiddleware> {
  if (isLocalMode) {
    // Local operator mode has no Clerk session to protect. The API still enforces
    // its own auth, so this only affects page navigation.
    return NextResponse.next();
  }

  return getClerkHandler()(request, event);
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
