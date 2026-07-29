import { useCartStore } from './useCartStore';

describe('useCartStore', () => {
  beforeEach(() => {
    useCartStore.getState().clearCart();
  });

  it('should have empty cart initially', () => {
    expect(useCartStore.getState().cart).toEqual([]);
  });

  it('should add item to cart', () => {
    const product = { id: 'p1', name: 'Semen Padang', price: 65000, stock: 100, unit: 'Sak', unitId: 'u1' };
    useCartStore.getState().addToCart(product);
    
    const state = useCartStore.getState();
    expect(state.cart).toHaveLength(1);
    expect(state.cart[0]).toEqual({
      id: 'p1',
      name: 'Semen Padang',
      price: 65000,
      originalPrice: 65000,
      discount: 0,
      quantity: 1,
      unit: 'Sak',
      unitId: 'u1',
      batchId: undefined,
      conversionFactor: 1,
      baseStock: 100,
      isBonus: false
    });
  });

  it('should toggle bonus status and price correctly', () => {
    const product = { id: 'p1', name: 'Semen Padang', price: 65000, stock: 100, unit: 'Sak', unitId: 'u1' };
    useCartStore.getState().addToCart(product);
    
    // Toggle on (set as bonus)
    useCartStore.getState().toggleBonus('p1');
    expect(useCartStore.getState().cart[0].isBonus).toBe(true);
    expect(useCartStore.getState().cart[0].price).toBe(0);
    expect(useCartStore.getState().cart[0].originalPrice).toBe(65000);

    // Toggle off (restore price)
    useCartStore.getState().toggleBonus('p1');
    expect(useCartStore.getState().cart[0].isBonus).toBe(false);
    expect(useCartStore.getState().cart[0].price).toBe(65000);
  });

  it('should increment quantity when adding the same product', () => {
    const product = { id: 'p1', name: 'Semen Padang', price: 65000, stock: 100, unit: 'Sak', unitId: 'u1' };
    useCartStore.getState().addToCart(product);
    useCartStore.getState().addToCart(product);
    
    const state = useCartStore.getState();
    expect(state.cart).toHaveLength(1);
    expect(state.cart[0].quantity).toBe(2);
  });

  it('should not exceed stock when adding items', () => {
    const product = { id: 'p1', name: 'Semen Padang', price: 65000, stock: 1, unit: 'Sak', unitId: 'u1' };
    useCartStore.getState().addToCart(product);
    useCartStore.getState().addToCart(product); // Should not increase quantity
    
    const state = useCartStore.getState();
    expect(state.cart[0].quantity).toBe(1);
  });

  it('should update quantity correctly', () => {
    const product = { id: 'p1', name: 'Semen Padang', price: 65000, stock: 100, unit: 'Sak', unitId: 'u1' };
    useCartStore.getState().addToCart(product);
    
    // Increase by 2
    useCartStore.getState().updateQuantity('p1', 2);
    expect(useCartStore.getState().cart[0].quantity).toBe(3);
    
    // Decrease by 1
    useCartStore.getState().updateQuantity('p1', -1);
    expect(useCartStore.getState().cart[0].quantity).toBe(2);
  });

  it('should not decrease quantity below 1 via updateQuantity', () => {
    const product = { id: 'p1', name: 'Semen Padang', price: 65000, stock: 100, unit: 'Sak', unitId: 'u1' };
    useCartStore.getState().addToCart(product);
    useCartStore.getState().updateQuantity('p1', -5);
    
    expect(useCartStore.getState().cart[0].quantity).toBe(1);
  });

  it('should set manual quantity', () => {
    const product = { id: 'p1', name: 'Semen Padang', price: 65000, stock: 100, unit: 'Sak', unitId: 'u1' };
    useCartStore.getState().addToCart(product);
    useCartStore.getState().setManualQuantity('p1', 50);
    
    expect(useCartStore.getState().cart[0].quantity).toBe(50);
  });

  it('should remove item from cart', () => {
    const product = { id: 'p1', name: 'Semen Padang', price: 65000, stock: 100, unit: 'Sak', unitId: 'u1' };
    useCartStore.getState().addToCart(product);
    useCartStore.getState().removeFromCart('p1');
    
    expect(useCartStore.getState().cart).toHaveLength(0);
  });

  it('should update item price correctly', () => {
    const product = { id: 'p1', name: 'Semen Padang', price: 65000, stock: 100, unit: 'Sak', unitId: 'u1' };
    useCartStore.getState().addToCart(product);
    
    // Update price
    useCartStore.getState().updatePrice('p1', 70000);
    expect(useCartStore.getState().cart[0].price).toBe(70000);
    
    // Lower price
    useCartStore.getState().updatePrice('p1', 60000);
    expect(useCartStore.getState().cart[0].price).toBe(60000);
  });

  it('should clear cart', () => {
    const p1 = { id: 'p1', name: 'P1', price: 10, stock: 10, unit: 'U' };
    const p2 = { id: 'p2', name: 'P2', price: 20, stock: 10, unit: 'U' };
    useCartStore.getState().addToCart(p1);
    useCartStore.getState().addToCart(p2);
    
    useCartStore.getState().clearCart();
    expect(useCartStore.getState().cart).toEqual([]);
  });
});
