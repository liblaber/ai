import { PreviewDocker } from '~/components/workbench/PreviewDocker';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function DockerPreviewPage({ params }: PageProps) {
  const { id } = await params;

  return <PreviewDocker containerId={id} />;
}
