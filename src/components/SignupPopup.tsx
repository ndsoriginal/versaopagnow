"use client";

import React from "react";
import { X, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { trackRegistration } from "@/utils/metaPixel";
import { useModal } from "@/hooks/useModal";

type Props = {
  open: boolean;
  onClose: () => void;
};

const SignupPopup: React.FC<Props> = ({ open, onClose }) => {
  useModal(open);
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [errors, setErrors] = React.useState<{ name?: string; email?: string; password?: string; confirm?: string }>(
    {},
  );
  const isMobile = useIsMobile();

  React.useEffect(() => {
    if (!open) {
      setName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setShowPassword(false);
      setErrors({});
      setLoading(false);
    }
  }, [open]);

  if (!open) return null;

  const validate = () => {
    const e: typeof errors = {};
    if (!name || name.trim().length < 2) {
      e.name = "Insira seu nome completo.";
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      e.email = "Insira um e-mail válido.";
    }
    if (!password || password.length < 6) {
      e.password = "A senha deve ter pelo menos 6 caracteres.";
    }
    if (password !== confirmPassword) {
      e.confirm = "As senhas não coincidem.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev?: React.FormEvent) => {
    ev?.preventDefault();
    if (!validate()) return;

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });

      if (error) {
        showError(error.message || "Erro ao criar conta.");
        setLoading(false);
        return;
      }

      if (data?.user) {
        await supabase.from("profiles").upsert({
          id: data.user.id,
          first_name: name.trim(),
          role: "user"
        });
      }

      trackRegistration(email);

      const maskEmail = (e: string) => {
        const [local, domain] = e.split('@')
        if (!domain) return e
        const prefix = local.slice(0, 3)
        return `${prefix}*****@${domain}`
      }
      supabase.functions.invoke('send-admin-notification', {
        body: { type: 'new_lead', title: '✅ Novo Cadastro', body: maskEmail(email),
          data: { url: '/admin', type: 'new_lead', userName: name.trim(), userEmail: email } }
      }).catch(() => {})

      showSuccess(
        "Conta criada com sucesso! Faça login para começar a jogar.",
      );
      setLoading(false);
      onClose();
    } catch (err: any) {
      showError(err?.message ?? "Erro inesperado ao criar conta.");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className={cn(
        "relative w-full max-w-lg max-h-[90vh] max-h-[90dvh] rounded-2xl bg-[#0d0f14] border border-[#1c212b] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      )}>
        <div className="flex items-center justify-between p-6 border-b border-[#1c212b]">
          <div>
            <h2 className="text-xl font-bold text-white">Criar conta</h2>
            <p className="text-sm text-[#9CA3AF] mt-1">Preencha o formulário abaixo.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1">
            <X />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-[#9CA3AF]">Nome completo</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-md bg-[#0b0d10] border border-[#1c212b] px-3 py-3 text-sm text-white focus:outline-none focus:border-[#ffcc00]"
                placeholder="Seu nome"
              />
              {errors.name && <div className="mt-1 text-[12px] text-red-500">{errors.name}</div>}
            </div>

            <div>
              <label className="text-xs text-[#9CA3AF]">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-md bg-[#0b0d10] border border-[#1c212b] px-3 py-3 text-sm text-white focus:outline-none focus:border-[#ffcc00]"
                placeholder="seu@email.com"
              />
              {errors.email && <div className="mt-1 text-[12px] text-red-500">{errors.email}</div>}
            </div>

            <div>
              <label className="text-xs text-[#9CA3AF]">Senha</label>
              <div className="relative mt-1">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-md bg-[#0b0d10] border border-[#1c212b] px-3 py-3 text-sm text-white focus:outline-none focus:border-[#ffcc00]"
                  placeholder="Crie uma senha (mín. 6 caracteres)"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]"
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && <div className="mt-1 text-[12px] text-red-500">{errors.password}</div>}
            </div>

            <div>
              <label className="text-xs text-[#9CA3AF]">Confirmar senha</label>
              <input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 w-full rounded-md bg-[#0b0d10] border border-[#1c212b] px-3 py-3 text-sm text-white focus:outline-none focus:border-[#ffcc00]"
                placeholder="Repita a senha"
              />
              {errors.confirm && <div className="mt-1 text-[12px] text-red-500">{errors.confirm}</div>}
            </div>

            <div className="text-[12px] text-[#6b7280]">
              Ao criar uma conta você concorda com nossos <span className="text-[#ffcc00]">Termos de Uso</span> e a
              Política de Privacidade.
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-[#ffcc00] px-4 py-3 text-sm font-bold text-black hover:opacity-95 disabled:opacity-60"
              >
                {loading ? "Criando..." : "Criar conta"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SignupPopup;