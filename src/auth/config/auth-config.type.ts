export type AuthConfig = {
  secret?: string;
  expires?: string;
  impersonationExpires?: string;
  refreshSecret?: string;
  refreshExpires?: string;
  forgotSecret?: string;
  forgotExpires?: string;
  confirmEmailSecret?: string;
  confirmEmailExpires?: string;
  apiKeyPepper?: string;
  apiKeyEncryptionKeyBase64?: string;
};
