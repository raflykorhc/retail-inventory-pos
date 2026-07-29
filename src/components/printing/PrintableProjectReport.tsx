import React from 'react';
import { formatCurrency } from '../../lib/utils';

interface PrintableProjectReportProps {
  data: {
    project: {
      projectName: string;
      location: string | null;
      status: string;
      budget: number;
      customer: {
        name: string;
      };
    };
    materialSummary: Array<{
      name: string;
      totalQty: number;
      unitName: string;
      totalValue: number;
    }>;
    totalUsage: number;
  } | null;
}

export const PrintableProjectReport = React.forwardRef<HTMLDivElement, PrintableProjectReportProps>(({ data }, ref) => {
  if (!data) return null;

  const remainingBudget = Number(data.project.budget) - data.totalUsage;
  const isOverBudget = remainingBudget < 0;

  return (
    <div ref={ref} className="w-full p-8 bg-white text-black font-sans print:p-0">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');
        
        .report-container { 
          font-family: 'Inter', sans-serif; 
          color: black;
          line-height: 1.5;
        }

        @media print {
          @page {
            size: A4;
            margin: 15mm;
          }
          .report-container {
            font-size: 10pt;
            width: 100%;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }

        table {
          width: 100%;
          border-collapse: collapse;
        }

        th {
          background-color: #f3f4f6 !important;
          text-align: left;
          font-weight: 700;
          text-transform: uppercase;
          font-size: 8pt;
          letter-spacing: 0.05em;
          padding: 8px 12px;
          border: 1px solid #d1d5db;
        }

        td {
          padding: 8px 12px;
          border: 1px solid #e5e7eb;
          font-size: 9pt;
        }

        .summary-box {
          border: 1px solid #d1d5db;
          padding: 12px;
          border-radius: 8px;
          background-color: #f9fafb;
        }
      `}</style>
      
      <div className="report-container">
        {/* Header Section */}
        <div className="flex justify-between items-start border-b-2 border-black pb-6 mb-8">
          <div className="flex items-center gap-4">
            <img src="/logo.png" className="w-16 h-auto" alt="Logo" />
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tighter leading-none mb-1">PD SUKSES BANGUNAN</h1>
              <p className="text-[10px] text-gray-600 max-w-[300px]">
                Jl. Citalang, Kec. Purwakarta, depan Perumahan Grha Citalang<br/>
                Purwakarta, Jawa Barat | pdsuksesbngunan@gmail.com
              </p>
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-black uppercase tracking-widest text-gray-400">Project Report</h2>
            <p className="text-xs font-bold text-black mt-1">Dicetak pada: {new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-8">
          <h3 className="text-xl font-black uppercase underline underline-offset-8">LAPORAN PENGGUNAAN MATERIAL PROYEK</h3>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div className="space-y-2">
            <div className="grid grid-cols-[100px_10px_1fr] text-sm">
              <span className="font-semibold text-gray-600">Nama Proyek</span>
              <span>:</span>
              <span className="font-bold uppercase">{data.project.projectName}</span>
            </div>
            <div className="grid grid-cols-[100px_10px_1fr] text-sm">
              <span className="font-semibold text-gray-600">Pelanggan</span>
              <span>:</span>
              <span className="font-bold">{data.project.customer.name}</span>
            </div>
            <div className="grid grid-cols-[100px_10px_1fr] text-sm">
              <span className="font-semibold text-gray-600">Lokasi</span>
              <span>:</span>
              <span className="text-gray-800">{data.project.location || '-'}</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="grid grid-cols-[100px_10px_1fr] text-sm">
              <span className="font-semibold text-gray-600">Status</span>
              <span>:</span>
              <span className="font-bold">
                {data.project.status === 'ACTIVE' ? 'AKTIF' : 
                 data.project.status === 'COMPLETED' ? 'SELESAI' : 
                 data.project.status === 'ON_HOLD' ? 'DITUNDA' : data.project.status}
              </span>
            </div>
            <div className="grid grid-cols-[100px_10px_1fr] text-sm">
              <span className="font-semibold text-gray-600">Tgl. Laporan</span>
              <span>:</span>
              <span>{new Date().toLocaleDateString('id-ID')}</span>
            </div>
          </div>
        </div>

        {/* Financial Summary */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="summary-box">
            <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Total Anggaran</p>
            <p className="text-lg font-black">{formatCurrency(data.project.budget)}</p>
          </div>
          <div className="summary-box">
            <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Total Pemakaian</p>
            <p className="text-lg font-black">{formatCurrency(data.totalUsage)}</p>
          </div>
          <div className={`summary-box ${isOverBudget ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
            <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Sisa Anggaran</p>
            <p className={`text-lg font-black ${isOverBudget ? 'text-red-600' : 'text-green-600'}`}>
              {formatCurrency(remainingBudget)}
            </p>
          </div>
        </div>

        {/* Table */}
        <div className="mb-8">
          <h4 className="text-xs font-black uppercase tracking-widest mb-3 flex items-center gap-2">
            <span className="w-1.5 h-4 bg-black"></span>
            Rincian Material Terpakai
          </h4>
          <table>
            <thead>
              <tr>
                <th className="w-[50px] text-center">No</th>
                <th>Nama Barang</th>
                <th className="w-[100px] text-center">Jumlah</th>
                <th className="w-[120px] text-right">Rerata Harga</th>
                <th className="w-[150px] text-right">Total Nilai</th>
              </tr>
            </thead>
            <tbody>
              {data.materialSummary.map((item, idx) => (
                <tr key={idx}>
                  <td className="text-center">{idx + 1}</td>
                  <td className="font-semibold uppercase">{item.name}</td>
                  <td className="text-center">{item.totalQty} {item.unitName}</td>
                  <td className="text-right">{formatCurrency(Math.round(item.totalValue / item.totalQty))}</td>
                  <td className="text-right font-bold">{formatCurrency(item.totalValue)}</td>
                </tr>
              ))}
              {data.materialSummary.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-gray-400 italic">Belum ada material yang tercatat</td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 font-black">
                <td colSpan={4} className="text-right uppercase py-3 px-4">Total Nilai Keseluruhan</td>
                <td className="text-right py-3 px-4 text-lg">{formatCurrency(data.totalUsage)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Footer / Signatures */}
        <div className="mt-16 grid grid-cols-2 gap-20 text-center">
          <div className="space-y-20">
            <p className="text-sm">Dibuat Oleh,</p>
            <div className="border-t border-black w-48 mx-auto">
              <p className="text-xs mt-1">( ........................................ )</p>
              <p className="text-[10px] text-gray-500 uppercase mt-0.5 font-bold">Admin PD Sukses Bangunan</p>
            </div>
          </div>
          <div className="space-y-20">
            <p className="text-sm">Disetujui Oleh (Pelanggan),</p>
            <div className="border-t border-black w-48 mx-auto">
              <p className="text-xs mt-1 font-bold">{data.project.customer.name}</p>
              <p className="text-[10px] text-gray-500 uppercase mt-0.5 font-bold">Pemilik Proyek</p>
            </div>
          </div>
        </div>

        {/* Bottom Notice */}
        <div className="mt-20 pt-4 border-t border-gray-100 text-[8px] text-gray-400 text-center uppercase tracking-widest italic">
          Dokumen ini dihasilkan secara otomatis oleh sistem PD Sukses Bangunan POS pada {new Date().toLocaleString()}
        </div>
      </div>
    </div>
  );
});

PrintableProjectReport.displayName = 'PrintableProjectReport';
