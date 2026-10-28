import supertest from "supertest";
import app from "../../app";

export const api = supertest(app);

export interface TestUser {
  username: string;
  email: string;
  password: string;
  token: string;
}

/**
 * Registers a user through the API and returns its credentials and token.
 * @param username username of the new user, also used to derive the email
 * @returns the registered user with its authentication token
 */
export async function registerUser(username: string): Promise<TestUser> {
  const email = `${username}@mail.com`;
  const password = `${username}-password`;
  const res = await api
    .post("/api/users")
    .send({ user: { username, email, password } })
    .expect(201);
  return { username, email, password, token: res.body.user.token };
}

/**
 * Builds the authorization header the app expects.
 * @param user user whose token is used
 * @returns header object for supertest's set()
 */
export function auth(user: TestUser) {
  return { Authorization: `Token ${user.token}` };
}

export interface ArticleInput {
  title: string;
  description?: string;
  body?: string;
  tagList?: string[];
}

/**
 * Creates an article through the API as the given user.
 * @param user author of the article
 * @param input article fields, only the title is required
 * @returns the article view returned by the API
 */
export async function createArticle(user: TestUser, input: ArticleInput) {
  const res = await api
    .post("/api/articles")
    .set(auth(user))
    .send({
      article: {
        description: `${input.title} description`,
        body: `${input.title} body`,
        ...input,
      },
    })
    .expect(201);
  return res.body.article;
}

/**
 * Creates a comment on an article through the API as the given user.
 * @param user author of the comment
 * @param slug slug of the article to comment on
 * @param body content of the comment
 * @returns the comment view returned by the API
 */
export async function createComment(
  user: TestUser,
  slug: string,
  body: string
) {
  const res = await api
    .post(`/api/articles/${slug}/comments`)
    .set(auth(user))
    .send({ comment: { body } })
    .expect(201);
  return res.body.comment;
}
