import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Admin from "./pages/Admin";
import LoginPage from "./pages/LoginPage";
import PopularPage from "./pages/Popular";
import SupportPage from "./pages/Support";
import AdminConfig from "./pages/AdminConfig";
import AviatorPage from "./pages/AviatorPage";
import GlobalChat from "./components/GlobalChat";
import MobileNotification from "./components/MobileNotification";
import { SessionProvider } from "./context/SessionContext";
import { initMetaPixel } from "./utils/metaPixel";
import { playNotificationSound } from "./utils/notificationSound";
import GamesPage from "./pages/GamesPage";
import DemoPage from "./pages/DemoPage";
import DoublePage from "./pages/DoublePage";
import MinesPage from "./pages/MinesPage";
import AdminGameConfigPage from "./pages/AdminGameConfigPage";

const queryClient = new QueryClient();

const App = () => {
  const [isChatOpen, setIsChatOpen] = React.useState(false);

  React.useEffect(() => {
    initMetaPixel();
  }, []);

  React.useEffect(() => {
    const handleSWMessage = (event: MessageEvent) => {
      if (event.data?.type === 'PUSH_NOTIFICATION' && event.data?.data?.type) {
        import('@/hooks/useNotificationSound').then(({ playSound }) => {
          playSound(event.data.data.type)
        })
        playNotificationSound()
      }
    }
    navigator.serviceWorker?.addEventListener('message', handleSWMessage)
    return () => navigator.serviceWorker?.removeEventListener('message', handleSWMessage)
  }, [])

  React.useEffect(() => {
    const handleCustomSound = () => playNotificationSound()
    window.addEventListener('play:notification-sound', handleCustomSound)
    return () => window.removeEventListener('play:notification-sound', handleCustomSound)
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <SessionProvider>
            <div className="relative overflow-x-hidden">
              <Routes>
                <Route path="/" element={<Index onToggleChat={() => setIsChatOpen(!isChatOpen)} />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/admin/*" element={<Admin />} />
                <Route path="/admin/login" element={<Admin />} />
                <Route path="/populares" element={<PopularPage />} />
                <Route path="/support" element={<SupportPage />} />
                <Route path="/games" element={<GamesPage />} />
                <Route path="/demo/:slug" element={<DemoPage />} />
                <Route path="/aviator" element={<AviatorPage />} />
                <Route path="/double" element={<DoublePage />} />
                <Route path="/mines" element={<MinesPage />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
              <GlobalChat isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
              <MobileNotification />
            </div>
          </SessionProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;