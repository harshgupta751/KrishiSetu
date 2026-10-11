"use client";

import Link from "next/link";
import { Wheat, ArrowRight, Leaf, Sprout } from "lucide-react";
import { motion } from "framer-motion";

export default function RootPage() {
  return (
    <div className="min-h-screen bg-cropwise-bg flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Dynamic Background Elements */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-40 dark:opacity-20 flex items-center justify-center">
        <div className="absolute w-[800px] h-[800px] bg-cropwise-green/10 rounded-full blur-[120px] mix-blend-screen animate-spin-slow" />
        <div className="absolute w-[600px] h-[600px] bg-cropwise-amber/10 rounded-full blur-[100px] mix-blend-multiply translate-x-1/4 -translate-y-1/4" />
      </div>
      <div className="absolute inset-0 bg-cropwise-grid opacity-10 z-0 pointer-events-none" />

      <main className="z-10 flex flex-col items-center w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="relative mb-10 group"
        >
          <div className="absolute inset-0 bg-gradient-to-tr from-cropwise-green to-cropwise-green-light rounded-full blur-2xl opacity-40 group-hover:opacity-60 transition-opacity duration-500" />
          <div className="relative bg-cropwise-surface/80 backdrop-blur-xl p-6 rounded-full border border-cropwise-border shadow-2xl flex items-center justify-center">
            <Wheat className="w-14 h-14 text-cropwise-amber" strokeWidth={1.5} />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="text-center"
        >
          <h1 className="text-6xl md:text-8xl font-black text-cropwise-text mb-6 tracking-tight">
            Krishi
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cropwise-green to-cropwise-green-light">
              Setu
            </span>
          </h1>
          <p className="text-xl md:text-3xl text-cropwise-muted mb-12 font-light max-w-2xl mx-auto leading-relaxed">
            Smart Farming. Sustainable Future. <br className="hidden md:block" />
            <span className="font-medium text-cropwise-text">Prosperous Farmers.</span>
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col sm:flex-row items-center gap-4"
        >
          <Link
            href="/login"
            className="group relative inline-flex items-center justify-center gap-3 px-8 py-4 rounded-full font-semibold text-white overflow-hidden transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-xl hover:shadow-cropwise-green/25"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-cropwise-green to-cropwise-green-light" />
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-gradient-to-r from-cropwise-green-light to-cropwise-green transition-opacity duration-300" />
            <span className="relative z-10 flex items-center gap-2">
              Start Journey
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </span>
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.6 }}
          className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-3xl"
        >
          <div className="flex flex-col items-center text-center p-6 bg-cropwise-surface/50 backdrop-blur-sm rounded-2xl border border-cropwise-border/50">
            <Leaf className="w-6 h-6 text-cropwise-green mb-3" />
            <h3 className="text-cropwise-text font-medium mb-1">Precision Agriculture</h3>
            <p className="text-sm text-cropwise-faint">AI-driven insights for optimal yields</p>
          </div>
          <div className="flex flex-col items-center text-center p-6 bg-cropwise-surface/50 backdrop-blur-sm rounded-2xl border border-cropwise-border/50">
            <Sprout className="w-6 h-6 text-cropwise-green mb-3" />
            <h3 className="text-cropwise-text font-medium mb-1">Sustainable Growth</h3>
            <p className="text-sm text-cropwise-faint">Eco-friendly farming practices</p>
          </div>
          <div className="flex flex-col items-center text-center p-6 bg-cropwise-surface/50 backdrop-blur-sm rounded-2xl border border-cropwise-border/50">
            <Wheat className="w-6 h-6 text-cropwise-green mb-3" />
            <h3 className="text-cropwise-text font-medium mb-1">Market Ready</h3>
            <p className="text-sm text-cropwise-faint">Real-time market intel & pricing</p>
          </div>
        </motion.div>
      </main>
    </div>
  );
}