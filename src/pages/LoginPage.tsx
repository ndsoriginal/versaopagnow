"use client";

import React from "react";
import LoginPopup from "@/components/LoginPopup";
import SignupPopup from "@/components/SignupPopup";
import { useSession } from "@/context/SessionContext";
import { useNavigate } from "react-router-dom";

const LoginPage: React.FC = () => {
  const [loginOpen, setLoginOpen] = React.useState(true);
  const [signupOpen, setSignupOpen] = React.useState(false);
  const { user } = useSession();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (user) {
      navigate("/", { replace: true });
    }
  }, [user, navigate]);

  const handleOpenSignup = () => {
    setLoginOpen(false);
    setSignupOpen(true);
  };

  const handleOpenLogin = () => {
    setSignupOpen(false);
    setLoginOpen(true);
  };

  if (user) {
    return null; // Should redirect by SessionProvider
  }

  return (
    <div className="min-h-screen bg-[#06070a] flex items-center justify-center p-4">
      <LoginPopup
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
        onOpenSignup={handleOpenSignup}
      />
      <SignupPopup
        open={signupOpen}
        onClose={() => setSignupOpen(false)}
      />
      {/* Fallback to ensure one is always open if both are closed */}
      {!loginOpen && !signupOpen && (
        <div className="text-white text-center">
          <p className="mb-4">Você precisa fazer login ou criar uma conta para continuar.</p>
          <button onClick={handleOpenLogin} className="rounded-lg bg-[#ffcc00] px-4 py-2 text-sm font-bold text-black hover:opacity-95 transition-all mr-2">
            Fazer Login
          </button>
          <button onClick={handleOpenSignup} className="rounded-lg bg-[#1c212b] px-4 py-2 text-sm font-bold text-white hover:bg-[#262c3a] transition-all">
            Criar Conta
          </button>
        </div>
      )}
    </div>
  );
};

export default LoginPage;