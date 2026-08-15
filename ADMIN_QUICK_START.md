# Admin Panel Quick Start

## Access Admin Portal
```
http://localhost:8000/admin-login.html
```

## Default Login Credentials
- **Username:** `Athiva_designs`
- **Password:** `Athiva_17042003`

## Admin Actions

### Add a New Saree
1. Login to admin dashboard
2. Fill the form:
   - **Name:** "Katan Bridal Red" (required)
   - **Price:** 12500 (required)
   - **Quantity:** 5 (required - number of units in stock)
   - **Category:** Select from dropdown (required)
   - **Product Image:** Choose a file from your gallery
3. Click "Add Saree to Catalog"
4. Product appears instantly in table and customer store

### Check Inventory
- **In Stock:** Shows green badge "✓ In Stock (X)" where X is quantity
- **Out of Stock:** Shows red badge "✗ Out of Stock" when quantity = 0

### Remove a Product
1. Find product in the table
2. Click "Delete" button
3. Confirm deletion in popup
4. Product removed from catalog

### Edit a Product (Coming Soon)
- Click "Edit" button on any product
- Modify details and save
- Changes reflected immediately

## Stock Display on Customer Store

### Product Cards
- Out of stock items show faded image + "Out of Stock" text
- "Add to Cart" button disabled for out of stock
- In stock items show quantity: "✓ In Stock (5)"

### Product Detail Modal
- Full stock status displayed
- "Add to Cart" disabled if out of stock
- Customers cannot order unavailable items

## Backend Routes (Admin Only)

All require: `Authorization: Bearer <admin_token>`

```
POST   /api/admin/login            → Login, get token
POST   /api/products               → Add new product
PUT    /api/products/:id           → Update product
DELETE /api/products/:id           → Remove product
GET    /api/products               → Fetch all products (public)
```

## Database Field Mapping

When adding a product, these fields map to the `products` table:
- Form "Saree Name" → `products.name`
- Form "Price (₹)" → `products.price`
- Form "Quantity in Stock" → `products.quantity`
- Form "Category" → `products.category`
- Form "Product Image" → `products.image`

## Common Issues

| Issue | Solution |
|-------|----------|
| Login fails | Check username/password; default is Athiva_designs/Athiva_17042003 |
| Can't add product | Ensure all required fields filled; check backend running |
| Product not showing on store | Refresh browser; verify backend returned it |
| "Out of Stock" showing incorrectly | Set quantity to 0 for out of stock; >0 for in stock |
| Delete button doesn't work | Admin token may have expired; re-login |

## API Response Examples

### Add Product
```json
POST /api/products
{
  "name": "Banarasi Silk - Maroon",
  "price": 6890,
  "quantity": 8,
  "category": "Banarasi",
  "image": "https://example.com/saree.jpg"
}

Response:
{
  "id": 28,
  "name": "Banarasi Silk - Maroon",
  "price": 6890,
  "category": "Banarasi",
  "image": "https://example.com/saree.jpg",
  "quantity": 8,
  "created_at": "2026-07-20T10:30:00.000Z"
}
```

### Get Products (includes quantity)
```json
GET /api/products

Response:
[
  {
    "id": 1,
    "name": "Banarasi Silk - Maroon",
    "price": 6890,
    "category": "Banarasi",
    "image": "...",
    "quantity": 8
  },
  ...
]
```

## Security Reminders

✓ Admin password hashed with bcrypt  
✓ Admin token expires in 7 days  
✓ Only users with `role: admin` can manage products  
✓ Customer tokens cannot access admin endpoints  
✓ All passwords must be >6 characters  

## Next Steps

1. Test adding a product via admin panel
2. Verify it appears on homepage with stock status
3. Try ordering when in stock
4. Try with 0 quantity (button should disable)
5. Implement edit functionality
6. Add bulk product import feature
