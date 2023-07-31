import type { GetStaticPaths, GetStaticProps, NextPage } from "next";
import { api } from "~/utils/api";
import Head from "next/head";
import Image from "next/image";
import { LoadingPage } from "~/components/loading";
import { PageLayout } from "~/components/page-layout";
import Posts from "~/components/posts";

// For getStaticProps
import { generateServerSideHelpers } from "~/server/helpers/server-side-helpers";

const ProfileFeed = ({ userId }: { userId: string }) => {
  const posts = api.post.getPostsByUserId.useQuery({ userId });

  if (posts.isLoading) return <LoadingPage size={64} />;
  if (!posts.data || posts.data.length === 0)
    return <div>User has not posted</div>;

  return <Posts posts={posts.data} />;
};

const ProfilePage: NextPage<{ username: string }> = ({ username }) => {
  // const params = useParams();
  const user = api.profile.getUserByUsername.useQuery({ username });

  if (!user.data) return <div>404 | Not Found</div>;

  console.log("user:", user.data);
  console.log("username:", username);

  return (
    <>
      <Head>
        <title>@{user.data.username}&apos;s Profile</title>
      </Head>
      <PageLayout>
        <div className="relative h-36 bg-slate-600">
          <Image
            className={`absolute bottom-0 left-0 mb-[-64px] ml-4 rounded-full border-4 border-black bg-black`}
            src={user.data.profileImageUrl}
            alt={`@${user.data.username}'s profile image`}
            width={128}
            height={128}
          />
        </div>

        <div className="mt-[calc(64px)]">
          <h1 className="p-6 text-2xl font-bold">{`@${user.data.username}`}</h1>
          <div className="border-b border-slate-400" />
          <ProfileFeed userId={user.data.id} />
        </div>
      </PageLayout>
    </>
  );
};

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
export const getStaticProps: GetStaticProps = async (context) => {
  const helpers = generateServerSideHelpers();

  const slug = context.params?.slug;

  // Could instead redirect to different page
  // But for now it throws an error
  if (typeof slug !== "string") throw new Error("No slug");

  // Sanitize the slug as it will contain the @ symbol - in the Clerk DB, usernames do not have an @ symbol
  const username = slug.replace("@", "");

  // Fetch data & partially hydrate webpage ahead of time,
  await helpers.profile.getUserByUsername.prefetch({ username });

  return {
    props: {
      // Formats data for static props & react-query hydrates the data thanks to exporting _app with api.withTRPC(MyApp)
      // As a result, when the profile page loads, the user data will exist so the loading state will not be hit
      trpcState: helpers.dehydrate(),
      username,
    },
  };
};

/**
 *  When using getStaticProps, we must tell Next which paths are valid
 * Normally this is used to generate paths on the server
 * We don't really care about that here, so the following will suffice
 * When we leave the paths array blank, Next will generate the static pages on load
 */
export const getStaticPaths: GetStaticPaths = () => {
  return { paths: [], fallback: "blocking" };
};

export default ProfilePage;
