export type Role = 'seller' | 'trade_desk' | 'admin';

export function roleHome(role: Role): string {
  switch (role) {
    case 'seller':
      return '/dashboard';
    case 'trade_desk':
      return '/desk/queue';
    case 'admin':
      return '/admin/users';
  }
}
