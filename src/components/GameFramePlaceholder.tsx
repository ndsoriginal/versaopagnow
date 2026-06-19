"use client";

import React from "react";
import { cn } from "@/lib/utils";

export default function GameFramePlaceholder() {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center min-h-[400px] bg-[#0d0f14] border border-[#1c212b] rounded-2xl p-6 shadow-2xl text-center",
      "space-y-4"
    )}>
      <span className="text-[#ffcc00] text-lg font-medium">Demo em carregamento</span>
      <p className="text-gray-400">
        Configure aqui o link oficial ou API autorizada do provedor.
      </p>
    </div>
  );
}