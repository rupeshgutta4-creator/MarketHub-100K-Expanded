# MarketHub

**Multi-vendor marketplace platform** — proprietary software.

Buyers shop, sellers manage catalog & orders, admins moderate and view analytics.

## Install

```bash
cp env.example .env
npm install
```

## Run

```bash
npm run dev:api   # http://localhost:4100
npm run dev:web   # http://localhost:5173
```

## Demo accounts

| Email | Password | Role |
|-------|----------|------|
| admin@markethub.local | password123 | admin |
| seller@markethub.local | password123 | seller |
| buyer@markethub.local | password123 | buyer |

## Tests

```bash
npm test
```

## Structure

```
markethub/
├── apps/web           React storefront + seller/admin UI
├── services/api       Express REST API
├── packages/shared    Roles, order statuses, helpers
├── tests/unit
└── docker-compose.yml
```

## License

Proprietary. All rights reserved.


## Enterprise expansion

This distribution includes an expanded parameterized domain layer under `packages/`:

- **57 business domains**
- **614 registered domain parameters**
- Domain repositories with create/read/update/delete, filtering, search, sorting and pagination
- Parameter normalization and validation
- Field-level accessors and parameter policies
- REST request/response contract helpers
- Generated parameter registry documentation
- Jest coverage for all domain modules
- Existing React storefront and Express API preserved

The generated domain layer is designed to be connected to PostgreSQL, MySQL, MongoDB, or another persistence adapter without changing the public parameter contracts.

### Parameter registry

See `packages/domain-modules/PARAMETERS.md` for the complete parameter list.

### Validation

```bash
npm test
```

### Run

```bash
npm run dev
```
