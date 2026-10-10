import type { Metadata, Viewport } from 'next';
import './globals.css';
import '@photo-sphere-viewer/core/index.css';
import '@photo-sphere-viewer/markers-plugin/index.css';
export const metadata: Metadata = { title: 'Mind Palace — Make memories visible', description: 'Turn your spaces into a visual memory palace.' };
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#14191b' };
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="en"><body>{children}</body></html>; }
