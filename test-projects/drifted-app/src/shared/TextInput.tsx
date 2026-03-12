import React from 'react';

interface TextInputProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  disabled?: boolean;
  helperText?: string;
  variant?: string;
  size?: string;
}

// "Reusable" input built by a different team
const TextInput: React.FC<TextInputProps> = ({
  label, placeholder, value, onChange, type = 'text', disabled, helperText
}) => {
  return (
    <div style={{ width: '100%', marginBottom: 16 }}>
      {label && (
        <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {label}
        </div>
      )}
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        style={{
          display: 'block',
          width: '100%',
          padding: '10px 14px',
          fontSize: 15,
          color: '#1f2937',
          backgroundColor: disabled ? '#f3f4f6' : '#fff',
          border: '1px solid #9ca3af',
          borderRadius: 6,
          outline: 'none',
          boxSizing: 'border-box',
        }}
      />
      {helperText && (
        <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>{helperText}</div>
      )}
    </div>
  );
};

export default TextInput;
