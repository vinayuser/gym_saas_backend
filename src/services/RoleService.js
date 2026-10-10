import { Role, Permission, RolePermission } from '../schemas/index.js';
import { asDoc } from '../helpers/document.js';
import { COLLECTIONS } from '../helpers/constants.js';
import { rolePublic, permissionPublic } from '../projections/invite.projection.js';
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

const roleLookups = [
  {
    $lookup: {
      from: COLLECTIONS.ROLE_PERMISSIONS,
      let: { rid: '$_id' },
      pipeline: [
        { $match: { $expr: { $eq: ['$roleId', '$$rid'] } } },
        { $project: { _id: 0, id: '$_id', permissionId: 1 } },
      ],
      as: 'permissions',
    },
  },
];

const ensureAssignments = async () => {
  const linkCount = await RolePermission.countDocuments();
  if (linkCount > 0) return;

  const [roles, permissions] = await Promise.all([
    Role.find(),
    Permission.find(),
  ]);
  const bySlug = Object.fromEntries(permissions.map((item) => [item.slug, item._id]));

  for (const role of roles) {
    const grants = DEFAULT_GRANTS[role.slug];
    const ids =
      grants === '*'
        ? permissions.map((item) => item._id)
        : (grants || []).map((slug) => bySlug[slug]).filter(Boolean);
    if (!ids.length) continue;
    await RolePermission.bulkWrite(
      ids.map((permissionId) => ({
        updateOne: {
          filter: { roleId: role._id, permissionId },
          update: { $setOnInsert: { roleId: role._id, permissionId } },
          upsert: true,
        },
      })),
      { ordered: false }
    );
  }
};

const mapRole = (role) => ({
  id: role.id,
  name: role.name,
  slug: role.slug,
  description: role.description || ROLE_DESCRIPTIONS[role.slug] || '',
  isSystem: role.isSystem,
  permissionIds: (role.permissions || []).map((link) => link.permissionId),
});

const loadRole = (id) =>
  Role.aggregate([
    { $match: { _id: id } },
    ...roleLookups,
    { $project: rolePublic },
  ]).then((rows) => rows[0] || null);

export const listRoles = async () => {
  await ensureAssignments();
  const [roles, permissionDocs] = await Promise.all([
    Role.aggregate([{ $sort: { name: 1 } }, ...roleLookups, { $project: rolePublic }]),
    Permission.aggregate([{ $sort: { module: 1, name: 1 } }, { $project: permissionPublic }]),
  ]);

  return {
    roles: roles.map(mapRole),
    permissions: permissionDocs,
  };
};

export const setRolePermission = async (roleId, permissionId, enabled) => {
  const role = asDoc(await Role.findById(roleId));
  const permission = asDoc(await Permission.findById(permissionId));
  if (!role || !permission) throw new NotFoundError('Role or permission not found');

  if (enabled) {
    await RolePermission.findOneAndUpdate(
      { roleId, permissionId },
      { $setOnInsert: { roleId, permissionId } },
      { upsert: true }
    );
  } else {
    await RolePermission.deleteMany({ roleId, permissionId });
  }

  const updated = await loadRole(roleId);
  return mapRole(updated);
};
