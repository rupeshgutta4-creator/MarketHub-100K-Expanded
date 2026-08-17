import React, { useEffect, useState } from 'react';
import { api, setSession, clearSession, getUser } from './services/api.js';

export default function App() {
  const [user, setUser] = useState(getUser());
  const [view, setView] = useState('shop');
  const [email, setEmail] = useState('buyer@markethub.local');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState(null);
  const [orders, setOrders] = useState([]);
  const [dash, setDash] = useState(null);
  const [q, setQ] = useState('');
  const [form, setForm] = useState({});

  async function login(e) {
    e.preventDefault();
    setError('');
    try {
      const data = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
      setSession(data.token, data.user);
      setUser(data.user);
      setView(data.user.role === 'admin' ? 'admin' : data.user.role === 'seller' ? 'seller' : 'shop');
    } catch (err) { setError(err.message); }
  }

  function logout() {
    clearSession();
    setUser(null);
  }

  async function loadProducts() {
    const res = await api('/catalog/products' + (q ? `?q=${encodeURIComponent(q)}` : ''));
    setProducts(res.data || []);
  }

  async function loadCart() {
    if (!user) return;
    try { setCart(await api('/cart')); } catch { setCart(null); }
  }

  async function loadOrders() {
    setOrders((await api('/orders')).data || []);
  }

  async function loadDash() {
    if (user?.role === 'admin') setDash(await api('/admin/dashboard'));
  }

  useEffect(() => {
    if (!user) return;
    if (view === 'shop') loadProducts();
    if (view === 'cart') loadCart();
    if (view === 'orders') loadOrders();
    if (view === 'admin') loadDash();
    if (view === 'seller') loadProducts();
  }, [user, view]);

  async function addToCart(productId) {
    await api('/cart/items', { method: 'POST', body: JSON.stringify({ productId, quantity: 1 }) });
    setView('cart');
    loadCart();
  }

  async function checkout() {
    await api('/orders', { method: 'POST', body: JSON.stringify({ coupon: form.coupon || undefined, address: form.address || 'Demo address' }) });
    setView('orders');
    loadOrders();
  }

  async function createProduct(e) {
    e.preventDefault();
    await api('/catalog/products', {
      method: 'POST',
      body: JSON.stringify({
        title: form.title,
        price: Number(form.price),
        stock: Number(form.stock) || 10,
        description: form.description || ''
      })
    });
    setForm({});
    loadProducts();
  }

  if (!user) {
    return (
      <div className="login-wrap">
        <form className="login-card" onSubmit={login}>
          <h1><span style={{ color: 'var(--accent)' }}>◈</span> MarketHub</h1>
          <p className="muted">Multi-vendor marketplace</p>
          <div className="row" style={{ flexDirection: 'column', marginTop: 18 }}>
            <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" />
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" />
            <button className="primary" type="submit">Sign in</button>
          </div>
          {error && <p className="error">{error}</p>}
          <p className="muted" style={{ marginTop: 14 }}>
            buyer@markethub.local · seller@markethub.local · admin@markethub.local<br />password123
          </p>
        </form>
      </div>
    );
  }

  const nav = [
    { id: 'shop', label: 'Shop', roles: ['buyer', 'admin', 'seller'] },
    { id: 'cart', label: 'Cart', roles: ['buyer', 'admin'] },
    { id: 'orders', label: 'Orders', roles: ['buyer', 'seller', 'admin'] },
    { id: 'seller', label: 'Seller desk', roles: ['seller', 'admin'] },
    { id: 'admin', label: 'Admin', roles: ['admin'] }
  ].filter(n => n.roles.includes(user.role));

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand"><span>◈</span> MarketHub</div>
        <p className="muted" style={{ marginTop: 6 }}>{user.name} · {user.role}</p>
        <nav className="nav">
          {nav.map(n => (
            <button key={n.id} className={view === n.id ? 'active' : ''} onClick={() => setView(n.id)}>{n.label}</button>
          ))}
          <button onClick={logout}>Sign out</button>
        </nav>
      </aside>
      <main className="main">
        <div className="top">
          <div>
            <h1>{nav.find(n => n.id === view)?.label || 'MarketHub'}</h1>
            <p className="muted">Buy · Sell · Manage</p>
          </div>
          {view === 'shop' && (
            <div className="row">
              <input placeholder="Search products" value={q} onChange={e => setQ(e.target.value)} />
              <button className="ghost" type="button" onClick={loadProducts}>Search</button>
            </div>
          )}
        </div>

        {view === 'shop' && (
          <div className="grid">
            {products.map(p => (
              <div className="card" key={p.id}>
                <h3>{p.title}</h3>
                <p className="muted" style={{ minHeight: 36 }}>{(p.description || '').slice(0, 80)}</p>
                <div>
                  <span className="price">₹{p.price}</span>
                  {p.compareAt ? <span className="compare">₹{p.compareAt}</span> : null}
                </div>
                <p className="muted">Stock: {p.stock}</p>
                {(user.role === 'buyer' || user.role === 'admin') && (
                  <button className="primary" style={{ marginTop: 8 }} onClick={() => addToCart(p.id)}>Add to cart</button>
                )}
              </div>
            ))}
          </div>
        )}

        {view === 'cart' && (
          <div className="panel">
            <h2 style={{ marginTop: 0 }}>Cart</h2>
            {!cart?.items?.length && <p className="muted">Cart is empty</p>}
            {cart?.items?.length > 0 && (
              <>
                <table>
                  <thead><tr><th>Product</th><th>Qty</th><th>Line</th></tr></thead>
                  <tbody>
                    {cart.items.map(i => (
                      <tr key={i.productId}>
                        <td>{i.product?.title || i.productId}</td>
                        <td>{i.quantity}</td>
                        <td>₹{i.lineTotal}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p><strong>Subtotal: ₹{cart.subtotal}</strong></p>
                <div className="row">
                  <input placeholder="Coupon e.g. WELCOME10" value={form.coupon || ''} onChange={e => setForm({ ...form, coupon: e.target.value })} />
                  <input placeholder="Shipping address" value={form.address || ''} onChange={e => setForm({ ...form, address: e.target.value })} />
                  <button className="primary" onClick={checkout}>Checkout</button>
                </div>
              </>
            )}
          </div>
        )}

        {view === 'orders' && (
          <div className="panel">
            <h2 style={{ marginTop: 0 }}>Orders</h2>
            <table>
              <thead><tr><th>Number</th><th>Total</th><th>Status</th><th>Payment</th><th>When</th></tr></thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o.id}>
                    <td>{o.number}</td>
                    <td>₹{o.total}</td>
                    <td><span className="badge">{o.status}</span></td>
                    <td>{o.paymentStatus}</td>
                    <td>{(o.createdAt || '').slice(0, 19)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {view === 'seller' && (
          <div className="panel">
            <h2 style={{ marginTop: 0 }}>Seller desk</h2>
            <form className="row" onSubmit={createProduct}>
              <input placeholder="Title" value={form.title || ''} onChange={e => setForm({ ...form, title: e.target.value })} required />
              <input placeholder="Price" type="number" value={form.price || ''} onChange={e => setForm({ ...form, price: e.target.value })} required />
              <input placeholder="Stock" type="number" value={form.stock || ''} onChange={e => setForm({ ...form, stock: e.target.value })} />
              <button className="primary" type="submit">Add product</button>
            </form>
            <table>
              <thead><tr><th>Title</th><th>Price</th><th>Stock</th><th>Status</th></tr></thead>
              <tbody>
                {products.map(p => (
                  <tr key={p.id}><td>{p.title}</td><td>₹{p.price}</td><td>{p.stock}</td><td>{p.status}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {view === 'admin' && (
          <>
            <div className="stat-grid">
              <div className="stat"><div className="l">Users</div><div className="v">{dash?.users ?? '—'}</div></div>
              <div className="stat"><div className="l">Sellers</div><div className="v">{dash?.sellers ?? '—'}</div></div>
              <div className="stat"><div className="l">Products</div><div className="v">{dash?.products ?? '—'}</div></div>
              <div className="stat"><div className="l">GMV</div><div className="v">₹{dash?.gmv ?? '—'}</div></div>
            </div>
            <div className="panel">
              <p className="muted">Orders: {dash?.orders ?? 0} · Pending sellers: {dash?.pendingSellers ?? 0} · Active products: {dash?.activeProducts ?? 0}</p>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
