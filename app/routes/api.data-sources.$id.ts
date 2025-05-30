import { prisma } from '~/lib/prisma';
import { json } from '@remix-run/cloudflare';

export async function loader({ params }: { request: Request; params: { id: string } }) {
  const dataSource = await prisma.dataSource.findFirst({
    where: { id: params.id },
    select: {
      id: true,
      name: true,
      type: true,
      host: true,
      port: true,
      database: true,
      username: true,
      sslMode: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!dataSource) {
    return json({ success: false, error: 'Data source not found' }, { status: 404 });
  }

  return json({ success: true, dataSource });
}

export async function action({ request, params }: { request: Request; params: { id: string } }) {
  const dataSource = await prisma.dataSource.findFirst({
    where: { id: params.id },
  });

  if (!dataSource) {
    return json({ success: false, error: 'Data source not found' }, { status: 404 });
  }

  if (request.method === 'PUT') {
    const formData = await request.formData();
    const name = formData.get('name') as string;
    const type = formData.get('type') as string;
    const host = formData.get('host') as string;
    const port = parseInt(formData.get('port') as string);
    const username = formData.get('username') as string;
    const password = formData.get('password') as string;
    const database = formData.get('database') as string;
    const sslMode = formData.get('sslMode') as string;

    if (type !== 'postgres') {
      return json({ success: false, error: 'Only postgres data sources are supported' }, { status: 400 });
    }

    const updateData: any = {
      name,
      type,
      host,
      port,
      database,
      username,
      sslMode,
    };

    if (password) {
      updateData.password = password;
    }

    const updatedDataSource = await prisma.dataSource.update({
      where: { id: params.id },
      data: updateData,
    });

    return json({ success: true, dataSource: updatedDataSource });
  }

  if (request.method === 'DELETE') {
    await prisma.dataSource.delete({
      where: { id: params.id },
    });

    return json({ success: true });
  }

  return json({ success: false, error: 'Method not allowed' }, { status: 405 });
}
