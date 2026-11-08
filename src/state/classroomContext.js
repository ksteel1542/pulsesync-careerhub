import { createContext, useContext } from 'react';

// Kept separate from ClassroomStore.jsx (which exports only the provider component)
// so React Fast Refresh can hot-swap the provider without re-creating this context
// object, which would otherwise break every consumer until a full page reload.
export const ClassroomStoreContext = createContext(null);

export function useClassroomStore() {
  const ctx = useContext(ClassroomStoreContext);
  if (!ctx) throw new Error('useClassroomStore must be used inside <ClassroomStoreProvider>');
  return ctx;
}
