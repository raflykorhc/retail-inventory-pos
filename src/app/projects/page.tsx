import React, { useState, useEffect, useMemo, useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { PrintableProjectReport } from "../../components/printing/PrintableProjectReport";
import { SummaryCard } from '@/components/SummaryCard';
import { toast } from "sonner";
import { 
  Plus, 
  Search, 
  Briefcase, 
  Calendar, 
  User, 
  MapPin, 
  AlertCircle,
  ChevronRight,
  ArrowLeft,
  CheckCircle2,
  Clock,
  MoreVertical,
  Package,
  X,
  Filter,
  ArrowUpDown,
  Edit,
  Trash2
} from "lucide-react";
import { cn } from "../../lib/utils";
import axiosClient from "../../lib/axiosClient";
import { EmptyState } from "../../components/ui/EmptyState";
import { Can } from "../../components/auth/Can";

interface Project {
  id: string;
  customerId: string;
  projectName: string;
  location: string | null;
  status: string;
  budget: number;
  specialDiscount: number;
  customer: {
    name: string;
  };
  sales: any[];
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [sortBy, setSortBy] = useState("NEWEST");
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);
  
  // Action Modals State
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  // Create/Edit Project Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [projectName, setProjectName] = useState("");
  const [location, setLocation] = useState("");
  const [budget, setBudget] = useState("");
  const [specialDiscount, setSpecialDiscount] = useState("");
  
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedReportProject, setSelectedReportProject] = useState<any>(null);
  const [reportData, setReportData] = useState<any>(null);
  const [isReportLoading, setIsReportLoading] = useState(false);

  const reportPrintRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: reportPrintRef,
    documentTitle: `Laporan Proyek - ${selectedReportProject?.projectName || 'Report'}`,
  });

  useEffect(() => {
    fetchProjects();
    fetchCustomers();
  }, []);

  const fetchProjects = async () => {
    setIsLoading(true);
    try {
      const response = await axiosClient.get("/projects");
      const data = response.data;
      if (Array.isArray(data)) {
        setProjects(data);
      } else {
        setProjects([]);
      }
    } catch (error) {
      console.error("Failed to fetch projects:", error);
      toast.error("Gagal Memuat Proyek", { description: "Terjadi kesalahan saat mengambil data proyek." });
      setProjects([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await axiosClient.get("/customers");
      const data = response.data;
      if (Array.isArray(data)) {
        setCustomers(data);
      }
    } catch (error) {
      console.error("Failed to fetch customers:", error);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    const promise = axiosClient.post("/projects", {
      customerId: selectedCustomerId,
      projectName,
      location,
      status: "ACTIVE",
      budget: Number(budget) || 0,
      specialDiscount: Number(specialDiscount) || 0
    });

    toast.promise(promise, {
      loading: 'Membuat proyek baru...',
      success: () => {
        setIsCreateModalOpen(false);
        resetForm();
        fetchProjects();
        return 'Proyek berhasil dibuat!';
      },
      error: 'Gagal membuat proyek.',
    });
  };

  const handleEditProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;
    const promise = axiosClient.put(`/projects/${selectedProject.id}`, {
      projectName,
      location,
      status: selectedProject.status,
      budget: Number(budget) || 0,
      specialDiscount: Number(specialDiscount) || 0
    });

    toast.promise(promise, {
      loading: 'Memperbarui proyek...',
      success: () => {
        setIsEditModalOpen(false);
        setSelectedProject(null);
        resetForm();
        fetchProjects();
        return 'Perubahan berhasil disimpan!';
      },
      error: 'Gagal memperbarui proyek.',
    });
  };

  const handleUpdateStatus = async (status: string) => {
    if (!selectedProject) return;
    const promise = axiosClient.put(`/projects/${selectedProject.id}`, {
      projectName: selectedProject.projectName,
      location: selectedProject.location,
      status: status,
      budget: selectedProject.budget,
      specialDiscount: selectedProject.specialDiscount
    });

    toast.promise(promise, {
      loading: 'Memperbarui status...',
      success: () => {
        setIsStatusModalOpen(false);
        setSelectedProject(null);
        fetchProjects();
        return 'Status proyek berhasil diperbarui!';
      },
      error: 'Gagal memperbarui status.',
    });
  };

  const handleDeleteProject = async () => {
    if (!selectedProject) return;
    const promise = axiosClient.delete(`/projects/${selectedProject.id}`);

    toast.promise(promise, {
      loading: 'Menghapus proyek...',
      success: () => {
        setIsDeleteModalOpen(false);
        setSelectedProject(null);
        fetchProjects();
        return 'Proyek berhasil dihapus.';
      },
      error: 'Gagal menghapus proyek.',
    });
  };

  const resetForm = () => {
    setSelectedCustomerId("");
    setProjectName("");
    setLocation("");
    setBudget("");
    setSpecialDiscount("");
  };

  const fetchProjectReport = async (projectId: string) => {
    setIsReportLoading(true);
    try {
      const response = await axiosClient.get(`/projects/${projectId}/report`);
      setReportData(response.data);
    } catch (error) {
      console.error("Failed to fetch report:", error);
    } finally {
      setIsReportLoading(false);
    }
  };

  const filteredProjects = useMemo(() => {
    return projects
      .filter(p => 
        (p.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
         p.customer.name.toLowerCase().includes(searchQuery.toLowerCase())) &&
        (filterStatus === "ALL" || p.status === filterStatus)
      )
      .sort((a, b) => {
        if (sortBy === "BUDGET_DESC") return Number(b.budget) - Number(a.budget);
        if (sortBy === "USAGE_DESC") {
          const usageA = a.sales.reduce((sum, s) => sum + Number(s.totalAmount), 0);
          const usageB = b.sales.reduce((sum, s) => sum + Number(s.totalAmount), 0);
          return usageB - usageA;
        }
        return 0;
      });
  }, [projects, searchQuery, filterStatus, sortBy]);

  const totalItems = filteredProjects.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  
  const paginatedProjects = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredProjects.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredProjects, currentPage, itemsPerPage]);

  const placeholderProjects = useMemo<Project[]>(() => [
    {
      id: "1",
      customerId: "c1",
      projectName: "Proyek Pembangunan Ruko Jaya",
      location: "Jl. Sudirman No. 12, Kel. Kebayoran Baru, Jakarta Selatan",
      status: "ACTIVE",
      budget: 500000000,
      specialDiscount: 0,
      customer: { name: "Budi Santoso" },
      sales: [{ totalAmount: 150000000 }]
    },
    {
      id: "2",
      customerId: "c2",
      projectName: "Renovasi Rumah Cluster Asri",
      location: "Green Residence Blok A5, Kel. Serpong, Tangerang Selatan",
      status: "ON_HOLD",
      budget: 120000000,
      specialDiscount: 5,
      customer: { name: "Siti Rahma" },
      sales: [{ totalAmount: 60000000 }]
    },
    {
      id: "3",
      customerId: "c3",
      projectName: "Pembangunan Gudang Logistik Baru",
      location: "Kawasan Industri MM2100 Blok C-3, Cikarang, Bekasi",
      status: "COMPLETED",
      budget: 850000000,
      specialDiscount: 10,
      customer: { name: "PT Sukses Bersama" },
      sales: [{ totalAmount: 850000000 }]
    },
    {
      id: "4",
      customerId: "c4",
      projectName: "Pemasangan Pagar & Kanopi Baja Ringan",
      location: "Perumahan Indah Permai Blok B2 No. 14, Depok",
      status: "ACTIVE",
      budget: 35000000,
      specialDiscount: 0,
      customer: { name: "Achmad Fauzi" },
      sales: [{ totalAmount: 20000000 }]
    },
    {
      id: "5",
      customerId: "c5",
      projectName: "Pekerjaan Finishing Interior Toko Baju",
      location: "Mall Grand Indonesia Lt. 2, Jakarta Pusat",
      status: "ACTIVE",
      budget: 150000000,
      specialDiscount: 0,
      customer: { name: "Dewi Lestari" },
      sales: [{ totalAmount: 120000000 }]
    },
    {
      id: "6",
      customerId: "c6",
      projectName: "Pembangunan Fasilitas Taman Bermain",
      location: "Perum Vila Dago, Pamulang, Tangerang Selatan",
      status: "ACTIVE",
      budget: 80000000,
      specialDiscount: 2,
      customer: { name: "Yusuf Mansur" },
      sales: [{ totalAmount: 40000000 }]
    }
  ], []);

  const activeProjects = isLoading ? placeholderProjects : paginatedProjects;

  // Reset to first page when search/filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterStatus]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE": return "text-status-success bg-status-success/10 border-status-success/20";
      case "COMPLETED": return "text-brand-primary bg-brand-light border-brand-primary/20";
      case "ON_HOLD": return "text-status-warning bg-status-warning/10 border-status-warning/20";
      default: return "text-text-muted bg-bg-main border-border-default";
    }
  };

  const openEditModal = (project: Project) => {
    setSelectedProject(project);
    setSelectedCustomerId(project.customerId);
    setProjectName(project.projectName);
    setLocation(project.location || "");
    setBudget(project.budget.toString());
    setSpecialDiscount(project.specialDiscount.toString());
    setIsEditModalOpen(true);
    setActiveDropdown(null);
  };

  return (
    <phantom-ui loading={isLoading} reveal={0.3}>
      <div className="flex-1 flex flex-col bg-bg-main h-full overflow-y-auto custom-scrollbar transition-colors duration-300 relative pb-24 lg:pb-0">
        {/* Stats Summary */}
        <div className="px-4 lg:px-8 pt-4 lg:pt-8 grid grid-cols-3 gap-2 sm:gap-6 lg:gap-6 flex-shrink-0 transition-all duration-300">
          <SummaryCard 
            title="Total Proyek" 
            value={projects.length} 
            icon={<Briefcase className="w-5 h-5 lg:w-6 lg:h-6" />}
            color="blue"
            isLoading={isLoading}
          />
          <SummaryCard 
            title="Proyek Aktif" 
            value={projects.filter(p => p.status === "ACTIVE").length} 
            icon={<CheckCircle2 className="w-5 h-5 lg:w-6 lg:h-6" />}
            color="green"
            isLoading={isLoading}
          />
          <SummaryCard 
            title="Proyek Selesai" 
            value={projects.filter(p => p.status === "COMPLETED").length} 
            icon={<Clock className="w-5 h-5 lg:w-6 lg:h-6" />}
            color="blue"
            isLoading={isLoading}
          />
        </div>

      {/* Main Content Area */}
      <div className="px-4 lg:px-8 py-6 lg:py-8 flex-1 flex flex-col">
        <div className="rounded-[32px] lg:rounded-[2.5rem] border flex flex-col bg-bg-card border-border-default transition-all duration-300 transform-gpu overflow-visible">
        {/* Search and Filters */}
        <div className="sticky top-0 z-30 bg-bg-card p-8 lg:p-8 border-b border-border-subtle rounded-t-2xl lg:rounded-t-[2.5rem]">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 lg:gap-0 flex-shrink-0">
          <div className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-6 flex-1 w-full lg:w-auto">
            <div className="flex items-center gap-2 w-full lg:max-w-md">
              <div className="relative flex-1 flex items-center">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted w-5 h-5" />
                <input
                  type="text"
                  placeholder="Cari nama proyek atau pelanggan..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-2.5 lg:py-3 border shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-all text-sm bg-bg-main border-border-default text-text-primary placeholder:text-text-muted rounded-full h-[44px]"
                />
              </div>
              <button 
                onClick={() => setIsCreateModalOpen(true)}
                className="lg:hidden p-2 border rounded-xl transition-colors bg-bg-card border-border-default text-brand-primary hover:bg-bg-main flex items-center justify-center flex-shrink-0 min-w-[44px] min-h-[44px]"
                title="Tambah Proyek"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
            <div className="flex items-center space-x-2 lg:space-x-2 flex-shrink-0 w-full lg:w-auto overflow-x-auto custom-scrollbar pb-1 lg:pb-0">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border rounded-xl text-sm font-bold bg-bg-main border-border-default text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary transition-all cursor-pointer h-[40px] [&>option]:bg-bg-main [&>option]:text-text-primary w-full lg:w-auto shrink-0"
              >
                <option value="ALL">Semua Status</option>
                <option value="ACTIVE">Aktif</option>
                <option value="COMPLETED">Selesai</option>
                <option value="ON_HOLD">Ditunda</option>
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 border rounded-xl text-sm font-bold bg-bg-main border-border-default text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary transition-all cursor-pointer h-[40px] [&>option]:bg-bg-main [&>option]:text-text-primary w-full lg:w-auto shrink-0"
              >
                <option value="NEWEST">Terbaru</option>
                <option value="BUDGET_DESC">Anggaran Terbesar</option>
                <option value="USAGE_DESC">Pemakaian Tertinggi</option>
              </select>
            </div>
          </div>
        <div className="hidden lg:flex items-center space-x-2">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center space-x-2 px-5 h-11 bg-brand-primary text-text-inverse rounded-xl font-bold text-sm shadow-lg shadow-brand-primary/20 hover:bg-brand-hover transition-all active:scale-95 shrink-0"
          >
            <Plus className="w-5 h-5" />
            <span>Tambah Proyek</span>
          </button>
        </div>
      </div>
    </div>

    <div className="p-4 lg:p-8 flex-1">

      {(isLoading || filteredProjects.length > 0) ? (
        <div className="flex flex-col flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-6">
            {activeProjects.map((project) => (
              <div key={project.id} className="bg-bg-main rounded-[32px] lg:rounded-[32px] border border-border-subtle hover: hover:-translate-y-1 transition-all duration-300 overflow-hidden group w-full">
                <div className="p-4 lg:p-6 space-y-8">
                  <div className="flex justify-between items-start">
                    <div className={cn(
                      "px-3 py-1 lg:px-3 lg:py-1 rounded-full text-[10px] font-black uppercase tracking-wider border",
                      getStatusColor(project.status)
                    )}>
                      {project.status === "ACTIVE" ? "Aktif" : 
                       project.status === "COMPLETED" ? "Selesai" : 
                       project.status === "ON_HOLD" ? "Ditunda" : project.status}
                    </div>
                    <div className="relative">
                      <button 
                        onClick={() => setActiveDropdown(activeDropdown === project.id ? null : project.id)}
                        className="text-text-muted hover:text-text-primary transition-colors p-2 lg:p-1 rounded-lg hover:bg-bg-main outline-none focus:outline-none focus:ring-0 min-w-[44px] min-h-[44px] lg:min-w-0 lg:min-h-0 flex items-center justify-center"
                      >
                        <MoreVertical className="w-5 h-5" />
                      </button>
                      {activeDropdown === project.id && (
                        <div className="absolute right-0 mt-1 w-48 bg-bg-modal border border-border-subtle rounded-[24px] z-10 overflow-hidden animate-in fade-in zoom-in duration-200">
                          <button 
                            onClick={() => openEditModal(project)}
                            className="w-full text-left px-4 py-3 text-sm font-bold text-text-primary hover:bg-bg-main flex items-center gap-2 transition-colors"
                          >
                            <Edit className="w-4 h-4 text-brand-primary" /> Edit Proyek
                          </button>
                          <button 
                            onClick={() => { setSelectedProject(project); setIsStatusModalOpen(true); setActiveDropdown(null); }}
                            className="w-full text-left px-4 py-3 text-sm font-bold text-text-primary hover:bg-bg-main flex items-center gap-2 transition-colors"
                          >
                            <CheckCircle2 className="w-4 h-4 text-status-success" /> Ubah Status
                          </button>
                          <Can role={["ADMIN", "MANAGER"]}>
                            <button 
                              onClick={() => { setSelectedProject(project); setIsDeleteModalOpen(true); setActiveDropdown(null); }}
                              className="w-full text-left px-4 py-3 text-sm font-bold text-status-danger hover:bg-status-danger/10 flex items-center gap-2 transition-colors border-t border-border-subtle"
                            >
                              <Trash2 className="w-4 h-4" /> Hapus Proyek
                            </button>
                          </Can>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-base lg:text-lg font-black text-text-primary mb-1.5 group-hover:text-brand-primary transition-colors leading-tight">{project.projectName}</h3>
                    <div className="flex items-center gap-2 text-xs font-bold text-text-muted">
                      <User className="w-4 h-4 text-brand-primary" />
                      <span>{project.customer.name}</span>
                    </div>
                  </div>

                  <div className="space-y-8">
                    <div className="flex items-start gap-2 text-xs font-medium text-text-secondary">
                      <MapPin className="w-4 h-4 text-text-muted mt-0.5 flex-shrink-0" />
                      <span className="line-clamp-2">{project.location || "Lokasi tidak ditentukan"}</span>
                    </div>
                    
                    {/* Budget Progress */}
                    {Number(project.budget) > 0 ? (
                      <div className="space-y-2">
                        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-1 text-[10px] font-black uppercase tracking-wider">
                          <span className="text-text-muted">Anggaran: Rp {Number(project.budget).toLocaleString()}</span>
                          <span className={cn(
                            "self-end lg:self-auto",
                            (project.sales.reduce((sum, s) => sum + Number(s.totalAmount), 0) / Number(project.budget)) > 1 ? "text-status-danger" : "text-brand-primary"
                          )}>
                            {Math.round((project.sales.reduce((sum, s) => sum + Number(s.totalAmount), 0) / Number(project.budget)) * 100)}%
                          </span>
                        </div>
                        <div className="w-full h-2 bg-bg-card rounded-full overflow-hidden border border-border-subtle">
                          <div 
                            className={cn(
                              "h-full transition-all duration-1000 ease-out",
                              (project.sales.reduce((sum, s) => sum + Number(s.totalAmount), 0) / Number(project.budget)) > 1 ? "bg-status-danger" : "bg-brand-primary"
                            )}
                            style={{ width: `${Math.min(100, (project.sales.reduce((sum, s) => sum + Number(s.totalAmount), 0) / Number(project.budget)) * 100)}%` }}
                          />
                        </div>
                        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-1 text-[10px] font-black uppercase tracking-wider mt-1">
                          <span className="text-text-muted">
                            Sisa: Rp {Math.max(0, Number(project.budget) - project.sales.reduce((sum, s) => sum + Number(s.totalAmount), 0)).toLocaleString()}
                          </span>
                          {project.sales.reduce((sum, s) => sum + Number(s.totalAmount), 0) > Number(project.budget) && (
                            <span className="text-status-danger bg-status-danger/10 px-2 py-0.5 rounded border border-status-danger/20 w-fit">
                              OVERBUDGET
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex justify-between text-[10px] font-black uppercase tracking-wider">
                          <span className="text-text-muted">Anggaran: Tidak Ditetapkan</span>
                        </div>
                      </div>
                    )}

                    {project.specialDiscount > 0 && (
                      <div className="flex items-center gap-2 text-[10px] font-black text-status-success bg-status-success/10 px-3 py-1.5 rounded-[24px] w-fit uppercase tracking-wider border border-status-success/20">
                        Diskon Khusus: {project.specialDiscount}%
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-border-subtle flex flex-col lg:flex-row lg:items-center justify-between gap-6 lg:gap-0">
                    <div className="text-xs flex flex-col lg:block">
                      <span className="text-text-muted font-bold uppercase tracking-wider">Total Pakai: </span>
                      <span className="font-black text-text-primary lg:ml-1 text-sm lg:text-xs">
                        Rp {project.sales.reduce((sum, s) => sum + Number(s.totalAmount), 0).toLocaleString()}
                      </span>
                    </div>
                    <button 
                      onClick={() => {
                        setSelectedReportProject(project);
                        fetchProjectReport(project.id);
                      }}
                      className="bg-brand-light text-brand-primary hover:bg-brand-primary hover:text-text-inverse px-4 py-3 lg:py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1 uppercase tracking-wider outline-none border-none focus:outline-none focus:ring-0 min-h-[44px] lg:min-h-0 w-full lg:w-auto"
                    >
                      Detail <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Controls */}
          {!isLoading && totalItems > itemsPerPage && (
            <div className="mt-10 pt-8 border-t border-border-subtle flex flex-col sm:flex-row items-center justify-between gap-6">
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
                  className="px-4 py-2 border rounded-xl text-sm font-bold bg-bg-main border-border-default text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary transition-all cursor-pointer h-[40px] [&>option]:bg-bg-main [&>option]:text-text-primary"
                >
                  <option value={12}>12 per hal</option>
                  <option value={24}>24 per hal</option>
                  <option value={50}>50 per hal</option>
                </select>
              </div>
              
              <div className="flex items-center space-x-1.5">
                <button 
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 border rounded-xl text-[10px] font-bold transition-all bg-bg-main border-border-default text-text-primary disabled:opacity-30 hover:bg-bg-card"
                >
                  Sebelumnya
                </button>
                <div className="flex px-1 space-x-1.5">
                  {Array.from({ length: Math.min(3, totalPages) }, (_, i) => {
                    let pNum = i + 1;
                    if (totalPages > 3 && currentPage > 2) pNum = Math.min(currentPage - 1 + i, totalPages - 2 + i);
                    return (
                      <button
                        key={pNum}
                        onClick={() => setCurrentPage(pNum)}
                        className={cn(
                          "w-9 h-9 rounded-xl text-[10px] font-bold transition-all flex items-center justify-center",
                          currentPage === pNum 
                            ? "bg-brand-primary text-text-inverse shadow-lg shadow-brand-primary/20" 
                            : "bg-bg-main text-text-secondary border border-border-default hover:bg-bg-card"
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
                  className="px-4 py-2 border rounded-xl text-[10px] font-bold transition-all bg-bg-main border-border-default text-text-primary disabled:opacity-30 hover:bg-bg-card"
                >
                  Selanjutnya
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="py-4 flex-1">
          <EmptyState
            icon={Briefcase}
            title="Tidak Ada Proyek"
            description="Belum ada data proyek yang tercatat. Silakan tambah proyek baru untuk mulai mengelola anggaran dan pemakaian."
            action={{
              label: "Tambah Proyek Baru",
              onClick: () => setIsCreateModalOpen(true),
              icon: Plus
            }}
          />
        </div>
      )}
      </div>
      </div>
      </div>
      <button
        onClick={() => setIsCreateModalOpen(true)}
        className="lg:hidden fixed bottom-24 right-6 w-14 h-14 bg-brand-primary text-text-inverse rounded-full shadow-xl shadow-brand-primary/30 flex items-center justify-center z-40 hover:bg-brand-hover transition-transform active:scale-95"
        title="Tambah Proyek"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Create Project Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end lg:items-center justify-center lg:p-4">
          <div className="bg-bg-modal w-full rounded-t-3xl lg:rounded-[2.5rem] overflow-hidden animate-in slide-in-from-bottom-full lg:slide-in-from-bottom-0 lg:zoom-in lg:fade-in duration-300 ease-out flex flex-col max-h-[90vh] lg:max-w-md text-text-primary">
            {/* Drag Handle for Mobile */}
            <div className="lg:hidden w-full flex justify-center pt-3 pb-1 bg-brand-primary">
              <div className="w-12 h-1.5 bg-white/30 rounded-full"></div>
            </div>
            <div className="p-4 lg:p-6 border-b flex items-center justify-between bg-brand-primary border-border-subtle flex-shrink-0">
              <h2 className="text-base lg:text-lg font-black text-text-inverse">Tambah Proyek Baru</h2>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-text-inverse/60 hover:text-text-inverse min-w-[44px] min-h-[44px] flex items-center justify-center p-2 lg:p-0 -mr-2 lg:mr-0">
                <X className="w-5 h-5 lg:w-6 lg:h-6" />
              </button>
            </div>
            
            <form onSubmit={handleCreateProject} className="flex flex-col flex-1 overflow-hidden">
              <div className="overflow-y-auto custom-scrollbar flex-1 p-4 lg:p-6 space-y-8 lg:space-y-8">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1">Pelanggan</label>
                  <select
                    required
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    className="w-full p-3 lg:p-3.5 border border-border-default rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand-primary bg-bg-main text-sm text-text-primary transition-all"
                  >
                    <option value="">Pilih Pelanggan</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1">Nama Proyek</label>
                  <input
                    required
                    type="text"
                    placeholder="Contoh: Renovasi Rumah Pak Budi"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    className="w-full p-3 lg:p-3.5 border border-border-default rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand-primary bg-bg-main text-sm text-text-primary placeholder:text-text-muted transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1">Lokasi Proyek</label>
                  <textarea
                    placeholder="Alamat lengkap proyek..."
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full p-3 lg:p-3.5 border border-border-default rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand-primary bg-bg-main text-sm text-text-primary placeholder:text-text-muted transition-all min-h-[60px] lg:min-h-[80px] resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1">Anggaran (Rp)</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={budget}
                      onChange={(e) => setBudget(e.target.value)}
                      className="w-full p-3 lg:p-3.5 border border-border-default rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand-primary bg-bg-main text-sm text-text-primary placeholder:text-text-muted transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1">Diskon (%)</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={specialDiscount}
                      onChange={(e) => setSpecialDiscount(e.target.value)}
                      className="w-full p-3 lg:p-3.5 border border-border-default rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand-primary bg-bg-main text-sm text-text-primary placeholder:text-text-muted transition-all"
                    />
                  </div>
                </div>

              </div>
              <div className="p-4 lg:p-6 border-t border-border-subtle flex flex-col lg:flex-row-reverse gap-3 bg-bg-main/50 flex-shrink-0">
                  <button
                    type="submit"
                    className="w-full lg:w-auto lg:flex-1 min-h-[44px] py-3 bg-brand-primary text-text-inverse rounded-xl font-bold text-sm shadow-lg shadow-brand-primary/20 hover:bg-brand-hover flex items-center justify-center space-x-2"
                  >
                    <span>Simpan Proyek</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="w-full lg:w-auto lg:flex-1 min-h-[44px] py-3 border rounded-xl font-bold text-sm transition-all bg-bg-card border-border-default text-text-secondary hover:bg-bg-main"
                  >
                    Batal
                  </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Project Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end lg:items-center justify-center lg:p-4">
          <div className="bg-bg-modal w-full rounded-t-3xl lg:rounded-[2.5rem] overflow-hidden animate-in slide-in-from-bottom-full lg:slide-in-from-bottom-0 lg:zoom-in lg:fade-in duration-300 ease-out flex flex-col max-h-[90vh] lg:max-w-md text-text-primary">
            {/* Drag Handle for Mobile */}
            <div className="lg:hidden w-full flex justify-center pt-3 pb-1 bg-brand-primary">
              <div className="w-12 h-1.5 bg-white/30 rounded-full"></div>
            </div>
            <div className="p-4 lg:p-6 border-b flex items-center justify-between bg-brand-primary border-border-subtle flex-shrink-0">
              <h2 className="text-base lg:text-lg font-black text-text-inverse">Edit Proyek</h2>
              <button onClick={() => setIsEditModalOpen(false)} className="text-text-inverse/60 hover:text-text-inverse min-w-[44px] min-h-[44px] flex items-center justify-center p-2 lg:p-0 -mr-2 lg:mr-0">
                <X className="w-5 h-5 lg:w-6 lg:h-6" />
              </button>
            </div>
            
            <form onSubmit={handleEditProject} className="flex flex-col flex-1 overflow-hidden">
              <div className="overflow-y-auto custom-scrollbar flex-1 p-4 lg:p-6 space-y-8 lg:space-y-8">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1">Pelanggan</label>
                  <select
                    required
                    disabled
                    value={selectedCustomerId}
                    className="w-full p-3 lg:p-3.5 border border-border-default bg-bg-main text-sm text-text-muted opacity-70 cursor-not-allowed rounded-lg h-[44px]"
                  >
                    <option value={selectedCustomerId}>{customers.find(c => c.id === selectedCustomerId)?.name || "Pelanggan"}</option>
                  </select>
                  <p className="text-[10px] text-text-muted ml-1">Pelanggan tidak dapat diubah setelah proyek dibuat.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1">Nama Proyek</label>
                  <input
                    required
                    type="text"
                    placeholder="Contoh: Renovasi Rumah Pak Budi"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    className="w-full p-3 lg:p-3.5 border border-border-default rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand-primary bg-bg-main text-sm text-text-primary placeholder:text-text-muted transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1">Lokasi Proyek</label>
                  <textarea
                    placeholder="Alamat lengkap proyek..."
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full p-3 lg:p-3.5 border border-border-default rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand-primary bg-bg-main text-sm text-text-primary placeholder:text-text-muted transition-all min-h-[60px] lg:min-h-[80px] resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1">Anggaran (Rp)</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={budget}
                      onChange={(e) => setBudget(e.target.value)}
                      className="w-full p-3 lg:p-3.5 border border-border-default rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand-primary bg-bg-main text-sm text-text-primary placeholder:text-text-muted transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1">Diskon (%)</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={specialDiscount}
                      onChange={(e) => setSpecialDiscount(e.target.value)}
                      className="w-full p-3 lg:p-3.5 border border-border-default rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand-primary bg-bg-main text-sm text-text-primary placeholder:text-text-muted transition-all"
                    />
                  </div>
                </div>

              </div>
              <div className="p-4 lg:p-6 border-t border-border-subtle flex flex-col lg:flex-row-reverse gap-3 bg-bg-main/50 flex-shrink-0">
                  <button
                    type="submit"
                    className="w-full lg:w-auto lg:flex-1 min-h-[44px] py-3 bg-brand-primary text-text-inverse rounded-xl font-bold text-sm shadow-lg shadow-brand-primary/20 hover:bg-brand-hover flex items-center justify-center space-x-2"
                  >
                    <span>Simpan Perubahan</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="w-full lg:w-auto lg:flex-1 min-h-[44px] py-3 border rounded-xl font-bold text-sm transition-all bg-bg-card border-border-default text-text-secondary hover:bg-bg-main"
                  >
                    Batal
                  </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Status Modal */}
      {isStatusModalOpen && selectedProject && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end lg:items-center justify-center lg:p-4">
          <div className="bg-bg-modal w-full rounded-t-3xl lg:rounded-[2.5rem] overflow-hidden animate-in slide-in-from-bottom-full lg:slide-in-from-bottom-0 lg:zoom-in lg:fade-in duration-300 ease-out flex flex-col max-h-[90vh] lg:max-w-sm">
            {/* Drag Handle for Mobile */}
            <div className="lg:hidden w-full flex justify-center pt-3 pb-1 bg-brand-primary">
              <div className="w-12 h-1.5 bg-white/30 rounded-full"></div>
            </div>
            <div className="p-4 lg:p-6 border-b border-border-subtle flex items-center justify-between bg-brand-primary flex-shrink-0">
              <h2 className="text-base lg:text-lg font-black text-text-inverse">Ubah Status Proyek</h2>
              <button onClick={() => setIsStatusModalOpen(false)} className="text-text-inverse/60 hover:text-text-inverse transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center -mr-2 lg:mr-0">
                <X className="w-5 h-5 lg:w-6 h-6" />
              </button>
            </div>
            <div className="p-4 lg:p-6 space-y-8 overflow-y-auto custom-scrollbar flex-1">
              <p className="text-sm text-text-muted mb-4">Pilih status baru untuk proyek <span className="font-bold text-text-primary">{selectedProject.projectName}</span>:</p>
              
              <button 
                onClick={() => handleUpdateStatus("ACTIVE")}
                className={cn(
                  "w-full text-left px-4 py-3 rounded-xl font-bold text-sm transition-all border",
                  selectedProject.status === "ACTIVE" 
                    ? "bg-status-success/10 border-status-success text-status-success" 
                    : "bg-bg-main border-border-default text-text-primary hover:border-status-success hover:text-status-success"
                )}
              >
                Aktif
              </button>
              <button 
                onClick={() => handleUpdateStatus("COMPLETED")}
                className={cn(
                  "w-full text-left px-4 py-3 rounded-xl font-bold text-sm transition-all border",
                  selectedProject.status === "COMPLETED" 
                    ? "bg-brand-light border-brand-primary text-brand-primary" 
                    : "bg-bg-main border-border-default text-text-primary hover:border-brand-primary hover:text-brand-primary"
                )}
              >
                Selesai
              </button>
              <button 
                onClick={() => handleUpdateStatus("ON_HOLD")}
                className={cn(
                  "w-full text-left px-4 py-3 rounded-xl font-bold text-sm transition-all border",
                  selectedProject.status === "ON_HOLD" 
                    ? "bg-status-warning/10 border-status-warning text-status-warning" 
                    : "bg-bg-main border-border-default text-text-primary hover:border-status-warning hover:text-status-warning"
                )}
              >
                Ditunda
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {isDeleteModalOpen && selectedProject && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[110] flex items-end lg:items-center justify-center lg:p-4">
          <div className="bg-bg-modal w-full max-w-sm rounded-t-3xl lg:rounded-[2.5rem] overflow-hidden animate-in slide-in-from-bottom-full lg:slide-in-from-bottom-0 lg:fade-in lg:zoom-in duration-300 ease-out flex flex-col">
            <div className="lg:hidden w-full flex justify-center pt-3 pb-1 bg-status-danger">
              <div className="w-12 h-1.5 bg-white/30 rounded-full"></div>
            </div>
            <div className="p-4 lg:p-6 bg-status-danger flex items-center justify-between flex-shrink-0">
              <h2 className="text-base lg:text-lg font-black text-text-inverse">Hapus Proyek?</h2>
              <button onClick={() => setIsDeleteModalOpen(false)} className="text-text-inverse/60 hover:text-text-inverse transition-colors p-2 lg:p-0 min-w-[44px] min-h-[44px] flex items-center justify-center">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-8 text-center bg-bg-card">
              <div className="w-20 h-20 bg-status-danger/10 text-status-danger rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-inner">
                <Trash2 className="w-10 h-10" />
              </div>
              <p className="text-sm font-black text-text-primary mb-2">Apakah Anda yakin?</p>
              <p className="text-xs font-bold text-text-muted leading-relaxed">
                Anda yakin ingin menghapus proyek <span className="font-bold text-text-primary">{selectedProject.projectName}</span>? Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>
            <div className="p-4 lg:p-6 border-t border-border-subtle flex flex-col lg:flex-row-reverse gap-3 bg-bg-main/50">
              <button
                onClick={handleDeleteProject}
                className="w-full lg:w-auto lg:flex-1 min-h-[44px] py-3 bg-status-danger text-text-inverse rounded-xl font-bold text-sm shadow-lg shadow-status-danger/20 hover:bg-status-danger/80 flex items-center justify-center space-x-2"
              >
                <span>Ya, Hapus</span>
              </button>
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="w-full lg:w-auto lg:flex-1 min-h-[44px] py-3 border rounded-xl font-bold text-sm transition-all bg-bg-card border-border-default text-text-secondary hover:bg-bg-main"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {selectedReportProject && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end lg:items-center justify-center lg:p-4">
          <div className="bg-bg-modal w-full rounded-t-3xl lg:rounded-[2.5rem] overflow-hidden animate-in slide-in-from-bottom-full lg:slide-in-from-bottom-0 lg:zoom-in lg:fade-in duration-300 ease-out flex flex-col max-h-[90vh] lg:max-w-2xl text-text-primary">
            {/* Drag Handle for Mobile */}
            <div className="lg:hidden w-full flex justify-center pt-3 pb-1 bg-brand-primary">
              <div className="w-12 h-1.5 bg-white/30 rounded-full"></div>
            </div>
            <div className="p-4 lg:p-6 border-b border-border-subtle flex items-center justify-between bg-brand-primary flex-shrink-0">
              <div>
                <h2 className="text-base lg:text-xl font-black text-text-inverse uppercase tracking-tight">Laporan Material Proyek</h2>
                <p className="text-text-inverse/80 text-[10px] lg:text-xs font-bold uppercase tracking-wider mt-0.5 lg:mt-1">{selectedReportProject.projectName}</p>
              </div>
              <button onClick={() => setSelectedReportProject(null)} className="text-text-inverse/60 hover:text-text-inverse min-w-[44px] min-h-[44px] flex items-center justify-center p-2 lg:p-0 -mr-2 lg:mr-0">
                <X className="w-5 h-5 lg:w-6 lg:h-6" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-8 lg:space-y-8 custom-scrollbar">
              {isReportLoading ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-8">
                  <div className="w-12 h-12 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-sm font-bold text-text-muted">Menyusun Laporan...</p>
                </div>
              ) : reportData ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 lg:gap-6">
                    <div className="p-4 lg:p-5 bg-bg-main rounded-[32px] border border-border-subtle shadow-inner">
                      <p className="text-[10px] text-text-muted uppercase font-black tracking-widest mb-1.5 lg:mb-2">Total Penggunaan</p>
                      <p className="text-xl lg:text-2xl font-black text-text-primary">Rp {reportData.totalUsage.toLocaleString()}</p>
                    </div>
                    <div className="p-4 lg:p-5 bg-bg-main rounded-[32px] border border-border-subtle shadow-inner">
                      <p className="text-[10px] text-text-muted uppercase font-black tracking-widest mb-1.5 lg:mb-2">Sisa Anggaran</p>
                      <p className={cn(
                        "text-xl lg:text-2xl font-black",
                        (Number(reportData.project.budget) - reportData.totalUsage) < 0 ? "text-status-danger" : "text-status-success"
                      )}>
                        Rp {(Number(reportData.project.budget) - reportData.totalUsage).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-8 lg:space-y-8">
                    <h3 className="text-xs lg:text-sm font-black text-text-primary uppercase tracking-widest flex items-center gap-2">
                      <div className="w-6 h-6 lg:w-8 lg:h-8 bg-brand-light rounded-lg flex items-center justify-center">
                        <Package className="w-3 h-3 lg:w-4 lg:h-4 text-brand-primary" />
                      </div>
                      Ringkasan Material
                    </h3>
                    <div className="border border-border-subtle rounded-[32px] overflow-hidden overflow-x-auto custom-scrollbar">
                      <table className="w-full text-left text-xs lg:text-sm border-collapse min-w-[400px]">
                        <thead className="bg-bg-main">
                          <tr>
                            <th className="px-4 lg:px-6 py-3 lg:py-4 text-xs font-bold text-text-muted uppercase tracking-widest">Nama Barang</th>
                            <th className="px-4 lg:px-6 py-3 lg:py-4 text-xs font-bold text-text-muted uppercase tracking-widest text-center">Jumlah</th>
                            <th className="px-4 lg:px-6 py-3 lg:py-4 text-xs font-bold text-text-muted uppercase tracking-widest text-right">Total Nilai</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border-subtle bg-bg-card">
                          {reportData.materialSummary.map((m: any, idx: number) => (
                            <tr key={idx} className="hover:bg-bg-main/50 transition-colors">
                              <td className="px-4 lg:px-6 py-3 lg:py-4 text-text-primary font-bold">{m.name}</td>
                              <td className="px-4 lg:px-6 py-3 lg:py-4 text-text-secondary text-center font-medium">{m.totalQty} {m.unitName}</td>
                              <td className="px-4 lg:px-6 py-3 lg:py-4 text-text-primary font-black text-right">Rp {m.totalValue.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : (
                <div className="py-20 text-center">
                  <AlertCircle className="w-12 h-12 text-status-danger mx-auto mb-4 opacity-20" />
                  <p className="text-lg font-bold text-text-muted">Gagal memuat data laporan.</p>
                </div>
              )}
            </div>

            <div className="p-4 lg:p-6 border-t border-border-subtle bg-bg-main flex flex-col lg:flex-row justify-end gap-6 lg:gap-6 flex-shrink-0">
              <button
                onClick={() => handlePrint()}
                disabled={isReportLoading || !reportData}
                className="w-full lg:w-auto px-8 py-3.5 lg:py-3 bg-brand-primary text-text-inverse rounded-2xl font-black hover:bg-brand-hover transition-all shadow-lg shadow-brand-primary/20 flex items-center justify-center gap-2 order-1 lg:order-2 disabled:opacity-50"
              >
                Cetak Laporan
              </button>
              <button
                onClick={() => setSelectedReportProject(null)}
                className="w-full lg:w-auto px-6 py-3.5 lg:py-3 border border-border-default text-text-secondary rounded-2xl font-bold hover:bg-bg-card transition-all order-2 lg:order-1"
              >
                Tutup
              </button>
          </div>
        </div>
      </div>
    )}

    {/* Hidden Printable Component */}
    <div className="hidden">
      <PrintableProjectReport ref={reportPrintRef} data={reportData} />
    </div>
    </div>
    </phantom-ui>
  );
}
