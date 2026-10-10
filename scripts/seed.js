/**
 * Volume seed for MongoDB.
 * Fills lists so pagination works. Each gym gets 4 membership plans, not more.
 *
 *   superadmin@gymsaas.com / Admin@123
 *   owner@demo.com         / Owner@123
 *   member@demo.com        / Member@123
 *   staff.iron-district-main.01@demo.com / Staff@123
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { connectDb, disconnectDb } from '../src/config/database.js';
import {
  User,
  RefreshToken,
  PasswordReset,
  OtpVerification,
  Tenant,
  SubscriptionPlan,
  Subscription,
  SaasPayment,
  Gym,
  GymBranch,
  GymStaff,
  Trainer,
  Member,
  BodyMeasurement,
  GymMembershipPlan,
  Membership,
  MemberPayment,
  Invoice,
  WorkoutPlan,
  DietPlan,
  Attendance,
  Event,
  EventBooking,
  Enquiry,
  Banner,
  DayPass,
  GymChatMessage,
  Coupon,
  Offer,
  ProductCategory,
  Product,
  Sale,
  SaleItem,
  GymInvite,
  SupportTicket,
  Notification,
  AuditLog,
  Role,
  Permission,
} from '../src/schemas/index.js';
import { ROLES, USER_STATUS } from '../src/helpers/constants.js';
import { PLATFORM_PERMISSIONS } from '../src/constants/platformPermissions.js';
import { getCatalog } from '../src/services/PlatformBillingService.js';

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '../.env') });

const PER_GYM = 60;
const PLANS_PER_GYM = 4;

const FIRST = ['Aarav', 'Vihaan', 'Aditya', 'Arjun', 'Kabir', 'Anaya', 'Diya', 'Myra', 'Sara', 'Ishaan', 'Rohan', 'Neha', 'Kavya', 'Rahul', 'Pooja', 'Aman', 'Sneha', 'Vikram', 'Meera', 'Dev'];
const LAST = ['Sharma', 'Patel', 'Reddy', 'Iyer', 'Khan', 'Gupta', 'Nair', 'Das', 'Joshi', 'Mehta', 'Singh', 'Kapoor', 'Bose', 'Rao', 'Malhotra'];
const CITIES = ['Mumbai', 'Pune'];
const SOURCES = ['walk-in', 'instagram', 'referral', 'website', 'google'];
const LEAD_STATUS = ['NEW', 'CONTACTED', 'TRIAL', 'FOLLOW_UP', 'CONVERTED', 'LOST'];
const PAY_STATUS = ['COMPLETED', 'PENDING', 'FAILED', 'REFUNDED'];
const INVOICE_STATUS = ['PAID', 'ISSUED', 'OVERDUE', 'DRAFT', 'CANCELLED'];
const ATTENDANCE_SOURCE = ['QR_CODE', 'FRONTDESK', 'MOBILE', 'BIOMETRIC', 'PUNCH'];
const EVENT_TYPES = ['ZUMBA', 'YOGA', 'OUTDOOR', 'WORKSHOP', 'PERSONAL_TRAINING', 'OTHER'];
const BANNER_STATUS = ['ACTIVE', 'SCHEDULED', 'DRAFT', 'EXPIRED', 'ARCHIVED'];
const BANNER_CATEGORY = ['PROMOTION', 'NEW_CLASS', 'MAINTENANCE', 'APP_EXCLUSIVE'];
const BANNER_PLACEMENT = ['GLOBAL_HOMEPAGE', 'CLASSES_SECTION', 'DASHBOARD_TOP', 'MEMBER_STORE'];
const ORDER_STATUS = ['PLACED', 'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP', 'COLLECTED', 'CANCELLED'];

const GYM_PLANS = [
  { name: 'Starter', billingCycle: 'MONTHLY', durationDays: 30, price: 999, description: 'Monthly access' },
  { name: 'Pulse', billingCycle: 'QUARTERLY', durationDays: 90, price: 2499, description: 'Quarterly access' },
  { name: 'Athlete', billingCycle: 'YEARLY', durationDays: 365, price: 7999, description: 'Yearly access' },
  { name: 'Elite', billingCycle: 'YEARLY', durationDays: 365, price: 11999, description: 'Premium yearly access' },
];

const GYM_PERMISSIONS = [
  { name: 'Create Gym', slug: 'gym:create', module: 'gym', scope: 'gym' },
  { name: 'Read Gym', slug: 'gym:read', module: 'gym', scope: 'gym' },
  { name: 'Update Gym', slug: 'gym:update', module: 'gym', scope: 'gym' },
  { name: 'Delete Gym', slug: 'gym:delete', module: 'gym', scope: 'gym' },
  { name: 'Create Member', slug: 'member:create', module: 'member', scope: 'gym' },
  { name: 'Read Member', slug: 'member:read', module: 'member', scope: 'gym' },
  { name: 'Update Member', slug: 'member:update', module: 'member', scope: 'gym' },
  { name: 'Delete Member', slug: 'member:delete', module: 'member', scope: 'gym' },
  { name: 'Read Attendance', slug: 'attendance:read', module: 'attendance', scope: 'gym' },
  { name: 'Write Attendance', slug: 'attendance:write', module: 'attendance', scope: 'gym' },
  { name: 'Read Reports', slug: 'reports:read', module: 'reports', scope: 'gym' },
  { name: 'Manage Billing', slug: 'billing:manage', module: 'billing', scope: 'gym' },
];

const ROLES_SEED = [
  { name: 'Super Admin', slug: 'super_admin', scope: 'platform', isSystem: true },
  { name: 'Gym Owner', slug: 'gym_owner', scope: 'gym', isSystem: true },
  { name: 'Manager', slug: 'manager', scope: 'gym', isSystem: true },
  { name: 'Receptionist', slug: 'receptionist', scope: 'gym', isSystem: true },
  { name: 'Trainer', slug: 'trainer', scope: 'gym', isSystem: true },
  { name: 'Member', slug: 'member', scope: 'gym', isSystem: true },
];

const SAAS_PLANS = [
  { name: 'Single Gym', type: 'SINGLE_GYM', gymLimit: 1, priceMonthly: 1999, priceYearly: 19990, isActive: true },
  { name: '2 Gyms', type: 'TWO_GYMS', gymLimit: 2, priceMonthly: 2998, priceYearly: 29980, isActive: true },
  { name: '5 Gyms', type: 'FIVE_GYMS', gymLimit: 5, priceMonthly: 5995, priceYearly: 59950, isActive: true },
  { name: 'Unlimited', type: 'UNLIMITED', gymLimit: 99, priceMonthly: 9999, priceYearly: 99990, isActive: true },
];

const pad = (n) => String(n).padStart(2, '0');
const pick = (list, i) => list[i % list.length];
const daysFromNow = (days, hours = 8) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hours, (Math.abs(days) * 7) % 60, 0, 0);
  return d;
};
const person = (i) => ({ firstName: pick(FIRST, i), lastName: pick(LAST, i + 3) });
const idOf = (doc) => doc._id || doc.id;

const upsertBy = (Model, filter, data) =>
  Model.findOneAndUpdate(filter, { $set: data }, { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true });

const wipeAccounts = async () => {
  await Promise.all([
    SaleItem.deleteMany({}),
    Sale.deleteMany({}),
    EventBooking.deleteMany({}),
    Event.deleteMany({}),
    Attendance.deleteMany({}),
    BodyMeasurement.deleteMany({}),
    MemberPayment.deleteMany({}),
    Invoice.deleteMany({}),
    Membership.deleteMany({}),
    WorkoutPlan.deleteMany({}),
    DietPlan.deleteMany({}),
    Banner.deleteMany({}),
    Product.deleteMany({}),
    ProductCategory.deleteMany({}),
    Coupon.deleteMany({}),
    Offer.deleteMany({}),
    Enquiry.deleteMany({}),
    GymChatMessage.deleteMany({}),
    Notification.deleteMany({}),
    AuditLog.deleteMany({}),
    SupportTicket.deleteMany({}),
    GymStaff.deleteMany({}),
    Trainer.deleteMany({}),
    GymBranch.deleteMany({}),
    GymMembershipPlan.deleteMany({}),
    DayPass.deleteMany({}),
    Member.deleteMany({}),
    Gym.deleteMany({}),
    GymInvite.deleteMany({}),
    SaasPayment.deleteMany({}),
    Subscription.deleteMany({}),
    RefreshToken.deleteMany({}),
    PasswordReset.deleteMany({}),
    OtpVerification.deleteMany({}),
    Tenant.deleteMany({}),
    User.deleteMany({}),
  ]);
};

const seedCatalogAndRbac = async () => {
  await getCatalog();
  for (const plan of SAAS_PLANS) await upsertBy(SubscriptionPlan, { type: plan.type }, plan);
  for (const perm of GYM_PERMISSIONS) await upsertBy(Permission, { slug: perm.slug }, perm);
  for (const perm of PLATFORM_PERMISSIONS) {
    await upsertBy(Permission, { slug: perm.slug }, { ...perm, scope: 'platform' });
  }
  for (const role of ROLES_SEED) await upsertBy(Role, { slug: role.slug }, role);
  return SubscriptionPlan.findOne({ type: 'SINGLE_GYM' });
};

const seedGym = async (tenant, gym, owner, passwords) => {
  const slug = gym.slug;
  const tenantId = idOf(tenant);
  const gymId = idOf(gym);
  const ownerId = idOf(owner);

  const staffUsers = await User.insertMany(
    Array.from({ length: PER_GYM }, (_, i) => {
      const who = person(i);
      return {
        tenantId,
        email: `staff.${slug}.${pad(i + 1)}@demo.com`,
        password: passwords.staff,
        firstName: who.firstName,
        lastName: who.lastName,
        phone: `+91981${String(100000 + i).slice(0, 6)}${slug.length % 10}`,
        role: i === 0 ? ROLES.MANAGER : ROLES.RECEPTIONIST,
        status: USER_STATUS.ACTIVE,
        emailVerified: true,
      };
    })
  );

  await GymStaff.insertMany(
    staffUsers.map((user, i) => ({
      gymId,
      tenantId,
      userId: idOf(user),
      designation: i === 0 ? 'Manager' : i % 4 === 0 ? 'Reception' : 'Floor staff',
      joinedAt: daysFromNow(-200 + i),
      isActive: i % 11 !== 0,
      employmentType: i % 3 === 0 ? 'full-time' : 'part-time',
      baseSalary: 18000 + i * 250,
    }))
  );

  const trainerUsers = await User.insertMany(
    Array.from({ length: PER_GYM }, (_, i) => {
      const who = person(i + 7);
      return {
        tenantId,
        email: `trainer.${slug}.${pad(i + 1)}@demo.com`,
        password: passwords.staff,
        firstName: who.firstName,
        lastName: who.lastName,
        phone: `+91982${String(200000 + i).slice(0, 6)}${slug.length % 10}`,
        role: ROLES.TRAINER,
        status: USER_STATUS.ACTIVE,
        emailVerified: true,
      };
    })
  );

  const trainers = await Trainer.insertMany(
    trainerUsers.map((user, i) => ({
      gymId,
      tenantId,
      userId: idOf(user),
      bio: `${user.firstName} coaches group classes and personal training.`,
      specialties: [pick(['Strength', 'Yoga', 'HIIT', 'Boxing', 'Mobility'], i), pick(['Nutrition', 'Rehab', 'Weight loss'], i)],
      experience: (i % 12) + 1,
      isActive: i % 13 !== 0,
    }))
  );

  const memberRows = Array.from({ length: PER_GYM }, (_, i) => {
    const who = person(i + 2);
    const email = i === 0 && slug === 'iron-district-main' ? 'member@demo.com' : `member.${slug}.${pad(i + 1)}@demo.com`;
    return { who, email, i };
  });

  let demoMemberUserId = null;
  if (slug === 'iron-district-main') {
    const login = await User.create({
      tenantId,
      email: 'member@demo.com',
      password: passwords.member,
      firstName: memberRows[0].who.firstName,
      lastName: memberRows[0].who.lastName,
      phone: '+919800000001',
      role: ROLES.MEMBER,
      status: USER_STATUS.ACTIVE,
      emailVerified: true,
    });
    demoMemberUserId = idOf(login);
  }

  const members = await Member.insertMany(
    memberRows.map(({ who, email, i }) => ({
      gymId,
      tenantId,
      ...(email === 'member@demo.com' && demoMemberUserId ? { userId: demoMemberUserId } : {}),
      memberCode: `M${String(i + 1).padStart(5, '0')}`,
      firstName: who.firstName,
      lastName: who.lastName,
      email,
      phone: `+9197${String(300000 + i).padStart(6, '0').slice(0, 6)}`,
      gender: i % 2 === 0 ? 'female' : 'male',
      address: `${10 + i} Fitness Lane, ${gym.city}`,
      fitnessGoals: pick(['Fat loss', 'Muscle gain', 'Endurance', 'General fitness'], i),
      isActive: i % 9 !== 0,
      joinedAt: daysFromNow(-180 + i),
      createdAt: daysFromNow(-180 + i),
      qrCode: `${slug}-M${i + 1}`,
    }))
  );

  const plans = await GymMembershipPlan.insertMany(
    GYM_PLANS.slice(0, PLANS_PER_GYM).map((plan, i) => ({
      gymId,
      tenantId,
      name: plan.name,
      description: plan.description,
      billingCycle: plan.billingCycle,
      price: plan.price,
      durationDays: plan.durationDays,
      isActive: true,
      createdAt: daysFromNow(-90 + i),
    }))
  );

  const memberships = await Membership.insertMany(
    members.map((member, i) => {
      const plan = plans[i % plans.length];
      const start = daysFromNow(-40 + (i % 20));
      const end = new Date(start);
      end.setDate(end.getDate() + plan.durationDays);
      return {
        gymId,
        tenantId,
        memberId: idOf(member),
        planId: idOf(plan),
        status: i % 10 === 0 ? 'EXPIRED' : i % 7 === 0 ? 'PENDING' : 'ACTIVE',
        startDate: start,
        endDate: end,
        amountPaid: plan.price,
        createdAt: start,
      };
    })
  );

  await MemberPayment.insertMany(
    memberships.map((membership, i) => ({
      gymId,
      tenantId,
      membershipId: idOf(membership),
      amount: membership.amountPaid || 999,
      status: pick(PAY_STATUS, i),
      method: pick(['upi', 'cash', 'card'], i),
      providerRef: `pay_${slug}_${i + 1}`,
      paidAt: daysFromNow(-i),
      createdAt: daysFromNow(-i),
    }))
  );

  await Invoice.insertMany(
    memberships.map((membership, i) => {
      const amount = membership.amountPaid || 999;
      const tax = Math.round(amount * 0.18);
      return {
        gymId,
        tenantId,
        membershipId: idOf(membership),
        invoiceNumber: `INV-${slug}-${String(i + 1).padStart(4, '0')}`,
        amount,
        taxAmount: tax,
        totalAmount: amount + tax,
        status: pick(INVOICE_STATUS, i),
        issuedAt: daysFromNow(-i),
        dueAt: daysFromNow(-i + 7),
        paidAt: i % 4 === 0 ? null : daysFromNow(-i + 1),
        createdAt: daysFromNow(-i),
      };
    })
  );

  await Attendance.insertMany(
    members.map((member, i) => ({
      gymId,
      tenantId,
      memberId: idOf(member),
      type: 'CHECK_IN',
      source: pick(ATTENDANCE_SOURCE, i),
      checkInAt: daysFromNow(-i, 6 + (i % 10)),
      checkOutAt: i % 3 === 0 ? null : daysFromNow(-i, 8 + (i % 10)),
      isLate: i % 6 === 0,
    }))
  );

  await BodyMeasurement.insertMany(
    members.map((member, i) => ({
      gymId,
      memberId: idOf(member),
      weight: 55 + (i % 30),
      height: 155 + (i % 30),
      bodyFat: 12 + (i % 15),
      notes: 'Seed measurement',
      measuredAt: daysFromNow(-i),
    }))
  );

  await WorkoutPlan.insertMany(
    members.map((member, i) => ({
      gymId,
      memberId: idOf(member),
      trainerId: idOf(trainers[i % trainers.length]),
      title: `Week plan ${i + 1}`,
      description: 'Push, pull, and conditioning',
      exercises: [{ name: 'Squat', sets: 4 }, { name: 'Row', sets: 3 }],
      startDate: daysFromNow(-14),
      endDate: daysFromNow(14),
      isActive: true,
    }))
  );

  await DietPlan.insertMany(
    members.map((member, i) => ({
      gymId,
      memberId: idOf(member),
      title: `Meal plan ${i + 1}`,
      description: 'High protein day',
      meals: [{ name: 'Breakfast', note: 'Eggs and oats' }],
      startDate: daysFromNow(-7),
      isActive: true,
    }))
  );

  const events = await Event.insertMany(
    Array.from({ length: PER_GYM }, (_, i) => {
      const startAt = daysFromNow(i - 25, 6 + (i % 8));
      return {
        gymId,
        tenantId,
        trainerId: idOf(trainers[i % trainers.length]),
        title: `${pick(['Sunrise Yoga', 'HIIT', 'Boxing', 'Strength', 'Zumba'], i)} ${i + 1}`,
        description: 'Open session for members',
        type: pick(EVENT_TYPES, i),
        startAt,
        endAt: new Date(startAt.getTime() + 60 * 60 * 1000),
        location: i % 2 === 0 ? 'Main floor' : 'Studio',
        seatLimit: 12 + (i % 20),
        price: i % 4 === 0 ? 0 : 199 + i,
        isActive: true,
      };
    })
  );

  await EventBooking.insertMany(
    events.map((event, i) => ({
      gymId,
      eventId: idOf(event),
      memberId: idOf(members[i % members.length]),
      status: i % 5 === 0 ? 'waitlist' : 'confirmed',
      bookedAt: daysFromNow(-2),
    }))
  );

  await Banner.insertMany(
    Array.from({ length: PER_GYM }, (_, i) => ({
      gymId,
      tenantId,
      name: `Campaign ${pad(i + 1)}`,
      internalCode: `${slug}-ad-${i + 1}`,
      category: pick(BANNER_CATEGORY, i),
      placement: pick(BANNER_PLACEMENT, i),
      status: pick(BANNER_STATUS, i),
      startDate: daysFromNow(-10 + (i % 5)),
      endDate: daysFromNow(20 + i),
      ctaType: 'EXTERNAL_URL',
      ctaDestination: 'https://example.com/offer',
      impressions: 100 + i * 13,
      clicks: 10 + (i % 40),
      isActive: i % 6 !== 0,
      sortOrder: i,
      createdAt: daysFromNow(-30 + i),
    }))
  );

  const categories = await ProductCategory.insertMany(
    Array.from({ length: PER_GYM }, (_, i) => ({
      gymId,
      tenantId,
      name: `${pick(['Protein', 'Drinks', 'Apparel', 'Accessories', 'Snacks'], i)} ${pad(i + 1)}`,
    }))
  );

  const products = await Product.insertMany(
    Array.from({ length: PER_GYM }, (_, i) => ({
      gymId,
      tenantId,
      categoryId: idOf(categories[i % categories.length]),
      name: `${pick(['Whey', 'Shaker', 'Tee', 'Bar', 'Grip'], i)} ${pad(i + 1)}`,
      sku: `${slug.toUpperCase()}-${pad(i + 1)}`,
      price: 149 + i * 20,
      costPrice: 80 + i * 10,
      stockQty: 5 + (i % 40),
      isActive: i % 7 !== 0,
      createdAt: daysFromNow(-20 + (i % 10)),
    }))
  );

  const sales = await Sale.insertMany(
    Array.from({ length: PER_GYM }, (_, i) => ({
      gymId,
      tenantId,
      memberId: idOf(members[i % members.length]),
      orderNumber: `SO-${slug}-${String(i + 1).padStart(4, '0')}`,
      totalAmount: 199 + i * 15,
      taxAmount: 20 + i,
      status: i % 8 === 0 ? 'PENDING' : 'COMPLETED',
      fulfillmentStatus: pick(ORDER_STATUS, i),
      fulfillmentType: i % 2 === 0 ? 'PICKUP' : 'DELIVERY',
      soldAt: daysFromNow(-i),
      createdAt: daysFromNow(-i),
    }))
  );

  await SaleItem.insertMany(
    sales.map((sale, i) => ({
      gymId,
      saleId: idOf(sale),
      productId: idOf(products[i % products.length]),
      quantity: 1 + (i % 3),
      unitPrice: products[i % products.length].price,
      total: sale.totalAmount,
    }))
  );

  await Enquiry.insertMany(
    Array.from({ length: PER_GYM }, (_, i) => {
      const who = person(i + 11);
      return {
        tenantId,
        gymId,
        name: who.firstName,
        lastName: who.lastName,
        email: `lead.${slug}.${pad(i + 1)}@demo.com`,
        phone: `+9196${String(400000 + i).padStart(6, '0').slice(0, 6)}`,
        source: pick(SOURCES, i),
        interestedIn: pick(['Gym membership', 'Personal training', 'Yoga'], i),
        status: pick(LEAD_STATUS, i),
        notes: 'Asked for a trial session',
        assignedToId: idOf(staffUsers[i % staffUsers.length]),
        createdAt: daysFromNow(-i),
      };
    })
  );

  await Coupon.insertMany(
    Array.from({ length: PER_GYM }, (_, i) => ({
      gymId,
      code: `SAVE${pad(i + 1)}`,
      discountPct: 5 + (i % 20),
      maxUses: 50,
      usedCount: i % 10,
      validFrom: daysFromNow(-15),
      validUntil: daysFromNow(45),
      isActive: true,
    }))
  );

  await Offer.insertMany(
    Array.from({ length: PER_GYM }, (_, i) => ({
      gymId,
      title: `Offer ${pad(i + 1)}`,
      description: 'Limited sign-up discount',
      discountPct: 10 + (i % 15),
      validFrom: daysFromNow(-5),
      validUntil: daysFromNow(30),
      isActive: true,
    }))
  );

  await GymBranch.insertMany(
    Array.from({ length: PER_GYM }, (_, i) => ({
      gymId,
      tenantId,
      name: `Desk ${pad(i + 1)}`,
      address: `${i + 1} Branch Road, ${gym.city}`,
      phone: `+9195${String(500000 + i).padStart(6, '0').slice(0, 6)}`,
      isActive: i % 10 !== 0,
    }))
  );

  await GymChatMessage.insertMany(
    Array.from({ length: PER_GYM }, (_, i) => ({
      gymId,
      tenantId,
      senderId: i % 3 === 0 ? ownerId : idOf(staffUsers[i % staffUsers.length]),
      content: `Hello from ${gym.name}, message ${i + 1}`,
      isPinned: i < 2,
      createdAt: daysFromNow(-1, 9 + (i % 8)),
    }))
  );

  await DayPass.insertMany(
    Array.from({ length: 24 }, (_, i) => ({
      gymId,
      tenantId,
      guestName: `${pick(FIRST, i)} ${pick(LAST, i)}`,
      phone: `+9194${String(600000 + i).padStart(6, '0').slice(0, 6)}`,
      amount: 299,
      paid: i % 8 !== 0,
      validOn: daysFromNow(-i % 10),
      checkedInAt: i % 3 === 0 ? daysFromNow(-i % 10, 10) : null,
      notes: 'Walk-in day pass',
    }))
  );
};

const seed = async () => {
  await connectDb();
  console.log(`Clearing accounts and seeding ${PER_GYM} rows per gym (${PLANS_PER_GYM} membership plans each)...`);
  await Member.collection.dropIndex('userId_1').catch(() => {});
  await wipeAccounts();
  const plan = await seedCatalogAndRbac();

  const [adminPassword, ownerPassword, memberPassword, staffPassword] = await Promise.all([
    bcrypt.hash('Admin@123', 12),
    bcrypt.hash('Owner@123', 12),
    bcrypt.hash('Member@123', 12),
    bcrypt.hash('Staff@123', 12),
  ]);

  const admin = await User.create({
    email: 'superadmin@gymsaas.com',
    password: adminPassword,
    firstName: 'Super',
    lastName: 'Admin',
    role: ROLES.SUPER_ADMIN,
    status: USER_STATUS.ACTIVE,
    emailVerified: true,
  });

  const owner = await User.create({
    email: 'owner@demo.com',
    password: ownerPassword,
    firstName: 'Asha',
    lastName: 'Kapoor',
    phone: '+919999000111',
    role: ROLES.GYM_OWNER,
    status: USER_STATUS.ACTIVE,
    emailVerified: true,
  });

  const tenant = await Tenant.create({
    name: 'Iron District',
    slug: 'iron-district',
    email: 'owner@demo.com',
    phone: '+919999000111',
    ownerId: idOf(owner),
    isActive: true,
  });
  await User.findByIdAndUpdate(idOf(owner), { $set: { tenantId: idOf(tenant) } });

  const subscription = await Subscription.create({
    tenantId: idOf(tenant),
    planId: idOf(plan),
    status: 'ACTIVE',
    currentPeriodStart: daysFromNow(-15),
    currentPeriodEnd: daysFromNow(30),
  });

  await SaasPayment.insertMany(
    Array.from({ length: PER_GYM }, (_, i) => ({
      subscriptionId: idOf(subscription),
      tenantId: idOf(tenant),
      amount: i === 0 ? 1999 : 999,
      currency: 'INR',
      status: i % 12 === 0 ? 'PENDING' : 'COMPLETED',
      provider: 'razorpay',
      providerRef: `pay_platform_${i + 1}`,
      paidAt: daysFromNow(-i * 3),
      createdAt: daysFromNow(-i * 3),
    }))
  );

  const gymDefs = [
    { name: 'Iron District', slug: 'iron-district-main', city: CITIES[0], alias: 'iron-district' },
    { name: 'Iron North', slug: 'iron-north', city: CITIES[1], alias: 'iron-north' },
  ];

  const gyms = [];
  for (const def of gymDefs) {
    const gym = await Gym.create({
      tenantId: idOf(tenant),
      name: def.name,
      slug: def.slug,
      email: `${def.slug}@demo.com`,
      phone: '+919999000222',
      address: '12 Training Road',
      city: def.city,
      state: 'Maharashtra',
      country: 'India',
      pincode: '400001',
      appAlias: def.alias,
      appPublished: true,
      adsEnabled: true,
      appAds: { banners: true, video: true, audio: true },
      commercialAddons: { attendance: true, store: true, day_pass: true },
      dayPassPrice: 299,
      qrCodeSecret: `${def.slug}-qr`,
      primaryColor: '#C3F400',
      secondaryColor: '#0B0F0A',
      accentColor: '#FFFFFF',
      themeMode: 'dark',
      appTagline: 'Train harder.',
    });
    gyms.push(gym);
    await seedGym(tenant, gym, owner, { member: memberPassword, staff: staffPassword });
    console.log(`Seeded ${def.name}`);
  }

  const expires = daysFromNow(14);
  await GymInvite.create({
    email: owner.email,
    inviteeName: 'Asha Kapoor',
    businessName: tenant.name,
    token: 'inv-seed-iron-district',
    planId: idOf(plan),
    status: 'ACCEPTED',
    expiresAt: expires,
    sentAt: daysFromNow(-20),
    acceptedAt: daysFromNow(-18),
    createdById: idOf(admin),
    tenantId: idOf(tenant),
  });

  await GymInvite.insertMany(
    Array.from({ length: PER_GYM - 1 }, (_, i) => ({
      email: `invite.${pad(i + 1)}@mailinator.com`,
      inviteeName: `${pick(FIRST, i)} ${pick(LAST, i)}`,
      businessName: `${pick(['Pulse', 'Forge', 'Apex', 'Orbit'], i)} Gym ${pad(i + 1)}`,
      token: `inv-seed-${pad(i + 1)}-${i}`,
      planId: idOf(plan),
      status: i % 5 === 0 ? 'SENT' : i % 7 === 0 ? 'REVOKED' : 'PENDING',
      expiresAt: expires,
      sentAt: i % 5 === 0 ? daysFromNow(-i) : null,
      createdById: idOf(admin),
      createdAt: daysFromNow(-i),
    }))
  );

  await SupportTicket.insertMany(
    Array.from({ length: PER_GYM }, (_, i) => ({
      tenantId: idOf(tenant),
      userId: idOf(owner),
      category: pick(['GENERAL', 'BILLING_SUBSCRIPTION', 'TECHNICAL', 'FEATURE_REQUEST'], i),
      subject: `Help request ${pad(i + 1)}`,
      message: 'Need a hand with the gym account.',
      senderEmail: owner.email,
      senderName: 'Asha Kapoor',
      status: pick(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'], i),
      createdAt: daysFromNow(-i),
    }))
  );

  await Notification.insertMany(
    Array.from({ length: PER_GYM }, (_, i) => ({
      tenantId: idOf(tenant),
      userId: idOf(owner),
      channel: pick(['EMAIL', 'PUSH', 'SMS'], i),
      title: `Notice ${pad(i + 1)}`,
      message: 'A gym update is ready to review.',
      status: i % 4 === 0 ? 'PENDING' : 'SENT',
      sentAt: daysFromNow(-i),
      createdAt: daysFromNow(-i),
    }))
  );

  await AuditLog.insertMany(
    Array.from({ length: PER_GYM }, (_, i) => ({
      tenantId: idOf(tenant),
      userId: idOf(owner),
      action: pick(['member.created', 'payment.recorded', 'staff.updated'], i),
      entity: 'member',
      createdAt: daysFromNow(-i),
    }))
  );

  const [memberCount, planCount] = await Promise.all([
    Member.countDocuments(),
    GymMembershipPlan.countDocuments(),
  ]);
  console.log(`Done. ${gyms.length} gyms, ${memberCount} members, ${planCount} membership plans (${PLANS_PER_GYM} per gym).`);
  console.log('Super admin  superadmin@gymsaas.com  Admin@123');
  console.log('Gym owner    owner@demo.com          Owner@123');
  console.log('Member       member@demo.com         Member@123');
  console.log('Staff        staff.iron-district-main.01@demo.com  Staff@123');
};

seed()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => disconnectDb());
