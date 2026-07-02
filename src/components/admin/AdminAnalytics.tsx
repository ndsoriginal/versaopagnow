"use client";

import React from "react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, LineChart, Line, AreaChart, Area,
  PieChart, Pie, Cell, Cell as ReCell
} from "recharts";
import { Trophy, TrendingUp, Clock, Calendar } from "lucide-react";

type Props = {
  charts: any;
  rankings: any;
  peaks: any;
};

const COLORS = ["#ffcc00", "#3b82f6", "#10b981", "#ef4444", "#8b5cf6"];

const AdminAnalytics: React.FC<Props> = ({ charts, rankings, peaks }) => {
  return (
    <div className="space-y-10 pb-20">
      {/* Rankings e Top Performers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-[#0d0f14] border border-[#1c212b] rounded-3xl p-8 shadow-xl">
          <div className="flex items-center gap-3 mb-8">
            <Trophy className="text-[#ffcc00]" size={24} />
            <h3 className="text-lg font-black uppercase tracking-tight italic">Top Depositantes</h3>
          </div>
          <div className="space-y-4">
            {rankings?.topDepositors?.map((u: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                <div className="flex items-center gap-4">
                  <span className="text-xs font-black text-gray-500 w-4">#{idx + 1}</span>
                  <div>
                    <div className="text-sm font-bold text-white truncate max-w-[120px] sm:max-w-[180px]">{u.email}</div>
                    <div className="text-[10px] text-gray-500 font-bold uppercase">{u.deposit_count} depósitos</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-black text-[#ffcc00]">R$ {Number(u.total_deposited).toFixed(2)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#0d0f14] border border-[#1c212b] rounded-3xl p-8 shadow-xl">
          <div className="flex items-center gap-3 mb-8">
            <TrendingUp className="text-blue-500" size={24} />
            <h3 className="text-lg font-black uppercase tracking-tight italic">Funil de Conversão</h3>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts?.funnel || []} layout="vertical" margin={{ left: 20 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 10, fontWeight: "bold" }} />
                <Tooltip 
                  cursor={{ fill: "transparent" }}
                  contentStyle={{ backgroundColor: "#13161d", border: "1px solid #1c212b", borderRadius: "12px", fontSize: "12px" }}
                />
                <Bar dataKey="value" fill="#ffcc00" radius={[0, 8, 8, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Gráficos Temporais */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-[#0d0f14] border border-[#1c212b] rounded-3xl p-8 shadow-xl">
          <h3 className="text-lg font-black uppercase tracking-tight italic mb-8">Depósitos vs Cadastros (Diário)</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={charts?.registrationsByDay || []}>
                <defs>
                  <linearGradient id="colorReg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ffcc00" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#ffcc00" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorDep" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1c212b" vertical={false} />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "#6b7280", fontSize: 10 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#6b7280", fontSize: 10 }} />
                <Tooltip contentStyle={{ backgroundColor: "#13161d", border: "1px solid #1c212b", borderRadius: "12px" }} />
                <Area type="monotone" dataKey="registrations" stroke="#ffcc00" fillOpacity={1} fill="url(#colorReg)" strokeWidth={3} name="Cadastros" />
                <Area type="monotone" dataKey="deposits" stroke="#3b82f6" fillOpacity={1} fill="url(#colorDep)" strokeWidth={3} name="Depósitos" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[#0d0f14] border border-[#1c212b] rounded-3xl p-8 shadow-xl">
          <h3 className="text-lg font-black uppercase tracking-tight italic mb-8">Distribuição de Valor</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={charts?.depositsAmountByDay || []}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {(charts?.depositsAmountByDay || []).map((entry: any, index: number) => (
                    <ReCell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
           <div className="grid grid-cols-2 gap-2 mt-4">
              {((charts?.depositsAmountByDay as any[]) || []).map((entry: any, i: number) => (
                <div key={i} className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span>{entry.name}</span>
                </div>
              ))}
           </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAnalytics;