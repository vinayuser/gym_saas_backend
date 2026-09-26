import prisma from '../config/database.js';
import { NotFoundError } from '../utils/errors.js';

const DEFAULT_GRANTS = {
  super_admin: '*',
  'super-admin': '*',
  gym_owner: '*',
  'gym-owner': '*',
  manager: [
    'gym:read',
    'gym:update',
    'member:create',
    'member:read',
    'member:update',
    'attendance:read',
    'attendance:write',
    'reports:read',
  ],
  receptionist: [
    'gym:read',
    'member:create',
    'member:read',
    'member:update',
    'attendance:read',
    'attendance:write',
  ],
  trainer: ['gym:read', 'member:read', 'attendance:read'],
  member: ['member:read'],
};

const ROLE_DESCRIPTIONS = {
  super_admin: 'Full platform access: tenants, billing, invites, and every gym.',
  'super-admin': 'Full platform access: tenants, billing, invites, and every gym.',
  gym_owner: 'Full control of their own gyms, members, staff, and finances.',
  'gym-owner': 'Full control of their own gyms, members, staff, and finances.',
  manager: 'Runs daily operations. Cannot delete the gym or manage platform billing.',
  receptionist: 'Front desk access for members, attendance, and check-in.',
  trainer: 'Can view members and record attendance for their sessions.',
  member: 'Member access only. No owner dashboard.',
};

const ensureAssignments = async () => {
  const linkCount = await prisma.rolePermission.count();
  if (linkCount > 0) return;

  const [roles, permissions] = await Promise.all([
    prisma.role.findMany(),
    prisma.permission.findMany(),
  ]);
  const bySlug = Object.fromEntries(permissions.map((item) => [item.slug, item.id]));

  for (const role of roles) {
    const grants = DEFAULT_GRANTS[role.slug];
    const ids =
      grants === '*'
        ? permissions.map((item) => item.id)
        : (grants || []).map((slug) => bySlug[slug]).filter(Boolean);
    if (!ids.length) continue;
    await prisma.rolePermission.createMany({
      data: ids.map((permissionId) => ({ roleId: role.id, permissionId })),
      skipDuplicates: true,
    });
  }
};

const mapRole = (role) => ({
  id: role.id,
  name: role.name,
  slug: role.slug,
  description: role.description || ROLE_DESCRIPTIONS[role.slug] || '',
  isSystem: role.isSystem,
  permissionIds: role.permissions.map((link) => link.permissionId),
});

export const listRoles = async () => {
  await ensureAssignments();
  const [roles, permissions] = await Promise.all([
    prisma.role.findMany({
      include: { permissions: true },
      orderBy: { name: 'asc' },
    }),
    prisma.permission.findMany({ orderBy: [{ module: 'asc' }, { name: 'asc' }] }),
  ]);

  return {
    roles: roles.map(mapRole),
    permissions,
  };
};

export const setRolePermission = async (roleId, permissionId, enabled) => {
  const role = await prisma.role.findUnique({ where: { id: roleId } });
  const permission = await prisma.permission.findUnique({ where: { id: permissionId } });
  if (!role || !permission) throw new NotFoundError('Role or permission not found');

  if (enabled) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId, permissionId } },
      update: {},
      create: { roleId, permissionId },
    });
  } else {
    await prisma.rolePermission.deleteMany({ where: { roleId, permissionId } });
  }

  const updated = await prisma.role.findUnique({
    where: { id: roleId },
    include: { permissions: true },
  });
  return mapRole(updated);
};
