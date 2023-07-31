import Image from "next/image";
import Link from "next/link";
import type { RouterOutputs } from "~/utils/api";

import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

/**
 * RouterOutputs is a helper that allows us to access the types of our tRPC router
 * Here we're using it to get the type of a SINGLE post from the array returned by api.post.getAll */
type PostWithAuthor = RouterOutputs["post"]["getAll"][number];

export const PostView = ({ post, author }: PostWithAuthor) => {
  return (
    <div className="flex items-center gap-4 border-b border-slate-400 p-8">
      <Image
        className="rounded-full"
        src={author?.profileImageUrl ?? ""}
        alt={`@${author.username}'s profile image`}
        width="48"
        height="48"
      />

      <div key={post.id} className="flex flex-col">
        <div className="flex gap-2 font-bold text-slate-400 ">
          <Link href={`/@${author.username}`}>
            <span className="hover:underline">{`@${author.username}`}</span>
          </Link>
          <span className="font-bold">·</span>
          <Link href={`/post/${post.id}`}>
            <span className="font-thin hover:underline">{`${dayjs(
              post.createdAt
            ).fromNow()}`}</span>
          </Link>
        </div>
        <span className="text-2xl">{post.content}</span>
      </div>
    </div>
  );
};

const Posts = ({ posts }: { posts: PostWithAuthor[] }) => {
  return (
    <div className="flex flex-col">
      {posts.map((postWithAuthor) => (
        <PostView key={postWithAuthor.post.id} {...postWithAuthor} />
      ))}
    </div>
  );
};

export default Posts;
