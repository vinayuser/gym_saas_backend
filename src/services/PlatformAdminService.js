import prisma from '../config/database.js';
import { hashPassword } from '../utils/password.js';
import { BadRequestError, ConflictError, NotFoundError } from '../utils/errors.js';
import {
  PLATFORM_PERMISSIONS,
  PLATFORM_PERMISSION_SLUGS,
  expandPlatformPermissions,
} from '../constants/platformPermissions.js';

const slugify = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 48);

export const ensurePlatformPermissions = async () => {
  for (const item of PLATFORM_PERMISSIONS) {
    await prisma.permission.upsert({
      where: { slug: item.slug },
      update: { name: item.name, module: item.module, description: item.description, scope: 'platform' },
      create: { ...item, scope: 'platform' },
    });
  }
};

export const permissionSlugsForUser = async (user) => {
  if (!user) return [];
  if (user.role === 'SUPER_ADMIN') return [...PLATFORM_PERMISSION_SLUGS];
  if (user.role !== 'PLATFORM_ADMIN') return [];

  const assignments = await prisma.userRoleAssignment.findMany({
    where: { userId: user.id, role: { scope: 'platform' } },
    include: { role: { include: { permissions: { include: { permission: true } } } } },
  });

  const slugs = [];
  for (const assignment of assignments) {
    for (const link of assignment.role.permissions) {
      if (link.permission.scope === 'platform') slugs.push(link.permission.slug);
    }
  }
  return [...expandPlatformPermissions(slugs)];
};

const mapRole = (role) => ({
  id: role.id,
  name: role.name,
  slug: role.slug,
  description: role.description || '',
  userCount: role._count?.users || 0,
  permissionIds: role.permissions.map((link) => link.permissionId),
});

const platformPermissions = async () => {
  await ensurePlatformPermissions();
  return prisma.permission.findMany({
    where: { scope: 'platform' },
    orderBy: [{ module: 'asc' }, { name: 'asc' }],
  });
};

const assertPlatformPermissionIds = async (permissionIds) => {
  const rows = await prisma.permission.findMany({
    where: { id: { in: permissionIds }, scope: 'platform' },
    select: { id: true },
  });
  if (rows.length !== permissionIds.length) {
    throw new BadRequestError('Choose platform permissions only');
  }
  return rows.map((row) => row.id);
};

export const listTeam = async () => {
  const [roles, permissions, admins] = await Promise.all([
    prisma.role.findMany({
      where: { scope: 'platform' },
      include: { permissions: true, _count: { select: { users: true } } },
      orderBy: { name: 'asc' },
    }),
    platformPermissions(),
    prisma.user.findMany({
      where: { role: 'PLATFORM_ADMIN', deletedAt: null },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        status: true,
        createdAt: true,
        roleAssignments: {
          where: { role: { scope: 'platform' } },
          select: { roleId: true, role: { select: { id: true, name: true } } },
        },
      },
    }),
  ]);

  return {
    roles: roles.map(mapRole),
    permissions,
    admins: admins.map((admin) => ({
      id: admin.id,
      email: admin.email,
      firstName: admin.firstName,
      lastName: admin.lastName,
      phone: admin.phone,
      status: admin.status,
      createdAt: admin.createdAt,
      roleId: admin.roleAssignments[0]?.roleId || null,
      roleName: admin.roleAssignments[0]?.role?.name || 'No role',
    })),
  };
};

const uniqueSlug = async (name) => {
  const base = `platform-${slugify(name) || 'role'}`;
  let slug = base;
  let n = 2;
  while (await prisma.role.findUnique({ where: { slug } })) {
    slug = `${base}-${n}`;
    n += 1;
  }
  return slug;
};

export const createRole = async ({ name, description, permissionIds }) => {
  const cleanName = name.trim();
  const ids = await assertPlatformPermissionIds(permissionIds || []);
  try {
    const role = await prisma.role.create({
      data: {
        name: cleanName,
        slug: await uniqueSlug(cleanName),
        description: description?.trim() || null,
        scope: 'platform',
        isSystem: false,
        permissions: { create: ids.map((permissionId) => ({ permissionId })) },
      },
      include: { permissions: true, _count: { select: { users: true } } },
    });
    return mapRole(role);
  } catch (err) {
    if (err.code === 'P2002') throw new ConflictError('A role with this name already exists');
    throw err;
  }
};

export const updateRole = async (roleId, { name, description, permissionIds }) => {
  const role = await prisma.role.findFirst({ where: { id: roleId, scope: 'platform' } });
  if (!role) throw new NotFoundError('Role not found');
  const ids = await assertPlatformPermissionIds(permissionIds || []);

  await prisma.$transaction([
    prisma.role.update({
      where: { id: roleId },
      data: {
        name: name.trim(),
        description: description?.trim() || null,
      },
    }),
    prisma.rolePermission.deleteMany({ where: { roleId } }),
    prisma.rolePermission.createMany({
      data: ids.map((permissionId) => ({ roleId, permissionId })),
      skipDuplicates: true,
    }),
  ]);

  const updated = await prisma.role.findUnique({
    where: { id: roleId },
    include: { permissions: true, _count: { select: { users: true } } },
  });
  return mapRole(updated);
};

export const deleteRole = async (roleId) => {
  const role = await prisma.role.findFirst({
    where: { id: roleId, scope: 'platform' },
    include: { _count: { select: { users: true } } },
  });
  if (!role) throw new NotFoundError('Role not found');
  if (role._count.users > 0) {
    throw new BadRequestError('Move sub-admins off this role before deleting it');
  }
  await prisma.role.delete({ where: { id: roleId } });
};

const assertPlatformRole = async (roleId) => {
  const role = await prisma.role.findFirst({ where: { id: roleId, scope: 'platform' } });
  if (!role) throw new NotFoundError('Role not found');
  return role;
};

export const createAdmin = async ({ firstName, lastName, email, password, phone, roleId }) => {
  await assertPlatformRole(roleId);
  const normalized = email.trim().toLowerCase();
  const existing = await prisma.user.findFirst({
    where: { email: normalized, tenantId: null, deletedAt: null },
  });
  if (existing) throw new ConflictError('An account with this email already exists');

  const hashed = await hashPassword(password);
  const admin = await prisma.user.create({
    data: {
      email: normalized,
      password: hashed,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone?.trim() || null,
      role: 'PLATFORM_ADMIN',
      status: 'ACTIVE',
      emailVerified: true,
      roleAssignments: { create: { roleId } },
    },
    select: { id: true, email: true, firstName: true, lastName: true, status: true },
  });
  return admin;
};

export const updateAdmin = async (userId, { roleId, status, password }) => {
  const admin = await prisma.user.findFirst({
    where: { id: userId, role: 'PLATFORM_ADMIN', deletedAt: null },
  });
  if (!admin) throw new NotFoundError('Sub-admin not found');

  if (roleId) await assertPlatformRole(roleId);

  const data = {};
  if (status) data.status = status;
  if (password) data.password = await hashPassword(password);

  await prisma.$transaction(async (tx) => {
    if (Object.keys(data).length) {
      await tx.user.update({ where: { id: userId }, data });
    }
    if (roleId) {
      await tx.userRoleAssignment.deleteMany({
        where: { userId, role: { scope: 'platform' } },
      });
      await tx.userRoleAssignment.create({ data: { userId, roleId } });
    }
  });

  return { id: userId };
};
