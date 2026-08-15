-- Schema for Athiva Designs
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  price INTEGER NOT NULL,
  image TEXT,
  category TEXT,
  quantity INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS wishlist (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, product_id)
);

CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  total INTEGER NOT NULL,
  address TEXT,
  phone TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL,
  price INTEGER NOT NULL
);

-- Sample products with stock
INSERT INTO products(name,price,image,category,quantity) VALUES
('Mehendi Green Georgette saree',1500,'/images/p1.png','Georgette',5),
('Banarasi Silk - Maroon',6890,'/images/p2.png','Banarasi',8),
('Kanjivaram - Royal Blue',9990,'/images/p3.png','Kanjivaram',3),
('Chiffon Printed - Floral',2490,'/images/p4.png','Chiffon',12),
('Tussar Silk - Mustard',4590,'/images/p5.png','Tussar',0),
('Kanchipattu Antique Green',7790,'/images/p6.png','Kanchipattu',2),
('Georgette Party Wear',2890,'/images/p7.png','Georgette',6),
('Katan Bridal Red',12500,'/images/p8.png','Katan',1),
('Raw Mango Pattu Beige',8990,'/images/p9.png','Raw Mango Pattu',4),
('Silk Cotton - Ivory',3290,'/images/p10.png','Silk Cotton',7)
ON CONFLICT DO NOTHING;

-- Sample user (username: demo, password: demo123)
INSERT INTO users(username,password_hash) VALUES
('demo','$2b$10$61EOboTN4MnidNJE1hSojeRGaXYR0cm61vu.rE1w4Lt9PVDNCfSoe')
ON CONFLICT DO NOTHING;
