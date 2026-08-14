export function isAdministrator(user) {
  return Boolean(user && user.role === 'admin');
}

export function canAccessFeature(user, feature) {
  if (feature === 'reports' || feature === 'user-management' || feature === 'destructive-data-actions') {
    return isAdministrator(user);
  }
  return Boolean(user);
}
