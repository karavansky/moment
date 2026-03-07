/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // Отключено для избежания дублирования WebSocket событий
 // allowedDevOrigins: ["quailbreeder.net", "http://ubuntu-wrk-03-vm", "http://ubuntu-wrk-03-vm:3000"],
  basePath: '/app',

};

module.exports = nextConfig;

/*
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    console.log("[Next.js] API rewrite destination:", apiUrl);
    return [
      {
        source: "/api/:path*",
        destination: `${apiUrl}/:path*`,
      },
    ];
  },
*/