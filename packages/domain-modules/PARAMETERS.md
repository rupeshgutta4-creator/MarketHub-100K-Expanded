# MarketHub Enterprise Parameter Registry

- Domains: 57
- Parameters: 614

## users

| Parameter | Type | Required | Nullable |
|---|---|---|---|
| `id` | `string` | `yes` | `no` |
| `email` | `string` | `yes` | `no` |
| `passwordHash` | `string` | `yes` | `no` |
| `firstName` | `string` | `no` | `yes` |
| `lastName` | `string` | `no` | `yes` |
| `phone` | `string` | `no` | `yes` |
| `role` | `string` | `no` | `yes` |
| `status` | `string` | `no` | `yes` |
| `avatarUrl` | `string` | `no` | `yes` |
| `lastLoginAt` | `string` | `no` | `yes` |
| `createdAt` | `string` | `no` | `yes` |
| `updatedAt` | `string` | `no` | `yes` |
## sellers

| Parameter | Type | Required | Nullable |
|---|---|---|---|
| `id` | `string` | `yes` | `no` |
| `userId` | `string` | `yes` | `no` |
| `shopName` | `string` | `yes` | `no` |
| `legalName` | `string` | `no` | `yes` |
| `taxId` | `string` | `no` | `yes` |
| `email` | `string` | `no` | `yes` |
| `phone` | `string` | `no` | `yes` |
| `status` | `string` | `no` | `yes` |
| `rating` | `number` | `no` | `yes` |
| `commissionRate` | `number` | `no` | `yes` |
| `bankAccount` | `object` | `no` | `yes` |
| `payoutSchedule` | `string` | `no` | `yes` |
| `createdAt` | `string` | `no` | `yes` |
| `updatedAt` | `string` | `no` | `yes` |
## products

| Parameter | Type | Required | Nullable |
|---|---|---|---|
| `id` | `string` | `yes` | `no` |
| `sellerId` | `string` | `yes` | `no` |
| `categoryId` | `string` | `yes` | `no` |
| `sku` | `string` | `no` | `yes` |
| `title` | `string` | `no` | `yes` |
| `slug` | `string` | `no` | `yes` |
| `description` | `string` | `no` | `yes` |
| `brand` | `string` | `no` | `yes` |
| `price` | `number` | `no` | `yes` |
| `compareAt` | `number` | `no` | `yes` |
| `costPrice` | `number` | `no` | `yes` |
| `currency` | `string` | `no` | `yes` |
| `stock` | `number` | `no` | `yes` |
| `reservedStock` | `number` | `no` | `yes` |
| `lowStockThreshold` | `number` | `no` | `yes` |
| `weight` | `number` | `no` | `yes` |
| `status` | `string` | `no` | `yes` |
| `condition` | `string` | `no` | `yes` |
| `visibility` | `string` | `no` | `yes` |
| `taxClass` | `string` | `no` | `yes` |
| `createdAt` | `string` | `no` | `yes` |
| `updatedAt` | `string` | `no` | `yes` |
## categories

| Parameter | Type | Required | Nullable |
|---|---|---|---|
| `id` | `string` | `yes` | `no` |
| `parentId` | `string` | `yes` | `no` |
| `name` | `string` | `yes` | `no` |
| `slug` | `string` | `no` | `yes` |
| `description` | `string` | `no` | `yes` |
| `imageUrl` | `string` | `no` | `yes` |
| `position` | `number` | `no` | `yes` |
| `status` | `string` | `no` | `yes` |
| `seoTitle` | `string` | `no` | `yes` |
| `seoDescription` | `string` | `no` | `yes` |
| `createdAt` | `string` | `no` | `yes` |
| `updatedAt` | `string` | `no` | `yes` |
## productVariants

| Parameter | Type | Required | Nullable |
|---|---|---|---|
| `id` | `string` | `yes` | `no` |
| `productId` | `string` | `yes` | `no` |
| `sku` | `string` | `yes` | `no` |
| `name` | `string` | `no` | `yes` |
| `optionValues` | `array` | `no` | `yes` |
| `price` | `number` | `no` | `yes` |
| `compareAt` | `number` | `no` | `yes` |
| `costPrice` | `number` | `no` | `yes` |
| `stock` | `number` | `no` | `yes` |
| `weight` | `number` | `no` | `yes` |
| `barcode` | `string` | `no` | `yes` |
| `imageUrl` | `string` | `no` | `yes` |
| `status` | `string` | `no` | `yes` |
| `createdAt` | `string` | `no` | `yes` |
| `updatedAt` | `string` | `no` | `yes` |
## productImages

