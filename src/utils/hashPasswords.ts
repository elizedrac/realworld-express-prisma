import bcrypt from "bcrypt";
import logger from "./logger";

const saltRounds = 10;

export function hashPassword(password: string) {
  return bcrypt.hashSync(password, saltRounds);
}

export function compareWithHash(password: string, hash: string) {
  logger.debug("comparing password against stored hash");
  return bcrypt.compareSync(password, hash);
}
