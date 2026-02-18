import type { APIContext } from "astro";
import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import { validateSession } from "@utils/auth";

export const prerender = false;

const POSTS_DIR = path.join(process.cwd(), "src", "content", "posts");

function safePath(id: string): string | null {
  const resolved = path.resolve(POSTS_DIR, `${id}.md`);
  const normalizedBase = path.resolve(POSTS_DIR);
  if (!resolved.startsWith(normalizedBase + path.sep) && resolved !== normalizedBase) return null;
  return resolved;
}

function authenticate(context: APIContext): string | null {
  const token = context.cookies.get("admin_session")?.value;
  if (!token) return null;
  return validateSession(token);
}

function parseFrontmatter(raw: string): { frontmatter: Record<string, unknown>; content: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) {
    return { frontmatter: {}, content: raw };
  }
  const frontmatter = (yaml.load(match[1]) as Record<string, unknown>) ?? {};
  return { frontmatter, content: match[2] };
}

function serializeFrontmatter(frontmatter: Record<string, unknown>, content: string): string {
  const yamlStr = yaml.dump(frontmatter, { lineWidth: -1 }).trimEnd();
  return `---\n${yamlStr}\n---\n${content}`;
}

function readPostsRecursively(dir: string, prefix = ""): { id: string; frontmatter: Record<string, unknown>; content: string }[] {
  const results: { id: string; frontmatter: Record<string, unknown>; content: string }[] = [];

  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      const nested = readPostsRecursively(fullPath, `${prefix}${entry.name}/`);
      results.push(...nested);
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      try {
        const raw = fs.readFileSync(fullPath, "utf-8");
        const { frontmatter, content } = parseFrontmatter(raw);
        const id = `${prefix}${entry.name.replace(/\.md$/, "")}`;
        results.push({ id, ...frontmatter, content } as { id: string; frontmatter: Record<string, unknown>; content: string });
      } catch {
        const id = `${prefix}${entry.name.replace(/\.md$/, "")}`;
        results.push({ id, content: "" } as { id: string; frontmatter: Record<string, unknown>; content: string });
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
    const posts = readPostsRecursively(POSTS_DIR);

    return new Response(
      JSON.stringify({ success: true, posts }),
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
    const { id, frontmatter, content } = body;

    if (!id || !frontmatter || content === undefined) {
      return new Response(
        JSON.stringify({ success: false, error: "id, frontmatter, and content are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const filePath = safePath(id);

    if (!filePath) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid id" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const dir = path.dirname(filePath);

    if (fs.existsSync(filePath)) {
      return new Response(
        JSON.stringify({ success: false, error: "Post already exists" }),
        { status: 409, headers: { "Content-Type": "application/json" } },
      );
    }

    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, serializeFrontmatter(frontmatter, content), "utf-8");

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
    const { id, frontmatter, content } = body;

    if (!id || !frontmatter || content === undefined) {
      return new Response(
        JSON.stringify({ success: false, error: "id, frontmatter, and content are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const filePath = safePath(id);

    if (!filePath) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid id" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    if (!fs.existsSync(filePath)) {
      return new Response(
        JSON.stringify({ success: false, error: "Post not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } },
      );
    }

    fs.writeFileSync(filePath, serializeFrontmatter(frontmatter, content), "utf-8");

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
    const { id } = body;

    if (!id) {
      return new Response(
        JSON.stringify({ success: false, error: "id is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const filePath = safePath(id);

    if (!filePath) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid id" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    if (!fs.existsSync(filePath)) {
      return new Response(
        JSON.stringify({ success: false, error: "Post not found" }),
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
