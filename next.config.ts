import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "*.agent.cvm.dev",
    "*.github.dev",
    "*.app.github.dev",
    "localhost",
    "127.0.0.1",
  ],
  serverExternalPackages: [
    "better-sqlite3",
    "@prisma/adapter-better-sqlite3",
    "@prisma/adapter-libsql",
    "@libsql/client",
    "plaid",
  ],
};

export default nextConfig;
