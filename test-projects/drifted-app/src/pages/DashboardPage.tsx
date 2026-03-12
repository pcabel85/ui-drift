import React from 'react';
import Card from '../components/Card';
import Button from '../components/Button';
import PrimaryButton from '../shared/PrimaryButton';

const stats = [
  { label: 'Revenue', value: '$12,450', color: '#22c55e' },
  { label: 'Users', value: '1,203', color: '#3b82f6' },
  { label: 'Orders', value: '94', color: '#f59e0b' },
  { label: 'Refunds', value: '7', color: '#ef4444' },
];

const DashboardPage: React.FC = () => {
  return (
    <div style={{ padding: 32, backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 24,
        }}
      >
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#0f172a' }}>Dashboard</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="secondary" size="sm">Export</Button>
          <PrimaryButton>New Report</PrimaryButton>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 16,
          marginBottom: 24,
        }}
      >
        {stats.map((stat) => (
          <Card key={stat.label}>
            <div style={{ fontSize: 13, color: '#64748b', fontWeight: 500, marginBottom: 6 }}>
              {stat.label}
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: stat.color }}>
              {stat.value}
            </div>
          </Card>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        <Card title="Recent Activity">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 0',
                borderBottom: i < 5 ? '1px solid #f1f5f9' : 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    backgroundColor: '#e0e7ff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 13,
                    fontWeight: 700,
                    color: '#4f46e5',
                  }}
                >
                  U{i}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>User {i}</div>
                  <div style={{ fontSize: 12, color: '#94a3b8' }}>Placed an order</div>
                </div>
              </div>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  padding: '3px 8px',
                  backgroundColor: '#dcfce7',
                  color: '#16a34a',
                  borderRadius: 999,
                }}
              >
                Completed
              </span>
            </div>
          ))}
        </Card>

        <Card title="Quick Actions">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <PrimaryButton fullWidth>Create Invoice</PrimaryButton>
            <Button variant="secondary" size="md">View Reports</Button>
            <Button variant="secondary" size="md">Manage Users</Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default DashboardPage;
