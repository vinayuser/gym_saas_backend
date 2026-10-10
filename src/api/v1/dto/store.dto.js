import { money, iso } from './common.js';

export const toProductListItemDto = (p) => {
  const price = money(p.price);
  const mrp = money(p.customFields?.mrp) || (price ? Math.round(price * 1.28) : null);
  const discountPct =
    price != null && mrp != null && mrp > price ? Math.round(((mrp - price) / mrp) * 100) : null;

  return {
    id: p.id,
    name: p.name,
    description: p.description || null,
    sku: p.sku || null,
    price,
    mrp,
    discountPct,
    discountLabel: discountPct != null ? `${discountPct}% OFF` : null,
    stockQty: p.stockQty ?? 0,
    inStock: (p.stockQty ?? 0) > 0,
    images: p.images || [],
    imageUrl: p.images?.[0] || null,
    categoryId: p.categoryId || null,
    categoryName: p.category?.name || null,
    flavor: p.customFields?.flavor || null,
    weight: p.customFields?.weight || null,
    rating: p.customFields?.rating ?? null,
    specs: p.customFields?.specs || null,
  };
};

export const toProductDetailDto = (p) => ({
  ...toProductListItemDto(p),
  memberPickupNote: 'Pickup at the front desk after payment confirmation.',
});

export const toCartItemDto = (item, product) => {
  const productDto = product ? toProductListItemDto(product) : null;
  const unitPrice = productDto?.price ?? money(item.unitPrice) ?? 0;
  const quantity = Number(item.quantity) || 1;
  return {
    productId: item.productId,
    quantity,
    unitPrice,
    lineTotal: unitPrice * quantity,
    product: productDto,
  };
};

export const toCartDto = ({ items, subtotal, itemCount, perkNote, pickupNote }) => ({
  items,
  itemCount: itemCount ?? items.reduce((s, i) => s + i.quantity, 0),
  subtotal: money(subtotal) ?? 0,
  taxesIncluded: true,
  perkNote: perkNote || 'Free locker pick-up for members',
  pickupNote: pickupNote || 'Collect at the front desk',
});

const statusLabel = (status) => {
  const map = {
    PLACED: 'Placed',
    CONFIRMED: 'Confirmed',
    PREPARING: 'Preparing',
    READY_FOR_PICKUP: 'Ready',
    COLLECTED: 'Collected',
    CANCELLED: 'Cancelled',
  };
  return map[status] || status;
};

export const toOrderListItemDto = (order) => {
  const first = order.items?.[0];
  const more = (order.items?.length || 0) - 1;
  const title =
    first?.product?.name ||
    first?.name ||
    (more > 0 ? `${order.itemCount || order.items?.length} items` : 'Order');

  return {
    id: order.id,
    orderNumber: order.orderNumber || null,
    status: order.fulfillmentStatus,
    statusLabel: statusLabel(order.fulfillmentStatus),
    totalAmount: money(order.totalAmount),
    itemCount: order.itemCount ?? order.items?.length ?? 0,
    summary: more > 0 ? `${title} +${more} more` : title,
    pickupPoint: 'Front Desk',
    soldAt: iso(order.soldAt || order.createdAt),
    createdAt: iso(order.createdAt),
  };
};

export const toOrderDetailDto = (order) => {
  const pickupCode =
    order.orderNumber?.replace(/\D/g, '').slice(-4) ||
    String(order.id || '')
      .replace(/\D/g, '')
      .slice(-4) ||
    '0000';

  return {
    ...toOrderListItemDto(order),
    pickupCode,
    pickupPoint: 'Front Desk, Main Gym Lobby',
    fulfillmentType: order.fulfillmentType || 'PICKUP',
    notes: order.notes || null,
    taxAmount: money(order.taxAmount) ?? 0,
    subtotal: money(order.totalAmount),
    fees: 0,
    items: (order.items || []).map((item) => ({
      productId: item.productId,
      name: item.product?.name || 'Item',
      quantity: item.quantity,
      unitPrice: money(item.unitPrice),
      total: money(item.total),
      imageUrl: item.product?.images?.[0] || null,
      variant: item.product?.customFields?.flavor || null,
    })),
    pickupInstructions: 'Show your pickup code at the front desk to collect your order.',
  };
};

export const toOrderPlacedDto = (order) => {
  const detail = toOrderDetailDto(order);
  return {
    ...detail,
    status: 'Placed',
    statusLabel: 'Placed',
    amountPaid: detail.totalAmount,
    confirmationNote: 'SMS confirmation will be sent shortly.',
  };
};
