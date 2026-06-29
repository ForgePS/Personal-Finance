import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow Cursor cloud preview / Codespaces / forwarded ports to load dev assets
  allowedDevOrigins: [
    "*.agent.cvm.dev",
    "*.github.dev",
    "*.app.github.dev",
    "localhost",
    "127.0.0.1",
  ],
};

export default nextConfig;
