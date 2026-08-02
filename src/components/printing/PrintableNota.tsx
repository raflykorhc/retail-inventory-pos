import React from 'react';
import { formatCurrency } from '../../lib/utils';
import { useSettingsStore } from '../../store/useSettingsStore';

interface PrintableNotaProps {
  data: any;
}

// Helper to convert number to words (Terbilang)
function terbilang(angka: number): string {
  const huruf = ["", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh", "sebelas"];
  let hasil = "";
  if (angka < 12) hasil = huruf[angka];
  else if (angka < 20) hasil = terbilang(angka - 10) + " belas";
  else if (angka < 100) hasil = terbilang(Math.floor(angka / 10)) + " puluh " + terbilang(angka % 10);
  else if (angka < 200) hasil = "seratus " + terbilang(angka - 100);
  else if (angka < 1000) hasil = terbilang(Math.floor(angka / 100)) + " ratus " + terbilang(angka % 100);
  else if (angka < 2000) hasil = "seribu " + terbilang(angka - 1000);
  else if (angka < 1000000) hasil = terbilang(Math.floor(angka / 1000)) + " ribu " + terbilang(angka % 1000);
  else if (angka < 1000000000) hasil = terbilang(Math.floor(angka / 1000000)) + " juta " + terbilang(angka % 1000000);
  return hasil.trim();
}

export const PrintableNota = React.forwardRef<HTMLDivElement, PrintableNotaProps>(({ data }, ref) => {
  if (!data) return null;

  const totalQuantity = data.items?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 0;
  const calculatedSubTotal = data.items?.reduce((sum: number, item: any) => sum + (Number(item.priceAtSale || item.price) * item.quantity), 0) || 0;
  const actualTotal = Number(data.totalAmount);
  const { settings } = useSettingsStore();
  
  // Calculate discount
  let totalDiscount = calculatedSubTotal - actualTotal;
  let discountPercentage = calculatedSubTotal > 0 ? (totalDiscount / calculatedSubTotal) * 100 : 0;

  return (
    <div ref={ref} className="w-full max-w-[850px] p-4 lg:p-10 bg-white text-black font-sans print:p-0 print:m-0">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Courier+Prime:wght@400;700&family=Inter:wght@400;700;900&display=swap');
        
        .nota-container { 
          font-family: Arial, Helvetica, sans-serif; 
          color: black;
          line-height: 1.2;
          -webkit-font-smoothing: none;
          font-smooth: never;
        }

        @page {
          margin: 0.15in 0.5in; 
        }

        @media print {
          body, html {
            background-color: transparent !important;
          }
          .nota-container {
            font-size: 9pt;
            width: 100%;
            max-width: 8.5in;
          }
          .no-print { display: none; }
          
          /* FastReport specific styling overrides for dot matrix */
          table { border-collapse: collapse; }
          th { border-top: 1px dashed black !important; border-bottom: 1px dashed black !important; }
        }

        .mono {
          font-family: 'Courier Prime', 'Courier New', monospace;
        }
      `}</style>
      
      <div className="nota-container flex flex-col justify-between min-h-[5.1in] text-[9px] lg:text-[11px] print:pt-6">
        <div>
          {/* Header Row */}
          <div className="flex justify-between items-start mb-2">
          {/* Left: Company Info */}
          <div className="w-[35%] text-black font-medium">
            <h1 className="text-sm lg:text-base font-bold uppercase tracking-wide mb-1">FAKTUR PENJUALAN</h1>
            <div className="font-bold">{settings.shopName}</div>
            <div>{settings.shopAddress}</div>
            <div>Tlp: {settings.shopPhone}</div>
            <div>{settings.shopEmail}</div>
            <div>{settings.bankAccountInfo}</div>
          </div>

          {/* Middle: Invoice Info */}
          <div className="w-[45%] text-black font-medium pl-4">
            <div className="grid grid-cols-[80px_10px_1fr] gap-y-0.5">
              <span>No Transaksi</span><span>:</span><span className="text-black">{data.invoiceNumber}</span>
              <span>Tanggal</span><span>:</span><span className="text-black">{new Date(data.createdAt || Date.now()).toLocaleString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(/\./g, ':')}</span>
            </div>
          </div>

          {/* Right: Sales Info */}
          <div className="w-[20%] text-black font-medium text-right">
            <span>Kode Sales : </span><span className="text-black">{data.user?.fullName || 'Kasir'}</span>
          </div>
        </div>

        {/* Table */}
        <div className="mt-2">
          <table className="w-full border-collapse">
            <thead>
              <tr className="text-black font-medium border-y border-dashed border-black">
                <th className="py-1 text-left w-[5%] font-normal">No.</th>
                <th className="py-1 text-left w-[15%] font-normal">Kode Item</th>
                <th className="py-1 text-left w-[35%] font-normal">Nama Item</th>
                <th className="py-1 text-right w-[10%] font-normal">Qty</th>
                <th className="py-1 text-right w-[15%] font-normal">Harga</th>
                <th className="py-1 text-right w-[8%] font-normal">Pot</th>
                <th className="py-1 text-right w-[12%] font-normal">Total</th>
              </tr>
            </thead>
            <tbody className="text-black">
              {data.items?.map((item: any, idx: number) => {
                const price = Number(item.priceAtSale || item.price);
                const isBonus = item.isBonus;
                const itemTotal = isBonus ? 0 : price * item.quantity;
                const itemCode = item.product?.code || `PRD-${item.productId?.substring(0,4).toUpperCase()}`;
                
                return (
                  <tr key={idx} className="align-top">
                    <td className="py-1">{idx + 1}</td>
                    <td className="py-1">{itemCode}</td>
                    <td className="py-1">
                      {item.name || item.product?.name || 'Produk'}
                      {isBonus && <span className="ml-1 text-gray-500">(BONUS)</span>}
                    </td>
                    <td className="py-1 text-right">{item.quantity} {item.unit?.name || item.unit || 'Lbr'}</td>
                    <td className="py-1 text-right">{isBonus ? "0,00" : formatCurrency(price).replace('Rp', '').trim()}</td>
                    <td className="py-1 text-right">0,00</td>
                    <td className="py-1 text-right">{isBonus ? "0,00" : formatCurrency(itemTotal).replace('Rp', '').trim()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        </div>

        {/* Footer Area */}
        <div className="border-t border-dashed border-black mt-1 pt-1 flex justify-between text-black font-medium">
          
          {/* Footer Left: Keterangan, Signatures, Terbilang */}
          <div className="w-[50%] flex flex-col justify-between pr-4">
            <div>
              <div className="flex gap-2">
                <span>Keterangan :</span>
                <span className="text-black">-</span>
              </div>
              
              <div className="flex mt-4 gap-12 text-center">
                <div className="w-24">
                  <div>Hormat Kami</div>
                  <div className="mt-8 text-black border-b border-dashed border-black">( {settings.defaultSignee} )</div>
                </div>
                <div className="w-24">
                  <div>Penerima</div>
                  <div className="mt-8 text-black border-b border-dashed border-black">( ............ )</div>
                </div>
              </div>
            </div>

            <div className="mt-4">
              <div className="flex gap-2">
                <span>Terbilang :</span>
                <span className="text-black capitalize font-semibold">{actualTotal > 0 ? terbilang(actualTotal) + " rupiah" : "Nol rupiah"}</span>
              </div>
              <div className="mt-1">{new Date().toLocaleString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(/\./g, ':')}</div>
            </div>
          </div>

          {/* Footer Right: Totals Grid */}
          <div className="w-[50%] flex gap-4">
            {/* Column 1 of Totals */}
            <div className="flex-1">
              <div className="grid grid-cols-[70px_10px_1fr] gap-y-0.5">
                <span>Jml Item</span><span>:</span><span className="text-black text-right">{totalQuantity.toFixed(2).replace('.', ',')}</span>
                <span>Potongan</span><span>:</span>
                <span className="text-black text-right flex justify-between">
                  <span className="w-12 text-left">{discountPercentage.toFixed(2).replace('.', ',')}%</span>
                  <span>{formatCurrency(totalDiscount).replace('Rp', '').trim()}</span>
                </span>
                <span>Pajak</span><span>:</span>
                <span className="text-black text-right flex justify-between">
                  <span className="w-12 text-left">0,00%</span>
                  <span>0,00</span>
                </span>
                <span>Biaya Lain</span><span>:</span><span className="text-black text-right">0,00</span>
                <span>Tanggal Jt</span><span>:</span><span className="text-black text-right">{data.paymentMethod === 'DEBT' && data.debts?.[0]?.dueDate ? new Date(data.debts[0].dueDate).toLocaleDateString('id-ID') : '-'}</span>
              </div>
            </div>

            {/* Column 2 of Totals */}
            <div className="flex-1">
              <div className="grid grid-cols-[70px_10px_1fr] gap-y-0.5">
                <span>Sub Total</span><span>:</span><span className="text-black text-right">{formatCurrency(calculatedSubTotal).replace('Rp', '').trim()}</span>
                <span>Total Akhir</span><span>:</span><span className="text-black text-right font-bold">{formatCurrency(actualTotal).replace('Rp', '').trim()}</span>
                <span>DP PO</span><span>:</span><span className="text-black text-right">0,00</span>
                <span>Tunai</span><span>:</span><span className="text-black text-right">{data.paymentMethod === 'CASH' ? formatCurrency(Number(data.amountPaid || actualTotal)).replace('Rp', '').trim() : '0,00'}</span>
                <span>Kredit</span><span>:</span><span className="text-black text-right">{data.paymentMethod === 'DEBT' ? formatCurrency(actualTotal).replace('Rp', '').trim() : '0,00'}</span>
                <span>K. Debit</span><span>:</span><span className="text-black text-right">0,00</span>
                <span>K. Kredit</span><span>:</span><span className="text-black text-right">0,00</span>
                <span>Kembali</span><span>:</span><span className="text-black text-right">{formatCurrency(Number(data.changeAmount || 0)).replace('Rp', '').trim()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

PrintableNota.displayName = 'PrintableNota';

