'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import WithErrorHandling from '@/components/hoc/WithErrorHandling';
import { executeQuery } from '@/db/execute-query';
import { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { DollarSign, TrendingUp, TrendingDown, Users, Filter, Download } from 'lucide-react';

interface KPIData {
  total_subscription_revenue: number;
  total_product_revenue: number;
  total_revenue: number;
}

interface DailyRevenueData {
  revenue_date: string;
  total_revenue: number;
  total_cost: number;
  gross_profit: number;
  net_profit: number;
}

interface OrganizationRevenueData {
  organization_name: string;
  total_revenue: number;
  gross_profit: number;
  net_profit: number;
}

interface MonthlyRevenueData {
  month_year: string;
  monthly_revenue: number;
  monthly_gross_profit: number;
  monthly_net_profit: number;
}

interface IndustryRevenueData {
  industry: string;
  industry_revenue: number;
  avg_revenue_per_org: number;
}

interface RevenueStats {
  total_revenue_generating_orgs: number;
  avg_daily_revenue: number;
  highest_daily_revenue: number;
  lowest_daily_revenue: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

function RevenueDashboard() {
  const [kpiData, setKpiData] = useState<KPIData | null>(null);
  const [dailyRevenue, setDailyRevenue] = useState<DailyRevenueData[]>([]);
  const [orgRevenue, setOrgRevenue] = useState<OrganizationRevenueData[]>([]);
  const [monthlyRevenue, setMonthlyRevenue] = useState<MonthlyRevenueData[]>([]);
  const [industryRevenue, setIndustryRevenue] = useState<IndustryRevenueData[]>([]);
  const [revenueStats, setRevenueStats] = useState<RevenueStats | null>(null);
  const [filterText, setFilterText] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const [kpi, daily, org, monthly, industry, stats] = await Promise.all([
          executeQuery(
            'SELECT SUM(subscription_revenue) as total_subscription_revenue, SUM(product_revenue) as total_product_revenue, SUM(total_revenue) as total_revenue FROM revenue',
          ),
          executeQuery(
            'SELECT DATE(date) as revenue_date, SUM(total_revenue) as total_revenue, SUM(total_cost) as total_cost, SUM(gross_profit) as gross_profit, SUM(net_profit) as net_profit FROM revenue GROUP BY DATE(date) ORDER BY revenue_date DESC LIMIT 30',
          ),
          executeQuery(
            'SELECT o.organization_name, SUM(r.total_revenue) as total_revenue, SUM(r.gross_profit) as gross_profit, SUM(r.net_profit) as net_profit FROM revenue r JOIN organizations o ON r.organization_id = o.organization_id GROUP BY r.organization_id, o.organization_name ORDER BY total_revenue DESC LIMIT 20',
          ),
          executeQuery(
            "SELECT strftime('%Y-%m', date) as month_year, SUM(total_revenue) as monthly_revenue, SUM(gross_profit) as monthly_gross_profit, SUM(net_profit) as monthly_net_profit FROM revenue GROUP BY strftime('%Y-%m', date) ORDER BY month_year DESC LIMIT 12",
          ),
          executeQuery(
            'SELECT o.industry, SUM(r.total_revenue) as industry_revenue, AVG(r.total_revenue) as avg_revenue_per_org FROM revenue r JOIN organizations o ON r.organization_id = o.organization_id GROUP BY o.industry ORDER BY industry_revenue DESC',
          ),
          executeQuery(
            'SELECT COUNT(DISTINCT organization_id) as total_revenue_generating_orgs, AVG(total_revenue) as avg_daily_revenue, MAX(total_revenue) as highest_daily_revenue, MIN(total_revenue) as lowest_daily_revenue FROM revenue',
          ),
        ]);

        setKpiData(kpi[0] as KPIData);
        setDailyRevenue(daily as DailyRevenueData[]);
        setOrgRevenue(org as OrganizationRevenueData[]);
        setMonthlyRevenue(monthly as MonthlyRevenueData[]);
        setIndustryRevenue(industry as IndustryRevenueData[]);
        setRevenueStats(stats[0] as RevenueStats);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredOrgRevenue = orgRevenue.filter((org) =>
    org.organization_name.toLowerCase().includes(filterText.toLowerCase()),
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-lg">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Revenue Dashboard</h1>
        <Button variant="outline" size="sm">
          <Download className="w-4 h-4 mr-2" />
          Export
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(kpiData?.total_revenue || 0)}</div>
            <p className="text-xs text-muted-foreground">All-time revenue</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Subscription Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(kpiData?.total_subscription_revenue || 0)}</div>
            <p className="text-xs text-muted-foreground">
              {(((kpiData?.total_subscription_revenue || 0) / (kpiData?.total_revenue || 1)) * 100).toFixed(1)}% of
              total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Product Revenue</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(kpiData?.total_product_revenue || 0)}</div>
            <p className="text-xs text-muted-foreground">
              {(((kpiData?.total_product_revenue || 0) / (kpiData?.total_revenue || 1)) * 100).toFixed(1)}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Organizations</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{revenueStats?.total_revenue_generating_orgs || 0}</div>
            <p className="text-xs text-muted-foreground">
              Avg: {formatCurrency(revenueStats?.avg_daily_revenue || 0)}/day
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Revenue Trends */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Revenue Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                revenue: { label: 'Revenue', color: '#0088FE' },
                profit: { label: 'Net Profit', color: '#00C49F' },
              }}
            >
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyRevenue.slice().reverse()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month_year" />
                  <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`} />
                  <ChartTooltip
                    content={<ChartTooltipContent />}
                    formatter={(value: number) => [formatCurrency(value), '']}
                  />
                  <Line type="monotone" dataKey="monthly_revenue" stroke="#0088FE" strokeWidth={2} />
                  <Line type="monotone" dataKey="monthly_net_profit" stroke="#00C49F" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Top Organizations by Revenue */}
        <Card>
          <CardHeader>
            <CardTitle>Top Organizations by Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                revenue: { label: 'Revenue', color: '#0088FE' },
              }}
            >
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={orgRevenue.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="organization_name" angle={-45} textAnchor="end" height={100} fontSize={12} />
                  <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`} />
                  <ChartTooltip
                    content={<ChartTooltipContent />}
                    formatter={(value: number) => [formatCurrency(value), '']}
                  />
                  <Bar dataKey="total_revenue" fill="#0088FE" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Industry Revenue Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue by Industry</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartContainer
              config={{
                revenue: { label: 'Revenue', color: '#0088FE' },
              }}
            >
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={industryRevenue}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ industry, percent }) => `${industry}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="industry_revenue"
                  >
                    {industryRevenue.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip
                    content={<ChartTooltipContent />}
                    formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>

            <div className="space-y-2">
              {industryRevenue.map((item, index) => (
                <div key={item.industry} className="flex items-center justify-between p-2 border rounded">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="font-medium">{item.industry}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{formatCurrency(item.industry_revenue)}</div>
                    <div className="text-sm text-muted-foreground">Avg: {formatCurrency(item.avg_revenue_per_org)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Revenue Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Organization Revenue Details</CardTitle>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4" />
              <Input
                placeholder="Filter organizations..."
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                className="w-64"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organization</TableHead>
                <TableHead className="text-right">Total Revenue</TableHead>
                <TableHead className="text-right">Gross Profit</TableHead>
                <TableHead className="text-right">Net Profit</TableHead>
                <TableHead className="text-right">Profit Margin</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrgRevenue.map((org) => {
                const profitMargin = (org.net_profit / org.total_revenue) * 100;
                return (
                  <TableRow key={org.organization_name}>
                    <TableCell className="font-medium">{org.organization_name}</TableCell>
                    <TableCell className="text-right">{formatCurrency(org.total_revenue)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(org.gross_profit)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(org.net_profit)}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={profitMargin > 20 ? 'default' : profitMargin > 10 ? 'secondary' : 'destructive'}>
                        {profitMargin.toFixed(1)}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Home() {
  return (
    <WithErrorHandling>
      <RevenueDashboard />
    </WithErrorHandling>
  );
}
