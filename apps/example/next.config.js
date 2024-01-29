/** @type {import('next').NextConfig} */

const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "everai-collection-v0.s3.us-west-2.amazonaws.com",
        port: "",
        pathname: "/**"
      }
    ]
  }
};

module.exports = nextConfig;
