import { compareWithHash, hashPassword } from "./hashPasswords";

test("passwords match with or without surrounding whitespace", () => {
  const hash = hashPassword("  secret ");
  expect(compareWithHash("secret", hash)).toBe(true);
  expect(compareWithHash(" secret  ", hash)).toBe(true);
  expect(compareWithHash("other", hash)).toBe(false);
});
