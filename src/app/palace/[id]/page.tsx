import Workspace from '@/components/Workspace';
export default async function PalacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <Workspace key={id} palaceId={id}/>;
}
