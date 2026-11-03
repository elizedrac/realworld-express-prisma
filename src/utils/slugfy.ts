/**
 * Converts an input text to an uri safe string.
 * @param text text to convert to a slug
 * @returns the slug string
 */
export default function slugfy(text: string) {
  const slug = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  // Long slugs are cut at a dash, to at most 60 characters.
  if (slug.length <= 60) return slug;
  const cut = slug.slice(0, 61);
  return cut.slice(0, cut.lastIndexOf("-")) || slug.slice(0, 60);
}