| Parameter | Type | Required | Nullable |
|---|---|---|---|
| `id` | `string` | `yes` | `no` |
| `productId` | `string` | `yes` | `no` |
| `variantId` | `string` | `yes` | `no` |
| `url` | `string` | `no` | `yes` |
| `altText` | `string` | `no` | `yes` |
| `position` | `number` | `no` | `yes` |
| `width` | `string` | `no` | `yes` |
| `height` | `string` | `no` | `yes` |
| `mimeType` | `string` | `no` | `yes` |
| `isPrimary` | `string` | `no` | `yes` |
| `createdAt` | `string` | `no` | `yes` |
## inventory

| Parameter | Type | Required | Nullable |
|---|---|---|---|
| `id` | `string` | `yes` | `no` |
| `productId` | `string` | `yes` | `no` |
| `variantId` | `string` | `yes` | `no` |
| `warehouseId` | `string` | `no` | `yes` |
| `onHand` | `number` | `no` | `yes` |
| `reserved` | `number` | `no` | `yes` |
| `available` | `number` | `no` | `yes` |
| `reorderPoint` | `number` | `no` | `yes` |
| `reorderQuantity` | `number` | `no` | `yes` |
| `unitCost` | `string` | `no` | `yes` |
| `batchNumber` | `string` | `no` | `yes` |
| `expiryDate` | `string` | `no` | `yes` |
| `updatedAt` | `string` | `no` | `yes` |
## warehouses

| Parameter | Type | Required | Nullable |
|---|---|---|---|
| `id` | `string` | `yes` | `no` |
| `name` | `string` | `yes` | `no` |
| `code` | `string` | `yes` | `no` |
| `address` | `string` | `no` | `yes` |
| `city` | `string` | `no` | `yes` |
| `state` | `string` | `no` | `yes` |
| `country` | `string` | `no` | `yes` |
| `postalCode` | `string` | `no` | `yes` |
| `phone` | `string` | `no` | `yes` |
| `managerId` | `string` | `no` | `yes` |
| `status` | `string` | `no` | `yes` |
| `createdAt` | `string` | `no` | `yes` |
| `updatedAt` | `string` | `no` | `yes` |
## carts

| Parameter | Type | Required | Nullable |
|---|---|---|---|
| `id` | `string` | `yes` | `no` |
| `buyerId` | `string` | `yes` | `no` |
| `currency` | `string` | `yes` | `no` |
| `couponCode` | `string` | `no` | `yes` |
| `subtotal` | `number` | `no` | `yes` |
| `discount` | `number` | `no` | `yes` |
| `shipping` | `number` | `no` | `yes` |
| `tax` | `number` | `no` | `yes` |
| `total` | `number` | `no` | `yes` |
| `status` | `string` | `no` | `yes` |
| `createdAt` | `string` | `no` | `yes` |
| `updatedAt` | `string` | `no` | `yes` |
## cartItems

| Parameter | Type | Required | Nullable |
|---|---|---|---|
| `id` | `string` | `yes` | `no` |
| `cartId` | `string` | `yes` | `no` |
| `productId` | `string` | `yes` | `no` |
| `variantId` | `string` | `no` | `yes` |
| `quantity` | `number` | `no` | `yes` |
| `unitPrice` | `string` | `no` | `yes` |
| `lineTotal` | `string` | `no` | `yes` |
| `createdAt` | `string` | `no` | `yes` |
| `updatedAt` | `string` | `no` | `yes` |
## orders

| Parameter | Type | Required | Nullable |
|---|---|---|---|
| `id` | `string` | `yes` | `no` |
| `number` | `string` | `yes` | `no` |
| `buyerId` | `string` | `yes` | `no` |
| `currency` | `string` | `no` | `yes` |
| `subtotal` | `number` | `no` | `yes` |
| `discount` | `number` | `no` | `yes` |
| `shipping` | `number` | `no` | `yes` |
| `tax` | `number` | `no` | `yes` |
| `total` | `number` | `no` | `yes` |
| `status` | `string` | `no` | `yes` |
| `paymentStatus` | `string` | `no` | `yes` |
| `fulfillmentStatus` | `string` | `no` | `yes` |
| `shippingAddress` | `object` | `no` | `yes` |
| `billingAddress` | `object` | `no` | `yes` |
| `placedAt` | `string` | `no` | `yes` |
| `confirmedAt` | `string` | `no` | `yes` |
| `shippedAt` | `string` | `no` | `yes` |
| `deliveredAt` | `string` | `no` | `yes` |
| `cancelledAt` | `string` | `no` | `yes` |
| `createdAt` | `string` | `no` | `yes` |
| `updatedAt` | `string` | `no` | `yes` |
## orderItems

