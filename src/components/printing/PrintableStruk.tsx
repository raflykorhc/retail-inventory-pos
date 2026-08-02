import React from 'react';
import { formatCurrency } from '../../lib/utils';
import { useSettingsStore } from '../../store/useSettingsStore';

interface PrintableStrukProps {
  data: any;
}

export const PrintableStruk = React.forwardRef<HTMLDivElement, PrintableStrukProps>(({ data }, ref) => {
  const { settings } = useSettingsStore();
  if (!data) return null;

  return (
    <div ref={ref} className="w-[80mm] p-2 bg-white text-black font-mono text-[10pt] leading-tight print:w-[80mm] print:p-0">
      <style>{`
        @media print {
          @page { margin: 0; size: 80mm 200mm; }
          body { margin: 0; }
        }
        .struk-text {
          font-family: 'Courier New', Courier, monospace;
          font-weight: 500;
        }
      `}</style>

      <div className="text-center mb-4 struk-text">
        <h1 className="text-[12pt] font-black uppercase">{settings.shopName}</h1>
        <p className="text-[9pt]">{settings.shopAddress.split(',')[0]}</p>
        <p className="text-[9pt]">{settings.shopAddress.split(',').slice(1).join(', ')}</p>
        <p className="text-[9pt]">WA: {settings.shopPhone}</p>
      </div>

      <div className="border-y border-dashed border-black py-2 mb-3 struk-text text-[9pt]">
        <div className="flex justify-between">
          <span>NO: {data.invoiceNumber || 'INV-TEST'}</span>
          <span>{new Date(data.createdAt || Date.now()).toLocaleDateString('id-ID')}</span>
        </div>
        <div className="flex justify-between">
          <span>KSR: {data.user?.fullName?.split(' ')[0] || 'ADMIN'}</span>
          <span>{new Date(data.createdAt || Date.now()).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>

      </div>

      <div className="space-y-2 mb-4 struk-text text-[10pt]">
        {data.items?.map((item: any, idx: number) => (
          <div key={idx} className="border-b border-gray-100 pb-1">
            <div className="uppercase font-bold">
              {item.name || item.product?.name}
              {item.isBonus && <span className="text-[8pt] text-gray-500 ml-1 font-normal font-sans">(BONUS)</span>}
            </div>
            <div className="flex justify-between items-end">
              <span className="text-[9pt]">
                {item.quantity} {item.unit?.name || item.unit || 'PCS'} x {item.isBonus ? "Rp 0" : formatCurrency(Number(item.priceAtSale || item.price))}
              </span>
              <span className="font-bold">
                {item.isBonus ? "GRATIS" : formatCurrency(Number(item.priceAtSale || item.price) * item.quantity)}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t-2 border-double border-black pt-2 space-y-1 struk-text text-[10pt]">
        {(() => {
          const calculatedTotal = data.items?.reduce((sum: number, item: any) => {
            return sum + (item.isBonus ? 0 : (Number(item.priceAtSale || item.price) * item.quantity));
          }, 0) || 0;
          const actualTotal = Number(data.totalAmount);
          const globalDiscount = calculatedTotal - actualTotal;

          return (
            <>
              {globalDiscount > 0 && (
                <>
                  <div className="flex justify-between text-[9pt] font-normal pb-1">
                    <span>SUBTOTAL</span>
                    <span>{formatCurrency(calculatedTotal)}</span>
                  </div>
                  <div className="flex justify-between text-[9pt] font-bold border-b border-dashed border-gray-400 pb-1 mb-1">
                    <span>DISKON TAMBAHAN</span>
                    <span>-{formatCurrency(globalDiscount)}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between items-center">
                <span className="font-bold">TOTAL</span>
                <span className="text-[12pt] font-black">{formatCurrency(actualTotal)}</span>
              </div>
            </>
          );
        })()}
        <div className="flex justify-between text-[9pt] pt-1">
          <span>METODE</span>
          <span className="font-bold uppercase">{data.paymentMethod || 'CASH'}</span>
        </div>
        {data.paymentMethod === 'CASH' && data.amountPaid != null && Number(data.amountPaid) > 0 && (
          <>
            <div className="flex justify-between text-[9pt]">
              <span>TUNAI (DIBAYAR)</span>
              <span className="font-bold">{formatCurrency(Number(data.amountPaid))}</span>
            </div>
            <div className="flex justify-between text-[9pt]">
              <span>KEMBALIAN</span>
              <span className="font-bold">{formatCurrency(Number(data.changeAmount || 0))}</span>
            </div>
          </>
        )}
        {data.paymentMethod === 'DEBT' && (
          <div className="flex justify-between text-[9pt] italic">
            <span>SISA HUTANG</span>
            <span>{formatCurrency(Number(data.totalAmount))}</span>
          </div>
        )}
      </div>

      <div className="mt-8 mb-10 text-center struk-text text-[9pt]">
        <p className="font-bold">*** TERIMA KASIH ***</p>
        <p>Barang yang sudah dibeli tidak</p>
        <p>dapat ditukar atau dikembalikan</p>
        <div className="mt-4 opacity-50 text-[8pt]">
          {new Date().toLocaleString('id-ID')}
        </div>
      </div>
      
      {/* Bottom padding for cutter */}
      <div className="h-10"></div>
    </div>
  );
});

PrintableStruk.displayName = 'PrintableStruk';
