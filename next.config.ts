import type { NextConfig } from "next";

// Set NEXT_PUBLIC_BASE_PATH when deploying under a sub-path. Empty for local dev / root.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  reactCompiler: true,
};

export default nextConfig;
