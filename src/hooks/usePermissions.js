import { useEffect, useState } from 'react';
import { subscribe } from '../api/backend.js';

export function usePermissions() {
  const [state, setState] = useState({ role: null, permissions: [] });

  useEffect(
    () =>
      subscribe(({ role, permissions }) =>
        setState({
          role: role || null,
          permissions: Array.isArray(permissions) ? permissions : [],
        })
      ),
    []
  );

  const has = (perm) => state.permissions.includes(perm);

  return {
    role: state.role,
    permissions: state.permissions,
    canRead: has('READ'),
    canWrite: has('WRITE'),
    canDelete: has('DELETE'),
    has,
  };
}
