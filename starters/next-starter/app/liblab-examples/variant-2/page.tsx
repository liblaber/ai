import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Users, CreditCard, PieChart, TrendingUp } from 'lucide-react';

// Pie chart using SVG for minimalism
const PieChartMinimal = ({ data }: { data: { label: string; value: number; color: string }[] }) => {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  let cumulative = 0;
  const radius = 40;
  const cx = 50;
  const cy = 50;
  const strokeWidth = 16;

  return (
    <svg width={100} height={100} viewBox="0 0 100 100">
      {data.map((slice, i) => {
        const value = slice.value;
        const startAngle = (cumulative / total) * 2 * Math.PI;
        const endAngle = ((cumulative + value) / total) * 2 * Math.PI;
        const x1 = cx + radius * Math.sin(startAngle);
        const y1 = cy - radius * Math.cos(startAngle);
        const x2 = cx + radius * Math.sin(endAngle);
        const y2 = cy - radius * Math.cos(endAngle);
        const largeArc = value / total > 0.5 ? 1 : 0;
        const pathData = `M${cx},${cy} L${x1},${y1} A${radius},${radius} 0 ${largeArc} 1 ${x2},${y2} Z`;
        cumulative += value;
        return (
          <path key={i} d={pathData} fill={slice.color} stroke="#fff" strokeWidth={1} />
        );
      })}
    </svg>
  );
};

const metrics = [
  {
    title: 'Revenue',
    value: '$12,500',
    icon: <DollarSign className="h-5 w-5 text-primary" />,
  },
  {
    title: 'Active Users',
    value: '1,230',
    icon: <Users className="h-5 w-5 text-primary" />,
  },
  {
    title: 'Subscriptions',
    value: '3,210',
    icon: <CreditCard className="h-5 w-5 text-primary" />,
  },
  {
    title: 'Growth',
    value: '+8.2%',
    icon: <TrendingUp className="h-5 w-5 text-primary" />,
  },
];

const revenueBreakdown = [
  { label: 'Subscriptions', value: 8000, color: '#6366f1' },
  { label: 'Products', value: 3500, color: '#f59e42' },
  { label: 'Services', value: 1000, color: '#10b981' },
];

const topOrgs = [
  { name: 'Acme Corp', tier: 'enterprise', users: 120 },
  { name: 'Beta LLC', tier: 'pro', users: 80 },
  { name: 'Gamma Inc', tier: 'starter', users: 45 },
];

const recentProducts = [
  { name: 'AI Suite', price: 299, stock: 50 },
  { name: 'Cloud Storage', price: 99, stock: 120 },
  { name: 'Solar Panel', price: 499, stock: 20 },
];

export default function MinimalDashboard() {
  return (
    <div className="min-h-screen bg-background p-6 space-y-8">
      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {metrics.map((m) => (
          <Card key={m.title} className="flex flex-col items-center py-6">
            <div className="mb-2">{m.icon}</div>
            <div className="text-lg font-semibold text-foreground">{m.value}</div>
            <div className="text-xs text-muted-foreground">{m.title}</div>
          </Card>
        ))}
      </div>

      {/* Pie Chart & Top Orgs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
        <Card className="flex flex-col items-center py-8">
          <div className="mb-4 flex items-center gap-2">
            <PieChart className="h-5 w-5 text-primary" />
            <span className="font-semibold text-foreground">Revenue Breakdown</span>
          </div>
          <PieChartMinimal data={revenueBreakdown} />
          <div className="flex gap-4 mt-4">
            {revenueBreakdown.map((slice) => (
              <div key={slice.label} className="flex items-center gap-1 text-xs">
                <span style={{ background: slice.color }} className="inline-block w-3 h-3 rounded-full" />
                <span>{slice.label}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-6">
          <div className="font-semibold mb-2 text-foreground">Top Organizations</div>
          <div className="space-y-2">
            {topOrgs.map((org) => (
              <div key={org.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Avatar className="h-7 w-7 bg-primary/10">
                    <span className="text-xs font-medium text-primary">
                      {org.name.split(' ').map(n => n[0]).join('')}
                    </span>
                  </Avatar>
                  <span className="text-foreground">{org.name}</span>
                  <Badge className="ml-2 lowercase">{org.tier}</Badge>
                </div>
                <span className="text-xs text-muted-foreground">{org.users} users</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Recent Products */}
      <Card className="p-6">
        <div className="font-semibold mb-2 text-foreground">Recent Products</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {recentProducts.map((prod) => (
            <div key={prod.name} className="flex flex-col items-center border rounded-lg p-4">
              <div className="font-medium text-foreground">{prod.name}</div>
              <div className="text-xs text-muted-foreground mb-1">${prod.price}</div>
              <Progress value={Math.min(100, (prod.stock / 100) * 100)} className="h-2 w-full" />
              <div className="text-xs text-muted-foreground mt-1">Stock: {prod.stock}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
