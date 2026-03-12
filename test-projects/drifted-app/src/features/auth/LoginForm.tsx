import React, { useState } from 'react';
import Input from '../../components/Input';
import Button from '../../components/Button';

interface LoginFormProps {
  onLogin: (email: string, password: string) => Promise<void>;
  onForgotPassword: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onLogin, onForgotPassword }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await onLogin(email, password);
    } catch {
      setError('Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        maxWidth: 400,
        margin: '80px auto',
        padding: 40,
        backgroundColor: '#ffffff',
        borderRadius: 16,
        boxShadow: '0 4px 24px rgba(0,0,0,0.1)',
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div
          style={{
            width: 48,
            height: 48,
            backgroundColor: '#4f46e5',
            borderRadius: 12,
            margin: '0 auto 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span style={{ color: '#fff', fontSize: 24 }}>⚡</span>
        </div>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#111827' }}>
          Welcome back
        </h2>
        <p style={{ margin: '8px 0 0', color: '#6b7280', fontSize: 14 }}>
          Sign in to your account
        </p>
      </div>

      {error && (
        <div
          style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 8,
            padding: '10px 14px',
            color: '#dc2626',
            fontSize: 14,
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      )}

      <Input
        label="Email address"
        type="email"
        value={email}
        onChange={setEmail}
        placeholder="you@example.com"
        required
      />

      <div style={{ marginTop: 16 }}>
        <Input
          label="Password"
          type="password"
          value={password}
          onChange={setPassword}
          placeholder="••••••••"
          required
        />
      </div>

      <div style={{ textAlign: 'right', marginTop: 8, marginBottom: 20 }}>
        <button
          onClick={onForgotPassword}
          style={{ background: 'none', border: 'none', color: '#4f46e5', fontSize: 13, cursor: 'pointer', fontWeight: 500 }}
        >
          Forgot password?
        </button>
      </div>

      <Button
        onClick={handleSubmit}
        disabled={loading}
        variant="primary"
        size="lg"
      >
        {loading ? 'Signing in...' : 'Sign in'}
      </Button>

      <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: '#9ca3af' }}>
        Don't have an account?{' '}
        <a href="/signup" style={{ color: '#4f46e5', fontWeight: 600, textDecoration: 'none' }}>
          Sign up free
        </a>
      </p>
    </div>
  );
};

export default LoginForm;
