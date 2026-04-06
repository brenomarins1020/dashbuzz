/**
 * Auth helpers — DashBuzz
 * Gera emails fake para membros e mapeia erros do Supabase para PT-BR.
 */

/** Gera email interno para membros (nunca exibido ao usuário) */
export function generateMemberEmail(username: string): string {
  return `${username}@dashbuzz.internal`;
}

/** Mapeia mensagens de erro do Supabase para português amigável */
export function mapSupabaseError(message: string): string {
  const map: Record<string, string> = {
    "Invalid login credentials": "Usuário ou senha incorretos.",
    "User already registered": "Este usuário já possui uma conta.",
    "Email not confirmed": "Confirme seu email antes de fazer login.",
    "Password should be at least 6 characters": "A senha deve ter no mínimo 8 caracteres.",
    "User not found": "Usuário não encontrado.",
    "Email rate limit exceeded": "Muitas tentativas. Aguarde alguns minutos.",
    "For security purposes, you can only request this after": "Aguarde alguns segundos antes de tentar novamente.",
    "Signup requires a valid password": "Senha inválida.",
  };
  for (const [key, val] of Object.entries(map)) {
    if (message.includes(key)) return val;
  }
  return "Ocorreu um erro. Tente novamente.";
}

/** Valida formato de username: letras minúsculas, números, underscores, mín 3 chars */
export function isValidUsername(username: string): boolean {
  return /^[a-z0-9_]{3,20}$/.test(username);
}
