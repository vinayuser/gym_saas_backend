import { withId, timestamps } from './common.projection.js';

export const categoryPublic = withId({
  gymId: 1,
  name: 1,
  createdAt: 1,
});

export const productPublic = withId({
  gymId: 1,
  categoryId: 1,
  name: 1,
  description: 1,
  sku: 1,
  barcode: 1,
  price: 1,
  costPrice: 1,
  stockQty: 1,
  lowStockAt: 1,
  images: 1,
  customFields: 1,
  isActive: 1,
  category: 1,
  ...timestamps,
});

export const productBrief = withId({
  name: 1,
  sku: 1,
  images: 1,
  price: 1,
});

export const salePublic = withId({
  gymId: 1,
  memberId: 1,
  orderNumber: 1,
  totalAmount: 1,
  taxAmount: 1,
  status: 1,
  fulfillmentStatus: 1,
  fulfillmentType: 1,
  notes: 1,
  soldAt: 1,
  collectedAt: 1,
  member: 1,
  items: 1,
  ...timestamps,
});
