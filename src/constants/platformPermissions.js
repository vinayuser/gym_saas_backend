/** Admin-panel access only. Gym owner staff permissions live on a separate scope. */
export const PLATFORM_PERMISSIONS = [
  { slug: 'dashboard.view', name: 'View dashboard', module: 'Dashboard', description: 'Open the platform overview' },
  { slug: 'businesses.view', name: 'View businesses', module: 'Businesses', description: 'See invites, owners, and gym records' },
  { slug: 'businesses.manage', name: 'Manage businesses', module: 'Businesses', description: 'Create invites, publish apps, change add-ons, activate, and reset passwords' },
  { slug: 'transactions.view', name: 'View transactions', module: 'Transactions', description: 'See platform payments' },
  { slug: 'support.view', name: 'View support', module: 'Support', description: 'Read support tickets' },
  { slug: 'support.manage', name: 'Manage support', module: 'Support', description: 'Change ticket status' },
  { slug: 'plans.view', name: 'View plans', module: 'Plans', description: 'See prices and add-ons' },
  { slug: 'plans.manage', name: 'Manage plans', module: 'Plans', description: 'Change monthly and yearly prices' },
  { slug: 'settings.view', name: 'View settings', module: 'Settings', description: 'Open platform settings' },
  { slug: 'team.manage', name: 'Manage team', module: 'Team', description: 'Create roles and sub-admins' },
];

export const PLATFORM_PERMISSION_SLUGS = PLATFORM_PERMISSIONS.map((item) => item.slug);

export const expandPlatformPermissions = (slugs) => {
  const set = new Set(slugs);
  for (const slug of slugs) {
    if (slug.endsWith('.manage')) set.add(slug.replace(/\.manage$/, '.view'));
  }
  return set;
};
