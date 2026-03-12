import React from 'react';
import {
  Box, Card, CardContent, Typography, Button,
  Divider, List, ListItem, ListItemText, Alert
} from '@mui/material';
import { Lock, LocalShipping } from '@mui/icons-material';

interface CartItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

interface CheckoutSummaryProps {
  items: CartItem[];
  shippingCost: number;
  discountAmount?: number;
  onCheckout: () => void;
  loading?: boolean;
}

const CheckoutSummary: React.FC<CheckoutSummaryProps> = ({
  items,
  shippingCost,
  discountAmount = 0,
  onCheckout,
  loading = false,
}) => {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const total = subtotal + shippingCost - discountAmount;

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="h6" fontWeight={700} mb={2}>
          Order Summary
        </Typography>

        <List dense disablePadding>
          {items.map((item) => (
            <ListItem key={item.id} disableGutters>
              <ListItemText
                primary={item.name}
                secondary={`Qty: ${item.quantity}`}
              />
              <Typography variant="body2" fontWeight={500}>
                ${(item.price * item.quantity).toFixed(2)}
              </Typography>
            </ListItem>
          ))}
        </List>

        <Divider sx={{ my: 2 }} />

        <Box display="flex" justifyContent="space-between" mb={1}>
          <Typography variant="body2" color="text.secondary">Subtotal</Typography>
          <Typography variant="body2">${subtotal.toFixed(2)}</Typography>
        </Box>

        <Box display="flex" justifyContent="space-between" mb={1}>
          <Typography variant="body2" color="text.secondary" display="flex" alignItems="center" gap={0.5}>
            <LocalShipping fontSize="inherit" /> Shipping
          </Typography>
          <Typography variant="body2">
            {shippingCost === 0 ? 'Free' : `$${shippingCost.toFixed(2)}`}
          </Typography>
        </Box>

        {discountAmount > 0 && (
          <Box display="flex" justifyContent="space-between" mb={1}>
            <Typography variant="body2" color="success.main">Discount</Typography>
            <Typography variant="body2" color="success.main">
              -${discountAmount.toFixed(2)}
            </Typography>
          </Box>
        )}

        <Divider sx={{ my: 2 }} />

        <Box display="flex" justifyContent="space-between" mb={3}>
          <Typography variant="subtitle1" fontWeight={700}>Total</Typography>
          <Typography variant="subtitle1" fontWeight={700} color="primary">
            ${total.toFixed(2)}
          </Typography>
        </Box>

        <Button
          variant="contained"
          color="primary"
          size="large"
          fullWidth
          startIcon={<Lock />}
          onClick={onCheckout}
          disabled={loading || items.length === 0}
        >
          {loading ? 'Processing...' : 'Secure Checkout'}
        </Button>

        <Alert severity="info" icon={<Lock fontSize="small" />} sx={{ mt: 2 }}>
          Your payment info is encrypted and secure.
        </Alert>
      </CardContent>
    </Card>
  );
};

export default CheckoutSummary;
