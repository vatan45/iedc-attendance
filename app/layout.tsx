import type { Metadata } from "next";
import { Inter, Geist } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "IEDC Attendance Portal",
  description: "Minimalist office attendance system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn("h-full", "antialiased", inter.variable, "font-sans", geist.variable)}
    >
      <body className="min-h-full flex flex-col text-foreground font-sans relative">
        <TooltipProvider>
          <div 
            className="fixed inset-0 z-[-1] bg-[url('/background.webp')] bg-cover bg-center bg-no-repeat opacity-50 pointer-events-none" 
          />
          {/* Semi-transparent background overlay to ensure text readability if needed */}
          <div className="fixed inset-0 z-[-1] bg-background/80 pointer-events-none" />
          <div className="relative z-0 flex-1 flex flex-col min-h-full">
            {children}
          </div>
        </TooltipProvider>
      </body>
    </html>
  );
}