| Parameter | Type | Required | Nullable |
|---|---|---|---|
| `id` | `string` | `yes` | `no` |
| `orderId` | `string` | `yes` | `no` |
| `sellerId` | `string` | `yes` | `no` |
| `productId` | `string` | `no` | `yes` |
| `variantId` | `string` | `no` | `yes` |
| `sku` | `string` | `no` | `yes` |
| `title` | `string` | `no` | `yes` |
| `unitPrice` | `string` | `no` | `yes` |
| `quantity` | `number` | `no` | `yes` |
| `discount` | `number` | `no` | `yes` |
| `tax` | `number` | `no` | `yes` |
| `lineTotal` | `string` | `no` | `yes` |
| `status` | `string` | `no` | `yes` |
| `createdAt` | `string` | `no` | `yes` |
| `updatedAt` | `string` | `no` | `yes` |
## payments

| Parameter | Type | Required | Nullable |
|---|---|---|---|
| `id` | `string` | `yes` | `no` |
| `orderId` | `string` | `yes` | `no` |
| `buyerId` | `string` | `yes` | `no` |
| `provider` | `string` | `no` | `yes` |
| `transactionId` | `string` | `no` | `yes` |
| `method` | `string` | `no` | `yes` |
| `amount` | `number` | `no` | `yes` |
| `currency` | `string` | `no` | `yes` |
| `status` | `string` | `no` | `yes` |
| `failureCode` | `string` | `no` | `yes` |
| `failureMessage` | `string` | `no` | `yes` |
| `paidAt` | `string` | `no` | `yes` |
| `refundedAmount` | `number` | `no` | `yes` |
| `createdAt` | `string` | `no` | `yes` |
| `updatedAt` | `string` | `no` | `yes` |
## refunds

| Parameter | Type | Required | Nullable |
|---|---|---|---|
| `id` | `string` | `yes` | `no` |
| `paymentId` | `string` | `yes` | `no` |
| `orderId` | `string` | `yes` | `no` |
| `amount` | `number` | `no` | `yes` |
| `reason` | `string` | `no` | `yes` |
| `status` | `string` | `no` | `yes` |
| `providerReference` | `string` | `no` | `yes` |
| `processedAt` | `string` | `no` | `yes` |
| `createdAt` | `string` | `no` | `yes` |
| `updatedAt` | `string` | `no` | `yes` |
## shipments

| Parameter | Type | Required | Nullable |
|---|---|---|---|
| `id` | `string` | `yes` | `no` |
| `orderId` | `string` | `yes` | `no` |
| `sellerId` | `string` | `yes` | `no` |
| `carrier` | `string` | `no` | `yes` |
| `service` | `string` | `no` | `yes` |
| `trackingNumber` | `string` | `no` | `yes` |
| `status` | `string` | `no` | `yes` |
| `shippingCost` | `number` | `no` | `yes` |
| `labelUrl` | `string` | `no` | `yes` |
| `estimatedDelivery` | `string` | `no` | `yes` |
| `shippedAt` | `string` | `no` | `yes` |
| `deliveredAt` | `string` | `no` | `yes` |
| `createdAt` | `string` | `no` | `yes` |
| `updatedAt` | `string` | `no` | `yes` |
## addresses

| Parameter | Type | Required | Nullable |
|---|---|---|---|
| `id` | `string` | `yes` | `no` |
| `userId` | `string` | `yes` | `no` |
| `type` | `string` | `yes` | `no` |
| `fullName` | `string` | `no` | `yes` |
| `phone` | `string` | `no` | `yes` |
| `line1` | `string` | `no` | `yes` |
| `line2` | `string` | `no` | `yes` |
| `city` | `string` | `no` | `yes` |
| `state` | `string` | `no` | `yes` |
| `country` | `string` | `no` | `yes` |
| `postalCode` | `string` | `no` | `yes` |
| `landmark` | `string` | `no` | `yes` |
| `isDefault` | `boolean` | `no` | `yes` |
| `createdAt` | `string` | `no` | `yes` |
| `updatedAt` | `string` | `no` | `yes` |
## coupons

| Parameter | Type | Required | Nullable |
|---|---|---|---|
| `id` | `string` | `yes` | `no` |
| `code` | `string` | `yes` | `no` |
| `type` | `string` | `yes` | `no` |
| `value` | `number` | `no` | `yes` |
| `minOrder` | `number` | `no` | `yes` |
| `maxDiscount` | `number` | `no` | `yes` |
| `usageLimit` | `number` | `no` | `yes` |
| `usageCount` | `number` | `no` | `yes` |
| `perUserLimit` | `number` | `no` | `yes` |
| `startsAt` | `string` | `no` | `yes` |
| `endsAt` | `string` | `no` | `yes` |
| `active` | `boolean` | `no` | `yes` |
| `createdAt` | `string` | `no` | `yes` |
| `updatedAt` | `string` | `no` | `yes` |
## reviews

