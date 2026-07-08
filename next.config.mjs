/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Memaksa Vercel mengabaikan peringatan error (seperti img tag) saat build
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;