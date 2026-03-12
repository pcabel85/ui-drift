import React from 'react';
import { Card, CardContent, CardMedia, Typography, Button, Chip, Box } from '@mui/material';
import { ShoppingCart, Favorite } from '@mui/icons-material';

interface ProductCardProps {
  id: string;
  title: string;
  price: number;
  image: string;
  category: string;
  inStock: boolean;
  onAddToCart: (id: string) => void;
  onWishlist?: (id: string) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({
  id,
  title,
  price,
  image,
  category,
  inStock,
  onAddToCart,
  onWishlist,
}) => {
  return (
    <Card sx={{ maxWidth: 345, position: 'relative' }}>
      <CardMedia component="img" height="200" image={image} alt={title} />
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
          <Typography variant="h6" component="h2" noWrap>
            {title}
          </Typography>
          <Chip
            label={category}
            size="small"
            color="primary"
            variant="outlined"
          />
        </Box>
        <Typography variant="h5" color="primary" fontWeight={700} mb={2}>
          ${price.toFixed(2)}
        </Typography>
        <Box display="flex" gap={1}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<ShoppingCart />}
            onClick={() => onAddToCart(id)}
            disabled={!inStock}
            fullWidth
          >
            {inStock ? 'Add to Cart' : 'Out of Stock'}
          </Button>
          {onWishlist && (
            <Button
              variant="outlined"
              color="secondary"
              onClick={() => onWishlist(id)}
              aria-label="Add to wishlist"
            >
              <Favorite />
            </Button>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default ProductCard;
