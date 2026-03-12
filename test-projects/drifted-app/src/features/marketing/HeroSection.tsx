import React from 'react';
import ActionButton from './ActionButton';

const HeroSection: React.FC = () => {
  return (
    <section
      style={{
        background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%)',
        padding: '96px 24px',
        textAlign: 'center',
        minHeight: 560,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24,
      }}
    >
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          backgroundColor: 'rgba(255,255,255,0.1)',
          border: '1px solid rgba(255,255,255,0.2)',
          padding: '6px 16px',
          borderRadius: 9999,
          fontSize: 13,
          color: '#c4b5fd',
          fontWeight: 600,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          marginBottom: 8,
        }}
      >
        ✨ Now in Beta
      </div>

      <h1
        style={{
          fontSize: 64,
          fontWeight: 900,
          color: '#ffffff',
          lineHeight: 1.1,
          margin: 0,
          maxWidth: 800,
          letterSpacing: '-0.02em',
        }}
      >
        Ship faster with{' '}
        <span style={{ color: '#a78bfa' }}>confidence</span>
      </h1>

      <p
        style={{
          fontSize: 20,
          color: '#c4b5fd',
          lineHeight: 1.6,
          maxWidth: 560,
          margin: 0,
        }}
      >
        The all-in-one platform for modern development teams. Automate, collaborate, and
        scale without the overhead.
      </p>

      <div style={{ display: 'flex', gap: 16, marginTop: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
        <ActionButton size="large" color="#7c3aed">
          Get started free
        </ActionButton>
        <button
          style={{
            padding: '14px 28px',
            backgroundColor: 'transparent',
            color: '#e2e8f0',
            border: '2px solid rgba(255,255,255,0.3)',
            borderRadius: 6,
            fontSize: 16,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          See a demo
        </button>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 32,
          marginTop: 48,
          color: '#94a3b8',
          fontSize: 13,
        }}
      >
        {['No credit card required', 'Cancel anytime', '14-day free trial'].map((text) => (
          <span key={text} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: '#22c55e', fontWeight: 700 }}>✓</span> {text}
          </span>
        ))}
      </div>
    </section>
  );
};

export default HeroSection;
