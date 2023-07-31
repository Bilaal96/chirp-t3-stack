import Head from "next/head";
import type { GetStaticPaths, GetStaticProps, NextPage } from "next";
import { generateServerSideHelpers } from "~/server/helpers/server-side-helpers";
import { api } from "~/utils/api";
import { PageLayout } from "~/components/page-layout";
import { PostView } from "~/components/posts";

const SinglePostPage: NextPage<{ postId: string }> = ({ postId }) => {
  const { data: postData } = api.post.getPostById.useQuery({ postId });

  if (!postData) return <div>404 | Not Found</div>;

  return (
    <>
      <Head>
        <title>{`Post by @${postData.author.username} - ${postData.post.content}`}</title>
      </Head>
      <PageLayout>
        <PostView {...postData} />
      </PageLayout>
    </>
  );
};

export default SinglePostPage;

export const getStaticProps: GetStaticProps = async (context) => {
  const helpers = generateServerSideHelpers();

  const postId = context.params?.id;

  // Could instead redirect to different page
  // But for now it throws an error
  if (typeof postId !== "string") throw new Error("No post id");

  // Fetch data & partially hydrate webpage ahead of time,
  await helpers.post.getPostById.prefetch({ postId });

  return {
    props: {
      // Formats data for static props & react-query hydrates the data thanks to exporting _app with api.withTRPC(MyApp)
      // As a result, when the profile page loads, the user data will exist so the loading state will not be hit
      trpcState: helpers.dehydrate(),
      postId,
    },
  };
};

export const getStaticPaths: GetStaticPaths = () => {
  return {
    paths: [],
    fallback: "blocking",
  };
};
