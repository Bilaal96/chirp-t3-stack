import { clerkClient } from "@clerk/nextjs";
import type { User } from "@clerk/nextjs/dist/types/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

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
    const posts = await ctx.prisma.post.findMany({ take: 100 });

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
});
