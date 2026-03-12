import React from 'react';
import { Box, Typography, Grid, Chip, LinearProgress, Divider } from '@mui/material';
import { TrendingUp, People, ShoppingCart, Warning } from '@mui/icons-material';
import Card from '../../components/Card';
import Button from '../../components/Button';
import PrimaryButton from '../../shared/PrimaryButton';
import UserProfile from '../../components/UserProfile';

const stats = [
  { label: 'Revenue', value: '$31,200', delta: '+9%', icon: <TrendingUp />, color: '#22c55e' },
  { label: 'Users', value: '2,140', delta: '+4%', icon: <People />, color: '#3b82f6' },
  { label: 'Orders', value: '186', delta: '-1%', icon: <ShoppingCart />, color: '#f59e0b' },
];

const DashboardPage: React.FC = () => {
  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight={700}>Dashboard</Typography>
        <Box display="flex" gap={1}>
          <Button variant="outlined" size="small">Export</Button>
          {/* Inconsistent: PrimaryButton here, Button component above */}
          <PrimaryButton>New Report</PrimaryButton>
        </Box>
      </Box>

      <Grid container spacing={2} mb={3}>
        {stats.map(stat => (
          <Grid item xs={12} sm={4} key={stat.label}>
            <Card>
              <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                <Box>
                  <Typography variant="body2" color="text.secondary">{stat.label}</Typography>
                  <Typography variant="h5" fontWeight={800} mt={0.5}>{stat.value}</Typography>
                </Box>
                {/* Hardcoded color on icon wrapper */}
                <Box style={{ color: stat.color }}>{stat.icon}</Box>
              </Box>
              <Typography variant="caption" style={{ color: stat.delta.startsWith('+') ? '#16a34a' : '#dc2626' }}>
                {stat.delta} this month
              </Typography>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} md={8}>
          <Card title="System Health">
            {[
              { name: 'API Uptime', pct: 99.8, color: '#22c55e' },
              { name: 'DB Response', pct: 87, color: '#f59e0b' },
              { name: 'CDN Cache Hit Rate', pct: 73, color: '#3b82f6' },
            ].map(item => (
              <Box key={item.name} mb={2}>
                <Box display="flex" justifyContent="space-between" mb={0.5}>
                  <Typography variant="body2">{item.name}</Typography>
                  <Typography variant="body2" fontWeight={600}>{item.pct}%</Typography>
                </Box>
                <LinearProgress variant="determinate" value={item.pct} sx={{ height: 6, borderRadius: 3 }} />
              </Box>
            ))}
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card title="Team">
            <UserProfile
              name="Sarah Connor"
              email="sarah@company.com"
              role="Engineering Manager"
              verified
              joinedDate="Jan 2022"
              stats={[{ label: 'PRs', value: 42 }, { label: 'Reviews', value: 118 }]}
            />
            <Divider sx={{ my: 2 }} />

            {/* Inline-styled alert instead of MUI Alert */}
            <div style={{ display: 'flex', gap: 8, padding: '10px 14px', backgroundColor: '#fef3c7', borderRadius: 8, fontSize: 13, color: '#92400e', alignItems: 'center' }}>
              <Warning sx={{ fontSize: 16 }} />
              2 open incidents need review
            </div>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DashboardPage;
