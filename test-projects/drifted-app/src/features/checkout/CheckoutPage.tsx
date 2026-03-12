import React, { useState } from 'react';
import CTAButton from './CTAButton';
import TextInput from '../../shared/TextInput';
import Card from '../../components/Card';
import Modal from '../../components/Modal';

interface CheckoutPageProps {
  cartItems: Array<{ id: string; name: string; price: number; qty: number }>;
}

const CheckoutPage: React.FC<CheckoutPageProps> = ({ cartItems }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);

  const subtotal = cartItems.reduce((sum, i) => sum + i.price * i.qty, 0);
  const tax = subtotal * 0.08;
  const total = subtotal + tax;

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>
        Checkout
      </h1>
      <p style={{ color: '#64748b', marginBottom: 32, fontSize: 15 }}>
        Complete your purchase below
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 32 }}>
        {/* Left column */}
        <div>
          <Card title="Shipping Information">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <TextInput label="Full Name" value={name} onChange={setName} placeholder="Jane Smith" />
              <TextInput label="Email" value={email} onChange={setEmail} type="email" placeholder="jane@example.com" />
              <TextInput label="Address" value={address} onChange={setAddress} placeholder="123 Main St, City, State" />
            </div>
          </Card>

          <div style={{ marginTop: 24 }}>
            <Card title="Payment">
              <div
                style={{
                  backgroundColor: '#fef9c3',
                  border: '1px solid #fde047',
                  borderRadius: 8,
                  padding: '12px 16px',
                  fontSize: 14,
                  color: '#854d0e',
                  marginBottom: 16,
                }}
              >
                ⚠ Sandbox mode — no real payments processed
              </div>
              <TextInput label="Card Number" value="" onChange={() => {}} placeholder="4242 4242 4242 4242" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <TextInput label="Expiry" value="" onChange={() => {}} placeholder="MM/YY" />
                <TextInput label="CVC" value="" onChange={() => {}} placeholder="123" />
              </div>
            </Card>
          </div>
        </div>

        {/* Right column - order summary */}
        <div>
          <div
            style={{
              backgroundColor: '#f8fafc',
              borderRadius: 16,
              padding: 24,
              border: '1px solid #e2e8f0',
              position: 'sticky',
              top: 24,
            }}
          >
            <h3 style={{ margin: 0, marginBottom: 16, fontSize: 17, fontWeight: 700, color: '#0f172a' }}>
              Order Summary
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
              {cartItems.map((item) => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#374151' }}>
                  <span>{item.name} × {item.qty}</span>
                  <span style={{ fontWeight: 600 }}>${(item.price * item.qty).toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 12, marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#6b7280', marginBottom: 6 }}>
                <span>Subtotal</span><span>${subtotal.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#6b7280', marginBottom: 6 }}>
                <span>Tax (8%)</span><span>${tax.toFixed(2)}</span>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 18,
                fontWeight: 800,
                color: '#0f172a',
                marginBottom: 20,
                paddingTop: 12,
                borderTop: '2px solid #0f172a',
              }}
            >
              <span>Total</span>
              <span style={{ color: '#7c3aed' }}>${total.toFixed(2)}</span>
            </div>

            <CTAButton onClick={() => setConfirmOpen(true)} size="large">
              Place Order — ${total.toFixed(2)}
            </CTAButton>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12, justifyContent: 'center' }}>
              <span style={{ fontSize: 12, color: '#94a3b8' }}>🔒 Secured by SSL</span>
            </div>
          </div>
        </div>
      </div>

      <Modal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Confirm Order"
        onConfirm={() => { setConfirmOpen(false); alert('Order placed!'); }}
        confirmLabel="Yes, place order"
      >
        <p>Are you sure you want to place this order for <strong>${total.toFixed(2)}</strong>?</p>
      </Modal>
    </div>
  );
};

export default CheckoutPage;
