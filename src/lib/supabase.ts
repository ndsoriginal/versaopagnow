"use client";

import { supabase as realClient } from "@/integrations/supabase/client";

// Exporta diretamente o cliente real configurado com as credenciais do projeto
export const supabase = realClient;