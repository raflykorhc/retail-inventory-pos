import React, { useState, useRef, useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { SummaryCard } from '@/components/SummaryCard';
import { toast } from "sonner";
import {
  Truck,
  Search,
  Filter,
  Package,
  Calendar,
  User,
  MapPin,
  CheckCircle2,
  Clock,
  MoreVertical,
  ChevronRight,
  X,
  Plus,
  Minus,
  ClipboardCheck,
  PenTool,
  Save,
  RotateCcw,
  ChevronDown,
  Maximize2,
  Minimize2
} from "lucide-react";

import { cn } from "../../lib/utils";
import { useTheme } from "../../context/ThemeContext";
import { EmptyState } from "../../components/ui/EmptyState";
import { useAuthStore } from "../../store/useAuthStore";

const STATUS_CONFIG = {
  PENDING: { label: "Menunggu", color: "bg-bg-main text-text-muted", icon: Clock },
  ON_DELIVERY: { label: "Dalam Perjalanan", color: "bg-brand-light text-brand-primary", icon: Truck },
  DELIVERED: { label: "Selesai", color: "bg-status-success/10 text-status-success", icon: CheckCircle2 },
  CANCELLED: { label: "Batal (Ambil di Toko)", color: "bg-status-danger/10 text-status-danger", icon: X },
};

const parseVehiclePlate = (plate: string) => {
  if (!plate) return { cleanPlate: "-", tripId: null, sequence: null };
  const parts = plate.split(" | ");
  const cleanPlate = parts[0];
  if (parts.length > 1) {
    const tripParts = parts[1].split("-");
    if (tripParts.length >= 3) {
      return {
        cleanPlate,
        tripId: `${tripParts[0]}-${tripParts[1]}`,
        sequence: parseInt(tripParts[2], 10)
      };
    }
  }
  return { cleanPlate, tripId: null, sequence: null };
};

const parseAddressAndCoordinates = (fullAddress: string) => {
  if (!fullAddress) return { address: "", coordinates: "" };
  const parts = fullAddress.split(" || ");
  if (parts.length > 1) return { address: parts[0], coordinates: parts[1] };
  return { address: fullAddress, coordinates: "" };
};

export default function DeliveryPage() {
  const location = useLocation();
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<"deliveries" | "trips">("deliveries");
  const [isLoading, setIsLoading] = useState(true);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const placeholderDeliveries = useMemo(() => [
    { id: "1", doNumber: "DO-20260601-001", customer: { name: "Pelanggan A" }, recipientName: "Budi", status: "DELIVERED", address: "Alamat Pelanggan A", createdAt: "2026-06-01", sale: { invoiceNumber: "INV-001" }, driverName: "Driver 1", vehiclePlate: "B 1234 CD" },
    { id: "2", doNumber: "DO-20260602-002", customer: { name: "Pelanggan B" }, recipientName: "Beni", status: "ON_DELIVERY", address: "Alamat Pelanggan B", createdAt: "2026-06-02", sale: { invoiceNumber: "INV-002" }, driverName: "Driver 2", vehiclePlate: "B 5678 EF" },
    { id: "3", doNumber: "DO-20260603-003", customer: { name: "Pelanggan C" }, recipientName: "Candra", status: "PENDING", address: "Alamat Pelanggan C", createdAt: "2026-06-03", sale: { invoiceNumber: "INV-003" }, driverName: "-", vehiclePlate: "-" }
  ], []);
  const activeDeliveries = isLoading ? placeholderDeliveries : deliveries;
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [dateFilter, setDateFilter] = useState("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [tripSearchQuery, setTripSearchQuery] = useState("");
  const [isPendingModalOpen, setIsPendingModalOpen] = useState(false);
  const [pendingModalMode, setPendingModalMode] = useState<"view" | "create">("view");
  const [pendingSales, setPendingSales] = useState<any[]>([]);
  const [isLoadingPending, setIsLoadingPending] = useState(false);
  const [pendingSearchQuery, setPendingSearchQuery] = useState("");
  const [pendingCurrentPage, setPendingCurrentPage] = useState(1);
  const pendingItemsPerPage = 10;

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  // Partial DO State (Same as POS)
  const [isCreateDOModalOpen, setIsCreateDOModalOpen] = useState(false);
  const [selectedSaleForDO, setSelectedSaleForDO] = useState<any>(null);
  const [doItems, setDoItems] = useState<any[]>([]);
  const [isCreatingDO, setIsCreatingDO] = useState(false);
  const [driverName, setDriverName] = useState("");
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [doAddress, setDoAddress] = useState("");

  // GPS Confirmation Dialog State
  const [isGPSModalOpen, setIsGPSModalOpen] = useState(false);
  const [gpsTargetDO, setGpsTargetDO] = useState<any>(null);
  const [gpsAddress, setGpsAddress] = useState("");
  const [isSavingGPSAddress, setIsSavingGPSAddress] = useState(false);
  const [gpsCoordinates, setGpsCoordinates] = useState("");
  const [mapSearchQuery, setMapSearchQuery] = useState("");
  const [isSearchingMap, setIsSearchingMap] = useState(false);
  const [mapSearchResults, setMapSearchResults] = useState<any[]>([]);

  // Detail Modal State
  const [selectedDeliveryDetail, setSelectedDeliveryDetail] = useState<any | null>(null);
  const [isDeliveryDetailModalOpen, setIsDeliveryDetailModalOpen] = useState(false);
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const mapRef = useRef<any>(null);

  // Shop Settings & User Auth State
  const { user } = useAuthStore();
  const [shopSettings, setShopSettings] = useState({
    shopName: "PD SUKSES BANGUNAN",
    shopAddress: "Jl. Citalang, Kec. Purwakarta, depan Perumahan Grha Citalang",
    shopEmail: "pdsuksesbngunan@gmail.com",
    shopPhone: "081234567890",
    shopLogo: "/logo.png",
    defaultSignee: "Umar Sajjaad"
  });

  // Multi-Trip / Consolidation State
  const [selectedDOIds, setSelectedDOIds] = useState<string[]>([]);
  const [isTripModalOpen, setIsTripModalOpen] = useState(false);
  const [tripDOs, setTripDOs] = useState<any[]>([]);
  const [tripDriverName, setTripDriverName] = useState("");
  const [tripVehiclePlate, setTripVehiclePlate] = useState("");

  // Suggestion states
  const [showDriverSuggestions, setShowDriverSuggestions] = useState(false);
  const [showPlateSuggestions, setShowPlateSuggestions] = useState(false);
  const [showTripDriverSuggestions, setShowTripDriverSuggestions] = useState(false);
  const [showTripPlateSuggestions, setShowTripPlateSuggestions] = useState(false);

  const [hiddenHistory, setHiddenHistory] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      return JSON.parse(localStorage.getItem('deliveryHiddenHistory') || '[]');
    }
    return [];
  });

  const hideHistoryItem = (item: string) => {
    const newHidden = [...hiddenHistory, item];
    setHiddenHistory(newHidden);
    if (typeof window !== 'undefined') {
      localStorage.setItem('deliveryHiddenHistory', JSON.stringify(newHidden));
    }
  };

  // Extract unique history from deliveries
  const uniqueDrivers = useMemo(() => {
    const sorted = [...deliveries].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const drivers = sorted
      .map(d => d.driverName?.trim())
      .filter((name): name is string => typeof name === "string" && name !== "" && name !== "-" && !hiddenHistory.includes(name));
    return Array.from(new Set(drivers));
  }, [deliveries, hiddenHistory]);

  const uniquePlates = useMemo(() => {
    const sorted = [...deliveries].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const plates = sorted
      .map(d => parseVehiclePlate(d.vehiclePlate).cleanPlate.trim())
      .filter((plate): plate is string => typeof plate === "string" && plate !== "" && plate !== "-" && !hiddenHistory.includes(plate));
    return Array.from(new Set(plates));
  }, [deliveries, hiddenHistory]);

  // Filter suggestions based on input
  const filteredDriverSuggestions = useMemo(() => {
    const query = driverName.toLowerCase().trim();
    if (!query) return uniqueDrivers.slice(0, 3);
    return uniqueDrivers.filter(d => d.toLowerCase().includes(query)).slice(0, 3);
  }, [uniqueDrivers, driverName]);

  const filteredPlateSuggestions = useMemo(() => {
    const query = vehiclePlate.toLowerCase().trim();
    if (!query) return uniquePlates.slice(0, 3);
    return uniquePlates.filter(p => p.toLowerCase().includes(query)).slice(0, 3);
  }, [uniquePlates, vehiclePlate]);

  const filteredTripDriverSuggestions = useMemo(() => {
    const query = tripDriverName.toLowerCase().trim();
    if (!query) return uniqueDrivers.slice(0, 3);
    return uniqueDrivers.filter(d => d.toLowerCase().includes(query)).slice(0, 3);
  }, [uniqueDrivers, tripDriverName]);

  const filteredTripPlateSuggestions = useMemo(() => {
    const query = tripVehiclePlate.toLowerCase().trim();
    if (!query) return uniquePlates.slice(0, 3);
    return uniquePlates.filter(p => p.toLowerCase().includes(query)).slice(0, 3);
  }, [uniquePlates, tripVehiclePlate]);

  const activeTrips = useMemo(() => {
    const tripsMap: {
      [tripId: string]: {
        id: string;
        driverName: string;
        vehiclePlate: string;
        cleanPlate: string;
        deliveries: any[];
        createdAt: Date;
      }
    } = {};

    deliveries.forEach(d => {
      const { cleanPlate, tripId, sequence } = parseVehiclePlate(d.vehiclePlate);
      if (tripId && (d.status === "ON_DELIVERY" || d.status === "PENDING" || d.status === "DELIVERED" || d.status === "CANCELLED")) {
        if (!tripsMap[tripId]) {
          tripsMap[tripId] = {
            id: tripId,
            driverName: d.driverName || "Sopir",
            vehiclePlate: d.vehiclePlate,
            cleanPlate: cleanPlate || "Kendaraan",
            deliveries: [],
            createdAt: new Date(d.createdAt)
          };
        }
        tripsMap[tripId].deliveries.push({ ...d, tripSequence: sequence || 99 });
      }
    });

    const activeTripsList = Object.values(tripsMap).filter(trip => {
      const hasActiveDeliveries = trip.deliveries.some(d => d.status === "ON_DELIVERY" || d.status === "PENDING");
      return hasActiveDeliveries;
    });

    activeTripsList.forEach(trip => {
      trip.deliveries.sort((a, b) => a.tripSequence - b.tripSequence);
    });

    return activeTripsList.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }, [deliveries]);

  const filteredActiveTrips = useMemo(() => {
    return activeTrips.filter(t =>
      t.id.toLowerCase().includes(tripSearchQuery.toLowerCase()) ||
      t.driverName.toLowerCase().includes(tripSearchQuery.toLowerCase()) ||
      t.cleanPlate.toLowerCase().includes(tripSearchQuery.toLowerCase()) ||
      t.deliveries.some((d: any) => d.customer?.name?.toLowerCase().includes(tripSearchQuery.toLowerCase()))
    );
  }, [activeTrips, tripSearchQuery]);



  const openTripMaps = (trip: any) => {
    const link = generateGoogleMapsLink(trip.deliveries);
    window.open(link, "_blank", "noopener,noreferrer");
  };

  const handleCompleteAllInTrip = async (trip: any) => {
    const pendingDOs = trip.deliveries.filter((d: any) => d.status === "ON_DELIVERY" || d.status === "PENDING");
    if (pendingDOs.length === 0) return;

    const promises = pendingDOs.map((d: any) =>
      fetch(`/api/deliveries/${d.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "DELIVERED" })
      })
    );

    toast.promise(Promise.all(promises), {
      loading: "Menyelesaikan semua pengiriman dalam trip...",
      success: () => {
        fetchDeliveries();
        return "Semua pengiriman dalam trip berhasil diselesaikan!";
      },
      error: "Gagal menyelesaikan beberapa pengiriman."
    });
  };

  const manifestPrintRef = useRef<HTMLDivElement>(null);
  const canvasParentRef = useRef<HTMLDivElement>(null);

  const fetchSettings = async () => {
    try {
      const response = await fetch("/api/settings");
      if (response.ok) {
        const data = await response.json();
        setShopSettings({
          shopName: data.shopName || "PD SUKSES BANGUNAN",
          shopAddress: data.shopAddress || "Jl. Citalang, Kec. Purwakarta, depan Perumahan Grha Citalang",
          shopEmail: data.shopEmail || "pdsuksesbngunan@gmail.com",
          shopPhone: data.shopPhone || "081234567890",
          shopLogo: data.shopLogo || "/logo.png",
          defaultSignee: data.defaultSignee || "Umar Sajjaad"
        });
      }
    } catch (error) {
      console.error("Failed to fetch shop settings:", error);
    }
  };

  const generateGoogleMapsLink = (dos: any[]) => {
    if (dos.length === 0) return "";
    const origin = encodeURIComponent(shopSettings.shopAddress);
    if (dos.length === 1) {
      const parsed = parseAddressAndCoordinates(dos[0].address);
      const destination = parsed.coordinates ? encodeURIComponent(parsed.coordinates) : encodeURIComponent(parsed.address);
      return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}`;
    }
    const waypoints = dos.slice(0, -1).map(d => {
      const parsed = parseAddressAndCoordinates(d.address);
      return parsed.coordinates ? encodeURIComponent(parsed.coordinates) : encodeURIComponent(parsed.address);
    }).join("|");
    const parsedDest = parseAddressAndCoordinates(dos[dos.length - 1].address);
    const destination = parsedDest.coordinates ? encodeURIComponent(parsedDest.coordinates) : encodeURIComponent(parsedDest.address);
    return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${waypoints}`;
  };

  const moveDO = (index: number, direction: "up" | "down") => {
    const newDOs = [...tripDOs];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex >= 0 && targetIndex < newDOs.length) {
      const temp = newDOs[index];
      newDOs[index] = newDOs[targetIndex];
      newDOs[targetIndex] = temp;
      setTripDOs(newDOs);
    }
  };

  const combinedItems = useMemo(() => {
    const itemsMap: { [key: string]: { name: string, quantity: number, unitName: string } } = {};
    tripDOs.forEach(doItem => {
      doItem.items?.forEach((item: any) => {
        const prodId = item.productId || item.product?.id;
        if (prodId) {
          if (itemsMap[prodId]) {
            itemsMap[prodId].quantity += item.quantity;
          } else {
            itemsMap[prodId] = {
              name: item.product?.name || "Produk",
              quantity: item.quantity,
              unitName: item.unitName
            };
          }
        }
      });
    });
    return Object.values(itemsMap);
  }, [tripDOs]);

  const mapsLink = useMemo(() => {
    return generateGoogleMapsLink(tripDOs);
  }, [tripDOs, shopSettings]);



  const handleDispatchTrip = async () => {
    if (!tripDriverName.trim() || tripDriverName.trim() === "-") {
      toast.warning("Nama sopir wajib diisi untuk trip");
      return;
    }
    if (!tripVehiclePlate.trim() || tripVehiclePlate.trim() === "-") {
      toast.warning("Pelat nomor kendaraan wajib diisi untuk trip");
      return;
    }

    const promise = fetch("/api/deliveries/bulk-trip", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deliveryIds: tripDOs.map(d => d.id),
        driverName: tripDriverName.trim(),
        vehiclePlate: tripVehiclePlate.trim()
      })
    });

    toast.promise(promise, {
      loading: "Mengirim Trip Pengiriman...",
      success: () => {
        setIsTripModalOpen(false);
        setSelectedDOIds([]);
        fetchDeliveries();
        return "Trip pengiriman berhasil diberangkatkan!";
      },
      error: "Gagal memproses trip pengiriman."
    });
  };

  useEffect(() => {
    if (isTripModalOpen) {
      const selected = deliveries.filter(d => selectedDOIds.includes(d.id) && d.status === "PENDING");
      setTripDOs(selected);
      setTripDriverName("");
      setTripVehiclePlate("");
    }
  }, [isTripModalOpen, selectedDOIds, deliveries]);

  const fetchPendingSales = async () => {
    setIsLoadingPending(true);
    try {
      const response = await fetch("/api/reports/sales?hasPending=true&isDeliveryRequired=true");
      const data = await response.json();
      const items = Array.isArray(data) ? data : (data.items || []);
      // Filter only those not fully delivered
      setPendingSales(items.filter((s: any) => s.deliveryStatus !== "FULL"));
    } catch (error) {
      console.error("Failed to fetch pending sales:", error);
      toast.error("Gagal Memuat Antrean");
    } finally {
      setIsLoadingPending(false);
    }
  };

  const filteredPendingSales = useMemo(() => {
    return pendingSales.filter(s =>
      s.invoiceNumber.toLowerCase().includes(pendingSearchQuery.toLowerCase()) ||
      (s.customer?.name || "Umum").toLowerCase().includes(pendingSearchQuery.toLowerCase())
    );
  }, [pendingSales, pendingSearchQuery]);

  const paginatedPendingSales = useMemo(() => {
    return filteredPendingSales.slice(
      (pendingCurrentPage - 1) * pendingItemsPerPage,
      pendingCurrentPage * pendingItemsPerPage
    );
  }, [filteredPendingSales, pendingCurrentPage]);

  const totalPendingPages = Math.ceil(filteredPendingSales.length / pendingItemsPerPage);

  useEffect(() => {
    setPendingCurrentPage(1);
  }, [pendingSearchQuery]);

  const initiateCreateDO = (sale: any) => {
    setSelectedSaleForDO(sale);
    const initialItems = sale.items.map((item: any) => ({
      productId: item.productId,
      name: item.product?.name || "Produk",
      totalQty: item.quantity,
      deliveredQty: item.deliveredQuantity || 0,
      pickedUpQty: item.pickedUpQuantity || 0,
      inDeliveryQty: item.inDeliveryQuantity || 0,
      remainingQty: item.remainingQuantity !== undefined ? item.remainingQuantity : item.quantity,
      deliveryQty: item.remainingQuantity !== undefined ? item.remainingQuantity : item.quantity,
      unitName: item.unit?.name || "Unit"
    }));
    setDoItems(initialItems);
    setDriverName("");
    setVehiclePlate("");
    setDoAddress(sale.customer?.address || "");
    setIsCreateDOModalOpen(true);
  };

  const handleUpdateDOQty = (productId: string, qty: number) => {
    setDoItems(prev => prev.map(item => {
      if (item.productId === productId) {
        const newQty = Math.max(0, Math.min(item.remainingQty, qty));
        return { ...item, deliveryQty: newQty };
      }
      return item;
    }));
  };

  const submitCreateDO = async () => {
    const itemsToDeliver = doItems.filter(item => item.deliveryQty > 0).map(item => ({
      productId: item.productId,
      quantity: item.deliveryQty,
      unitName: item.unitName
    }));

    if (itemsToDeliver.length === 0) {
      toast.warning("Pilih minimal satu barang untuk dikirim");
      return;
    }

    if (!driverName || driverName.trim() === "" || driverName.trim() === "-") {
      toast.warning("Nama sopir wajib diisi");
      return;
    }

    if (!vehiclePlate || vehiclePlate.trim() === "" || vehiclePlate.trim() === "-") {
      toast.warning("Pelat nomor kendaraan wajib diisi");
      return;
    }

    const promise = fetch("/api/deliveries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        saleId: selectedSaleForDO.id,
        driverName: driverName.trim(),
        vehiclePlate: vehiclePlate.trim(),
        address: doAddress.trim(),
        items: itemsToDeliver
      })
    });

    toast.promise(promise, {
      loading: 'Membuat Pengiriman...',
      success: () => {
        setIsCreateDOModalOpen(false);
        setIsPendingModalOpen(false);
        fetchDeliveries();
        return 'Pengiriman berhasil dibuat!';
      },
      error: 'Gagal membuat Pengiriman.',
    });
  };

  useEffect(() => {
    fetchDeliveries();
    fetchSettings();
    
    if (location.state?.openAntrean) {
      setIsPendingModalOpen(true);
      fetchPendingSales();
      
      // Clean up the state so it doesn't reopen on refresh
      window.history.replaceState({}, document.title);
    }
  }, []);

  const fetchDeliveries = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/deliveries");
      const data = await response.json();
      if (Array.isArray(data)) {
        setDeliveries(data);
      } else {
        setDeliveries([]);
      }
    } catch (error) {
      console.error("Failed to fetch deliveries:", error);
      toast.error("Gagal Memuat Data Pengiriman");
      setDeliveries([]);
    } finally {
      setIsLoading(false);
    }
  };

  const updateDelivery = async (id: string, updates: any) => {
    const promise = fetch(`/api/deliveries/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates)
    });

    toast.promise(promise, {
      loading: 'Memperbarui status...',
      success: async (response) => {
        fetchDeliveries();
        return 'Status berhasil diperbarui!';
      },
      error: 'Gagal memperbarui status.',
    });
  };



  const openGPSModal = (delivery: any) => {
    setGpsTargetDO(delivery);
    const parsed = parseAddressAndCoordinates(delivery.address || "");
    setGpsAddress(parsed.address);
    setGpsCoordinates(parsed.coordinates);
    setMapSearchQuery("");
    setMapSearchResults([]);
    setIsMapExpanded(false);
    setIsGPSModalOpen(true);
  };

  // Inisialisasi Map Picker saat Modal GPS dibuka
  useEffect(() => {
    let mapInstance: any = null;
    let timer: NodeJS.Timeout;

    if (isGPSModalOpen && gpsTargetDO) {
      timer = setTimeout(() => {
        const mapContainer = document.getElementById("map-picker");
        if (!mapContainer) return;

        const L = (window as any).L;
        if (!L) {
          toast.error("Library Leaflet gagal dimuat. Coba muat ulang halaman.");
          return;
        }

        const parsed = parseAddressAndCoordinates(gpsTargetDO.address || "");
        // Lokasi default toko bangunan: Jl. Citalang, Purwakarta (Akurat)
        let defaultCenter: [number, number] = [-6.540167231406242, 107.46460797264017];
        let defaultZoom = 15;

        if (parsed.coordinates) {
          const [lat, lng] = parsed.coordinates.split(",").map(Number);
          if (!isNaN(lat) && !isNaN(lng)) {
            defaultCenter = [lat, lng];
            defaultZoom = 17;
          }
        }

        try {
          if (mapRef.current) {
            mapRef.current.remove();
            mapRef.current = null;
          }

          const map = L.map("map-picker", {
            center: defaultCenter,
            zoom: defaultZoom,
            zoomControl: false
          });

          // Menggunakan Google Maps Street Tiles agar data jalan, bangunan, bisnis, dan nama daerah sangat lengkap di Indonesia
          L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
            maxZoom: 20,
            subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
            attribution: '&copy; <a href="https://maps.google.com" target="_blank" rel="noopener noreferrer">Google Maps</a>'
          }).addTo(map);

          L.control.zoom({ position: "bottomright" }).addTo(map);

          mapRef.current = map;
          mapInstance = map;

          // Tambahkan penanda khusus untuk lokasi toko bangunan ini (Dinamis & Interaktif)
          const shopCoords: [number, number] = [-6.540167231406242, 107.46460797264017];
          const shopMarker = L.marker(shopCoords, {
            icon: L.divIcon({
              className: '!bg-transparent !border-none flex items-center justify-center',
              html: `<div class="group relative flex items-center justify-center w-8 h-8 bg-brand-primary text-white rounded-full shadow-lg border-2 border-white hover:scale-110 transition-all duration-200 cursor-pointer">
                <span class="text-sm">🏢</span>
              </div>`,
              iconSize: [32, 32],
              iconAnchor: [16, 16]
            })
          }).addTo(map);

          // Tooltip nama toko muncul hanya saat di-hover/di-klik
          shopMarker.bindTooltip("Toko PD Sukses Bangunan", {
            direction: "top",
            permanent: false,
            className: "font-black text-[10px] text-text-primary px-2 py-1 bg-bg-card rounded-lg shadow-md border border-border-default"
          });

          const initialCoordsString = `${defaultCenter[0].toFixed(6)},${defaultCenter[1].toFixed(6)}`;
          setGpsCoordinates(parsed.coordinates || initialCoordsString);

          setTimeout(() => {
            if (mapRef.current) {
              mapRef.current.invalidateSize();
            }
          }, 150);

          map.on("move", () => {
            const center = map.getCenter();
            setGpsCoordinates(`${center.lat.toFixed(6)},${center.lng.toFixed(6)}`);
          });

        } catch (err) {
          console.error("Map initialization error:", err);
        }
      }, 200);
    }

    return () => {
      clearTimeout(timer);
      if (mapInstance) {
        mapInstance.remove();
        if (mapRef.current === mapInstance) {
          mapRef.current = null;
        }
      }
    };
  }, [isGPSModalOpen, gpsTargetDO]);

  // Recalculate Leaflet map size on transition to prevent gray areas
  useEffect(() => {
    if (mapRef.current) {
      const timer = setTimeout(() => {
        mapRef.current.invalidateSize();
      }, 350); // wait for CSS expand/collapse transitions to finish
      return () => clearTimeout(timer);
    }
  }, [isMapExpanded]);

  const handleMapSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!mapSearchQuery.trim()) return;

    setIsSearchingMap(true);
    setMapSearchResults([]);
    try {
      let query = mapSearchQuery.trim();

      // Fokus pencarian ke Purwakarta: jika tidak ada kata kunci wilayah lain, tambahkan ", Purwakarta"
      const regionalKeywords = [
        "purwakarta", "subang", "karawang", "bandung", "tangerang",
        "jakarta", "bekasi", "bogor", "depok", "cianjur"
      ];
      const hasRegionalKeyword = regionalKeywords.some(keyword =>
        query.toLowerCase().includes(keyword)
      );

      if (!hasRegionalKeyword) {
        query = `${query}, Purwakarta`;
      }

      // Gunakan parameter viewbox untuk memprioritaskan area Purwakarta & sekitarnya, serta batasi negara Indonesia
      // Bounding box Purwakarta: Bujur 107.30 s/d 107.55, Lintang -6.45 s/d -6.65
      // Ambil hingga 5 hasil pencarian (limit=5)
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&viewbox=107.30,-6.45,107.55,-6.65&countrycodes=id&limit=5`;

      const response = await fetch(url);
      if (response.ok) {
        const results = await response.json();
        if (results && results.length > 0) {
          setMapSearchResults(results);
          toast.success(`${results.length} lokasi alternatif ditemukan! Silakan pilih salah satu.`);
        } else {
          toast.error("Lokasi tidak ditemukan. Coba ketik nama desa/kecamatan lebih spesifik.");
        }
      } else {
        toast.error("Gagal melakukan pencarian lokasi");
      }
    } catch (error) {
      console.error("Geocoding error:", error);
      toast.error("Terjadi kesalahan koneksi saat mencari lokasi");
    } finally {
      setIsSearchingMap(false);
    }
  };

  const selectMapSearchResult = (result: any) => {
    const { lat, lon, display_name } = result;
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);

    if (!isNaN(latitude) && !isNaN(longitude)) {
      if (mapRef.current) {
        mapRef.current.setView([latitude, longitude], 17);
        setTimeout(() => {
          if (mapRef.current) {
            mapRef.current.invalidateSize();
          }
        }, 150);
      }
      setGpsCoordinates(`${latitude.toFixed(6)},${longitude.toFixed(6)}`);
      
      // Update alamat text input dengan versi yang lebih rapi (4 segmen pertama)
      const shortenedAddress = display_name.split(",").slice(0, 4).join(",").trim();
      setGpsAddress(shortenedAddress);
      
      setMapSearchResults([]); // Sembunyikan list setelah dipilih
      toast.success("Lokasi dipilih!");
    } else {
      toast.error("Koordinat lokasi tidak valid");
    }
  };

  const handleOpenGPSRoute = (onlyOpen: boolean) => {
    if (!gpsTargetDO) return;

    const destination = gpsCoordinates ? encodeURIComponent(gpsCoordinates) : encodeURIComponent(gpsAddress.trim());
    const origin = encodeURIComponent(shopSettings.shopAddress);
    const mapsLink = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}`;

    if (onlyOpen) {
      window.open(mapsLink, "_blank", "noopener,noreferrer");
      setIsGPSModalOpen(false);
      return;
    }

    const fullAddress = gpsCoordinates ? `${gpsAddress.trim()} || ${gpsCoordinates.trim()}` : gpsAddress.trim();

    setIsSavingGPSAddress(true);
    const promise = fetch(`/api/deliveries/${gpsTargetDO.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address: fullAddress })
    });

    toast.promise(promise, {
      loading: "Menyimpan alamat baru...",
      success: () => {
        setDeliveries(prev => prev.map(d => d.id === gpsTargetDO.id ? { ...d, address: fullAddress } : d));
        window.open(mapsLink, "_blank", "noopener,noreferrer");
        setIsGPSModalOpen(false);
        setIsSavingGPSAddress(false);
        return "Alamat berhasil diperbarui dan rute GPS dibuka!";
      },
      error: () => {
        setIsSavingGPSAddress(false);
        return "Gagal menyimpan alamat baru.";
      }
    });
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, dateFilter, startDate, endDate]);

  const filteredDeliveries = useMemo(() => {
    return activeDeliveries.filter(d => {
      const matchesSearch = d.doNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            d.customer?.name?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "ALL" || d.status === statusFilter;
      
      let matchesDate = true;
      if (dateFilter !== "ALL" && d.createdAt) {
        const deliveryDate = new Date(d.createdAt);
        const today = new Date();
        if (dateFilter === "TODAY") {
          matchesDate = deliveryDate.toDateString() === today.toDateString();
        } else if (dateFilter === "7DAYS") {
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(today.getDate() - 7);
          matchesDate = deliveryDate >= sevenDaysAgo;
        } else if (dateFilter === "30DAYS") {
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(today.getDate() - 30);
          matchesDate = deliveryDate >= thirtyDaysAgo;
        } else if (dateFilter === "CUSTOM") {
          if (startDate) {
            const sDate = new Date(startDate);
            sDate.setHours(0, 0, 0, 0);
            if (deliveryDate < sDate) matchesDate = false;
          }
          if (endDate) {
            const eDate = new Date(endDate);
            eDate.setHours(23, 59, 59, 999);
            if (deliveryDate > eDate) matchesDate = false;
          }
        }
      }

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [activeDeliveries, searchQuery, statusFilter, dateFilter, startDate, endDate]);

  const totalItems = filteredDeliveries.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const paginatedDeliveries = useMemo(() => {
    return filteredDeliveries.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );
  }, [filteredDeliveries, currentPage, itemsPerPage]);

  return (
    <phantom-ui loading={isLoading} reveal={0.3}>
      <div className="px-4 lg:px-8 pb-4 lg:pb-8 h-full flex flex-col transition-colors duration-300 bg-bg-main overflow-y-auto custom-scrollbar relative">
      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-2 sm:gap-6 lg:gap-6 flex-shrink-0 transition-all duration-300 pt-4 lg:pt-8 mb-4 lg:mb-8">
        <SummaryCard
          title="Total Pengiriman"
          value={activeDeliveries.length}
          icon={<Truck className="w-5 h-5 lg:w-6 lg:h-6" />}
          color="blue"
          isLoading={isLoading}
        />
        <SummaryCard
          title="Dalam Perjalanan"
          value={activeDeliveries.filter(d => d.status === "ON_DELIVERY").length}
          icon={<Clock className="w-5 h-5 lg:w-6 lg:h-6" />}
          color="orange"
          isLoading={isLoading}
        />
        <SummaryCard
          title="Selesai"
          value={activeDeliveries.filter(d => d.status === "DELIVERED").length}
          icon={<CheckCircle2 className="w-5 h-5 lg:w-6 lg:h-6" />}
          color="green"
          isLoading={isLoading}
        />
      </div>

      {/* Scrollable Pills Tabs (Capsule Style matching Debts Page) */}
      <div className="flex items-center space-x-2 overflow-x-auto scrollbar-hide flex-shrink-0 my-6 -mx-4 px-4 lg:mx-0 lg:px-0">
        <button
          onClick={() => setActiveTab("deliveries")}
          className={cn(
            "px-6 py-2.5 rounded-full text-xs font-bold transition-all whitespace-nowrap flex items-center space-x-2 outline-none focus:outline-none",
            activeTab === "deliveries"
              ? "bg-brand-primary text-text-inverse shadow-lg shadow-brand-primary/20"
              : "bg-bg-card text-text-secondary border border-border-default hover:bg-bg-main hover:text-text-primary"
          )}
        >
          <ClipboardCheck className="w-4 h-4" />
          <span>Daftar Pengiriman</span>
        </button>
        <button
          onClick={() => setActiveTab("trips")}
          className={cn(
            "px-6 py-2.5 rounded-full text-xs font-bold transition-all whitespace-nowrap flex items-center space-x-2 outline-none focus:outline-none relative",
            activeTab === "trips"
              ? "bg-brand-primary text-text-inverse shadow-lg shadow-brand-primary/20"
              : "bg-bg-card text-text-secondary border border-border-default hover:bg-bg-main hover:text-text-primary"
          )}
        >
          <Truck className="w-4 h-4" />
          <span>Trip Aktif</span>
          {activeTrips.length > 0 && (
            <span className={cn(
              "ml-1.5 px-2 py-0.5 rounded-full text-[9px] font-black leading-none animate-pulse",
              activeTab === "trips" ? "bg-text-inverse text-brand-primary font-bold" : "bg-brand-primary text-text-inverse"
            )}>
              {activeTrips.length}
            </span>
          )}
        </button>
      </div>

      <div className="rounded-[32px] lg:rounded-[32px] border flex flex-col bg-bg-card border-border-default">
        {activeTab === "deliveries" && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 ease-out flex flex-col flex-1">
            {/* Action Bar */}
            <div className="p-8 lg:p-8 border-b flex flex-col xl:flex-row xl:items-center justify-between gap-6 flex-shrink-0 border-border-subtle sticky top-0 z-20 bg-bg-card rounded-t-[32px] lg:rounded-t-[32px]">
              <div className="flex flex-col xl:flex-row items-center gap-4 xl:gap-6 flex-1 w-full">
                <div className="relative flex-1 w-full flex items-center group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted w-5 h-5 transition-colors group-focus-within:text-brand-primary" />
                  <input
                    type="text"
                    placeholder="Cari nomor pengiriman atau pelanggan..."
                    className="w-full pl-12 pr-4 py-2.5 lg:py-3 border shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-all text-sm bg-bg-main border-border-default text-text-primary placeholder:text-text-muted rounded-full h-[44px]"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                
                <div className="flex flex-wrap items-center gap-2 xl:gap-4 w-full xl:w-auto">
                  <select
                    className="w-full sm:w-auto px-4 py-2 rounded-xl border text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-primary bg-bg-main border-border-default text-text-primary h-[40px] transition-all cursor-pointer flex-1 sm:flex-initial shrink-0 [&>option]:bg-bg-main [&>option]:text-text-primary"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="ALL">Semua Status</option>
                    <option value="PENDING">Menunggu</option>
                    <option value="ON_DELIVERY">Di Perjalanan</option>
                    <option value="DELIVERED">Selesai</option>
                    <option value="CANCELLED">Batal</option>
                  </select>
                  
                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    <select
                      className="w-full sm:w-auto px-4 py-2 rounded-xl border text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-primary bg-bg-main border-border-default text-text-primary h-[40px] transition-all cursor-pointer flex-1 sm:flex-initial shrink-0 [&>option]:bg-bg-main [&>option]:text-text-primary"
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value)}
                    >
                      <option value="ALL">Semua Waktu</option>
                      <option value="TODAY">Hari Ini</option>
                      <option value="7DAYS">7 Hari Terakhir</option>
                      <option value="30DAYS">30 Hari Terakhir</option>
                      <option value="CUSTOM">Pilih Tanggal</option>
                    </select>

                    <div className="flex items-center gap-2 bg-bg-main px-3 rounded-xl border border-border-default h-10 shrink-0 w-full sm:w-auto overflow-x-auto">
                      <div className="relative flex items-center h-full">
                        <Calendar className="absolute left-2.5 w-4 h-4 text-text-secondary pointer-events-none z-10" />
                        <input
                          type="date"
                          value={startDate}
                          onChange={(e) => {
                            setStartDate(e.target.value);
                            setDateFilter("CUSTOM");
                          }}
                          className="pl-9 pr-3 h-full bg-transparent text-xs font-bold text-text-primary min-w-[130px] focus:outline-none cursor-pointer relative z-0"
                        />
                      </div>
                      <span className="text-text-muted font-bold">-</span>
                      <div className="relative flex items-center h-full">
                        <Calendar className="absolute left-2.5 w-4 h-4 text-text-secondary pointer-events-none z-10" />
                        <input
                          type="date"
                          value={endDate}
                          onChange={(e) => {
                            setEndDate(e.target.value);
                            setDateFilter("CUSTOM");
                          }}
                          className="pl-9 pr-3 h-full bg-transparent text-xs font-bold text-text-primary min-w-[130px] focus:outline-none cursor-pointer relative z-0"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => { setPendingModalMode("view"); setIsPendingModalOpen(true); fetchPendingSales(); }}
                    className="xl:hidden p-2 bg-brand-primary text-text-inverse rounded-xl shadow-lg shadow-brand-primary/20 hover:bg-brand-hover transition-all flex items-center justify-center shrink-0 min-w-[44px] min-h-[44px]"
                    title="Antrean Kirim"
                  >
                    <Clock className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="hidden xl:flex items-center space-x-2 shrink-0">
                <button
                  onClick={() => { setPendingModalMode("view"); setIsPendingModalOpen(true); fetchPendingSales(); }}
                  className="flex items-center space-x-2 px-5 h-11 bg-brand-primary text-text-inverse rounded-xl font-bold text-sm shadow-lg shadow-brand-primary/20 hover:bg-brand-hover transition-all active:scale-95 shrink-0"
                >
                  <Clock className="w-5 h-5" />
                  <span>Antrean Kirim</span>
                </button>
              </div>
            </div>

            <div className="">
              {/* Desktop Table */}
              <table className="hidden lg:table w-full text-left border-collapse min-w-[1000px]">
                <thead data-shimmer-ignore>
                  <tr className="border-b border-border-subtle">
                    <th className="sticky top-[71px] lg:top-[87px] z-10 bg-bg-main px-4 py-4 w-12 text-center">
                      <input
                        type="checkbox"
                        className="rounded border-border-default text-brand-primary focus:ring-brand-primary w-4 h-4 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed rounded-lg"
                        checked={paginatedDeliveries.length > 0 && paginatedDeliveries.filter(d => d.status === "PENDING").length > 0 && paginatedDeliveries.filter(d => d.status === "PENDING").every(d => selectedDOIds.includes(d.id))}
                        disabled={paginatedDeliveries.filter(d => d.status === "PENDING").length === 0}
                        title={paginatedDeliveries.filter(d => d.status === "PENDING").length === 0 ? "Tidak ada pengiriman baru (Menunggu) untuk dipilih di halaman ini" : "Pilih Semua Pengiriman Baru"}
                        onChange={(e) => {
                          if (e.target.checked) {
                            const pendingPageIds = paginatedDeliveries.filter(d => d.status === "PENDING").map(d => d.id);
                            setSelectedDOIds(prev => Array.from(new Set([...prev, ...pendingPageIds])));
                          } else {
                            const pageIds = paginatedDeliveries.map(d => d.id);
                            setSelectedDOIds(prev => prev.filter(id => !pageIds.includes(id)));
                          }
                        }}
                      />
                    </th>
                    <th className="sticky top-[71px] lg:top-[87px] z-10 bg-bg-main px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider">No. Pengiriman</th>
                    <th className="sticky top-[71px] lg:top-[87px] z-10 bg-bg-main px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider">Pelanggan</th>
                    <th className="sticky top-[71px] lg:top-[87px] z-10 bg-bg-main px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider">Sopir / Kendaraan</th>
                    <th className="sticky top-[71px] lg:top-[87px] z-10 bg-bg-main px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider">Tanggal</th>
                    <th className="sticky top-[71px] lg:top-[87px] z-10 bg-bg-main px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider text-center">Status</th>
                    <th className="sticky top-[71px] lg:top-[87px] z-10 bg-bg-main px-6 py-4 text-xs font-bold text-text-muted uppercase tracking-wider text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {paginatedDeliveries.map((delivery) => {
                    const status = STATUS_CONFIG[delivery.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.PENDING;
                    const StatusIcon = status.icon;

                    return (
                      <tr key={delivery.id} className="transition-colors group hover:bg-bg-main/50 cursor-pointer" onClick={() => { setSelectedDeliveryDetail(delivery); setIsDeliveryDetailModalOpen(true); }}>
                        <td className="px-4 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            className="rounded border-border-default text-brand-primary focus:ring-brand-primary w-4 h-4 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed rounded-lg"
                            checked={selectedDOIds.includes(delivery.id)}
                            disabled={delivery.status !== "PENDING"}
                            title={delivery.status !== "PENDING" ? `Tidak dapat membuat trip untuk DO berstatus ${STATUS_CONFIG[delivery.status as keyof typeof STATUS_CONFIG]?.label || delivery.status}` : "Pilih untuk konsolidasi trip"}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedDOIds(prev => [...prev, delivery.id]);
                              } else {
                                setSelectedDOIds(prev => prev.filter(id => id !== delivery.id));
                              }
                            }}
                          />
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-mono text-xs font-bold text-brand-primary bg-brand-light px-2 py-1 rounded">{delivery.doNumber}</span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-bold text-text-primary">
                            <span className="block w-fit">{delivery.customer?.name || "Umum"}</span>
                          </p>
                          <div className="flex items-center space-x-2 text-xs text-text-muted mt-1 max-w-[200px] truncate">
                            <MapPin className="w-3 h-3 flex-shrink-0" />
                            <span className="block w-fit truncate">{parseAddressAndCoordinates(delivery.address).address}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-xs font-bold text-text-secondary">
                            <span className="block w-fit">{delivery.driverName || '-'}</span>
                          </p>
                          <p className="text-xs text-text-muted font-mono mt-0.5">
                            <span className="block w-fit">{parseVehiclePlate(delivery.vehiclePlate).cleanPlate}</span>
                          </p>
                        </td>
                        <td className="px-6 py-4 text-xs font-medium text-text-muted">
                          <span className="block w-fit">{new Date(delivery.createdAt).toLocaleDateString()}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex flex-col items-center space-y-1">
                            <span className={cn(
                              "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center space-x-1",
                              status.color
                            )}>
                              <StatusIcon className="w-3 h-3" />
                              <span>{status.label}</span>
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => openGPSModal(delivery)}
                              className="p-2 rounded-lg transition-all text-text-muted hover:text-brand-primary hover:bg-brand-light outline-none focus:outline-none focus:ring-0"
                              title="Buka Rute GPS"
                            >
                              <MapPin className="w-5 h-5" />
                            </button>

                            <select
                              className="px-4 py-2 rounded-xl border text-xs font-bold focus:outline-none focus:ring-2 focus:ring-brand-primary bg-bg-main border-border-default text-text-primary h-[40px] transition-all [&>option]:bg-bg-main [&>option]:text-text-primary"
                              value={delivery.status}
                              onChange={(e) => updateDelivery(delivery.id, { status: e.target.value })}
                            >
                              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                                <option key={key} value={key}>{cfg.label}</option>
                              ))}
                            </select>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {paginatedDeliveries.length === 0 && !isLoading && (
                    <tr>
                      <td colSpan={6} className="px-6 py-6 text-center">
                        <EmptyState
                          icon={Truck}
                          title="Belum Ada Pengiriman"
                          description="Semua data pengiriman akan muncul di sini. Mulai buat pengiriman baru dari antrean penjualan."
                          action={{
                            label: "Buat Pengiriman Baru",
                            onClick: () => { setPendingModalMode("create"); setIsPendingModalOpen(true); fetchPendingSales(); },
                            icon: Plus
                          }}
                        />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              <div className="block lg:hidden">
                {paginatedDeliveries.length === 0 && !isLoading ? (
                  <div className="p-4">
                    <EmptyState
                      icon={Truck}
                      title="Data Pengiriman Kosong"
                      description="Belum ada jadwal pengiriman yang tercatat saat ini."
                      action={{
                        label: "Buat Pengiriman",
                        onClick: () => { setPendingModalMode("create"); setIsPendingModalOpen(true); fetchPendingSales(); },
                        icon: Plus
                      }}
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-6 p-4">
                    {paginatedDeliveries.map((delivery) => {
                      const status = STATUS_CONFIG[delivery.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.PENDING;
                      const StatusIcon = status.icon;

                      return (
                        <div
                          key={delivery.id}
                          className="bg-bg-card rounded-2xl p-4 border border-border-default shadow-sm hover:border-brand-primary/50 transition-all space-y-8 cursor-pointer"
                          onClick={() => { setSelectedDeliveryDetail(delivery); setIsDeliveryDetailModalOpen(true); }}
                        >
                          {/* Header: Checkbox, DO Number & Status */}
                          <div className="flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                className="rounded border-border-default text-brand-primary focus:ring-brand-primary w-4 h-4 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed rounded-lg"
                                checked={selectedDOIds.includes(delivery.id)}
                                disabled={delivery.status !== "PENDING"}
                                title={delivery.status !== "PENDING" ? `Tidak dapat membuat trip untuk DO berstatus ${STATUS_CONFIG[delivery.status as keyof typeof STATUS_CONFIG]?.label || delivery.status}` : "Pilih untuk konsolidasi trip"}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedDOIds(prev => [...prev, delivery.id]);
                                  } else {
                                    setSelectedDOIds(prev => prev.filter(id => id !== delivery.id));
                                  }
                                }}
                              />
                              <span className="font-mono text-[10px] font-bold text-brand-primary bg-brand-light px-2 py-1 rounded">
                                {delivery.doNumber}
                              </span>
                            </div>
                            <div className="flex items-center space-x-1.5 px-2 py-1 rounded-lg bg-bg-main border border-border-subtle">
                              <StatusIcon className={cn("w-3 h-3", status.color.split(' ')[1])} />
                              <span className={cn("text-[9px] font-black uppercase tracking-wider", status.color.split(' ')[1])}>
                                {status.label}
                              </span>
                            </div>
                          </div>

                          {/* Body: Customer & Location */}
                          <div className="space-y-8">
                            <div>
                              <h4 className="text-sm font-black text-text-primary truncate">
                                {delivery.customer?.name || "Umum"}
                              </h4>
                              <div className="flex items-start space-x-1.5 text-[11px] text-text-muted mt-1.5">
                                <MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 opacity-50" />
                                <span className="line-clamp-2 leading-relaxed">{parseAddressAndCoordinates(delivery.address).address}</span>
                              </div>
                            </div>

                            {/* Driver Row */}
                            <div className="flex items-center justify-between bg-bg-main/50 p-2.5 rounded-[24px] border border-border-subtle/50">
                              <div className="flex items-center space-x-2 min-w-0">
                                <Truck className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />
                                <span className="text-[10px] font-bold text-text-secondary truncate">{delivery.driverName}</span>
                              </div>
                              <span className="text-[10px] font-bold text-text-muted font-mono">{parseVehiclePlate(delivery.vehiclePlate).cleanPlate}</span>
                            </div>
                          </div>

                          {/* Footer: Date & Actions */}
                          <div className="flex items-center justify-between pt-3 border-t border-border-subtle/50" onClick={(e) => e.stopPropagation()}>
                            <div className="flex flex-col">
                              <span className="text-[9px] font-bold text-text-muted uppercase tracking-widest">Tanggal Kirim</span>
                              <span className="text-[10px] font-black text-text-primary mt-0.5">
                                {new Date(delivery.createdAt).toLocaleDateString("id-ID", { day: '2-digit', month: 'short', year: 'numeric' })}
                              </span>
                            </div>

                            <div className="flex items-center space-x-1">
                              <button
                                onClick={() => openGPSModal(delivery)}
                                className="w-9 h-9 flex items-center justify-center rounded-xl bg-bg-main text-text-muted hover:text-brand-primary hover:bg-brand-light"
                                title="Buka Rute GPS"
                              >
                                <MapPin className="w-4.5 h-4.5" />
                              </button>

                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Pagination Controls */}
            {totalItems > 0 && (
              <div className="p-8 lg:p-8 border-t border-border-subtle bg-bg-card flex-shrink-0 rounded-b-[32px] lg:rounded-b-[32px]">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                  <div className="flex items-center space-x-4">
                    <span className="text-[10px] lg:text-xs font-bold text-text-muted whitespace-nowrap uppercase tracking-wider">
                      Hal {currentPage} dari {totalPages} • {totalItems} Data
                    </span>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="px-4 py-2 border rounded-xl text-xs font-bold bg-bg-card border-border-default text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary transition-all h-[40px] [&>option]:bg-bg-main [&>option]:text-text-primary"
                    >
                      <option value={15}>15 per hal</option>
                      <option value={50}>50 per hal</option>
                      <option value={100}>100 per hal</option>
                    </select>
                  </div>

                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1.5 border rounded-xl text-[10px] font-bold transition-all bg-bg-card border-border-default text-text-primary disabled:opacity-30 hover:bg-bg-main"
                    >
                      Sebelumnya
                    </button>
                    <div className="flex px-2 space-x-1">
                      {Array.from({ length: Math.min(3, totalPages) }, (_, i) => {
                        let pNum = i + 1;
                        if (totalPages > 3 && currentPage > 2) pNum = Math.min(currentPage - 1 + i, totalPages - 2 + i);
                        return (
                          <button
                            key={pNum}
                            onClick={() => setCurrentPage(pNum)}
                            className={cn(
                              "w-8 h-8 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center",
                              currentPage === pNum
                                ? "bg-brand-primary text-text-inverse shadow-lg shadow-brand-primary/20"
                                : "bg-bg-card text-text-secondary border border-border-default hover:bg-bg-main"
                            )}
                          >
                            {pNum}
                          </button>
                        );
                      })}
                    </div>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1.5 border rounded-xl text-[10px] font-bold transition-all bg-bg-card border-border-default text-text-primary disabled:opacity-30 hover:bg-bg-main"
                    >
                      Selanjutnya
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "trips" && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 ease-out flex flex-col flex-1">
            {/* Active Trips Action Bar */}
            <div className="p-8 lg:p-8 border-b flex flex-col lg:flex-row lg:items-center justify-between gap-6 lg:gap-0 flex-shrink-0 border-border-subtle sticky top-0 z-20 bg-bg-card rounded-t-[32px] lg:rounded-t-[32px]">
              <div className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-6 flex-1 w-full lg:w-auto">
                <div className="flex items-center gap-2 w-full lg:max-w-2xl">
                  <div className="relative flex-1 flex items-center group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted w-5 h-5 transition-colors group-focus-within:text-brand-primary" />
                    <input
                      type="text"
                      placeholder="Cari sopir, plat, atau pelanggan..."
                      className="w-full pl-12 pr-4 py-2.5 lg:py-3 border shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-all text-sm bg-bg-main border-border-default text-text-primary placeholder:text-text-muted rounded-full h-[44px]"
                      value={tripSearchQuery}
                      onChange={(e) => setTripSearchQuery(e.target.value)}
                    />
                  </div>

                </div>
              </div>

            </div>

            {/* Active Trips Grid */}
            <div className="p-4 lg:p-6 bg-bg-main/30 flex-1 min-h-[400px] rounded-b-[32px] lg:rounded-b-[32px]">
              {filteredActiveTrips.length === 0 ? (
                <div className="py-12">
                  <EmptyState
                    icon={Truck}
                    title="Belum Ada Trip Aktif"
                    description="Tidak ada pengiriman gabungan yang sedang berjalan saat ini. Beralih ke tab 'Daftar Pengiriman', pilih beberapa Pengiriman (DO), lalu klik 'Buat Trip' untuk memulai rute pengantaran truk."
                    action={{
                      label: "Buka Daftar Pengiriman",
                      onClick: () => setActiveTab("deliveries"),
                      icon: ClipboardCheck
                    }}
                  />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {filteredActiveTrips.map((trip) => {
                    // Compute combined items for this specific trip
                    const tripItemsMap: { [key: string]: { name: string, quantity: number, unitName: string } } = {};
                    trip.deliveries.forEach(doItem => {
                      doItem.items?.forEach((item: any) => {
                        const prodId = item.productId || item.product?.id;
                        if (prodId) {
                          if (tripItemsMap[prodId]) {
                            tripItemsMap[prodId].quantity += item.quantity;
                          } else {
                            tripItemsMap[prodId] = {
                              name: item.product?.name || "Produk",
                              quantity: item.quantity,
                              unitName: item.unitName
                            };
                          }
                        }
                      });
                    });
                    const tripCombinedItems = Object.values(tripItemsMap);

                    return (
                      <div
                        key={trip.id}
                        className="bg-bg-card rounded-[32px] border border-border-default hover: transition-all duration-300 flex flex-col overflow-hidden text-text-primary"
                      >
                        {/* Trip Header */}
                        <div className="p-5 lg:p-6 border-b border-border-subtle bg-bg-main/30 flex items-center justify-between gap-6">
                          <div className="flex items-center space-x-3.5 min-w-0">
                            <div className="w-12 h-12 rounded-[32px] bg-brand-primary/10 text-brand-primary flex items-center justify-center flex-shrink-0">
                              <Truck className="w-6 h-6" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center space-x-2">
                                <span className="font-mono text-[10px] font-black text-brand-primary bg-brand-light px-2 py-0.5 rounded-lg tracking-wider uppercase">
                                  {trip.id}
                                </span>
                                <span className="text-xs text-text-muted font-black uppercase tracking-wider">
                                  • {trip.deliveries.length} DO
                                </span>
                              </div>
                              <h4 className="text-base font-black text-text-primary truncate mt-1 flex items-center">
                                <User className="w-4 h-4 text-text-muted mr-2 flex-shrink-0" />
                                <span>{trip.driverName}</span>
                              </h4>
                            </div>
                          </div>

                          <span className="px-3.5 py-2 rounded-xl bg-bg-card border border-border-default font-mono text-sm font-black text-text-secondary flex-shrink-0 shadow-sm">
                            {parseVehiclePlate(trip.vehiclePlate).cleanPlate}
                          </span>
                        </div>

                        {/* Stepper Rute */}
                        <div className="p-6 flex-1 space-y-8">
                          <div className="flex items-center justify-between border-b border-border-subtle/50 pb-2.5">
                            <h5 className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Rute Drop-off & Status</h5>
                            <span className="text-[10px] text-brand-primary font-black uppercase tracking-wider">Urutan Navigasi</span>
                          </div>

                          <div className="relative pl-2 space-y-0">
                            {trip.deliveries.map((doItem, idx) => {
                              const dStatus = STATUS_CONFIG[doItem.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.PENDING;
                              const DStatusIcon = dStatus.icon;

                              return (
                                <div key={doItem.id} className="relative pl-11 pb-6 last:pb-2 group/step">
                                  {/* Line for this step to next step */}
                                  {idx < trip.deliveries.length - 1 && (
                                    <div className="absolute left-[21px] top-[30px] bottom-0 w-0.5 bg-border-default"></div>
                                  )}

                                  {/* Number circle indicator */}
                                  <div className={cn(
                                    "absolute left-2 top-0.5 w-7 h-7 rounded-full border-2 font-black text-sm flex items-center justify-center transition-all z-10 shadow-sm",
                                    doItem.status === "DELIVERED"
                                      ? "bg-status-success border-status-success text-white font-bold"
                                      : doItem.status === "CANCELLED"
                                        ? "bg-status-danger border-status-danger text-white font-bold"
                                        : "bg-bg-card border-brand-primary text-brand-primary group-hover/step:scale-110"
                                  )}>
                                    {doItem.status === "DELIVERED" ? "✓" : doItem.status === "CANCELLED" ? "✕" : idx + 1}
                                  </div>

                                  <div className="min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                      <h6
                                        className="text-sm font-black text-text-primary truncate"
                                      >
                                        {doItem.customer?.name || "Umum"}
                                      </h6>

                                      <span className={cn(
                                        "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center space-x-0.5 flex-shrink-0",
                                        dStatus.color
                                      )}>
                                        <DStatusIcon className="w-2.5 h-2.5" />
                                        <span>{dStatus.label}</span>
                                      </span>
                                    </div>

                                    <div className="flex items-center space-x-2 mt-1.5">
                                      <span
                                        className="font-mono text-xs text-text-muted font-bold"
                                      >
                                        {doItem.doNumber}
                                      </span>
                                      <span className="text-xs text-text-muted/80 max-w-[180px] sm:max-w-[240px] truncate">
                                        • {parseAddressAndCoordinates(doItem.address).address}
                                      </span>
                                    </div>

                                    {/* Stop load description */}
                                    <div className="mt-2 bg-bg-main/40 px-2.5 py-1.5 rounded-[24px] border border-border-subtle/40 text-xs font-semibold text-text-secondary flex items-center gap-1.5 max-w-fit">
                                      <Package className="w-3.5 h-3.5 flex-shrink-0 text-brand-primary/80" />
                                      <span>
                                        {doItem.items?.map((it: any) => `${it.quantity} ${it.unitName} ${it.product?.name || "Produk"}`).join(", ") || "Tanpa muatan"}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Ringkasan Muatan Gabungan Truk */}
                        <div className="px-6 py-4 bg-bg-main/30 border-t border-border-subtle/50 space-y-2">
                          <details className="group">
                            <summary className="list-none flex items-center justify-between text-[11px] font-bold text-text-muted uppercase tracking-wider cursor-pointer outline-none select-none">
                              <span className="flex items-center gap-2">
                                <Package className="w-4 h-4 text-brand-primary" />
                                <span>Ringkasan Muatan Truk ({tripCombinedItems.length} Produk)</span>
                              </span>
                              <span className="transition-transform duration-200 group-open:rotate-180">
                                <ChevronDown className="w-4 h-4" />
                              </span>
                            </summary>
                            <div className="mt-3 max-h-40 overflow-y-auto custom-scrollbar border rounded-[24px] divide-y divide-border-subtle bg-bg-card border-border-default">
                              {tripCombinedItems.map((item: any, idx) => (
                                <div key={idx} className="p-3 flex items-center justify-between text-xs font-semibold text-text-secondary">
                                  <span className="font-bold text-text-primary">{item.name}</span>
                                  <span className="font-black text-brand-primary bg-brand-light px-2.5 py-0.5 rounded text-[10px]">
                                    {item.quantity} {item.unitName}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </details>
                        </div>

                        {/* Trip Actions */}
                        <div className="p-4 lg:p-5 border-t border-border-subtle bg-bg-main/30 flex flex-col sm:flex-row sm:items-center gap-6">
                          <div className="flex items-center gap-2 flex-1">
                            <button
                              onClick={() => openTripMaps(trip)}
                              className="flex-1 min-h-[44px] py-2.5 bg-bg-card border border-border-default hover:bg-bg-main text-text-secondary rounded-xl text-xs font-black tracking-tight transition-all flex items-center justify-center space-x-1.5 shadow-sm outline-none focus:outline-none"
                              title="Buka Rute Google Maps Multi-Drop"
                            >
                              <MapPin className="w-4 h-4 text-brand-primary" />
                              <span>Rute GPS</span>
                            </button>


                          </div>

                          <button
                            onClick={() => handleCompleteAllInTrip(trip)}
                            className="w-full sm:w-auto sm:flex-1.2 min-h-[44px] py-2.5 bg-brand-primary text-text-inverse rounded-xl text-xs font-black tracking-tight shadow-md shadow-brand-primary/10 hover:bg-brand-hover transition-all flex items-center justify-center space-x-1.5 px-6 outline-none focus:outline-none"
                            title="Selesaikan semua Pengiriman di trip ini"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Selesaikan Trip</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* FAB for Mobile */}
      <button
        onClick={() => { setPendingModalMode("create"); setIsPendingModalOpen(true); fetchPendingSales(); }}
        className="lg:hidden fixed bottom-24 right-6 w-14 h-14 bg-brand-primary text-text-inverse rounded-full flex items-center justify-center shadow-xl shadow-brand-primary/30 z-40 outline-none focus:outline-none focus:ring-0"
      >
        <Plus className="w-6 h-6" />
      </button>





      {/* Pending Sales Modal (Antrean Kirim) */}
      {isPendingModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end lg:items-center justify-center lg:p-4">
          <div className="bg-bg-modal w-full rounded-t-3xl lg:rounded-[2.5rem] overflow-hidden animate-in slide-in-from-bottom-full lg:slide-in-from-bottom-0 lg:zoom-in lg:fade-in duration-300 ease-out flex flex-col max-h-[90vh] lg:max-w-4xl">
            {/* Drag Handle for Mobile */}
            <div className="lg:hidden w-full flex justify-center pt-3 pb-1 bg-brand-primary">
              <div className="w-12 h-1.5 bg-white/30 rounded-full"></div>
            </div>
            <div className="p-5 lg:p-8 border-b flex items-center justify-between bg-brand-primary border-border-subtle flex-shrink-0 relative overflow-hidden">
              {/* Decorative Background Icon */}
              <div className="absolute -right-6 -bottom-6 opacity-10 rotate-12">
                <Truck className="w-32 h-32 text-text-inverse" />
              </div>

              <div className="flex flex-col relative z-10">
                <div className="flex items-center space-x-3 mb-1">
                  <div className="w-8 h-8 rounded-[24px] bg-white/20 backdrop-blur-md flex items-center justify-center">
                    {pendingModalMode === "create" ? <Plus className="w-4 h-4 text-text-inverse" /> : <Clock className="w-4 h-4 text-text-inverse" />}
                  </div>
                  <h3 className="text-xl lg:text-2xl font-black text-text-inverse tracking-tighter leading-none">
                    {pendingModalMode === "create" ? "Pilih Pesanan" : "Antrean Pengiriman"}
                  </h3>
                </div>
                <p className="text-[10px] lg:text-xs font-bold text-text-inverse/70 uppercase tracking-[0.2em] leading-relaxed">
                  {pendingModalMode === "create"
                    ? "Mulai pengiriman baru dari daftar antrean"
                    : "Pantau pesanan yang belum sepenuhnya terkirim"}
                </p>
              </div>
              <button onClick={() => setIsPendingModalOpen(false)} className="text-text-inverse/60 hover:text-text-inverse min-w-[44px] min-h-[44px] flex items-center justify-center p-2 lg:p-0 -mr-2 lg:mr-0 transition-colors hover:bg-white/10 rounded-full relative z-10">
                <X className="w-5 h-5 lg:w-6 h-6" />
              </button>
            </div>
            <div className="p-4 lg:p-6 flex flex-col flex-1 min-h-0">
              <div className="mb-4 relative flex-shrink-0">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted w-4 h-4" />
                <input
                  type="text"
                  placeholder="Cari Invoice atau Pelanggan..."
                  className="w-full pl-10 pr-4 py-3 lg:py-2 border lg: text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary bg-bg-main border-border-default text-text-primary rounded-lg h-[44px]"
                  value={pendingSearchQuery}
                  onChange={(e) => setPendingSearchQuery(e.target.value)}
                />
              </div>
              {isLoadingPending ? (
                <div className="py-20 flex flex-col items-center justify-center space-y-8">
                  <div className="w-10 h-10 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-xs font-bold text-text-muted">Memuat Antrean...</p>
                </div>
              ) : pendingSales.length === 0 ? (
                <div className="py-20 text-center">
                  <Package className="w-12 h-12 text-text-muted mx-auto mb-4 opacity-20" />
                  <p className="text-sm font-bold text-text-muted">Tidak ada antrean pengiriman saat ini.</p>
                </div>
              ) : (
                <div className="overflow-y-auto flex-1 min-h-0 custom-scrollbar -mx-4 px-4 lg:mx-0 lg:px-0">
                  {/* Desktop Table */}
                  <table className="hidden lg:table w-full text-left border-collapse">
                    <thead data-shimmer-ignore>
                      <tr className="bg-bg-main">
                        <th className="px-4 py-3 text-xs font-bold text-text-muted uppercase tracking-wider">Invoice</th>
                        <th className="px-4 py-3 text-xs font-bold text-text-muted uppercase tracking-wider">Tanggal</th>
                        <th className="px-4 py-3 text-xs font-bold text-text-muted uppercase tracking-wider">Pelanggan</th>
                        <th className="px-4 py-3 text-xs font-bold text-text-muted uppercase tracking-wider">Status Kirim</th>
                        <th className="px-4 py-3 text-xs font-bold text-text-muted uppercase tracking-wider text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle">
                      {paginatedPendingSales.map((sale) => (
                        <tr key={sale.id} className="hover:bg-bg-main/50 transition-colors">
                          <td className="px-4 py-3 font-mono text-xs font-bold text-brand-primary">{sale.invoiceNumber}</td>
                          <td className="px-4 py-3 text-xs text-text-secondary">{new Date(sale.createdAt).toLocaleDateString()}</td>
                          <td className="px-4 py-3 text-xs font-bold text-text-primary">{sale.customer?.name || "Umum"}</td>
                          <td className="px-4 py-3">
                            <span className={cn(
                              "px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter",
                              sale.deliveryStatus === "PARTIAL" ? "bg-brand-light text-brand-primary" : "bg-status-danger/10 text-status-danger"
                            )}>
                              {sale.deliveryStatus === "PARTIAL" ? "Ambil/Terkirim Sebagian" : "Belum Dikirim"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => initiateCreateDO(sale)}
                              className="px-3 py-1.5 bg-brand-primary text-text-inverse rounded-lg text-xs font-bold hover:bg-brand-hover transition-all flex items-center ml-auto"
                            >
                              <Plus className="w-3 h-3 mr-1" />
                              Buat DO
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="lg:hidden grid grid-cols-1 gap-2.5 px-4 pb-4 lg:px-0">
                    {paginatedPendingSales.map((sale) => (
                      <div key={sale.id} className="bg-bg-main rounded-[24px] p-3 border border-border-subtle flex items-center justify-between gap-6">
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs font-black text-text-primary truncate uppercase tracking-tight">
                            {sale.customer?.name || "Umum"}
                          </h4>
                          <div className="flex items-center space-x-2 mt-0.5">
                            <span className="font-mono text-[8px] font-bold text-brand-primary opacity-80">{sale.invoiceNumber}</span>
                            <span className="text-[8px] text-text-muted font-medium">• {new Date(sale.createdAt).toLocaleDateString("id-ID")}</span>
                          </div>
                          <div className="mt-1">
                            <span className={cn(
                              "px-1.5 py-0.5 rounded-md text-[7px] font-black uppercase tracking-wider border",
                              sale.deliveryStatus === "PARTIAL" ? "bg-brand-light text-brand-primary border-brand-primary/20" : "bg-status-danger/5 text-status-danger border-status-danger/20"
                            )}>
                              {sale.deliveryStatus === "PARTIAL" ? "Ambil/Terkirim Sebagian" : "Baru"}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => initiateCreateDO(sale)}
                          className="w-10 h-10 bg-brand-primary text-text-inverse rounded-xl flex items-center justify-center shadow-lg shadow-brand-primary/20 hover:bg-brand-hover active:scale-95 transition-all flex-shrink-0"
                          title="Buat Pengiriman"
                        >
                          <Plus className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Modal Pagination Controls */}
                  {totalPendingPages > 1 && (
                    <div className="flex items-center justify-between mt-6 px-4 lg:px-0">
                      <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
                        Hal {pendingCurrentPage} / {totalPendingPages}
                      </p>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setPendingCurrentPage(prev => Math.max(prev - 1, 1))}
                          disabled={pendingCurrentPage === 1}
                          className="p-2 rounded-xl bg-bg-main border border-border-default text-text-secondary disabled:opacity-30 hover:bg-bg-card transition-all"
                        >
                          <ChevronDown className="w-4 h-4 rotate-90" />
                        </button>
                        <button
                          onClick={() => setPendingCurrentPage(prev => Math.min(prev + 1, totalPendingPages))}
                          disabled={pendingCurrentPage === totalPendingPages}
                          className="p-2 rounded-xl bg-bg-main border border-border-default text-text-secondary disabled:opacity-30 hover:bg-bg-card transition-all"
                        >
                          <ChevronDown className="w-4 h-4 -rotate-90" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="p-8 lg:hidden border-t border-border-subtle bg-bg-card flex-shrink-0">
              <button
                onClick={() => setIsPendingModalOpen(false)}
                className="w-full min-h-[44px] py-3 border rounded-2xl font-bold text-sm transition-all bg-bg-main border-border-default text-text-secondary hover:bg-bg-card"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Partial DO Modal (Same as POS) */}
      {isCreateDOModalOpen && selectedSaleForDO && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-end lg:items-center justify-center lg:p-4">
          <div className="bg-bg-modal w-full rounded-t-3xl lg:rounded-[2.5rem] overflow-hidden animate-in slide-in-from-bottom-full lg:slide-in-from-bottom-0 lg:zoom-in lg:fade-in duration-300 ease-out flex flex-col max-h-[90vh] lg:max-w-xl">
            {/* Drag Handle for Mobile */}
            <div className="lg:hidden w-full flex justify-center pt-3 pb-1 bg-brand-primary">
              <div className="w-12 h-1.5 bg-white/30 rounded-full"></div>
            </div>
            <div className="p-4 lg:p-6 border-b flex items-center justify-between bg-brand-primary border-border-subtle flex-shrink-0">
              <div>
                <h3 className="text-base lg:text-lg font-black text-text-inverse">Buat Pengiriman (DO)</h3>
                <p className="text-[10px] lg:text-xs font-bold text-text-inverse/80 uppercase tracking-wider">{selectedSaleForDO.invoiceNumber}</p>
              </div>
              <button onClick={() => setIsCreateDOModalOpen(false)} className="text-text-inverse/60 hover:text-text-inverse min-w-[44px] min-h-[44px] flex items-center justify-center p-2 lg:p-0 -mr-2 lg:mr-0">
                <X className="w-5 h-5 lg:w-6 h-6" />
              </button>
            </div>
            <div className="p-4 lg:p-6 space-y-8 overflow-y-auto flex-1 min-h-0 custom-scrollbar">
              <div className="bg-bg-main p-4 rounded-[32px] border border-border-subtle space-y-8">
                <div className="flex justify-between items-center pb-2 border-b border-border-subtle">
                  <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Pelanggan</span>
                  <span className="text-xs font-black text-brand-primary bg-brand-light px-2 py-0.5 rounded">{selectedSaleForDO.customer?.name || "Umum"}</span>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">
                    Alamat Pengiriman
                  </label>
                  <textarea
                    value={doAddress}
                    onChange={(e) => setDoAddress(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border rounded-xl text-xs font-bold bg-bg-card border-border-default focus:outline-none focus:ring-1 focus:ring-brand-primary text-text-primary placeholder:text-text-muted/50 resize-none leading-relaxed"
                    placeholder="Masukkan alamat pengiriman..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-1 relative">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Nama Sopir <span className="text-status-danger font-black">*</span></label>
                  <input
                    type="text"
                    className="w-full p-3 border text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary transition-colors bg-bg-main border-border-default text-text-primary placeholder:text-text-muted rounded-lg h-[44px]"
                    placeholder="Masukkan nama sopir..."
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    onFocus={() => setShowDriverSuggestions(true)}
                    onBlur={() => setShowDriverSuggestions(false)}
                  />
                  {showDriverSuggestions && filteredDriverSuggestions.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 max-h-48 overflow-y-auto rounded-[24px] border border-border-subtle bg-bg-card py-1 divide-y divide-border-subtle/50 text-xs custom-scrollbar">
                      {filteredDriverSuggestions.map((driver) => (
                        <div key={driver} className="w-full text-left px-4 py-2 hover:bg-bg-main active:bg-bg-main font-bold transition-colors flex items-center justify-between group">
                          <button
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setDriverName(driver);
                              setShowDriverSuggestions(false);
                            }}
                            className="flex-1 text-left flex items-center justify-between h-full group-hover:text-brand-primary"
                          >
                            <span>{driver}</span>
                          </button>
                          <button 
                            type="button" 
                            onMouseDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              hideHistoryItem(driver);
                            }}
                            className="p-1.5 text-text-muted hover:text-status-danger hover:bg-status-danger/10 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                            title="Hapus dari riwayat"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="space-y-1 relative">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">No. Polisi (Kendaraan) <span className="text-status-danger font-black">*</span></label>
                  <input
                    type="text"
                    className="w-full p-3 border text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary transition-colors bg-bg-main border-border-default text-text-primary placeholder:text-text-muted rounded-lg h-[44px]"
                    placeholder="Contoh: B 1234 CD"
                    value={vehiclePlate}
                    onChange={(e) => setVehiclePlate(e.target.value)}
                    onFocus={() => setShowPlateSuggestions(true)}
                    onBlur={() => setShowPlateSuggestions(false)}
                  />
                  {showPlateSuggestions && filteredPlateSuggestions.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 max-h-48 overflow-y-auto rounded-[24px] border border-border-subtle bg-bg-card py-1 divide-y divide-border-subtle/50 text-xs custom-scrollbar">
                      {filteredPlateSuggestions.map((plate) => (
                        <div key={plate} className="w-full text-left px-4 py-2 hover:bg-bg-main active:bg-bg-main font-bold transition-colors flex items-center justify-between group">
                          <button
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setVehiclePlate(plate);
                              setShowPlateSuggestions(false);
                            }}
                            className="flex-1 text-left flex items-center justify-between h-full group-hover:text-brand-primary"
                          >
                            <span>{plate}</span>
                          </button>
                          <button 
                            type="button" 
                            onMouseDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              hideHistoryItem(plate);
                            }}
                            className="p-1.5 text-text-muted hover:text-status-danger hover:bg-status-danger/10 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                            title="Hapus dari riwayat"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-black text-text-muted uppercase tracking-widest">Daftar Barang & Jumlah Kirim</h4>
                <div className="space-y-2">
                  {doItems.map((item) => (
                    <div key={item.productId} className="p-3 bg-bg-main rounded-[24px] border border-border-subtle flex flex-col lg:flex-row lg:items-center justify-between space-y-8 lg:space-y-0">
                      <div className="flex-1 min-w-0 mr-4">
                        <p className="text-sm lg:text-xs font-black text-text-primary truncate">{item.name}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-[10px] lg:text-xs font-bold text-text-muted">Total: {item.totalQty}</span>
                          {item.pickedUpQty > 0 && <span className="text-[10px] lg:text-xs font-bold text-emerald-600">Ambil: {item.pickedUpQty}</span>}
                          {item.inDeliveryQty > 0 && <span className="text-[10px] lg:text-xs font-bold text-amber-600">Terkirim: {item.inDeliveryQty}</span>}
                          <span className="text-[10px] lg:text-xs font-bold text-brand-primary">Sisa: {item.remainingQty}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between lg:justify-end space-x-3">
                        <div className="flex items-center border rounded-lg overflow-hidden bg-bg-card border-border-default h-[44px] lg:h-auto">
                          <button
                            onClick={() => handleUpdateDOQty(item.productId, item.deliveryQty - 1)}
                            className="w-10 h-full lg:w-auto lg:p-1.5 transition-colors hover:bg-bg-main text-text-muted flex items-center justify-center"
                          >
                            <Minus className="w-4 h-4 lg:w-3 lg:h-3" />
                          </button>
                          <input
                            type="number"
                            inputMode="numeric"
                            className="w-14 h-full text-sm lg:text-xs font-black text-center focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none bg-transparent text-text-primary rounded-lg h-[44px]"
                            value={item.deliveryQty}
                            onChange={(e) => handleUpdateDOQty(item.productId, parseFloat(e.target.value) || 0)}
                          />
                          <button
                            onClick={() => handleUpdateDOQty(item.productId, item.deliveryQty + 1)}
                            className="w-10 h-full lg:w-auto lg:p-1.5 transition-colors hover:bg-bg-main text-text-muted flex items-center justify-center"
                          >
                            <Plus className="w-4 h-4 lg:w-3 lg:h-3" />
                          </button>
                        </div>
                        <span className="text-xs font-bold text-text-muted w-8">{item.unitName}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 lg:p-6 border-t border-border-subtle flex flex-col lg:flex-row-reverse gap-3 bg-bg-main/50">
              <button
                onClick={submitCreateDO}
                disabled={isCreatingDO}
                className="w-full lg:w-auto lg:flex-1 min-h-[44px] py-3 bg-brand-primary text-text-inverse rounded-xl font-bold text-sm shadow-lg shadow-brand-primary/20 hover:bg-brand-hover flex items-center justify-center space-x-2"
              >
                {isCreatingDO ? (
                  <div className="w-5 h-5 border-2 border-text-inverse border-t-transparent rounded-full animate-spin mr-2"></div>
                ) : (
                  <Package className="w-4 h-4 mr-2" />
                )}
                <span>Konfirmasi DO</span>
              </button>
              <button
                onClick={() => setIsCreateDOModalOpen(false)}
                className="w-full lg:w-auto lg:flex-1 min-h-[44px] py-3 border rounded-xl font-bold text-sm transition-all bg-bg-card border-border-default text-text-secondary hover:bg-bg-main"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GPS Confirmation & Editing Modal */}
      {isGPSModalOpen && gpsTargetDO && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end lg:items-center justify-center lg:p-4">
          <div className={cn(
            "bg-bg-modal w-full rounded-t-3xl lg:rounded-[2.5rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-full lg:slide-in-from-bottom-0 lg:zoom-in lg:fade-in duration-300 ease-out flex flex-col max-h-[90vh] text-text-primary transition-all duration-300",
            isMapExpanded ? "lg:max-w-4xl" : "lg:max-w-3xl"
          )}>
            {/* Drag Handle for Mobile */}
            <div className="lg:hidden w-full flex justify-center pt-3 pb-1 bg-brand-primary">
              <div className="w-12 h-1.5 bg-white/30 rounded-full"></div>
            </div>
            <div className="p-4 lg:p-6 border-b flex items-center justify-between bg-brand-primary border-border-subtle flex-shrink-0">
              <div>
                <h3 className="text-base lg:text-lg font-black text-white">Konfirmasi Rute GPS</h3>
                <p className="text-[10px] lg:text-xs font-bold text-white/80 uppercase tracking-wider">{gpsTargetDO.doNumber}</p>
              </div>
              <button onClick={() => setIsGPSModalOpen(false)} className="text-white/60 hover:text-white min-w-[44px] min-h-[44px] flex items-center justify-center -mr-2 lg:mr-0">
                <X className="w-5 h-5 lg:w-6 lg:h-6" />
              </button>
            </div>

            <div className="p-4 lg:p-6 space-y-8 overflow-y-auto flex-1 min-h-0 custom-scrollbar">
              <div className="bg-bg-main p-4 rounded-[32px] border border-border-subtle space-y-2">
                <div className="flex justify-between items-center pb-2 border-b border-border-subtle/50">
                  <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Penerima</span>
                  <span className="text-xs font-black text-text-primary">{gpsTargetDO.customer?.name || "Umum"}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-text-muted uppercase tracking-wider">No. Invoice</span>
                  <span className="text-xs font-mono font-bold text-text-secondary">{gpsTargetDO.sale?.invoiceNumber || "-"}</span>
                </div>
              </div>

              {/* Geocoding Search Bar */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">
                  Cari Lokasi / Desa / Kecamatan
                </label>
                <form onSubmit={handleMapSearch} className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted w-4 h-4" />
                    <input
                      type="text"
                      className="w-full pl-9 pr-3 py-2 border text-xs font-bold bg-bg-main border-border-default focus:outline-none focus:ring-1 focus:ring-brand-primary text-text-primary placeholder:text-text-muted/50 rounded-lg h-[44px]"
                      placeholder="Cari jalan, desa, kecamatan, atau kota..."
                      value={mapSearchQuery}
                      onChange={(e) => setMapSearchQuery(e.target.value)}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSearchingMap}
                    className="bg-brand-primary text-text-inverse font-bold hover:bg-brand-hover transition-colors flex items-center justify-center min-w-[70px] disabled:opacity-50 rounded-full px-7 py-[14px] text-[14px] font-bold"
                  >
                    {isSearchingMap ? (
                      <div className="w-4 h-4 border-2 border-text-inverse border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      "Cari"
                    )}
                  </button>
                </form>

                {/* Search Suggestions Dropdown */}
                {mapSearchResults.length > 0 && (
                  <div className="mt-2 bg-bg-card border border-border-default rounded-[24px] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 z-50 relative max-h-[160px] overflow-y-auto custom-scrollbar">
                    <div className="p-2 border-b border-border-subtle bg-bg-main flex justify-between items-center sticky top-0 z-10">
                      <span className="text-[9px] font-black text-text-muted uppercase tracking-wider">Pilih Lokasi yang Tepat:</span>
                      <button 
                        type="button" 
                        onClick={() => setMapSearchResults([])} 
                        className="text-[9px] font-bold text-status-danger hover:underline"
                      >
                        Tutup
                      </button>
                    </div>
                    <div className="divide-y divide-border-subtle">
                      {mapSearchResults.map((res, index) => {
                        const displayName = res.display_name;
                        const parts = displayName.split(",");
                        const title = parts.slice(0, 2).join(",").trim();
                        const subtitle = parts.slice(2, 5).join(",").trim();
                        
                        return (
                          <button
                            key={index}
                            type="button"
                            onClick={() => selectMapSearchResult(res)}
                            className="w-full text-left p-2.5 hover:bg-brand-light hover:text-brand-primary transition-colors flex flex-col gap-0.5 outline-none"
                          >
                            <span className="text-[11px] font-black leading-tight">{title}</span>
                            {subtitle && (
                              <span className="text-[9px] text-text-muted font-bold truncate leading-none">{subtitle}</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Map Picker Container */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">
                    Geser Peta untuk Menyesuaikan Titik
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsMapExpanded(!isMapExpanded)}
                    className="flex items-center space-x-1 px-2 py-0.5 rounded text-[9px] font-bold text-brand-primary bg-brand-light hover:bg-brand-primary hover:text-text-inverse transition-all"
                    title={isMapExpanded ? "Perkecil Peta" : "Perbesar Peta"}
                  >
                    {isMapExpanded ? (
                      <>
                        <Minimize2 className="w-3 h-3" />
                        <span>Perkecil</span>
                      </>
                    ) : (
                      <>
                        <Maximize2 className="w-3 h-3" />
                        <span>Perbesar</span>
                      </>
                    )}
                  </button>
                </div>
                <div className={cn(
                  "relative w-full rounded-2xl overflow-hidden border border-border-default bg-bg-main shadow-inner transition-all duration-300",
                  isMapExpanded ? "h-[450px]" : "h-[240px]"
                )}>
                  {/* Leaflet Map element */}
                  <div id="map-picker" className="w-full h-full z-10"></div>

                  {/* Floating Coordinates Badge Overlay - Highly Responsive & Premium */}
                  {gpsCoordinates && (
                    <div className="absolute top-3 right-3 z-[1000] font-mono text-[9px] sm:text-[10px] font-black text-brand-primary bg-bg-card/95 backdrop-blur-sm border border-border-default px-2.5 py-1.5 rounded-[24px] flex items-center space-x-1 select-all">
                      <span>📍</span>
                      <span>{gpsCoordinates}</span>
                    </div>
                  )}
                  
                  {/* Stationary Center Pin Overlay */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[calc(100%-8px)] pointer-events-none z-[1000] flex flex-col items-center">
                    <MapPin className="w-8 h-8 text-status-danger fill-status-danger/20 drop-shadow-lg" />
                    <div className="w-2.5 h-1 bg-black/30 rounded-full blur-[1px] mt-0.5"></div>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">
                  Detail Catatan Alamat Pengiriman
                </label>
                <textarea
                  value={gpsAddress}
                  onChange={(e) => setGpsAddress(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border rounded-xl text-xs font-bold bg-bg-main border-border-default focus:outline-none focus:ring-1 focus:ring-brand-primary text-text-primary placeholder:text-text-muted/50 resize-none leading-relaxed"
                  placeholder="Masukkan nomor rumah, gang, RT/RW, atau patokan detail..."
                />
                <p className="text-[10px] text-text-muted italic leading-relaxed">
                  * Sopir dapat menambahkan catatan detail lokasi (contoh: patokan dekat masjid) agar rute di handphone lebih mudah dicari.
                </p>
              </div>
            </div>

            <div className="p-4 lg:p-6 border-t border-border-subtle bg-bg-main flex flex-col gap-6 flex-shrink-0">
              <button
                onClick={() => handleOpenGPSRoute(false)}
                disabled={isSavingGPSAddress}
                className="w-full min-h-[44px] py-3 bg-brand-primary text-text-inverse rounded-xl font-bold text-sm shadow-lg shadow-brand-primary/20 hover:bg-brand-hover transition-all flex items-center justify-center space-x-2"
              >
                {isSavingGPSAddress ? (
                  <div className="w-5 h-5 border-2 border-text-inverse border-t-transparent rounded-full animate-spin mr-2"></div>
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>Simpan Alamat & Buka GPS</span>
              </button>
              <button
                onClick={() => handleOpenGPSRoute(true)}
                className="w-full min-h-[44px] py-3 border border-border-default text-text-secondary rounded-xl font-bold text-sm hover:bg-bg-card transition-all flex items-center justify-center space-x-2"
              >
                <MapPin className="w-4 h-4" />
                <span>Buka GPS (Tanpa Simpan)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Bar for Trip Consolidation */}
      {selectedDOIds.length > 0 && activeTab === "deliveries" && (
        <div className="fixed bottom-24 lg:bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-4xl bg-bg-card/90 backdrop-blur-md border border-border-default rounded-[32px] p-8 flex items-center justify-between z-40 animate-in slide-in-from-bottom-12 duration-200">
          <div className="flex items-center space-x-3">
            <span className="w-8 h-8 rounded-lg bg-brand-primary/10 text-brand-primary flex items-center justify-center font-black text-xs">
              {selectedDOIds.length}
            </span>
            <div>
              <h4 className="text-xs font-black text-text-primary uppercase tracking-wider">Pengiriman Terpilih</h4>
              <p className="text-[10px] text-text-muted font-medium">Siap dikonsolidasikan dalam trip pengantaran.</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setSelectedDOIds([])}
              className="px-3.5 py-2 border rounded-xl text-xs font-bold transition-all bg-bg-main border-border-default text-text-secondary hover:bg-bg-card"
            >
              Batal
            </button>
            <button
              onClick={() => setIsTripModalOpen(true)}
              className="px-4 py-2 bg-brand-primary text-text-inverse rounded-xl text-xs font-bold shadow-lg shadow-brand-primary/20 hover:bg-brand-hover transition-all flex items-center space-x-1.5"
            >
              <Truck className="w-4 h-4" />
              <span>Buat Trip</span>
            </button>
          </div>
        </div>
      )}

      {/* Trip Consolidation Modal */}
      {isTripModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end lg:items-center justify-center lg:p-4">
          <div className="bg-bg-modal w-full rounded-t-3xl lg:rounded-[2.5rem] overflow-hidden animate-in slide-in-from-bottom-full lg:slide-in-from-bottom-0 lg:zoom-in lg:fade-in duration-300 ease-out flex flex-col max-h-[90vh] lg:max-w-2xl text-text-primary">
            {/* Drag Handle for Mobile */}
            <div className="lg:hidden w-full flex justify-center pt-3 pb-1 bg-brand-primary">
              <div className="w-12 h-1.5 bg-white/30 rounded-full"></div>
            </div>
            <div className="p-4 lg:p-6 border-b flex items-center justify-between bg-brand-primary border-border-subtle flex-shrink-0">
              <div>
                <h3 className="text-base lg:text-lg font-black text-white">Konsolidasi Pengiriman (Trip Dispatch)</h3>
                <p className="text-[10px] lg:text-xs font-bold text-white/80 uppercase tracking-wider">Gabungkan beberapa Pengiriman dalam satu truk</p>
              </div>
              <button onClick={() => setIsTripModalOpen(false)} className="text-white/60 hover:text-white min-w-[44px] min-h-[44px] flex items-center justify-center -mr-2 lg:mr-0">
                <X className="w-5 h-5 lg:w-6 lg:h-6" />
              </button>
            </div>

            <div className="p-4 lg:p-6 space-y-8 overflow-y-auto flex-1 min-h-0 custom-scrollbar">
              {/* Driver & Vehicle Inputs */}
              <div className="bg-bg-main p-4 rounded-[32px] border border-border-subtle space-y-8">
                <h4 className="text-xs font-black text-text-muted uppercase tracking-widest">Informasi Sopir & Kendaraan (Wajib)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1 relative">
                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Nama Sopir <span className="text-status-danger font-black">*</span></label>
                    <input
                      type="text"
                      className="w-full p-3 border text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary transition-colors bg-bg-card border-border-default text-text-primary placeholder:text-text-muted rounded-lg h-[44px]"
                      placeholder="Masukkan nama sopir..."
                      value={tripDriverName}
                      onChange={(e) => setTripDriverName(e.target.value)}
                      onFocus={() => setShowTripDriverSuggestions(true)}
                      onBlur={() => setShowTripDriverSuggestions(false)}
                    />
                    {showTripDriverSuggestions && filteredTripDriverSuggestions.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 max-h-48 overflow-y-auto rounded-[24px] border border-border-subtle bg-bg-card py-1 divide-y divide-border-subtle/50 text-xs custom-scrollbar">
                        {filteredTripDriverSuggestions.map((driver) => (
                          <div key={driver} className="w-full text-left px-4 py-2 hover:bg-bg-main active:bg-bg-main font-bold transition-colors flex items-center justify-between group">
                            <button
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                setTripDriverName(driver);
                                setShowTripDriverSuggestions(false);
                              }}
                              className="flex-1 text-left flex items-center justify-between h-full group-hover:text-brand-primary"
                            >
                              <span>{driver}</span>
                            </button>
                            <button 
                              type="button" 
                              onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                hideHistoryItem(driver);
                              }}
                              className="p-1.5 text-text-muted hover:text-status-danger hover:bg-status-danger/10 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                              title="Hapus dari riwayat"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="space-y-1 relative">
                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">No. Polisi Kendaraan <span className="text-status-danger font-black">*</span></label>
                    <input
                      type="text"
                      className="w-full p-3 border text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary transition-colors bg-bg-card border-border-default text-text-primary placeholder:text-text-muted rounded-lg h-[44px]"
                      placeholder="Contoh: B 1234 CD"
                      value={tripVehiclePlate}
                      onChange={(e) => setTripVehiclePlate(e.target.value)}
                      onFocus={() => setShowTripPlateSuggestions(true)}
                      onBlur={() => setShowTripPlateSuggestions(false)}
                    />
                    {showTripPlateSuggestions && filteredTripPlateSuggestions.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 max-h-48 overflow-y-auto rounded-[24px] border border-border-subtle bg-bg-card py-1 divide-y divide-border-subtle/50 text-xs custom-scrollbar">
                        {filteredTripPlateSuggestions.map((plate) => (
                          <div key={plate} className="w-full text-left px-4 py-2 hover:bg-bg-main active:bg-bg-main font-bold transition-colors flex items-center justify-between group">
                            <button
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                setTripVehiclePlate(plate);
                                setShowTripPlateSuggestions(false);
                              }}
                              className="flex-1 text-left flex items-center justify-between h-full group-hover:text-brand-primary"
                            >
                              <span>{plate}</span>
                            </button>
                            <button 
                              type="button" 
                              onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                hideHistoryItem(plate);
                              }}
                              className="p-1.5 text-text-muted hover:text-status-danger hover:bg-status-danger/10 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                              title="Hapus dari riwayat"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Delivery Order Sequence */}
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-text-muted uppercase tracking-widest">Urutan Pengiriman (Rute Drop-Off)</h4>
                  <span className="text-[10px] text-text-muted font-bold">Gunakan tombol panah untuk mengatur urutan</span>
                </div>

                <div className="space-y-2">
                  {tripDOs.map((doItem, index) => (
                    <div key={doItem.id} className="p-3.5 bg-bg-main border border-border-subtle rounded-[24px] flex items-center justify-between gap-6 hover:border-brand-primary/30 transition-all">
                      <div className="flex items-center space-x-3 min-w-0">
                        <span className="w-6 h-6 rounded-full bg-brand-light text-brand-primary text-xs font-black flex items-center justify-center flex-shrink-0">
                          {index + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-black text-text-primary truncate">
                            {doItem.customer?.name || "Umum"}
                          </p>
                          <div className="flex items-center space-x-2 mt-0.5">
                            <span className="font-mono text-[9px] font-bold text-brand-primary bg-brand-light px-1 py-0.5 rounded">
                              {doItem.doNumber}
                            </span>
                            <span className="text-[9px] text-text-muted truncate max-w-[200px]">
                              {parseAddressAndCoordinates(doItem.address).address}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1 flex-shrink-0">
                        <button
                          onClick={() => moveDO(index, "up")}
                          disabled={index === 0}
                          className="w-8 h-8 flex items-center justify-center rounded-lg border border-border-default text-text-muted hover:text-brand-primary disabled:opacity-30 disabled:pointer-events-none hover:bg-bg-card transition-all"
                          title="Geser ke Atas"
                        >
                          <ChevronDown className="w-4 h-4 rotate-180" />
                        </button>
                        <button
                          onClick={() => moveDO(index, "down")}
                          disabled={index === tripDOs.length - 1}
                          className="w-8 h-8 flex items-center justify-center rounded-lg border border-border-default text-text-muted hover:text-brand-primary disabled:opacity-30 disabled:pointer-events-none hover:bg-bg-card transition-all"
                          title="Geser ke Bawah"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Combined Manifest (Ringkasan Muatan) */}
              <div className="bg-bg-main p-4 rounded-[32px] border border-border-subtle space-y-8">
                <h4 className="text-xs font-black text-text-muted uppercase tracking-widest">Ringkasan Muatan Gabungan</h4>
                <div className="max-h-40 overflow-y-auto custom-scrollbar border rounded-[24px] divide-y divide-border-subtle bg-bg-card border-border-default">
                  {combinedItems.length === 0 ? (
                    <p className="p-3 text-xs text-text-muted italic text-center">Tidak ada muatan</p>
                  ) : (
                    combinedItems.map((item: any, idx) => (
                      <div key={idx} className="p-3 flex items-center justify-between text-xs font-medium">
                        <span className="font-bold text-text-primary">{item.name}</span>
                        <span className="font-black text-brand-primary bg-brand-light px-2 py-0.5 rounded">
                          {item.quantity} {item.unitName}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Multi-Drop Route Navigation Link */}
              <div className="bg-bg-main p-4 rounded-[32px] border border-border-subtle space-y-8">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-text-muted uppercase tracking-widest flex items-center space-x-1">
                    <MapPin className="w-3.5 h-3.5 text-brand-primary" />
                    <span>Rute Google Maps Multi-Drop</span>
                  </h4>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={mapsLink}
                    className="flex-1 p-2.5 border text-xs bg-bg-card border-border-default text-text-muted select-all font-mono rounded-lg h-[44px]"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(mapsLink);
                      toast.success("Rute disalin ke clipboard!");
                    }}
                    className="px-3.5 py-2.5 bg-bg-card border border-border-default hover:bg-bg-main rounded-xl text-xs font-bold transition-all text-text-secondary"
                  >
                    Salin
                  </button>
                  <a
                    href={mapsLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-2.5 bg-brand-primary hover:bg-brand-hover text-text-inverse rounded-xl text-xs font-bold transition-all flex items-center justify-center font-bold"
                  >
                    Buka
                  </a>
                </div>
              </div>
            </div>

            <div className="p-4 lg:p-6 border-t border-border-subtle bg-bg-main flex flex-col md:flex-row gap-6 flex-shrink-0">

              <button
                onClick={handleDispatchTrip}
                className="w-full md:flex-2 min-h-[44px] bg-brand-primary text-text-inverse font-bold shadow-lg shadow-brand-primary/20 hover:bg-brand-hover transition-all flex items-center justify-center space-x-1.5 rounded-full px-7 py-[14px] text-[14px] font-bold active:scale-95 transition-transform"
              >
                <Truck className="w-4 h-4" />
                <span>Berangkatkan Trip ({tripDOs.length} DO)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Printable Trip Manifest (Hidden from UI, visible during print) */}
      <div className="hidden">
        <div ref={manifestPrintRef} className="p-8 font-sans text-slate-800 bg-white min-h-screen">
          <div className="border-b-2 border-slate-800 pb-4 mb-6">
            <div className="flex items-center gap-6 mb-2">
              <img src={shopSettings.shopLogo || "/logo.png"} style={{ width: "50px", height: "auto" }} alt="Logo" />
              <h1 className="text-xl font-black uppercase tracking-tight leading-tight">{shopSettings.shopName}</h1>
            </div>
            <p className="text-[10px] text-slate-500">
              {shopSettings.shopAddress} • {shopSettings.shopEmail} • {shopSettings.shopPhone}
            </p>
          </div>

          <div className="text-center mb-6">
            <h2 className="text-lg font-black uppercase tracking-wider border-y py-2 border-slate-200">Manifest Pengiriman (Trip Loading List)</h2>
            <div className="grid grid-cols-3 gap-6 text-left text-xs mt-4 bg-slate-50 p-4 rounded-[24px] border border-slate-100">
              <div>
                <p className="text-slate-400 font-bold uppercase text-[9px]">Sopir / Pengantar</p>
                <p className="font-black text-sm text-slate-800">{tripDriverName || "-"}</p>
              </div>
              <div>
                <p className="text-slate-400 font-bold uppercase text-[9px]">No. Polisi Kendaraan</p>
                <p className="font-black text-sm text-slate-800 font-mono">{tripVehiclePlate || "-"}</p>
              </div>
              <div>
                <p className="text-slate-400 font-bold uppercase text-[9px]">Tanggal Trip</p>
                <p className="font-black text-sm text-slate-800">{new Date().toLocaleDateString("id-ID", { day: '2-digit', month: 'long', year: 'numeric' })}</p>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2 border-b pb-1">Daftar Urutan Rute Drop-off</h3>
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-800 bg-slate-50">
                  <th className="p-2 font-bold w-12 text-center">Urutan</th>
                  <th className="p-2 font-bold w-36">No. Pengiriman</th>
                  <th className="p-2 font-bold w-44">Nama Pelanggan</th>
                  <th className="p-2 font-bold">Alamat Pengiriman</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tripDOs.map((doItem, idx) => (
                  <tr key={doItem.id} className="hover:bg-slate-50">
                    <td className="p-2.5 text-center font-black">{idx + 1}</td>
                    <td className="p-2.5 font-mono font-bold text-slate-600">{doItem.doNumber}</td>
                    <td className="p-2.5 font-black">{doItem.customer?.name || "Umum"}</td>
                    <td className="p-2.5 font-medium text-slate-600">{parseAddressAndCoordinates(doItem.address).address}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mb-8">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2 border-b pb-1">Ringkasan Total Barang Bawaan</h3>
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-800 bg-slate-50">
                  <th className="p-2 font-bold w-12 text-center">No</th>
                  <th className="p-2 font-bold">Deskripsi Barang</th>
                  <th className="p-2 font-bold w-32 text-center">Total Jumlah</th>
                  <th className="p-2 font-bold w-24 text-center">Satuan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {combinedItems.map((item: any, idx) => (
                  <tr key={idx}>
                    <td className="p-2.5 text-center font-bold">{idx + 1}</td>
                    <td className="p-2.5 font-black">{item.name}</td>
                    <td className="p-2.5 text-center font-black text-slate-800">{item.quantity}</td>
                    <td className="p-2.5 text-center font-medium text-slate-500">{item.unitName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-2 gap-8 text-center mt-16">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-12">Sopir / Pengirim,</p>
              <div className="border-b border-slate-400 w-40 mx-auto"></div>
              <p className="text-[10px] font-bold mt-2 text-slate-600">( {tripDriverName || "...................."} )</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-12">Diberangkatkan Oleh,</p>
              <div className="border-b border-slate-400 w-40 mx-auto"></div>
              <p className="text-[10px] font-black mt-2 text-slate-800 underline">{user?.fullName || shopSettings.defaultSignee || "Umar Sajjaad"}</p>
            </div>
          </div>

          <div className="mt-16 pt-4 border-t border-slate-100 text-center">
            <p className="text-[8px] text-slate-400 font-bold uppercase tracking-[0.2em]">Dokumen ini sah dicetak secara sistem oleh {shopSettings.shopName} POS</p>
          </div>
        </div>
      </div>
    </div>
      {/* Detail Delivery Modal */}
      {isDeliveryDetailModalOpen && selectedDeliveryDetail && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[90] flex items-end lg:items-center justify-center lg:p-4 animate-in fade-in duration-200">
          <div className="bg-bg-modal w-full rounded-t-3xl lg:rounded-[2.5rem] overflow-hidden animate-in slide-in-from-bottom-full lg:slide-in-from-bottom-0 lg:zoom-in lg:fade-in duration-300 ease-out flex flex-col max-h-[90vh] lg:max-w-2xl shadow-2xl">
            <div className="lg:hidden w-full flex justify-center pt-3 pb-1 bg-brand-primary">
              <div className="w-12 h-1.5 bg-white/30 rounded-full"></div>
            </div>
            <div className="p-4 lg:p-6 border-b flex items-center justify-between bg-brand-primary border-border-subtle flex-shrink-0">
              <div>
                <h3 className="text-base lg:text-lg font-black text-text-inverse">Detail Pengiriman</h3>
                <p className="text-[10px] lg:text-xs font-medium text-text-inverse/80 mt-0.5">{selectedDeliveryDetail.doNumber}</p>
              </div>
              <button onClick={() => { setIsDeliveryDetailModalOpen(false); setSelectedDeliveryDetail(null); }} className="text-text-inverse/60 hover:text-text-inverse p-2 -mr-2 lg:mr-0 min-w-[44px] min-h-[44px] flex items-center justify-center">
                <X className="w-5 h-5 lg:w-6 h-6" />
              </button>
            </div>
            <div className="p-4 lg:p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
              <div>
                <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">Informasi Pengiriman</h4>
                <div className="bg-bg-main p-4 rounded-xl border border-border-subtle space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-text-muted font-bold">Status</span>
                    <span className={cn(
                      "px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider",
                      STATUS_CONFIG[selectedDeliveryDetail.status as keyof typeof STATUS_CONFIG]?.color
                    )}>
                      {STATUS_CONFIG[selectedDeliveryDetail.status as keyof typeof STATUS_CONFIG]?.label || selectedDeliveryDetail.status}
                    </span>
                  </div>
                  <div className="flex flex-col space-y-1 pt-2 border-t border-border-subtle">
                    <span className="text-xs text-text-muted font-bold">Pelanggan</span>
                    <span className="text-sm font-black text-text-primary">{selectedDeliveryDetail.customer?.name || "Umum"}</span>
                  </div>
                  <div className="flex flex-col space-y-1 pt-2 border-t border-border-subtle">
                    <span className="text-xs text-text-muted font-bold">Alamat Pengiriman</span>
                    <span className="text-xs font-medium text-text-secondary leading-relaxed">{parseAddressAndCoordinates(selectedDeliveryDetail.address).address}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border-subtle">
                    <div className="flex flex-col space-y-1">
                      <span className="text-xs text-text-muted font-bold">Supir</span>
                      <span className="text-xs font-black text-text-primary">{selectedDeliveryDetail.driverName || "-"}</span>
                    </div>
                    <div className="flex flex-col space-y-1">
                      <span className="text-xs text-text-muted font-bold">Plat Kendaraan</span>
                      <span className="text-xs font-black text-text-primary uppercase">{selectedDeliveryDetail.vehiclePlate || "-"}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">Daftar Barang</h4>
                <div className="flex flex-col space-y-3">
                  {selectedDeliveryDetail.items?.map((item: any, idx: number) => (
                    <div key={idx} className="bg-bg-main p-3.5 rounded-xl border border-border-subtle flex flex-col space-y-2">
                      <div className="flex justify-between items-start gap-4">
                        <p className="font-bold text-text-primary text-sm flex-1">{item.product?.name || "Barang"}</p>
                        <p className="font-black text-brand-primary text-sm whitespace-nowrap">{item.quantity} {item.unitName}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </phantom-ui>
  );
}
