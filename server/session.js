import { getIronSession } from "iron-session";

if (!process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET environment variable is required. Must be at least 32 characters.");
}

const sessionOptions = {
  password: process.env.SESSION_SECRET,
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
