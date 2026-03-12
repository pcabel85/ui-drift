import React, { useEffect } from 'react';
import CTAButton from '../checkout/CTAButton';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  onConfirm?: () => void;
  confirmLabel?: string;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  onConfirm,
  confirmLabel = 'Confirm',
}) => {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  const widths = { sm: 400, md: 560, lg: 760 };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 16,
          width: '100%',
          maxWidth: widths[size],
          boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 24px',
            borderBottom: '1px solid #f1f5f9',
          }}
        >
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a' }}>{title}</h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 20,
              color: '#94a3b8',
              padding: 4,
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ padding: '24px', color: '#334155', fontSize: 15, lineHeight: 1.6 }}>
          {children}
        </div>

        {onConfirm && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 12,
              padding: '16px 24px',
              borderTop: '1px solid #f1f5f9',
            }}
          >
            <button
              onClick={onClose}
              style={{
                padding: '8px 20px',
                background: '#f1f5f9',
                border: 'none',
                borderRadius: 8,
                color: '#475569',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: 14,
              }}
            >
              Cancel
            </button>
            <CTAButton onClick={onConfirm} size="small">{confirmLabel}</CTAButton>
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
