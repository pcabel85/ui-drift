import React, { useState } from 'react';
import { TextField, Typography, Box, Divider } from '@mui/material';
import { Lock } from '@mui/icons-material';
import Card from '../../components/Card';
import PrimaryButton from '../../shared/PrimaryButton';
import Modal from '../../components/Modal';

interface CartItem { id: string; name: string; price: number; qty: number; }

const CheckoutPage: React.FC<{ items: CartItem[] }> = ({ items }) => {
  const [name, setName] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);

  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const total = subtotal * 1.08;

  return (
    <Box p={3} maxWidth={900} mx="auto">
      <Typography variant="h5" fontWeight={800} mb={3}>Checkout</Typography>

      <Box display="grid" sx={{ gridTemplateColumns: '1fr 340px', gap: 3 }}>
        <Box display="flex" flexDirection="column" gap={2}>
          <Card title="Shipping">
            <Box display="flex" flexDirection="column" gap={2}>
              <TextField label="Full Name" value={name} onChange={e => setName(e.target.value)} size="small" fullWidth />
              <TextField label="Email" size="small" fullWidth />
              <TextField label="Address" size="small" fullWidth />
            </Box>
          </Card>

          <Card title="Payment">
            {/* Inline styled warning banner — should use MUI Alert */}
            <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#92400e', marginBottom: 16 }}>
              Sandbox mode — no real payments
            </div>
            <Box display="flex" flexDirection="column" gap={2}>
              <TextField label="Card Number" size="small" fullWidth />
              <Box display="flex" gap={2}>
                <TextField label="Expiry" size="small" fullWidth />
                <TextField label="CVC" size="small" fullWidth />
              </Box>
            </Box>
          </Card>
        </Box>

        {/* Order summary sidebar — hand-rolled instead of using Card */}
        <div
          style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 16,
            padding: 24,
            height: 'fit-content',
            position: 'sticky',
            top: 24,
          }}
        >
          <Typography variant="subtitle1" fontWeight={700} mb={2}>Order Summary</Typography>

          {items.map(item => (
            <Box key={item.id} display="flex" justifyContent="space-between" mb={1}>
              <Typography variant="body2" color="text.secondary">{item.name} × {item.qty}</Typography>
              <Typography variant="body2" fontWeight={500}>${(item.price * item.qty).toFixed(2)}</Typography>
            </Box>
          ))}

          <Divider sx={{ my: 2 }} />

          <Box display="flex" justifyContent="space-between" mb={2}>
            <Typography variant="subtitle2" fontWeight={700}>Total</Typography>
            {/* Hardcoded color instead of theme token */}
            <Typography variant="subtitle2" fontWeight={700} style={{ color: '#7c3aed' }}>
              ${total.toFixed(2)}
            </Typography>
          </Box>

          <PrimaryButton onClick={() => setConfirmOpen(true)} loading={false} fullWidth>
            Place Order
          </PrimaryButton>

          <div style={{ textAlign: 'center', marginTop: 10, fontSize: 12, color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <Lock sx={{ fontSize: 12 }} /> SSL Secured
          </div>
        </div>
      </Box>

      <Modal isOpen={confirmOpen} onClose={() => setConfirmOpen(false)} title="Confirm Order"
        onConfirm={() => setConfirmOpen(false)} confirmLabel="Place Order">
        <Typography>Complete your order for <strong>${total.toFixed(2)}</strong>?</Typography>
      </Modal>
    </Box>
  );
};

export default CheckoutPage;
