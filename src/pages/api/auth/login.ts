import type { APIContext } from "astro";
import {
  getUsers,
  verifyPassword,
  createSession,
} from "@utils/auth";

export const prerender = false;

export async function POST(context: APIContext) {
  try {
    const body = await context.request.json();
    const { username, password } = body;

    if (!username || !password) {
      return new Response(
        JSON.stringify({ success: false, error: "Username and password are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const users = getUsers();
    const user = users.find((u) => u.username === username);

    if (!user || !verifyPassword(password, user.password)) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid username or password" }),
        { status: 401, headers: { "Content-Type": "application/json" } },
      );
    }

    const token = createSession(username);

    context.cookies.set("admin_session", token, {
      httpOnly: true,
      path: "/",
      maxAge: 86400,
      secure: true,
      sameSite: "lax",
    });

    return new Response(
      JSON.stringify({ success: true, username: user.username, role: user.role }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch {
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
