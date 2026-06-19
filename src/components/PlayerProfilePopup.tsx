"use client";

import React from "react";
import { X, User, Phone, Wallet, History, ShieldCheck, Save, Landmark } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { showSuccess, showError } from "@/utils/toast";
import { fetchUserBalance } from "@/utils/balance";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

type ProfileData = {
  id: string;
  email: string;
  name: string;
  phone: string;
  balance: number;
};

export default function PlayerProfilePopup({ open, onClose, profile: initialProfile, onOpenWithdraw }: { open: boolean; onClose: () => void; profile: any; onOpenWithdraw: () => void }) {
  const isMobile = useIsMobile();
  const [loading, setLoading] = React.useState(false);
  const [data, setData] = React.useState<ProfileData>({
    id: initialProfile.id,
    email: initialProfile.email || "",
    name: initialProfile.name || "",
    phone: "",
    balance: 0,
  });

  React.useEffect(() => {
    if (open && initialProfile.id) {
      fetchData();
    }
  }, [open, initialProfile.id]);

  const fetchData = async () => {
    try {
      const bal = await fetchUserBalance(initialProfile.id);
      const { data: p } = await supabase.from("profiles").select("first_name, phone").eq("id", initialProfile.id).maybeSingle();

      setData(prev => ({
        ...prev,
        balance: bal,
        name: p?.first_name || prev.name,
        phone: p?.phone || "",
      }));
    } catch (err) {
      console.error("Erro ao carregar perfil:", err);
    }
  };

  const handleUpdate = async () => {
    setLoading(true);
    try {
      const { error: pErr } = await supabase.from("profiles").upsert({
        id: data.id,
        first_name: data.name,
        phone: data.phone,
        updated_at: new Date().toISOString(),
      });

      if (pErr) throw pErr;

      showSuccess("Perfil atualizado com sucesso!");
    } catch (err: any) {
      showError("Erro ao salvar: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className={cn("w-full rounded-3xl bg-[#0d0f14] border border-[#1c212b] shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col", isMobile ? "max-w-full h-full rounded-none" : "max-w-2xl overflow-hidden")}>

        <div className="flex items-center justify-between bg-[#13161d] px-6 py-4 border-b border-[#1c212b]">
          <div className="flex items-center gap-3">
            <div className="bg-[#ffcc00] p-2 rounded-xl">
              <User size={20} className="text-black" />
            </div>
            <h2 className="text-lg font-bold text-white uppercase tracking-tight">Minha Conta</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          <Tabs defaultValue="perfil" className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-[#06070a] border border-[#1c212b] rounded-xl sm:h-12 p-1">
              <TabsTrigger value="perfil" className="rounded-lg data-[state=active]:bg-[#1c212b] data-[state=active]:text-[#ffcc00] text-[10px] sm:text-sm px-1 sm:px-3">
                <User size={14} className="sm:mr-2" /> <span className="hidden sm:inline">Geral</span>
              </TabsTrigger>
              <TabsTrigger value="financeiro" className="rounded-lg data-[state=active]:bg-[#1c212b] data-[state=active]:text-[#ffcc00] text-[10px] sm:text-sm px-1 sm:px-3">
                <Wallet size={14} className="sm:mr-2" /> <span className="hidden sm:inline">Carteira</span>
              </TabsTrigger>
              <TabsTrigger value="seguranca" className="rounded-lg data-[state=active]:bg-[#1c212b] data-[state=active]:text-[#ffcc00] text-[10px] sm:text-sm px-1 sm:px-3">
                <ShieldCheck size={14} className="sm:mr-2" /> <span className="hidden sm:inline">Segurança</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="perfil" className="mt-6 space-y-6">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase ml-1">E-mail (Login)</label>
                  <input type="text" value={data.email} readOnly className="w-full bg-[#06070a] border border-[#1c212b] rounded-xl px-4 py-3 text-sm text-gray-400 cursor-not-allowed"/>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase ml-1">Nome Completo</label>
                  <input type="text" placeholder="Seu nome" value={data.name} onChange={(e) => setData({ ...data, name: e.target.value })} className="w-full bg-[#06070a] border border-[#1c212b] rounded-xl px-4 py-3 text-sm text-white focus:border-[#ffcc00] focus:outline-none transition-all"/>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase ml-1">Telefone / WhatsApp</label>
                  <div className="relative">
                    <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input type="text" placeholder="(00) 00000-0000" value={data.phone} onChange={(e) => setData({ ...data, phone: e.target.value })} className="w-full bg-[#06070a] border border-[#1c212b] rounded-xl pl-11 pr-4 py-3 text-sm text-white focus:border-[#ffcc00] focus:outline-none transition-all"/>
                  </div>
                </div>
              </div>
              <div className="pt-4 border-t border-[#1c212b]">
                <button onClick={handleUpdate} disabled={loading} className="w-full md:w-auto bg-[#ffcc00] hover:bg-[#ffdb4d] text-black font-black py-4 px-10 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50">
                  <Save size={18} />
                  {loading ? "SALVANDO..." : "SALVAR ALTERAÇÕES"}
                </button>
              </div>
            </TabsContent>

            <TabsContent value="financeiro" className="mt-6 space-y-6">
              <div className="bg-[#06070a] border border-[#1c212b] rounded-2xl p-6 flex flex-col items-center justify-center text-center">
                <div className="text-gray-500 text-sm font-bold uppercase mb-2">Saldo Disponível</div>
                <div className="text-3xl font-black text-white">R$ {data.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                <div className="mt-6 flex gap-3 w-full">
                  <button
                    onClick={() => {
                      onClose();
                      onOpenWithdraw();
                    }}
                    className="flex-1 bg-white hover:bg-gray-100 text-black font-black py-4 rounded-xl flex items-center justify-center gap-2 transition-all"
                  >
                    <Landmark size={18} />
                    SACAR VIA PIX
                  </button>
                </div>
              </div>
              <div className="bg-[#13161d] border border-[#1c212b] rounded-2xl p-4">
                <div className="flex items-center justify-between text-xs font-bold text-gray-500 uppercase mb-4">
                  <span>Histórico Recente</span>
                  <History size={14} />
                </div>
                <div className="text-center py-4 text-sm text-gray-600 italic">Nenhuma transação encontrada.</div>
              </div>
            </TabsContent>

            <TabsContent value="seguranca" className="mt-6">
               <div className="space-y-4">
                 <div className="bg-[#13161d] p-4 rounded-xl border border-[#1c212b] flex items-center justify-between">
                   <div>
                     <div className="text-sm font-bold text-white">Autenticação em duas etapas</div>
                     <div className="text-xs text-gray-500">Proteja sua conta com segurança extra.</div>
                   </div>
                   <div className="w-10 h-5 bg-gray-700 rounded-full relative"><div className="absolute left-1 top-1 w-3 h-3 bg-gray-500 rounded-full" /></div>
                 </div>
                 <button className="w-full bg-[#1c212b] text-white py-3 rounded-xl text-sm font-bold border border-[#2d3644] hover:bg-[#262c3a] transition-all">ALTERAR SENHA</button>
               </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}