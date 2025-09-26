'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserCountData } from '@/types';
import { Users } from 'lucide-react';

export function UserCount({ data }: { data: UserCountData[] }) {
  const totalUsers = data[0]?.total_users || 0;

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Total Users</CardTitle>
        <Users className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{totalUsers.toLocaleString()}</div>
        <p className="text-xs text-muted-foreground">
          Active users in the system
        </p>
      </CardContent>
    </Card>
  );
}
