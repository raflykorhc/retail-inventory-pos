import { create } from 'zustand';

interface CartItem {
  id: string;
  name: string;
  price: number;
  originalPrice?: number; // Stores the price before it was marked as bonus, so we can restore it.
  discount: number; // Discount amount per item
  quantity: number;
  unit: string;
  unitId?: string;
  batchId?: string;
  conversionFactor: number; // Default 1
  baseStock: number; // Total available stock in base units
  isBonus?: boolean;
}

export type ActiveModalType = 'history' | 'scanner' | 'printerSettings' | 'success' | 'doModal' | null;

interface CartState {
  // Cart Items & Base Store
  cart: CartItem[];
  sessionId: string;
  globalDiscount: number; // Global discount amount
  isCartOpen: boolean;
  checkoutStep: 'cart' | 'payment';
  
  // Catalog & Search States
  searchQuery: string;

  // Checkout & Payment States
  paymentMethod: "CASH" | "TRANSFER" | "DEBIT";
  transactionDate: string;
  cashReceived: number;
  
  // Modals & UI States
  activeModal: ActiveModalType;
  lastCreatedSale: any;

  // Actions
  setSessionId: (id: string) => void;
  setCart: (items: CartItem[]) => void;
  addToCart: (product: any, batchId?: string) => void;
  updateQuantity: (id: string, delta: number, batchId?: string) => void;
  updateUnit: (id: string, unitId: string, unitName: string, price: number, conversionFactor: number, batchId?: string) => void;
  setManualQuantity: (id: string, qty: number, batchId?: string) => void;
  updateDiscount: (id: string, discount: number, batchId?: string) => void;
  setGlobalDiscount: (amount: number) => void;
  removeFromCart: (id: string, batchId?: string) => void;
  updatePrice: (id: string, price: number, batchId?: string) => void;
  toggleBonus: (id: string, batchId?: string) => void;
  clearCart: () => void;
  setIsCartOpen: (isOpen: boolean) => void;
  setCheckoutStep: (step: 'cart' | 'payment') => void;

  // POS Actions
  setSearchQuery: (query: string) => void;
  setPaymentMethod: (method: "CASH" | "TRANSFER" | "DEBIT") => void;
  setTransactionDate: (date: string) => void;
  setCashReceived: (val: number) => void;
  setActiveModal: (modal: ActiveModalType) => void;
  setLastCreatedSale: (sale: any) => void;
}

