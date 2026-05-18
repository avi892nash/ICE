/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Produces .next/standalone — a self-contained server we can ship in a .deb.
  // See: https://nextjs.org/docs/app/api-reference/config/next-config-js/output
  output: "standalone",
};

module.exports = nextConfig;
