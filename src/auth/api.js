// src/auth/api.js
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

// Demo users (use a backend DB later)
const DEMO_USERS = [
  { id: "u1", email: "demo@tradinglog.app", password: "demo123", name: "Demo User", role: "tester" },
  { id: "u2", email: "adam@example.com", password: "password", name: "Adam", role: "admin" },
];

// Very lightweight token factory (replace with JWT later)
function issueToken(user) {
  // In production: use httpOnly cookies or secure storage + refresh tokens
  return btoa(JSON.stringify({ sub: user.id, email: user.email, iat: Date.now() }));
}

export async function loginWithEmail(email, password) {
  await delay(400);
  const user = DEMO_USERS.find(u => u.email === email && u.password === password);
  if (!user) {
    const err = new Error("Invalid email or password");
    err.code = "AUTH_INVALID_CREDENTIALS";
    throw err;
  }
  return {
    token: issueToken(user),
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  };
}

export async function logout() {
  await delay(150);
  return { ok: true };
}

// Placeholder for future “register” flow
export async function registerUser({ email, password, name }) {
  await delay(400);
  // In real backend, validate + persist; here we simulate conflict:
  if (DEMO_USERS.some(u => u.email === email)) {
    const err = new Error("Email already in use");
    err.code = "AUTH_EMAIL_EXISTS";
    throw err;
  }
  const user = { id: crypto.randomUUID(), email, password, name, role: "user" };
  const token = issueToken(user);
  return { token, user: { id: user.id, email, name, role: user.role } };
}
