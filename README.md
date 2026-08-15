# Athiva Designs

Athiva Designs is a simple storefront with:

- A static frontend in HTML/CSS/JS
- An Express API for auth, products, wishlist, profile, and orders
- PostgreSQL for users, products, wishlist, and orders

## What changed for Vercel

- The backend now lives in `app.js`
- `server.js` still runs the app locally
- `api/[...path].js` exposes the same app as a Vercel catch-all serverless function
- Frontend scripts now use the current origin in production and localhost during local development

## Run Locally

### 1. Install dependencies

```bash
npm install
```

### 2. Create the database

If you already have PostgreSQL installed, create the database:

```bash
createdb athiva_db
```

Then load the schema:

```bash
psql -d athiva_db -f schema.sql
```

### 3. Configure environment variables

Copy `.env.example` to `.env` and update the values if needed.

Important variables:

- `PGUSER`
- `PGPASSWORD`
- `PGHOST`
- `PGDATABASE`
- `PGPORT`
- `JWT_SECRET`
- `DATABASE_URL` for hosted databases
- `ADMIN_USERNAME` and `ADMIN_PASSWORD` for the fallback admin login

### 4. Start the backend

```bash
npm start
```

The API will run on `http://localhost:4000`.

### 5. Open the frontend

Open `index.html` in a browser, or better, serve the folder so fetch requests work cleanly:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## Verify Admin Login

The default admin credentials are:

- Username: `Athiva_designs`
- Password: `Athiva_17042003`

To test it:

1. Start the backend and make sure the database has been initialized with `schema.sql`.
2. Open `admin-login.html`.
3. Log in with `Athiva_designs / Athiva_17042003`.
4. If login succeeds, you should be redirected to `admin-dashboard.html`.

If it fails, the most common causes are:

- `schema.sql` was not loaded into the database
- The app is pointing at the wrong database in `.env`

## Product Images

The storefront reads whatever is stored in the `products.image` column.

The admin dashboard now lets you:

1. Pick a picture directly from your gallery when adding a product.
2. Replace the picture later from the edit modal.
3. Keep using existing `/images/...` paths if they are already in the database.

The selected image is stored with the product and displayed automatically on the home page.

## Deploy to Vercel

Vercel can host:

- The frontend
- The serverless API

Vercel does not host PostgreSQL itself, so the database must live on a separate provider.

### Step 1: Push this repo to GitHub

1. Create a new GitHub repository.
2. Push this project there.

### Step 2: Create a hosted PostgreSQL database

Use one of these:

- Neon
- Supabase
- Railway Postgres
- A managed PostgreSQL service from your cloud provider

You will need the database connection string.

### Step 3: Initialize the hosted database

Run `schema.sql` against the hosted database.

You can do this with:

- the provider’s SQL editor
- `psql`
- a database migration tool

The schema creates:

- `users`
- `products`
- `wishlist`
- `orders`
- `order_items`

### Step 4: Add environment variables in Vercel

In your Vercel project settings, add:

- `DATABASE_URL` = your hosted PostgreSQL connection string
- `JWT_SECRET` = a long random secret

Optional:

- `PGSSLMODE=require`

### Step 5: Import the repo into Vercel

1. In Vercel, click **Add New Project**.
2. Import the GitHub repo.
3. Keep the defaults.
4. Deploy.

### Step 6: Check the deployment

Open the deployed site and test:

- `https://your-site.vercel.app/index.html`
- `https://your-site.vercel.app/admin-login.html`
- `https://your-site.vercel.app/api/health`

### Step 7: Test admin login in production

Use:

- Username: `Athiva_designs`
- Password: `Athiva_17042003`

If you changed the seed data, use the new credentials.

## How to Deploy the Database

The database is not deployed on Vercel.

You deploy it separately by:

1. Creating a hosted PostgreSQL database
2. Running `schema.sql` on that database
3. Copying the database connection string into Vercel as `DATABASE_URL`

That is the standard setup for Vercel + PostgreSQL.

## Useful Files

- [Backend app](/Users/chihnithabobbala/Athiva_Designs/app.js)
- [Local server entry](/Users/chihnithabobbala/Athiva_Designs/server.js)
- [Vercel function](/Users/chihnithabobbala/Athiva_Designs/api/[...path].js)
- [Database schema](/Users/chihnithabobbala/Athiva_Designs/schema.sql)
