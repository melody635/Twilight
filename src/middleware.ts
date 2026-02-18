import { defineMiddleware } from "astro:middleware";
import { validateSession } from "@utils/auth";

export const onRequest = defineMiddleware((context, next) => {
  const { pathname } = context.url;

  const isAdminPage =
    (pathname === "/admin" || pathname.startsWith("/admin/")) &&
    !pathname.startsWith("/admin/login");
  const isAdminApi = pathname.startsWith("/api/admin/") || pathname === "/api/admin";

  if (!isAdminPage && !isAdminApi) {
    return next();
  }

  const cookie = context.cookies.get("admin_session");
  const token = cookie?.value ?? "";
  const username = validateSession(token);

  if (username) {
    return next();
  }

  if (isAdminApi) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  return context.redirect("/admin/login/");
});
