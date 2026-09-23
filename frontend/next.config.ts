import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Vercel's Image Optimization has a monthly transformation limit on
    // non-Pro plans; once hit, every <Image> 404s instead of falling back to
    // the original. Serving files as-is avoids that failure mode entirely —
    // our assets are already pre-sized PNGs, so there is little to optimize
    // away in the first place.
    unoptimized: true,
  },
};

export default nextConfig;
