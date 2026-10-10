import { User, Role, Permission, RolePermission, UserRoleAssignment } from '../schemas/index.js';
import { createDoc, updateById, asDoc } from '../helpers/document.js';
import { lookupOne, notDeleted, pageParams, textSearch } from '../helpers/query.js';
import { paginate } from '../helpers/pagination.js';
import { COLLECTIONS, ROLES, USER_STATUS, SORT } from '../helpers/constants.js';
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

const isDup = (err) => err?.code === 11000;

export const ensurePlatformPermissions = async () => {
  for (const item of PLATFORM_PERMISSIONS) {
    await Permission.findOneAndUpdate(
      { slug: item.slug },
      { $set: { name: item.name, module: item.module, description: item.description, scope: 'platform' } },
      { upsert: true }
    );
  }
};

export const permissionSlugsForUser = async (user) => {
  if (!user) return [];
  if (user.role === ROLES.SUPER_ADMIN) return [...PLATFORM_PERMISSION_SLUGS];
  if (user.role !== ROLES.PLATFORM_ADMIN) return [];

  const assignments = await UserRoleAssignment.aggregate([
    { $match: { userId: user.id } },
    ...lookupOne(COLLECTIONS.ROLES, 'roleId', 'role', { _id: 0, id: '$_id', scope: 1 }),
    { $match: { 'role.scope': 'platform' } },
    {
      $lookup: {
        from: COLLECTIONS.ROLE_PERMISSIONS,
        let: { rid: '$roleId' },
        pipeline: [
          { $match: { $expr: { $eq: ['$roleId', '$$rid'] } } },
          ...lookupOne(COLLECTIONS.PERMISSIONS, 'permissionId', 'permission', {
            _id: 0,
            id: '$_id',
            slug: 1,
            scope: 1,
          }),
          { $match: { 'permission.scope': 'platform' } },
        ],
        as: 'permissions',
      },
    },
  ]);

  const slugs = [];
  for (const assignment of assignments) {
    for (const link of assignment.permissions || []) {
      if (link.permission?.slug) slugs.push(link.permission.slug);
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
  permissionIds: (role.permissions || []).map((link) => link.permissionId),
});

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
  {
    $lookup: {
      from: COLLECTIONS.USER_ROLE_ASSIGNMENTS,
      let: { rid: '$_id' },
      pipeline: [{ $match: { $expr: { $eq: ['$roleId', '$$rid'] } } }, { $project: { _id: 1 } }],
      as: '_users',
    },
  },
  { $addFields: { _count: { users: { $size: '$_users' } } } },
];

const loadRole = async (roleId) => {
  const [row] = await Role.aggregate([
    { $match: { _id: roleId, scope: 'platform' } },
    ...roleLookups,
    {
      $project: {
        _id: 0,
        id: '$_id',
        name: 1,
        slug: 1,
        description: 1,
        permissions: 1,
        _count: 1,
      },
    },
  ]);
  return row || null;
};

const platformPermissions = async () => {
  await ensurePlatformPermissions();
  return Permission.aggregate([
    { $match: { scope: 'platform' } },
    { $sort: { module: 1, name: 1 } },
    {
      $project: {
        _id: 0,
        id: '$_id',
        name: 1,
        slug: 1,
        module: 1,
        description: 1,
        scope: 1,
        createdAt: 1,
      },
    },
  ]);
};

const assertPlatformPermissionIds = async (permissionIds) => {
  const rows = await Permission.find({ _id: { $in: permissionIds }, scope: 'platform' }).select('_id');
  if (rows.length !== permissionIds.length) {
    throw new BadRequestError('Choose platform permissions only');
  }
  return rows.map((row) => row._id);
};

