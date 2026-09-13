import { PrismaClient, UserRole, SubscriptionPlanType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const plans = [
    { name: 'Single Gym', type: SubscriptionPlanType.SINGLE_GYM, gymLimit: 1, priceMonthly: 999, priceYearly: 9999 },
    { name: '2 Gyms', type: SubscriptionPlanType.TWO_GYMS, gymLimit: 2, priceMonthly: 1799, priceYearly: 17999 },
    { name: '5 Gyms', type: SubscriptionPlanType.FIVE_GYMS, gymLimit: 5, priceMonthly: 3999, priceYearly: 39999 },
    { name: 'Unlimited', type: SubscriptionPlanType.UNLIMITED, gymLimit: -1, priceMonthly: 7999, priceYearly: 79999 },
  ];

  for (const plan of plans) {
    await prisma.subscriptionPlan.upsert({
      where: { type: plan.type },
      update: plan,
      create: plan,
    });
  }

  const permissions = [
    { name: 'Create Gym', slug: 'gym:create', module: 'gym' },
    { name: 'Read Gym', slug: 'gym:read', module: 'gym' },
    { name: 'Update Gym', slug: 'gym:update', module: 'gym' },
    { name: 'Delete Gym', slug: 'gym:delete', module: 'gym' },
    { name: 'Create Member', slug: 'member:create', module: 'member' },
    { name: 'Read Member', slug: 'member:read', module: 'member' },
    { name: 'Update Member', slug: 'member:update', module: 'member' },
    { name: 'Delete Member', slug: 'member:delete', module: 'member' },
    { name: 'Read Attendance', slug: 'attendance:read', module: 'attendance' },
    { name: 'Write Attendance', slug: 'attendance:write', module: 'attendance' },
    { name: 'Read Reports', slug: 'reports:read', module: 'reports' },
    { name: 'Manage Billing', slug: 'billing:manage', module: 'billing' },
  ];

  for (const perm of permissions) {
    await prisma.permission.upsert({
      where: { slug: perm.slug },
      update: perm,
      create: perm,
    });
  }

  const roles = [
    { name: 'Super Admin', slug: 'super_admin', isSystem: true },
    { name: 'Gym Owner', slug: 'gym_owner', isSystem: true },
    { name: 'Manager', slug: 'manager', isSystem: true },
    { name: 'Receptionist', slug: 'receptionist', isSystem: true },
    { name: 'Trainer', slug: 'trainer', isSystem: true },
    { name: 'Member', slug: 'member', isSystem: true },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { slug: role.slug },
      update: role,
      create: role,
    });
  }

  const hashedPassword = await bcrypt.hash('Admin@123', 12);

  let superAdmin = await prisma.user.findFirst({
    where: { email: 'superadmin@gymsaas.com', tenantId: null },
  });

  if (!superAdmin) {
    superAdmin = await prisma.user.create({
      data: {
        email: 'superadmin@gymsaas.com',
        password: hashedPassword,
        firstName: 'Super',
        lastName: 'Admin',
        role: UserRole.SUPER_ADMIN,
        status: 'ACTIVE',
        emailVerified: true,
      },
    });
  }

  const singlePlan = await prisma.subscriptionPlan.findUnique({
    where: { type: SubscriptionPlanType.SINGLE_GYM },
  });

  const ownerPassword = await bcrypt.hash('Owner@123', 12);
  let owner = await prisma.user.findFirst({
    where: { email: 'owner@demo.com' },
  });

  if (!owner) {
    owner = await prisma.user.create({
      data: {
        email: 'owner@demo.com',
        password: ownerPassword,
        firstName: 'Demo',
        lastName: 'Owner',
        phone: '+919999999999',
        role: UserRole.GYM_OWNER,
        status: 'ACTIVE',
        emailVerified: true,
      },
    });

    const tenant = await prisma.tenant.create({
      data: {
        name: 'Demo Fitness Group',
        slug: 'demo-fitness',
        email: 'owner@demo.com',
        phone: '+919999999999',
        ownerId: owner.id,
      },
    });

    await prisma.user.update({
      where: { id: owner.id },
      data: { tenantId: tenant.id },
    });

    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 14);

    await prisma.subscription.create({
      data: {
        tenantId: tenant.id,
        planId: singlePlan.id,
        status: 'TRIAL',
        trialEndsAt: trialEnd,
        currentPeriodStart: new Date(),
        currentPeriodEnd: trialEnd,
      },
    });

    const gym = await prisma.gym.create({
      data: {
        tenantId: tenant.id,
        name: 'Demo Gym Downtown',
        slug: 'demo-downtown',
        email: 'downtown@demo.com',
        phone: '+919999999998',
        address: '123 Fitness Street',
        city: 'Mumbai',
        state: 'Maharashtra',
        country: 'India',
        pincode: '400001',
        qrCodeSecret: 'demo-secret-key',
        primaryColor: '#C3F400',
        secondaryColor: '#0B0F0A',
        accentColor: '#FFFFFF',
        themeMode: 'dark',
        appTagline: 'Train harder. Live stronger.',
        operatingHours: {
          monday: { open: '06:00', close: '22:00' },
          tuesday: { open: '06:00', close: '22:00' },
          wednesday: { open: '06:00', close: '22:00' },
          thursday: { open: '06:00', close: '22:00' },
          friday: { open: '06:00', close: '22:00' },
          saturday: { open: '08:00', close: '20:00' },
          sunday: { open: '08:00', close: '18:00' },
        },
      },
    });

    const memberPassword = await bcrypt.hash('Member@123', 12);
    const memberUser = await prisma.user.create({
      data: {
        email: 'member@demo.com',
        password: memberPassword,
        firstName: 'John',
        lastName: 'Doe',
        phone: '+919888888888',
        role: UserRole.MEMBER,
        status: 'ACTIVE',
        emailVerified: true,
        tenantId: tenant.id,
      },
    });

    await prisma.member.create({
      data: {
        gymId: gym.id,
        userId: memberUser.id,
        memberCode: 'M00001',
        firstName: 'John',
        lastName: 'Doe',
        email: 'member@demo.com',
        phone: '+919888888888',
        gender: 'male',
        fitnessGoals: 'Weight loss and muscle gain',
        qrCode: 'M00001',
      },
    });

    console.log('Demo tenant, gym, owner, and member created');
  } else {
    // Ensure branding + member login exist for already-seeded DBs
    const tenant = await prisma.tenant.findFirst({ where: { slug: 'demo-fitness' } });
    const gym = await prisma.gym.findFirst({ where: { slug: 'demo-downtown' } });
    if (gym) {
      await prisma.gym.update({
        where: { id: gym.id },
        data: {
          primaryColor: gym.primaryColor || '#C3F400',
          secondaryColor: gym.secondaryColor || '#0B0F0A',
          accentColor: gym.accentColor || '#FFFFFF',
          themeMode: gym.themeMode || 'dark',
          appTagline: gym.appTagline || 'Train harder. Live stronger.',
        },
      });
    }

    let memberUser = await prisma.user.findFirst({ where: { email: 'member@demo.com' } });
    if (!memberUser && gym && tenant) {
      const memberPassword = await bcrypt.hash('Member@123', 12);
      memberUser = await prisma.user.create({
        data: {
          email: 'member@demo.com',
          password: memberPassword,
          firstName: 'John',
          lastName: 'Doe',
          phone: '+919888888888',
          role: UserRole.MEMBER,
          status: 'ACTIVE',
          emailVerified: true,
          tenantId: tenant.id,
        },
      });
      const existingMember = await prisma.member.findFirst({
        where: { gymId: gym.id, memberCode: 'M00001' },
      });
      if (existingMember) {
        await prisma.member.update({
          where: { id: existingMember.id },
          data: { userId: memberUser.id, email: 'member@demo.com', qrCode: 'M00001' },
        });
      }
    }
  }

  console.log('Seed completed');
  console.log('Super Admin: superadmin@gymsaas.com / Admin@123');
  console.log('Gym Owner:   owner@demo.com / Owner@123');
  console.log('Member:      member@demo.com / Member@123');
  console.log('Gym slug:    demo-downtown');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
