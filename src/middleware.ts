// Next.js knows to run this before each request due to the designated filename
import { authMiddleware } from "@clerk/nextjs";

// This example protects all routes including api/trpc routes

// Please edit this to allow other routes to be public as needed.

// See https://clerk.com/docs/nextjs/middleware for more information about configuring your middleware

export default authMiddleware({
  beforeAuth: () => console.log("middleware running"),
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
