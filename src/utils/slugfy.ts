/**
 * Converts an input text to an uri safe string.
 * @param text text to convert to a slug
 * @returns the slug string
 */
export default function slugfy(text: string) {
  // Letters from any language are kept, accents included.
  return text
    .normalize("NFC")
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s_-]/gu, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
