import type { Metadata } from 'next';
import PalaceGallery from '@/components/PalaceGallery';
export const metadata: Metadata = { title: 'Your Memory Palaces' };
export default function Home() { return <PalaceGallery/>; }
