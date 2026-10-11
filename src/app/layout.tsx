import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import SharedGate from '@/components/SharedGate';
const bodyFont = localFont({src:'./fonts/manrope.ttf',variable:'--font-body',display:'swap',weight:'200 800'});
const displayFont = localFont({src:'./fonts/spacegrotesk.ttf',variable:'--font-display',display:'swap',weight:'300 700'});
import '@photo-sphere-viewer/core/index.css';
import '@photo-sphere-viewer/markers-plugin/index.css';
export const metadata: Metadata = { title: 'Mind Palace — Make memories visible', description: 'Turn your spaces into a visual memory palace.', icons: {icon:'/brand-mark.svg'} };
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#1b1922' };
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="en" className={bodyFont.variable+' '+displayFont.variable}><body><SharedGate>{children}</SharedGate></body></html>; }