export const useCartStore = create<CartState>((set) => ({
  // Initial States
  cart: [],
  sessionId: '',
  globalDiscount: 0,
  isCartOpen: false,
  checkoutStep: 'cart',
  searchQuery: '',
  paymentMethod: 'CASH',
  transactionDate: '',
  cashReceived: 0,
  activeModal: null,
  lastCreatedSale: null,

  // Setters & Actions
  setSessionId: (id) => set({ sessionId: id }),
  setCart: (items) => set({ cart: items }),
  setGlobalDiscount: (amount) => set({ globalDiscount: amount }),
  setIsCartOpen: (isOpen) => set({ isCartOpen: isOpen }),
  setCheckoutStep: (step) => set({ checkoutStep: step }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setPaymentMethod: (method) => set({ paymentMethod: method }),
  setTransactionDate: (date) => set({ transactionDate: date }),
  setCashReceived: (val) => set({ cashReceived: val }),
  setActiveModal: (modal) => set({ activeModal: modal }),
  setLastCreatedSale: (sale) => set({ lastCreatedSale: sale }),

  addToCart: (product, batchId) => set((state) => {
    const existing = state.cart.find(item => item.id === product.id && (item.batchId ?? null) === (batchId ?? null));
    
    // Get unit/price info with support for overrides
    const primaryPrice = product.prices?.[0] || { 
      price: product.price, 
      unitId: product.unitId, 
      conversionFactor: product.conversionFactor || 1, 
      unit: { name: product.unit } 
    };

    // Prioritaskan harga dan unit yang dikirim langsung (misal dari pemilihan batch spesifik)
    const priceToUse = product.price !== undefined ? Number(product.price) : Number(primaryPrice.price);
    const unitToUse = product.unit || primaryPrice.unit?.name || "Pcs";
    const unitIdToUse = product.unitId || primaryPrice.unitId;
    const factorToUse = product.conversionFactor !== undefined ? product.conversionFactor : (primaryPrice.conversionFactor || 1);
    
    if (existing) {
      // Check stock limit in base units
      const currentTotalInBase = (existing.quantity + 1) * itemToConversionFactor(existing);
      if (currentTotalInBase > existing.baseStock) {
        return state;
      }
      return {
        cart: state.cart.map(item => 
          (item.id === product.id && (item.batchId ?? null) === (batchId ?? null)) ? { ...item, quantity: item.quantity + 1 } : item
        )
      };
    }

    // Helper to get conversion factor safely
    function itemToConversionFactor(item: any) {
      return item.conversionFactor || 1;
    }

    return {
      cart: [...state.cart, { 
        id: product.id, 
        name: product.name, 
        price: priceToUse, 
        originalPrice: priceToUse,
        discount: 0,
        quantity: 1, 
        unit: unitToUse,
        unitId: unitIdToUse,
        batchId: batchId,
        conversionFactor: factorToUse,
        baseStock: product.stock !== undefined ? product.stock : (product.baseStock || 0),
        isBonus: false
      }]
    };
  }),
  updateQuantity: (id, delta, batchId) => set((state) => {
    const newCart = state.cart.map(item => {
      if (item.id === id && (item.batchId ?? null) === (batchId ?? null)) {
        const currentQty = Number(item.quantity) || 0;
        const newQty = currentQty + delta;
        
        // Check stock limit in base units
        const newTotalInBase = newQty * item.conversionFactor;
        if (newTotalInBase > item.baseStock || newQty < 1) return item;
        
        return { ...item, quantity: newQty };
      }
      return item;
    });
    return { cart: newCart };
  }),
  updateUnit: (id, unitId, unitName, price, conversionFactor, batchId) => set((state) => ({
    cart: state.cart.map(item => {
      if (item.id === id && (item.batchId ?? null) === (batchId ?? null)) {
        // When changing unit, we might need to adjust quantity to stay within stock?
        const maxQtyInNewUnit = Math.floor(item.baseStock / conversionFactor);
        const newQty = Math.min(item.quantity, maxQtyInNewUnit);
        
        const updatedItem = { 
          ...item, 
          unitId, 
          unit: unitName, 
          price: item.isBonus ? 0 : Number(price), 
          originalPrice: Number(price),
          conversionFactor,
          quantity: newQty > 0 ? newQty : 1 // Keep at least 1 if possible
        };

        return updatedItem;
      }
      return item;
    })
  })),
  setManualQuantity: (id, qty, batchId) => set((state) => ({
    cart: state.cart.map(item => {
      if (item.id === id && (item.batchId ?? null) === (batchId ?? null)) {
        const safeQty = Number(qty) || 0;
        const maxQty = Math.floor(item.baseStock / item.conversionFactor);
        const newQty = Math.max(0, Math.min(safeQty, maxQty));
        const updatedItem = { ...item, quantity: newQty };
        return updatedItem;
      }
      return item;
    })
  })),
  updateDiscount: (id, discount, batchId) => set((state) => ({
    cart: state.cart.map(item => 
      (item.id === id && (item.batchId ?? null) === (batchId ?? null)) ? { ...item, discount: Math.max(0, Number(discount) || 0) } : item
    )
  })),
  removeFromCart: (id, batchId) => set((state) => ({
    cart: state.cart.filter(item => !(item.id === id && (item.batchId ?? null) === (batchId ?? null)))
  })),
  updatePrice: (id, price, batchId) => set((state) => ({
    cart: state.cart.map(item => 
      (item.id === id && (item.batchId ?? null) === (batchId ?? null)) ? { 
        ...item, 
        price: item.isBonus ? 0 : Math.max(0, Number(price) || 0),
        originalPrice: item.isBonus ? Math.max(0, Number(price) || 0) : item.originalPrice
      } : item
    )
  })),
  toggleBonus: (id, batchId) => set((state) => ({
    cart: state.cart.map(item => {
      if (item.id === id && (item.batchId ?? null) === (batchId ?? null)) {
        const nextIsBonus = !item.isBonus;
        return {
          ...item,
          isBonus: nextIsBonus,
          price: nextIsBonus ? 0 : (item.originalPrice ?? item.price),
          originalPrice: item.originalPrice !== undefined ? item.originalPrice : item.price
        };
      }
      return item;
    })
  })),
  clearCart: () => set({ 
    cart: [], 
    globalDiscount: 0, 
    checkoutStep: 'cart',
    transactionDate: '',
    cashReceived: 0,
    paymentMethod: 'CASH'
  }),
}));
