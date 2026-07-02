import { supabase } from "@/lib/supabase";

type PixelConfig = { pixel_id: string; api_token: string };

const DEFAULT_PIXEL_ID = "1569633754739174";

const getFbc = () => {
  if (typeof window === "undefined") return undefined;
  try {
    const cookie = document.cookie.split("; ").find(c => c.startsWith("_fbc="));
    return cookie ? cookie.split("=")[1] : undefined;
  } catch { return undefined; }
};

const getFbp = () => {
  if (typeof window === "undefined") return undefined;
  try {
    const cookie = document.cookie.split("; ").find(c => c.startsWith("_fbp="));
    return cookie ? cookie.split("=")[1] : undefined;
  } catch { return undefined; }
};

export const fetchActivePixels = async (): Promise<PixelConfig[]> => {
  try {
    const { data } = await supabase
      .from("meta_pixels")
      .select("pixel_id, api_token")
      .eq("is_active", true);

    const pixels = (data || []) as PixelConfig[];
    return pixels.length > 0 ? pixels : [{ pixel_id: DEFAULT_PIXEL_ID, api_token: "" }];
  } catch {
    return [{ pixel_id: DEFAULT_PIXEL_ID, api_token: "" }];
  }
};

let snippetLoaded = false;

export const reloadMetaPixels = async () => {
  if (typeof window === "undefined") return [];

  document.querySelectorAll("noscript[data-meta-noscript]").forEach(el => el.remove());

  const pixels = await fetchActivePixels();
  console.log("[MetaPixel] Pixels carregados:", pixels);

  for (const p of pixels) {
    if (!p.pixel_id) {
      console.warn("[MetaPixel] pixel_id inválido, pulando:", p);
      continue;
    }

    if ((window as any).fbq) {
      (window as any).fbq("init", p.pixel_id);
    }

    const noscript = document.createElement("noscript");
    noscript.setAttribute("data-meta-noscript", p.pixel_id);
    const img = document.createElement("img");
    img.height = 1;
    img.width = 1;
    img.style.display = "none";
    img.src = `https://www.facebook.com/tr?id=${p.pixel_id}&ev=PageView&noscript=1`;
    noscript.appendChild(img);
    document.body.appendChild(noscript);

    console.log("[MetaPixel] init + noscript para", p.pixel_id);
  }

  if ((window as any).fbq) {
    (window as any).fbq("track", "PageView");
  }
  console.log("[MetaPixel] PageView trackado");
  return pixels;
};

export const initMetaPixel = () => {
  if (typeof window === "undefined") return;
  if (snippetLoaded) return;

  (function (f: any, b: any, e: any, v: any) {
    if (f.fbq) return;
    const n: any = f.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    };
    if (!f._fbq) f._fbq = n;
    n.push = n;
    n.loaded = !0;
    n.version = "2.0";
    n.queue = [];
    const t = b.createElement(e);
    t.async = !0;
    t.src = v;
    const s = b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t, s);
  })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");

  snippetLoaded = true;
  reloadMetaPixels();
};

const trackViaEdgeFunction = async (eventName: string, email?: string | null, amount?: number) => {
  try {
    await supabase.functions.invoke("track-meta-event", {
      body: {
        event_name: eventName,
        email,
        amount,
        fbc: getFbc(),
        fbp: getFbp(),
        user_agent: navigator.userAgent,
        ip: "127.0.0.1",
      }
    });
  } catch (err) {
    console.error("[Meta Pixel] Erro ao enviar via Edge Function:", err);
  }
};

export const trackRegistration = async (email?: string | null) => {
  if (typeof window === "undefined") return;

  if ((window as any).fbq) {
    (window as any).fbq("track", "CompleteRegistration");
  }

  await trackViaEdgeFunction("CompleteRegistration", email);
};

export const trackPurchase = async (amount: number, email?: string | null) => {
  if (typeof window === "undefined") return;

  if ((window as any).fbq) {
    (window as any).fbq("track", "Purchase", {
      value: amount,
      currency: "BRL",
    });
  }

  await trackViaEdgeFunction("Purchase", email, amount);
};
