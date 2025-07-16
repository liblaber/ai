export const TEST_ARTIFACT = `I'll create a comprehensive users page with user management functionality, statistics, and filtering capabilities.

<liblabArtifact id="users-page" title="Add Users Page with Management Features">
<liblabAction type="commit-message">Add users page with user table, statistics, role distribution, and filtering capabilities</liblabAction>

<liblabAction type="file" filePath="app/types.ts">
export interface DailyRevenue {
  revenue_date: string;
  total_revenue: number;
  total_cost: number;
  gross_profit: number;
  net_profit: number;
}

export interface TopOrganization {
  organization_name: string;
  total_revenue: number;
  net_profit: number;
  subscription_tier: 'free' | 'starter' | 'pro' | 'business' | 'premium' | 'enterprise';
}

export interface RevenueBreakdown {
  total_subscription_revenue: number;
  total_product_revenue: number;
  total_revenue: number;
}

export interface MonthlyTrend {
  month_year: string;
  monthly_revenue: number;
  monthly_profit: number;
  avg_daily_revenue: number;
}

export interface TierPerformance {
  subscription_tier: 'free' | 'starter' | 'pro' | 'business' | 'premium' | 'enterprise';
  org_count: number;
  tier_revenue: number;
  avg_revenue_per_org: number;
}

export interface RevenueKPIs {
  total_revenue_generating_orgs: number;
  total_system_revenue: number;
  avg_revenue_per_record: number;
  profitable_records: number;
}

export interface User {
  user_id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'Sales Manager' | 'Sales Representative' | 'Account Manager' | 'Store Manager' | 'Data Scientist' | 'Cloud Architect';
  created_at: string;
  last_login_at: string | null;
  is_active: number;
  organization_name: string;
}

export interface UserStats {
  total_users: number;
}

export interface RoleDistribution {
  role: 'Sales Manager' | 'Sales Representative' | 'Account Manager' | 'Store Manager' | 'Data Scientist' | 'Cloud Architect';
  count: number;
}
</liblabAction>

<liblabAction type="file" filePath="app/users/page.tsx">
import { executeQuery } from '@/db/execute-query';
import { WithErrorHandling } from '@/components/hoc/WithErrorHandling';
import { UsersTable } from '@/components/users/UsersTable';
import { UserStatsCard } from '@/components/users/UserStatsCard';
import { RoleDistributionChart } from '@/components/users/RoleDistributionChart';
import { User, UserStats, RoleDistribution } from '@/types';

export default async function UsersPage() {
  const [
    users,
    userStats,
    roleDistribution,
  ] = await Promise.all([
    executeQuery<User>(\`
SELECT u.user_id, u.username, u.email, u.first_name, u.last_name, u.role, u.created_at, u.last_login_at, u.is_active, o.organization_name
FROM users u
JOIN organizations o ON u.organization_id = o.organization_id
ORDER BY u.created_at DESC
  \`),
    executeQuery<UserStats>(\`
SELECT COUNT(*) as total_users
FROM users
WHERE is_active = 1
  \`),
    executeQuery<RoleDistribution>(\`
SELECT role, COUNT(*) as count
FROM users
WHERE is_active = 1
GROUP BY role
ORDER BY count DESC
  \`),
  ]);

  return (
    <main className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-bold text-foreground">User Management</h1>
      </div>

      <div className="grid gap-6">
        <div className="grid gap-6 md:grid-cols-2">
          <WithErrorHandling queryData={userStats} component={UserStatsCard} />
          <WithErrorHandling queryData={roleDistribution} component={RoleDistributionChart} />
        </div>

        <WithErrorHandling queryData={users} component={UsersTable} />
      </div>
    </main>
  );
}
</liblabAction>

<liblabAction type="file" filePath="app/components/users/UsersTable.tsx">
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { User } from '@/types';
import { format } from 'date-fns';
import { Search, Filter } from 'lucide-react';

const roleColors = {
  'Sales Manager': 'bg-purple-100 text-purple-800',
  'Sales Representative': 'bg-blue-100 text-blue-800',
  'Account Manager': 'bg-green-100 text-green-800',
  'Store Manager': 'bg-orange-100 text-orange-800',
  'Data Scientist': 'bg-red-100 text-red-800',
  'Cloud Architect': 'bg-indigo-100 text-indigo-800',
};

export function UsersTable({ data }: { data: User[] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredUsers = data.filter(user => {
    const matchesSearch =
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.organization_name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'active' && user.is_active === 1) ||
      (statusFilter === 'inactive' && user.is_active === 0);

    return matchesSearch && matchesRole && matchesStatus;
  });

  const uniqueRoles = Array.from(new Set(data.map(user => user.role)));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Users ({filteredUsers.length})</CardTitle>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 border rounded-md text-sm"
            >
              <option value="all">All Roles</option>
              {uniqueRoles.map(role => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border rounded-md text-sm"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Last Login</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.user_id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{user.first_name} {user.last_name}</div>
                      <div className="text-sm text-muted-foreground">@{user.username}</div>
                      <div className="text-sm text-muted-foreground">{user.email}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={roleColors[user.role]}>
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{user.organization_name}</TableCell>
                  <TableCell>
                    <Badge variant={user.is_active ? 'default' : 'secondary'}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {format(new Date(user.created_at), 'MMM dd, yyyy')}
                  </TableCell>
                  <TableCell className="text-sm">
                    {user.last_login_at
                      ? format(new Date(user.last_login_at), 'MMM dd, yyyy')
                      : 'Never'
                    }
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
</liblabAction>

<liblabAction type="file" filePath="app/components/users/UserStatsCard.tsx">
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserStats } from '@/types';
import { Users, UserCheck, UserX, Activity } from 'lucide-react';

export function UserStatsCard({ data }: { data: UserStats[] }) {
  const stats = data[0];

  const metrics = [
    {
      title: 'Total Active Users',
      value: stats.total_users.toLocaleString(),
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Statistics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          {metrics.map((metric, index) => (
            <div key={index} className="flex items-center space-x-4 p-4 rounded-lg bg-muted/50">
              <div className={\`p-3 rounded-full \${metric.bgColor}\`}>
                <metric.icon className={\`h-6 w-6 \${metric.color}\`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{metric.title}</p>
                <p className="text-2xl font-bold">{metric.value}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
</liblabAction>

<liblabAction type="file" filePath="app/components/users/RoleDistributionChart.tsx">
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Bar, BarChart, XAxis, YAxis } from 'recharts';
import { RoleDistribution } from '@/types';

export function RoleDistributionChart({ data }: { data: RoleDistribution[] }) {
  const chartConfig = {
    count: {
      label: 'Users',
      color: 'var(--chart-1)',
    },
  };

  const formattedData = data.map(item => ({
    ...item,
    role_short: item.role.split(' ').map(word => word.charAt(0)).join(''),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Role Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <BarChart data={formattedData}>
            <XAxis dataKey="role_short" />
            <YAxis />
            <ChartTooltip
              content={<ChartTooltipContent />}
              labelFormatter={(label) => {
                const item = formattedData.find(d => d.role_short === label);
                return item ? item.role : label;
              }}
            />
            <Bar
              dataKey="count"
              fill="var(--chart-1)"
              name="Users"
            />
          </BarChart>
        </ChartContainer>
        <div className="mt-4 space-y-2">
          {data.map((item, index) => (
            <div key={index} className="flex justify-between text-sm">
              <span>{item.role}</span>
              <span className="font-mono">{item.count} users</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
</liblabAction>

<liblabAction type="file" filePath="app/components/building-blocks/sidebar-nav/sidebar-links.ts">
import { House, Users } from 'lucide-react';

export const SIDEBAR_LINKS = [
  {
    href: '/',
    label: 'Dashboard',
    icon: House,
  },
  {
    href: '/users',
    label: 'Users',
    icon: Users,
  },
];
</liblabAction>

</liblabArtifact>

I've created a comprehensive users page with the following features:

## **Users Page Components:**

1. **User Statistics Card** - Shows total active users count with clean metrics display
2. **Role Distribution Chart** - Bar chart showing user count by role with detailed breakdown
3. **Users Table** - Complete user management table with advanced filtering

## **Key Features:**

### **Advanced Filtering:**
- **Search functionality** - Search across username, email, name, and organization
- **Role filter** - Filter by specific roles (Sales Manager, Sales Rep, etc.)
- **Status filter** - Filter by active/inactive users

### **User Information Display:**
- **Complete user details** - Name, username, email, role, organization
- **Status indicators** - Active/inactive badges with appropriate colors
- **Role badges** - Color-coded role identification
- **Timestamps** - Creation date and last login information

### **Professional Design:**
- **Responsive layout** - Works on all screen sizes
- **Clean typography** - Easy to read user information
- **Intuitive navigation** - Added Users link to sidebar
- **Consistent styling** - Matches the revenue dashboard design

The users page provides comprehensive user management capabilities while maintaining the same professional design language as your revenue dashboard.
`;