| Parameter | Type | Required | Nullable |
|---|---|---|---|
| `id` | `string` | `yes` | `no` |
| `productId` | `string` | `yes` | `no` |
| `buyerId` | `string` | `yes` | `no` |
| `orderId` | `string` | `no` | `yes` |
| `rating` | `number` | `no` | `yes` |
| `title` | `string` | `no` | `yes` |
| `body` | `string` | `no` | `yes` |
| `images` | `array` | `no` | `yes` |
| `verifiedPurchase` | `boolean` | `no` | `yes` |
| `status` | `string` | `no` | `yes` |
| `sellerReply` | `string` | `no` | `yes` |
| `createdAt` | `string` | `no` | `yes` |
| `updatedAt` | `string` | `no` | `yes` |
## wishlists

| Parameter | Type | Required | Nullable |
|---|---|---|---|
| `id` | `string` | `yes` | `no` |
| `buyerId` | `string` | `yes` | `no` |
| `name` | `string` | `yes` | `no` |
| `isDefault` | `boolean` | `no` | `yes` |
| `createdAt` | `string` | `no` | `yes` |
| `updatedAt` | `string` | `no` | `yes` |
## wishlistItems

| Parameter | Type | Required | Nullable |
|---|---|---|---|
| `id` | `string` | `yes` | `no` |
| `wishlistId` | `string` | `yes` | `no` |
| `productId` | `string` | `yes` | `no` |
| `variantId` | `string` | `no` | `yes` |
| `createdAt` | `string` | `no` | `yes` |
## notifications

| Parameter | Type | Required | Nullable |
|---|---|---|---|
| `id` | `string` | `yes` | `no` |
| `userId` | `string` | `yes` | `no` |
| `type` | `string` | `yes` | `no` |
| `title` | `string` | `no` | `yes` |
| `message` | `string` | `no` | `yes` |
| `data` | `object` | `no` | `yes` |
| `readAt` | `string` | `no` | `yes` |
| `channel` | `string` | `no` | `yes` |
| `status` | `string` | `no` | `yes` |
| `createdAt` | `string` | `no` | `yes` |
## messages

| Parameter | Type | Required | Nullable |
|---|---|---|---|
| `id` | `string` | `yes` | `no` |
| `senderId` | `string` | `yes` | `no` |
| `receiverId` | `string` | `yes` | `no` |
| `orderId` | `string` | `no` | `yes` |
| `subject` | `string` | `no` | `yes` |
| `body` | `string` | `no` | `yes` |
| `attachments` | `array` | `no` | `yes` |
| `readAt` | `string` | `no` | `yes` |
| `createdAt` | `string` | `no` | `yes` |
| `updatedAt` | `string` | `no` | `yes` |
## supportTickets

| Parameter | Type | Required | Nullable |
|---|---|---|---|
| `id` | `string` | `yes` | `no` |
| `userId` | `string` | `yes` | `no` |
| `orderId` | `string` | `yes` | `no` |
| `category` | `string` | `no` | `yes` |
| `priority` | `number` | `no` | `yes` |
| `subject` | `string` | `no` | `yes` |
| `description` | `string` | `no` | `yes` |
| `status` | `string` | `no` | `yes` |
| `assignedTo` | `string` | `no` | `yes` |
| `resolution` | `string` | `no` | `yes` |
| `closedAt` | `string` | `no` | `yes` |
| `createdAt` | `string` | `no` | `yes` |
| `updatedAt` | `string` | `no` | `yes` |
## returns

| Parameter | Type | Required | Nullable |
|---|---|---|---|
| `id` | `string` | `yes` | `no` |
| `orderId` | `string` | `yes` | `no` |
| `orderItemId` | `string` | `yes` | `no` |
| `buyerId` | `string` | `no` | `yes` |
| `sellerId` | `string` | `no` | `yes` |
| `reason` | `string` | `no` | `yes` |
| `quantity` | `number` | `no` | `yes` |
| `status` | `string` | `no` | `yes` |
| `refundAmount` | `string` | `no` | `yes` |
| `requestedAt` | `string` | `no` | `yes` |
| `approvedAt` | `string` | `no` | `yes` |
| `receivedAt` | `string` | `no` | `yes` |
| `completedAt` | `string` | `no` | `yes` |
## returnItems

| Parameter | Type | Required | Nullable |
|---|---|---|---|
| `id` | `string` | `yes` | `no` |
| `returnId` | `string` | `yes` | `no` |
| `orderItemId` | `string` | `yes` | `no` |
| `productId` | `string` | `no` | `yes` |
| `quantity` | `number` | `no` | `yes` |
| `condition` | `string` | `no` | `yes` |
| `reason` | `string` | `no` | `yes` |
| `createdAt` | `string` | `no` | `yes` |
## promotions

