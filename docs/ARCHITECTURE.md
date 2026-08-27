# MarketHub Architecture

## Roles
- **buyer** — browse, cart, checkout, orders, reviews
- **seller** — products, order fulfillment
- **admin** — sellers, catalog moderation, dashboard, audit

## API surface
- `/api/auth` — login, register, me
- `/api/catalog` — categories, products CRUD
- `/api/cart` — cart items
- `/api/orders` — place order, list, status
- `/api/sellers` — seller profile, approval
- `/api/reviews` — product reviews
- `/api/admin` — dashboard, audit

## Data (MVP)
In-memory store. Production: PostgreSQL for users, sellers, products, orders, reviews.

## Future
- Stripe/Razorpay payments
- Search service
- Image uploads
- Multi-warehouse inventory
- Settlement & payouts

## Verification Standards
- Automated test coverage exercises order state machine transitions and domain parameter models.
- Monorepo follows non-fast-forward feature branch merges for auditing subsystem provenance.
- Clean environment configuration with zero committed secrets.
