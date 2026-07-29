import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { SummaryCard } from '@/components/SummaryCard';
import { 
  Receipt, 
  Search, 
  Filter, 
  CreditCard, 
  Calendar, 
  User, 
  CheckCircle2, 
  AlertCircle,
  History,
  ArrowRight,
  Plus,
  X,
  Bell,
  Loader2,
  Phone,
  MessageSquare,
  MapPin,
  ClipboardList,
  TrendingUp,
  Download,
  FileSpreadsheet,
  Edit,
  Trash2,
  Save,
  AlertTriangle,
  Eye
} from "lucide-react";
import { cn, formatCurrency } from "../../lib/utils";
import { useTheme } from "../../context/ThemeContext";
import { Can } from "../../components/auth/Can";
import { EmptyState } from "../../components/ui/EmptyState";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { toast as sonnerToast } from "sonner";
import { useLocation } from "react-router-dom";
export default function DebtsPage() {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<"AR" | "AP" | "REKAP" | "HISTORY">("AR");
  const [agingFilter, setAgingFilter] = useState<"ALL" | "NOT_DUE" | "1_30" | "31_60" | "OVER_60" | "OVERDUE">(() => {
    return (location.state?.filter as any) || "ALL";
  });
  const [debts, setDebts] = useState<any[]>([]);
  const [payables, setPayables] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Payment History Tab states
  const [historyPayments, setHistoryPayments] = useState<any[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyType, setHistoryType] = useState<"AR" | "AP">("AR");
  const [historySearch, setHistorySearch] = useState("");
  const [historyMethod, setHistoryMethod] = useState<"ALL" | "CASH" | "TRANSFER">("ALL");
  const [historyStartDate, setHistoryStartDate] = useState("");
  const [historyEndDate, setHistoryEndDate] = useState("");
  const [historyPage, setHistoryPage] = useState(1);
  const [historyLimit, setHistoryLimit] = useState(15);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  // Date Filter states for AR and AP
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");

  const handleDateStartChange = (val: string) => {
    setDateStart(val);
    if (dateEnd && val > dateEnd) {
      setDateEnd(val);
    }
  };

  const handleDateEndChange = (val: string) => {
    setDateEnd(val);
    if (dateStart && val < dateStart) {
      setDateStart(val);
    }
  };

  const placeholderDebts = useMemo(() => [
    { id: "1", customer: { name: "Kontraktor Wijaya", phone: "08123456789" }, amountDue: 50000000, remainingBalance: 40000000, status: "PARTIAL", dueDate: "2026-06-20", createdAt: "2026-06-01", reference: "INV-001", sale: { invoiceNumber: "INV-001" } },
    { id: "2", customer: { name: "Budi Setiawan", phone: "08987654321" }, amountDue: 2500000, remainingBalance: 2500000, status: "UNPAID", dueDate: "2026-06-25", createdAt: "2026-06-05", reference: "INV-002", sale: { invoiceNumber: "INV-002" } },
    { id: "3", customer: { name: "Developer Graha", phone: "08234567890" }, amountDue: 100000000, remainingBalance: 0, status: "PAID", dueDate: "2026-06-15", createdAt: "2026-06-01", reference: "INV-003", sale: { invoiceNumber: "INV-003" } }
  ], []);

  const placeholderPayables = useMemo(() => [
    { id: "1", supplier: { name: "Supplier Semen Gresik", phone: "021-998877" }, amountDue: 80000000, remainingBalance: 80000000, status: "UNPAID", dueDate: "2026-06-20", createdAt: "2026-06-01", reference: "SUP-001", purchase: { invoiceNumber: "SUP-001" } },
    { id: "2", supplier: { name: "Distributor Besi SNI", phone: "021-665544" }, amountDue: 45000000, remainingBalance: 15000000, status: "PARTIAL", dueDate: "2026-06-22", createdAt: "2026-06-02", reference: "SUP-002", purchase: { invoiceNumber: "SUP-002" } }
  ], []);

  const activeDebts = isLoading ? placeholderDebts : debts;
  const activePayables = isLoading ? placeholderPayables : payables;
  const [searchQuery, setSearchQuery] = useState("");
  const [customerTypeFilter, setCustomerTypeFilter] = useState<"ALL" | "RETAIL" | "PROJECT">("ALL");
  const [rekapTypeFilter, setRekapTypeFilter] = useState<"AR" | "AP">("AR");
  const [selectedDebt, setSelectedDebt] = useState<any | null>(null);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentDiscount, setPaymentDiscount] = useState<number | "">("");
  const [isEditingAmount, setIsEditingAmount] = useState(false);
  const [editAmountDue, setEditAmountDue] = useState<number | "">("");
  const [paymentMethod, setPaymentMethod] = useState("TRANSFER");
  const [paymentAttachment, setPaymentAttachment] = useState<File | null>(null);
  const [isPaying, setIsPaying] = useState(false);
  const [viewingAttachment, setViewingAttachment] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [notificationPermission, setNotificationPermission] = useState<string>("default");
  const { theme } = useTheme();

  // Manual Debt/Payable states
  const [customers, setCustomers] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [isAddDebtOpen, setIsAddDebtOpen] = useState(false);
  const [isAddPayableOpen, setIsAddPayableOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [manualAmount, setManualAmount] = useState<number | "">("");
  const [manualDueDate, setManualDueDate] = useState("");
  const [manualReference, setManualReference] = useState("");
  const [manualNotes, setManualNotes] = useState("");
  const [manualTransactionDate, setManualTransactionDate] = useState(() => {
    return new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
  });
  const [isSavingManual, setIsSavingManual] = useState(false);
  const [deleteConfirmDebt, setDeleteConfirmDebt] = useState<any | null>(null);
  const [isDeletingDebt, setIsDeletingDebt] = useState(false);

  useEffect(() => {
    fetchDebts();
    fetchCustomersAndSuppliers();
    
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotificationPermission(Notification.permission);
      if (Notification.permission === "default") {
        Notification.requestPermission().then((perm) => {
          setNotificationPermission(perm);
        });
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && debts.length > 0 && !selectedDebt) {
      const params = new URLSearchParams(window.location.search);
      const payDebtId = params.get("payDebtId");
      if (payDebtId) {
        const debtToPay = debts.find((d: any) => d.id === payDebtId);
        if (debtToPay) {
          setSelectedDebt(debtToPay);
          setPaymentAmount(debtToPay.remainingBalance);
          
          const newUrl = window.location.pathname;
          window.history.replaceState({}, document.title, newUrl);
        }
      }
    }
  }, [debts, selectedDebt]);

  const fetchCustomersAndSuppliers = async () => {
    try {
      const [resCustomers, resSuppliers] = await Promise.all([
        fetch("/api/customers"),
        fetch("/api/suppliers")
      ]);
      const dataCustomers = await resCustomers.json();
      const dataSuppliers = await resSuppliers.json();
      if (Array.isArray(dataCustomers)) setCustomers(dataCustomers);
      if (Array.isArray(dataSuppliers)) setSuppliers(dataSuppliers);
    } catch (e) {
      console.error("Failed to fetch customers/suppliers", e);
    }
  };

  const resetManualForm = () => {
    setSelectedCustomerId("");
    setSelectedSupplierId("");
    setManualAmount("");
    setManualDueDate("");
    setManualTransactionDate(new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]);
    setManualReference("");
    setManualNotes("");
  };

  const handleAddManualDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId || !manualAmount || Number(manualAmount) <= 0 || !manualDueDate) {
      sonnerToast.error("Harap isi semua field wajib");
      return;
    }
    setIsSavingManual(true);
    try {
      const res = await fetch("/api/debts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: selectedCustomerId,
          amountDue: Number(manualAmount),
          dueDate: manualDueDate,
          reference: manualReference,
          notes: manualNotes,
          transactionDate: manualTransactionDate
        })
      });
      if (res.ok) {
        sonnerToast.success("Piutang manual berhasil ditambahkan");
        setIsAddDebtOpen(false);
        resetManualForm();
        fetchDebts();
      } else {
        const err = await res.json();
        sonnerToast.error(err.error || "Gagal menambahkan piutang manual");
      }
    } catch (error) {
      sonnerToast.error("Terjadi kesalahan koneksi");
    } finally {
      setIsSavingManual(false);
    }
  };

  const handleAddManualPayable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierId || !manualAmount || Number(manualAmount) <= 0 || !manualDueDate) {
      sonnerToast.error("Harap isi semua field wajib");
      return;
    }
    setIsSavingManual(true);
    try {
      const res = await fetch("/api/payables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId: selectedSupplierId,
          amountDue: Number(manualAmount),
          dueDate: manualDueDate,
          reference: manualReference,
          notes: manualNotes,
          transactionDate: manualTransactionDate
        })
      });
      if (res.ok) {
        sonnerToast.success("Hutang manual berhasil ditambahkan");
        setIsAddPayableOpen(false);
        resetManualForm();
        fetchDebts();
      } else {
        const err = await res.json();
        sonnerToast.error(err.error || "Gagal menambahkan hutang manual");
      }
    } catch (error) {
      sonnerToast.error("Terjadi kesalahan koneksi");
    } finally {
      setIsSavingManual(false);
    }
  };


  const checkAndShowBrowserNotifications = (debtsList: any[]) => {
    if (typeof window === "undefined" || !("Notification" in window)) return;

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const limitDate = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    const urgentDebts = debtsList.filter((d: any) => {
      if (d.status === "PAID") return false;
      const dueDate = new Date(d.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      
      const isUrgent = dueDate <= limitDate;
      if (!isUrgent) return false;

      return true;
    });

    if (urgentDebts.length === 0) return;

    const showNotification = () => {
      new Notification("Pengingat Jatuh Tempo Piutang", {
        body: `${urgentDebts.length} transaksi piutang mendekati/lewat jatuh tempo.`,
        tag: "debts-overdue-reminder"
      });
    };

    if (Notification.permission === "granted") {
      showNotification();
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission().then((permission) => {
        if (permission === "granted") {
          showNotification();
        }
      });
    }
  };

  const fetchDebts = async () => {
    setIsLoading(true);
    try {
      const [resDebts, resPayables] = await Promise.all([
        fetch("/api/debts"),
        fetch("/api/payables")
      ]);
      const dataDebts = await resDebts.json();
      const dataPayables = await resPayables.json();

      if (Array.isArray(dataDebts)) {
        setDebts(dataDebts);
        checkAndShowBrowserNotifications(dataDebts);
      } else {
        setDebts([]);
      }

      if (Array.isArray(dataPayables)) setPayables(dataPayables);
      else setPayables([]);

    } catch (error) {
      console.error("Failed to fetch debts and payables:", error);
      setDebts([]);
      setPayables([]);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredDebts = useMemo(() => {
    const query = searchQuery.toLowerCase();
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    return activeDebts.filter(d => {
      // Search filter
      const customerName = d.sale?.customer?.name || d.customer?.name || "Pelanggan Umum";
      const matchesSearch = customerName.toLowerCase().includes(query) || 
                            (d.sale?.invoiceNumber || d.reference || "")?.toLowerCase().includes(query);
      if (!matchesSearch) return false;

      // Tab filter
      if (activeTab === "AP") return false;

      // Date filter
      if (dateStart || dateEnd) {
        const tDate = new Date(d.dueDate);
        tDate.setHours(0, 0, 0, 0);
        if (dateStart) {
          const s = new Date(dateStart);
          s.setHours(0, 0, 0, 0);
          if (tDate < s) return false;
        }
        if (dateEnd) {
          const e = new Date(dateEnd);
          e.setHours(23, 59, 59, 999);
          if (tDate > e) return false;
        }
      }

      // Project vs Retail filter
      if (customerTypeFilter === "PROJECT" && !d.sale?.projectId) return false;
      if (customerTypeFilter === "RETAIL" && d.sale?.projectId) return false;

      // Aging filter
      if (agingFilter === "ALL") return true;
      if (d.status === "PAID") return false;

      const dueDate = new Date(d.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      const diffTime = now.getTime() - dueDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (agingFilter === "NOT_DUE") return diffDays <= 0;
      if (agingFilter === "1_30") return diffDays > 0 && diffDays <= 30;
      if (agingFilter === "31_60") return diffDays > 30 && diffDays <= 60;
      if (agingFilter === "OVER_60") return diffDays > 60;
      if (agingFilter === "OVERDUE") return diffDays > 0;

      return true;
    }).sort((a, b) => {
      if (a.status === "PAID" && b.status !== "PAID") return 1;
      if (a.status !== "PAID" && b.status === "PAID") return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });
  }, [searchQuery, activeDebts, activeTab, agingFilter, customerTypeFilter, dateStart, dateEnd]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeTab, agingFilter, customerTypeFilter, rekapTypeFilter, dateStart, dateEnd]);

  const filteredPayables = useMemo(() => {
    if (activeTab !== "AP") return [];
    const query = searchQuery.toLowerCase();

    return activePayables.filter(p => {
      const matchesSearch = (p.supplier?.name || "")?.toLowerCase().includes(query) ||
                            (p.purchase?.invoiceNumber || p.reference || "")?.toLowerCase().includes(query);
      if (!matchesSearch) return false;

      // Date filter
      if (dateStart || dateEnd) {
        const tDate = new Date(p.dueDate);
        tDate.setHours(0, 0, 0, 0);
        if (dateStart) {
          const s = new Date(dateStart);
          s.setHours(0, 0, 0, 0);
          if (tDate < s) return false;
        }
        if (dateEnd) {
          const e = new Date(dateEnd);
          e.setHours(23, 59, 59, 999);
          if (tDate > e) return false;
        }
      }

      // Aging filter
      if (agingFilter === "ALL") return true;
      if (p.status === "PAID") return false;

      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const dueDate = new Date(p.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      const diffTime = now.getTime() - dueDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (agingFilter === "NOT_DUE") return diffDays <= 0;
      if (agingFilter === "1_30") return diffDays > 0 && diffDays <= 30;
      if (agingFilter === "31_60") return diffDays > 30 && diffDays <= 60;
      if (agingFilter === "OVER_60") return diffDays > 60;
      if (agingFilter === "OVERDUE") return diffDays > 0;

      return true;
    }).sort((a, b) => {
      if (a.status === "PAID" && b.status !== "PAID") return 1;
      if (a.status !== "PAID" && b.status === "PAID") return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });
  }, [searchQuery, activePayables, activeTab, dateStart, dateEnd, agingFilter]);

  const stats = useMemo(() => {
    const actDebts = activeDebts.filter(d => d.status !== "PAID");
    const totalRemaining = actDebts.reduce((sum, d) => sum + Number(d.remainingBalance), 0);

    const actPayables = activePayables.filter(p => p.status !== "PAID");
    const totalPayables = actPayables.reduce((sum, p) => sum + Number(p.remainingBalance), 0);
    
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Calculate dynamic paid this month for Debts (AR)
    let paidDebtsThisMonth = 0;
    activeDebts.forEach(d => {
      if (d.payments) {
        d.payments.forEach((p: any) => {
          const pDate = new Date(p.paymentDate);
          if (pDate.getMonth() === currentMonth && pDate.getFullYear() === currentYear) {
            paidDebtsThisMonth += Number(p.amountPaid);
          }
        });
      }
    });

    // Calculate dynamic paid this month for Payables (AP)
    let paidPayablesThisMonth = 0;
    activePayables.forEach(p => {
      if (p.payments) {
        p.payments.forEach((pm: any) => {
          const pDate = new Date(pm.paymentDate);
          if (pDate.getMonth() === currentMonth && pDate.getFullYear() === currentYear) {
            paidPayablesThisMonth += Number(pm.amountPaid);
          }
        });
      }
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const totalOverdueDebts = actDebts.reduce((sum, d) => {
      const dueDate = new Date(d.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      if (today.getTime() > dueDate.getTime()) {
        return sum + Number(d.remainingBalance);
      }
      return sum;
    }, 0);

    const totalOverduePayables = actPayables.reduce((sum, p) => {
      const dueDate = new Date(p.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      if (today.getTime() > dueDate.getTime()) {
        return sum + Number(p.remainingBalance);
      }
      return sum;
    }, 0);

    return {
      totalRemaining,
      totalPayables,
      paidDebtsThisMonth,
      paidPayablesThisMonth,
      totalOverdueDebts,
      totalOverduePayables,
    };
  }, [activeDebts, activePayables]);

  const handleRequestPermission = () => {
    if (typeof window !== "undefined" && "Notification" in window) {
      Notification.requestPermission().then((perm) => {
        setNotificationPermission(perm);
        if (perm === "granted") {
          sonnerToast.success("Notifikasi desktop berhasil diaktifkan!");
          checkAndShowBrowserNotifications(debts);
        } else if (perm === "denied") {
          sonnerToast.error("Izin notifikasi ditolak oleh browser");
        }
      });
    }
  };

  const handleCloseModal = () => {
    setSelectedDebt(null);
    setPaymentAmount(0);
    setPaymentDiscount("");
    setIsEditingAmount(false);
    setEditAmountDue("");
    setPaymentMethod("TRANSFER");
    setPaymentAttachment(null);
  };

  const getBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handlePayment = async () => {
    if (!selectedDebt || paymentAmount <= 0) return;
    if (paymentAmount + (Number(paymentDiscount) || 0) > selectedDebt.remainingBalance) {
      sonnerToast.error("Total (Pembayaran + Diskon) tidak boleh melebihi sisa saldo");
      return;
    }
    setIsPaying(true);
    try {
      let attachmentData = null;
      if (paymentAttachment) {
        attachmentData = await getBase64(paymentAttachment);
      }

      const endpoint = selectedDebt.isAP 
        ? `/api/payables/${selectedDebt.id}/payments`
        : `/api/debts/${selectedDebt.id}/payments`;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountPaid: paymentAmount,
          discount: Number(paymentDiscount) || 0,
          method: paymentMethod,
          attachment: attachmentData
        })
      });

      if (res.ok) {
        sonnerToast.success("Pembayaran berhasil dicatat");
        handleCloseModal();
        fetchDebts();
        fetchHistoryPayments();
      } else {
        const data = await res.json();
        sonnerToast.error(data.error || "Gagal mencatat pembayaran");
      }
    } catch (error) {
      sonnerToast.error("Terjadi kesalahan koneksi");
    } finally {
      setIsPaying(false);
    }
  };

  const handleUpdateAmount = async () => {
    if (!selectedDebt || !editAmountDue || editAmountDue <= 0) return;
    try {
      const endpoint = selectedDebt.isAP 
        ? `/api/payables/${selectedDebt.id}/amount`
        : `/api/debts/${selectedDebt.id}/amount`;

      const res = await fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountDue: Number(editAmountDue) })
      });

      if (res.ok) {
        sonnerToast.success("Nominal berhasil diubah");
        setIsEditingAmount(false);
        const updatedData = await res.json();
        setSelectedDebt({ ...updatedData, isAP: selectedDebt.isAP });
        fetchDebts();
      } else {
        const data = await res.json();
        sonnerToast.error(data.error || "Gagal mengubah nominal");
      }
    } catch (error) {
      sonnerToast.error("Terjadi kesalahan koneksi");
    }
  };

  const handleDeleteDebtClick = (e: React.MouseEvent | null, debt: any) => {
    if (e) e.stopPropagation();
    if (!debt) return;
    setDeleteConfirmDebt(debt);
  };

  const confirmDeleteDebt = async () => {
    if (!deleteConfirmDebt) return;
    setIsDeletingDebt(true);
    try {
      const endpoint = deleteConfirmDebt.isAP 
        ? `/api/payables/${deleteConfirmDebt.id}`
        : `/api/debts/${deleteConfirmDebt.id}`;

      const res = await fetch(endpoint, {
        method: "DELETE",
      });

      if (res.ok) {
        sonnerToast.success("Transaksi berhasil dihapus");
        if (selectedDebt && selectedDebt.id === deleteConfirmDebt.id) {
          handleCloseModal();
        }
        fetchDebts();
        setDeleteConfirmDebt(null);
      } else {
        const data = await res.json();
        sonnerToast.error(data.error || "Gagal menghapus data");
      }
    } catch (error) {
      sonnerToast.error("Terjadi kesalahan koneksi");
    } finally {
      setIsDeletingDebt(false);
    }
  };

  const handleDeleteDebt = () => {
    handleDeleteDebtClick(null, selectedDebt);
  };

  const handleEditAmountClick = (e: React.MouseEvent, debt: any) => {
    e.stopPropagation();
    setSelectedDebt(debt);
    setIsEditingAmount(true);
    setEditAmountDue(Number(debt.amountDue));
  };

  const rekapData = useMemo(() => {
    if (activeTab !== "REKAP") return [];
    
    const resultMap = new Map();
    const dataToProcess = rekapTypeFilter === "AR" ? activeDebts : activePayables;
    
    dataToProcess.forEach(item => {
      if (item.status === "PAID") return; // Only show unpaid items in rekap
      
      // Apply customer type filter if in AR mode
      if (rekapTypeFilter === "AR") {
        if (customerTypeFilter === "PROJECT" && !item.sale?.projectId) return;
        if (customerTypeFilter === "RETAIL" && item.sale?.projectId) return;
      }
      
      const entityId = rekapTypeFilter === "AR" ? (item.sale?.customerId || item.customerId) : item.supplierId;
      const effectiveEntityId = entityId || "UMUM";
      
      if (!resultMap.has(effectiveEntityId)) {
        resultMap.set(effectiveEntityId, {
          id: effectiveEntityId,
          name: rekapTypeFilter === "AR" ? (item.sale?.customer?.name || item.customer?.name || "Pelanggan Umum") : (item.supplier?.name || "Unknown"),
          phone: rekapTypeFilter === "AR" ? (item.sale?.customer?.phone || item.customer?.phone || "-") : (item.supplier?.phone || "-"),
          totalAmount: 0,
          invoiceCount: 0,
          items: []
        });
      }
      
      const entry = resultMap.get(effectiveEntityId);
      entry.totalAmount += Number(item.remainingBalance);
      entry.invoiceCount += 1;
      entry.items.push(item);
    });
    
    return Array.from(resultMap.values()).filter((c: any) => {
      const query = searchQuery.toLowerCase();
      return c.name.toLowerCase().includes(query);
    });
  }, [activeDebts, activePayables, activeTab, searchQuery, rekapTypeFilter, customerTypeFilter]);

  const totalItems = useMemo(() => {
    if (activeTab === "AR") return filteredDebts.length;
    if (activeTab === "AP") return filteredPayables.length;
    if (activeTab === "REKAP") return rekapData.length;
    if (activeTab === "HISTORY") return historyTotal;
    return 0;
  }, [activeTab, filteredDebts, filteredPayables, rekapData, historyTotal]);

  const totalPages = Math.ceil(totalItems / (activeTab === "HISTORY" ? historyLimit : itemsPerPage));

  // Bulk Payment State
  const [isBulkPaymentOpen, setIsBulkPaymentOpen] = useState(false);
  const [selectedCustomerForBulk, setSelectedCustomerForBulk] = useState<any>(null);

  const handleOpenBulkPayment = (entity: any) => {
    setSelectedCustomerForBulk(entity);
    setPaymentAmount(entity.totalAmount); // Default to full amount
    setPaymentMethod("TRANSFER");
    setPaymentAttachment(null);
    setIsBulkPaymentOpen(true);
  };

  const handleCloseBulkPayment = () => {
    setIsBulkPaymentOpen(false);
    setSelectedCustomerForBulk(null);
    setPaymentAmount(0);
    setPaymentDiscount("");
    setPaymentMethod("TRANSFER");
    setPaymentAttachment(null);
  };

  const handleBulkPaymentSubmit = async () => {
    if (!selectedCustomerForBulk || paymentAmount <= 0) return;
    setIsPaying(true);
    try {
      let attachmentData = null;
      if (paymentAttachment) {
        attachmentData = await getBase64(paymentAttachment);
      }

      const endpoint = rekapTypeFilter === "AR" ? `/api/debts/bulk-payment` : `/api/payables/bulk-payment`;
      const payload = rekapTypeFilter === "AR"
        ? { customerId: selectedCustomerForBulk.id, amount: paymentAmount, paymentMethod, attachment: attachmentData }
        : { supplierId: selectedCustomerForBulk.id, amount: paymentAmount, paymentMethod, attachment: attachmentData };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        sonnerToast.success("Pembayaran sekaligus berhasil dicatat");
        handleCloseBulkPayment();
        fetchDebts();
        fetchHistoryPayments();
      } else {
        const data = await res.json();
        sonnerToast.error(data.error || "Gagal mencatat pembayaran");
      }
    } catch (error) {
      sonnerToast.error("Terjadi kesalahan koneksi");
    } finally {
      setIsPaying(false);
    }
  };

  const fetchHistoryPayments = async () => {
    setIsHistoryLoading(true);
    try {
      const endpoint = historyType === "AR" ? "/api/debts/payments" : "/api/payables/payments";
      let query = `?page=${historyPage}&limit=${historyLimit}`;
      
      if (historySearch) query += `&search=${encodeURIComponent(historySearch)}`;
      if (historyMethod !== "ALL") query += `&method=${historyMethod}`;
      if (historyStartDate) query += `&startDate=${historyStartDate}`;
      if (historyEndDate) query += `&endDate=${historyEndDate}T23:59:59`;

      const res = await fetch(endpoint + query);
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data === "object" && "items" in data) {
          setHistoryPayments(data.items);
          setHistoryTotal(data.total);
        } else if (Array.isArray(data)) {
          setHistoryPayments(data);
          setHistoryTotal(data.length);
        } else {
          setHistoryPayments([]);
          setHistoryTotal(0);
        }
      } else {
        setHistoryPayments([]);
        setHistoryTotal(0);
      }
    } catch (e) {
      console.error("Failed to fetch payment history", e);
      setHistoryPayments([]);
      setHistoryTotal(0);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "HISTORY") {
      fetchHistoryPayments();
    }
  }, [activeTab, historyType, historySearch, historyMethod, historyStartDate, historyEndDate, historyPage, historyLimit]);

  useEffect(() => {
    setHistoryPage(1);
  }, [historyType, historySearch, historyMethod, historyStartDate, historyEndDate]);

  const exportHistoryToPDF = async () => {
    try {
      sonnerToast.info("Menyiapkan data unduhan PDF...");

      const endpoint = historyType === "AR" ? "/api/debts/payments" : "/api/payables/payments";
      let query = `?limit=100000`;
      if (historySearch) query += `&search=${encodeURIComponent(historySearch)}`;
      if (historyMethod !== "ALL") query += `&method=${historyMethod}`;
      if (historyStartDate) query += `&startDate=${historyStartDate}`;
      if (historyEndDate) query += `&endDate=${historyEndDate}T23:59:59`;

      const res = await fetch(endpoint + query);
      if (!res.ok) {
        sonnerToast.error("Gagal memuat data");
        return;
      }
      const rawData = await res.json();
      const dataToExport = Array.isArray(rawData) ? rawData : (rawData.items || []);

      if (dataToExport.length === 0) {
        sonnerToast.error("Tidak ada data untuk diekspor");
        return;
      }

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;

      doc.setFontSize(18);
      doc.setTextColor(15, 74, 138);
      doc.setFont("helvetica", "bold");
      const titleText = historyType === "AR" 
        ? "LAPORAN PENERIMAAN CICILAN PIUTANG (AR)" 
        : "LAPORAN PENGELUARAN CICILAN HUTANG (AP)";
      doc.text(titleText, 14, 20);

      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.setFont("helvetica", "normal");
      
      const rangeText = (historyStartDate || historyEndDate)
        ? `Periode: ${historyStartDate || "-"} s/d ${historyEndDate || "-"}`
        : "Periode: Semua Waktu";
      doc.text(rangeText, 14, 26);
      doc.text(`Metode: ${historyMethod === "ALL" ? "Semua Metode" : historyMethod}`, 14, 31);

      doc.setDrawColor(15, 74, 138);
      doc.setLineWidth(0.5);
      doc.line(14, 35, pageWidth - 14, 35);

      const tableHead = historyType === "AR" 
        ? [["No", "Tanggal", "Nama Pelanggan", "No. Invoice / Ref", "Metode", "Nominal"]]
        : [["No", "Tanggal", "Nama Supplier", "No. Faktur / Ref", "Metode", "Nominal"]];

      const tableData = dataToExport.map((item: any, idx: number) => {
        const pDate = new Date(item.paymentDate).toLocaleDateString("id-ID");
        const name = historyType === "AR"
          ? (item.debt?.sale?.customer?.name || item.debt?.customer?.name || "Pelanggan Umum")
          : (item.payable?.supplier?.name || "-");
        const ref = historyType === "AR"
          ? (item.debt?.sale?.invoiceNumber || item.debt?.reference || "MANUAL")
          : (item.payable?.purchase?.invoiceNumber || item.payable?.reference || "MANUAL");
        
        return [
          idx + 1,
          pDate,
          name,
          ref,
          item.method,
          formatCurrency(Number(item.amountPaid))
        ];
      });

      autoTable(doc, {
        head: tableHead,
        body: tableData,
        startY: 40,
        theme: "grid",
        headStyles: { fillColor: [15, 74, 138], textColor: 255, fontSize: 9, halign: "center" },
        bodyStyles: { fontSize: 8, textColor: 50 },
        columnStyles: {
          0: { halign: "center", cellWidth: 10 },
          4: { halign: "center" },
          5: { halign: "right", fontStyle: "bold" }
        },
        margin: { horizontal: 14 }
      });

      const totalAmount = dataToExport.reduce((sum: number, item: any) => sum + Number(item.amountPaid), 0);
      const finalY = (doc as any).lastAutoTable.finalY + 10;
      
      doc.setFontSize(10);
      doc.setTextColor(0);
      doc.setFont("helvetica", "bold");
      doc.text(`TOTAL PEMBAYARAN: ${formatCurrency(totalAmount)}`, pageWidth - 14, finalY, { align: "right" });

      const now = new Date().toLocaleString("id-ID");
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`Dicetak pada: ${now} | Halaman ${doc.getNumberOfPages()}`, 14, pageHeight - 10);

      const fileName = historyType === "AR" ? "Laporan_Cicilan_Piutang.pdf" : "Laporan_Cicilan_Hutang.pdf";
      doc.save(fileName);
      sonnerToast.success("PDF berhasil diunduh");
    } catch (e) {
      console.error(e);
      sonnerToast.error("Gagal mengekspor PDF");
    }
  };

  const exportHistoryToExcel = async () => {
    try {
      sonnerToast.info("Menyiapkan data unduhan Excel...");

      const endpoint = historyType === "AR" ? "/api/debts/payments" : "/api/payables/payments";
      let query = `?limit=100000`;
      if (historySearch) query += `&search=${encodeURIComponent(historySearch)}`;
      if (historyMethod !== "ALL") query += `&method=${historyMethod}`;
      if (historyStartDate) query += `&startDate=${historyStartDate}`;
      if (historyEndDate) query += `&endDate=${historyEndDate}T23:59:59`;

      const res = await fetch(endpoint + query);
      if (!res.ok) {
        sonnerToast.error("Gagal memuat data");
        return;
      }
      const rawData = await res.json();
      const dataToExport = Array.isArray(rawData) ? rawData : (rawData.items || []);

      if (dataToExport.length === 0) {
        sonnerToast.error("Tidak ada data untuk diekspor");
        return;
      }

      const excelData = dataToExport.map((item: any, idx: number) => {
        const name = historyType === "AR"
          ? (item.debt?.sale?.customer?.name || item.debt?.customer?.name || "Pelanggan Umum")
          : (item.payable?.supplier?.name || "-");
        const ref = historyType === "AR"
          ? (item.debt?.sale?.invoiceNumber || item.debt?.reference || "MANUAL")
          : (item.payable?.purchase?.invoiceNumber || item.payable?.reference || "MANUAL");

        return {
          "No": idx + 1,
          "Tanggal": new Date(item.paymentDate).toLocaleDateString("id-ID"),
          [historyType === "AR" ? "Nama Pelanggan" : "Nama Supplier"]: name,
          "Referensi / No. Invoice": ref,
          "Metode Pembayaran": item.method,
          "Nominal Pembayaran (IDR)": Number(item.amountPaid)
        };
      });

      const ws = XLSX.utils.json_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Riwayat Cicilan");

      const colWidths = [
        { wch: 5 },
        { wch: 15 },
        { wch: 25 },
        { wch: 25 },
        { wch: 15 },
        { wch: 22 }
      ];
      ws["!cols"] = colWidths;

      const fileName = historyType === "AR" ? "Laporan_Cicilan_Piutang.xlsx" : "Laporan_Cicilan_Hutang.xlsx";
      XLSX.writeFile(wb, fileName);
      sonnerToast.success("Excel berhasil diunduh");
    } catch (e) {
      console.error(e);
      sonnerToast.error("Gagal mengekspor Excel");
    }
  };

  const handleHistoryStartDateChange = (val: string) => {
    setHistoryStartDate(val);
    if (historyEndDate && val > historyEndDate) {
      setHistoryEndDate(val);
    }
  };

  const handleHistoryEndDateChange = (val: string) => {
    setHistoryEndDate(val);
    if (historyStartDate && val < historyStartDate) {
      setHistoryStartDate(val);
    }
  };

  return (
    <phantom-ui loading={isLoading} reveal={0.3}>
      <div className="px-4 pb-4 lg:px-8 lg:pb-8 h-full overflow-y-auto custom-scrollbar flex flex-col transition-colors duration-300 bg-bg-main pb-24 lg:pb-8">
      {/* Summary Stats (Carousel on Mobile) */}
      <div className="flex overflow-x-auto pb-10 -mx-4 px-4 lg:-mx-6 lg:px-6 lg:grid lg:grid-cols-3 gap-6 lg:gap-6 flex-shrink-0 scrollbar-hide pt-4 lg:pt-8 lg:pb-12">
        <div className="min-w-[260px] lg:min-w-0 flex-1">
          <SummaryCard 
            title="Total Piutang Jatuh Tempo" 
            value={formatCurrency(stats.totalOverdueDebts)} 
            icon={<AlertCircle className="w-6 h-6" />}
            iconRightContent={
              <span className="text-[10px] lg:text-xs font-bold text-text-secondary">
                Total Aktif: <span className="text-brand-primary">{formatCurrency(stats.totalRemaining)}</span>
              </span>
            }
            color="red"
            className="shadow-sm border-border-default"
            isLoading={isLoading}
            onClick={() => {
              if (activeTab === "AR" && agingFilter === "OVERDUE") {
                setAgingFilter("ALL");
              } else {
                setActiveTab("AR");
                setAgingFilter("OVERDUE");
              }
            }}
            isActive={activeTab === "AR" && agingFilter === "OVERDUE"}
          />
        </div>
        <div className="min-w-[260px] lg:min-w-0 flex-1">
          <SummaryCard 
            title="Total Hutang Jatuh Tempo" 
            value={formatCurrency(stats.totalOverduePayables)} 
            icon={<AlertCircle className="w-6 h-6" />}
            iconRightContent={
              <span className="text-[10px] lg:text-xs font-bold text-text-secondary">
                Total Aktif: <span className="text-status-warning">{formatCurrency(stats.totalPayables)}</span>
              </span>
            }
            color="orange"
            className="shadow-sm border-border-default"
            isLoading={isLoading}
            onClick={() => {
              if (activeTab === "AP" && agingFilter === "OVERDUE") {
                setAgingFilter("ALL");
              } else {
                setActiveTab("AP");
                setAgingFilter("OVERDUE");
              }
            }}
            isActive={activeTab === "AP" && agingFilter === "OVERDUE"}
          />
        </div>
        <div className="min-w-[260px] lg:min-w-0 flex-1">
          <SummaryCard 
            title="Total Piutang Terbayar (Bulan Ini)" 
            value={formatCurrency(stats.paidDebtsThisMonth)} 
            icon={<CheckCircle2 className="w-6 h-6" />}
            iconRightContent={
              <span className="text-[10px] lg:text-xs font-bold text-text-secondary">
                Hutang Terbayar: <span className="text-status-warning">{formatCurrency(stats.paidPayablesThisMonth)}</span>
              </span>
            }
            color="green"
            className="shadow-sm border-border-default"
            isLoading={isLoading}
            onClick={() => {
              const now = new Date();
              const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
              const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
              
              const formatString = (d: Date) => {
                const y = d.getFullYear();
                const m = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                return `${y}-${m}-${day}`;
              };

              const currentMonthStart = formatString(firstDay);
              const currentMonthEnd = formatString(lastDay);

              if (activeTab === "HISTORY" && historyStartDate === currentMonthStart && historyEndDate === currentMonthEnd) {
                // Toggle off date filters
                setHistoryStartDate("");
                setHistoryEndDate("");
              } else {
                // Toggle on
                setActiveTab("HISTORY");
                setHistoryStartDate(currentMonthStart);
                setHistoryEndDate(currentMonthEnd);
              }
            }}
            isActive={activeTab === "HISTORY" && historyStartDate !== "" && historyEndDate !== ""}
          />
        </div>
      </div>

      {/* Scrollable Pills Tabs (Reordered to Center) */}
      <div data-shimmer-ignore className="flex flex-col sm:flex-row sm:items-center sm:justify-between my-6 gap-6">
        <div className="flex items-center space-x-2 overflow-x-auto scrollbar-hide flex-shrink-0 -mx-4 px-4 sm:mx-0 sm:px-0">
          <button
            onClick={() => setActiveTab("AR")}
            className={cn(
              "px-6 py-2.5 rounded-full text-xs font-bold transition-all whitespace-nowrap",
              activeTab === "AR" 
                ? "bg-brand-primary text-text-inverse shadow-lg shadow-brand-primary/20" 
                : "bg-bg-card text-text-secondary border border-border-default hover:bg-bg-main hover:text-text-primary"
            )}
          >
            Piutang Pelanggan (AR)
          </button>
          <button
            onClick={() => setActiveTab("REKAP")}
            className={cn(
              "px-6 py-2.5 rounded-full text-xs font-bold transition-all whitespace-nowrap",
              activeTab === "REKAP" 
                ? "bg-brand-primary text-text-inverse shadow-lg shadow-brand-primary/20" 
                : "bg-bg-card text-text-secondary border border-border-default hover:bg-bg-main hover:text-text-primary"
            )}
          >
            Rekap
          </button>
          <button
            onClick={() => setActiveTab("AP")}
            className={cn(
              "px-6 py-2.5 rounded-full text-xs font-bold transition-all whitespace-nowrap",
              activeTab === "AP" 
                ? "bg-brand-primary text-text-inverse shadow-lg shadow-brand-primary/20" 
                : "bg-bg-card text-text-secondary border border-border-default hover:bg-bg-main hover:text-text-primary"
            )}
          >
            Hutang Supplier (AP)
          </button>
          <button
            onClick={() => setActiveTab("HISTORY")}
            className={cn(
              "px-6 py-2.5 rounded-full text-xs font-bold transition-all whitespace-nowrap",
              activeTab === "HISTORY" 
                ? "bg-brand-primary text-text-inverse shadow-lg shadow-brand-primary/20" 
                : "bg-bg-card text-text-secondary border border-border-default hover:bg-bg-main hover:text-text-primary"
            )}
          >
            Riwayat Pembayaran
          </button>
        </div>

      </div>

      {activeTab === "AR" && typeof window !== "undefined" && "Notification" in window && notificationPermission !== "granted" && (
        <div className={cn(
          "mb-4 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-6 animate-in fade-in duration-300 border text-left",
          notificationPermission === "denied" 
            ? "bg-status-danger/10 border-status-danger/20" 
            : "bg-brand-light/30 border-brand-primary/20"
        )}>
          <div className="flex items-center space-x-3 text-left">
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
              notificationPermission === "denied" ? "bg-status-danger/20 text-status-danger" : "bg-brand-light text-brand-primary"
            )}>
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-black text-text-primary">
                {notificationPermission === "denied" 
                  ? "Izin Notifikasi Desktop Diblokir" 
                  : "Aktifkan Notifikasi Desktop"}
              </h4>
              <p className="text-xs text-text-muted mt-0.5">
                {notificationPermission === "denied"
                  ? "Notifikasi diblokir oleh browser. Silakan klik ikon gembok di sebelah alamat web (URL) browser Anda untuk mengizinkan notifikasi."
                  : "Izinkan notifikasi browser untuk menerima pengingat otomatis di komputer Anda saat piutang jatuh tempo."}
              </p>
            </div>
          </div>
          {notificationPermission !== "denied" && (
            <button 
              onClick={handleRequestPermission}
              className="bg-brand-primary text-text-inverse hover:bg-brand-hover transition-all font-bold self-start sm:self-auto cursor-pointer rounded-full px-7 py-[14px] text-[14px] font-bold active:scale-95 transition-transform"
            >
              Aktifkan Sekarang
            </button>
          )}
        </div>
      )}

      {/* Main Content Area (Blok 2 - Filter & Table) */}
      <div className="rounded-[32px] lg:rounded-[2.5rem] border flex flex-col bg-bg-card border-border-default transition-all duration-300 transform-gpu overflow-visible">
        <div className="sticky top-0 z-20 p-8 lg:p-8 border-b border-border-subtle bg-bg-card rounded-t-[32px] lg:rounded-t-[2.5rem]">
          <div className="flex items-center gap-2">
            {activeTab === "HISTORY" ? (
              <div className="flex flex-col xl:flex-row items-center gap-6 w-full">
                {/* Search */}
                <div className="relative flex-1 w-full flex items-center group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted w-5 h-5 transition-colors group-focus-within:text-brand-primary" />
                  <input 
                    type="text" 
                    placeholder="Cari pelanggan / supplier / invoice..." 
                    className="w-full pl-12 pr-4 py-2.5 lg:py-3 border shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-all text-sm bg-bg-main border-border-default text-text-primary placeholder:text-text-muted rounded-full h-[44px]"
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                  />
                </div>

                {/* Date Start */}
                <div className="flex items-center gap-2 bg-bg-main px-3 rounded-xl border border-border-default h-10 shrink-0">
                  <div className="relative flex items-center h-full">
                    <Calendar className="absolute left-2.5 w-4 h-4 text-text-secondary pointer-events-none z-10" />
                    <input 
                      type="date" 
                      value={historyStartDate}
                      max={historyEndDate || undefined}
                      onChange={(e) => handleHistoryStartDateChange(e.target.value)}
                      className="pl-9 pr-3 h-full bg-transparent text-xs font-bold text-text-primary min-w-[130px] focus:outline-none cursor-pointer relative z-0"
                    />
                  </div>
                  <span className="text-text-muted font-bold">-</span>
                  <div className="relative flex items-center h-full">
                    <Calendar className="absolute left-2.5 w-4 h-4 text-text-secondary pointer-events-none z-10" />
                    <input 
                      type="date" 
                      value={historyEndDate}
                      min={historyStartDate || undefined}
                      onChange={(e) => handleHistoryEndDateChange(e.target.value)}
                      className="pl-9 pr-3 h-full bg-transparent text-xs font-bold text-text-primary min-w-[130px] focus:outline-none cursor-pointer relative z-0"
                    />
                  </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-6 w-full xl:w-auto">
                  {/* Type Filter */}
                  <select 
                    value={historyType}
                    onChange={(e) => setHistoryType(e.target.value as any)}
                    className="w-full sm:w-auto px-4 py-2 border rounded-xl text-sm font-bold bg-bg-main border-border-default text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary transition-all cursor-pointer h-[40px] [&>option]:bg-bg-main [&>option]:text-text-primary flex-1 sm:flex-initial shrink-0"
                  >
                    <option value="AR">Piutang Pelanggan (AR)</option>
                    <option value="AP">Hutang Supplier (AP)</option>
                  </select>

                  {/* Method Filter */}
                  <select 
                    value={historyMethod}
                    onChange={(e) => setHistoryMethod(e.target.value as any)}
                    className="w-full sm:w-auto px-4 py-2 border rounded-xl text-sm font-bold bg-bg-main border-border-default text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary transition-all cursor-pointer h-[40px] [&>option]:bg-bg-main [&>option]:text-text-primary flex-1 sm:flex-initial shrink-0"
                  >
                    <option value="ALL">Semua Metode</option>
                    <option value="CASH">TUNAI</option>
                    <option value="TRANSFER">TRANSFER</option>
                  </select>

                  {/* Export Buttons */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button 
                      onClick={exportHistoryToExcel}
                      className="flex items-center justify-center space-x-1.5 h-11 border font-bold bg-bg-main border-border-default hover:bg-bg-main hover:brightness-95 text-emerald-600 hover:border-emerald-500/30 transition-all cursor-pointer whitespace-nowrap rounded-full px-6 py-[12px] text-[14px] font-bold active:scale-95 transition-transform"
                      title="Ekspor ke Excel"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      <span>Excel</span>
                    </button>
                    <button 
                      onClick={exportHistoryToPDF}
                      className="flex items-center justify-center space-x-1.5 h-11 border font-bold bg-bg-main border-border-default hover:bg-bg-main hover:brightness-95 text-rose-600 hover:border-rose-500/30 transition-all cursor-pointer whitespace-nowrap rounded-full px-6 py-[12px] text-[14px] font-bold active:scale-95 transition-transform"
                      title="Ekspor ke PDF"
                    >
                      <Download className="w-4 h-4" />
                      <span>PDF</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {!isLoading && (
                  <div className="relative flex-1 flex items-center group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted w-5 h-5 transition-colors group-focus-within:text-brand-primary" />
                    <input 
                      type="text" 
                      placeholder="Cari pelanggan / invoice / referensi..." 
                      className="w-full pl-12 pr-4 py-2.5 lg:py-3 border shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-all text-sm bg-bg-main border-border-default text-text-primary placeholder:text-text-muted rounded-full h-[44px]"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                )}
                {activeTab === "REKAP" && (
                  <select 
                    value={rekapTypeFilter}
                    onChange={(e) => setRekapTypeFilter(e.target.value as any)}
                    className="px-4 py-2 border rounded-xl text-sm font-bold bg-bg-main border-border-default text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary transition-all cursor-pointer h-[40px] [&>option]:bg-bg-main [&>option]:text-text-primary w-[160px] sm:w-auto shrink-0"
                  >
                    <option value="AR">Piutang Pelanggan (AR)</option>
                    <option value="AP">Hutang Supplier (AP)</option>
                  </select>
                )}
                {(activeTab === "AR" || activeTab === "AP") && (
                  <div className="flex items-center gap-2 bg-bg-main px-3 rounded-xl border border-border-default h-10 shrink-0">
                    <div className="relative flex items-center h-full">
                      <Calendar className="absolute left-2.5 w-4 h-4 text-text-secondary pointer-events-none z-10" />
                      <input 
                        type="date" 
                        value={dateStart}
                        max={dateEnd || undefined}
                        onChange={(e) => handleDateStartChange(e.target.value)}
                        className="pl-9 pr-3 h-full bg-transparent text-xs font-bold text-text-primary min-w-[130px] focus:outline-none cursor-pointer relative z-0"
                      />
                    </div>
                    <span className="text-text-muted font-bold">-</span>
                    <div className="relative flex items-center h-full">
                      <Calendar className="absolute left-2.5 w-4 h-4 text-text-secondary pointer-events-none z-10" />
                      <input 
                        type="date" 
                        value={dateEnd}
                        min={dateStart || undefined}
                        onChange={(e) => handleDateEndChange(e.target.value)}
                        className="pl-9 pr-3 h-full bg-transparent text-xs font-bold text-text-primary min-w-[130px] focus:outline-none cursor-pointer relative z-0"
                      />
                    </div>
                  </div>
                )}
                {(activeTab === "AR" || (activeTab === "REKAP" && rekapTypeFilter === "AR")) && (
                      <select 
                        value={customerTypeFilter}
                        onChange={(e) => setCustomerTypeFilter(e.target.value as any)}
                        className="px-4 py-2 border rounded-xl text-sm font-bold bg-bg-main border-border-default text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary transition-all cursor-pointer h-[40px] [&>option]:bg-bg-main [&>option]:text-text-primary w-[130px] sm:w-auto shrink-0"
                      >
                        <option value="ALL">Semua Tipe</option>
                        <option value="RETAIL">Retail</option>
                        <option value="PROJECT">Proyek</option>
                      </select>
                )}
                {(activeTab === "AR" || activeTab === "AP") && (
                      <select 
                        value={agingFilter}
                        onChange={(e) => setAgingFilter(e.target.value as any)}
                        className="px-4 py-2 border rounded-xl text-sm font-bold bg-bg-main border-border-default text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary transition-all cursor-pointer h-[40px] [&>option]:bg-bg-main [&>option]:text-text-primary w-[130px] sm:w-auto shrink-0"
                      >
                        <option value="ALL">Semua Status</option>
                        <option value="NOT_DUE">Belum Jatuh Tempo</option>
                        <option value="OVERDUE">Lewat JT (Semua)</option>
                        <option value="1_30">Lewat JT (1-30 Hari)</option>
                        <option value="31_60">Lewat JT (31-60 Hari)</option>
                        <option value="OVER_60">Lewat JT (&gt;60 Hari)</option>
                      </select>
                )}
                {(activeTab === "AR" || activeTab === "AP") && (
                  <button
                    onClick={() => {
                      if (activeTab === "AR") setIsAddDebtOpen(true);
                      else if (activeTab === "AP") setIsAddPayableOpen(true);
                    }}
                    className="flex items-center space-x-2 px-5 h-11 bg-brand-primary text-text-inverse rounded-xl font-bold text-sm shadow-lg shadow-brand-primary/20 hover:bg-brand-hover transition-all active:scale-95 shrink-0"
                  >
                    <Plus className="w-5 h-5" />
                    <span className="hidden sm:inline">{activeTab === "AR" ? "Tambah Piutang Manual" : "Tambah Hutang Manual"}</span>
                    <span className="sm:hidden">Tambah</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        <div className="p-0">
            <div key={activeTab} className="w-full">
              {/* Desktop Table */}
          <table className="hidden lg:table w-full text-left border-collapse min-w-[800px]">
            <thead data-shimmer-ignore>
              {activeTab === "HISTORY" ? (
                <tr className="sticky lg:top-[177px] xl:top-[109px] z-10 bg-bg-main shadow-sm">
                  <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider">Tanggal</th>
                  <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider">
                    {historyType === "AR" ? "Pelanggan" : "Supplier"}
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider">Faktur / Ref</th>
                  <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider text-center">Metode</th>
                  <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider text-center">Bukti</th>
                  <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider text-right">Nominal</th>
                </tr>
              ) : activeTab === "REKAP" ? (
                <tr className="sticky lg:top-[109px] z-10 bg-bg-main shadow-sm">
                  <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider">
                    {rekapTypeFilter === "AR" ? "Pelanggan" : "Pemasok"}
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider text-center">Jumlah Invoice</th>
                  <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider text-right">
                    {rekapTypeFilter === "AR" ? "Total Piutang" : "Total Hutang"}
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider text-right">Aksi</th>
                </tr>
              ) : activeTab === "AP" ? (
                <tr className="sticky lg:top-[109px] z-10 bg-bg-main shadow-sm">
                  <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider">Pemasok (Supplier)</th>
                  <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider">Faktur</th>
                  <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider">Jatuh Tempo</th>
                  <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider text-right">Total Hutang</th>
                  <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider text-right">Sisa Saldo</th>
                  <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider text-center">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider text-right">Aksi</th>
                </tr>
              ) : (
                <tr className="sticky lg:top-[109px] z-10 bg-bg-main shadow-sm">
                  <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider">Pelanggan</th>
                  <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider">Invoice</th>
                  <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider">Jatuh Tempo</th>
                  <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider text-right">Total</th>
                  <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider text-right">Sisa Saldo</th>
                  <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider text-center">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider text-right">Aksi</th>
                </tr>
              )}
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {activeTab === "HISTORY" ? (
                isHistoryLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-xs text-text-muted font-bold">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-primary" />
                      Memuat data histori...
                    </td>
                  </tr>
                ) : historyPayments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center">
                      <EmptyState 
                        icon={History}
                        title="Riwayat Pembayaran Kosong"
                        description="Belum ada transaksi pembayaran cicilan yang sesuai dengan filter Anda."
                      />
                    </td>
                  </tr>
                ) : (
                  historyPayments.map((item) => {
                    const pDate = new Date(item.paymentDate).toLocaleDateString("id-ID");
                    const name = historyType === "AR"
                      ? (item.debt?.sale?.customer?.name || item.debt?.customer?.name || "Pelanggan Umum")
                      : (item.payable?.supplier?.name || "-");
                    const ref = historyType === "AR"
                      ? (item.debt?.sale?.invoiceNumber || item.debt?.reference || "MANUAL")
                      : (item.payable?.purchase?.invoiceNumber || item.payable?.reference || "MANUAL");
                    
                    return (
                      <tr key={item.id} className="transition-colors hover:bg-bg-main/50">
                        <td className="px-6 py-4 text-sm text-text-secondary font-medium">{pDate}</td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-bold text-text-primary">{name}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-mono text-xs px-2 py-1 rounded text-text-muted bg-bg-main w-fit">
                            {ref}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="px-2.5 py-0.5 border rounded-full text-[10px] font-bold uppercase bg-bg-card border-border-default text-text-muted">
                            {item.method}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {item.attachment ? (
                            <button 
                              onClick={() => setViewingAttachment(item.attachment)}
                              className="flex items-center justify-center gap-1 text-[10px] text-brand-primary font-bold hover:underline mx-auto"
                            >
                              <img src={item.attachment} alt="Resi" className="w-6 h-6 object-cover rounded border border-border-subtle" />
                              <span>Lihat</span>
                            </button>
                          ) : (
                            <span className="text-text-muted text-[10px]">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className={cn(
                            "font-black text-sm",
                            historyType === "AR" ? "text-status-success" : "text-brand-primary"
                          )}>
                            {historyType === "AR" ? "+" : "-"}{formatCurrency(Number(item.amountPaid))}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )
              ) : activeTab === "AP" ? (
                filteredPayables.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center">
                      <EmptyState 
                        icon={CreditCard}
                        title="Data Hutang Kosong"
                        description="Semua kewajiban pembayaran kepada supplier akan tercatat otomatis di sini."
                      />
                    </td>
                  </tr>
                ) : (
                  filteredPayables.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((payable) => (
                    <tr key={payable.id} onClick={() => setSelectedDebt({ ...payable, isAP: true })} className="transition-colors hover:bg-bg-main/50 cursor-pointer">
                      <td className="px-6 py-4">
                        <div data-shimmer-no-children className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-text-muted bg-bg-main shrink-0">
                            <User className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-text-primary">{payable.supplier?.name || "-"}</p>
                            <p className="text-[10px] text-text-muted font-medium">{payable.supplier?.phone || "-"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div data-shimmer-no-children className="flex flex-col gap-0.5">
                          <span className="font-mono text-xs px-2 py-1 rounded text-text-muted bg-bg-main w-fit">
                            {payable.purchase?.invoiceNumber || payable.reference || "MANUAL"}
                          </span>
                          <span className="text-[10px] text-text-secondary font-medium">
                            Tgl Transaksi: {new Date(payable.purchase?.createdAt || payable.createdAt).toLocaleDateString("id-ID")}
                          </span>
                          {payable.notes && (
                            <div className="mt-1 flex items-center space-x-1 text-[9px] text-text-muted font-medium bg-bg-main/50 px-2 py-0.5 rounded-md border border-border-subtle max-w-[170px] self-start" title={payable.notes}>
                              <ClipboardList className="w-2.5 h-2.5 text-text-muted/60 shrink-0" />
                              <span className="truncate">{payable.notes}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div data-shimmer-no-children className={cn(
                          "flex items-center space-x-2 text-xs font-medium",
                          payable.status !== "PAID" && new Date(payable.dueDate) < new Date(new Date().setHours(0,0,0,0)) 
                            ? "text-status-danger" 
                            : "text-text-secondary"
                        )}>
                          <Calendar className="w-3 h-3" />
                          <span>{new Date(payable.dueDate).toLocaleDateString("id-ID")}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-text-secondary text-sm">
                        <span data-shimmer-no-children className="block w-fit ml-auto">
                          {formatCurrency(Number(payable.amountDue) - (payable.payments?.reduce((sum: number, p: any) => sum + Number(p.discount || 0), 0) || 0))}
                        </span>
                      </td>
                      <td className={cn(
                        "px-6 py-4 text-right font-black text-sm",
                        payable.status === "PAID" ? "text-text-muted/50" : "text-status-danger"
                      )}>
                        <span data-shimmer-no-children className="block w-fit ml-auto">{formatCurrency(Number(payable.remainingBalance))}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span data-shimmer-no-children className={cn(
                          "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                          payable.status === "PAID" ? "bg-status-success/10 text-status-success" : 
                          payable.status === "PARTIAL" ? "bg-brand-light text-brand-primary" : "bg-status-danger/10 text-status-danger"
                        )}>
                          {payable.status === "PAID" ? "Lunas" : 
                           payable.status === "PARTIAL" ? "Cicilan" : "Belum Bayar"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div data-shimmer-no-children className="flex items-center justify-end space-x-2">
                          <button 
                            onClick={(e) => { e.stopPropagation(); setSelectedDebt({ ...payable, isAP: true }); }}
                            disabled={payable.status === "PAID"}
                            className={cn(
                              "p-2 border rounded-xl transition-all",
                              payable.status === "PAID" ? "opacity-30 cursor-not-allowed bg-bg-main border-border-subtle text-text-muted" : "bg-bg-card border-border-default text-brand-primary hover:bg-brand-light"
                            )}
                            title="Bayar"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={(e) => handleEditAmountClick(e, { ...payable, isAP: true })}
                            className="p-2 border rounded-xl bg-bg-card border-border-default text-brand-primary hover:bg-brand-light transition-all"
                            title="Ubah Nominal"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={(e) => handleDeleteDebtClick(e, { ...payable, isAP: true })}
                            className="p-2 border rounded-xl bg-bg-card border-border-default text-status-danger hover:bg-status-danger/10 transition-all"
                            title="Hapus Data"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )
              ) : activeTab === "REKAP" ? (
                rekapData.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-center">
                      <EmptyState 
                        icon={History}
                        title="Rekap Data Kosong"
                        description="Ringkasan total saldo per pelanggan atau supplier akan ditampilkan di halaman ini."
                      />
                    </td>
                  </tr>
                ) : (
                  rekapData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((customer: any) => (
                    <tr key={customer.id} className="transition-colors hover:bg-bg-main/50">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-text-muted bg-bg-main">
                            <User className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-text-primary">{customer.name}</p>
                            <p className="text-[10px] text-text-muted font-medium">{customer.phone}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-brand-light text-brand-primary">
                          {customer.invoiceCount} Invoice
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-black text-status-danger text-sm">
                        <span className="block w-fit ml-auto">{formatCurrency(customer.totalAmount)}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button 
                          onClick={() => handleOpenBulkPayment(customer)}
                          className="px-4 py-2 bg-brand-primary text-text-inverse rounded-xl font-bold text-xs hover:bg-brand-hover transition-all shadow-md shadow-brand-primary/20"
                        >
                          Bayar Sekaligus
                        </button>
                      </td>
                    </tr>
                  ))
                )
              ) : filteredDebts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center">
                    <EmptyState 
                      icon={Receipt}
                      title="Data Piutang Kosong"
                      description="Daftar tagihan pelanggan dari transaksi tempo akan muncul di sini secara otomatis."
                    />
                  </td>
                </tr>
              ) : (
                filteredDebts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((debt) => (
                  <tr key={debt.id} onClick={() => setSelectedDebt(debt)} className="transition-colors hover:bg-bg-main/50 cursor-pointer">
                    <td className="px-6 py-4">
                      <div data-shimmer-no-children className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-text-muted bg-bg-main shrink-0">
                          <User className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-text-primary">{debt.sale?.customer?.name || debt.customer?.name || "Pelanggan Umum"}</p>
                          <p className="text-[10px] text-text-muted font-medium">{debt.sale?.customer?.phone || debt.customer?.phone || "-"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div data-shimmer-no-children className="flex flex-col gap-0.5">
                        <span className="font-mono text-xs px-2 py-1 rounded text-text-muted bg-bg-main w-fit">
                          {debt.sale?.invoiceNumber || debt.reference || "MANUAL"}
                        </span>
                        <span className="text-[10px] text-text-secondary font-medium">
                          Tgl Transaksi: {new Date(debt.sale?.createdAt || debt.createdAt).toLocaleDateString("id-ID")}
                        </span>
                        {debt.notes && (
                          <div className="mt-1 flex items-center space-x-1 text-[9px] text-text-muted font-medium bg-bg-main/50 px-2 py-0.5 rounded-md border border-border-subtle max-w-[170px] self-start" title={debt.notes}>
                            <ClipboardList className="w-2.5 h-2.5 text-text-muted/60 shrink-0" />
                            <span className="truncate">{debt.notes}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div data-shimmer-no-children className="flex flex-col text-left">
                        <div className={cn(
                          "flex items-center space-x-2 text-xs font-normal",
                          debt.status !== "PAID" && new Date(debt.dueDate) < new Date(new Date().setHours(0,0,0,0))
                            ? "text-status-danger"
                            : "text-text-secondary"
                        )}>
                          <Calendar className={cn(
                            "w-3.5 h-3.5",
                            debt.status !== "PAID" && new Date(debt.dueDate) < new Date(new Date().setHours(0,0,0,0))
                              ? "text-status-danger"
                              : "text-text-muted/80"
                          )} />
                          <span>{new Date(debt.dueDate).toLocaleDateString("id-ID")}</span>
                        </div>

                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-text-secondary text-sm">
                      <span data-shimmer-no-children className="block w-fit ml-auto">
                        {formatCurrency(Number(debt.amountDue) - (debt.payments?.reduce((sum: number, p: any) => sum + Number(p.discount || 0), 0) || 0))}
                      </span>
                    </td>
                    <td className={cn(
                      "px-6 py-4 text-right font-black text-sm",
                      debt.status === "PAID" ? "text-text-muted/50" : "text-status-danger"
                    )}>
                      <span data-shimmer-no-children className="block w-fit ml-auto">{formatCurrency(Number(debt.remainingBalance))}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span data-shimmer-no-children className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                        debt.status === "PAID" ? "bg-status-success/10 text-status-success" : 
                        debt.status === "PARTIAL" ? "bg-brand-light text-brand-primary" : "bg-status-danger/10 text-status-danger"
                      )}>
                        {debt.status === "PAID" ? "Lunas" : 
                         debt.status === "PARTIAL" ? "Cicilan" : "Belum Bayar"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div data-shimmer-no-children className="flex items-center justify-end space-x-2">
                        <button 
                          onClick={(e) => { e.stopPropagation(); setSelectedDebt(debt); }}
                          disabled={debt.status === "PAID"}
                          className={cn(
                            "p-2 border rounded-xl transition-all",
                            debt.status === "PAID" ? "opacity-30 cursor-not-allowed bg-bg-main border-border-subtle text-text-muted" : "bg-bg-card border-border-default text-brand-primary hover:bg-brand-light"
                          )}
                          title="Bayar"
                        >
                          <Eye className="w-4 h-4" />
                        </button>


                        <button 
                          onClick={(e) => handleDeleteDebtClick(e, debt)}
                          className="p-2 border rounded-xl bg-bg-card border-border-default text-status-danger hover:bg-status-danger/10 transition-all"
                          title="Hapus Data"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>


          {/* Mobile Cards */}
          <div className="block lg:hidden p-4 space-y-8">
            {activeTab === "HISTORY" ? (
              isHistoryLoading ? (
                <div className="py-12 text-center text-xs text-text-muted font-bold">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-primary" />
                  Memuat data histori...
                </div>
              ) : historyPayments.length === 0 ? (
                <div className="py-4">
                  <EmptyState 
                    icon={History}
                    title="Riwayat Kosong"
                    description="Belum ada transaksi pembayaran cicilan yang sesuai dengan filter Anda."
                  />
                </div>
              ) : (
                historyPayments.map((item) => {
                  const pDate = new Date(item.paymentDate).toLocaleDateString("id-ID");
                  const name = historyType === "AR"
                    ? (item.debt?.sale?.customer?.name || item.debt?.customer?.name || "Pelanggan Umum")
                    : (item.payable?.supplier?.name || "-");
                  const ref = historyType === "AR"
                    ? (item.debt?.sale?.invoiceNumber || item.debt?.reference || "MANUAL")
                    : (item.payable?.purchase?.invoiceNumber || item.payable?.reference || "MANUAL");

                  return (
                    <div key={item.id} className="bg-bg-card rounded-[32px] p-8 border border-border-default active:scale-[0.98] transition-all">
                      <div className="flex items-center justify-between gap-6">
                        <div className="flex items-center space-x-3 min-w-0">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-bg-main text-brand-primary flex-shrink-0">
                            <User className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-black text-text-primary truncate">{name}</p>
                            <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                              <span className="font-mono text-[9px] font-bold text-text-muted">
                                {ref}
                              </span>
                              <span className="w-1 h-1 rounded-full bg-text-muted/30"></span>
                              <span className="text-[9px] text-text-secondary font-medium">
                                Tgl: {pDate}
                              </span>
                              <span className="w-1 h-1 rounded-full bg-text-muted/30"></span>
                              <span className="px-1.5 py-0.2 rounded border text-[8px] font-black uppercase bg-bg-card border-border-default text-text-muted">
                                {item.method}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end shrink-0">
                          <p className={cn(
                            "text-sm font-black",
                            historyType === "AR" ? "text-status-success" : "text-brand-primary"
                          )}>
                            {historyType === "AR" ? "+" : "-"}{formatCurrency(Number(item.amountPaid))}
                          </p>
                          {item.attachment && (
                            <button 
                              onClick={() => setViewingAttachment(item.attachment)}
                              className="text-[9px] text-brand-primary font-bold hover:underline mt-1"
                            >
                              Lihat Bukti
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )
            ) : activeTab === "AP" ? (
                filteredPayables.length === 0 ? (
                  <div className="py-4">
                    <EmptyState 
                      icon={CreditCard}
                      title="Hutang Kosong"
                      description="Belum ada catatan hutang supplier saat ini."
                    />
                  </div>
                ) : (
                  filteredPayables.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((payable) => {
                    const isPaid = payable.status === "PAID";
                    return (
                      <div key={payable.id} className={cn("bg-bg-card rounded-[32px] p-8 border transition-all", isPaid ? "border-border-default opacity-80" : "border-border-default cursor-pointer hover:border-brand-primary/50 active:scale-[0.98]")} onClick={() => !isPaid && setSelectedDebt({ ...payable, isAP: true })}>
                        <div data-shimmer-no-children className="flex items-center justify-between gap-6">
                          <div className="flex items-center space-x-3 min-w-0">
                            <div className={cn(
                              "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                              isPaid ? "bg-bg-main text-text-muted/50" : "bg-bg-main text-brand-primary"
                            )}>
                              <User className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <p className={cn("text-sm font-black truncate", isPaid ? "text-text-muted" : "text-text-primary")}>
                                {payable.supplier?.name || "-"}
                              </p>
                              <div className="flex items-center space-x-2 mt-0.5">
                                <span className="font-mono text-[9px] font-bold text-text-muted">
                                  {payable.purchase?.invoiceNumber || payable.reference || "MANUAL"}
                                </span>
                                <span className="w-1 h-1 rounded-full bg-text-muted/30"></span>
                                <span className="text-[9px] text-text-secondary font-medium">
                                  Tgl: {new Date(payable.purchase?.createdAt || payable.createdAt).toLocaleDateString("id-ID")}
                                </span>
                                <span className="w-1 h-1 rounded-full bg-text-muted/30"></span>
                                <span className={cn(
                                  "text-[9px] font-bold",
                                  isPaid ? "text-text-muted/70" : 
                                  new Date(payable.dueDate) < new Date(new Date().setHours(0,0,0,0)) ? "text-status-danger" : "text-status-warning"
                                )}>
                                  JT: {new Date(payable.dueDate).toLocaleDateString("id-ID")}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col items-end shrink-0">
                            <p className={cn(
                              "text-sm font-black",
                              isPaid ? "text-text-muted/50" : "text-status-danger"
                            )}>
                              {formatCurrency(Number(payable.remainingBalance))}
                            </p>
                            <span className={cn(
                              "px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider mt-1 border",
                              isPaid ? "bg-bg-main text-text-muted/40 border-border-subtle" : 
                              payable.status === "PARTIAL" ? "bg-brand-light text-brand-primary border-brand-primary/20" : 
                              "bg-status-danger/10 text-status-danger border-status-danger/20"
                            )}>
                              {payable.status === "PAID" ? "Lunas" : 
                               payable.status === "PARTIAL" ? "Cicilan" : "Belum Bayar"}
                            </span>
                          </div>
                        </div>
                        {/* Mobile Actions */}
                        {!isPaid && (
                          <div className="mt-4 pt-4 border-t border-border-subtle flex items-center justify-end gap-2">
                            <button 
                              onClick={(e) => handleEditAmountClick(e, { ...payable, isAP: true })}
                              className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-bg-main border border-border-default text-brand-primary flex items-center gap-1 hover:bg-brand-light"
                            >
                              <Edit className="w-3 h-3" /> Edit
                            </button>
                            <button 
                              onClick={(e) => handleDeleteDebtClick(e, { ...payable, isAP: true })}
                              className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-bg-main border border-border-default text-status-danger flex items-center gap-1 hover:bg-status-danger/10"
                            >
                              <Trash2 className="w-3 h-3" /> Hapus
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )
            ) : activeTab === "REKAP" ? (
                rekapData.length === 0 ? (
                  <div className="py-4">
                    <EmptyState 
                      icon={History}
                      title="Rekap Kosong"
                      description="Belum ada ringkasan tagihan untuk ditampilkan."
                    />
                  </div>
                ) : (
                  rekapData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((customer: any) => (
                    <div key={customer.id} className="bg-bg-card rounded-[32px] p-8 border border-border-default active:scale-[0.98] transition-all" onClick={() => handleOpenBulkPayment(customer)}>
                      <div data-shimmer-no-children className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 min-w-0">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center text-text-muted bg-bg-main flex-shrink-0">
                            <User className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-black text-text-primary truncate">{customer.name}</p>
                            <div className="flex items-center space-x-2 mt-0.5">
                              <span className="text-[10px] font-bold text-brand-primary bg-brand-light px-2 py-0.5 rounded-lg">{customer.invoiceCount} Inv</span>
                              <span className="text-[10px] text-text-muted font-medium truncate">{customer.phone}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end shrink-0">
                          <p className="text-sm font-black text-status-danger">{formatCurrency(customer.totalAmount)}</p>
                          <p className="text-[9px] font-bold text-text-muted uppercase tracking-tighter">
                            {rekapTypeFilter === "AR" ? "Total Piutang" : "Total Hutang"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )
            ) : filteredDebts.length === 0 ? (
                <div className="py-4">
                  <EmptyState 
                    icon={Receipt}
                    title="Piutang Kosong"
                    description="Belum ada tagihan pelanggan yang tercatat."
                  />
                </div>
            ) : (
                filteredDebts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((debt) => {
                  const isPaid = debt.status === "PAID";
                    return (
                    <div key={debt.id} className={cn("bg-bg-card rounded-[32px] p-8 border transition-all", isPaid ? "border-border-default opacity-80" : "border-border-default cursor-pointer hover:border-brand-primary/50 active:scale-[0.98]")} onClick={() => !isPaid && setSelectedDebt(debt)}>
                      <div data-shimmer-no-children className="flex items-center justify-between gap-6">
                        <div className="flex items-center space-x-3 min-w-0">
                          <div className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                            isPaid ? "bg-bg-main text-text-muted/50" : "bg-bg-main text-brand-primary"
                          )}>
                            <User className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <p className={cn("text-sm font-black truncate", isPaid ? "text-text-muted" : "text-text-primary")}>
                              {debt.sale?.customer?.name || debt.customer?.name || "Pelanggan Umum"}
                            </p>
                            <div className="flex items-center space-x-2 mt-0.5">
                              <span className="font-mono text-[9px] font-bold text-text-muted">
                                {debt.sale?.invoiceNumber || debt.reference || "MANUAL"}
                              </span>
                              <span className="w-1 h-1 rounded-full bg-text-muted/30"></span>
                              <span className="text-[9px] text-text-secondary font-medium">
                                Tgl: {new Date(debt.sale?.createdAt || debt.createdAt).toLocaleDateString("id-ID")}
                              </span>
                              <span className="w-1 h-1 rounded-full bg-text-muted/30"></span>
                              <span className={cn(
                                "text-[9px] font-bold",
                                isPaid ? "text-text-muted/70" : 
                                new Date(debt.dueDate) < new Date(new Date().setHours(0,0,0,0)) ? "text-status-danger" : "text-status-warning"
                              )}>
                                JT: {new Date(debt.dueDate).toLocaleDateString("id-ID")}
                              </span>

                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end shrink-0">
                          <p className={cn(
                            "text-sm font-black",
                            isPaid ? "text-text-muted/50" : "text-status-danger"
                          )}>
                            {formatCurrency(Number(debt.remainingBalance))}
                          </p>
                          <span className={cn(
                            "px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider mt-1 border",
                            isPaid ? "bg-bg-main text-text-muted/40 border-border-subtle" : 
                            debt.status === "PARTIAL" ? "bg-brand-light text-brand-primary border-brand-primary/20" : 
                            "bg-status-danger/10 text-status-danger border-status-danger/20"
                          )}>
                            {debt.status === "PAID" ? "Lunas" : 
                             debt.status === "PARTIAL" ? "Cicilan" : "Belum Bayar"}
                          </span>
                        </div>
                      </div>
                      {/* Mobile Actions */}
                      {!isPaid && (
                        <div className="mt-4 pt-4 border-t border-border-subtle flex items-center justify-end gap-2">

                          <button 
                            onClick={(e) => handleDeleteDebtClick(e, debt)}
                            className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-bg-main border border-border-default text-status-danger flex items-center gap-1 hover:bg-status-danger/10"
                          >
                            <Trash2 className="w-3 h-3" /> Hapus
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
            )}
          </div>
        </div>

      {/* Pagination Controls */}
      {totalItems > 0 && (
        <div data-shimmer-ignore className="p-8 lg:p-8 border-t border-border-subtle bg-bg-card flex-shrink-0 rounded-b-2xl lg:rounded-b-3xl">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center space-x-4">
              <span className="text-[10px] lg:text-xs font-bold text-text-muted whitespace-nowrap uppercase tracking-wider">
                Hal {activeTab === "HISTORY" ? historyPage : currentPage} dari {totalPages} • {totalItems} Data
              </span>
              <select
                value={activeTab === "HISTORY" ? historyLimit : itemsPerPage}
                onChange={(e) => {
                  if (activeTab === "HISTORY") {
                    setHistoryLimit(Number(e.target.value));
                    setHistoryPage(1);
                  } else {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }
                }}
                className="px-4 py-2 border rounded-xl text-xs font-bold bg-bg-main border-border-default text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary transition-all cursor-pointer h-[40px] [&>option]:bg-bg-main [&>option]:text-text-primary"
              >
                <option value={15}>15 per hal</option>
                <option value={50}>50 per hal</option>
                <option value={100}>100 per hal</option>
              </select>
            </div>
            
            <div className="flex items-center space-x-1">
              <button 
                onClick={() => {
                  if (activeTab === "HISTORY") {
                    setHistoryPage(prev => Math.max(prev - 1, 1));
                  } else {
                    setCurrentPage(prev => Math.max(prev - 1, 1));
                  }
                }}
                disabled={(activeTab === "HISTORY" ? historyPage : currentPage) === 1}
                className="px-3 py-1.5 border rounded-xl text-[10px] font-bold transition-all bg-bg-card border-border-default text-text-primary disabled:opacity-30"
              >
                Sebelumnya
              </button>
              <div className="flex px-2 space-x-1">
                {Array.from({ length: Math.min(3, totalPages) }, (_, i) => {
                  const curr = activeTab === "HISTORY" ? historyPage : currentPage;
                  let pNum = i + 1;
                  if (totalPages > 3 && curr > 2) pNum = Math.min(curr - 1 + i, totalPages - 2 + i);
                  return (
                    <button
                      key={pNum}
                      onClick={() => {
                        if (activeTab === "HISTORY") setHistoryPage(pNum);
                        else setCurrentPage(pNum);
                      }}
                      className={cn(
                        "w-8 h-8 rounded-xl text-[10px] font-bold transition-all",
                        curr === pNum 
                          ? "bg-brand-primary text-text-inverse shadow-sm" 
                          : "bg-bg-card border border-border-default text-text-secondary hover:bg-bg-main"
                      )}
                    >
                      {pNum}
                    </button>
                  );
                })}
              </div>
              <button 
                onClick={() => {
                  if (activeTab === "HISTORY") setHistoryPage(prev => Math.min(prev + 1, totalPages));
                  else setCurrentPage(prev => Math.min(prev + 1, totalPages));
                }}
                disabled={(activeTab === "HISTORY" ? historyPage : currentPage) === totalPages}
                className="px-3 py-1.5 border rounded-xl text-[10px] font-bold transition-all bg-bg-card border-border-default text-text-primary disabled:opacity-30"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  </div>



      {/* Payment Modal */}
      {selectedDebt && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end lg:items-center justify-center lg:p-4">
          <div className="bg-bg-modal w-full rounded-t-3xl lg:rounded-[2.5rem] overflow-hidden animate-in slide-in-from-bottom-full lg:slide-in-from-bottom-0 lg:zoom-in lg:fade-in duration-300 ease-out flex flex-col max-h-[90vh] lg:max-w-2xl">
            {/* Drag Handle for Mobile */}
            <div className="lg:hidden w-full flex justify-center pt-3 pb-1 bg-brand-primary">
              <div className="w-12 h-1.5 bg-white/30 rounded-full"></div>
            </div>
            <div className="p-4 lg:p-6 border-b flex items-center justify-between bg-brand-primary text-text-inverse flex-shrink-0 border-border-subtle">
              <div>
                <h3 className="text-base lg:text-lg font-black">{selectedDebt.isAP ? "Detail & Pembayaran Hutang" : "Detail & Pembayaran Piutang"}</h3>
                <p className="text-[10px] lg:text-xs opacity-80 font-medium mt-0.5">
                  {selectedDebt.isAP ? (selectedDebt.purchase?.invoiceNumber || selectedDebt.reference || "MANUAL") : (selectedDebt.sale?.invoiceNumber || selectedDebt.reference || "MANUAL")} - 
                  {selectedDebt.isAP ? selectedDebt.supplier?.name : (selectedDebt.sale?.customer?.name || selectedDebt.customer?.name || "Pelanggan Umum")}
                </p>
              </div>
              <button onClick={handleCloseModal} className="text-text-inverse/60 hover:text-text-inverse min-w-[44px] min-h-[44px] flex items-center justify-center p-2 lg:p-0 -mr-2 lg:mr-0 rounded-full">
                <X className="w-5 h-5 lg:w-6 h-6" />
              </button>
            </div>
            <div className="p-4 lg:p-6 space-y-8 lg:space-y-8 overflow-y-auto custom-scrollbar flex-1">
              {selectedDebt.notes && (
                <div className="p-3.5 rounded-[32px] border bg-bg-main border-border-subtle text-xs space-y-8 text-left">
                  <div>
                    <p className="font-bold text-text-muted mb-1">Keterangan / Catatan:</p>
                    <p className="text-text-primary font-medium whitespace-pre-wrap">{selectedDebt.notes}</p>
                  </div>
                </div>
              )}
              {/* Debt Info Card */}
              <div className="grid grid-cols-2 gap-6 lg:gap-6 relative">
                <div className="p-3 lg:p-4 rounded-[32px] border transition-colors bg-bg-main border-border-subtle relative">
                  <div className="flex justify-between items-start mb-1">
                    <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">{selectedDebt.isAP ? "Total Hutang" : "Total Piutang"}</p>
                    <div className="flex gap-1">
                      {selectedDebt.isAP && (
                        <button onClick={() => { setIsEditingAmount(true); setEditAmountDue(Number(selectedDebt.amountDue)); }} className="p-1 hover:bg-brand-light text-brand-primary rounded" title="Ubah Nominal">
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button onClick={handleDeleteDebt} className="p-1 hover:bg-status-danger/10 text-status-danger rounded" title="Hapus Data">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  {isEditingAmount ? (
                    <div className="flex items-center gap-2 mt-1">
                      <input 
                        type="number"
                        className="w-full p-2 border text-sm font-bold bg-bg-card border-border-default rounded-lg"
                        value={editAmountDue || ""}
                        onChange={(e) => setEditAmountDue(Number(e.target.value))}
                      />
                      <button onClick={handleUpdateAmount} className="p-2 bg-brand-primary text-text-inverse rounded-lg">
                        <Save className="w-4 h-4" />
                      </button>
                      <button onClick={() => setIsEditingAmount(false)} className="p-2 bg-bg-card border border-border-default rounded-lg">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <p className="text-base lg:text-lg font-black text-text-primary">
                      {formatCurrency(Number(selectedDebt.amountDue) - (selectedDebt.payments?.reduce((sum: number, p: any) => sum + Number(p.discount || 0), 0) || 0))}
                    </p>
                  )}
                </div>
                <div className="p-3 lg:p-4 rounded-[32px] border transition-colors bg-status-danger/10 border-status-danger/20">
                  <p className="text-[10px] font-bold text-status-danger uppercase tracking-wider mb-1">Sisa Saldo</p>
                  <p className="text-base lg:text-lg font-black text-status-danger">{formatCurrency(Number(selectedDebt.remainingBalance))}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 lg:gap-6 text-xs font-medium text-text-secondary bg-bg-main border border-border-subtle p-3.5 rounded-[32px]">
                <div>
                  <span className="block text-[10px] text-text-muted font-bold uppercase tracking-wider mb-1">Tgl Transaksi</span>
                  <span className="text-text-primary font-bold">{new Date(selectedDebt.isAP ? (selectedDebt.purchase?.createdAt || selectedDebt.createdAt) : (selectedDebt.sale?.createdAt || selectedDebt.createdAt)).toLocaleDateString("id-ID")}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-text-muted font-bold uppercase tracking-wider mb-1">Tgl Jatuh Tempo</span>
                  <span className="text-text-primary font-bold">{new Date(selectedDebt.dueDate).toLocaleDateString("id-ID")}</span>
                </div>
              </div>

              {(() => {
                const items = selectedDebt.isAP ? selectedDebt.purchase?.items : selectedDebt.sale?.items;
                if (items && items.length > 0) {
                  return (
                    <div className="p-4 rounded-[32px] border bg-bg-main border-border-subtle text-left">
                      <h4 className="text-xs font-bold text-text-primary mb-3">Detail Barang</h4>
                      <div className="space-y-3 max-h-[160px] overflow-y-auto custom-scrollbar pr-2">
                        {items.map((item: any, idx: number) => (
                          <div key={idx} className="flex justify-between items-start pb-3 border-b border-border-subtle last:border-0 last:pb-0">
                            <div>
                              <p className="text-sm font-bold text-text-primary">{item.product?.name || "Barang tidak diketahui"}</p>
                              <div className="flex flex-col gap-0.5 mt-0.5">
                                <p className="text-xs text-text-muted">{item.quantity} {item.unit?.name || ""} x {formatCurrency(Number(item.priceAtSale || item.costPrice || 0))}</p>
                                {Number(item.discount || 0) > 0 && (
                                  <p className="text-[10px] text-status-success font-bold">- Diskon: {formatCurrency(Number(item.discount))}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col items-end">
                              <p className={cn("text-sm font-black mt-0.5", Number(item.discount || 0) > 0 ? "text-status-success" : "text-text-primary")}>
                                {formatCurrency((Number(item.quantity) * Number(item.priceAtSale || item.costPrice || 0)) - Number(item.discount || 0))}
                              </p>
                              {Number(item.discount || 0) > 0 && (
                                <p className="text-[9px] text-text-muted line-through">
                                  {formatCurrency(Number(item.quantity) * Number(item.priceAtSale || item.costPrice || 0))}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Summary Section */}
                      <div className="mt-3 pt-3 border-t border-border-default space-y-1.5">
                        <div className="flex justify-between items-center text-xs font-bold text-text-secondary">
                          <span>Subtotal Barang</span>
                          <span>
                            {formatCurrency(items.reduce((sum: number, item: any) => sum + (Number(item.quantity) * Number(item.priceAtSale || item.costPrice || 0) - Number(item.discount || 0)), 0))}
                          </span>
                        </div>
                        
                        {Number(selectedDebt.sale?.specialDiscount || selectedDebt.purchase?.discount || 0) > 0 && (
                          <div className="flex justify-between items-center text-xs font-bold text-status-success">
                            <span>Diskon Transaksi</span>
                            <span>-{formatCurrency(Number(selectedDebt.sale?.specialDiscount || selectedDebt.purchase?.discount || 0))}</span>
                          </div>
                        )}
                        
                        {(selectedDebt.payments?.reduce((sum: number, p: any) => sum + Number(p.discount || 0), 0) || 0) > 0 && (
                          <div className="flex justify-between items-center text-xs font-bold text-status-success">
                            <span>Diskon Tambahan</span>
                            <span>-{formatCurrency(selectedDebt.payments?.reduce((sum: number, p: any) => sum + Number(p.discount || 0), 0))}</span>
                          </div>
                        )}
                        
                        <div className="flex justify-between items-center text-sm font-black text-text-primary pt-1.5 border-t border-border-subtle mt-1.5">
                          <span>Total Akhir</span>
                          <span>
                            {formatCurrency(Number(selectedDebt.amountDue) - (selectedDebt.payments?.reduce((sum: number, p: any) => sum + Number(p.discount || 0), 0) || 0))}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              <div className="space-y-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider ml-1">Nominal Pembayaran (Rp)</label>
                  <input 
                    type="number" 
                    inputMode="numeric"
                    className="w-full p-3.5 lg:p-4 border text-lg lg:text-xl font-black focus:outline-none focus:ring-2 focus:ring-brand-primary transition-colors bg-bg-main border-border-default text-brand-primary rounded-lg h-[44px]"
                    placeholder="0"
                    value={paymentAmount || ""}
                    onChange={(e) => setPaymentAmount(Number(e.target.value))}
                  />
                  <div className="flex flex-wrap gap-2 mt-2">
                    <button onClick={() => setPaymentAmount(Number(selectedDebt.remainingBalance))} className="px-3 py-1.5 text-[10px] font-bold rounded-lg bg-status-success/10 text-status-success border border-status-success/20 hover:bg-status-success/20 transition-colors">Lunas</button>
                    <button onClick={() => setPaymentAmount(Math.min(100000, Number(selectedDebt.remainingBalance)))} className="px-3 py-1.5 text-[10px] font-bold rounded-lg bg-bg-main border border-border-default text-text-secondary hover:border-brand-primary transition-colors">100rb</button>
                    <button onClick={() => setPaymentAmount(Math.min(200000, Number(selectedDebt.remainingBalance)))} className="px-3 py-1.5 text-[10px] font-bold rounded-lg bg-bg-main border border-border-default text-text-secondary hover:border-brand-primary transition-colors">200rb</button>
                    <button onClick={() => setPaymentAmount(Math.min(500000, Number(selectedDebt.remainingBalance)))} className="px-3 py-1.5 text-[10px] font-bold rounded-lg bg-bg-main border border-border-default text-text-secondary hover:border-brand-primary transition-colors">500rb</button>
                    <button onClick={() => setPaymentAmount(Math.min(1000000, Number(selectedDebt.remainingBalance)))} className="px-3 py-1.5 text-[10px] font-bold rounded-lg bg-bg-main border border-border-default text-text-secondary hover:border-brand-primary transition-colors">1jt</button>
                    <button onClick={() => setPaymentAmount(Math.min(5000000, Number(selectedDebt.remainingBalance)))} className="px-3 py-1.5 text-[10px] font-bold rounded-lg bg-bg-main border border-border-default text-text-secondary hover:border-brand-primary transition-colors">5jt</button>
                    <button onClick={() => setPaymentAmount(Math.min(10000000, Number(selectedDebt.remainingBalance)))} className="px-3 py-1.5 text-[10px] font-bold rounded-lg bg-bg-main border border-border-default text-text-secondary hover:border-brand-primary transition-colors">10jt</button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider ml-1">Diskon / Potongan Harga (Opsional)</label>
                  <input 
                    type="number" 
                    inputMode="numeric"
                    className="w-full p-3.5 lg:p-4 border text-lg lg:text-xl font-black focus:outline-none focus:ring-2 focus:ring-status-success transition-colors bg-bg-main border-border-default text-status-success rounded-lg h-[44px]"
                    placeholder="0"
                    value={paymentDiscount || ""}
                    onChange={(e) => setPaymentDiscount(e.target.value === "" ? "" : Number(e.target.value))}
                  />
                  <p className="text-[9px] text-text-muted mt-1 ml-1 font-medium italic">
                    Diskon akan mengurangi sisa saldo tanpa dianggap sebagai uang yang dibayarkan.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider ml-1">Metode Pembayaran</label>
                  <div className="grid grid-cols-2 gap-6">
                    <button 
                      onClick={() => setPaymentMethod("CASH")}
                      className={cn(
                        "p-3.5 lg:p-3 rounded-2xl border-2 text-sm font-bold transition-all",
                        paymentMethod === "CASH" 
                          ? "bg-brand-light border-brand-primary text-brand-primary" 
                          : "bg-bg-card border-border-default text-text-muted"
                      )}
                    >
                      TUNAI
                    </button>
                    <button 
                      onClick={() => setPaymentMethod("TRANSFER")}
                      className={cn(
                        "p-3.5 lg:p-3 rounded-2xl border-2 text-sm font-bold transition-all",
                        paymentMethod === "TRANSFER" 
                          ? "bg-brand-light border-brand-primary text-brand-primary" 
                          : "bg-bg-card border-border-default text-text-muted"
                      )}
                    >
                      TRANSFER
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider ml-1">Bukti Pembayaran (Opsional)</label>
                  <div className="border-2 border-dashed border-border-default rounded-[32px] p-4 text-center hover:bg-bg-main transition-colors cursor-pointer">
                    <input 
                      type="file" 
                      className="hidden rounded-lg" 
                      id="payment-proof"
                      value={""}
                      onChange={(e) => setPaymentAttachment(e.target.files?.[0] || null)}
                    />
                    <label htmlFor="payment-proof" className="cursor-pointer flex flex-col items-center space-y-2">
                      <div className="w-8 h-8 bg-brand-light text-brand-primary rounded-full flex items-center justify-center">
                        <Plus className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold text-text-primary">
                        {paymentAttachment ? paymentAttachment.name : "Unggah Foto/Resi"}
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              {/* History */}
              <div className="space-y-8">
                <h4 className="text-xs font-bold text-text-primary flex items-center space-x-2">
                  <History className="w-4 h-4 text-text-muted" />
                  <span>Riwayat Cicilan</span>
                </h4>
                <div className="space-y-2">
                  {!selectedDebt.payments || selectedDebt.payments.length === 0 ? (
                    <p className="text-xs text-text-muted italic">Belum ada riwayat pembayaran</p>
                  ) : (
                    selectedDebt.payments.map((p: any) => (
                      <div key={p.id} className="flex items-center justify-between p-3 rounded-[24px] text-xs transition-colors bg-bg-main border border-border-subtle">
                        <div className="flex items-center space-x-3">
                          <span className="font-bold text-text-secondary">{new Date(p.paymentDate).toLocaleDateString("id-ID")}</span>
                          <span className="px-2 py-0.5 border rounded text-[10px] font-bold uppercase bg-bg-card border-border-default text-text-muted">{p.method}</span>
                          {p.attachment && (
                            <button 
                              onClick={() => setViewingAttachment(p.attachment)}
                              className="flex items-center gap-1 text-[10px] text-brand-primary font-bold hover:underline"
                            >
                              <img src={p.attachment} alt="Thumb" className="w-6 h-6 object-cover rounded border border-border-subtle" />
                              Lihat
                            </button>
                          )}
                        </div>
                        <span className="font-black text-status-success">+{formatCurrency(Number(p.amountPaid))}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
            <div className="p-4 lg:p-6 border-t border-border-subtle flex flex-col lg:flex-row-reverse gap-3 bg-bg-main/50 flex-shrink-0">
              <button 
                onClick={handlePayment}
                disabled={paymentAmount <= 0 || paymentAmount + (Number(paymentDiscount) || 0) > selectedDebt.remainingBalance || isPaying}
                className="w-full lg:w-auto lg:flex-1 min-h-[44px] py-3 bg-brand-primary text-text-inverse rounded-xl font-bold text-sm shadow-lg shadow-brand-primary/20 hover:bg-brand-hover disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                {isPaying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Memproses...</span>
                  </>
                ) : (
                  <span>Simpan Pembayaran</span>
                )}
              </button>
              <button 
                onClick={handleCloseModal}
                className="w-full lg:w-auto lg:flex-1 min-h-[44px] py-3 border rounded-xl font-bold text-sm transition-all bg-bg-card border-border-default text-text-secondary hover:bg-bg-main"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Bulk Payment Modal */}
      {isBulkPaymentOpen && selectedCustomerForBulk && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end lg:items-center justify-center lg:p-4">
          <div className="bg-bg-modal w-full rounded-t-3xl lg:rounded-[2.5rem] overflow-hidden animate-in slide-in-from-bottom-full lg:slide-in-from-bottom-0 lg:zoom-in lg:fade-in duration-300 ease-out flex flex-col max-h-[90vh] lg:max-w-xl">
            {/* Drag Handle for Mobile */}
            <div className="lg:hidden w-full flex justify-center pt-3 pb-1 bg-brand-primary">
              <div className="w-12 h-1.5 bg-white/30 rounded-full"></div>
            </div>
            <div className="p-4 lg:p-6 border-b flex items-center justify-between bg-brand-primary border-border-subtle flex-shrink-0">
              <h3 className="text-base lg:text-lg font-black text-text-inverse">Bayar Sekaligus</h3>
              <button onClick={handleCloseBulkPayment} className="text-text-inverse/60 hover:text-text-inverse min-w-[44px] min-h-[44px] flex items-center justify-center p-2 lg:p-0 -mr-2 lg:mr-0 rounded-full">
                <X className="w-5 h-5 lg:w-6 h-6" />
              </button>
            </div>
            <div className="p-4 lg:p-6 space-y-8 lg:space-y-8 overflow-y-auto custom-scrollbar flex-1">
              <div className="p-4 rounded-[32px] border space-y-2 bg-status-danger/5 border-status-danger/20">
                <div className="flex justify-between text-xs">
                  <span className="text-text-muted font-bold">{rekapTypeFilter === "AR" ? "Pelanggan" : "Pemasok"}</span>
                  <span className="font-black text-text-primary">{selectedCustomerForBulk.name}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-text-muted font-bold">Total Invoice</span>
                  <span className="font-black text-text-primary">{selectedCustomerForBulk.invoiceCount}</span>
                </div>
                <div className="flex justify-between text-sm pt-2 border-t border-status-danger/10">
                  <span className="text-text-muted font-bold">{rekapTypeFilter === "AR" ? "Total Piutang" : "Total Hutang"}</span>
                  <span className="font-black text-status-danger">{formatCurrency(selectedCustomerForBulk.totalAmount)}</span>
                </div>
              </div>

              <div className="space-y-8">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider ml-1">Nominal Pembayaran (Rp)</label>
                  <input 
                    type="number" 
                    inputMode="numeric"
                    className="w-full p-3.5 lg:p-3 border text-lg font-black focus:outline-none focus:ring-2 focus:ring-brand-primary transition-colors bg-bg-main border-border-default text-text-primary rounded-lg h-[44px]"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(Number(e.target.value))}
                    max={selectedCustomerForBulk.totalAmount}
                  />
                  <p className="text-[9px] text-text-muted ml-1">Sistem akan otomatis membagi pembayaran ke invoice paling lama (FIFO).</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider ml-1">Metode Pembayaran</label>
                  <div className="grid grid-cols-2 gap-6">
                    <button 
                      onClick={() => setPaymentMethod("CASH")}
                      className={cn(
                        "p-3.5 lg:p-3 rounded-2xl border-2 text-sm font-bold transition-all",
                        paymentMethod === "CASH" 
                          ? "bg-brand-light border-brand-primary text-brand-primary" 
                          : "bg-bg-card border-border-default text-text-muted"
                      )}
                    >
                      TUNAI
                    </button>
                    <button 
                      onClick={() => setPaymentMethod("TRANSFER")}
                      className={cn(
                        "p-3.5 lg:p-3 rounded-2xl border-2 text-sm font-bold transition-all",
                        paymentMethod === "TRANSFER" 
                          ? "bg-brand-light border-brand-primary text-brand-primary" 
                          : "bg-bg-card border-border-default text-text-muted"
                      )}
                    >
                      TRANSFER
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider ml-1">Bukti Pembayaran (Opsional)</label>
                  <div className="border-2 border-dashed border-border-default rounded-[32px] p-4 text-center hover:bg-bg-main transition-colors cursor-pointer">
                    <input 
                      type="file" 
                      className="hidden rounded-lg" 
                      id="bulk-payment-proof"
                      value={""}
                      onChange={(e) => setPaymentAttachment(e.target.files?.[0] || null)}
                    />
                    <label htmlFor="bulk-payment-proof" className="cursor-pointer flex flex-col items-center space-y-2">
                      <div className="w-8 h-8 bg-brand-light text-brand-primary rounded-full flex items-center justify-center">
                        <Plus className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold text-text-primary">
                        {paymentAttachment ? paymentAttachment.name : "Unggah Foto/Resi"}
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4 lg:p-6 border-t border-border-subtle flex flex-col lg:flex-row-reverse gap-3 bg-bg-main/50 flex-shrink-0">
              <button 
                onClick={handleBulkPaymentSubmit}
                disabled={paymentAmount <= 0 || paymentAmount > selectedCustomerForBulk.totalAmount || isPaying}
                className="w-full lg:w-auto lg:flex-1 min-h-[44px] py-3 bg-brand-primary text-text-inverse rounded-xl font-bold text-sm shadow-lg shadow-brand-primary/20 hover:bg-brand-hover disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                {isPaying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Memproses...</span>
                  </>
                ) : (
                  <span>Simpan Pembayaran</span>
                )}
              </button>
              <button 
                onClick={handleCloseBulkPayment}
                className="w-full lg:w-auto lg:flex-1 min-h-[44px] py-3 border rounded-xl font-bold text-sm transition-all bg-bg-card border-border-default text-text-secondary hover:bg-bg-main"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Attachment Viewer Modal */}
      {viewingAttachment && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="relative max-w-3xl w-full">
            <button 
              onClick={() => setViewingAttachment(null)}
              className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors"
            >
              <X className="w-8 h-8" />
            </button>
            <img src={viewingAttachment} alt="Bukti Pembayaran" className="w-full h-auto max-h-[80vh] object-contain rounded-lg shadow-2xl" />
          </div>
        </div>
      )}

      {/* Tambah Piutang Manual Modal */}
      {isAddDebtOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end lg:items-center justify-center lg:p-4 animate-in fade-in duration-200">
          <div className="bg-bg-modal w-full rounded-t-3xl lg:rounded-[2.5rem] overflow-hidden animate-in slide-in-from-bottom-full lg:slide-in-from-bottom-0 lg:zoom-in lg:fade-in duration-300 ease-out flex flex-col max-h-[90vh] lg:max-w-2xl">
            <div className="lg:hidden w-full flex justify-center pt-3 pb-1 bg-brand-primary">
              <div className="w-12 h-1.5 bg-white/30 rounded-full"></div>
            </div>
            <div className="p-4 lg:p-6 border-b flex items-center justify-between bg-brand-primary text-text-inverse flex-shrink-0 border-border-subtle">
              <h3 className="text-base lg:text-lg font-black">Tambah Piutang Manual</h3>
              <button onClick={() => { setIsAddDebtOpen(false); resetManualForm(); }} className="text-text-inverse/60 hover:text-text-inverse min-w-[44px] min-h-[44px] flex items-center justify-center p-2">
                <X className="w-5 h-5 lg:w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleAddManualDebt} className="flex flex-col flex-1 overflow-hidden">
              <div className="overflow-y-auto custom-scrollbar flex-1 p-4 lg:p-6 space-y-8">
                <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider ml-1">Pelanggan <span className="text-status-danger">*</span></label>
                <select
                  required
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full p-3 border rounded-2xl text-sm bg-bg-main border-border-default text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary [&>option]:bg-bg-main [&>option]:text-text-primary"
                >
                  <option value="">-- Pilih Pelanggan --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.phone ? `(${c.phone})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider ml-1">Jumlah Piutang (Rp) <span className="text-status-danger">*</span></label>
                <input
                  type="number"
                  required
                  min={1}
                  placeholder="Masukkan nominal piutang"
                  value={manualAmount}
                  onChange={(e) => setManualAmount(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-full p-3 border rounded-2xl text-sm bg-bg-main border-border-default text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider ml-1">Tanggal Transaksi <span className="text-status-danger">*</span></label>
                <input
                  type="date"
                  required
                  value={manualTransactionDate}
                  onChange={(e) => setManualTransactionDate(e.target.value)}
                  className="w-full p-3 border rounded-2xl text-sm bg-bg-main border-border-default text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary relative"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider ml-1">Tanggal Jatuh Tempo <span className="text-status-danger">*</span></label>
                <input
                  type="date"
                  required
                  value={manualDueDate}
                  onChange={(e) => setManualDueDate(e.target.value)}
                  className="w-full p-3 border rounded-2xl text-sm bg-bg-main border-border-default text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary relative"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider ml-1">Referensi / No. Invoice Lama</label>
                <input
                  type="text"
                  placeholder="Contoh: INV-2025-MANUAL"
                  value={manualReference}
                  onChange={(e) => setManualReference(e.target.value)}
                  className="w-full p-3 border rounded-2xl text-sm bg-bg-main border-border-default text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary relative"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider ml-1">Catatan Keterangan</label>
                <textarea
                  placeholder="Contoh: Sisa bon pembangunan toko / Keterangan tambahan..."
                  rows={3}
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                  className="w-full p-3 border rounded-2xl text-sm bg-bg-main border-border-default text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary resize-none"
                />
              </div>

              </div>
              <div className="p-4 lg:p-6 border-t border-border-subtle flex flex-col lg:flex-row-reverse gap-3 bg-bg-main/50 flex-shrink-0">
                <button
                  type="submit"
                  disabled={isSavingManual}
                  className="w-full lg:w-auto lg:flex-1 min-h-[44px] py-3 bg-brand-primary text-text-inverse rounded-xl font-bold text-sm shadow-lg shadow-brand-primary/20 hover:bg-brand-hover disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  {isSavingManual ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Memproses...</span>
                    </>
                  ) : (
                    <span>Simpan</span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => { setIsAddDebtOpen(false); resetManualForm(); }}
                  className="w-full lg:w-auto lg:flex-1 min-h-[44px] py-3 border rounded-xl font-bold text-sm transition-all bg-bg-card border-border-default text-text-secondary hover:bg-bg-main"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tambah Hutang Manual Modal */}
      {isAddPayableOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end lg:items-center justify-center lg:p-4 animate-in fade-in duration-200">
          <div className="bg-bg-modal w-full rounded-t-3xl lg:rounded-[2.5rem] overflow-hidden animate-in slide-in-from-bottom-full lg:slide-in-from-bottom-0 lg:zoom-in lg:fade-in duration-300 ease-out flex flex-col max-h-[90vh] lg:max-w-2xl">
            <div className="lg:hidden w-full flex justify-center pt-3 pb-1 bg-brand-primary">
              <div className="w-12 h-1.5 bg-white/30 rounded-full"></div>
            </div>
            <div className="p-4 lg:p-6 border-b flex items-center justify-between bg-brand-primary text-text-inverse flex-shrink-0 border-border-subtle">
              <h3 className="text-base lg:text-lg font-black">Tambah Hutang Manual</h3>
              <button onClick={() => { setIsAddPayableOpen(false); resetManualForm(); }} className="text-text-inverse/60 hover:text-text-inverse min-w-[44px] min-h-[44px] flex items-center justify-center p-2">
                <X className="w-5 h-5 lg:w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleAddManualPayable} className="flex flex-col flex-1 overflow-hidden">
              <div className="overflow-y-auto custom-scrollbar flex-1 p-4 lg:p-6 space-y-8">
                <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider ml-1">Supplier <span className="text-status-danger">*</span></label>
                <select
                  required
                  value={selectedSupplierId}
                  onChange={(e) => setSelectedSupplierId(e.target.value)}
                  className="w-full p-3 border rounded-2xl text-sm bg-bg-main border-border-default text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary [&>option]:bg-bg-main [&>option]:text-text-primary"
                >
                  <option value="">-- Pilih Supplier --</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.phone ? `(${s.phone})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider ml-1">Jumlah Hutang (Rp) <span className="text-status-danger">*</span></label>
                <input
                  type="number"
                  required
                  min={1}
                  placeholder="Masukkan nominal hutang"
                  value={manualAmount}
                  onChange={(e) => setManualAmount(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-full p-3 border rounded-2xl text-sm bg-bg-main border-border-default text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider ml-1">Tanggal Transaksi <span className="text-status-danger">*</span></label>
                <input
                  type="date"
                  required
                  value={manualTransactionDate}
                  onChange={(e) => setManualTransactionDate(e.target.value)}
                  className="w-full p-3 border rounded-2xl text-sm bg-bg-main border-border-default text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary relative"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider ml-1">Tanggal Jatuh Tempo <span className="text-status-danger">*</span></label>
                <input
                  type="date"
                  required
                  value={manualDueDate}
                  onChange={(e) => setManualDueDate(e.target.value)}
                  className="w-full p-3 border rounded-2xl text-sm bg-bg-main border-border-default text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary relative"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider ml-1">Referensi / No. Pengiriman / Invoice Pemasok</label>
                <input
                  type="text"
                  placeholder="Contoh: SJ-2025-MANUAL"
                  value={manualReference}
                  onChange={(e) => setManualReference(e.target.value)}
                  className="w-full p-3 border rounded-2xl text-sm bg-bg-main border-border-default text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary relative"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider ml-1">Catatan Keterangan</label>
                <textarea
                  placeholder="Contoh: Sisa pembayaran semen / Keterangan tambahan..."
                  rows={3}
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                  className="w-full p-3 border rounded-2xl text-sm bg-bg-main border-border-default text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary resize-none"
                />
              </div>

              </div>
              <div className="p-4 lg:p-6 border-t border-border-subtle flex flex-col lg:flex-row-reverse gap-3 bg-bg-main/50 flex-shrink-0">
                <button
                  type="submit"
                  disabled={isSavingManual}
                  className="w-full lg:w-auto lg:flex-1 min-h-[44px] py-3 bg-brand-primary text-text-inverse rounded-xl font-bold text-sm shadow-lg shadow-brand-primary/20 hover:bg-brand-hover disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  {isSavingManual ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Memproses...</span>
                    </>
                  ) : (
                    <span>Simpan</span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => { setIsAddPayableOpen(false); resetManualForm(); }}
                  className="w-full lg:w-auto lg:flex-1 min-h-[44px] py-3 border rounded-xl font-bold text-sm transition-all bg-bg-card border-border-default text-text-secondary hover:bg-bg-main"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmDebt && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[110] flex items-end lg:items-center justify-center lg:p-4">
          <div className="bg-bg-modal w-full max-w-sm rounded-t-3xl lg:rounded-[2.5rem] overflow-hidden animate-in slide-in-from-bottom-full lg:slide-in-from-bottom-0 lg:fade-in lg:zoom-in duration-300 ease-out flex flex-col">
            <div className="lg:hidden w-full flex justify-center pt-3 pb-1 bg-status-danger">
              <div className="w-12 h-1.5 bg-white/30 rounded-full"></div>
            </div>
            <div className="p-4 lg:p-6 bg-status-danger flex items-center justify-between flex-shrink-0">
              <h2 className="text-base lg:text-lg font-black text-text-inverse">Hapus Data?</h2>
              <button onClick={() => setDeleteConfirmDebt(null)} className="text-text-inverse/60 hover:text-text-inverse transition-colors p-2 lg:p-0 min-w-[44px] min-h-[44px] flex items-center justify-center">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-8 text-center bg-bg-card">
              <div className="w-20 h-20 bg-status-danger/10 text-status-danger rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-inner">
                <Trash2 className="w-10 h-10" />
              </div>
              <p className="text-sm font-black text-text-primary mb-2">Apakah Anda yakin?</p>
              <p className="text-xs font-bold text-text-muted leading-relaxed">
                Apakah Anda yakin ingin menghapus transaksi {deleteConfirmDebt.isAP ? "hutang" : "piutang"} ini? 
                Data yang sudah dihapus tidak dapat dikembalikan.
              </p>
            </div>
            <div className="p-4 lg:p-6 border-t border-border-subtle flex flex-col lg:flex-row-reverse gap-3 bg-bg-main/50 flex-shrink-0">
              <button 
                onClick={confirmDeleteDebt}
                disabled={isDeletingDebt}
                className="w-full lg:w-auto lg:flex-1 min-h-[44px] py-3 bg-status-danger text-text-inverse rounded-xl font-bold text-sm shadow-lg shadow-status-danger/20 hover:bg-status-danger/80 disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                {isDeletingDebt ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Menghapus...</span>
                  </>
                ) : (
                  <span>Ya, Hapus</span>
                )}
              </button>
              <button 
                onClick={() => setDeleteConfirmDebt(null)}
                disabled={isDeletingDebt}
                className="w-full lg:w-auto lg:flex-1 min-h-[44px] py-3 border rounded-xl font-bold text-sm transition-all bg-bg-card border-border-default text-text-secondary hover:bg-bg-main disabled:opacity-50"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
    </phantom-ui>
  );
}
