import mongoose from 'mongoose';
import { defineSchema } from '../helpers/schema.js';
import { COLLECTIONS, PAYMENT_STATUS, STORE_ORDER_STATUS } from '../helpers/constants.js';

export const ProductCategory = mongoose.models.ProductCategory || mongoose.model(
  'ProductCategory',
  defineSchema(
    {
      gymId: { type: String, required: true, index: true },
      tenantId: String,
      name: { type: String, required: true },
    },
    { collection: COLLECTIONS.PRODUCT_CATEGORIES }
  )
);

export const Product = mongoose.models.Product || mongoose.model(
  'Product',
  defineSchema(
    {
      gymId: { type: String, required: true, index: true },
      tenantId: String,
      categoryId: String,
      name: { type: String, required: true },
      description: String,
      sku: String,
      barcode: String,
      price: { type: Number, required: true },
      costPrice: Number,
      stockQty: { type: Number, default: 0 },
      lowStockAt: { type: Number, default: 5 },
      images: { type: [String], default: [] },
      customFields: { type: mongoose.Schema.Types.Mixed },
      isActive: { type: Boolean, default: true },
    },
    { collection: COLLECTIONS.PRODUCTS }
  )
);

export const Sale = mongoose.models.Sale || mongoose.model(
  'Sale',
  defineSchema(
    {
      gymId: { type: String, required: true, index: true },
      tenantId: String,
      memberId: String,
      orderNumber: String,
      totalAmount: { type: Number, required: true },
      taxAmount: Number,
      status: { type: String, default: PAYMENT_STATUS.COMPLETED },
      fulfillmentStatus: { type: String, default: STORE_ORDER_STATUS.PLACED },
      fulfillmentType: { type: String, default: 'PICKUP' },
      notes: String,
      soldAt: { type: Date, default: Date.now },
      collectedAt: Date,
    },
    { collection: COLLECTIONS.SALES, indexes: [{ keys: { gymId: 1, soldAt: -1 } }] }
  )
);

export const SaleItem = mongoose.models.SaleItem || mongoose.model(
  'SaleItem',
  defineSchema(
    {
      gymId: String,
      saleId: { type: String, required: true, index: true },
      productId: { type: String, required: true },
      quantity: { type: Number, required: true },
      unitPrice: { type: Number, required: true },
      total: { type: Number, required: true },
    },
    { collection: COLLECTIONS.SALE_ITEMS }
  )
);

export const Cart = mongoose.models.Cart || mongoose.model(
  'Cart',
  defineSchema(
    {
      gymId: { type: String, required: true, index: true },
      tenantId: String,
      memberId: { type: String, required: true },
      items: {
        type: [
          {
            productId: { type: String, required: true },
            quantity: { type: Number, required: true, min: 1 },
          },
        ],
        default: [],
      },
    },
    { collection: COLLECTIONS.CARTS, indexes: [{ keys: { memberId: 1 }, options: { unique: true } }] }
  )
);
