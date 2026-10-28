import { User } from "@prisma/client";

export const DEFAULT_AVATAR =
  "https://static.productionready.io/images/smiley-cyrus.jpg";

export default function userViewer(user: User, token: string) {
  const userView = {
    user: {
      email: user.email,
      token: token,
      username: user.username,
      bio: user.bio,
      image: user.image ?? DEFAULT_AVATAR,
    },
  };
  return userView;
}
