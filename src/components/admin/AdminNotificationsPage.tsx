import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Bell, BellOff, Loader2, Check, X, Volume2, VolumeX, Music } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import { usePushNotifications, NotifType } from "@/hooks/usePushNotifications";
import { playSound, NOTIFICATION_INFO } from "@/hooks/useNotificationSound";
import {
  isNotificationSoundEnabled,
  enableNotificationSound,
  disableNotificationSound,
  playNotificationSound,
} from "@/utils/notificationSound";

export default function AdminNotificationsPage() {
  const {
    supported, permission, subscribed, loading, preferences,
    deviceName, subscribe, unsubscribe, updatePreferences,
  } = usePushNotifications();

  const [testing, setTesting] = useState<NotifType | null>(null);
  const [mp3Enabled, setMp3Enabled] = useState(isNotificationSoundEnabled());
  const [testingMp3, setTestingMp3] = useState(false);

  useEffect(() => {
    setMp3Enabled(isNotificationSoundEnabled());
  }, []);

  const handleToggleMp3 = async () => {
    if (mp3Enabled) {
      disableNotificationSound();
      setMp3Enabled(false);
      showSuccess('Som de notificação desativado.');
    } else {
      await enableNotificationSound();
      setMp3Enabled(true);
      showSuccess('Som de notificação ativado com sucesso!');
    }
  };

  const handleTestMp3 = async () => {
    setTestingMp3(true);
    await playNotificationSound();
    setTimeout(() => setTestingMp3(false), 1000);
  };

  const handleEnable = async () => {
    try {
      const result = await Notification.requestPermission();
      if (result !== 'granted') {
        showError('Permissão de notificação negada. Ative nas configurações do navegador.');
        return;
      }
      await subscribe();
      showSuccess('Notificações ativadas com sucesso!');
    } catch (err: any) {
      showError(err.message || 'Erro ao ativar notificações');
    }
  };

  const handleDisable = async () => {
    try {
      await unsubscribe();
      showSuccess('Notificações desativadas');
    } catch (err: any) {
      showError(err.message || 'Erro ao desativar');
    }
  };

  const handleTogglePref = async (type: NotifType) => {
    const newPrefs = { ...preferences, [type]: !preferences[type] };
    try {
      await updatePreferences(newPrefs);
    } catch (err: any) {
      showError(err.message || 'Erro ao atualizar preferências');
    }
  };

  const handleTestSound = (type: NotifType) => {
    setTesting(type);
    playSound(type);
    setTimeout(() => setTesting(null), 1000);
  };

  if (!supported) {
    return (
      <div className="bg-[#0d0f14] border border-[#1c212b] rounded-3xl p-8 text-center">
        <BellOff size={48} className="mx-auto text-gray-600 mb-4" />
        <h3 className="text-lg font-black uppercase tracking-wider mb-2">Não Suportado</h3>
        <p className="text-gray-400 text-sm">
          Seu navegador não suporta notificações push ou está em um ambiente não seguro (HTTP).
          Acesse via HTTPS ou use Chrome/Edge em um dispositivo móvel.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-[#0d0f14] border border-[#1c212b] rounded-3xl p-6">
        <h3 className="text-lg font-black uppercase tracking-wider mb-4 flex items-center gap-2">
          <Bell size={20} className="text-[#ffcc00]" /> Status das Notificações
        </h3>

        <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${subscribed ? 'bg-green-500' : 'bg-gray-600'}`} />
            <span className="text-sm font-bold uppercase tracking-wider">
              {subscribed ? 'Ativadas' : 'Desativadas'}
            </span>
          </div>
          {subscribed && (
            <span className="text-xs text-gray-500">
              Dispositivo: {deviceName}
            </span>
          )}
        </div>

        {!subscribed ? (
          <button
            onClick={handleEnable}
            disabled={loading}
            className="flex items-center gap-2 bg-[#ffcc00] text-black px-6 py-3 rounded-2xl text-sm font-black uppercase tracking-wider hover:bg-[#e6b800] transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Bell size={16} />}
            Ativar Notificações
          </button>
        ) : (
          <button
            onClick={handleDisable}
            disabled={loading}
            className="flex items-center gap-2 bg-red-600/20 text-red-400 border border-red-600/30 px-6 py-3 rounded-2xl text-sm font-black uppercase tracking-wider hover:bg-red-600/30 transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <BellOff size={16} />}
            Desativar Notificações
          </button>
        )}
      </div>

      <div className="bg-[#0d0f14] border border-[#1c212b] rounded-3xl p-6">
        <h3 className="text-lg font-black uppercase tracking-wider mb-4 flex items-center gap-2">
          <Volume2 size={20} className="text-[#ffcc00]" /> Som de Notificação MP3
        </h3>

        <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${mp3Enabled ? 'bg-green-500' : 'bg-gray-600'}`} />
            <span className="text-sm font-bold uppercase tracking-wider">
              {mp3Enabled ? 'Ativado' : 'Desativado'}
            </span>
          </div>
          <span className="text-xs text-gray-500">
            Toca /sounds/notification.mp3 ao receber novas notificações
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleToggleMp3}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-black uppercase tracking-wider transition-all ${
              mp3Enabled
                ? 'bg-red-600/20 text-red-400 border border-red-600/30 hover:bg-red-600/30'
                : 'bg-[#ffcc00] text-black hover:bg-[#e6b800]'
            }`}
          >
            {mp3Enabled ? <VolumeX size={16} /> : <Volume2 size={16} />}
            {mp3Enabled ? 'Desativar Som' : 'Ativar Som'}
          </button>
          <button
            onClick={handleTestMp3}
            disabled={testingMp3}
            className="flex items-center gap-2 bg-[#13161d] border border-[#1c212b] px-6 py-3 rounded-2xl text-sm font-bold hover:bg-[#1c212b] transition-all disabled:opacity-50"
          >
            {testingMp3 ? <Loader2 size={16} className="animate-spin" /> : <Music size={16} className="text-[#ffcc00]" />}
            Testar Som MP3
          </button>
        </div>
        <p className="text-[10px] text-gray-600 mt-4 leading-relaxed">
          O navegador pode bloquear o áudio até que você interaja com a página.
          Clique em "Ativar Som" para liberar. A preferência fica salva no navegador.
        </p>
      </div>

      <div className="bg-[#0d0f14] border border-[#1c212b] rounded-3xl p-6">
        <h3 className="text-lg font-black uppercase tracking-wider mb-4">Preferências</h3>
        <p className="text-xs text-gray-500 mb-6 uppercase tracking-wider font-bold">
          Selecione quais notificações você quer receber
        </p>

        <div className="space-y-3">
          {(Object.keys(NOTIFICATION_INFO) as NotifType[]).map((type) => {
            const info = NOTIFICATION_INFO[type];
            const isOn = preferences[type];
            return (
              <div key={type} className="flex items-center justify-between bg-[#13161d] border border-[#1c212b] rounded-2xl p-4">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{info.icon}</span>
                  <div>
                    <p className="text-sm font-bold">{info.label}</p>
                    <p className="text-xs text-gray-500">{info.description}</p>
                  </div>
                  <button
                    onClick={() => handleTestSound(type)}
                    className="text-xs text-[#ffcc00] hover:underline ml-2"
                  >
                    {testing === type ? '🔊' : '▶ Testar som'}
                  </button>
                </div>
                <button
                  onClick={() => handleTogglePref(type)}
                  className={`w-12 h-6 rounded-full transition-all flex items-center px-0.5 ${isOn ? 'bg-[#ffcc00] justify-end' : 'bg-[#1c212b] justify-start'}`}
                >
                  <div className={`w-5 h-5 rounded-full transition-all ${isOn ? 'bg-black' : 'bg-gray-500'}`} />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {subscribed && (
        <div className="bg-[#0d0f14] border border-[#1c212b] rounded-3xl p-6">
          <h3 className="text-lg font-black uppercase tracking-wider mb-4">Testar Notificação</h3>
          <button
            onClick={async () => {
              try {
                const { error } = await supabase.functions.invoke('send-admin-notification', {
                  body: {
                    type: 'new_lead',
                    title: '🔔 Teste de Notificação',
                    body: 'Se você está vendo isso, o push está funcionando!',
                    data: { url: '/admin' },
                  },
                })
                if (error) throw error
                showSuccess('Notificação de teste enviada!')
              } catch (err: any) {
                showError(err.message || 'Erro ao enviar teste')
              }
            }}
            className="flex items-center gap-2 bg-[#13161d] border border-[#1c212b] px-6 py-3 rounded-2xl text-sm font-bold hover:bg-[#1c212b] transition-all"
          >
            <Bell size={16} className="text-[#ffcc00]" /> Enviar Notificação de Teste
          </button>
        </div>
      )}
    </div>
  );
}
