# Admin System Setup & Usage Guide

## Overview
The admin panel allows administrators to manage the product catalog, including adding new sarees, editing details, and tracking inventory with real-time stock quantities.

---

## Admin Features

### 1. **Admin Login** (`admin-login.html`)
- Dedicated admin authentication page
- Separate login from customer accounts
- Default credentials:
  - **Username:** `Athiva_designs`
  - **Password:** `Athiva_17042003`

**Why env-based admin login?**
- Admin credentials live in `.env` so the login does not depend on database permissions
- Admin tokens still have a `role: 'admin'` claim in JWT for authorization
- Only admins can access product management endpoints

---

### 2. **Admin Dashboard** (`admin-dashboard.html`)
The central hub for inventory management with:

#### A. Add New Saree Form
Fields include:
- **Saree Name** - Product name (required)
- **Price (₹)** - Selling price in rupees (required)
- **Quantity in Stock** - Current inventory count (required, default 0)
- **Category** - Predefined categories:
  - Banarasi, Kanjivaram, Chiffon, Tussar, Kanchipattu, Georgette, Katan, Raw Mango Pattu, Paithani
- **Product Image** - Choose a file from your gallery and it will be stored with the product

#### B. Product Inventory Table
Displays all products with:
- Product ID and Name
- Category and Price
- Current Stock Quantity
- Stock Status badge (In Stock / Out of Stock)
- Edit and Delete action buttons

---

## Database Schema Changes

### Modified Tables
1. **`products`** table - Added fields:
   ```sql
   ALTER TABLE products 
   ADD COLUMN quantity INTEGER DEFAULT 0,
   ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
   ```

---

## Backend API Endpoints

### Admin Authentication
- **`POST /api/admin/login`**
  - Request: `{ username, password }`
  - Response: `{ token, admin }`
  - Returns JWT token with `role: 'admin'`

### Product Management (Admin Only)
All endpoints require `Authorization: Bearer <admin_token>` header

- **`POST /api/products`** - Add new product
  - Request: `{ name, price, quantity, category, image }`
  - Response: Created product object

- **`PUT /api/products/:id`** - Update product
  - Request: `{ name, price, quantity, category, image }`
  - Response: Updated product object

- **`DELETE /api/products/:id`** - Remove product
  - Response: `{ success: true, id }`

### Public Endpoints
- **`GET /api/products`** - Fetch all products (includes quantity)
  - No auth required
  - Response: Product array with quantity field

---

## Frontend Changes

### Product Display
1. **Product Cards** (`index.html`)
   - Show stock status: "✓ In Stock (X)" or "Out of Stock"
   - Disable "Add to Cart" button if quantity = 0
   - Reduce image opacity for out-of-stock items

2. **Product Detail Modal**
   - Display availability with quantity count
   - Show "Out of Stock" in red if unavailable
   - Disable "Add to Cart" and "Buy Now" buttons

### Stock Status UI
- **In Stock:** Green badge "✓ In Stock"
- **Out of Stock:** Red badge "✗ Out of Stock"

---

## Workflow: Adding a New Product

1. **Access Admin Portal**
   - Open the home page admin login card or navigate to `admin-login.html`
   - Login with admin credentials from `.env`

2. **Fill Product Form**
   - Enter saree name, price, category
   - Set initial quantity (number of units available)
   - Choose an image file from your gallery

3. **Submit Form**
   - Click "Add Saree to Catalog"
   - Success alert confirms addition

4. **View in Catalog**
   - Product appears in inventory table
   - Immediately visible in customer store
   - Stock quantity tracked

5. **Manage Inventory**
   - Click "Edit" to update details/quantity
   - Click "Delete" to remove product
   - Stock badge updates automatically

---

## Better Approaches & Design Rationale

### Why Env-Based Admin Login?
- **Security:** Different authentication scope; admin tokens cannot be used for customer purchases
- **Reliability:** Admin login does not depend on database permissions
- **Scalability:** Multiple roles (moderator, viewer) are still possible without mixing concerns

### Why Quantity Field?
- **Stock Tracking:** Essential for e-commerce; prevents overselling
- **User Feedback:** Customers see availability before adding to cart
- **Business Logic:** Can implement backorder or reservation systems later

### Why Stock Status on Frontend?
- **UX:** Users immediately know if item is available
- **Conversion:** Prevents customers adding out-of-stock items to cart
- **Trust:** Transparent inventory builds confidence

### Alternative Approaches Considered
1. **Soft Delete Instead of Hard Delete**
   - Store deleted date instead of removing records
   - Allows order fulfillment for deleted products
   - Better for auditing
   - Could add `deleted_at` timestamp field

2. **Inventory History Tracking**
   - Log stock changes (admin_id, product_id, quantity_changed, reason, timestamp)
   - Track which admin modified stock
   - Useful for large operations

3. **Reservation/Cart Lock**
   - Reserve items when added to cart (decrease available count)
   - Release if order abandoned
   - Prevents overselling even with concurrent purchases

4. **SKU & Variants**
   - Add `sku` field (Stock Keeping Unit) for product tracking
   - Support size/color variants with separate quantities
   - Real-world saree stores often have many variants

---

## Testing the Admin Panel

### Steps to Test
1. Start backend: `npm start` (port 4000)
2. Start frontend: `python3 -m http.server 8000`
3. Navigate to `http://localhost:8000/admin-login.html`
4. Login with `Athiva_designs` / `Athiva_17042003`
5. Add a test product and verify:
   - It appears in the table
   - Appears on homepage with correct stock status
   - "Add to Cart" button works if in stock
   - "Add to Cart" button disabled if out of stock

---

## Security Notes

- Admin token stored in localStorage as `admin_token`
- JWT verified server-side; token expires in 7 days
- Password hashed with bcrypt (10 rounds)
- Admin middleware checks for `role: 'admin'` claim
- Unauthenticated requests return 401; unauthorized admins return 403

---

## Files Modified/Created

### New Files
- `admin-login.html` - Admin login page
- `admin-login.js` - Admin auth logic
- `admin-dashboard.html` - Admin product management UI
- `admin-dashboard.js` - Dashboard logic

### Modified Files
- `schema.sql` - Added quantity/created_at to products and seeded sample products/users
- `server.js` - Added admin auth, product CRUD endpoints
- `script.js` - Stock status display on product cards and modal
- `index.html` - Product detail modal now includes stock section

---

## Future Enhancements

1. **Edit Product Modal** - Inline editing instead of just delete
2. **Bulk Upload** - CSV import for multiple products
3. **Stock Alerts** - Notify admin when quantity falls below threshold
4. **Order Fulfillment** - Mark orders as shipped/delivered
5. **Sales Dashboard** - Revenue, top sellers, trending items
6. **Coupon Management** - Create and apply discount codes
7. **Category Management** - Add/edit categories dynamically
8. **Image Upload** - File upload instead of URL only

---

## Troubleshooting

### "Admin access required" error
- Verify you're using `admin_token`, not regular `token`
- Check token hasn't expired (7 days)
- Clear localStorage and re-login

### Product doesn't appear after adding
- Check browser console for API errors
- Verify backend is running on port 4000
- Check admin token is valid

### Out of Stock button still enabled
- Frontend queries `quantity` field from API
- Ensure database schema applied correctly
- Refresh page to reload product data
