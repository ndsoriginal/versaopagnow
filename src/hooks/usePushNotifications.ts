import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export type NotifType = 'new_lead' | 'pix_paid' | 'pix_generated'

type Preferences = Record<NotifType, boolean>

const DEFAULT_PREFS: Preferences = { new_lead: true, pix_paid: true, pix_generated: true }

export function usePushNotifications() {
  const [supported, setSupported] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission | 'unavailable'>('unavailable')
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [preferences, setPreferences] = useState<Preferences>(DEFAULT_PREFS)
  const [subId, setSubId] = useState<string | null>(null)
  const [deviceName, setDeviceName] = useState<string>('')

  useEffect(() => {
    const supportedBrowser = 'serviceWorker' in navigator && 'PushManager' in window
    setSupported(supportedBrowser)
    if (supportedBrowser) {
      setPermission(Notification.permission)
    }
    navigator.userAgent.includes('ChromeAndroid')
    setDeviceName(navigator.userAgent.includes('ChromeAndroid') ? 'Android Chrome' : navigator.platform || 'Navegador')
  }, [])

  const fetchSubscription = useCallback(async () => {
    const token = (await supabase.auth.getSession()).data.session?.access_token
    if (!token) return

    const { data: existing } = await supabase
      .from('push_subscriptions')
      .select('id, preferences, device_name')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existing) {
      setSubId(existing.id)
      setSubscribed(true)
      setPreferences((existing.preferences as Preferences) || DEFAULT_PREFS)
      setDeviceName(existing.device_name || deviceName)
    }
  }, [deviceName])

  useEffect(() => {
    if (supported && permission === 'granted') {
      fetchSubscription()
    }
  }, [supported, permission, fetchSubscription])

  const subscribe = useCallback(async () => {
    if (!supported) return
    setLoading(true)
    try {
      const registration = await navigator.serviceWorker.ready
      let pushSub = await registration.pushManager.getSubscription()
      if (!pushSub) {
        const vapidPublicKey = 'BMGfWlgp6tXVNxaoTexWKhy7OhtXDnkxgs43WCK48-RldqbZBEyuTSOoPqHpQY2gzarJmWG9nHtzBkrjh9yinMA'
        pushSub = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: vapidPublicKey,
        })
      }

      const subData = pushSub.toJSON()
      const { error } = await supabase.functions.invoke('save-push-subscription', {
        body: {
          endpoint: subData.endpoint,
          p256dh: subData.keys?.p256dh,
          auth: subData.keys?.auth,
          device_name: deviceName,
          preferences,
        },
      })

      if (error) throw new Error(error.message || 'Erro ao salvar inscrição')
      await fetchSubscription()
    } catch (err: any) {
      throw err
    } finally {
      setLoading(false)
    }
  }, [supported, preferences, deviceName, fetchSubscription])

  const unsubscribe = useCallback(async () => {
    if (!subId) return
    setLoading(true)
    try {
      const registration = await navigator.serviceWorker.ready
      const pushSub = await registration.pushManager.getSubscription()
      if (pushSub) await pushSub.unsubscribe()

      const { error } = await supabase.from('push_subscriptions').delete().eq('id', subId)
      if (error) throw error

      setSubscribed(false)
      setSubId(null)
      setPreferences(DEFAULT_PREFS)
    } catch (err: any) {
      throw err
    } finally {
      setLoading(false)
    }
  }, [subId])

  const updatePreferences = useCallback(async (newPrefs: Preferences) => {
    setPreferences(newPrefs)
    if (!subId) return
    setLoading(true)
    try {
      const { error } = await supabase
        .from('push_subscriptions')
        .update({ preferences: newPrefs })
        .eq('id', subId)
      if (error) throw error
    } catch (err: any) {
      throw err
    } finally {
      setLoading(false)
    }
  }, [subId])

  return {
    supported,
    permission,
    subscribed,
    loading,
    preferences,
    deviceName,
    subscribe,
    unsubscribe,
    updatePreferences,
  }
}
