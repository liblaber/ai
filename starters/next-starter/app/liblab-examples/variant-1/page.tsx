import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { 
  DollarSign, 
  Users, 
  CreditCard, 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownRight,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2
} from 'lucide-react';

interface Organization {
  id: string;
  name: string;
  plan: string;
  status: 'active' | 'inactive';
}

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  sales: number;
}

interface Revenue {
  id: string;
  amount: number;
  date: string;
  source: string;
}

interface Sale {
  id: string;
  productId: string;
  productName: string;
  amount: number;
  customer: string;
  date: string;
  status: 'completed' | 'pending' | 'failed';
}

interface Subscription {
  id: string;
  organizationId: string;
  organizationName: string;
  plan: string;
  amount: number;
  status: 'active' | 'cancelled' | 'expired';
  nextBilling: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  lastActive: string;
  organizationId: string;
}

interface MetricCardProps {
  title: string;
  value: string;
  change: string;
  changeType: 'positive' | 'negative';
  icon: React.ReactNode;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, change, changeType, icon }) => (
  <Card className="p-6 bg-background border-border">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <div className="flex items-center gap-2 mt-2">
          <h3 className="text-2xl font-bold text-foreground">{value}</h3>
          <div className={`flex items-center gap-1 text-sm ${
            changeType === 'positive' ? 'text-green-600' : 'text-red-600'
          }`}>
            {changeType === 'positive' ? (
              <ArrowUpRight className="h-4 w-4" />
            ) : (
              <ArrowDownRight className="h-4 w-4" />
            )}
            {change}
          </div>
        </div>
      </div>
      <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
        {icon}
      </div>
    </div>
  </Card>
);

interface ChartCardProps {
  title: string;
  children: React.ReactNode;
}

const ChartCard: React.FC<ChartCardProps> = ({ title, children }) => (
  <Card className="p-6 bg-background border-border">
    <h3 className="text-lg font-semibold text-foreground mb-4">{title}</h3>
    {children}
  </Card>
);

