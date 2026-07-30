"use client";

import { useEffect, useState, useRef } from "react";
import QRCode from "qrcode";
import { jsPDF } from "jspdf";
import { getOfficeQRData, regenerateQRSecret } from "./actions";

export default function ReceptionQRPage() {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [officeName, setOfficeName] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const fetchQRData = async () => {
    setIsLoading(true);
    setError(null);
    const res = await getOfficeQRData();
    if (res.success && res.data) {
      setOfficeName(res.data.office_name);
      const payload = JSON.stringify({ 
        officeId: res.data.id, 
        qrSecret: res.data.qr_secret 
      });
      generateQRDataUrl(payload);
    } else {
      setError(res.error || "Failed to load QR data");
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQRData();
  }, []);

  const generateQRDataUrl = async (payload: string) => {
    try {
      // Generate a high-res QR code
      const url = await QRCode.toDataURL(payload, {
        width: 1000,
        margin: 2,
        color: {
          dark: '#111827', // text-gray-900
          light: '#FFFFFF'
        }
      });
      setQrDataUrl(url);
    } catch (err) {
      console.error(err);
      setError("Failed to generate QR image");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerate = async () => {
    if (!window.confirm("This will invalidate the current printed QR. You'll need to print and replace the physical copy at reception. Continue?")) {
      return;
    }
    
    setIsRegenerating(true);
    const res = await regenerateQRSecret();
    if (res.success && res.data) {
      const payload = JSON.stringify({ 
        officeId: res.data.id, 
        qrSecret: res.data.qr_secret 
      });
      await generateQRDataUrl(payload);
    } else {
      setError(res.error || "Failed to regenerate QR");
    }
    setIsRegenerating(false);
  };

  const downloadPNG = () => {
    if (!qrDataUrl || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set high-res canvas dimensions
    const width = 1200;
    const height = 1500;
    canvas.width = width;
    canvas.height = height;

    // Draw background and border
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, width, height);
    
    ctx.strokeStyle = "#E5E7EB"; // gray-200
    ctx.lineWidth = 10;
    ctx.strokeRect(20, 20, width - 40, height - 40);

    // Draw Office Name
    ctx.fillStyle = "#111827";
    ctx.font = "bold 60px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(officeName, width / 2, 150);

    // Load QR Image and draw it
    const img = new Image();
    img.onload = () => {
      // Draw QR centered
      const qrSize = 900;
      const qrX = (width - qrSize) / 2;
      const qrY = 250;
      ctx.drawImage(img, qrX, qrY, qrSize, qrSize);

      // Draw Caption
      ctx.fillStyle = "#4B5563"; // gray-600
      ctx.font = "36px Inter, sans-serif";
      ctx.fillText("Scan this code in the IEDC Attendance Portal", width / 2, height - 150);
      ctx.fillText("to mark your Entry / Exit.", width / 2, height - 90);

      // Trigger download
      const link = document.createElement("a");
      link.download = `IEDC-Attendance-Portal-${officeName.replace(/\s+/g, '-')}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    };
    img.src = qrDataUrl;
  };

  const downloadPDF = () => {
    if (!qrDataUrl) return;
    
    // Create A4 PDF (210 x 297 mm)
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    // Draw Border
    pdf.setDrawColor(229, 231, 235); // gray-200
    pdf.setLineWidth(1);
    pdf.rect(10, 10, 190, 277);

    // Add Office Name
    pdf.setTextColor(17, 24, 39); // gray-900
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(24);
    // @ts-ignore jsPDF type missing getWidth
    const textWidth = pdf.getStringUnitWidth(officeName) * pdf.internal.getFontSize() / pdf.internal.scaleFactor;
    pdf.text(officeName, (210 - textWidth) / 2, 40);

    // Add QR Code (centered, 10cm / 100mm)
    const qrSize = 100;
    const qrX = (210 - qrSize) / 2;
    pdf.addImage(qrDataUrl, "PNG", qrX, 60, qrSize, qrSize);

    // Add Caption
    pdf.setTextColor(75, 85, 99); // gray-600
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(14);
    
    const line1 = "Scan this code in the IEDC Attendance Portal";
    const line2 = "to mark your Entry / Exit.";
    
    // @ts-ignore
    const l1Width = pdf.getStringUnitWidth(line1) * pdf.internal.getFontSize() / pdf.internal.scaleFactor;
    // @ts-ignore
    const l2Width = pdf.getStringUnitWidth(line2) * pdf.internal.getFontSize() / pdf.internal.scaleFactor;
    
    pdf.text(line1, (210 - l1Width) / 2, 190);
    pdf.text(line2, (210 - l2Width) / 2, 200);

    pdf.save(`IEDC-Attendance-Portal-${officeName.replace(/\s+/g, '-')}.pdf`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <main className="px-6 pb-6 flex-1 max-w-4xl w-full mx-auto flex flex-col gap-6">
        <h1 className="text-2xl font-bold text-foreground">Reception QR Settings</h1>
        
        {error && (
           <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-100 text-sm font-medium">
             {error}
           </div>
        )}

        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm p-6 sm:p-8 flex flex-col lg:flex-row gap-10">
          
          {/* Left: Preview Card */}
          <div className="flex-1 flex flex-col items-center">
            <h2 className="text-xl font-bold mb-4 text-accent w-full">Print Preview</h2>
            <div className="w-full max-w-sm aspect-[4/5] bg-white border-2 border-gray-100 rounded-xl shadow-sm p-6 flex flex-col items-center justify-between text-center">
              <h3 className="text-2xl font-bold text-gray-900">{officeName || "Office"}</h3>
              
              {isLoading || !qrDataUrl ? (
                <div className="w-full aspect-square bg-gray-50 animate-pulse rounded-lg flex items-center justify-center">
                  <span className="text-gray-400 text-sm">Generating QR...</span>
                </div>
              ) : (
                <img src={qrDataUrl} alt="Reception QR Code" className="w-full h-auto" />
              )}
              
              <div className="text-gray-600 text-sm mt-4">
                <p>Scan this code in the IEDC Attendance Portal</p>
                <p>to mark your Entry / Exit.</p>
              </div>
            </div>
            
            {/* Hidden canvas for PNG generation */}
            <canvas ref={canvasRef} className="hidden" />
          </div>

          {/* Right: Actions */}
          <div className="flex-1 flex flex-col justify-center gap-6">
            <div>
              <h3 className="font-semibold text-lg mb-2">Export Options</h3>
              <p className="text-sm text-foreground/70 mb-4">
                Download and print this QR code. Stick it near your office entrance. The code is static and does not need to be updated daily.
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={downloadPDF}
                  disabled={!qrDataUrl || isLoading}
                  className="w-full bg-accent text-white font-medium py-3 rounded-xl hover:bg-accent-hover transition-colors disabled:opacity-50"
                >
                  Download Printable QR (PDF)
                </button>
                <button
                  onClick={downloadPNG}
                  disabled={!qrDataUrl || isLoading}
                  className="w-full bg-gray-100 dark:bg-gray-800 text-foreground font-medium py-3 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                >
                  Download Printable QR (PNG, high-res)
                </button>
              </div>
            </div>

            <div className="pt-6 border-t border-gray-100 dark:border-gray-800 mt-2">
              <h3 className="font-semibold text-sm mb-2 text-red-500">Danger Zone</h3>
              <p className="text-xs text-foreground/60 mb-4">
                Only regenerate this code if the physical printout was compromised or lost. Regenerating will permanently invalidate the current physical QR code.
              </p>
              <button
                onClick={handleRegenerate}
                disabled={isRegenerating || isLoading}
                className="w-full bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-medium py-2 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors text-sm disabled:opacity-50"
              >
                {isRegenerating ? "Regenerating..." : "Regenerate QR Code"}
              </button>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
