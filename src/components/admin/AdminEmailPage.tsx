import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Search, Send, Check, Loader2, AlertCircle, Mail, Settings, Info,
  Users, DollarSign, TrendingUp, RefreshCw, Eye, EyeOff, Target,
  Clock, UserCheck, UserX, Copy, BarChart3, Download, List,
  MessageSquare, Edit3, FileText, Plus, X, ChevronDown, ChevronUp,
  Zap, Activity, ArrowRight, Filter, UserPlus, MailCheck, Trash2,
  Star, Layers, Image,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";

// ─── Types ───

type DashboardData = {
  totalEmails: number;
  totalSent: number;
  lastCampaignSent: number;
  newEmails: number;
  paidUsers: number;
  pendingUsers: number;
  conversions: number;
  convertedAmount: number;
  conversionRate: number;
  failedEmails: number;
  lastUpdate: string;
};

type UserRow = {
  id: string;
  email: string;
  first_name: string | null;
  balance: number;
  real_balance: number;
  created_at: string;
  paymentStatus: "paid" | "pending" | "none";
  hasPaid: boolean;
  hasPending: boolean;
  paidTotal: number;
  paidCount: number;
  lastPaidAt: string | null;
  lastPendingAt: string | null;
  hasReceivedEmail: boolean;
  lastEmailSentAt: string | null;
  isNewEmail: boolean;
  converted: boolean;
  convertedAmount: number;
};

type CampaignRow = {
  id: string;
  name: string | null;
  subject: string;
  preheader: string | null;
  title: string | null;
  cta_text: string | null;
  cta_url: string | null;
  footer: string | null;
  audience_type: string | null;
  total_sent: number;
  total_failed: number;
  total_conversions: number;
  total_converted_amount: number;
  created_at: string;
  sent_at: string | null;
  liveSent: number;
  liveFailed: number;
  liveConversions: number;
  liveValue: number;
  liveRate: number;
};

type RelayConfig = {
  host: string;
  port: number;
  user: string;
  from: string;
  relay: string;
  provider: string;
};