| Parameter | Type | Required | Nullable |
|---|---|---|---|
| `id` | `string` | `yes` | `no` |
| `name` | `string` | `yes` | `no` |
| `description` | `string` | `yes` | `no` |
| `type` | `string` | `no` | `yes` |
| `value` | `number` | `no` | `yes` |
| `startsAt` | `string` | `no` | `yes` |
| `endsAt` | `string` | `no` | `yes` |
| `status` | `string` | `no` | `yes` |
| `priority` | `number` | `no` | `yes` |
| `conditions` | `object` | `no` | `yes` |
| `createdAt` | `string` | `no` | `yes` |
| `updatedAt` | `string` | `no` | `yes` |
## priceRules

| Parameter | Type | Required | Nullable |
|---|---|---|---|
| `id` | `string` | `yes` | `no` |
| `name` | `string` | `yes` | `no` |
| `productId` | `string` | `yes` | `no` |
| `categoryId` | `string` | `no` | `yes` |
| `minQuantity` | `string` | `no` | `yes` |
| `price` | `number` | `no` | `yes` |
| `percentageOff` | `string` | `no` | `yes` |
| `startsAt` | `string` | `no` | `yes` |
| `endsAt` | `string` | `no` | `yes` |
| `active` | `boolean` | `no` | `yes` |
| `createdAt` | `string` | `no` | `yes` |
| `updatedAt` | `string` | `no` | `yes` |
## taxRates

| Parameter | Type | Required | Nullable |
|---|---|---|---|
| `id` | `string` | `yes` | `no` |
| `name` | `string` | `yes` | `no` |
| `country` | `string` | `yes` | `no` |
| `state` | `string` | `no` | `yes` |
| `postalCode` | `string` | `no` | `yes` |
| `rate` | `number` | `no` | `yes` |
| `taxClass` | `string` | `no` | `yes` |
| `inclusive` | `boolean` | `no` | `yes` |
| `active` | `boolean` | `no` | `yes` |
| `createdAt` | `string` | `no` | `yes` |
| `updatedAt` | `string` | `no` | `yes` |
## shippingZones

| Parameter | Type | Required | Nullable |
|---|---|---|---|
| `id` | `string` | `yes` | `no` |
| `name` | `string` | `yes` | `no` |
| `countries` | `array` | `yes` | `no` |
| `states` | `array` | `no` | `yes` |
| `postalCodes` | `array` | `no` | `yes` |
| `active` | `boolean` | `no` | `yes` |
| `createdAt` | `string` | `no` | `yes` |
| `updatedAt` | `string` | `no` | `yes` |
## shippingRates

| Parameter | Type | Required | Nullable |
|---|---|---|---|
| `id` | `string` | `yes` | `no` |
| `zoneId` | `string` | `yes` | `no` |
| `carrier` | `string` | `yes` | `no` |
| `service` | `string` | `no` | `yes` |
| `minWeight` | `number` | `no` | `yes` |
| `maxWeight` | `number` | `no` | `yes` |
| `minOrder` | `number` | `no` | `yes` |
| `maxOrder` | `number` | `no` | `yes` |
| `rate` | `number` | `no` | `yes` |
| `freeThreshold` | `number` | `no` | `yes` |
| `active` | `boolean` | `no` | `yes` |
| `createdAt` | `string` | `no` | `yes` |
| `updatedAt` | `string` | `no` | `yes` |
## sellerPayouts

| Parameter | Type | Required | Nullable |
|---|---|---|---|
| `id` | `string` | `yes` | `no` |
| `sellerId` | `string` | `yes` | `no` |
| `periodStart` | `string` | `yes` | `no` |
| `periodEnd` | `string` | `no` | `yes` |
| `grossSales` | `number` | `no` | `yes` |
| `refunds` | `number` | `no` | `yes` |
| `fees` | `number` | `no` | `yes` |
| `tax` | `number` | `no` | `yes` |
| `netAmount` | `number` | `no` | `yes` |
| `currency` | `string` | `no` | `yes` |
| `status` | `string` | `no` | `yes` |
| `paidAt` | `string` | `no` | `yes` |
| `createdAt` | `string` | `no` | `yes` |
## commissions

