"use client";

import { useEffect, useState, useRef } from "react";
import QRCode from "qrcode";
import { jsPDF } from "jspdf";
import Header from "@/components/Header";
import { getOfficeQRData, regenerateQRSecret } from "./actions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, RefreshCcw, AlertCircle, FileText, Image as ImageIcon } from "lucide-react";

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
      const shortDomain = window.location.host;
      const shortSecret = res.data.qr_secret.split('-')[0];
      const urlPayload = `${shortDomain}/q/${shortSecret}`;
      generateQRDataUrl(urlPayload);
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
      const url = await QRCode.toDataURL(payload, {
        width: 1000,
        margin: 2,
        errorCorrectionLevel: 'L',
        color: {
          dark: '#111827',
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
    if (!window.confirm("This will invalidate the current printed QR. You will need to print and replace the physical copy at reception immediately. Continue?")) {
      return;
    }
    
    setIsRegenerating(true);
    const res = await regenerateQRSecret();
    if (res.success && res.data) {
      const shortDomain = window.location.host;
      const shortSecret = res.data.qr_secret.split('-')[0];
      const urlPayload = `${shortDomain}/q/${shortSecret}`;
      await generateQRDataUrl(urlPayload);
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

    const width = 1200;
    const height = 1500;
    canvas.width = width;
    canvas.height = height;

    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, width, height);
    
    ctx.strokeStyle = "#E5E7EB";
    ctx.lineWidth = 10;
    ctx.strokeRect(20, 20, width - 40, height - 40);

    ctx.fillStyle = "#111827";
    ctx.font = "bold 60px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(officeName, width / 2, 150);

    const img = new Image();
    img.onload = () => {
      const qrSize = 900;
      const qrX = (width - qrSize) / 2;
      const qrY = 250;
      ctx.drawImage(img, qrX, qrY, qrSize, qrSize);

      ctx.fillStyle = "#4B5563";
      ctx.font = "36px Inter, sans-serif";
      ctx.fillText("Scan this code in the IEDC Attendance Portal", width / 2, height - 150);
      ctx.fillText("to mark your Entry / Exit.", width / 2, height - 90);

      const link = document.createElement("a");
      link.download = `IEDC-Attendance-Portal-${officeName.replace(/\s+/g, '-')}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    };
    img.src = qrDataUrl;
  };

  const downloadPDF = () => {
    if (!qrDataUrl) return;
    
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    pdf.setDrawColor(229, 231, 235);
    pdf.setLineWidth(1);
    pdf.rect(10, 10, 190, 277);

    pdf.setTextColor(17, 24, 39);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(24);
    // @ts-ignore
    const textWidth = pdf.getStringUnitWidth(officeName) * pdf.internal.getFontSize() / pdf.internal.scaleFactor;
    pdf.text(officeName, (210 - textWidth) / 2, 40);

    const qrSize = 100;
    const qrX = (210 - qrSize) / 2;
    pdf.addImage(qrDataUrl, "PNG", qrX, 60, qrSize, qrSize);

    pdf.setTextColor(75, 85, 99);
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
    <div className="min-h-screen flex flex-col bg-transparent">
      <Header title="Reception QR Settings" />
      
      <main className="p-4 sm:p-6 flex-1 max-w-5xl w-full mx-auto flex flex-col gap-6 pb-16">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight">Reception QR Generator</h1>
          <p className="text-xs text-muted-foreground font-medium mt-0.5">Generate, print, or rotate physical entrance kiosk check-in code</p>
        </div>
        
        {error && (
          <Alert variant="destructive" className="rounded-2xl">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="font-semibold text-xs ml-2">{error}</AlertDescription>
          </Alert>
        )}

        <Card className="rounded-3xl border-border shadow-md p-6 sm:p-8 flex flex-col lg:flex-row gap-10 bg-card/90">
          
          {/* Left: Preview Card */}
          <div className="flex-1 flex flex-col items-center">
            <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4 w-full">Printable Poster Preview</h2>
            
            <div className="w-full max-w-sm aspect-[4/5] bg-white border-4 border-gray-100 rounded-2xl shadow-lg p-6 flex flex-col items-center justify-between text-center">
              <h3 className="text-2xl font-black text-gray-900 tracking-tight">{officeName || "IEDC Office"}</h3>
              
              {isLoading || !qrDataUrl ? (
                <Skeleton className="w-64 h-64 rounded-2xl bg-gray-100" />
              ) : (
                <img src={qrDataUrl} alt="Reception QR Code" className="w-64 h-64 rounded-xl shadow-inner border border-gray-100" />
              )}
              
              <div className="text-gray-600 text-xs font-semibold mt-4 space-y-1">
                <p>Scan this code in the IEDC Attendance Portal</p>
                <p className="font-extrabold text-gray-900">to mark your Entry / Exit.</p>
              </div>
            </div>
            
            <canvas ref={canvasRef} className="hidden" />
          </div>

          {/* Right: Actions */}
          <div className="flex-1 flex flex-col justify-center gap-6">
            <div>
              <h3 className="font-bold text-lg text-foreground mb-1">Export Poster Options</h3>
              <p className="text-xs text-muted-foreground mb-5 font-medium leading-relaxed">
                Download and print this QR code poster to display near your office entrance. The code is static and does not need to be refreshed daily unless security is compromised.
              </p>
              
              <div className="flex flex-col gap-3">
                <Button
                  onClick={downloadPDF}
                  disabled={!qrDataUrl || isLoading}
                  className="w-full bg-[#CE1126] hover:bg-[#b30f21] text-white font-bold h-12 rounded-xl shadow-md shadow-[#CE1126]/20 gap-2 text-xs"
                >
                  <FileText size={18} />
                  <span>Download Printable QR (A4 PDF)</span>
                </Button>
                
                <Button
                  onClick={downloadPNG}
                  variant="outline"
                  disabled={!qrDataUrl || isLoading}
                  className="w-full font-bold h-12 rounded-xl border-border bg-card hover:bg-muted text-foreground gap-2 text-xs"
                >
                  <ImageIcon size={18} className="text-muted-foreground" />
                  <span>Download High-Res QR (PNG Image)</span>
                </Button>
              </div>
            </div>

            <div className="pt-6 border-t border-border/60 mt-2">
              <h3 className="font-bold text-sm mb-1 text-destructive">Danger Zone: Rotate Secret</h3>
              <p className="text-[11px] text-muted-foreground mb-4 font-medium leading-relaxed">
                Only regenerate if your physical poster was duplicated or compromised by unauthorized visitors. Regenerating permanently invalidates existing printed QR codes.
              </p>
              <Button
                onClick={handleRegenerate}
                variant="destructive"
                disabled={isRegenerating || isLoading}
                className="w-full font-bold h-11 rounded-xl gap-2 text-xs"
              >
                <RefreshCcw size={16} className={isRegenerating ? "animate-spin" : ""} />
                <span>{isRegenerating ? "Regenerating Key..." : "Regenerate & Replace QR Secret"}</span>
              </Button>
            </div>
          </div>

        </Card>
      </main>
    </div>
  );
}
