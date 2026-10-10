import { Cart, Product, ProductCategory } from '../../../schemas/index.js';
import { COLLECTIONS } from '../../../helpers/constants.js';
import { lookupOne, notDeleted } from '../../../helpers/query.js';
import { asDoc, createDoc, updateById } from '../../../helpers/document.js';
import { NotFoundError, BadRequestError } from '../../../utils/errors.js';
import * as OrderService from '../../../services/OrderService.js';
import {
  toProductListItemDto,
  toProductDetailDto,
  toCartItemDto,
  toCartDto,
  toOrderListItemDto,
  toOrderDetailDto,
  toOrderPlacedDto,
} from '../dto/store.dto.js';

const loadProducts = async (gymId, { category, search } = {}) => {
  const match = { gymId, isActive: true, ...notDeleted };
  if (category && category !== 'All') {
    const cat = asDoc(await ProductCategory.findOne({ gymId, name: new RegExp(`^${category}$`, 'i') }));
    if (cat) match.categoryId = cat.id;
  }
  if (search) {
    match.name = { $regex: search, $options: 'i' };
  }

  return Product.aggregate([
    { $match: match },
    { $sort: { name: 1 } },
    ...lookupOne(COLLECTIONS.PRODUCT_CATEGORIES, 'categoryId', 'category', {
      _id: 0,
      id: '$_id',
      name: 1,
    }),
    {
      $project: {
        _id: 0,
        id: '$_id',
        gymId: 1,
        categoryId: 1,
        name: 1,
        description: 1,
        sku: 1,
        price: 1,
        stockQty: 1,
        images: 1,
        customFields: 1,
        category: 1,
      },
    },
  ]);
};

export const listProducts = async (member, query = {}) => {
  const [products, categories] = await Promise.all([
    loadProducts(member.gymId, query),
    ProductCategory.find({ gymId: member.gymId }).sort({ name: 1 }).lean(),
  ]);

  return {
    categories: [
      { id: 'all', name: 'All' },
      ...categories.map((c) => ({ id: c._id, name: c.name })),
    ],
    products: products.map(toProductListItemDto),
    itemCount: products.length,
  };
};

export const getProduct = async (member, productId) => {
  const rows = await Product.aggregate([
    { $match: { _id: productId, gymId: member.gymId, isActive: true, ...notDeleted } },
    ...lookupOne(COLLECTIONS.PRODUCT_CATEGORIES, 'categoryId', 'category', {
      _id: 0,
      id: '$_id',
      name: 1,
    }),
    {
      $project: {
        _id: 0,
        id: '$_id',
        gymId: 1,
        categoryId: 1,
        name: 1,
        description: 1,
        sku: 1,
        price: 1,
        stockQty: 1,
        images: 1,
        customFields: 1,
        category: 1,
      },
    },
  ]);
  if (!rows[0]) throw new NotFoundError('Product not found');
  return toProductDetailDto(rows[0]);
};

const getOrCreateCart = async (member, gym) => {
  let cart = asDoc(await Cart.findOne({ memberId: member.id, ...notDeleted }));
  if (!cart) {
    cart = await createDoc(Cart, {
      memberId: member.id,
      gymId: member.gymId,
      tenantId: member.tenantId || gym.tenantId,
      items: [],
    });
  }
  return cart;
};

const hydrateCart = async (cart) => {
  const productIds = cart.items.map((i) => i.productId);
  const products = await Product.find({ _id: { $in: productIds }, ...notDeleted }).lean();
  const byId = Object.fromEntries(products.map((p) => [p._id, { ...p, id: p._id }]));

  const items = cart.items
    .map((item) => {
      const product = byId[item.productId];
      if (!product) return null;
      return toCartItemDto(item, product);
    })
    .filter(Boolean);

  const subtotal = items.reduce((s, i) => s + i.lineTotal, 0);
  return toCartDto({ items, subtotal });
};

export const getCart = async (member, gym) => {
  const cart = await getOrCreateCart(member, gym);
  return hydrateCart(cart);
};

export const addToCart = async (member, gym, body) => {
  const productId = body.productId;
  const quantity = Math.max(1, Number(body.quantity) || 1);
  if (!productId) throw new BadRequestError('productId is required');

  const product = asDoc(await Product.findOne({ _id: productId, gymId: member.gymId, isActive: true, ...notDeleted }));
  if (!product) throw new NotFoundError('Product not found');
  if (product.stockQty < quantity) throw new BadRequestError('Insufficient stock');

  const cart = await getOrCreateCart(member, gym);
  const items = [...(cart.items || [])];
  const idx = items.findIndex((i) => i.productId === productId);
  if (idx >= 0) {
    items[idx] = { productId, quantity: items[idx].quantity + quantity };
  } else {
    items.push({ productId, quantity });
  }

  const updated = await updateById(Cart, cart.id, { items });
  return hydrateCart(updated);
};

export const updateCartItem = async (member, gym, productId, body) => {
  const quantity = Number(body.quantity);
  if (!Number.isFinite(quantity) || quantity < 0) {
    throw new BadRequestError('quantity must be a non-negative number');
  }

  const cart = await getOrCreateCart(member, gym);
  let items = [...(cart.items || [])];
  if (quantity === 0) {
    items = items.filter((i) => i.productId !== productId);
  } else {
    const idx = items.findIndex((i) => i.productId === productId);
    if (idx < 0) throw new NotFoundError('Item not in cart');
    items[idx] = { productId, quantity };
  }

  const updated = await updateById(Cart, cart.id, { items });
  return hydrateCart(updated);
};

export const clearCart = async (member, gym) => {
  const cart = await getOrCreateCart(member, gym);
  const updated = await updateById(Cart, cart.id, { items: [] });
  return hydrateCart(updated);
};

export const placeOrder = async (member, gym, body = {}) => {
  const tenantId = member.tenantId || gym.tenantId;
  let items = body.items;

  if (!items?.length) {
    const cart = await getOrCreateCart(member, gym);
    items = (cart.items || []).map((i) => ({ productId: i.productId, quantity: i.quantity }));
  }

  if (!items.length) throw new BadRequestError('Cart is empty');

  const order = await OrderService.create(tenantId, member.gymId, {
    memberId: member.id,
    items,
    notes: body.notes,
    fulfillmentType: body.fulfillmentType || 'PICKUP',
  });

  const cart = await getOrCreateCart(member, gym);
  await updateById(Cart, cart.id, { items: [] });

  return toOrderPlacedDto(order);
};

export const listOrders = async (member, gym) => {
  const tenantId = member.tenantId || gym.tenantId;
  const result = await OrderService.listForMember(tenantId, member.gymId, member.id, {
    page: 1,
    limit: 50,
  });
  return {
    totalOrders: result.pagination?.total ?? result.orders.length,
    orders: result.orders.map(toOrderListItemDto),
  };
};

export const getOrder = async (member, gym, orderId) => {
  const tenantId = member.tenantId || gym.tenantId;
  const order = await OrderService.getById(tenantId, member.gymId, orderId);
  if (order.memberId && order.memberId !== member.id) {
    throw new NotFoundError('Order not found');
  }
  return toOrderDetailDto(order);
};