export const listTeam = async (query = {}) => {
  const { page, limit, search } = pageParams(query);
  const adminMatch = {
    role: ROLES.PLATFORM_ADMIN,
    ...notDeleted,
    ...textSearch(search, ['email', 'firstName', 'lastName', 'phone']),
  };

  const [roles, permissions, adminPage] = await Promise.all([
    Role.aggregate([
      { $match: { scope: 'platform' } },
      { $sort: { name: 1 } },
      ...roleLookups,
      {
        $project: {
          _id: 0,
          id: '$_id',
          name: 1,
          slug: 1,
          description: 1,
          permissions: 1,
          _count: 1,
        },
      },
    ]),
    platformPermissions(),
    paginate(User, {
      match: adminMatch,
      lookups: [
        {
          $lookup: {
            from: COLLECTIONS.USER_ROLE_ASSIGNMENTS,
            let: { uid: '$_id' },
            pipeline: [
              { $match: { $expr: { $eq: ['$userId', '$$uid'] } } },
              ...lookupOne(COLLECTIONS.ROLES, 'roleId', 'role', { _id: 0, id: '$_id', name: 1, scope: 1 }),
              { $match: { 'role.scope': 'platform' } },
              { $project: { _id: 0, roleId: 1, role: { id: '$role.id', name: '$role.name' } } },
            ],
            as: 'roleAssignments',
          },
        },
      ],
      project: {
        _id: 0,
        id: '$_id',
        email: 1,
        firstName: 1,
        lastName: 1,
        phone: 1,
        status: 1,
        createdAt: 1,
        roleAssignments: 1,
      },
      sort: SORT.CREATED_DESC,
      page,
      limit,
    }),
  ]);

  return {
    roles: roles.map(mapRole),
    permissions,
    admins: adminPage.data.map((admin) => ({
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
    pagination: adminPage.pagination,
  };
};

const uniqueSlug = async (name) => {
  const base = `platform-${slugify(name) || 'role'}`;
  let slug = base;
  let n = 2;
  while (asDoc(await Role.findOne({ slug }))) {
    slug = `${base}-${n}`;
    n += 1;
  }
  return slug;
};

export const createRole = async ({ name, description, permissionIds }) => {
  const cleanName = name.trim();
  const ids = await assertPlatformPermissionIds(permissionIds || []);
  try {
    const role = await createDoc(Role, {
      name: cleanName,
      slug: await uniqueSlug(cleanName),
      description: description?.trim() || null,
      scope: 'platform',
      isSystem: false,
    });
    if (ids.length) {
      await RolePermission.bulkWrite(
        ids.map((permissionId) => ({
          updateOne: {
            filter: { roleId: role.id, permissionId },
            update: { $setOnInsert: { roleId: role.id, permissionId } },
            upsert: true,
          },
        })),
        { ordered: false }
      );
    }
    return mapRole(await loadRole(role.id));
  } catch (err) {
    if (isDup(err)) throw new ConflictError('A role with this name already exists');
    throw err;
  }
};

export const updateRole = async (roleId, { name, description, permissionIds }) => {
  const role = asDoc(await Role.findOne({ _id: roleId, scope: 'platform' }));
  if (!role) throw new NotFoundError('Role not found');
  const ids = await assertPlatformPermissionIds(permissionIds || []);

  await updateById(Role, roleId, {
    name: name.trim(),
    description: description?.trim() || null,
  });
  await RolePermission.deleteMany({ roleId });
  if (ids.length) {
    await RolePermission.bulkWrite(
      ids.map((permissionId) => ({
        updateOne: {
          filter: { roleId, permissionId },
          update: { $setOnInsert: { roleId, permissionId } },
          upsert: true,
        },
      })),
      { ordered: false }
    );
  }

  return mapRole(await loadRole(roleId));
};

export const deleteRole = async (roleId) => {
  const role = await loadRole(roleId);
  if (!role) throw new NotFoundError('Role not found');
  if (role._count?.users > 0) {
    throw new BadRequestError('Move sub-admins off this role before deleting it');
  }
  await RolePermission.deleteMany({ roleId });
  await Role.findByIdAndDelete(roleId);
};

const assertPlatformRole = async (roleId) => {
  const role = asDoc(await Role.findOne({ _id: roleId, scope: 'platform' }));
  if (!role) throw new NotFoundError('Role not found');
  return role;
};

export const createAdmin = async ({ firstName, lastName, email, password, phone, roleId }) => {
  await assertPlatformRole(roleId);
  const normalized = email.trim().toLowerCase();
  const existing = asDoc(await User.findOne({ email: normalized, tenantId: null, ...notDeleted }));
  if (existing) throw new ConflictError('An account with this email already exists');

  const hashed = await hashPassword(password);
  const admin = await createDoc(User, {
    email: normalized,
    password: hashed,
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    phone: phone?.trim() || null,
    role: ROLES.PLATFORM_ADMIN,
    status: USER_STATUS.ACTIVE,
    emailVerified: true,
  });
  await createDoc(UserRoleAssignment, { userId: admin.id, roleId });
  return {
    id: admin.id,
    email: admin.email,
    firstName: admin.firstName,
    lastName: admin.lastName,
    status: admin.status,
  };
};

export const updateAdmin = async (userId, { roleId, status, password }) => {
  const admin = asDoc(await User.findOne({ _id: userId, role: ROLES.PLATFORM_ADMIN, ...notDeleted }));
  if (!admin) throw new NotFoundError('Sub-admin not found');

  if (roleId) await assertPlatformRole(roleId);

  const data = {};
  if (status) data.status = status;
  if (password) data.password = await hashPassword(password);

  if (Object.keys(data).length) {
    await updateById(User, userId, data);
  }
  if (roleId) {
    const platformRoles = await Role.find({ scope: 'platform' }).select('_id');
    const roleIds = platformRoles.map((r) => r._id);
    await UserRoleAssignment.deleteMany({ userId, roleId: { $in: roleIds } });
    await createDoc(UserRoleAssignment, { userId, roleId });
  }

  return { id: userId };
};
