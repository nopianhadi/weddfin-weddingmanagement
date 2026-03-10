import React, { useCallback, useEffect } from 'react';

interface PrintButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  areaId?: string;
  label?: string;
  title?: string;
  showPreview?: boolean;
  directPrint?: boolean; // Bypass print preview dialog
}

// Utility: detect :has() support for potential future enhancements
const supportsHasSelector = (() => {
  try {
    // @ts-ignore
    return CSS && CSS.supports && CSS.supports('selector(body:has(.x))');
  } catch {
    return false;
  }
})();

// Utility: detect direct print support
const supportsDirectPrint = (() => {
  try {
    // Check if browser supports iframe printing and direct print methods
    const ua = navigator.userAgent.toLowerCase();
    // Chrome, Firefox, Safari desktop support
    return !ua.includes('mobile') && (
      ua.includes('chrome') || 
      ua.includes('firefox') || 
      ua.includes('safari')
    );
  } catch {
    return false;
  }
})();

const PrintButton: React.FC<PrintButtonProps> = ({ areaId, label = 'Cetak', title, showPreview = false, directPrint = false, ...btnProps }) => {

  useEffect(() => {
    // Avoid mutating React-managed DOM during print. Only toggle a class and clean CSS vars.
    const before = () => {
      document.body.classList.add('printing');
    };

    const after = () => {
      document.body.classList.remove('printing');
      document.documentElement.style.removeProperty('--fit-scale');
    };

    window.addEventListener('beforeprint', before);
    window.addEventListener('afterprint', after);
    return () => {
      window.removeEventListener('beforeprint', before);
      window.removeEventListener('afterprint', after);
      document.body.classList.remove('printing');
      document.documentElement.style.removeProperty('--fit-scale');
    };
  }, [areaId]);

  const doSystemPrint = useCallback(() => {
    try {
      document.body.classList.add('printing');
      // Gunakan stylesheet global di app/index.css untuk print
      window.print();
    } finally {
      setTimeout(() => document.body.classList.remove('printing'), 300);
    }
  }, []);

  // Direct print function yang bypass print preview
  const doDirectPrint = useCallback((targetEl: HTMLElement) => {
    try {
      // Buat iframe tersembunyi untuk direct printing
      const iframe = document.createElement('iframe');
      iframe.style.position = 'absolute';
      iframe.style.left = '-9999px';
      iframe.style.top = '0';
      iframe.style.width = '1px';
      iframe.style.height = '1px';
      iframe.style.border = 'none';
      // Add sandbox attribute for security - allow necessary permissions for printing
      // Note: allow-same-origin and allow-scripts together can escape sandboxing, but required for print functionality
      iframe.setAttribute('sandbox', 'allow-same-origin allow-scripts allow-modals allow-popups');
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) {
        console.warn('Cannot access iframe document, falling back to system print');
        doSystemPrint();
        return;
      }

      const printContent = targetEl.cloneNode(true) as HTMLElement;
      
      // Clean up print content - remove non-printable elements
      printContent.querySelectorAll('.non-printable, button, .button-primary, .button-secondary').forEach(el => el.remove());
      
      // Enhanced print styles for direct printing - Import from main CSS
      const directPrintStyles = `
        @page { 
          size: A4 portrait; 
          margin: 2cm 2.5cm;
        }
        
        :root {
          --fit-scale: scale(1);
        }
        
        * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          box-sizing: border-box !important;
        }
        
        html, body { 
          font-family: 'Manrope', sans-serif !important;
          line-height: 1.15 !important;
          color: #000 !important;
          background: #fff !important;
          margin: 0 !important;
          padding: 0 !important;
          font-size: 12pt !important;
          width: 100% !important;
          height: auto !important;
        }
        
        .page-canvas {
          width: 160mm;
          height: 257mm;
          overflow: hidden;
          margin: 0 auto;
          position: relative;
        }

        #fitWrapper {
          width: 160mm;
          margin: 0 auto;
          transform-origin: top left !important;
        }
        
        #fitWrapper[data-fit-scale="true"] {
          transform: var(--fit-scale) !important;
        }
        
        .printable-content { 
          max-width: 100% !important;
          width: 100% !important;
          box-shadow: none !important;
          border: none !important;
          padding: 0 !important;
          margin: 0 !important;
          background: white !important;
          overflow: visible !important;
        }
        
        /* ==========================================================================
           ENHANCED DOCUMENT STYLING - INVOICE, RECEIPT, CONTRACT, BUKTI PEMBAYARAN
           ========================================================================== */
        
        /* ===== INVOICE STYLING - DYNAMIC NO BACKGROUND ===== */
        .print-invoice {
          font-family: 'Manrope', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif !important;
          background: transparent !important;
          color: #1e293b !important;
          line-height: 1.5 !important;
          font-size: 12pt !important;
        }
        
        .print-invoice .max-w-4xl {
          max-width: none !important;
          margin: 0 !important;
          background: transparent !important;
          padding: 0 !important;
          box-shadow: none !important;
          width: 100% !important;
        }
        
        .print-invoice header {
          display: flex !important;
          justify-content: space-between !important;
          align-items: flex-start !important;
          margin-bottom: 18pt !important;
          border-bottom: none !important;
          padding: 0 !important;
        }
        
        .print-invoice header img {
          height: 32pt !important;
          max-width: 32pt !important;
          object-fit: contain !important;
          margin-bottom: 6pt !important;
          border-radius: 4pt !important;
        }
        
        .print-invoice .printable-bg-blue {
          background: #3b82f6 !important;
          color: #ffffff !important;
          padding: 16pt !important;
          border-radius: 6pt !important;
          margin: 16pt 0 !important;
          box-shadow: 0 2px 4px -1px rgba(0, 0, 0, 0.1) !important;
        }
        
        /* Grid alignment for info sections and footer */
        .print-invoice .doc-header-grid {
          display: grid !important;
          grid-template-columns: 1fr 1fr !important;
          gap: 24pt !important;
          align-items: start !important;
        }
        
        .print-invoice .doc-footer-flex {
          display: grid !important;
          grid-template-columns: 1fr 1fr !important;
          gap: 32pt !important;
          align-items: start !important;
        }
        
        .print-invoice .invoice-totals {
          display: flex !important;
          flex-direction: column !important;
          align-items: flex-end !important;
        }
        
        .print-invoice .invoice-totals .flex {
          width: 180pt !important;
          min-width: 180pt !important;
        }
        
        /* Add colon and bold styling for totals */
        .print-invoice .invoice-totals span:first-child {
          font-weight: 600 !important;
          color: #0f172a !important;
          position: relative !important;
          padding-right: 8pt !important;
        }
        
        .print-invoice .invoice-totals span:first-child::after {
          content: " :" !important;
          color: #94a3b8 !important;
          font-weight: 700 !important;
          margin-left: 2pt !important;
        }
        
        .print-invoice .invoice-totals span:last-child {
          font-weight: 700 !important;
          color: #1e293b !important;
        }
        
        .print-invoice .invoice-totals .flex:last-child span:first-child,
        .print-invoice .invoice-totals .flex:last-child span:last-child {
          font-weight: 800 !important;
          color: #0f172a !important;
        }
        
        .print-invoice .invoice-table {
          width: 100% !important;
          border-collapse: collapse !important;
          margin: 16pt 0 !important;
          border: none !important;
        }
        
        .print-invoice .invoice-table-header th {
          padding: 9pt !important;
          font-size: 10pt !important;
          font-weight: 600 !important;
          color: #64748b !important;
          background: none !important;
          border-bottom: 2pt solid #e2e8f0 !important;
        }
        
        .print-invoice .invoice-table-body td {
          padding: 9pt !important;
          font-size: 10pt !important;
          vertical-align: top !important;
          border: none !important;
        }
        
        /* ===== RECEIPT STYLING ===== */
        .print-receipt {
          font-family: 'Manrope', 'Inter', sans-serif !important;
          background: #ffffff !important;
          color: #1e293b !important;
          line-height: 1.2 !important;
          font-size: 12pt !important;
        }
        
        .print-receipt header {
          text-align: center !important;
          margin-bottom: 12pt !important;
          padding-bottom: 8pt !important;
          border-bottom: 2px solid #059669 !important;
        }
        
        .print-receipt .printable-bg-green-light {
          background: linear-gradient(135deg, #d1fae5, #a7f3d0) !important;
          border: 2px solid #059669 !important;
          border-radius: 8pt !important;
          padding: 12pt !important;
          margin: 12pt 0 !important;
          text-align: center !important;
        }
        
        /* ===== GENERAL STYLING ===== */
        h1, h2, h3, h4, h5, h6 {
          color: #000 !important;
          page-break-after: avoid !important;
          margin-top: 0.8em !important;
          margin-bottom: 0.4em !important;
        }
        
        p { 
          margin: 0 0 8pt 0 !important;
          text-align: justify !important;
          font-size: 12pt !important;
          line-height: 1.2 !important;
        }
        
        table { 
          border-collapse: collapse !important; 
          width: 100% !important; 
          margin: 0.8em 0 !important;
        }
        
        th, td { 
          border: 1px solid #333 !important; 
          padding: 6px !important; 
          text-align: left !important;
          font-size: 10pt !important;
        }
        
        th {
          background-color: #f5f5f5 !important;
          font-weight: bold !important;
        }
        
        .avoid-break {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }
        
        .print-text-green {
          color: #059669 !important;
        }
        
        .printable-text-white {
          color: #ffffff !important;
        }
        
        button, input, select, textarea, .non-printable {
          display: none !important;
        }
      `;

      // Write HTML to iframe
      iframeDoc.open();
      iframeDoc.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>${title || 'Dokumen'}</title>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">
          <style>${directPrintStyles}</style>
        </head>
        <body>
          <div class="page-canvas" id="pageCanvas">
            <div class="fit-to-page" id="fitWrapper">
              ${printContent.innerHTML}
            </div>
          </div>
          <script>
            window.onload = function() {
              // Auto fit content
              function mmToPx(mm) {
                const el = document.createElement('div');
                el.style.width = mm + 'mm';
                el.style.position = 'absolute';
                el.style.visibility = 'hidden';
                document.body.appendChild(el);
                const px = el.getBoundingClientRect().width;
                document.body.removeChild(el);
                return px;
              }
              
              const printableWidthMM = 160, printableHeightMM = 257;
              const printableWidthPx = mmToPx(printableWidthMM);
              const printableHeightPx = mmToPx(printableHeightMM);
              const wrapper = document.getElementById('fitWrapper');
              const canvas = document.getElementById('pageCanvas');
              
              if (canvas) {
                canvas.style.width = printableWidthMM + 'mm';
                canvas.style.height = printableHeightMM + 'mm';
              }
              
              if (wrapper) {
                const rect = wrapper.getBoundingClientRect();
                const scaleX = printableWidthPx / rect.width;
                const scaleY = printableHeightPx / rect.height;
                const scale = Math.min(1, scaleX, scaleY);
                wrapper.setAttribute('data-fit-scale', 'true');
                document.documentElement.style.setProperty('--fit-scale', 'scale(' + scale + ')');
              }
              
              // Direct print tanpa dialog preview
              setTimeout(function() {
                try {
                  window.print();
                } catch (e) {
                  console.error('Direct print failed:', e);
                }
                // Cleanup iframe setelah print
                setTimeout(function() {
                  if (window.parent && window.parent.document.body.contains(window.frameElement)) {
                    window.parent.document.body.removeChild(window.frameElement);
                  }
                }, 1000);
              }, 500);
            };
          </script>
        </body>
        </html>
      `);
      iframeDoc.close();
      
    } catch (error) {
      console.error('Direct print error:', error);
      // Fallback to system print
      doSystemPrint();
    }
  }, [title, doSystemPrint]);

  const handlePrint = useCallback(() => {
    // If a specific area is requested, ensure it's properly targeted
    let targetEl: HTMLElement | null = null;
    
    if (areaId) {
      targetEl = document.getElementById(areaId);
      if (!targetEl) {
        // Try to find by class if ID not found
        targetEl = document.querySelector('.printable-area');
      }
      
      if (!targetEl) {
        console.warn('Print target not found, falling back to system print');
        doSystemPrint();
        return;
      }
    }

    // Check if direct print is enabled and supported
    if (directPrint && targetEl) {
      if (supportsDirectPrint) {
        doDirectPrint(targetEl);
        return;
      } else {
        console.warn('Direct print not supported on this browser/device, using system print');
        // Fallback to enhanced system print without opening new window
        document.body.classList.add('printing');
        try {
          window.print();
        } finally {
          setTimeout(() => document.body.classList.remove('printing'), 300);
        }
        return;
      }
    }

    // Enhanced print handling for specific areas
    if (targetEl) {
      // Create a clean print window
      const printWindow = window.open('', '_blank', 'width=800,height=600');
      if (printWindow) {
        const printContent = targetEl.cloneNode(true) as HTMLElement;
        
        // Clean up print content - remove non-printable elements
        printContent.querySelectorAll('.non-printable, button, .button-primary, .button-secondary').forEach(el => el.remove());
        
        // Enhanced print styles for better formatting that matches on-screen design
        const printStyles = `
          @page { 
            size: A4 portrait; 
            margin: 2cm 2.5cm; /* Indonesian standard: 2cm top/bottom, 2.5cm left/right */
          }
          
          :root {
            --fit-scale: scale(1);
          }
          
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            box-sizing: border-box !important;
          }
          
          html, body { 
            font-family: 'Manrope', sans-serif !important;
            line-height: 1.15 !important; /* Indonesian standard line spacing */
            color: #000 !important;
            background: #fff !important;
            margin: 0 !important;
            padding: 0 !important;
            font-size: 12pt !important; /* Standard document font size */
            width: 100% !important;
            height: auto !important;
          }
          
          /* Page canvas ensures we stay within a single A4 page printable area */
          .page-canvas {
            width: 160mm;
            height: 257mm; /* 297mm - 20mm - 20mm */
            overflow: hidden;
            margin: 0 auto;
            position: relative;
          }

          /* The wrapper holds the actual document content at the exact printable width */
          #fitWrapper {
            width: 160mm; /* A4 width (210mm) - 25mm - 25mm = 160mm */
            margin: 0 auto; /* center within printable area */
            transform-origin: top left !important;
          }
          
          /* When scaling is needed to fit height, apply the transform */
          #fitWrapper[data-fit-scale="true"] {
            transform: var(--fit-scale) !important;
          }
          
          .printable-content { 
            max-width: 100% !important;
            width: 100% !important;
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
            background: white !important;
            overflow: visible !important;
          }
          
          img, svg {
            max-width: 100% !important;
            height: auto !important;
          }
          
          h1, h2, h3, h4, h5, h6 {
            color: #000 !important;
            page-break-after: avoid !important;
            margin-top: 0.8em !important;
            margin-bottom: 0.4em !important;
            font-family: inherit !important;
          }
          
          h2 { 
            font-size: 16pt !important; 
            text-align: center !important; 
            font-weight: bold !important;
            margin-bottom: 0.2em !important;
          }
          h3 { 
            font-size: 14pt !important; 
            text-align: center !important; 
            font-weight: bold !important;
            margin-bottom: 1em !important;
          }
          h4 { 
            font-size: 12pt !important; 
            font-weight: bold !important; 
            text-align: center !important;
            margin: 0.8em 0 0.4em 0 !important;
          }
          
          p { 
            margin: 0 0 8pt 0 !important; /* 8pt spacing after paragraphs */
            text-align: justify !important;
            orphans: 2 !important;
            widows: 2 !important;
            font-size: 12pt !important;
            line-height: 1.2 !important; /* Indonesian standard line spacing */
          }
          
          .my-4 {
            margin: 0.8em 0 !important;
          }
          
          .mt-6 {
            margin-top: 1.2em !important;
          }
          
          .space-y-4 > * + * {
            margin-top: 0.8em !important;
          }
          
          table { 
            border-collapse: collapse !important; 
            width: 100% !important; 
            margin: 0.8em 0 !important;
            page-break-inside: avoid !important;
          }
          
          thead { display: table-header-group !important; }
          tfoot { display: table-footer-group !important; }
          tr { page-break-inside: avoid !important; break-inside: avoid !important; }
          
          th, td { 
            border: 1px solid #333 !important; 
            padding: 6px !important; 
            text-align: left !important;
            vertical-align: top !important;
            font-size: 10pt !important;
          }
          
          th {
            background-color: #f5f5f5 !important;
            font-weight: bold !important;
          }
          
          .avoid-break, 
          .signature-section,
          section { 
            page-break-inside: avoid !important; 
          }
          
          .signature-section {
            margin-top: 1.5em !important;
            padding-top: 0.8em !important;
            border-top: 2px solid #333 !important;
            page-break-inside: avoid !important;
          }
          
          .signature-area {
            display: inline-block !important;
            width: 45% !important;
            text-align: center !important;
            vertical-align: top !important;
            margin: 0 2.5% !important;
          }
          
          .signature-area img {
            max-height: 30px !important;
            max-width: 80px !important;
            object-fit: contain !important;
          }
          
          .signature-area p {
            font-size: 10pt !important;
            margin: 0.2em 0 !important;
          }
          
          .border-t-2 {
            border-top: 2px dotted #333 !important;
            padding-top: 0.2em !important;
            margin-top: 0.5em !important;
          }
          
          .printable-bg-blue { 
            background-color: #2563eb !important; 
            color: white !important;
          }
          
          .printable-text-white { 
            color: #ffffff !important; 
          }
          
          .print-text-green { 
            color: #16a34a !important; 
          }
          
          /* Hide any remaining interactive elements */
          button, input, select, textarea,
          .non-printable {
            display: none !important;
          }
          
          /* Ensure proper flex layout for signatures */
          .flex {
            display: flex !important;
          }
          
          .justify-between {
            justify-content: space-between !important;
          }
          
          .items-start {
            align-items: flex-start !important;
          }
          
          .text-center {
            text-align: center !important;
          }
          
          .font-bold {
            font-weight: bold !important;
          }
          
          .text-xs {
            font-size: 9pt !important;
          }
          
          .italic {
            font-style: italic !important;
          }
        `;
        
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <title>${title || 'Dokumen Kontrak'}</title>
            ${(() => {
              try {
                const collected = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
                  .map(el => (el as HTMLElement).outerHTML)
                  .join('\n');
                // Ensure Manrope font is available in the print window
                const fontLinks = `
                  <link rel="preconnect" href="https://fonts.googleapis.com">
                  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                  <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">
                `;
                return fontLinks + collected;
              } catch { return ''; }
            })()}
            <style>${printStyles}</style>
          </head>
          <body>
            <div class="page-canvas" id="pageCanvas"><div class="fit-to-page" id="fitWrapper">${printContent.innerHTML}</div></div>
            <script>
              (function() {
                function mmToPx(mm) {
                  const el = document.createElement('div');
                  el.style.width = mm + 'mm';
                  el.style.position = 'absolute';
                  el.style.visibility = 'hidden';
                  document.body.appendChild(el);
                  const px = el.getBoundingClientRect().width;
                  document.body.removeChild(el);
                  return px;
                }
                async function ready() {
                  try {
                    if (document.fonts && document.fonts.ready) {
                      await document.fonts.ready;
                    }
                  } catch {}
                  try {
                    const images = Array.from(document.images || []);
                    await Promise.all(images.map(img => (img.decode ? img.decode().catch(()=>{}) : Promise.resolve())));
                  } catch {}
                }
                async function fit() {
                  // A4 printable area: width 160mm, height 257mm (after 25mm L/R and 20mm T/B)
                  var printableWidthMM = 160, printableHeightMM = 257;
                  const printableWidthPx = mmToPx(printableWidthMM);
                  const printableHeightPx = mmToPx(printableHeightMM);
                  const wrapper = document.getElementById('fitWrapper');
                  const canvas = document.getElementById('pageCanvas');
                  if (canvas) {
                    canvas.style.width = printableWidthMM + 'mm';
                    canvas.style.height = printableHeightMM + 'mm';
                    canvas.style.overflow = 'hidden';
                    canvas.style.margin = '0 auto';
                  }
                  if (wrapper) {
                    const rect = wrapper.getBoundingClientRect();
                    const scaleX = printableWidthPx / rect.width;
                    const scaleY = printableHeightPx / rect.height;
                    const scale = Math.min(1, scaleX, scaleY);
                    wrapper.setAttribute('data-fit-scale', 'true');
                    document.documentElement.style.setProperty('--fit-scale', 'scale(' + scale + ')');
                  }
                  (window as any).__fitReady = true;
                }
                window.addEventListener('load', function(){ ready().then(fit); });
              })();
            </script>
          </body>
          </html>
        `);
        
        printWindow.document.close();
        
        // Wait for content to load before printing
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.focus();
            printWindow.print();
            
            // Close window after printing (with delay for print dialog)
            setTimeout(() => {
              printWindow.close();
            }, 1000);
          }, 800);
        };
        
        return;
      }
    }

    // Fallback to system print if window creation fails
    console.warn('Could not create print window, using system print');
    doSystemPrint();
  }, [areaId, title, directPrint, doSystemPrint, doDirectPrint]);

  return (
    <button type="button" onClick={handlePrint} className="button-primary inline-flex items-center gap-2" {...btnProps}>
      {label}
    </button>
  );
};

export default PrintButton;
