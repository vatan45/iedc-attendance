import Link from "next/link";
import Image from "next/image";
import { ArrowRight, QrCode } from "lucide-react";

export default function Home() {
  return (
    <main className="relative flex flex-col items-center justify-center flex-1 min-h-screen p-6 text-center overflow-hidden bg-transparent">
      {/* Background Decor */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-accent/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-black/5 dark:bg-white/5 blur-[100px] pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center max-w-md w-full animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="bg-white p-4 rounded-3xl shadow-xl shadow-black/5 mb-8 flex items-center justify-center border border-gray-100">
          <Image 
            src="/logo.png" 
            alt="Chandigarh University & iEDC Logo" 
            width={240} 
            height={80} 
            style={{ width: "auto", height: "auto" }}
            className="object-contain w-full max-w-[240px]" 
            priority
            unoptimized
          />
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 text-accent font-semibold text-sm mb-6">
          <QrCode size={16} />
          <span>Smart Attendance</span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-foreground mb-4 leading-tight">
          Seamless <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-red-600">Access</span>
        </h1>
        
        <p className="text-lg text-foreground/70 mb-10 px-4">
          Experience frictionless entry with our new mobile-first QR tracking system.
        </p>

        <div className="w-full flex flex-col gap-4">
          <Link 
            href="/login" 
            className="group relative flex items-center justify-between w-full p-4 bg-foreground text-background rounded-2xl font-bold text-lg overflow-hidden transition-transform active:scale-[0.98] shadow-2xl shadow-foreground/20"
          >
            <span className="relative z-10 pl-2">Employee Login</span>
            <div className="relative z-10 bg-background/20 p-2 rounded-xl group-hover:translate-x-1 transition-transform">
              <ArrowRight size={20} />
            </div>
            {/* Hover glare effect */}
            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:animate-[shimmer_1.5s_infinite]" />
          </Link>
          
          <Link 
            href="/guest/scan" 
            className="group relative flex items-center justify-between w-full p-4 bg-white dark:bg-gray-800 text-foreground border-2 border-gray-200 dark:border-gray-700 rounded-2xl font-bold text-lg overflow-hidden transition-all active:scale-[0.98] hover:border-accent hover:text-accent shadow-sm"
          >
            <span className="relative z-10 pl-2">Guest Access</span>
            <div className="relative z-10 bg-gray-100 dark:bg-gray-700 group-hover:bg-accent/10 p-2 rounded-xl group-hover:translate-x-1 transition-colors">
              <ArrowRight size={20} className="group-hover:text-accent transition-colors" />
            </div>
          </Link>
        </div>
      </div>
    </main>
  );
}
