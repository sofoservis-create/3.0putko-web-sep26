import './fonts.css';
import asset0 from "./assets/lp-04-hero.png";
import asset1 from "./assets/lp-04-product.png";

import React from 'react';
import { ShoppingBag, Search, Menu, ArrowRight, Star, Leaf, Droplets, Coffee } from 'lucide-react';

export function Lp04() {
  return (
    <div 
      style={{ width: "100%", height: "100%", overflow: 'hidden' }} 
      className="bg-[#faf7f2] text-[#2c2420] relative flex flex-col font-['Inter']"
    >
      {/* Decorative Background Elements */}
      <div className="absolute top-0 right-0 w-2/3 h-full bg-[#f2ebd9] rounded-l-[200px] -mr-[100px] -mt-[100px] pointer-events-none" />
      
      {/* Navigation */}
      <nav className="relative z-10 w-full px-12 py-8 flex items-center justify-between">
        <div className="flex items-center gap-12">
          <div className="text-3xl font-['Playfair_Display'] font-bold tracking-tight">EmberOak.</div>
          <div className="hidden md:flex gap-8 text-sm font-medium tracking-wide text-[#5c4d43]">
            <a href="#" className="hover:text-[#2c2420] transition-colors">Shop Coffee</a>
            <a href="#" className="hover:text-[#2c2420] transition-colors">Our Story</a>
            <a href="#" className="hover:text-[#2c2420] transition-colors">Brew Guides</a>
            <a href="#" className="hover:text-[#2c2420] transition-colors">Wholesale</a>
          </div>
        </div>
        <div className="flex items-center gap-6 text-[#5c4d43]">
          <Search className="w-5 h-5 cursor-pointer hover:text-[#2c2420] transition-colors" />
          <div className="relative cursor-pointer hover:text-[#2c2420] transition-colors">
            <ShoppingBag className="w-5 h-5" />
            <span className="absolute -top-1.5 -right-2 bg-[#b65f33] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">2</span>
          </div>
          <Menu className="w-6 h-6 md:hidden cursor-pointer" />
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative z-10 flex-1 px-12 flex items-center">
        <div className="w-full flex justify-between items-center gap-16">
          
          {/* Left Column - Text */}
          <div className="w-[500px] flex flex-col gap-8 pb-12">
            <div className="inline-flex items-center gap-2 bg-[#f2ebd9] px-4 py-1.5 rounded-full w-max text-sm font-semibold text-[#b65f33] tracking-wide">
              <Star className="w-4 h-4 fill-current" />
              <span>New Single-Origin Arrival</span>
            </div>
            
            <h1 className="text-7xl font-['Playfair_Display'] font-extrabold leading-[1.05] tracking-tight text-[#2c2420]">
              Roasted <br />
              with fire. <br />
              <span className="text-[#b65f33] font-medium">Rooted in craft.</span>
            </h1>
            
            <p className="text-lg text-[#5c4d43] leading-relaxed max-w-[420px]">
              Small-batch coffee ethically sourced from high-altitude farms. We roast over open oak embers to unlock deep, complex flavor profiles you won't find anywhere else.
            </p>
            
            <div className="flex items-center gap-6 pt-4">
              <button className="bg-[#2c2420] hover:bg-[#1a1512] text-white px-8 py-4 rounded-full font-semibold tracking-wide transition-all flex items-center gap-3 group">
                Shop The Roast
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <button className="text-[#2c2420] font-semibold tracking-wide hover:text-[#b65f33] transition-colors underline underline-offset-4 decoration-2">
                Discover our process
              </button>
            </div>
            
            <div className="flex gap-8 pt-8 border-t border-[#e6dcc5] mt-4">
              <div className="flex flex-col gap-1">
                <span className="text-2xl font-bold text-[#2c2420]">48h</span>
                <span className="text-xs text-[#5c4d43] font-medium uppercase tracking-wider">From roast to ship</span>
              </div>
              <div className="w-px bg-[#e6dcc5]"></div>
              <div className="flex flex-col gap-1">
                <span className="text-2xl font-bold text-[#2c2420]">12+</span>
                <span className="text-xs text-[#5c4d43] font-medium uppercase tracking-wider">Partner Farms</span>
              </div>
              <div className="w-px bg-[#e6dcc5]"></div>
              <div className="flex flex-col gap-1">
                <span className="text-2xl font-bold text-[#2c2420]">100%</span>
                <span className="text-xs text-[#5c4d43] font-medium uppercase tracking-wider">Ethical Trade</span>
              </div>
            </div>
          </div>
          
          {/* Right Column - Imagery */}
          <div className="relative w-[600px] h-[650px] mr-8">
            <div className="absolute top-0 right-0 w-[500px] h-[550px] rounded-t-full rounded-b-[40px] overflow-hidden shadow-2xl">
              <img 
                src={asset0} 
                alt="Coffee pouring" 
                className="w-full h-full object-cover"
              />
            </div>
            
            <div className="absolute bottom-0 left-0 w-[280px] h-[360px] bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] p-4 transform -rotate-3 hover:rotate-0 transition-transform duration-500 z-20">
              <div className="w-full h-[240px] bg-[#f8f5f0] rounded-xl overflow-hidden relative">
                <img 
                  src={asset1} 
                  alt="EmberOak Coffee Bag" 
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-3 left-3 bg-white/90 backdrop-blur px-2.5 py-1 rounded text-[10px] font-bold tracking-wider uppercase text-[#b65f33]">
                  Bestseller
                </div>
              </div>
              <div className="mt-4 px-2">
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-['Playfair_Display'] font-bold text-lg">Ethiopia Yirgacheffe</h3>
                  <span className="font-semibold text-[#b65f33]">$24.00</span>
                </div>
                <p className="text-xs text-[#5c4d43]">Jasmine • Blueberry • Honey</p>
              </div>
            </div>
            
            {/* Floating Badge */}
            <div className="absolute top-20 -left-12 bg-white rounded-full p-4 shadow-xl flex items-center gap-4 z-20 animate-bounce" style={{ animationDuration: '3s' }}>
              <div className="w-12 h-12 bg-[#b65f33] rounded-full flex items-center justify-center text-white">
                <Coffee className="w-6 h-6" />
              </div>
              <div className="pr-4">
                <div className="text-sm font-bold text-[#2c2420]">Fresh Batch</div>
                <div className="text-xs text-[#5c4d43]">Roasted Today</div>
              </div>
            </div>
          </div>
          
        </div>
      </main>
      
      {/* Bottom Features Bar */}
      <div className="absolute bottom-0 left-0 w-full bg-[#2c2420] text-white py-4 px-12 flex justify-between items-center z-30">
        <div className="flex items-center gap-3">
          <Leaf className="w-5 h-5 text-[#b65f33]" />
          <span className="text-sm font-medium tracking-wide text-[#e6dcc5]">Certified Organic</span>
        </div>
        <div className="flex items-center gap-3">
          <Droplets className="w-5 h-5 text-[#b65f33]" />
          <span className="text-sm font-medium tracking-wide text-[#e6dcc5]">Washed & Natural Process</span>
        </div>
        <div className="flex items-center gap-3">
          <Star className="w-5 h-5 text-[#b65f33]" />
          <span className="text-sm font-medium tracking-wide text-[#e6dcc5]">90+ Cupping Score</span>
        </div>
        <div className="text-sm font-medium text-[#b65f33] cursor-pointer hover:text-white transition-colors">
          View Quality Report &rarr;
        </div>
      </div>
    </div>
  );
}

// Needed to match spec exact naming:
export { Lp04 as 'lp-04' };
