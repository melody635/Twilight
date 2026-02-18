import type { APIContext } from "astro";
import { destroySession } from "@utils/auth";

export const prerender = false;

export async function POST(context: APIContext) {
  try {
    const token = context.cookies.get("admin_session")?.value;

    if (token) {
      destroySession(token);
    }

    context.cookies.delete("admin_session", { path: "/" });

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
