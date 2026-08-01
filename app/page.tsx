import Link from "next/link";
import Image from "next/image";
import { ArrowRight, QrCode, ShieldCheck, Zap } from "lucide-react";
import { BackgroundBeams } from "@/components/ui/background-beams";
import { AnimatedGradientText } from "@/components/ui/animated-gradient-text";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="relative flex flex-col items-center justify-center flex-1 min-h-screen p-6 text-center overflow-hidden bg-transparent">
      {/* Aceternity Animated Background Beams */}
      <BackgroundBeams />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center max-w-lg w-full animate-in fade-in slide-in-from-bottom-6 duration-700">
        <div className="bg-white/90 backdrop-blur-xl p-5 rounded-3xl shadow-2xl shadow-black/5 mb-8 flex items-center justify-center border border-white/40 dark:bg-zinc-900/90 dark:border-zinc-800 transition-all duration-300 hover:scale-105">
          <Image 
            src="/logo.png" 
            alt="Chandigarh University & iEDC Logo" 
            width={260} 
            height={85} 
            style={{ width: "auto", height: "auto" }}
            className="object-contain w-full max-w-[260px]" 
            priority
            unoptimized
          />
        </div>

        <Badge variant="secondary" className="px-3.5 py-1.5 rounded-full text-sm font-semibold mb-6 shadow-sm border border-border/50 gap-2 flex items-center text-foreground/80">
          <Zap size={15} className="text-[#CE1126] fill-[#CE1126]/20 animate-pulse" />
          <span>Next-Gen Smart Attendance</span>
        </Badge>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-foreground mb-4 leading-[1.15]">
          Seamless <AnimatedGradientText>Access & Tracking</AnimatedGradientText>
        </h1>
        
        <p className="text-base sm:text-lg text-muted-foreground mb-10 px-4 max-w-md font-medium leading-relaxed">
          Experience frictionless entry with our intelligent location-verified QR attendance network.
        </p>

        <div className="w-full max-w-sm flex flex-col gap-3.5">
          <Link href="/login" className="w-full group">
            <Button 
              className="w-full h-14 bg-[#CE1126] hover:bg-[#b30f21] text-white rounded-2xl font-bold text-lg shadow-xl shadow-[#CE1126]/25 transition-all duration-300 group-hover:shadow-2xl group-hover:shadow-[#CE1126]/35 active:scale-[0.98] flex items-center justify-between px-6"
            >
              <span className="flex items-center gap-2">
                <ShieldCheck size={20} className="opacity-90" />
                Employee Portal
              </span>
              <div className="bg-white/20 p-2 rounded-xl group-hover:translate-x-1.5 transition-transform duration-200">
                <ArrowRight size={18} />
              </div>
            </Button>
          </Link>
          
          <Link href="/guest/scan" className="w-full group">
            <Button 
              variant="outline"
              className="w-full h-14 bg-card hover:bg-muted/80 text-foreground border-2 border-border/80 rounded-2xl font-semibold text-lg transition-all duration-200 active:scale-[0.98] flex items-center justify-between px-6 shadow-sm group-hover:border-[#CE1126]/40 group-hover:text-[#CE1126]"
            >
              <span className="flex items-center gap-2">
                <QrCode size={20} className="text-muted-foreground group-hover:text-[#CE1126] transition-colors" />
                Guest Access
              </span>
              <div className="bg-muted p-2 rounded-xl group-hover:translate-x-1 transition-all duration-200 group-hover:bg-[#CE1126]/10">
                <ArrowRight size={18} className="text-muted-foreground group-hover:text-[#CE1126] transition-colors" />
              </div>
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