| Parameter | Type | Required | Nullable |
|---|---|---|---|
| `id` | `string` | `yes` | `no` |
| `sellerId` | `string` | `yes` | `no` |
| `orderId` | `string` | `yes` | `no` |
| `orderItemId` | `string` | `no` | `yes` |
| `rate` | `number` | `no` | `yes` |
| `baseAmount` | `number` | `no` | `yes` |
| `amount` | `number` | `no` | `yes` |
| `status` | `string` | `no` | `yes` |
| `createdAt` | `string` | `no` | `yes` |
## adCampaigns

| Parameter | Type | Required | Nullable |
|---|---|---|---|
| `id` | `string` | `yes` | `no` |
| `sellerId` | `string` | `yes` | `no` |
| `name` | `string` | `yes` | `no` |
| `budget` | `number` | `no` | `yes` |
| `spent` | `number` | `no` | `yes` |
| `dailyBudget` | `number` | `no` | `yes` |
| `startAt` | `string` | `no` | `yes` |
| `endAt` | `string` | `no` | `yes` |
| `status` | `string` | `no` | `yes` |
| `targeting` | `object` | `no` | `yes` |
| `createdAt` | `string` | `no` | `yes` |
| `updatedAt` | `string` | `no` | `yes` |
## adEvents

| Parameter | Type | Required | Nullable |
|---|---|---|---|
| `id` | `string` | `yes` | `no` |
| `campaignId` | `string` | `yes` | `no` |
| `productId` | `string` | `yes` | `no` |
| `userId` | `string` | `no` | `yes` |
| `type` | `string` | `no` | `yes` |
| `cost` | `number` | `no` | `yes` |
| `metadata` | `object` | `no` | `yes` |
| `createdAt` | `string` | `no` | `yes` |
## searchLogs

| Parameter | Type | Required | Nullable |
|---|---|---|---|
| `id` | `string` | `yes` | `no` |
| `userId` | `string` | `yes` | `no` |
| `query` | `string` | `yes` | `no` |
| `filters` | `object` | `no` | `yes` |
| `sort` | `string` | `no` | `yes` |
| `resultCount` | `string` | `no` | `yes` |
| `latencyMs` | `number` | `no` | `yes` |
| `createdAt` | `string` | `no` | `yes` |
## analyticsEvents

| Parameter | Type | Required | Nullable |
|---|---|---|---|
| `id` | `string` | `yes` | `no` |
| `userId` | `string` | `yes` | `no` |
| `sessionId` | `string` | `yes` | `no` |
| `event` | `string` | `no` | `yes` |
| `entityType` | `string` | `no` | `yes` |
| `entityId` | `string` | `no` | `yes` |
| `properties` | `object` | `no` | `yes` |
| `source` | `string` | `no` | `yes` |
| `createdAt` | `string` | `no` | `yes` |
## adminActions

| Parameter | Type | Required | Nullable |
|---|---|---|---|
| `id` | `string` | `yes` | `no` |
| `adminId` | `string` | `yes` | `no` |
| `action` | `string` | `yes` | `no` |
| `entityType` | `string` | `no` | `yes` |
| `entityId` | `string` | `no` | `yes` |
| `before` | `object` | `no` | `yes` |
| `after` | `object` | `no` | `yes` |
| `ipAddress` | `string` | `no` | `yes` |
| `userAgent` | `string` | `no` | `yes` |
| `createdAt` | `string` | `no` | `yes` |
## auditLogs

| Parameter | Type | Required | Nullable |
|---|---|---|---|
| `id` | `string` | `yes` | `no` |
| `actorId` | `string` | `yes` | `no` |
| `action` | `string` | `yes` | `no` |
| `entity` | `string` | `no` | `yes` |
| `entityId` | `string` | `no` | `yes` |
| `metadata` | `object` | `no` | `yes` |
| `ipAddress` | `string` | `no` | `yes` |
| `userAgent` | `string` | `no` | `yes` |
| `createdAt` | `string` | `no` | `yes` |
## apiKeys

| Parameter | Type | Required | Nullable |
|---|---|---|---|
| `id` | `string` | `yes` | `no` |
| `userId` | `string` | `yes` | `no` |
| `name` | `string` | `yes` | `no` |
| `keyHash` | `string` | `no` | `yes` |
| `scopes` | `array` | `no` | `yes` |
| `expiresAt` | `string` | `no` | `yes` |
| `lastUsedAt` | `string` | `no` | `yes` |
| `revokedAt` | `string` | `no` | `yes` |
| `createdAt` | `string` | `no` | `yes` |
## sessions

| Parameter | Type | Required | Nullable |
|---|---|---|---|
| `id` | `string` | `yes` | `no` |
| `userId` | `string` | `yes` | `no` |
| `tokenHash` | `string` | `yes` | `no` |
| `ipAddress` | `string` | `no` | `yes` |
| `userAgent` | `string` | `no` | `yes` |
| `expiresAt` | `string` | `no` | `yes` |
| `revokedAt` | `string` | `no` | `yes` |
| `createdAt` | `string` | `no` | `yes` |
## roles

