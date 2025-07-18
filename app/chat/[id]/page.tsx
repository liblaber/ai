import { requireAuth } from '~/auth/auth-middleware';
import ChatRoute from '~/chat/page';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ChatIdPage({ params }: PageProps) {
  // Ensure authentication
  await requireAuth();

  const { id } = await params;

  // Pass the ID to the main chat component
  return <ChatRoute id={id} />;
}
