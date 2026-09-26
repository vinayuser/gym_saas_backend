/**
 * Wipes gym accounts and fills one business with enough rows to page through lists.
 * Keeps subscription plans, roles, and the platform price catalog.
 *
 * Logins:
 *   superadmin@gymsaas.com / Admin@123
 *   owner@demo.com         / Owner@123
 *   member@demo.com        / Member@123
 *   staff.iron-district-main.01@demo.com / Staff@123
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
dotenv.config({ path: path.join(backendRoot, '.env') });

const prisma = new PrismaClient();
const PER_GYM = 60;

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
const CYCLES = [
  { cycle: 'MONTHLY', days: 30 },
  { cycle: 'QUARTERLY', days: 90 },
  { cycle: 'YEARLY', days: 365 },
];

const pad = (n) => String(n).padStart(2, '0');
const pick = (list, i) => list[i % list.length];
const daysFromNow = (days, hours = 8) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hours, (Math.abs(days) * 7) % 60, 0, 0);
  return d;
};

const person = (i) => ({
  firstName: pick(FIRST, i),
  lastName: pick(LAST, i + 3),
});

async function wipeAccounts() {
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "sale_items",
      "sales",
      "event_bookings",
      "events",
      "attendance",
      "body_measurements",
      "member_payments",
      "invoices",
      "memberships",
      "workout_plans",
      "diet_plans",
      "banners",
      "products",
      "product_categories",
      "coupons",
      "offers",
      "enquiries",
      "gym_chat_messages",
      "notifications",
      "audit_logs",
      "support_tickets",
      "gym_staff",
      "trainers",
      "user_role_assignments",
      "gym_branches",
      "gyms",
      "gym_invites",
      "saas_payments",
      "subscriptions",
      "members",
      "refresh_tokens",
      "password_resets",
      "otp_verifications",
      "tenants",
      "users"
    RESTART IDENTITY CASCADE
  `);
}

async function ensurePlans() {
  const plans = [
    { name: 'Single Gym', type: 'SINGLE_GYM', gymLimit: 1, priceMonthly: 1999, priceYearly: 19990 },
    { name: '2 Gyms', type: 'TWO_GYMS', gymLimit: 2, priceMonthly: 2998, priceYearly: 29980 },
    { name: '5 Gyms', type: 'FIVE_GYMS', gymLimit: 5, priceMonthly: 5995, priceYearly: 59950 },
    { name: 'Unlimited', type: 'UNLIMITED', gymLimit: 99, priceMonthly: 9999, priceYearly: 99990 },
  ];
  for (const plan of plans) {
    await prisma.subscriptionPlan.upsert({
      where: { type: plan.type },
      update: {},
      create: plan,
    });
  }
  return prisma.subscriptionPlan.findUnique({ where: { type: 'SINGLE_GYM' } });
}

async function seedGym(tenant, gym, owner, passwords) {
  const slug = gym.slug;
  const staffUsers = await prisma.user.createManyAndReturn({
    data: Array.from({ length: PER_GYM }, (_, i) => {
      const who = person(i);
      return {
        tenantId: tenant.id,
        email: `staff.${slug}.${pad(i + 1)}@demo.com`,
        password: passwords.staff,
        firstName: who.firstName,
        lastName: who.lastName,
        phone: `+91981${String(100000 + i).slice(0, 6)}${slug.length % 10}`,
        role: i === 0 ? 'MANAGER' : i % 5 === 0 ? 'RECEPTIONIST' : 'RECEPTIONIST',
        status: 'ACTIVE',
        emailVerified: true,
      };
    }),
  });

  await prisma.gymStaff.createMany({
    data: staffUsers.map((user, i) => ({
      gymId: gym.id,
      userId: user.id,
      designation: i === 0 ? 'Manager' : i % 4 === 0 ? 'Reception' : 'Floor staff',
      joinedAt: daysFromNow(-200 + i),
      isActive: i % 11 !== 0,
      employmentType: i % 3 === 0 ? 'full-time' : 'part-time',
      baseSalary: 18000 + i * 250,
    })),
  });

  const trainerUsers = await prisma.user.createManyAndReturn({
    data: Array.from({ length: PER_GYM }, (_, i) => {
      const who = person(i + 7);
      return {
        tenantId: tenant.id,
        email: `trainer.${slug}.${pad(i + 1)}@demo.com`,
        password: passwords.staff,
        firstName: who.firstName,
        lastName: who.lastName,
        phone: `+91982${String(200000 + i).slice(0, 6)}${slug.length % 10}`,
        role: 'TRAINER',
        status: 'ACTIVE',
        emailVerified: true,
      };
    }),
  });

  const trainers = await prisma.trainer.createManyAndReturn({
    data: trainerUsers.map((user, i) => ({
      gymId: gym.id,
      userId: user.id,
      bio: `${user.firstName} coaches group classes and personal training.`,
      specialties: [pick(['Strength', 'Yoga', 'HIIT', 'Boxing', 'Mobility'], i), pick(['Nutrition', 'Rehab', 'Weight loss'], i)],
      experience: (i % 12) + 1,
      isActive: i % 13 !== 0,
    })),
  });

  const memberRows = Array.from({ length: PER_GYM }, (_, i) => {
    const who = person(i + 2);
    const email = i === 0 && slug === 'iron-district' ? 'member@demo.com' : `member.${slug}.${pad(i + 1)}@demo.com`;
    return { who, email, i };
  });

  const memberLogins = [];
  if (slug === 'iron-district') {
    const login = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: 'member@demo.com',
        password: passwords.member,
        firstName: memberRows[0].who.firstName,
        lastName: memberRows[0].who.lastName,
        phone: '+919800000001',
        role: 'MEMBER',
        status: 'ACTIVE',
        emailVerified: true,
      },
    });
    memberLogins.push(login);
  }

  const members = await prisma.member.createManyAndReturn({
    data: memberRows.map(({ who, email, i }) => ({
      gymId: gym.id,
      userId: email === 'member@demo.com' ? memberLogins[0].id : null,
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
    })),
  });

  const plans = await prisma.gymMembershipPlan.createManyAndReturn({
    data: Array.from({ length: PER_GYM }, (_, i) => {
      const cycle = pick(CYCLES, i);
      return {
        gymId: gym.id,
        name: `${pick(['Starter', 'Pulse', 'Athlete', 'Elite'], i)} ${i + 1}`,
        description: `${cycle.cycle.toLowerCase()} access`,
        billingCycle: cycle.cycle,
        price: 999 + i * 50,
        durationDays: cycle.days,
        isActive: i % 8 !== 0,
        createdAt: daysFromNow(-90 + i),
      };
    }),
  });

  const memberships = await prisma.membership.createManyAndReturn({
    data: members.map((member, i) => {
      const plan = plans[i % plans.length];
      const start = daysFromNow(-40 + (i % 20));
      const end = new Date(start);
      end.setDate(end.getDate() + plan.durationDays);
      return {
        gymId: gym.id,
        memberId: member.id,
        planId: plan.id,
        status: i % 10 === 0 ? 'EXPIRED' : i % 7 === 0 ? 'PENDING' : 'ACTIVE',
        startDate: start,
        endDate: end,
        amountPaid: Number(plan.price),
        createdAt: start,
      };
    }),
  });

  await prisma.memberPayment.createMany({
    data: memberships.map((membership, i) => ({
      membershipId: membership.id,
      amount: Number(membership.amountPaid || 999),
      status: pick(PAY_STATUS, i),
      method: pick(['upi', 'cash', 'card'], i),
      providerRef: `pay_${slug}_${i + 1}`,
      paidAt: daysFromNow(-i),
      createdAt: daysFromNow(-i),
    })),
  });

  await prisma.invoice.createMany({
    data: memberships.map((membership, i) => {
      const amount = Number(membership.amountPaid || 999);
      const tax = Math.round(amount * 0.18);
      return {
        gymId: gym.id,
        membershipId: membership.id,
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
    }),
  });

  await prisma.attendance.createMany({
    data: members.map((member, i) => ({
      gymId: gym.id,
      memberId: member.id,
      type: 'CHECK_IN',
      source: pick(ATTENDANCE_SOURCE, i),
      checkInAt: daysFromNow(-i, 6 + (i % 10)),
      checkOutAt: i % 3 === 0 ? null : daysFromNow(-i, 8 + (i % 10)),
      isLate: i % 6 === 0,
    })),
  });

  await prisma.bodyMeasurement.createMany({
    data: members.map((member, i) => ({
      memberId: member.id,
      weight: 55 + (i % 30),
      height: 155 + (i % 30),
      bodyFat: 12 + (i % 15),
      notes: 'Seed measurement',
      measuredAt: daysFromNow(-i),
    })),
  });

  await prisma.workoutPlan.createMany({
    data: members.map((member, i) => ({
      memberId: member.id,
      trainerId: trainers[i % trainers.length].id,
      title: `Week plan ${i + 1}`,
      description: 'Push, pull, and conditioning',
      exercises: [{ name: 'Squat', sets: 4 }, { name: 'Row', sets: 3 }],
      startDate: daysFromNow(-14),
      endDate: daysFromNow(14),
      isActive: true,
    })),
  });

  await prisma.dietPlan.createMany({
    data: members.map((member, i) => ({
      memberId: member.id,
      title: `Meal plan ${i + 1}`,
      description: 'High protein day',
      meals: [{ name: 'Breakfast', note: 'Eggs and oats' }],
      startDate: daysFromNow(-7),
      isActive: true,
    })),
  });

  const events = await prisma.event.createManyAndReturn({
    data: Array.from({ length: PER_GYM }, (_, i) => {
      const startAt = daysFromNow(i - 25, 6 + (i % 8));
      const endAt = new Date(startAt.getTime() + 60 * 60 * 1000);
      return {
        gymId: gym.id,
        trainerId: trainers[i % trainers.length].id,
        title: `${pick(['Sunrise Yoga', 'HIIT', 'Boxing', 'Strength', 'Zumba'], i)} ${i + 1}`,
        description: 'Open session for members',
        type: pick(EVENT_TYPES, i),
        startAt,
        endAt,
        location: i % 2 === 0 ? 'Main floor' : 'Studio',
        seatLimit: 12 + (i % 20),
        price: i % 4 === 0 ? 0 : 199 + i,
        isActive: true,
      };
    }),
  });

  await prisma.eventBooking.createMany({
    data: events.map((event, i) => ({
      eventId: event.id,
      memberId: members[i % members.length].id,
      status: i % 5 === 0 ? 'waitlist' : 'confirmed',
      bookedAt: daysFromNow(-2),
    })),
  });

  await prisma.banner.createMany({
    data: Array.from({ length: PER_GYM }, (_, i) => ({
      gymId: gym.id,
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
    })),
  });

  const categories = await prisma.productCategory.createManyAndReturn({
    data: Array.from({ length: PER_GYM }, (_, i) => ({
      gymId: gym.id,
      name: pick(['Protein', 'Drinks', 'Apparel', 'Accessories', 'Snacks'], i) + ` ${pad(i + 1)}`,
    })),
  });

  const products = await prisma.product.createManyAndReturn({
    data: Array.from({ length: PER_GYM }, (_, i) => ({
      gymId: gym.id,
      categoryId: categories[i % categories.length].id,
      name: `${pick(['Whey', 'Shaker', 'Tee', 'Bar', 'Grip'], i)} ${pad(i + 1)}`,
      sku: `${slug.toUpperCase()}-${pad(i + 1)}`,
      price: 149 + i * 20,
      costPrice: 80 + i * 10,
      stockQty: 5 + (i % 40),
      isActive: i % 7 !== 0,
      createdAt: daysFromNow(-20 + (i % 10)),
    })),
  });

  const sales = await prisma.sale.createManyAndReturn({
    data: Array.from({ length: PER_GYM }, (_, i) => ({
      gymId: gym.id,
      memberId: members[i % members.length].id,
      orderNumber: `SO-${slug}-${String(i + 1).padStart(4, '0')}`,
      totalAmount: 199 + i * 15,
      taxAmount: 20 + i,
      status: i % 8 === 0 ? 'PENDING' : 'COMPLETED',
      fulfillmentStatus: pick(ORDER_STATUS, i),
      fulfillmentType: i % 2 === 0 ? 'PICKUP' : 'DELIVERY',
      soldAt: daysFromNow(-i),
      createdAt: daysFromNow(-i),
    })),
  });

  await prisma.saleItem.createMany({
    data: sales.map((sale, i) => ({
      saleId: sale.id,
      productId: products[i % products.length].id,
      quantity: 1 + (i % 3),
      unitPrice: Number(products[i % products.length].price),
      total: Number(sale.totalAmount),
    })),
  });

  await prisma.enquiry.createMany({
    data: Array.from({ length: PER_GYM }, (_, i) => {
      const who = person(i + 11);
      return {
        tenantId: tenant.id,
        gymId: gym.id,
        name: who.firstName,
        lastName: who.lastName,
        email: `lead.${slug}.${pad(i + 1)}@demo.com`,
        phone: `+9196${String(400000 + i).padStart(6, '0').slice(0, 6)}`,
        source: pick(SOURCES, i),
        interestedIn: pick(['Gym membership', 'Personal training', 'Yoga'], i),
        status: pick(LEAD_STATUS, i),
        notes: 'Asked for a trial session',
        assignedToId: staffUsers[i % staffUsers.length].id,
        createdAt: daysFromNow(-i),
      };
    }),
  });

  await prisma.coupon.createMany({
    data: Array.from({ length: PER_GYM }, (_, i) => ({
      gymId: gym.id,
      code: `SAVE${pad(i + 1)}`,
      discountPct: 5 + (i % 20),
      maxUses: 50,
      usedCount: i % 10,
      validFrom: daysFromNow(-15),
      validUntil: daysFromNow(45),
      isActive: true,
    })),
  });

  await prisma.offer.createMany({
    data: Array.from({ length: PER_GYM }, (_, i) => ({
      gymId: gym.id,
      title: `Offer ${pad(i + 1)}`,
      description: 'Limited sign-up discount',
      discountPct: 10 + (i % 15),
      validFrom: daysFromNow(-5),
      validUntil: daysFromNow(30),
      isActive: true,
    })),
  });

  await prisma.gymBranch.createMany({
    data: Array.from({ length: PER_GYM }, (_, i) => ({
      gymId: gym.id,
      name: `Desk ${pad(i + 1)}`,
      address: `${i + 1} Branch Road, ${gym.city}`,
      phone: `+9195${String(500000 + i).padStart(6, '0').slice(0, 6)}`,
      isActive: i % 10 !== 0,
    })),
  });

  await prisma.gymChatMessage.createMany({
    data: Array.from({ length: PER_GYM }, (_, i) => ({
      gymId: gym.id,
      senderId: i % 3 === 0 ? owner.id : staffUsers[i % staffUsers.length].id,
      content: `Hello from ${gym.name}, message ${i + 1}`,
      isPinned: i < 2,
      createdAt: daysFromNow(-1, 9 + (i % 8)),
    })),
  });
}

async function main() {
  console.log(`Clearing accounts and seeding ${PER_GYM} rows per gym...`);
  await wipeAccounts();
  const plan = await ensurePlans();

  const adminPassword = await bcrypt.hash('Admin@123', 12);
  const ownerPassword = await bcrypt.hash('Owner@123', 12);
  const memberPassword = await bcrypt.hash('Member@123', 12);
  const staffPassword = await bcrypt.hash('Staff@123', 12);

  const admin = await prisma.user.create({
    data: {
      email: 'superadmin@gymsaas.com',
      password: adminPassword,
      firstName: 'Super',
      lastName: 'Admin',
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      emailVerified: true,
    },
  });

  const owner = await prisma.user.create({
    data: {
      email: 'owner@demo.com',
      password: ownerPassword,
      firstName: 'Asha',
      lastName: 'Kapoor',
      phone: '+919999000111',
      role: 'GYM_OWNER',
      status: 'ACTIVE',
      emailVerified: true,
    },
  });

  const tenant = await prisma.tenant.create({
    data: {
      name: 'Iron District',
      slug: 'iron-district',
      email: 'owner@demo.com',
      phone: '+919999000111',
      ownerId: owner.id,
      isActive: true,
    },
  });

  await prisma.user.update({ where: { id: owner.id }, data: { tenantId: tenant.id } });

  const periodEnd = daysFromNow(30);
  const subscription = await prisma.subscription.create({
    data: {
      tenantId: tenant.id,
      planId: plan.id,
      status: 'ACTIVE',
      currentPeriodStart: daysFromNow(-15),
      currentPeriodEnd: periodEnd,
    },
  });

  await prisma.saasPayment.createMany({
    data: Array.from({ length: PER_GYM }, (_, i) => ({
      subscriptionId: subscription.id,
      amount: i === 0 ? 1999 : 999,
      currency: 'INR',
      status: i % 12 === 0 ? 'PENDING' : 'COMPLETED',
      provider: 'razorpay',
      providerRef: `pay_platform_${i + 1}`,
      paidAt: daysFromNow(-i * 3),
      createdAt: daysFromNow(-i * 3),
    })),
  });

  const gyms = [];
  const gymDefs = [
    { name: 'Iron District', slug: 'iron-district-main', city: CITIES[0], alias: 'iron-district' },
    { name: 'Iron North', slug: 'iron-north', city: CITIES[1], alias: 'iron-north' },
  ];

  for (const def of gymDefs) {
    const gym = await prisma.gym.create({
      data: {
        tenantId: tenant.id,
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
        commercialAddons: { attendance: true, store: true, day_pass: true },
        dayPassPrice: 299,
        qrCodeSecret: `${def.slug}-qr`,
        primaryColor: '#C3F400',
        secondaryColor: '#0B0F0A',
        accentColor: '#FFFFFF',
        themeMode: 'dark',
        appTagline: 'Train harder.',
      },
    });
    gyms.push(gym);
    await seedGym(tenant, gym, owner, { member: memberPassword, staff: staffPassword });
    console.log(`Seeded ${def.name}`);
  }

  const expires = daysFromNow(14);
  await prisma.gymInvite.create({
    data: {
      email: owner.email,
      inviteeName: 'Asha Kapoor',
      businessName: tenant.name,
      token: 'inv-seed-iron-district',
      planId: plan.id,
      status: 'ACCEPTED',
      expiresAt: expires,
      sentAt: daysFromNow(-20),
      acceptedAt: daysFromNow(-18),
      createdById: admin.id,
      tenantId: tenant.id,
    },
  });

  await prisma.gymInvite.createMany({
    data: Array.from({ length: PER_GYM - 1 }, (_, i) => ({
      email: `invite.${pad(i + 1)}@mailinator.com`,
      inviteeName: `${pick(FIRST, i)} ${pick(LAST, i)}`,
      businessName: `${pick(['Pulse', 'Forge', 'Apex', 'Orbit'], i)} Gym ${pad(i + 1)}`,
      token: `inv-seed-${pad(i + 1)}-${i}`,
      planId: plan.id,
      status: i % 5 === 0 ? 'SENT' : i % 7 === 0 ? 'REVOKED' : 'PENDING',
      expiresAt: expires,
      sentAt: i % 5 === 0 ? daysFromNow(-i) : null,
      createdById: admin.id,
      createdAt: daysFromNow(-i),
    })),
  });

  await prisma.supportTicket.createMany({
    data: Array.from({ length: PER_GYM }, (_, i) => ({
      tenantId: tenant.id,
      userId: owner.id,
      category: pick(['GENERAL', 'BILLING_SUBSCRIPTION', 'TECHNICAL', 'FEATURE_REQUEST'], i),
      subject: `Help request ${pad(i + 1)}`,
      message: 'Need a hand with the gym account.',
      senderEmail: owner.email,
      senderName: 'Asha Kapoor',
      status: pick(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'], i),
      createdAt: daysFromNow(-i),
    })),
  });

  await prisma.notification.createMany({
    data: Array.from({ length: PER_GYM }, (_, i) => ({
      tenantId: tenant.id,
      userId: owner.id,
      channel: pick(['EMAIL', 'PUSH', 'SMS'], i),
      title: `Notice ${pad(i + 1)}`,
      message: 'A gym update is ready to review.',
      status: i % 4 === 0 ? 'PENDING' : 'SENT',
      sentAt: daysFromNow(-i),
      createdAt: daysFromNow(-i),
    })),
  });

  await prisma.auditLog.createMany({
    data: Array.from({ length: PER_GYM }, (_, i) => ({
      tenantId: tenant.id,
      userId: owner.id,
      action: pick(['member.created', 'payment.recorded', 'staff.updated'], i),
      entity: 'member',
      createdAt: daysFromNow(-i),
    })),
  });

  const memberCount = await prisma.member.count();
  console.log(`Done. ${gyms.length} gyms, ${memberCount} members, ${PER_GYM} rows in each list per gym.`);
  console.log('Super admin  superadmin@gymsaas.com  Admin@123');
  console.log('Gym owner    owner@demo.com          Owner@123');
  console.log('Member       member@demo.com         Member@123');
  console.log('Staff        staff.iron-district-main.01@demo.com  Staff@123');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
