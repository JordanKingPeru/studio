
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com', // For Google user avatars
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'places.googleapis.com', // For Places API photos
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'elcomercio.pe', // Added for elcomercio.pe images
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'cdn0.uncomo.com', // Added for cdn0.uncomo.com images
        port: '',
        pathname: '/**',
      }
    ],
  },
};

export default nextConfig;
