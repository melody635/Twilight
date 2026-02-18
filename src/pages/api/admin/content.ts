import type { APIContext } from "astro";
import fs from "node:fs";
import path from "node:path";
import { validateSession } from "@utils/auth";

export const prerender = false;

const CONTENT_DIR = path.join(process.cwd(), "src", "content");

const VALID_TYPES = [
  "projects",
  "skills",
  "timeline",
  "friends",
  "diary",
  "albums",
  "navigation",
];

function safePath(baseDir: string, id: string): string | null {
  const resolved = path.resolve(baseDir, `${id}.json`);
  if (!resolved.startsWith(baseDir + path.sep)) return null;
  return resolved;
}

function authenticate(context: APIContext): string | null {
  const token = context.cookies.get("admin_session")?.value;
  if (!token) return null;
  return validateSession(token);
}

function readJsonFilesRecursively(dir: string): { id: string; data: unknown }[] {
  const results: { id: string; data: unknown }[] = [];

  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      const nested = readJsonFilesRecursively(fullPath);
      for (const item of nested) {
        results.push({
          id: `${entry.name}/${item.id}`,
          data: item.data,
        });
      }
    } else if (entry.isFile() && entry.name.endsWith(".json")) {
      try {
        const raw = fs.readFileSync(fullPath, "utf-8");
        results.push({
          id: entry.name.replace(/\.json$/, ""),
          data: JSON.parse(raw),
        });
      } catch {
        results.push({
          id: entry.name.replace(/\.json$/, ""),
          data: null,
        });
      }
    }
  }

  return results;
}

export async function GET(context: APIContext) {
  if (!authenticate(context)) {
    return new Response(
      JSON.stringify({ success: false, error: "Unauthorized" }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  }

  try {
    const url = new URL(context.request.url);
    const type = url.searchParams.get("type");

    if (!type || !VALID_TYPES.includes(type)) {
      return new Response(
        JSON.stringify({ success: false, error: `Invalid type. Must be one of: ${VALID_TYPES.join(", ")}` }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const dir = path.join(CONTENT_DIR, type);
    const items = readJsonFilesRecursively(dir);

    return new Response(
      JSON.stringify({ success: true, items }),
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
    const { type, id, data } = body;

    if (!type || !id || data === undefined) {
      return new Response(
        JSON.stringify({ success: false, error: "type, id, and data are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    if (!VALID_TYPES.includes(type)) {
      return new Response(
        JSON.stringify({ success: false, error: `Invalid type. Must be one of: ${VALID_TYPES.join(", ")}` }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const typeDir = path.join(CONTENT_DIR, type);
    const filePath = safePath(typeDir, id);

    if (!filePath) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid id" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const dir = path.dirname(filePath);

    if (fs.existsSync(filePath)) {
      return new Response(
        JSON.stringify({ success: false, error: "Content item already exists" }),
        { status: 409, headers: { "Content-Type": "application/json" } },
      );
    }

    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");

    return new Response(
      JSON.stringify({ success: true, id }),
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
    const { type, id, data } = body;

    if (!type || !id || data === undefined) {
      return new Response(
        JSON.stringify({ success: false, error: "type, id, and data are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    if (!VALID_TYPES.includes(type)) {
      return new Response(
        JSON.stringify({ success: false, error: `Invalid type. Must be one of: ${VALID_TYPES.join(", ")}` }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const typeDir = path.join(CONTENT_DIR, type);
    const filePath = safePath(typeDir, id);

    if (!filePath) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid id" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    if (!fs.existsSync(filePath)) {
      return new Response(
        JSON.stringify({ success: false, error: "Content item not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } },
      );
    }

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");

    return new Response(
      JSON.stringify({ success: true, id }),
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
  if (!authenticate(context)) {
    return new Response(
      JSON.stringify({ success: false, error: "Unauthorized" }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  }

  try {
    const body = await context.request.json();
    const { type, id } = body;

    if (!type || !id) {
      return new Response(
        JSON.stringify({ success: false, error: "type and id are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    if (!VALID_TYPES.includes(type)) {
      return new Response(
        JSON.stringify({ success: false, error: `Invalid type. Must be one of: ${VALID_TYPES.join(", ")}` }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const typeDir = path.join(CONTENT_DIR, type);
    const filePath = safePath(typeDir, id);

    if (!filePath) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid id" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    if (!fs.existsSync(filePath)) {
      return new Response(
        JSON.stringify({ success: false, error: "Content item not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } },
      );
    }

    fs.unlinkSync(filePath);

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
