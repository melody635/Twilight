import type { APIContext } from "astro";
import {
  getUsers,
  saveUsers,
  hashPassword,
  validateSession,
} from "@utils/auth";

export const prerender = false;

function authenticate(context: APIContext): string | null {
  const token = context.cookies.get("admin_session")?.value;
  if (!token) return null;
  return validateSession(token);
}

export async function GET(context: APIContext) {
  if (!authenticate(context)) {
    return new Response(
      JSON.stringify({ success: false, error: "Unauthorized" }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  }

  try {
    const users = getUsers().map(({ password: _, ...rest }) => rest);
    return new Response(
      JSON.stringify({ success: true, users }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch {
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}

export async function POST(context: APIContext) {
  if (!authenticate(context)) {
    return new Response(
      JSON.stringify({ success: false, error: "Unauthorized" }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  }

  try {
    const body = await context.request.json();
    const { username, password, role } = body;

    if (!username || !password || !role) {
      return new Response(
        JSON.stringify({ success: false, error: "Username, password, and role are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const users = getUsers();

    if (users.some((u) => u.username === username)) {
      return new Response(
        JSON.stringify({ success: false, error: "Username already exists" }),
        { status: 409, headers: { "Content-Type": "application/json" } },
      );
    }

    users.push({
      username,
      password: hashPassword(password),
      role,
      createdAt: new Date().toISOString(),
    });

    saveUsers(users);

    return new Response(
      JSON.stringify({ success: true, username, role }),
      { status: 201, headers: { "Content-Type": "application/json" } },
    );
  } catch {
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}

export async function PUT(context: APIContext) {
  if (!authenticate(context)) {
    return new Response(
      JSON.stringify({ success: false, error: "Unauthorized" }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  }

  try {
    const body = await context.request.json();
    const { username, password, role } = body;

    if (!username) {
      return new Response(
        JSON.stringify({ success: false, error: "Username is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const users = getUsers();
    const index = users.findIndex((u) => u.username === username);

    if (index === -1) {
      return new Response(
        JSON.stringify({ success: false, error: "User not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } },
      );
    }

    if (password) {
      users[index].password = hashPassword(password);
    }
    if (role) {
      users[index].role = role;
    }

    saveUsers(users);

    return new Response(
      JSON.stringify({ success: true, username, role: users[index].role }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch {
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}

export async function DELETE(context: APIContext) {
  const currentUser = authenticate(context);
  if (!currentUser) {
    return new Response(
      JSON.stringify({ success: false, error: "Unauthorized" }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  }

  try {
    const body = await context.request.json();
    const { username } = body;

    if (!username) {
      return new Response(
        JSON.stringify({ success: false, error: "Username is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    if (username === currentUser) {
      return new Response(
        JSON.stringify({ success: false, error: "Cannot delete yourself" }),
        { status: 403, headers: { "Content-Type": "application/json" } },
      );
    }

    const users = getUsers();
    const target = users.find((u) => u.username === username);

    if (!target) {
      return new Response(
        JSON.stringify({ success: false, error: "User not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } },
      );
    }

    if (target.role === "admin") {
      const adminCount = users.filter((u) => u.role === "admin").length;
      if (adminCount <= 1) {
        return new Response(
          JSON.stringify({ success: false, error: "Cannot delete the last admin" }),
          { status: 403, headers: { "Content-Type": "application/json" } },
        );
      }
    }

    const filtered = users.filter((u) => u.username !== username);
    saveUsers(filtered);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch {
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
