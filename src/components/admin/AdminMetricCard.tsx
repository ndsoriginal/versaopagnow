"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

type Props = {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: string;
    positive: boolean;
  };
  className?: string;
  iconClassName?: string;
};

const AdminMetricCard: React.FC<Props> = ({ title, value, subtitle, icon: Icon, trend, className, iconClassName }) => {
  return (
    <div className={cn("bg-[#0d0f14] border border-[#1c212b] rounded-3xl p-6 shadow-xl space-y-4", className)}>
      <div className="flex items-center justify-between">
        <div className={cn("p-3 rounded-2xl bg-white/5 text-gray-400", iconClassName)}>
          <Icon size={24} />
        </div>
        {trend && (
          <span className={cn(
            "text-[10px] font-black uppercase px-2 py-1 rounded-lg border",
            trend.positive ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-red-500/10 border-red-500/20 text-red-400"
          )}>
            {trend.value}
          </span>
        )}
      </div>
      <div>
        <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest block">{title}</span>
        <div className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1 break-words">{value}</div>
        {subtitle && <p className="text-[10px] text-gray-400 font-medium mt-1 uppercase">{subtitle}</p>}
      </div>
    </div>
  );
};

export default AdminMetricCard;