| Parameter | Type | Required | Nullable |
|---|---|---|---|
| `id` | `string` | `yes` | `no` |
| `name` | `string` | `yes` | `no` |
| `description` | `string` | `yes` | `no` |
| `permissions` | `array` | `no` | `yes` |
| `status` | `string` | `no` | `yes` |
| `createdAt` | `string` | `no` | `yes` |
| `updatedAt` | `string` | `no` | `yes` |
## permissions

| Parameter | Type | Required | Nullable |
|---|---|---|---|
| `id` | `string` | `yes` | `no` |
| `key` | `string` | `yes` | `no` |
| `resource` | `string` | `yes` | `no` |
| `action` | `string` | `no` | `yes` |
| `description` | `string` | `no` | `yes` |
| `createdAt` | `string` | `no` | `yes` |
## departments

| Parameter | Type | Required | Nullable |
|---|---|---|---|
| `id` | `string` | `yes` | `no` |
| `name` | `string` | `yes` | `no` |
| `description` | `string` | `yes` | `no` |
| `managerId` | `string` | `no` | `yes` |
| `status` | `string` | `no` | `yes` |
| `createdAt` | `string` | `no` | `yes` |
| `updatedAt` | `string` | `no` | `yes` |
## sellerApplications

| Parameter | Type | Required | Nullable |
|---|---|---|---|
| `id` | `string` | `yes` | `no` |
| `userId` | `string` | `yes` | `no` |
| `shopName` | `string` | `yes` | `no` |
| `legalName` | `string` | `no` | `yes` |
| `taxId` | `string` | `no` | `yes` |
| `documents` | `array` | `no` | `yes` |
| `status` | `string` | `no` | `yes` |
| `reviewerId` | `string` | `no` | `yes` |
| `reviewNotes` | `string` | `no` | `yes` |
| `submittedAt` | `string` | `no` | `yes` |
| `reviewedAt` | `string` | `no` | `yes` |
## sellerDocuments

| Parameter | Type | Required | Nullable |
|---|---|---|---|
| `id` | `string` | `yes` | `no` |
| `sellerId` | `string` | `yes` | `no` |
| `type` | `string` | `yes` | `no` |
| `url` | `string` | `no` | `yes` |
| `documentNumber` | `string` | `no` | `yes` |
| `expiresAt` | `string` | `no` | `yes` |
| `status` | `string` | `no` | `yes` |
| `verifiedBy` | `string` | `no` | `yes` |
| `verifiedAt` | `string` | `no` | `yes` |
| `createdAt` | `string` | `no` | `yes` |
## productAttributes

| Parameter | Type | Required | Nullable |
|---|---|---|---|
| `id` | `string` | `yes` | `no` |
| `name` | `string` | `yes` | `no` |
| `type` | `string` | `yes` | `no` |
| `unit` | `string` | `no` | `yes` |
| `required` | `boolean` | `no` | `yes` |
| `filterable` | `boolean` | `no` | `yes` |
| `searchable` | `boolean` | `no` | `yes` |
| `options` | `string` | `no` | `yes` |
| `createdAt` | `string` | `no` | `yes` |
| `updatedAt` | `string` | `no` | `yes` |
## productAttributeValues

| Parameter | Type | Required | Nullable |
|---|---|---|---|
| `id` | `string` | `yes` | `no` |
| `productId` | `string` | `yes` | `no` |
| `attributeId` | `string` | `yes` | `no` |
| `value` | `number` | `no` | `yes` |
| `createdAt` | `string` | `no` | `yes` |
| `updatedAt` | `string` | `no` | `yes` |
## collections

| Parameter | Type | Required | Nullable |
|---|---|---|---|
| `id` | `string` | `yes` | `no` |
| `name` | `string` | `yes` | `no` |
| `slug` | `string` | `yes` | `no` |
| `description` | `string` | `no` | `yes` |
| `imageUrl` | `string` | `no` | `yes` |
| `rules` | `object` | `no` | `yes` |
| `status` | `string` | `no` | `yes` |
| `position` | `number` | `no` | `yes` |
| `createdAt` | `string` | `no` | `yes` |
| `updatedAt` | `string` | `no` | `yes` |
## collectionItems

| Parameter | Type | Required | Nullable |
|---|---|---|---|
| `id` | `string` | `yes` | `no` |
| `collectionId` | `string` | `yes` | `no` |
| `productId` | `string` | `yes` | `no` |
| `position` | `number` | `no` | `yes` |
| `createdAt` | `string` | `no` | `yes` |
## giftCards

