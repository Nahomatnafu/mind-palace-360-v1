import type { NextConfig } from 'next';
const config: NextConfig = { reactStrictMode: true, poweredByHeader: false, webpack(config) { config.cache = false; return config; } };
export default config;
