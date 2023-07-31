import { createServerSideHelpers } from "@trpc/react-query/server";
import { appRouter } from "../api/root";
import { prisma } from "../db";
import superjson from "superjson";

/**
 * NOTE: createProxySSGHelpers deprecated & replaced with createServerSideHelpers
 * Chirp repo changes: https://github.com/t3dotgg/chirp/pull/21/commits/1210a9378b6ae5db86fb943da80e8f5af3bece7e
 * tRPC Usage Docs: http://trpc.io/docs/client/nextjs/server-side-helpers 
 
 * Why is this needed?
 * Profile page has to load/fetch the user data before the page is rendered -> a loading state is shown -> this feels like a CSR app

 * One distinction to be made from the tRPC docs:
 * Below we use getStaticProps because getServerSideProps:
  - will run on every request for the page
  - which causes loss of user data typing
 * This blocks requests, pages are not cached, so will take some time to load
 * Trying to get types from getServerSideProps into the component is a bad experience

 * Instead we use getStaticProps
 * This treats the page as a static page but we can trigger revalidation when and how we choose
 */
export const generateServerSideHelpers = () => {
  return createServerSideHelpers({
    router: appRouter,
    ctx: { prisma, userId: null },
    transformer: superjson, // optional - adds superjson serialization
  });
};
