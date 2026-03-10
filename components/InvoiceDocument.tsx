import React from 'react';
import { Project, Profile, Package, Client, PaymentStatus, PhysicalItem } from '../types';

interface InvoiceDocumentProps {
    project: Project;
    profile: Profile;
    packages: Package[];
    client?: Client;
    id?: string;
}

const InvoiceDocument: React.FC<InvoiceDocumentProps> = ({
    project,
    profile,
    packages,
    client,
    id = "invoice-document"
}) => {
    // Helper to format currency (Indonesian Rupiah)
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    // Helper to format date (Indonesian style)
    const formatDate = (dateString?: string) => {
        if (!dateString) return 'Tanpa Tanggal';
        try {
            return new Date(dateString).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
            });
        } catch (e) {
            return dateString;
        }
    };

    const subtotal = project.totalCost + (project.discountAmount || 0);
    const addOnsTotal = (project.addOns || []).reduce((acc, curr) => acc + (curr.price || 0), 0);
    const packagePrice = subtotal - addOnsTotal - (Number(project.transportCost) || 0);

    // Find the package description
    const mainPackage = packages.find(p => p.id === project.packageId || p.name === project.packageName);
    let displayDigitalItems: string[] = [];
    let displayPhysicalItems: PhysicalItem[] = [];
    if (mainPackage) {
        const selectedOption = mainPackage.durationOptions?.find(opt => opt.label === project.durationSelection);

        // Try to get from selected option first
        if (selectedOption) {
            if (selectedOption.digitalItems && selectedOption.digitalItems.length > 0) {
                displayDigitalItems = selectedOption.digitalItems;
            }
            if (selectedOption.physicalItems && selectedOption.physicalItems.length > 0) {
                displayPhysicalItems = selectedOption.physicalItems;
            }
        }

        // Fallback to main package digital items
        if (displayDigitalItems.length === 0 && mainPackage.digitalItems && mainPackage.digitalItems.length > 0) {
            displayDigitalItems = mainPackage.digitalItems;
        }

        // Fallback to main package physical items
        if (displayPhysicalItems.length === 0 && mainPackage.physicalItems && mainPackage.physicalItems.length > 0) {
            displayPhysicalItems = mainPackage.physicalItems;
        }
    }

    return (
        <div id={id} className="invoice-container bg-white rounded-none border border-slate-200 shadow-xl overflow-hidden print:shadow-none print:border-none print:bg-white print:rounded-none mx-auto max-w-[800px] font-sans text-slate-900">
            {/* Professional Header Section */}
            <div className="p-8 sm:p-10 border-b-4 border-brand-accent bg-slate-50 print:bg-white print:p-0 print:pt-4 print:pb-6">
                <div className="flex flex-row justify-between items-start gap-4">
                    <div className="flex flex-col gap-3 flex-1">
                        {profile.logoBase64 ? (
                            <img
                                src={profile.logoBase64}
                                alt={profile.companyName}
                                className="invoice-logo h-16 sm:h-20 object-contain self-start"
                            />
                        ) : (
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-brand-accent flex items-center justify-center">
                                    <span className="text-white font-bold text-xl">{profile.companyName?.charAt(0) || 'V'}</span>
                                </div>
                                <h1 className="text-xl font-bold text-slate-800">{profile.companyName}</h1>
                            </div>
                        )}
                        <div className="text-[11px] leading-relaxed text-slate-500 max-w-[250px] print:text-black">
                            <p className="font-bold text-slate-700 print:text-black">{profile.companyName}</p>
                            <p>{profile.address}</p>
                            <p>{profile.phone} • {profile.email}</p>
                        </div>
                    </div>

                    <div className="text-right flex flex-col items-end shrink-0">
                        <h2 className="text-3xl font-black text-brand-accent tracking-tighter mb-2">INVOICE</h2>
                        <div className="bg-slate-200 px-3 py-1 rounded-sm text-[12px] font-bold text-slate-700 mb-2 print:bg-white print:border print:border-slate-300">
                            ID: #INV-{project.id.slice(-8).toUpperCase()}
                        </div>
                        <div className="text-[11px] text-slate-500 text-right print:text-black">
                            <p>Diterbitkan: <span className="font-bold text-slate-700 print:text-black">{formatDate(project.date)}</span></p>
                            <p className="mt-1">Status: <span className={`font-bold ${project.paymentStatus === PaymentStatus.LUNAS ? 'text-green-600' : 'text-orange-600'} print:text-black uppercase`}>{project.paymentStatus}</span></p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-8 sm:p-10 space-y-8 print:p-0 print:pt-6">
                {/* Billing Grid */}
                <div className="grid grid-cols-2 gap-8 border-b border-slate-100 pb-8 print:border-slate-200">
                    <div>
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 print:text-slate-500">Tagihan Untuk</h4>
                        <div className="space-y-1">
                            <p className="text-lg font-bold text-slate-800 print:text-black">{project.clientName}</p>
                            {client && (
                                <div className="text-[12px] text-slate-600 print:text-black space-y-0.5">
                                    <p>{client.phone}</p>
                                    <p>{client.email}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div>
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 print:text-slate-500">Detail Layanan</h4>
                        <div className="space-y-1">
                            <p className="text-lg font-bold text-slate-800 print:text-black">{project.projectName}</p>
                            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 print:text-black">
                                <p><span className="text-slate-400 font-medium">Lokasi:</span> {project.location}</p>
                                <p><span className="text-slate-400 font-medium">Tipe:</span> {project.projectType}</p>
                                {project.address && <p className="col-span-2"><span className="text-slate-400 font-medium">Alamat:</span> {project.address}</p>}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Professional Item Table */}
                <div className="overflow-hidden">
                    <table className="w-full text-left table-fixed">
                        <thead>
                            <tr className="bg-slate-100 border-b border-slate-200 print:bg-slate-50">
                                <th className="px-4 py-3 text-[10px] font-black text-slate-600 uppercase tracking-widest w-[70%]">Deskripsi Produk / Layanan</th>
                                <th className="px-4 py-3 text-right text-[10px] font-black text-slate-600 uppercase tracking-widest w-[30%]">Total Harga</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 print:divide-slate-200 text-[13px]">
                            <tr>
                                <td className="px-4 py-4">
                                    <div className="flex flex-col">
                                        <p className="font-bold text-slate-800 print:text-black">{project.packageName}</p>
                                        {displayDigitalItems.length > 0 ? (
                                            <div className="mt-1.5 space-y-0.5">
                                                {displayDigitalItems.map((item, idx) => (
                                                    <p key={idx} className="text-[10px] text-slate-500 leading-tight flex items-start gap-1">
                                                        <span className="shrink-0">•</span>
                                                        <span>{item}</span>
                                                    </p>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-[11px] text-slate-500 mt-0.5 italic">Paket utama layanan profesional</p>
                                        )}

                                        {displayPhysicalItems.length > 0 && (
                                            <div className="mt-2 pt-2 border-t border-slate-100 space-y-0.5">
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Vendor (Allpackage):</p>
                                                {displayPhysicalItems.map((item, idx) => (
                                                    <p key={idx} className="text-[10px] text-slate-500 leading-tight flex items-start gap-1">
                                                        <span className="shrink-0">•</span>
                                                        <span>{item.name}</span>
                                                    </p>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </td>
                                <td className="px-4 py-4 text-right font-bold text-slate-800 print:text-black">{formatCurrency(packagePrice)}</td>
                            </tr>
                            {project.addOns?.map((addon) => (
                                <tr key={addon.id}>
                                    <td className="px-4 py-3">
                                        <p className="font-medium text-slate-700 print:text-black">{addon.name}</p>
                                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-tight">Add-on Item</p>
                                    </td>
                                    <td className="px-4 py-3 text-right font-medium text-slate-700 print:text-black">{formatCurrency(addon.price)}</td>
                                </tr>
                            ))}
                            {project.transportCost && Number(project.transportCost) > 0 && (
                                <tr>
                                    <td className="px-4 py-3">
                                        <p className="font-medium text-slate-700 print:text-black">Biaya Transport</p>
                                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-tight">Logistik & Operasional</p>
                                    </td>
                                    <td className="px-4 py-3 text-right font-medium text-slate-700 print:text-black">{formatCurrency(Number(project.transportCost))}</td>
                                </tr>
                            )}
                            {project.customCosts?.map((cost) => (
                                <tr key={cost.id}>
                                    <td className="px-4 py-3">
                                        <p className="font-medium text-slate-700 print:text-black">{cost.description}</p>
                                        <p className="text-[10px] text-orange-500 uppercase font-bold tracking-tight">Biaya Tambahan</p>
                                    </td>
                                    <td className="px-4 py-3 text-right font-medium text-slate-700 print:text-black">{formatCurrency(cost.amount)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Summary Section */}
                <div className="flex flex-row justify-between items-start gap-10 border-t border-slate-100 pt-8 print:border-slate-200">
                    <div className="flex-1">
                        <div className="bg-slate-50 p-4 rounded border border-slate-100 print:bg-white print:border-slate-200">
                            <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Informasi Pembayaran</h5>
                            <p className="text-[13px] font-bold text-slate-800 mb-1 print:text-black">{profile.bankAccount}</p>
                            <p className="text-[11px] text-slate-500 leading-relaxed print:text-black">Silakan kirimkan bukti transfer melalui Whatsapp atau Portal Client setelah melakukan pembayaran.</p>
                        </div>
                        <div className="mt-4 text-[10px] text-slate-400 italic leading-relaxed print:text-slate-500">
                            &quot;{profile.termsAndConditions || 'Terima kasih telah mempercayai layanan kami. Kepuasan Anda adalah prioritas kami.'}&quot;
                        </div>
                    </div>

                    <div className="w-[280px] shrink-0 space-y-2">
                        <div className="flex justify-between text-[13px] text-slate-600 px-2 print:text-black">
                            <span>Subtotal</span>
                            <span className="font-medium">{formatCurrency(subtotal)}</span>
                        </div>
                        {project.discountAmount ? (
                            <div className="flex justify-between text-[13px] text-red-600 px-2 font-medium">
                                <span>Diskon</span>
                                <span>-{formatCurrency(project.discountAmount)}</span>
                            </div>
                        ) : null}
                        <div className="h-px bg-slate-200 my-1" />
                        <div className="flex justify-between px-2 py-2 bg-slate-100 rounded print:bg-white print:border print:border-slate-200">
                            <span className="text-[12px] font-black text-slate-600 uppercase print:text-black">Grand Total</span>
                            <span className="text-xl font-black text-brand-accent print:text-black tracking-tight">{formatCurrency(project.totalCost)}</span>
                        </div>
                        <div className="flex justify-between text-[12px] text-green-600 px-2 pt-1 font-bold">
                            <span>Sudah Dibayar</span>
                            <span>{formatCurrency(project.amountPaid || 0)}</span>
                        </div>
                        <div className="flex justify-between px-2 py-2 border-2 border-brand-accent/20 rounded-md mt-2 bg-brand-accent/5 print:bg-white print:border-slate-800">
                            <span className="text-[11px] font-black text-brand-accent uppercase print:text-black">Sisa Tagihan</span>
                            <span className="text-lg font-black text-brand-accent print:text-black tracking-tight">{formatCurrency(project.totalCost - (project.amountPaid || 0))}</span>
                        </div>
                    </div>
                </div>

                {/* Footer / Signatures */}
                <div className="grid grid-cols-3 gap-6 pt-8 border-t border-slate-100 print:pt-4 print:border-slate-200">
                    <div className="col-span-2">
                        <p className="text-[9px] text-slate-400 text-center uppercase tracking-widest font-black mb-10">Dicetak Otomatis oleh Sistem Portofolio Weddfin</p>
                    </div>
                    <div className="text-center">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Hormat Kami,</p>
                        <div className="h-16 flex items-center justify-center">
                            {profile.signatureBase64 ? (
                                <img src={profile.signatureBase64} alt="Tanda Tangan" className="max-h-full object-contain grayscale" />
                            ) : (
                                <div className="h-px w-24 bg-slate-200 mx-auto mt-10 print:bg-slate-300" />
                            )}
                        </div>
                        <p className="text-[13px] font-bold text-slate-800 mt-2 print:text-black underline underline-offset-4 decoration-slate-300">{profile.authorizedSigner}</p>
                        <p className="text-[9px] font-black text-slate-400 uppercase mt-1 tracking-tighter">{profile.companyName}</p>
                    </div>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
        @media print {
          /* Reset page margins for A4 */
          @page {
            margin: 10mm 15mm !important;
            size: A4 portrait;
          }
          
          /* Hide all other elements */
          body * { 
            visibility: hidden !important; 
          }
          
          /* Show ONLY the invoice and its children */
          .invoice-container, .invoice-container * { 
            visibility: visible !important; 
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* Definitive Logo Scaling Fix */
          .invoice-logo, img[alt*="logo"], div.flex img {
            max-height: 60px !important;
            width: auto !important;
            object-fit: contain !important;
          }

          /* Fixed absolute position for the invoice to fill page correctly */
          .invoice-container { 
            position: absolute !important; 
            left: 0 !important; 
            top: 0 !important; 
            width: 210mm !important; 
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
            background: white !important;
            color: black !important;
            border-radius: 0 !important;
            min-height: auto !important;
          }

          /* Compress vertical spacing further for 1-page fit */
          .invoice-container .p-8, 
          .invoice-container .sm\\:p-10 { 
            padding: 1rem !important; 
          }
          .invoice-container .space-y-8 > :not([hidden]) ~ :not([hidden]) { 
            margin-top: 1rem !important; 
          }
          .invoice-container .pt-8 { padding-top: 0.75rem !important; }
          .invoice-container .pb-8 { padding-bottom: 0.75rem !important; }
          
          /* Fix font weights for print */
          .font-black { font-weight: 800 !important; }
          .font-bold { font-weight: 700 !important; }
          
          /* Table fine-tuning for print */
          table { 
            border-collapse: collapse !important; 
            border: 1px solid #e2e8f0 !important; 
          }
          th { 
            border-bottom: 1px solid #e2e8f0 !important; 
            background-color: #f8fafc !important; 
          }
          td { 
            border-bottom: 1px solid #f1f5f9 !important; 
          }

          /* Explicitly force colored backgrounds in print */
          .bg-slate-50 { background-color: #f8fafc !important; }
          .bg-slate-100 { background-color: #f1f5f9 !important; }
          .bg-brand-accent { background-color: #3b82f6 !important; color: white !important; }
          
          /* Hide non-printable helpers */
          .no-print { display: none !important; }

          /* Prevent page breaks */
          .grid, table, .flex, div {
            page-break-inside: avoid !important;
          }

          /* PENTING: Override semua styling mobile untuk print/PDF - selalu gunakan layout desktop */
          .invoice-container .flex-row {
            flex-direction: row !important;
            justify-content: space-between !important;
            align-items: flex-start !important;
          }
          .invoice-container .text-right {
            text-align: right !important;
            align-items: flex-end !important;
          }
          .invoice-container .items-end {
            align-items: flex-end !important;
          }
          .invoice-container .justify-between {
            justify-content: space-between !important;
          }
          .invoice-container .grid-cols-2 {
            display: grid !important;
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
          .invoice-container .grid-cols-3 {
            display: grid !important;
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
          }
          .invoice-container .w-\\[280px\\] {
            width: 280px !important;
          }
          .invoice-container .shrink-0 {
            flex-shrink: 0 !important;
          }
          .invoice-container .flex-1 {
            flex: 1 1 0% !important;
          }
          .invoice-container .col-span-2 {
            grid-column: span 2 / span 2 !important;
            order: 0 !important;
            text-align: left !important;
          }
          .invoice-container .text-center {
            order: 0 !important;
            text-align: center !important;
          }
        }
        
        /* Override untuk force-desktop class - memaksa layout desktop dengan prioritas tertinggi */
        .invoice-container.force-desktop .flex-row,
        .invoice-container.force-desktop.flex-row {
          flex-direction: row !important;
          justify-content: space-between !important;
          align-items: flex-start !important;
        }
        .invoice-container.force-desktop .text-right,
        .invoice-container.force-desktop.text-right {
          text-align: right !important;
          align-items: flex-end !important;
        }
        .invoice-container.force-desktop .items-end {
          align-items: flex-end !important;
        }
        .invoice-container.force-desktop .justify-between {
          justify-content: space-between !important;
        }
        .invoice-container.force-desktop .grid-cols-2 {
          display: grid !important;
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
        }
        .invoice-container.force-desktop .grid-cols-3 {
          display: grid !important;
          grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
        }
        .invoice-container.force-desktop .w-\\[280px\\] {
          width: 280px !important;
          max-width: 280px !important;
        }
        .invoice-container.force-desktop .shrink-0 {
          flex-shrink: 0 !important;
        }
        .invoice-container.force-desktop .flex-1 {
          flex: 1 1 0% !important;
        }
        .invoice-container.force-desktop .col-span-2 {
          grid-column: span 2 / span 2 !important;
          order: 0 !important;
          text-align: left !important;
        }
        .invoice-container.force-desktop .text-center {
          order: 0 !important;
          text-align: center !important;
        }
        .invoice-container.force-desktop .gap-4 {
          gap: 1rem !important;
        }
        .invoice-container.force-desktop .gap-8 {
          gap: 2rem !important;
        }
        .invoice-container.force-desktop .gap-10 {
          gap: 2.5rem !important;
        }
        
        /* Tambahan Media Query untuk Mobile Preview SAJA (tidak untuk print/PDF) */
        @media screen and (max-width: 640px) {
          /* 1. Font lebih kecil */
          .invoice-container:not(.force-desktop) {
            font-size: 13px !important;
          }
          .invoice-container:not(.force-desktop) .text-3xl { font-size: 1.5rem !important; }
          .invoice-container:not(.force-desktop) .text-xl { font-size: 1.125rem !important; line-height: 1.4 !important; }
          .invoice-container:not(.force-desktop) .text-lg { font-size: 1.05rem !important; }
          .invoice-container:not(.force-desktop) p, 
          .invoice-container:not(.force-desktop) span, 
          .invoice-container:not(.force-desktop) th, 
          .invoice-container:not(.force-desktop) td {
            font-size: 0.95em !important;
          }
          
          /* 2. Margin kiri kanan lebih lega (mengurangi padding container) */
          .invoice-container:not(.force-desktop) .p-8, 
          .invoice-container:not(.force-desktop) .sm\\:p-10 {
            padding-left: 1.25rem !important;
            padding-right: 1.25rem !important;
            padding-top: 1.5rem !important;
            padding-bottom: 1.5rem !important;
          }

          /* 3. Spacing antar section lebih rapi */
          .invoice-container:not(.force-desktop) .space-y-8 > :not([hidden]) ~ :not([hidden]) {
            margin-top: 1.75rem !important;
          }
          .invoice-container:not(.force-desktop) .gap-8,
          .invoice-container:not(.force-desktop) .gap-10 {
            gap: 1.5rem !important;
          }

          /* 4. Tabel tidak terlalu lebar / penyesuaian untuk mobile */
          .invoice-container:not(.force-desktop) table {
            table-layout: auto !important;
            width: 100% !important;
          }
          .invoice-container:not(.force-desktop) th.px-4,
          .invoice-container:not(.force-desktop) td.px-4 {
            padding-left: 0.75rem !important;
            padding-right: 0.75rem !important;
          }
          .invoice-container:not(.force-desktop) th.w-\\[70\\%\\] { width: 60% !important; }
          .invoice-container:not(.force-desktop) th.w-\\[30\\%\\] { width: 40% !important; }

          /* 5. Penataan layout kolom menjadi baris menurun di mobile */
          .invoice-container:not(.force-desktop) .flex-row {
            flex-direction: column !important;
            align-items: flex-start !important;
          }
          .invoice-container:not(.force-desktop) .text-right {
            text-align: left !important;
            align-items: flex-start !important;
          }
          .invoice-container:not(.force-desktop) .grid-cols-2 {
            grid-template-columns: 1fr !important;
          }
          .invoice-container:not(.force-desktop) .w-\\[280px\\] {
            width: 100% !important;
          }
          
          /* 6. Penataan footer */
          .invoice-container:not(.force-desktop) .grid-cols-3 {
            grid-template-columns: 1fr !important;
            gap: 2rem !important;
          }
          .invoice-container:not(.force-desktop) .col-span-2 {
            grid-column: span 1 !important;
            order: 2; /* Teks dicetak otomatis pindah ke bawah */
            text-align: center;
          }
          .invoice-container:not(.force-desktop) .text-center {
            order: 1; /* Tanda tangan ke atas */
          }
        }
      `}} />
        </div>
    );
};

export default InvoiceDocument;
