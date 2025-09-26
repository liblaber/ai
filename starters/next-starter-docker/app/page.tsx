import { executeQuery } from '@/db/execute-query';
import { UsersList } from '@/components/dashboard/UsersList';
import { UserCount } from '@/components/dashboard/UserCount';
import { WithErrorHandling } from '@/components/hoc/WithErrorHandling';
import { User, UserCountData } from '@/types';

export default async function Home() {
  const [usersResult, userCountResult] = await Promise.all([
    executeQuery<User>('SELECT id, name FROM users ORDER BY id'),
    executeQuery<UserCountData>('SELECT COUNT(*) as total_users FROM users'),
  ]);

  return (
    <main className="p-8 space-y-8">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold text-foreground">Users Dashboard</h1>
        <p className="text-muted-foreground">Manage and view all users in your system</p>
      </div>
      
      <div className="space-y-6">
        <WithErrorHandling queryData={userCountResult} component={UserCount} />
        <WithErrorHandling queryData={usersResult} component={UsersList} />
      </div>
    </main>
  );
}
