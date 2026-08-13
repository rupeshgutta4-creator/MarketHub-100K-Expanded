'use strict';
const bcrypt = require('bcryptjs');
const { db, id, now } = require('./store');

let seeded = false;

function seedDemoData() {
  if (seeded) return;
  seeded = true;
  const hash = bcrypt.hashSync('password123', 8);

  const admin = { id: id(), email: 'admin@markethub.local', name: 'Platform Admin', role: 'admin', passwordHash: hash, createdAt: now() };
  const sellerUser = { id: id(), email: 'seller@markethub.local', name: 'Acme Seller', role: 'seller', passwordHash: hash, createdAt: now() };
  const buyer = { id: id(), email: 'buyer@markethub.local', name: 'Priya Buyer', role: 'buyer', passwordHash: hash, createdAt: now() };
  db.users.push(admin, sellerUser, buyer);

  const seller = {
    id: id(), userId: sellerUser.id, shopName: 'Acme Gadgets', slug: 'acme-gadgets',
    status: 'approved', commissionRate: 0.1, createdAt: now()
  };
  db.sellers.push(seller);

  db.categories.push(
    { id: id(), name: 'Electronics', slug: 'electronics' },
    { id: id(), name: 'Home', slug: 'home' },
    { id: id(), name: 'Fashion', slug: 'fashion' }
  );

  const electronics = db.categories.find(c => c.slug === 'electronics');
  db.products.push(
    {
      id: id(), sellerId: seller.id, categoryId: electronics.id,
      title: 'Wireless Earbuds Pro', slug: 'wireless-earbuds-pro',
      description: 'Noise-cancelling earbuds with 24h battery.',
      price: 2499, compareAt: 3499, stock: 120, status: 'active', createdAt: now()
    },
    {
      id: id(), sellerId: seller.id, categoryId: electronics.id,
      title: 'USB-C Hub 7-in-1', slug: 'usb-c-hub-7in1',
      description: 'HDMI, USB 3.0, SD card reader.',
      price: 1899, compareAt: 2299, stock: 80, status: 'active', createdAt: now()
    },
    {
      id: id(), sellerId: seller.id, categoryId: electronics.id,
      title: 'Smart LED Strip', slug: 'smart-led-strip',
      description: 'RGB app-controlled 5m strip.',
      price: 999, compareAt: 1499, stock: 200, status: 'active', createdAt: now()
    }
  );

  db.coupons.push({
    id: id(), code: 'WELCOME10', type: 'percent', value: 10, minOrder: 500, active: true, createdAt: now()
  });

  console.log(JSON.stringify({ ts: now(), level: 'info', msg: 'MarketHub demo data seeded', products: db.products.length }));
}

module.exports = { seedDemoData };
