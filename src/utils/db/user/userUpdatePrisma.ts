import { hashPassword } from "../../hashPasswords";
import prisma from "../prisma";

interface UpdateFields {
  email?: string;
  username?: string;
  password?: string;
  image?: string;
  bio?: string;
}

export default async function userUpdatePrisma(
  username: string,
  info: UpdateFields
) {
  if (!username) return null;
  // Never store a plain-text password.
  if (info.password) info = { ...info, password: hashPassword(info.password) };
  const user = await prisma.user.update({ where: { username }, data: info });
  return user;
}
