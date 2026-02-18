import fs from "node:fs";
import path from "node:path";
import bcrypt from "bcryptjs";

export interface User {
  username: string;
  password: string;
  role: string;
  createdAt: string;
}

interface Session {
  username: string;
  expiresAt: number;
}

const USERS_FILE = path.join(process.cwd(), "data", "users.json");
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
const sessions = new Map<string, Session>();

export function getUsers(): User[] {
  const raw = fs.readFileSync(USERS_FILE, "utf-8");
  return JSON.parse(raw) as User[];
}

export function saveUsers(users: User[]): void {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
}

export function verifyPassword(plain: string, hash: string): boolean {
  return bcrypt.compareSync(plain, hash);
}

export function hashPassword(plain: string): string {
  return bcrypt.hashSync(plain, 10);
}

export function createSession(username: string): string {
  const token = crypto.randomUUID();
  const expiresAt = Date.now() + SESSION_TTL_MS;
  sessions.set(token, { username, expiresAt });
  return token;
}

export function validateSession(token: string): string | null {
  const session = sessions.get(token);
  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    sessions.delete(token);
    return null;
  }
  return session.username;
}

export function destroySession(token: string): void {
  sessions.delete(token);
}

export function getUserByUsername(username: string): User | undefined {
  const users = getUsers();
  return users.find((u) => u.username === username);
}
