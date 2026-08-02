import { formatCurrency } from "./utils";
import { useSettingsStore } from "../store/useSettingsStore";

export const handlePrintInvoice = (sale: any) => {
  const settings = useSettingsStore.getState().settings;
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert("Tolong izinkan pop-up untuk mencetak struk.");
    return;
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Invoice ${sale.invoiceNumber}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
        
        body { 
          font-family: 'Inter', -apple-system, sans-serif; 
          margin: 0; 
          padding: 40px; 
          color: #1a1a1a;
          line-height: 1.4;
        }

        .invoice-container {
          max-width: 800px;
          margin: 0 auto;
        }

        /* Header Styling */
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 40px;
        }

        .brand-section {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .logo-container {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 4px;
        }


        .business-name {
          font-size: 20px;
          font-weight: 900;
          line-height: 1.1;
          text-transform: uppercase;
          letter-spacing: -0.02em;
        }

        .business-info {
          font-size: 11px;
          color: #4b5563;
          max-width: 280px;
        }

        .invoice-title-section {
          text-align: right;
        }

        .invoice-label {
          font-size: 32px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 12px;
        }

        .invoice-meta {
          display: grid;
          grid-template-columns: auto 1fr;
          gap: 4px 20px;
          font-size: 12px;
          text-align: left;
        }

        .meta-label { color: #6b7280; }
        .meta-value { font-weight: 700; }
        /* Table Styling */
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 30px 0;
        }

        th {
          background-color: #065f46;
          color: #ffffff;
          font-size: 11px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          padding: 12px 15px;
          text-align: left;
        }

        td {
          padding: 12px 15px;
          border-bottom: 1px solid #e5e7eb;
          font-size: 12px;
        }

        .col-name { width: 50%; }
        .col-qty { width: 15%; }
        .col-price { width: 15%; text-align: right; }
        .col-total { width: 20%; text-align: right; font-weight: 700; }

        /* Total Section */
        .total-container {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background-color: #065f46;
          color: white;
          padding: 12px 20px;
          margin-top: -30px;
          margin-bottom: 40px;
        }

        .total-label {
          font-size: 12px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }

        .total-value {
          font-size: 16px;
          font-weight: 900;
        }

        /* Footer Styling */
        .footer {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          margin-top: 60px;
        }

        .footer-left {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .footer-section-title {
          font-weight: 900;
          text-transform: capitalize;
          margin-bottom: 4px;
        }

        .payment-details, .confirmation-details {
          color: #374151;
        }

        .terms {
          margin-top: 20px;
          font-style: italic;
          color: #6b7280;
          max-width: 300px;
        }

        .footer-right {
          text-align: center;
          min-width: 150px;
        }

        .signature-space {
          height: 60px;
          margin: 10px 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .signature-name {
          font-weight: 900;
          text-decoration: underline;
        }

        @media print {
          body { padding: 20px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .invoice-container { max-width: 100%; }
          @page { margin: 0.5cm; }
        }
      </style>
    </head>
    <body>
      <div class="invoice-container">
        <div class="header">
          <div class="brand-section">
            <div class="logo-container">
              <img src="${settings.shopLogo || '/logo.png'}" style="width: 50px; height: auto;" alt="Logo ${settings.shopName}" />
              <h1 class="business-name">${settings.shopName.replace(' ', '<br>')}</h1>
            </div>
            <div class="business-info">
              ${settings.shopAddress}<br>
              ${settings.shopEmail}
            </div>
          </div>

          <div class="invoice-title-section">
            <div class="invoice-label">NOTA PENJUALAN</div>
            <div class="invoice-meta">
              <span class="meta-label">Tanggal</span>
              <span class="meta-value">: ${new Date(sale.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
              <span class="meta-label">No. Transaksi</span>
              <span class="meta-value">: ${sale.invoiceNumber}</span>
            </div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th class="col-name">NAMA BARANG</th>
              <th class="col-qty">JUMLAH</th>
              <th class="col-price">HARGA</th>
              <th class="col-total">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            ${sale.items.map((item: any) => `
              <tr>
                <td class="col-name">${item.product?.name || item.name || 'Produk'}</td>
                <td class="col-qty">${item.quantity}${item.unit?.name || item.unit || ''}</td>
                <td class="col-price">${formatCurrency(Number(item.priceAtSale || item.price))}</td>
                <td class="col-total">${formatCurrency(Number(item.priceAtSale || item.price) * item.quantity)}</td>
              </tr>
            `).join('')}
            ${Array(Math.max(0, 6 - sale.items.length)).fill(0).map(() => `
              <tr>
                <td class="col-name">&nbsp;</td>
                <td class="col-qty"></td>
                <td class="col-price"></td>
                <td class="col-total"></td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="total-container">
          <div class="total-label">TOTAL KESELURUHAN</div>
          <div class="total-value">${(() => {
            const calculatedTotal = sale.items?.reduce((sum, item) => {
              return sum + (item.isBonus ? 0 : (Number(item.priceAtSale || item.price) * item.quantity));
            }, 0) || 0;
            const actualTotal = Number(sale.totalAmount);
            const displayTotal = (calculatedTotal > 0 && actualTotal > calculatedTotal) ? calculatedTotal : actualTotal;
            return formatCurrency(displayTotal);
          })()}</div>
        </div>

        <div class="footer">
          <div class="footer-left">
            <div>
              <div class="footer-section-title">Metode Pembayaran</div>
              <div class="payment-details">
                ${settings.bankAccountInfo.replace(/\n/g, '<br>')}
              </div>
            </div>
            <div>
              <div class="footer-section-title">Konfirmasi Pembayaran</div>
              <div class="confirmation-details">
                ${settings.shopPhone}
              </div>
            </div>
            <div class="terms">
              Tidak terima retur/komplain setelah supir meninggalkan lokasi. Terima Kasih
            </div>
          </div>

            <div class="footer-right">
              <div>Hormat Kami,</div>
              <div class="signature-space">
                <img src="/signature.png" style="width: 120px; height: auto;" alt="Tanda Tangan Umar" />
              </div>
              <div class="signature-name">${settings.defaultSignee}</div>
            </div>
        </div>
      </div>
      
      <script>
        window.onload = () => {
          setTimeout(() => {
            window.print();
          }, 500);
        };
      </script>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
};