type EmailTemplate = {
  id: string;
  template_name: string;
  campaign_name: string;
  subject: string;
  preheader: string;
  header_image_url: string;
  title: string;
  body_text: string;
  secondary_text: string;
  cta_text: string;
  cta_url: string;
  footer_text: string;
  footer_image_url: string;
  body_html: string | null;
  is_default: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

// ─── Default values ───

const DEFAULTS = {
  campaignName: "",
  subject: "Oferta especial PixBett",
  preheader: "",
  title: "VOCÊ TEM UMA OFERTA ESPECIAL",
  bodyText: "A PixBett preparou uma oferta imperdível para você. Acesse agora e aproveite.",
  secondaryText: "",
  ctaText: "ACESSAR AGORA",
  ctaUrl: "https://www.pixbeet.lat",
  footer: "© 2026 PixBett. Todos os direitos reservados.",
  headerImageUrl: "",
  footerImageUrl: "",
};

// ─── Helpers ───

function templateToEditor(t: EmailTemplate) {
  return {
    campaignName: t.campaign_name || DEFAULTS.campaignName,
    subject: t.subject || DEFAULTS.subject,
    preheader: t.preheader || DEFAULTS.preheader,
    title: t.title || DEFAULTS.title,
    bodyText: t.body_text || DEFAULTS.bodyText,
    secondaryText: t.secondary_text || DEFAULTS.secondaryText,
    ctaText: t.cta_text || DEFAULTS.ctaText,
    ctaUrl: t.cta_url || DEFAULTS.ctaUrl,
    footer: t.footer_text || DEFAULTS.footer,
    headerImageUrl: t.header_image_url || DEFAULTS.headerImageUrl,
    footerImageUrl: t.footer_image_url || DEFAULTS.footerImageUrl,
  };
}

function editorToTemplatePayload(templateName: string, fields: ReturnType<typeof templateToEditor>) {
  return {
    template_name: templateName,
    campaign_name: fields.campaignName,
    subject: fields.subject,
    preheader: fields.preheader,
    header_image_url: fields.headerImageUrl,
    title: fields.title,
    body_text: fields.bodyText,
    secondary_text: fields.secondaryText,
    cta_text: fields.ctaText,
    cta_url: fields.ctaUrl,
    footer_text: fields.footer,
    footer_image_url: fields.footerImageUrl,
  };
}

// ─── Component ───

export default function AdminEmailPage() {
  // ─── Data state (from edge function) ───
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [newEmailsList, setNewEmailsList] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // ─── Relay config ───
  const [config, setConfig] = useState<RelayConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(false);

  // ─── Filter / search state ───
  type FilterType = "all" | "paid" | "pending" | "new" | "received" | "converted" | "not_converted" | "no_transaction";
  const [filter, setFilter] = useState<FilterType>("all");
  const [search, setSearch] = useState("");

  // ─── Selection state ───
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sendMode, setSendMode] = useState<"manual" | "all_filtered" | "pending" | "paid" | "new" | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  // ─── Email editor state ───
  const [campaignName, setCampaignName] = useState(DEFAULTS.campaignName);
  const [subject, setSubject] = useState(DEFAULTS.subject);
  const [preheader, setPreheader] = useState(DEFAULTS.preheader);
  const [emailTitle, setEmailTitle] = useState(DEFAULTS.title);
  const [bodyText, setBodyText] = useState(DEFAULTS.bodyText);
  const [secondaryText, setSecondaryText] = useState(DEFAULTS.secondaryText);
  const [ctaText, setCtaText] = useState(DEFAULTS.ctaText);
  const [ctaUrl, setCtaUrl] = useState(DEFAULTS.ctaUrl);
  const [footer, setFooter] = useState(DEFAULTS.footer);
  const [headerImageUrl, setHeaderImageUrl] = useState(DEFAULTS.headerImageUrl);
  const [footerImageUrl, setFooterImageUrl] = useState(DEFAULTS.footerImageUrl);

  // ─── Template state ───
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [templateManagerOpen, setTemplateManagerOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [templateLoading, setTemplateLoading] = useState(false);
  const [templateSaving, setTemplateSaving] = useState(false);
  const [templateSaved, setTemplateSaved] = useState(false);

  // ─── Template modal state ───
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [modalTemplateId, setModalTemplateId] = useState<string | null>(null);
  const [modalName, setModalName] = useState("");
  const [modalCampaignName, setModalCampaignName] = useState(DEFAULTS.campaignName);
  const [modalSubject, setModalSubject] = useState(DEFAULTS.subject);
  const [modalPreheader, setModalPreheader] = useState(DEFAULTS.preheader);
  const [modalTitle, setModalTitle] = useState(DEFAULTS.title);
  const [modalBodyText, setModalBodyText] = useState(DEFAULTS.bodyText);
  const [modalSecondaryText, setModalSecondaryText] = useState(DEFAULTS.secondaryText);
  const [modalCtaText, setModalCtaText] = useState(DEFAULTS.ctaText);
  const [modalCtaUrl, setModalCtaUrl] = useState(DEFAULTS.ctaUrl);
  const [modalFooter, setModalFooter] = useState(DEFAULTS.footer);
  const [modalHeaderImageUrl, setModalHeaderImageUrl] = useState(DEFAULTS.headerImageUrl);
  const [modalFooterImageUrl, setModalFooterImageUrl] = useState(DEFAULTS.footerImageUrl);
  const [modalSaving, setModalSaving] = useState(false);

  // ─── Test send state ───
  const [testEmail, setTestEmail] = useState("");
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  // ─── Campaign send state ───
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ sent: number; failed: number; campaignId?: string; totalRecipients?: number; remaining?: number } | null>(null);
  const [sendProgress, setSendProgress] = useState<{ sent: number; failed: number; total: number; remaining: number } | null>(null);

  // ─── Expanded campaign detail ───
  const [expandedCampaign, setExpandedCampaign] = useState<string | null>(null);
  const [campaignDetails, setCampaignDetails] = useState<Record<string, { converted: UserRow[] }>>({});

  // ─── UI state ───
  const [showPreview, setShowPreview] = useState(false);
  const [activeSection, setActiveSection] = useState<"dashboard" | "editor" | "history">("dashboard");

  // ─── Helpers to invoke edge functions ───
  const invokeAdmin = useCallback(async (body: any) => {
    const { data, error } = await supabase.functions.invoke("admin-email-templates", { body });
    if (error) {
      const ctx = (error as any)?.context?.data;
      throw new Error(ctx?.message || ctx?.error || error.message);
    }
    return data;
  }, []);

  // ─── Load data ───
  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const { data, error } = await supabase.functions.invoke("get-campaign-stats", { body: {} });
      if (error) throw new Error(error.message || "Falha ao carregar dados");
      setDashboard(data.dashboard || null);
      setUsers(data.users || []);
      setCampaigns(data.campaigns || []);
      setNewEmailsList(data.newEmailsList || []);
    } catch (err: any) {
      setLoadError(err.message);
    }
    setLoading(false);
  }, []);

  const loadConfig = useCallback(async () => {
    setConfigLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-email", {
        body: { to: "check", subject: "CHECK", html: "<p>check</p>", _configOnly: true },
      });
      if (data?.config) setConfig(data.config);
      else if ((error as any)?.context?.data?.config) setConfig((error as any).context.data.config);
    } catch {}
    setConfigLoading(false);
  }, []);

  // ─── Template load ───
  const loadTemplates = useCallback(async () => {
    setTemplateLoading(true);
    try {
      const data = await invokeAdmin({ method: 'list' });
      if (data.success) {
        setTemplates(data.templates || []);
        // Auto-select default or first
        const defaultTpl = (data.templates || []).find((t: EmailTemplate) => t.is_default)
          || (data.templates || [])[0];
        if (defaultTpl) {
          selectTemplateData(defaultTpl);
        }
      }
    } catch (err: any) {
      // Silently fail — templates are optional
    }
    setTemplateLoading(false);
  }, [invokeAdmin]);

  const selectTemplateData = useCallback((tpl: EmailTemplate) => {
    setSelectedTemplateId(tpl.id);
    const vals = templateToEditor(tpl);
    setCampaignName(vals.campaignName);
    setSubject(vals.subject);
    setPreheader(vals.preheader);
    setEmailTitle(vals.title);
    setBodyText(vals.bodyText);
    setSecondaryText(vals.secondaryText);
    setCtaText(vals.ctaText);
    setCtaUrl(vals.ctaUrl);
    setFooter(vals.footer);
    setHeaderImageUrl(vals.headerImageUrl);
    setFooterImageUrl(vals.footerImageUrl);
    setNewTemplateName(tpl.template_name);
  }, []);

  const clearEditor = useCallback(() => {
    setSelectedTemplateId(null);
    setNewTemplateName("");
    setCampaignName(DEFAULTS.campaignName);
    setSubject(DEFAULTS.subject);
    setPreheader(DEFAULTS.preheader);
    setEmailTitle(DEFAULTS.title);
    setBodyText(DEFAULTS.bodyText);
    setSecondaryText(DEFAULTS.secondaryText);
    setCtaText(DEFAULTS.ctaText);
    setCtaUrl(DEFAULTS.ctaUrl);
    setFooter(DEFAULTS.footer);
    setHeaderImageUrl(DEFAULTS.headerImageUrl);
    setFooterImageUrl(DEFAULTS.footerImageUrl);
  }, []);

  // ─── Modal helpers ───
  const openCreateModal = useCallback(() => {
    setModalTemplateId(null);
    setModalName("");
    setModalCampaignName(DEFAULTS.campaignName);
    setModalSubject(DEFAULTS.subject);
    setModalPreheader(DEFAULTS.preheader);
    setModalTitle(DEFAULTS.title);
    setModalBodyText(DEFAULTS.bodyText);
    setModalSecondaryText(DEFAULTS.secondaryText);
    setModalCtaText(DEFAULTS.ctaText);
    setModalCtaUrl(DEFAULTS.ctaUrl);
    setModalFooter(DEFAULTS.footer);
    setModalHeaderImageUrl(DEFAULTS.headerImageUrl);
    setModalFooterImageUrl(DEFAULTS.footerImageUrl);
    setShowTemplateModal(true);
  }, []);

  const openEditModal = useCallback((tpl: EmailTemplate) => {
    const vals = templateToEditor(tpl);
    setModalTemplateId(tpl.id);
    setModalName(tpl.template_name);
    setModalCampaignName(vals.campaignName);
    setModalSubject(vals.subject);
    setModalPreheader(vals.preheader);
    setModalTitle(vals.title);
    setModalBodyText(vals.bodyText);
    setModalSecondaryText(vals.secondaryText);
    setModalCtaText(vals.ctaText);
    setModalCtaUrl(vals.ctaUrl);
    setModalFooter(vals.footer);
    setModalHeaderImageUrl(vals.headerImageUrl);
    setModalFooterImageUrl(vals.footerImageUrl);
    setShowTemplateModal(true);
  }, []);

  const closeModal = useCallback(() => {
    setShowTemplateModal(false);
    setModalTemplateId(null);
  }, []);

  const buildModalPreviewHtml = useCallback((firstName?: string): string => {
    const greeting = firstName ? `Olá, ${firstName}` : "Olá";
    const hasHeaderImg = modalHeaderImageUrl.trim() !== "";
    const hasFooterImg = modalFooterImageUrl.trim() !== "";
    const hasSecondary = modalSecondaryText.trim() !== "";
    const headerBlock = hasHeaderImg
      ? `<tr><td style="padding:0;text-align:center"><img src="${modalHeaderImageUrl}" alt="" style="display:block;max-width:600px;width:100%;height:auto;border-radius:16px 16px 0 0" /></td></tr>`
      : `<tr><td style="background:linear-gradient(135deg,#ffcc00,#e6b800);padding:32px;text-align:center">
    <h1 style="margin:0;color:#000;font-size:28px;font-weight:900">🎲 PixBett</h1>
    ${modalTitle ? `<p style="margin:8px 0 0;color:#1a1a1a;font-size:14px;font-weight:600">${modalTitle}</p>` : ""}
  </td></tr>`;
    const footerImgBlock = hasFooterImg
      ? `<tr><td style="padding:0;text-align:center"><img src="${modalFooterImageUrl}" alt="" style="display:block;max-width:600px;width:100%;height:auto" /></td></tr>`
      : "";
    const secondaryBlock = hasSecondary
      ? `<p style="color:#64748b;font-size:14px;line-height:1.5;margin:0 0 24px">${modalSecondaryText}</p>`
      : "";
    return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#06070a;font-family:'Segoe UI',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 16px">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#0d0f14;border-radius:16px;overflow:hidden;border:1px solid #1c212b">
  ${headerBlock}
  <tr><td style="padding:32px">
    <p style="color:#ffffff;font-size:18px;margin:0 0 16px">${greeting},</p>
    <p style="color:#94a3b8;font-size:15px;line-height:1.6;margin:0 0 24px">${modalBodyText}</p>
    ${secondaryBlock}
    ${modalCtaText ? `<table cellpadding="0" cellspacing="0" style="margin:0 auto"><tr>
      <td align="center" style="background:linear-gradient(135deg,#ffcc00,#e6b800);border-radius:12px;padding:0">
        <a href="${modalCtaUrl}" style="display:inline-block;padding:16px 48px;color:#000;text-decoration:none;font-size:18px;font-weight:800;border-radius:12px">${modalCtaText}</a>
      </td>
    </tr></table>` : ""}
  </td></tr>
  ${footerImgBlock}
  <tr><td style="padding:16px 32px;border-top:1px solid #1c212b;text-align:center">
    <p style="margin:0;color:#475569;font-size:12px">${modalFooter}</p>
  </td></tr>
</table>
</td></tr></table>
</body>
</html>`
  }, [modalTitle, modalBodyText, modalSecondaryText, modalCtaText, modalCtaUrl, modalFooter, modalHeaderImageUrl, modalFooterImageUrl]);

  const handleModalSave = useCallback(async () => {
    const name = modalName.trim() || "Novo Modelo";
    if (!name) return;
    setModalSaving(true);
    try {
      const template = {
        id: modalTemplateId || undefined,
        template_name: name,
        campaign_name: modalCampaignName,
        subject: modalSubject,
        preheader: modalPreheader,
        header_image_url: modalHeaderImageUrl,
        title: modalTitle,
        body_text: modalBodyText,
        secondary_text: modalSecondaryText,
        cta_text: modalCtaText,
        cta_url: modalCtaUrl,
        footer_text: modalFooter,
        footer_image_url: modalFooterImageUrl,
      };
      const data = await invokeAdmin({ method: 'save', template });
      if (data.success) {
        // Load template into main editor
        const loaded = {
          id: data.template.id,
          template_name: name,
          campaign_name: modalCampaignName,
          subject: modalSubject,
          preheader: modalPreheader,
          header_image_url: modalHeaderImageUrl,
          title: modalTitle,
          body_text: modalBodyText,
          secondary_text: modalSecondaryText,
          cta_text: modalCtaText,
          cta_url: modalCtaUrl,
          footer_text: modalFooter,
          footer_image_url: modalFooterImageUrl,
          body_html: null,
          is_default: false,
          created_by: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as EmailTemplate;
        selectTemplateData(loaded);
        setShowTemplateModal(false);
        showSuccess("Modelo salvo!");
        await loadTemplates();
      }
    } catch (err: any) {
      showError(err.message || "Erro ao salvar modelo");
    }
    setModalSaving(false);
  }, [modalName, modalTemplateId, modalCampaignName, modalSubject, modalPreheader, modalHeaderImageUrl, modalTitle, modalBodyText, modalSecondaryText, modalCtaText, modalCtaUrl, modalFooter, modalFooterImageUrl, invokeAdmin, selectTemplateData, loadTemplates]);

  // ─── Template save ───
  const saveTemplate = useCallback(async (name?: string) => {
    if (templateSaving) return;
    const tplName = name || newTemplateName || "Sem nome";
    if (!tplName.trim()) return;
    setTemplateSaving(true);
    try {
      const template = {
        ...editorToTemplatePayload(tplName, {
          campaignName, subject, preheader, title, bodyText, secondaryText,
          ctaText, ctaUrl, footer, headerImageUrl, footerImageUrl,
        }),
        id: selectedTemplateId || undefined,
      };
      const data = await invokeAdmin({ method: 'save', template });
      if (data.success) {
        setSelectedTemplateId(data.template.id);
        setTemplateSaved(true);
        setTimeout(() => setTemplateSaved(false), 2000);
        // Refresh list
        loadTemplates();
      }
    } catch (err: any) {
      showError(err.message || "Erro ao salvar template");
    }
    setTemplateSaving(false);
  }, [campaignName, subject, preheader, emailTitle, bodyText, secondaryText, ctaText, ctaUrl, footer, headerImageUrl, footerImageUrl, selectedTemplateId, newTemplateName, templateSaving, invokeAdmin, loadTemplates]);

  // ─── Auto-save debounce (only when a template is selected) ───
  useEffect(() => {
    if (!selectedTemplateId) return;
    const timer = setTimeout(() => {
      saveTemplate();
    }, 1500);
    return () => clearTimeout(timer);
  }, [campaignName, subject, preheader, emailTitle, bodyText, secondaryText, ctaText, ctaUrl, footer, headerImageUrl, footerImageUrl, selectedTemplateId, saveTemplate]);

  // ─── Template actions ───
  const handleCreateTemplate = async () => {
    const name = newTemplateName.trim() || "Novo Modelo";
    try {
      const template = {
        ...editorToTemplatePayload(name, {
          campaignName, subject, preheader, title, bodyText, secondaryText,
          ctaText, ctaUrl, footer, headerImageUrl, footerImageUrl,
        }),
      };
      const data = await invokeAdmin({ method: 'save', template });
      if (data.success) {
        setSelectedTemplateId(data.template.id);
        setNewTemplateName(name);
        showSuccess("Modelo criado!");
        await loadTemplates();
      }
    } catch (err: any) {
      showError(err.message || "Erro ao criar modelo");
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm("Excluir este modelo?")) return;
    try {
      const data = await invokeAdmin({ method: 'delete', template: { id } });
      if (data.success) {
        if (selectedTemplateId === id) clearEditor();
        showSuccess("Modelo excluído!");
        await loadTemplates();
      }
    } catch (err: any) {
      showError(err.message || "Erro ao excluir modelo");
    }
  };

  const handleDuplicateTemplate = async (tpl: EmailTemplate) => {
    try {
      const template = {
        ...editorToTemplatePayload(`${tpl.template_name} (cópia)`, templateToEditor(tpl)),
      };
      const data = await invokeAdmin({ method: 'save', template });
      if (data.success) {
        showSuccess("Modelo duplicado!");
        await loadTemplates();
      }
    } catch (err: any) {
      showError(err.message || "Erro ao duplicar modelo");
    }
  };

  const handleSetDefaultTemplate = async (id: string) => {
    try {
      const data = await invokeAdmin({ method: 'set_default', template: { id } });
      if (data.success) {
        showSuccess("Modelo padrão atualizado!");
        await loadTemplates();
      }
    } catch (err: any) {
      showError(err.message || "Erro ao definir padrão");
    }
  };

  // ─── Initial load ───
  useEffect(() => {
    loadData();
    loadConfig();
    loadTemplates();
  }, [loadData, loadConfig, loadTemplates]);

  // ─── Filtered users ───
  const filteredUsers = useMemo(() => {
    let list = users;
    switch (filter) {
      case "paid": list = list.filter(u => u.hasPaid); break;
      case "pending": list = list.filter(u => u.hasPending && !u.hasPaid); break;
      case "new": list = list.filter(u => u.isNewEmail); break;
      case "received": list = list.filter(u => u.hasReceivedEmail); break;
      case "converted": list = list.filter(u => u.converted); break;
      case "not_converted": list = list.filter(u => u.hasReceivedEmail && !u.converted); break;
      case "no_transaction": list = list.filter(u => !u.hasPaid && !u.hasPending); break;
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(u =>
        (u.email || "").toLowerCase().includes(q) ||
        (u.first_name || "").toLowerCase().includes(q) ||
        u.id.toLowerCase().includes(q)
      );
    }
    return list;
  }, [users, filter, search]);

  // ─── Selection helpers ───
  const toggleUser = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAllFiltered = () => {
    const ids = filteredUsers.map(u => u.id);
    const allIn = ids.every(id => selectedIds.has(id));
    if (allIn) {
      setSelectedIds(new Set([...selectedIds].filter(id => !ids.includes(id))));
    } else {
      setSelectedIds(new Set([...selectedIds, ...ids]));
    }
  };

  const selectFilterGroup = (group: "paid" | "pending" | "new") => {
    const targetUsers = users.filter(u => {
      switch (group) {
        case "paid": return u.hasPaid;
        case "pending": return u.hasPending && !u.hasPaid;
        case "new": return u.isNewEmail;
      }
    });
    setSelectedIds(new Set(targetUsers.map(u => u.id)));
  };

  const clearSelection = () => setSelectedIds(new Set());

  // ─── Build email HTML preview ───
  const buildPreviewHtml = useCallback((firstName?: string): string => {
    const greeting = firstName ? `Olá, ${firstName}` : "Olá";
    const hasHeaderImg = headerImageUrl.trim() !== "";
    const hasFooterImg = footerImageUrl.trim() !== "";
    const hasSecondary = secondaryText.trim() !== "";

    const headerBlock = hasHeaderImg
      ? `<tr><td style="padding:0;text-align:center"><img src="${headerImageUrl}" alt="" style="display:block;max-width:600px;width:100%;height:auto;border-radius:16px 16px 0 0" /></td></tr>`
      : `<tr><td style="background:linear-gradient(135deg,#ffcc00,#e6b800);padding:32px;text-align:center">
    <h1 style="margin:0;color:#000;font-size:28px;font-weight:900">🎲 PixBett</h1>
    ${emailTitle ? `<p style="margin:8px 0 0;color:#1a1a1a;font-size:14px;font-weight:600">${emailTitle}</p>` : ""}
  </td></tr>`;

    const footerImgBlock = hasFooterImg
      ? `<tr><td style="padding:0;text-align:center"><img src="${footerImageUrl}" alt="" style="display:block;max-width:600px;width:100%;height:auto" /></td></tr>`
      : "";

    const secondaryBlock = hasSecondary
      ? `<p style="color:#64748b;font-size:14px;line-height:1.5;margin:0 0 24px">${secondaryText}</p>`
      : "";

    return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#06070a;font-family:'Segoe UI',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 16px">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#0d0f14;border-radius:16px;overflow:hidden;border:1px solid #1c212b">
  ${headerBlock}
  <tr><td style="padding:32px">
    <p style="color:#ffffff;font-size:18px;margin:0 0 16px">${greeting},</p>
    <p style="color:#94a3b8;font-size:15px;line-height:1.6;margin:0 0 24px">${bodyText}</p>
    ${secondaryBlock}
    ${ctaText ? `<table cellpadding="0" cellspacing="0" style="margin:0 auto"><tr>
      <td align="center" style="background:linear-gradient(135deg,#ffcc00,#e6b800);border-radius:12px;padding:0">
        <a href="${ctaUrl}" style="display:inline-block;padding:16px 48px;color:#000;text-decoration:none;font-size:18px;font-weight:800;border-radius:12px">${ctaText}</a>
      </td>
    </tr></table>` : ""}
  </td></tr>
  ${footerImgBlock}
  <tr><td style="padding:16px 32px;border-top:1px solid #1c212b;text-align:center">
    <p style="margin:0;color:#475569;font-size:12px">${footer}</p>
  </td></tr>
</table>
</td></tr></table>
</body>
</html>`
  }, [emailTitle, bodyText, secondaryText, ctaText, ctaUrl, footer, headerImageUrl, footerImageUrl]);

  // ─── Send test email ───
  const handleTestSend = async () => {
    if (!testEmail.trim()) { showError("Informe um email de destino"); return; }
    setTestLoading(true);
    setTestResult(null);
    try {
      const html = buildPreviewHtml();
      const { data, error } = await supabase.functions.invoke("send-email", {
        body: { to: testEmail.trim(), subject: `[TESTE] ${subject}`, html },
      });
      if (error) throw error;
      setTestResult({ ok: true, msg: "Email de teste enviado com sucesso!" });
      showSuccess("Teste enviado!");
    } catch (err: any) {
      const msg = err.message || "Falha ao enviar teste";
      setTestResult({ ok: false, msg });
      showError(msg);
    }
    setTestLoading(false);
  };

  // ─── Send campaign ───
  const prepareSend = (mode: "manual" | "all_filtered" | "pending" | "paid" | "new") => {
    setSendMode(mode);
    setShowConfirm(true);
  };

  const getRecipientsForMode = useCallback((): UserRow[] => {
    switch (sendMode) {
      case "manual": return users.filter(u => selectedIds.has(u.id));
      case "all_filtered": return filteredUsers;
      case "pending": return users.filter(u => u.hasPending && !u.hasPaid);
      case "paid": return users.filter(u => u.hasPaid);
      case "new": return users.filter(u => u.isNewEmail);
      default: return [];
    }
  }, [sendMode, users, selectedIds, filteredUsers]);

  const handleSendCampaign = async () => {
    const recipients = getRecipientsForMode();
    if (recipients.length === 0) { showError("Nenhum destinatário"); return; }
    if (!subject.trim()) { showError("Assunto obrigatório"); return; }
    if (!emailTitle.trim() && !bodyText.trim()) { showError("Preencha título ou texto do email"); return; }

    setSending(true);
    setSendResult(null);
    setSendProgress(null);
    const audienceType = sendMode || "manual";
    const html = buildPreviewHtml();

    try {
      const invokeBody = {
        name: campaignName || null,
        subject: subject.trim(),
        preheader: preheader || null,
        title: emailTitle || null,
        bodyText,
        secondaryText: secondaryText || null,
        ctaText,
        ctaUrl,
        footer,
        headerImageUrl: headerImageUrl || null,
        footerImageUrl: footerImageUrl || null,
        bodyHtml: html,
        audienceType,
        templateId: selectedTemplateId || null,
        recipients: recipients.map(r => ({
          userId: r.id,
          email: r.email,
          first_name: r.first_name || "",
        })),
      };

      let result = await supabase.functions.invoke("send-marketing-email", { body: invokeBody });
      if (result.error) {
        const errData = (result.error as any)?.context?.data;
        const msg = errData?.message || errData?.details || errData?.error || result.error.message;
        throw new Error(msg);
      }
      let data = result.data;
      if (!data.success) throw new Error(data.details || data.message || "Falha ao enviar campanha");

      setSendResult(data);
      setSendProgress({ sent: data.sent, failed: data.failed, total: data.totalRecipients || 0, remaining: data.remaining || 0 });

      while (data.remaining > 0) {
        result = await supabase.functions.invoke("send-marketing-email", {
          body: { _continue: true, campaignId: data.campaignId },
        });
        if (result.error) {
          const errData = (result.error as any)?.context?.data;
          const msg = errData?.message || errData?.details || errData?.error || result.error.message;
          throw new Error(msg);
        }
        data = result.data;
        if (!data.success) throw new Error(data.details || data.message || "Falha ao continuar envio");
        setSendResult(data);
        setSendProgress({ sent: data.sent, failed: data.failed, total: data.totalRecipients || 0, remaining: data.remaining || 0 });
      }

      showSuccess(`Campanha enviada! ${data.sent} enviados, ${data.failed} falhas.`);
      setSelectedIds(new Set());
      setShowConfirm(false);
      await loadData();
    } catch (err: any) {
      showError(err.message || "Falha ao enviar campanha");
    }
    setSending(false);
    setSendProgress(null);
  };

  // ─── View campaign details ───
  const toggleCampaignDetail = async (campaignId: string) => {
    if (expandedCampaign === campaignId) {
      setExpandedCampaign(null);
      return;
    }
    setExpandedCampaign(campaignId);
    if (!campaignDetails[campaignId]) {
      try {
        const { data, error } = await supabase.functions.invoke("get-campaign-stats", {
          body: { _campaignId: campaignId },
        });
        if (!error && data?.users) {
          setCampaignDetails(prev => ({
            ...prev,
            [campaignId]: {
              converted: data.users.filter((u: any) => u.converted),
            },
          }));
        }
      } catch {}
    }
  };

  // ─── Dashboard cards ───
  const dashCards = useMemo(() => {
    if (!dashboard) return [];
    return [
      { label: "Total de E-mails", value: dashboard.totalEmails, icon: Mail, color: "text-blue-400", bg: "bg-blue-500/10" },
      { label: "E-mails Enviados", value: dashboard.totalSent, icon: Send, color: "text-emerald-400", bg: "bg-emerald-500/10" },
      { label: "Última Campanha", value: dashboard.lastCampaignSent, icon: Activity, color: "text-purple-400", bg: "bg-purple-500/10" },
      { label: "Novos E-mails", value: dashboard.newEmails, icon: UserPlus, color: "text-[#ffcc00]", bg: "bg-[#ffcc00]/10", highlight: true },
      { label: "Pagantes", value: dashboard.paidUsers, icon: UserCheck, color: "text-emerald-400", bg: "bg-emerald-500/10" },
      { label: "Pending / Não Pagantes", value: dashboard.pendingUsers, icon: UserX, color: "text-amber-400", bg: "bg-amber-500/10" },
      { label: "Conversões", value: dashboard.conversions, icon: Target, color: "text-purple-400", bg: "bg-purple-500/10" },
      { label: "Valor Convertido", value: `R$ ${dashboard.convertedAmount.toFixed(2)}`, icon: DollarSign, color: "text-[#ffcc00]", bg: "bg-[#ffcc00]/10" },
      { label: "Taxa de Conversão", value: `${dashboard.conversionRate}%`, icon: TrendingUp, color: "text-emerald-400", bg: "bg-emerald-500/10" },
      { label: "Erros de Envio", value: dashboard.failedEmails, icon: AlertCircle, color: "text-red-400", bg: "bg-red-500/10" },
    ];
  }, [dashboard]);

  // ─── Render ───
  return (
    <div className="space-y-6 max-w-6xl">

      {/* ─── HEADER ─── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-[#ffcc00]/10 p-3 rounded-2xl">
            <MailCheck size={24} className="text-[#ffcc00]" />
          </div>
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tight">Email Marketing</h2>
            {dashboard && (
              <p className="text-[10px] text-gray-500 uppercase font-bold flex items-center gap-2 mt-0.5">
                <Clock size={12} /> Última atualização: {new Date(dashboard.lastUpdate).toLocaleString("pt-BR")}
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={loadData} disabled={loading}
            className="bg-[#13161d] border border-[#1c212b] px-4 py-2.5 rounded-xl text-xs font-black uppercase hover:bg-[#1c212b] transition-all disabled:opacity-50 flex items-center gap-2">
            <RefreshCw size={14} className={cn(loading && "animate-spin")} /> Atualizar
          </button>
        </div>
      </div>

      {/* ─── LOADING / ERROR ─── */}
      {loading && !dashboard && (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={32} className="animate-spin text-[#ffcc00]" />
        </div>
      )}

      {loadError && !dashboard && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-3xl p-8 text-center">
          <AlertCircle size={32} className="text-red-400 mx-auto mb-3" />
          <p className="text-red-400 font-bold text-sm mb-2">Erro ao carregar dados</p>
          <p className="text-gray-500 text-xs mb-4">{loadError}</p>
          <button onClick={loadData} className="bg-[#ffcc00] text-black px-6 py-2.5 rounded-xl text-xs font-black uppercase">
            Tentar Novamente
          </button>
        </div>
      )}

      {loadError && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-center gap-3">
          <AlertCircle size={16} className="text-amber-400 shrink-0" />
          <p className="text-[11px] text-amber-400 font-bold flex-1">
            Dados podem estar desatualizados: {loadError}
          </p>
          <button onClick={loadData} className="text-[10px] bg-amber-500/20 text-amber-400 px-3 py-1.5 rounded-lg font-bold uppercase hover:bg-amber-500/30 shrink-0">
            Re-tentar
          </button>
        </div>
      )}

      {dashboard && (
        <>
          {/* ─── SECTION TABS ─── */}
          <div className="flex gap-2 border-b border-[#1c212b] pb-3 overflow-x-auto">
            {[
              { id: "dashboard" as const, label: "Dashboard", icon: BarChart3 },
              { id: "editor" as const, label: "Editor de Email", icon: Edit3 },
              { id: "history" as const, label: "Histórico", icon: FileText },
            ].map(s => (
              <button key={s.id} onClick={() => setActiveSection(s.id)}
                className={cn("flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all",
                  activeSection === s.id
                    ? "bg-[#ffcc00] text-black"
                    : "bg-[#1c212b] text-gray-400 hover:text-white"
                )}>
                <s.icon size={14} />
                {s.label}
              </button>
            ))}
          </div>

          {/* ════════════════════════════════════════════ */}
          {/* SECTION: DASHBOARD                         */}
          {/* ════════════════════════════════════════════ */}
          {activeSection === "dashboard" && (
            <div className="space-y-6">

              {/* Relay config mini */}
              <div className="bg-[#0d0f14] border border-[#1c212b] rounded-3xl p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Settings size={16} className="text-[#ffcc00]" />
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Relay</span>
                  </div>
                  {!config ? (
                    <button onClick={loadConfig} disabled={configLoading}
                      className="text-[10px] bg-[#1c212b] text-gray-400 px-3 py-1.5 rounded-lg hover:text-white transition-all flex items-center gap-1">
                      {configLoading ? <Loader2 size={10} className="animate-spin" /> : null}
                      Carregar Status
                    </button>
                  ) : (
                    <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                      <Check size={10} /> {config.provider}
                    </span>
                  )}
                </div>
              </div>

              {/* New emails alert */}
              {dashboard.newEmails > 0 && (
                <div className="bg-[#ffcc00]/10 border border-[#ffcc00]/30 rounded-3xl p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-black text-[#ffcc00] uppercase tracking-wider flex items-center gap-2">
                        <Mail size={16} /> Novos E-mails
                      </h3>
                      <p className="text-[11px] text-gray-400 mt-1">
                        {dashboard.newEmails} novo{dashboard.newEmails !== 1 ? "s" : ""} e-mail{dashboard.newEmails !== 1 ? "s" : ""} disponíve{dashboard.newEmails !== 1 ? "is" : "l"} para envio
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => { setFilter("new"); setActiveSection("editor"); }}
                        className="bg-[#ffcc00] text-black px-5 py-2.5 rounded-xl text-xs font-black uppercase hover:bg-[#ffdb4d] transition-all">
                        Ver Novos E-mails
                      </button>
                      <button onClick={() => { selectFilterGroup("new"); setActiveSection("editor"); }}
                        className="bg-[#1c212b] text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase hover:bg-[#2a303d] transition-all">
                        Selecionar Todos
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Dashboard cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {dashCards.map((card, i) => (
                  <div key={i} onClick={card.label === "Novos E-mails" ? () => { setFilter("new"); setActiveSection("editor"); } : undefined}
                    className={cn(
                      "bg-[#0d0f14] border border-[#1c212b] rounded-2xl p-4 space-y-3 transition-all",
                      card.highlight ? "border-[#ffcc00]/30 cursor-pointer hover:bg-[#ffcc00]/5" : "cursor-default"
                    )}>
                    <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", card.bg)}>
                      <card.icon size={16} className={card.color} />
                    </div>
                    <div>
                      <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{card.label}</div>
                      <div className={cn("text-lg font-black mt-0.5", card.color)}>{card.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════ */}
          {/* SECTION: EDITOR + LIST + SEND              */}
          {/* ════════════════════════════════════════════ */}
          {activeSection === "editor" && (
            <div className="space-y-6">

              {/* ─── CONFIRMATION MODAL ─── */}
              {showConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
                  <div className="bg-[#0d0f14] border border-[#1c212b] rounded-3xl p-6 max-w-md w-full space-y-4 max-h-[90vh] overflow-y-auto">
                    {sending ? (
                      <>
                        <div className="flex items-center gap-3">
                          <Loader2 size={20} className="animate-spin text-[#ffcc00]" />
                          <h3 className="text-lg font-black uppercase">Enviando...</h3>
                        </div>
                        {sendProgress ? (
                          <div className="bg-[#06070a] rounded-xl p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-400">Progresso</span>
                              <span className="text-xs text-white font-bold">{sendProgress.sent + sendProgress.failed}/{sendProgress.total}</span>
                            </div>
                            <div className="w-full bg-[#1c212b] rounded-full h-2.5 overflow-hidden">
                              <div className="bg-[#ffcc00] h-full rounded-full transition-all duration-300"
                                style={{ width: `${sendProgress.total > 0 ? ((sendProgress.sent + sendProgress.failed) / sendProgress.total * 100) : 0}%` }} />
                            </div>
                            <div className="flex items-center justify-between text-[10px] font-bold">
                              <span className="text-emerald-400">✓ {sendProgress.sent} enviados</span>
                              <span className="text-red-400">✗ {sendProgress.failed} falhas</span>
                              <span className="text-amber-400">⏳ {sendProgress.remaining} restantes</span>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-[#06070a] rounded-xl p-4 flex items-center justify-center gap-3">
                            <Loader2 size={16} className="animate-spin text-gray-400" />
                            <span className="text-sm text-gray-400">Preparando fila de envio...</span>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-3">
                          <Send size={20} className="text-[#ffcc00]" />
                          <h3 className="text-lg font-black uppercase">Confirmar Envio</h3>
                        </div>
                        <div className="bg-[#06070a] rounded-xl p-4 space-y-2 text-sm">
                          <p className="text-white font-bold">
                            Você está prestes a enviar este e-mail para <span className="text-[#ffcc00]">{getRecipientsForMode().length}</span> destinatário{getRecipientsForMode().length !== 1 ? "s" : ""}.
                          </p>
                          <p className="text-[10px] text-gray-500 uppercase font-bold">
                            Tipo: {sendMode === "manual" ? "Selecionados manualmente" :
                              sendMode === "all_filtered" ? `Filtro: ${filter}` :
                              sendMode === "pending" ? "Apenas Pending" :
                              sendMode === "paid" ? "Apenas Pagantes" :
                              sendMode === "new" ? "Apenas Novos E-mails" : "Desconhecido"}
                          </p>
                          <div className="text-xs text-gray-600 space-y-1 pt-2 border-t border-[#1c212b]">
                            <p><strong className="text-gray-400">Assunto:</strong> {subject}</p>
                            <p><strong className="text-gray-400">Campanha:</strong> {campaignName || "(sem nome)"}</p>
                            <p><strong className="text-gray-400">Modelo:</strong> {newTemplateName || selectedTemplateId ? `${newTemplateName || "Sem nome"} (${selectedTemplateId?.slice(0, 8) || "novo"})` : "Nenhum"}</p>
                            {headerImageUrl && <p><strong className="text-gray-400">Imagem Topo:</strong> <span className="text-emerald-400">✓</span></p>}
                            {footerImageUrl && <p><strong className="text-gray-400">Imagem Rodapé:</strong> <span className="text-emerald-400">✓</span></p>}
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <button onClick={() => setShowConfirm(false)}
                            className="flex-1 bg-[#1c212b] text-white py-3 rounded-xl text-xs font-black uppercase hover:bg-[#2a303d] transition-all">
                            Cancelar
                          </button>
                          <button onClick={handleSendCampaign}
                            className="flex-1 bg-[#ffcc00] text-black py-3 rounded-xl text-xs font-black uppercase hover:bg-[#ffdb4d] transition-all flex items-center justify-center gap-2">
                            <Send size={14} />
                            Enviar
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* ─── TEMPLATE MANAGER ─── */}
              <div className="bg-[#0d0f14] border border-[#1c212b] rounded-3xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Layers size={20} className="text-[#ffcc00]" />
                    <h3 className="text-lg font-black uppercase tracking-wider">Modelos</h3>
                    {templateLoading && <Loader2 size={14} className="animate-spin text-gray-500" />}
                  </div>
                  <button onClick={() => setTemplateManagerOpen(!templateManagerOpen)}
                    className="flex items-center gap-2 text-[10px] bg-[#1c212b] text-gray-400 px-3 py-2 rounded-xl hover:text-white transition-all font-bold uppercase">
                    {templateManagerOpen ? "Fechar" : "Gerenciar"}
                  </button>
                </div>

                {templateManagerOpen && (
                  <div className="space-y-3">
                    {/* Template list */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {templates.map(tpl => (
                        <div key={tpl.id} onClick={() => selectTemplateData(tpl)}
                          className={cn(
                            "bg-[#06070a] border rounded-xl p-3 cursor-pointer transition-all group",
                            selectedTemplateId === tpl.id
                              ? "border-[#ffcc00]/40 bg-[#ffcc00]/5"
                              : "border-[#1c212b] hover:border-[#ffcc00]/20"
                          )}>
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1">
                                <span className="text-xs font-bold text-white truncate">{tpl.template_name}</span>
                                {tpl.is_default && <Star size={10} className="text-[#ffcc00] shrink-0" />}
                              </div>
                              <div className="text-[9px] text-gray-600 truncate">{tpl.subject}</div>
                            </div>
                            <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={(e) => { e.stopPropagation(); openEditModal(tpl); }}
                                title="Editar"
                                className="p-1 rounded-lg bg-[#1c212b] text-gray-400 hover:text-[#ffcc00] transition-all">
                                <Edit3 size={10} />
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); handleDuplicateTemplate(tpl); }}
                                title="Duplicar"
                                className="p-1 rounded-lg bg-[#1c212b] text-gray-400 hover:text-white transition-all">
                                <Copy size={10} />
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); handleSetDefaultTemplate(tpl.id); }}
                                title="Marcar como padrão"
                                className="p-1 rounded-lg bg-[#1c212b] text-gray-400 hover:text-[#ffcc00] transition-all">
                                <Star size={10} />
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); handleDeleteTemplate(tpl.id); }}
                                title="Excluir"
                                className="p-1 rounded-lg bg-[#1c212b] text-gray-400 hover:text-red-400 transition-all">
                                <Trash2 size={10} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* New template / clear */}
                    <div className="flex gap-2">
                      <input type="text" value={newTemplateName} onChange={e => setNewTemplateName(e.target.value)}
                        placeholder="Nome do novo modelo..."
                        className="flex-1 bg-[#06070a] border border-[#1c212b] rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-[#ffcc00]/50" />
                      <button onClick={openCreateModal}
                        className="bg-[#ffcc00] text-black px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-[#ffdb4d] transition-all flex items-center gap-2">
                        <Plus size={12} /> Criar
                      </button>
                      <button onClick={clearEditor}
                        className="bg-[#1c212b] text-gray-400 px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:text-white transition-all">
                        Novo
                      </button>
                    </div>

                    {/* Selected template info */}
                    {selectedTemplateId && (
                      <div className="bg-[#ffcc00]/5 border border-[#ffcc00]/20 rounded-xl px-4 py-2 flex items-center justify-between">
                        <span className="text-[10px] text-gray-400">
                          Editando: <strong className="text-[#ffcc00]">{newTemplateName}</strong>
                          <span className="text-gray-600 ml-2">ID: {selectedTemplateId.slice(0, 8)}</span>
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ─── EMAIL EDITOR ─── */}
              <div className="bg-[#0d0f14] border border-[#1c212b] rounded-3xl p-6 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <Edit3 size={20} className="text-[#ffcc00]" />
                    <h3 className="text-lg font-black uppercase tracking-wider">Editor de Email</h3>
                    {templateLoading && <Loader2 size={14} className="animate-spin text-gray-500" />}
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => saveTemplate()} disabled={templateSaving || templateLoading}
                      className="flex items-center gap-2 text-[10px] bg-[#1c212b] text-gray-400 px-3 py-2 rounded-xl hover:text-white transition-all font-bold uppercase disabled:opacity-50">
                      {templateSaving ? <Loader2 size={12} className="animate-spin" /> : templateSaved ? <Check size={12} className="text-emerald-400" /> : <FileText size={12} />}
                      {templateSaving ? "Salvando..." : templateSaved ? "Salvo!" : "Salvar Template"}
                    </button>
                    <button onClick={() => setShowPreview(!showPreview)}
                      className="flex items-center gap-2 text-[10px] bg-[#1c212b] text-gray-400 px-3 py-2 rounded-xl hover:text-white transition-all font-bold uppercase">
                      {showPreview ? <EyeOff size={12} /> : <Eye size={12} />}
                      {showPreview ? "Ocultar Prévia" : "Ver Prévia"}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left: Editor fields */}
                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] text-gray-500 font-bold uppercase block mb-1">Nome da Campanha</label>
                      <input type="text" value={campaignName} onChange={e => setCampaignName(e.target.value)}
                        placeholder="Ex: Recuperação Pending"
                        className="w-full bg-[#06070a] border border-[#1c212b] rounded-xl px-4 py-2.5 text-white text-sm font-bold focus:outline-none focus:border-[#ffcc00]/50" />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500 font-bold uppercase block mb-1">Assunto</label>
                      <input type="text" value={subject} onChange={e => setSubject(e.target.value)}
                        className="w-full bg-[#06070a] border border-[#1c212b] rounded-xl px-4 py-2.5 text-white text-sm font-bold focus:outline-none focus:border-[#ffcc00]/50" />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500 font-bold uppercase block mb-1">Pré-header</label>
                      <input type="text" value={preheader} onChange={e => setPreheader(e.target.value)}
                        placeholder="Texto de pré-visualização ao lado do assunto"
                        className="w-full bg-[#06070a] border border-[#1c212b] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#ffcc00]/50" />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500 font-bold uppercase block mb-1">Título Principal</label>
                      <input type="text" value={emailTitle} onChange={e => setEmailTitle(e.target.value)}
                        className="w-full bg-[#06070a] border border-[#1c212b] rounded-xl px-4 py-2.5 text-white text-sm font-bold focus:outline-none focus:border-[#ffcc00]/50" />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500 font-bold uppercase block mb-1">Texto Principal</label>
                      <textarea value={bodyText} onChange={e => setBodyText(e.target.value)}
                        rows={3}
                        className="w-full bg-[#06070a] border border-[#1c212b] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#ffcc00]/50 resize-y" />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500 font-bold uppercase block mb-1">Texto Secundário</label>
                      <textarea value={secondaryText} onChange={e => setSecondaryText(e.target.value)}
                        rows={2}
                        placeholder="Texto adicional opcional abaixo do principal"
                        className="w-full bg-[#06070a] border border-[#1c212b] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#ffcc00]/50 resize-y" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] text-gray-500 font-bold uppercase block mb-1">Texto do Botão</label>
                        <input type="text" value={ctaText} onChange={e => setCtaText(e.target.value)}
                          className="w-full bg-[#06070a] border border-[#1c212b] rounded-xl px-4 py-2.5 text-white text-sm font-bold focus:outline-none focus:border-[#ffcc00]/50" />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-500 font-bold uppercase block mb-1">Link do Botão</label>
                        <input type="url" value={ctaUrl} onChange={e => setCtaUrl(e.target.value)}
                          className="w-full bg-[#06070a] border border-[#1c212b] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#ffcc00]/50" />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500 font-bold uppercase block mb-1">Imagem de Topo (URL)</label>
                      <input type="url" value={headerImageUrl} onChange={e => setHeaderImageUrl(e.target.value)}
                        placeholder="https://exemplo.com/header.jpg"
                        className="w-full bg-[#06070a] border border-[#1c212b] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#ffcc00]/50" />
                      {headerImageUrl && (
                        <div className="mt-2 rounded-xl overflow-hidden border border-[#1c212b] max-h-[120px]">
                          <img src={headerImageUrl} alt="Header preview"
                            className="w-full h-auto object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500 font-bold uppercase block mb-1">Imagem de Rodapé (URL)</label>
                      <input type="url" value={footerImageUrl} onChange={e => setFooterImageUrl(e.target.value)}
                        placeholder="https://exemplo.com/footer.jpg"
                        className="w-full bg-[#06070a] border border-[#1c212b] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#ffcc00]/50" />
                      {footerImageUrl && (
                        <div className="mt-2 rounded-xl overflow-hidden border border-[#1c212b] max-h-[80px]">
                          <img src={footerImageUrl} alt="Footer preview"
                            className="w-full h-auto object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500 font-bold uppercase block mb-1">Rodapé</label>
                      <input type="text" value={footer} onChange={e => setFooter(e.target.value)}
                        className="w-full bg-[#06070a] border border-[#1c212b] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#ffcc00]/50" />
                    </div>
                  </div>

                  {/* Right: Preview */}
                  {showPreview && (
                    <div className="bg-[#06070a] rounded-2xl border border-[#1c212b] overflow-hidden">
                      <div className="px-4 py-3 border-b border-[#1c212b] flex items-center justify-between">
                        <span className="text-[10px] text-gray-500 font-bold uppercase">Prévia</span>
                        <span className="text-[10px] text-gray-600">{subject}</span>
                      </div>
                      <iframe
                        title="Preview"
                        srcDoc={buildPreviewHtml("João")}
                        className="w-full h-[500px]"
                        sandbox="allow-same-origin"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* ─── TEST SEND ─── */}
              <div className="bg-[#0d0f14] border border-[#1c212b] rounded-3xl p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <Send size={20} className="text-[#ffcc00]" />
                  <h3 className="text-lg font-black uppercase tracking-wider">Enviar Teste</h3>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input type="email" value={testEmail} onChange={e => setTestEmail(e.target.value)}
                    placeholder="email@teste.com"
                    className="flex-1 bg-[#06070a] border border-[#1c212b] rounded-xl px-4 py-2.5 text-white text-sm font-bold focus:outline-none focus:border-[#ffcc00]/50" />
                  <button onClick={handleTestSend} disabled={testLoading || !testEmail.trim()}
                    className="bg-[#1c212b] text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase hover:bg-[#2a303d] transition-all disabled:opacity-50 flex items-center justify-center gap-2 shrink-0">
                    {testLoading ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
                    {testLoading ? "Enviando..." : "Enviar Teste"}
                  </button>
                </div>
                {testResult && (
                  <div className={cn("rounded-2xl p-4 text-sm font-bold flex items-start gap-3",
                    testResult.ok ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400" : "bg-red-500/10 border border-red-500/30 text-red-400"
                  )}>
                    {testResult.ok ? <Check size={18} className="mt-0.5 shrink-0" /> : <AlertCircle size={18} className="mt-0.5 shrink-0" />}
                    <p>{testResult.msg}</p>
                  </div>
                )}
              </div>

              {/* ─── USER LIST ─── */}
              <div className="bg-[#0d0f14] border border-[#1c212b] rounded-3xl p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <Users size={20} className="text-[#ffcc00]" />
                  <h3 className="text-lg font-black uppercase tracking-wider">Destinatários</h3>
                  {loading && <Loader2 size={14} className="animate-spin text-[#ffcc00]" />}
                  {!loading && <span className="text-[10px] text-gray-500 font-bold">{filteredUsers.length} usuários</span>}
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: "all" as FilterType, label: `Todos (${users.length})` },
                    { key: "paid" as FilterType, label: `Pagantes (${users.filter(u => u.hasPaid).length})` },
                    { key: "pending" as FilterType, label: `Pending (${users.filter(u => u.hasPending && !u.hasPaid).length})` },
                    { key: "new" as FilterType, label: `Novos (${users.filter(u => u.isNewEmail).length})` },
                    { key: "received" as FilterType, label: `Receberam (${users.filter(u => u.hasReceivedEmail).length})` },
                    { key: "converted" as FilterType, label: `Converteram (${users.filter(u => u.converted).length})` },
                    { key: "not_converted" as FilterType, label: `Não Conv. (${users.filter(u => u.hasReceivedEmail && !u.converted).length})` },
                    { key: "no_transaction" as FilterType, label: `Sem trans. (${users.filter(u => !u.hasPaid && !u.hasPending).length})` },
                  ].map(f => (
                    <button key={f.key} onClick={() => { setFilter(f.key); setSearch(""); }}
                      className={cn("px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all",
                        filter === f.key ? "bg-[#ffcc00] text-black" : "bg-[#1c212b] text-gray-400 hover:text-white"
                      )}>
                      {f.label}
                    </button>
                  ))}
                </div>

                {/* Search + Selection controls */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex items-center gap-3 bg-[#06070a] rounded-2xl p-2 border border-[#1c212b] flex-1">
                    <Search size={16} className="text-gray-500 ml-2 shrink-0" />
                    <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                      placeholder="Buscar por nome ou email..."
                      className="flex-1 bg-transparent text-sm text-white placeholder:text-gray-600 focus:outline-none" />
                    {search && (
                      <button onClick={() => setSearch("")} className="text-[10px] text-gray-500 hover:text-white font-bold uppercase tracking-wider mr-2">Limpar</button>
                    )}
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <button onClick={clearSelection} className="px-3 py-2 rounded-xl text-[10px] font-black uppercase bg-[#1c212b] text-gray-400 hover:text-white transition-all">
                      Limpar ({selectedIds.size})
                    </button>
                    <button onClick={() => selectFilterGroup("paid")} className="px-3 py-2 rounded-xl text-[10px] font-black uppercase bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all">
                      Pagantes
                    </button>
                    <button onClick={() => selectFilterGroup("pending")} className="px-3 py-2 rounded-xl text-[10px] font-black uppercase bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-all">
                      Pending
                    </button>
                    <button onClick={() => selectFilterGroup("new")} className="px-3 py-2 rounded-xl text-[10px] font-black uppercase bg-[#ffcc00]/10 text-[#ffcc00] hover:bg-[#ffcc00]/20 transition-all">
                      Novos
                    </button>
                  </div>
                </div>

                {/* Select all checkbox */}
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={filteredUsers.length > 0 && filteredUsers.every(u => selectedIds.has(u.id))}
                      onChange={selectAllFiltered}
                      className="w-4 h-4 rounded border-gray-600 bg-[#06070a] accent-[#ffcc00]" />
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                      Selecionar todos desta página ({filteredUsers.length})
                    </span>
                  </label>
                </div>

                {/* User rows */}
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {filteredUsers.length === 0 ? (
                    <div className="text-center py-12 text-gray-600 text-sm">Nenhum usuário encontrado</div>
                  ) : (
                    filteredUsers.map(u => {
                      const sel = selectedIds.has(u.id);
                      return (
                        <div key={u.id} onClick={() => toggleUser(u.id)}
                          className={cn("flex items-center justify-between gap-3 bg-[#06070a] border rounded-2xl p-4 cursor-pointer transition-all",
                            sel ? "border-[#ffcc00]/40 bg-[#ffcc00]/5" : "border-[#1c212b] hover:border-[#ffcc00]/20"
                          )}>
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <input type="checkbox" checked={sel} readOnly
                              className="w-4 h-4 rounded border-gray-600 accent-[#ffcc00] shrink-0" />
                            <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center text-black text-xs font-black shrink-0",
                              u.paymentStatus === "paid" ? "bg-emerald-500" :
                              u.paymentStatus === "pending" ? "bg-amber-500" : "bg-gray-600"
                            )}>
                              {(u.first_name || u.email || "?").charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-bold text-white truncate">{u.first_name || "Sem nome"}</span>
                                {u.isNewEmail && (
                                  <span className="text-[8px] bg-[#ffcc00]/20 text-[#ffcc00] px-2 py-0.5 rounded-full font-bold uppercase">Novo</span>
                                )}
                                {u.converted && (
                                  <span className="text-[8px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold uppercase">Convertido</span>
                                )}
                              </div>
                              <div className="text-[10px] text-gray-600 truncate">{u.email}</div>
                              {u.paidTotal > 0 && (
                                <div className="text-[8px] text-emerald-500 font-bold mt-0.5">R$ {u.paidTotal.toFixed(2)} em pagamentos</div>
                              )}
                              {u.convertedAmount > 0 && (
                                <div className="text-[8px] text-purple-400 font-bold mt-0.5">R$ {u.convertedAmount.toFixed(2)} convertido</div>
                              )}
                            </div>
                            <div className="text-right shrink-0">
                              <div className={cn("text-[10px] font-bold",
                                u.paymentStatus === "paid" ? "text-emerald-400" :
                                u.paymentStatus === "pending" ? "text-amber-400" : "text-gray-500"
                              )}>
                                {u.paymentStatus === "paid" ? "Pago" :
                                 u.paymentStatus === "pending" ? "Pending" : "Sem trans."}
                              </div>
                              <div className="text-xs font-black text-[#ffcc00]">R$ {u.real_balance.toFixed(2)}</div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* ─── SEND BUTTONS ─── */}
              <div className="bg-[#0d0f14] border border-[#1c212b] rounded-3xl p-6 space-y-4">
                <h3 className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
                  <Zap size={16} className="text-[#ffcc00]" />
                  Envio da Campanha
                </h3>
                {sendResult && (
                  <div className={cn("rounded-2xl p-4 text-sm font-bold",
                    sendResult.failed === 0 ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400" : "bg-amber-500/10 border border-amber-500/30 text-amber-400"
                  )}>
                    <div className="flex items-start gap-3">
                      {sendResult.failed === 0 ? <Check size={18} className="mt-0.5 shrink-0" /> : <AlertCircle size={18} className="mt-0.5 shrink-0" />}
                      <div>
                        <p>{sendResult.sent} enviados, {sendResult.failed} falhas</p>
                        {sendResult.campaignId && (
                          <p className="text-[10px] text-gray-500 mt-1">Campanha ID: {sendResult.campaignId}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <button onClick={() => prepareSend("manual")} disabled={selectedIds.size === 0}
                    className="bg-[#ffcc00] text-black py-3 rounded-xl text-[10px] font-black uppercase hover:bg-[#ffdb4d] transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                    <Send size={12} /> {selectedIds.size} Selecionados
                  </button>
                  <button onClick={() => prepareSend("all_filtered")} disabled={filteredUsers.length === 0}
                    className="bg-[#1c212b] text-white py-3 rounded-xl text-[10px] font-black uppercase hover:bg-[#2a303d] transition-all disabled:opacity-50">
                    Filtro: {filteredUsers.length}
                  </button>
                  <button onClick={() => prepareSend("pending")} disabled={users.filter(u => u.hasPending && !u.hasPaid).length === 0}
                    className="bg-amber-500/10 text-amber-400 py-3 rounded-xl text-[10px] font-black uppercase border border-amber-500/20 hover:bg-amber-500/20 transition-all disabled:opacity-50">
                    Pending ({users.filter(u => u.hasPending && !u.hasPaid).length})
                  </button>
                  <button onClick={() => prepareSend("paid")} disabled={users.filter(u => u.hasPaid).length === 0}
                    className="bg-emerald-500/10 text-emerald-400 py-3 rounded-xl text-[10px] font-black uppercase border border-emerald-500/20 hover:bg-emerald-500/20 transition-all disabled:opacity-50">
                    Pagantes ({users.filter(u => u.hasPaid).length})
                  </button>
                  <button onClick={() => prepareSend("new")} disabled={users.filter(u => u.isNewEmail).length === 0}
                    className="bg-[#ffcc00]/10 text-[#ffcc00] py-3 rounded-xl text-[10px] font-black uppercase border border-[#ffcc00]/20 hover:bg-[#ffcc00]/20 transition-all disabled:opacity-50">
                    Novos ({users.filter(u => u.isNewEmail).length})
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════ */}
          {/* SECTION: HISTORY / CAMPAIGN REPORT         */}
          {/* ════════════════════════════════════════════ */}
          {activeSection === "history" && (
            <div className="space-y-4">
              {campaigns.length === 0 ? (
                <div className="bg-[#0d0f14] border border-[#1c212b] rounded-3xl p-12 text-center">
                  <FileText size={32} className="text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">Nenhuma campanha enviada ainda</p>
                </div>
              ) : (
                <>
                  {/* Overall stats */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: "Total de Campanhas", value: campaigns.length, icon: BarChart3, color: "text-white" },
                      { label: "Total Enviados", value: campaigns.reduce((s, c) => s + c.liveSent, 0), icon: Send, color: "text-emerald-400" },
                      { label: "Total Conversões", value: campaigns.reduce((s, c) => s + c.liveConversions, 0), icon: Target, color: "text-purple-400" },
                      { label: "Valor Convertido", value: `R$ ${campaigns.reduce((s, c) => s + c.liveValue, 0).toFixed(2)}`, icon: DollarSign, color: "text-[#ffcc00]" },
                    ].map((s, i) => (
                      <div key={i} className="bg-[#0d0f14] border border-[#1c212b] rounded-2xl p-4">
                        <div className={cn("text-[10px] text-gray-500 font-bold uppercase mb-1", s.color)}>{s.label}</div>
                        <div className={cn("text-xl font-black", s.color)}>{s.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Campaign list */}
                  <div className="bg-[#0d0f14] border border-[#1c212b] rounded-3xl overflow-hidden">
                    <div className="p-6 border-b border-[#1c212b]">
                      <h3 className="text-lg font-black uppercase tracking-wider flex items-center gap-2">
                        <FileText size={18} className="text-[#ffcc00]" />
                        Campanhas Enviadas
                      </h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-gray-500 font-bold uppercase tracking-wider border-b border-[#1c212b]">
                            <th className="text-left py-3 px-4">Campanha</th>
                            <th className="text-right py-3 px-4">Enviados</th>
                            <th className="text-right py-3 px-4">Falhas</th>
                            <th className="text-right py-3 px-4">Conversões</th>
                            <th className="text-right py-3 px-4">Valor</th>
                            <th className="text-right py-3 px-4">Taxa</th>
                            <th className="text-right py-3 px-4">Data</th>
                            <th className="text-center py-3 px-4"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {campaigns.map(c => (
                            <React.Fragment key={c.id}>
                              <tr className="border-b border-[#1c212b]/50 hover:bg-white/5 cursor-pointer"
                                onClick={() => toggleCampaignDetail(c.id)}>
                                <td className="py-3 px-4 text-white font-bold truncate max-w-[200px]">{c.name || c.subject}</td>
                                <td className="py-3 px-4 text-right text-white">{c.liveSent}</td>
                                <td className="py-3 px-4 text-right text-red-400">{c.liveFailed}</td>
                                <td className="py-3 px-4 text-right text-purple-400">{c.liveConversions}</td>
                                <td className="py-3 px-4 text-right text-[#ffcc00]">R$ {c.liveValue.toFixed(2)}</td>
                                <td className="py-3 px-4 text-right text-emerald-400">{c.liveRate}%</td>
                                <td className="py-3 px-4 text-right text-gray-500">{new Date(c.sent_at || c.created_at).toLocaleDateString("pt-BR")}</td>
                                <td className="py-3 px-4 text-center text-gray-500">
                                  {expandedCampaign === c.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                </td>
                              </tr>
                              {expandedCampaign === c.id && (
                                <tr>
                                  <td colSpan={8} className="p-4 bg-[#06070a]">
                                    <div className="space-y-3">
                                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                        <div className="bg-[#0d0f14] rounded-xl p-3">
                                          <div className="text-[9px] text-gray-500 uppercase font-bold">Assunto</div>
                                          <div className="text-xs text-white font-bold mt-1">{c.subject}</div>
                                        </div>
                                        <div className="bg-[#0d0f14] rounded-xl p-3">
                                          <div className="text-[9px] text-gray-500 uppercase font-bold">Público</div>
                                          <div className="text-xs text-white font-bold mt-1">{c.audience_type || "all"}</div>
                                        </div>
                                        <div className="bg-[#0d0f14] rounded-xl p-3">
                                          <div className="text-[9px] text-gray-500 uppercase font-bold">Envio</div>
                                          <div className="text-xs text-white font-bold mt-1">{c.sent_at ? new Date(c.sent_at).toLocaleString("pt-BR") : "-"}</div>
                                        </div>
                                        <div className="bg-[#0d0f14] rounded-xl p-3">
                                          <div className="text-[9px] text-gray-500 uppercase font-bold">Conversão</div>
                                          <div className="text-xs text-emerald-400 font-bold mt-1">{c.liveRate}%</div>
                                        </div>
                                      </div>
                                      {campaignDetails[c.id] && (
                                        <div>
                                          <h4 className="text-[10px] text-gray-500 font-bold uppercase mb-2">
                                            Usuários que Converteram ({campaignDetails[c.id].converted.length})
                                          </h4>
                                          {campaignDetails[c.id].converted.length === 0 ? (
                                            <p className="text-[10px] text-gray-600">Nenhuma conversão registrada</p>
                                          ) : (
                                            <div className="space-y-1 max-h-[200px] overflow-y-auto">
                                              {campaignDetails[c.id].converted.map((cu) => (
                                                <div key={cu.id} className="flex items-center justify-between bg-[#0d0f14] rounded-xl p-3">
                                                  <div className="flex items-center gap-3 min-w-0">
                                                    <div className="w-6 h-6 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-[8px] font-black">
                                                      {(cu.first_name || cu.email || "?").charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="min-w-0">
                                                      <div className="text-xs font-bold text-white truncate">{cu.first_name || "Sem nome"}</div>
                                                      <div className="text-[9px] text-gray-600 truncate">{cu.email}</div>
                                                    </div>
                                                  </div>
                                                  <div className="text-right shrink-0">
                                                    <div className="text-xs font-black text-emerald-400">R$ {cu.convertedAmount.toFixed(2)}</div>
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}

      {/* ─── TEMPLATE EDITOR MODAL ─── */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-[#0d0f14] border border-[#1c212b] rounded-3xl w-full max-w-5xl max-h-[90vh] overflow-y-auto space-y-0 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-[#1c212b] shrink-0">
              <div className="flex items-center gap-3">
                {modalTemplateId ? <Edit3 size={20} className="text-[#ffcc00]" /> : <Plus size={20} className="text-[#ffcc00]" />}
                <h3 className="text-lg font-black uppercase">{modalTemplateId ? "Editar Modelo" : "Novo Modelo"}</h3>
              </div>
              <button onClick={closeModal} className="p-2 rounded-xl bg-[#1c212b] text-gray-400 hover:text-white transition-all">
                <X size={16} />
              </button>
            </div>

            {/* Body: fields + preview */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left: fields */}
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] text-gray-500 font-bold uppercase block mb-1">Nome do Modelo *</label>
                    <input type="text" value={modalName} onChange={e => setModalName(e.target.value)}
                      placeholder="Ex: Campanha de Boas-Vindas"
                      className="w-full bg-[#06070a] border border-[#1c212b] rounded-xl px-4 py-2.5 text-white text-sm font-bold focus:outline-none focus:border-[#ffcc00]/50" />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 font-bold uppercase block mb-1">Nome da Campanha</label>
                    <input type="text" value={modalCampaignName} onChange={e => setModalCampaignName(e.target.value)}
                      placeholder="Ex: Recuperação Pending"
                      className="w-full bg-[#06070a] border border-[#1c212b] rounded-xl px-4 py-2.5 text-white text-sm font-bold focus:outline-none focus:border-[#ffcc00]/50" />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 font-bold uppercase block mb-1">Assunto *</label>
                    <input type="text" value={modalSubject} onChange={e => setModalSubject(e.target.value)}
                      className="w-full bg-[#06070a] border border-[#1c212b] rounded-xl px-4 py-2.5 text-white text-sm font-bold focus:outline-none focus:border-[#ffcc00]/50" />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 font-bold uppercase block mb-1">Pré-header</label>
                    <input type="text" value={modalPreheader} onChange={e => setModalPreheader(e.target.value)}
                      placeholder="Texto de pré-visualização ao lado do assunto"
                      className="w-full bg-[#06070a] border border-[#1c212b] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#ffcc00]/50" />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 font-bold uppercase block mb-1">Título Principal</label>
                    <input type="text" value={modalTitle} onChange={e => setModalTitle(e.target.value)}
                      className="w-full bg-[#06070a] border border-[#1c212b] rounded-xl px-4 py-2.5 text-white text-sm font-bold focus:outline-none focus:border-[#ffcc00]/50" />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 font-bold uppercase block mb-1">Texto Principal</label>
                    <textarea value={modalBodyText} onChange={e => setModalBodyText(e.target.value)}
                      rows={3}
                      className="w-full bg-[#06070a] border border-[#1c212b] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#ffcc00]/50 resize-y" />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 font-bold uppercase block mb-1">Texto Secundário</label>
                    <textarea value={modalSecondaryText} onChange={e => setModalSecondaryText(e.target.value)}
                      rows={2}
                      placeholder="Texto adicional opcional abaixo do principal"
                      className="w-full bg-[#06070a] border border-[#1c212b] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#ffcc00]/50 resize-y" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-gray-500 font-bold uppercase block mb-1">Texto do Botão</label>
                      <input type="text" value={modalCtaText} onChange={e => setModalCtaText(e.target.value)}
                        className="w-full bg-[#06070a] border border-[#1c212b] rounded-xl px-4 py-2.5 text-white text-sm font-bold focus:outline-none focus:border-[#ffcc00]/50" />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500 font-bold uppercase block mb-1">Link do Botão</label>
                      <input type="url" value={modalCtaUrl} onChange={e => setModalCtaUrl(e.target.value)}
                        className="w-full bg-[#06070a] border border-[#1c212b] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#ffcc00]/50" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 font-bold uppercase block mb-1">Imagem de Topo (URL)</label>
                    <input type="url" value={modalHeaderImageUrl} onChange={e => setModalHeaderImageUrl(e.target.value)}
                      placeholder="https://exemplo.com/header.jpg"
                      className="w-full bg-[#06070a] border border-[#1c212b] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#ffcc00]/50" />
                    {modalHeaderImageUrl && (
                      <div className="mt-2 rounded-xl overflow-hidden border border-[#1c212b] max-h-[100px]">
                        <img src={modalHeaderImageUrl} alt="Preview"
                          className="w-full h-auto object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 font-bold uppercase block mb-1">Imagem de Rodapé (URL)</label>
                    <input type="url" value={modalFooterImageUrl} onChange={e => setModalFooterImageUrl(e.target.value)}
                      placeholder="https://exemplo.com/footer.jpg"
                      className="w-full bg-[#06070a] border border-[#1c212b] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#ffcc00]/50" />
                    {modalFooterImageUrl && (
                      <div className="mt-2 rounded-xl overflow-hidden border border-[#1c212b] max-h-[80px]">
                        <img src={modalFooterImageUrl} alt="Preview"
                          className="w-full h-auto object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 font-bold uppercase block mb-1">Rodapé</label>
                    <input type="text" value={modalFooter} onChange={e => setModalFooter(e.target.value)}
                      className="w-full bg-[#06070a] border border-[#1c212b] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#ffcc00]/50" />
                  </div>
                </div>

                {/* Right: preview */}
                <div className="bg-[#06070a] rounded-2xl border border-[#1c212b] overflow-hidden sticky top-0">
                  <div className="px-4 py-3 border-b border-[#1c212b] flex items-center justify-between">
                    <span className="text-[10px] text-gray-500 font-bold uppercase">Prévia</span>
                    <span className="text-[10px] text-gray-600">{modalSubject}</span>
                  </div>
                  <iframe
                    title="Preview"
                    srcDoc={buildModalPreviewHtml("João")}
                    className="w-full h-[500px]"
                    sandbox="allow-same-origin"
                  />
                </div>
              </div>
            </div>

            {/* Footer: actions */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-[#1c212b] shrink-0">
              <button onClick={closeModal} disabled={modalSaving}
                className="bg-[#1c212b] text-white px-6 py-3 rounded-xl text-xs font-black uppercase hover:bg-[#2a303d] transition-all disabled:opacity-50">
                Cancelar
              </button>
              <button onClick={handleModalSave} disabled={modalSaving || !modalName.trim()}
                className="bg-[#ffcc00] text-black px-6 py-3 rounded-xl text-xs font-black uppercase hover:bg-[#ffdb4d] transition-all disabled:opacity-50 flex items-center gap-2">
                {modalSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                {modalSaving ? "Salvando..." : modalTemplateId ? "Salvar" : "Criar Modelo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
