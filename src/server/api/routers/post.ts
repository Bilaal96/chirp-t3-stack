import { clerkClient } from "@clerk/nextjs";
import type { User } from "@clerk/nextjs/dist/types/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  createTRPCRouter,
  privateProcedure,
  publicProcedure,
} from "~/server/api/trpc";

const filterUserForClient = (user: User) => {
  const { id, username, profileImageUrl } = user;
  return {
    id,
    username,
    profileImageUrl,
  };
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
