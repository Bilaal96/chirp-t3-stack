import type { User } from "@clerk/nextjs/dist/types/server";

// Extract user data accessible on client side
const filterUserForClient = (user: User) => {
  const { id, username, profileImageUrl } = user;
  return {
    id,
    username,
    profileImageUrl,
  };
};

export default filterUserForClient;