const SimpleBarChart: React.FC<{ data: { label: string; value: number }[] }> = ({ data }) => {
  const maxValue = Math.max(...data.map(d => d.value));
  
  return (
    <div className="space-y-3">
      {data.map((item, index) => (
        <div key={index} className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground w-16">{item.label}</span>
          <div className="flex-1">
            <Progress value={(item.value / maxValue) * 100} className="h-2" />
          </div>
          <span className="text-sm font-medium text-foreground w-16 text-right">
            ${item.value.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
};

const SimpleLineChart: React.FC<{ data: { label: string; value: number }[] }> = ({ data }) => {
  const maxValue = Math.max(...data.map(d => d.value));
  const minValue = Math.min(...data.map(d => d.value));
  const range = maxValue - minValue;
  
  return (
    <div className="h-64 flex items-end gap-2 px-4">
      {data.map((item, index) => {
        const height = range > 0 ? ((item.value - minValue) / range) * 200 + 20 : 20;
        return (
          <div key={index} className="flex-1 flex flex-col items-center gap-2">
            <div 
              className="w-full bg-primary rounded-t-sm min-h-[20px] transition-all duration-300 hover:bg-primary/80"
              style={{ height: `${height}px` }}
              title={`${item.label}: $${item.value.toLocaleString()}`}
            />
            <span className="text-xs text-muted-foreground">{item.label}</span>
          </div>
        );
      })}
    </div>
  );
};

const SaaSDashboard: React.FC = () => {
  // Mock data
  const metrics = [
    {
      title: "Total Revenue",
      value: "$45,231.89",
      change: "+20.1%",
      changeType: "positive" as const,
      icon: <DollarSign className="h-6 w-6" />
    },
    {
      title: "Active Users",
      value: "2,350",
      change: "+180.1%",
      changeType: "positive" as const,
      icon: <Users className="h-6 w-6" />
    },
    {
      title: "Subscriptions",
      value: "12,234",
      change: "+19%",
      changeType: "positive" as const,
      icon: <CreditCard className="h-6 w-6" />
    },
    {
      title: "Growth Rate",
      value: "573",
      change: "+201",
      changeType: "positive" as const,
      icon: <TrendingUp className="h-6 w-6" />
    }
  ];

  const revenueData = [
    { label: "Jan", value: 12000 },
    { label: "Feb", value: 15000 },
    { label: "Mar", value: 18000 },
    { label: "Apr", value: 22000 },
    { label: "May", value: 25000 },
    { label: "Jun", value: 28000 }
  ];

  const salesData = [
    { label: "Product A", value: 45000 },
    { label: "Product B", value: 38000 },
    { label: "Product C", value: 32000 },
    { label: "Product D", value: 28000 },
    { label: "Product E", value: 22000 }
  ];

  const recentSales: Sale[] = [
    {
      id: "1",
      productId: "p1",
      productName: "Pro Plan",
      amount: 299,
      customer: "John Doe",
      date: "2024-01-15",
      status: "completed"
    },
    {
      id: "2",
      productId: "p2",
      productName: "Enterprise Plan",
      amount: 999,
      customer: "Jane Smith",
      date: "2024-01-14",
      status: "completed"
    },
    {
      id: "3",
      productId: "p3",
      productName: "Basic Plan",
      amount: 99,
      customer: "Bob Johnson",
      date: "2024-01-14",
      status: "pending"
    },
    {
      id: "4",
      productId: "p1",
      productName: "Pro Plan",
      amount: 299,
      customer: "Alice Brown",
      date: "2024-01-13",
      status: "completed"
    }
  ];

  const topProducts: Product[] = [
    {
      id: "p1",
      name: "Pro Plan",
      price: 299,
      category: "Subscription",
      sales: 1250
    },
    {
      id: "p2",
      name: "Enterprise Plan",
      price: 999,
      category: "Subscription",
      sales: 850
    },
    {
      id: "p3",
      name: "Basic Plan",
      price: 99,
      category: "Subscription",
      sales: 2100
    },
    {
      id: "p4",
      name: "Add-on Features",
      price: 49,
      category: "Add-on",
      sales: 650
    }
  ];

  const recentSubscriptions: Subscription[] = [
    {
      id: "s1",
      organizationId: "o1",
      organizationName: "Acme Corp",
      plan: "Enterprise",
      amount: 999,
      status: "active",
      nextBilling: "2024-02-15"
    },
    {
      id: "s2",
      organizationId: "o2",
      organizationName: "TechStart Inc",
      plan: "Pro",
      amount: 299,
      status: "active",
      nextBilling: "2024-02-10"
    },
    {
      id: "s3",
      organizationId: "o3",
      organizationName: "Design Studio",
      plan: "Basic",
      amount: 99,
      status: "cancelled",
      nextBilling: "2024-01-20"
    }
  ];

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      completed: "bg-green-100 text-green-800 border-green-200",
      pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
      failed: "bg-red-100 text-red-800 border-red-200",
      active: "bg-green-100 text-green-800 border-green-200",
      cancelled: "bg-red-100 text-red-800 border-red-200",
      expired: "bg-gray-100 text-gray-800 border-gray-200"
    };
    
    return (
      <Badge className={`${variants[status] || variants.pending} border`}>
        {status}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Here's what's happening with your business.</p>
        </div>
        <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
          Download Report
        </Button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, index) => (
          <MetricCard key={index} {...metric} />
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Revenue Trend">
          <SimpleLineChart data={revenueData} />
        </ChartCard>
        <ChartCard title="Top Products by Sales">
          <SimpleBarChart data={salesData} />
        </ChartCard>
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Sales */}
        <Card className="p-6 bg-background border-border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">Recent Sales</h3>
            <Button variant="outline" size="sm">
              View All
            </Button>
          </div>
          <div className="space-y-4">
            {recentSales.map((sale) => (
              <div key={sale.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 bg-primary/10">
                    <span className="text-sm font-medium text-primary">
                      {sale.customer.split(' ').map(n => n[0]).join('')}
                    </span>
                  </Avatar>
                  <div>
                    <p className="font-medium text-foreground">{sale.customer}</p>
                    <p className="text-sm text-muted-foreground">{sale.productName}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-foreground">${sale.amount}</p>
                  {getStatusBadge(sale.status)}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Top Products */}
        <Card className="p-6 bg-background border-border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">Top Products</h3>
            <Button variant="outline" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-4">
            {topProducts.map((product) => (
              <div key={product.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                <div>
                  <p className="font-medium text-foreground">{product.name}</p>
                  <p className="text-sm text-muted-foreground">{product.category}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-foreground">${product.price}</p>
                  <p className="text-sm text-muted-foreground">{product.sales} sales</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Subscriptions */}
      <Card className="p-6 bg-background border-border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">Recent Subscriptions</h3>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Eye className="h-4 w-4 mr-2" />
              View
            </Button>
            <Button variant="outline" size="sm">
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Organization</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Plan</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Amount</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Next Billing</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {recentSubscriptions.map((subscription) => (
                <tr key={subscription.id} className="border-b border-border">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8 bg-primary/10">
                        <span className="text-xs font-medium text-primary">
                          {subscription.organizationName.split(' ').map(n => n[0]).join('')}
                        </span>
                      </Avatar>
                      <span className="font-medium text-foreground">{subscription.organizationName}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-foreground">{subscription.plan}</td>
                  <td className="py-3 px-4 font-medium text-foreground">${subscription.amount}</td>
                  <td className="py-3 px-4">{getStatusBadge(subscription.status)}</td>
                  <td className="py-3 px-4 text-muted-foreground">{subscription.nextBilling}</td>
                  <td className="py-3 px-4">
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default SaaSDashboard;