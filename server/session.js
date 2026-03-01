import { getIronSession } from "iron-session";

const sessionOptions = {
  password: "a-very-long-secret-password-that-is-at-least-32-chars",
  cookieName: "sprintplanner_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 1 week
  },
};

export async function getSession(req, res) {
  return await getIronSession(req, res, sessionOptions);
}
