// Map of NextAuth error codes to Portuguese messages.
// Used in login-form.tsx and other auth components.

export function mapNextAuthError(code: string | null | undefined): string {
  if (!code) return "Um erro desconhecido ocorreu ao fazer login";

  const nextAuthErrorMessages: Record<string, string> = {
    // Credentials provider errors
    CredentialsSignin: "Email ou senha inválidos",

    // Google OAuth errors
    GoogleTokenMissing: "Não foi possível autenticar com o Google",
    GoogleSigninFailed: "Não foi possível autenticar com o Google",

    // Standard NextAuth error codes
    AccessDenied: "Você não tem permissão para acessar",
    Configuration: "Erro de configuração do servidor",
    Verification: "Token de verificação inválido",
    OAuthAccountNotLinked: "Sua conta Google não está vinculada",
    Default: "Um erro desconhecido ocorreu ao fazer login",

    // Session refresh errors (custom code set in nextauth-options.ts jwt callback)
    RefreshAccessTokenError: "Sua sessão expirou. Entre novamente",
  };

  return (
    nextAuthErrorMessages[code] ??
    `Erro: ${code}. Tente novamente ou entre em contato com o suporte`
  );
}
