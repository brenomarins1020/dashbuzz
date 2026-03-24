import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ValidationResult {
  valid: boolean;
  reason: string;
}

export function useEmailValidation() {
  const [validating, setValidating] = useState(false);

  const validateEmail = useCallback(async (email: string): Promise<ValidationResult> => {
    if (!email.trim()) return { valid: false, reason: "Email é obrigatório." };

    setValidating(true);
    try {
      const { data, error } = await supabase.functions.invoke("validate-email", {
        body: { email: email.trim().toLowerCase() },
      });

      if (error) {
        console.error("Email validation error:", error);
        // On service error, allow the email through (fail-open)
        return { valid: true, reason: "" };
      }

      if (data?.error) {
        console.error("Validation service error:", data.error);
        return { valid: true, reason: "" };
      }

      return { valid: data.valid ?? true, reason: data.reason ?? "" };
    } catch (e) {
      console.error("Email validation exception:", e);
      return { valid: true, reason: "" };
    } finally {
      setValidating(false);
    }
  }, []);

  return { validateEmail, validating };
}
