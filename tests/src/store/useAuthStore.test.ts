import { useAuthStore } from './useAuthStore';

describe('useAuthStore', () => {
  beforeEach(() => {
    useAuthStore.getState().logout();
  });

  it('should have null user and token initially', () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  it('should login correctly', () => {
    const mockUser = { id: '1', username: 'admin', role: 'ADMIN', fullName: 'Administrator' };
    const mockToken = 'fake-token';
    
    useAuthStore.getState().login(mockUser, mockToken);
    
    const state = useAuthStore.getState();
    expect(state.user).toEqual(mockUser);
    expect(state.token).toBe(mockToken);
    expect(state.isAuthenticated).toBe(true);
  });

  it('should logout correctly', () => {
    const mockUser = { id: '1', username: 'admin', role: 'ADMIN', fullName: 'Administrator' };
    useAuthStore.getState().login(mockUser, 'token');
    useAuthStore.getState().logout();
    
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });
});
