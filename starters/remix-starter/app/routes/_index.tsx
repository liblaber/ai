import { useLoaderData } from '@remix-run/react';

export const loader = async () => {
  return { message: 'Your dashboard data' };
};

export default function Index() {
  const data = useLoaderData<typeof loader>();

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">Welcome to liblab</h1>
      <p>{data.message}</p>
    </main>
  );
}
