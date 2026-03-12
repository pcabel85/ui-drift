import React from 'react';
import PrimaryButton from '../../shared/PrimaryButton';

interface ProductCardProps {
  title: string;
  price: number;
  image: string;
  category: string;
  inStock: boolean;
  onAddToCart: () => void;
}

// Built for product grid - uses its own layout styles
const ProductCard: React.FC<ProductCardProps> = ({
  title, price, image, category, inStock, onAddToCart
}) => {
  return (
    <div
      style={{
        backgroundColor: '#fff',
        borderRadius: 12,
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <img src={image} alt={title} style={{ width: '100%', height: 200, objectFit: 'cover' }} />
      <div style={{ padding: 16, flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span
          style={{
            display: 'inline-block',
            fontSize: 11,
            fontWeight: 600,
            color: '#6366f1',
            backgroundColor: '#eef2ff',
            padding: '2px 8px',
            borderRadius: 999,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          {category}
        </span>
        <h4 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#0f172a' }}>{title}</h4>
        <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 20, fontWeight: 700, color: '#2563eb' }}>
            ${price.toFixed(2)}
          </span>
          <PrimaryButton onClick={onAddToCart} disabled={!inStock}>
            {inStock ? 'Add to Cart' : 'Sold Out'}
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
