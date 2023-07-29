import {
  createTRPCRouter,
  privateProcedure,
  publicProcedure,
} from "~/server/api/trpc";

import { clerkClient } from "@clerk/nextjs";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import filterUserForClient from "~/server/helpers/filter-user-for-client";

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { Post } from "@prisma/client";

// Create a new ratelimiter, that allows 3 requests per minute (1 m)
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(3, "1 m"),
  analytics: true,
});

// Find author for each post, returning an array of objects containing both post and its author
const addUserDataToPosts = async (posts: Post[]) => {
  // Import clerkClient and use it to get all user info for each post author
  const users = (
    await clerkClient.users.getUserList({
      userId: posts.map((post) => post.authorId),
      limit: 100,
    })
  ).map(filterUserForClient);

  return posts.map((post) => {
    const author = users.find((user) => user.id === post.authorId);

    // Ensure that author is not undefined
    // eslint-disable-next-line @typescript-eslint/prefer-optional-chain
    if (!author || !author.username)
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Author for posts not found",
      });

    return {
      post,
      author,
    };
  });
};

export const postRouter = createTRPCRouter({
  hello: publicProcedure
    .input(z.object({ text: z.string() }))
    .query(({ input }) => {
      return {
        greeting: `Hello ${input.text}`,
      };
    }),

  getAll: publicProcedure.query(async ({ ctx }) => {
    // take: limits number of posts returned
    const posts = await ctx.prisma.post.findMany({
      take: 100,
      orderBy: [{ createdAt: "desc" }],
    });

    return addUserDataToPosts(posts);
  }),

  getPostsByUserId: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      const posts = await ctx.prisma.post.findMany({
        where: {
          authorId: input.userId,
        },
        take: 100,
        orderBy: [{ createdAt: "desc" }],
      });

      return addUserDataToPosts(posts);
    }),

  create: privateProcedure
    .input(
      z.object({
        // 1-280 characters that must be emojis
        content: z.string().emoji().min(1).max(280),
      })
    )
    // destructure input here
    .mutation(async ({ ctx, input }) => {
      // user data is available via context (thanks to privateProcedure)
      const authorId = ctx.userId;

      // Limit requests to 3 per second
      // Use a constant string to limit all requests with a single ratelimit
      // Or use a userID, apiKey or ip address for individual limits.
      // const identifier = "api";
      const { success } = await ratelimit.limit(authorId);
      if (!success) throw new TRPCError({ code: "TOO_MANY_REQUESTS" });

      // When creating a post, `authorId` & `content` are expected
      const post = await ctx.prisma.post.create({
        data: {
          authorId,
          content: input.content,
        },
      });

      return post;
    }),
});
