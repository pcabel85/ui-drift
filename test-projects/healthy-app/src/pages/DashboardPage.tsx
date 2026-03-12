import React from 'react';
import {
  Box, Grid, Typography, Card, CardContent,
  LinearProgress, Button, Divider
} from '@mui/material';
import { TrendingUp, TrendingDown, People, ShoppingCart } from '@mui/icons-material';
import UserAvatar from '../components/UserAvatar';
import StatusBadge from '../components/StatusBadge';
import DataTable from '../components/DataTable';

const statCards = [
  { label: 'Total Revenue', value: '$48,295', change: +12.4, icon: <TrendingUp /> },
  { label: 'Active Users', value: '3,842', change: +5.1, icon: <People /> },
  { label: 'Orders Today', value: '284', change: -2.3, icon: <ShoppingCart /> },
  { label: 'Conversion Rate', value: '3.7%', change: +0.8, icon: <TrendingUp /> },
];

const recentOrders = [
  { id: '1001', customer: 'Alice Johnson', amount: 129.99, status: 'success' as const },
  { id: '1002', customer: 'Bob Smith', amount: 64.50, status: 'pending' as const },
  { id: '1003', customer: 'Carol White', amount: 299.00, status: 'warning' as const },
];

const DashboardPage: React.FC = () => {
  return (
    <Box p={3}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
        <Typography variant="h5" fontWeight={700}>Dashboard</Typography>
        <Button variant="outlined" size="small">Export Report</Button>
      </Box>

      <Grid container spacing={2} mb={3}>
        {statCards.map((stat) => (
          <Grid item xs={12} sm={6} md={3} key={stat.label}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                  <Typography variant="body2" color="text.secondary">{stat.label}</Typography>
                  <Box color={stat.change >= 0 ? 'success.main' : 'error.main'}>{stat.icon}</Box>
                </Box>
                <Typography variant="h5" fontWeight={700} mt={1}>{stat.value}</Typography>
                <Typography
                  variant="caption"
                  color={stat.change >= 0 ? 'success.main' : 'error.main'}
                >
                  {stat.change >= 0 ? '+' : ''}{stat.change}% vs last month
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Card>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={600} mb={2}>Recent Orders</Typography>
          <Divider sx={{ mb: 2 }} />
          {recentOrders.map((order) => (
            <Box key={order.id} display="flex" alignItems="center" justifyContent="space-between" py={1}>
              <UserAvatar name={order.customer} showName size="small" />
              <Typography variant="body2" fontWeight={500}>${order.amount.toFixed(2)}</Typography>
              <StatusBadge status={order.status} />
            </Box>
          ))}
        </CardContent>
      </Card>
    </Box>
  );
};

export default DashboardPage;
