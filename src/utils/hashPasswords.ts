import bcrypt from "bcrypt";

const saltRounds = 10;

// Passwords are trimmed first, so stray whitespace from copy and paste or a
// password manager does not lock anyone out.
export function hashPassword(password: string) {
  return bcrypt.hashSync(password.trim(), saltRounds);
}

export function compareWithHash(password: string, hash: string) {
  return bcrypt.compareSync(password.trim(), hash);
}