| Parameter | Type | Required | Nullable |
|---|---|---|---|
| `id` | `string` | `yes` | `no` |
| `code` | `string` | `yes` | `no` |
| `initialBalance` | `number` | `yes` | `no` |
| `remainingBalance` | `number` | `no` | `yes` |
| `currency` | `string` | `no` | `yes` |
| `buyerId` | `string` | `no` | `yes` |
| `recipientEmail` | `string` | `no` | `yes` |
| `expiresAt` | `string` | `no` | `yes` |
| `status` | `string` | `no` | `yes` |
| `createdAt` | `string` | `no` | `yes` |
| `updatedAt` | `string` | `no` | `yes` |
## loyaltyAccounts

| Parameter | Type | Required | Nullable |
|---|---|---|---|
| `id` | `string` | `yes` | `no` |
| `userId` | `string` | `yes` | `no` |
| `points` | `number` | `yes` | `no` |
| `tier` | `string` | `no` | `yes` |
| `lifetimePoints` | `number` | `no` | `yes` |
| `availablePoints` | `number` | `no` | `yes` |
| `createdAt` | `string` | `no` | `yes` |
| `updatedAt` | `string` | `no` | `yes` |
## loyaltyTransactions

| Parameter | Type | Required | Nullable |
|---|---|---|---|
| `id` | `string` | `yes` | `no` |
| `accountId` | `string` | `yes` | `no` |
| `type` | `string` | `yes` | `no` |
| `points` | `number` | `no` | `yes` |
| `referenceType` | `string` | `no` | `yes` |
| `referenceId` | `string` | `no` | `yes` |
| `description` | `string` | `no` | `yes` |
| `createdAt` | `string` | `no` | `yes` |
## vendorInvoices

| Parameter | Type | Required | Nullable |
|---|---|---|---|
| `id` | `string` | `yes` | `no` |
| `sellerId` | `string` | `yes` | `no` |
| `periodStart` | `string` | `yes` | `no` |
| `periodEnd` | `string` | `no` | `yes` |
| `subtotal` | `number` | `no` | `yes` |
| `commission` | `string` | `no` | `yes` |
| `tax` | `number` | `no` | `yes` |
| `total` | `number` | `no` | `yes` |
| `status` | `string` | `no` | `yes` |
| `dueAt` | `string` | `no` | `yes` |
| `paidAt` | `string` | `no` | `yes` |
| `createdAt` | `string` | `no` | `yes` |
| `updatedAt` | `string` | `no` | `yes` |
## reports

| Parameter | Type | Required | Nullable |
|---|---|---|---|
| `id` | `string` | `yes` | `no` |
| `name` | `string` | `yes` | `no` |
| `type` | `string` | `yes` | `no` |
| `parameters` | `string` | `no` | `yes` |
| `format` | `string` | `no` | `yes` |
| `status` | `string` | `no` | `yes` |
| `fileUrl` | `string` | `no` | `yes` |
| `requestedBy` | `string` | `no` | `yes` |
| `generatedAt` | `string` | `no` | `yes` |
| `createdAt` | `string` | `no` | `yes` |
## webhooks

| Parameter | Type | Required | Nullable |
|---|---|---|---|
| `id` | `string` | `yes` | `no` |
| `name` | `string` | `yes` | `no` |
| `url` | `string` | `yes` | `no` |
| `events` | `array` | `no` | `yes` |
| `secretHash` | `string` | `no` | `yes` |
| `status` | `string` | `no` | `yes` |
| `lastDeliveredAt` | `string` | `no` | `yes` |
| `failureCount` | `number` | `no` | `yes` |
| `createdAt` | `string` | `no` | `yes` |
| `updatedAt` | `string` | `no` | `yes` |
## featureFlags

| Parameter | Type | Required | Nullable |
|---|---|---|---|
| `id` | `string` | `yes` | `no` |
| `key` | `string` | `yes` | `no` |
| `description` | `string` | `yes` | `no` |
| `enabled` | `boolean` | `no` | `yes` |
| `rules` | `object` | `no` | `yes` |
| `createdAt` | `string` | `no` | `yes` |
| `updatedAt` | `string` | `no` | `yes` |
## settings

| Parameter | Type | Required | Nullable |
|---|---|---|---|
| `id` | `string` | `yes` | `no` |
| `key` | `string` | `yes` | `no` |
| `value` | `number` | `yes` | `no` |
| `type` | `string` | `no` | `yes` |
| `scope` | `string` | `no` | `yes` |
| `description` | `string` | `no` | `yes` |
| `isSecret` | `boolean` | `no` | `yes` |
| `createdAt` | `string` | `no` | `yes` |
| `updatedAt` | `string` | `no` | `yes` |
