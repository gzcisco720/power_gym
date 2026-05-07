// src/lib/nutrition/fatsecret-auth-provider.ts

export interface IFatSecretAuthProvider {
  /**
   * 'v1' = OAuth 1.0 → server.api endpoint, legacy response format
   * 'v2' = OAuth 2.0 → REST v5 endpoints, current response format
   */
  readonly version: 'v1' | 'v2';

  /** Base URL for search requests (differs between v1 and v2) */
  readonly searchBaseUrl: string;

  /** Base URL for food-get requests (differs between v1 and v2) */
  readonly foodBaseUrl: string;

  /**
   * Extra query params required by this auth method's endpoint.
   * OAuth 1.0: { method: 'foods.search' }   OAuth 2.0: {}
   */
  readonly searchExtraParams: Record<string, string>;

  /**
   * Extra query params required by this auth method's endpoint.
   * OAuth 1.0: { method: 'food.get.v4' }    OAuth 2.0: {}
   */
  readonly foodExtraParams: Record<string, string>;

  /**
   * Apply authentication to a URL.
   * - OAuth 2.0: returns { url (unchanged), headers: { Authorization: 'Bearer ...' } }
   * - OAuth 1.0: returns { url (with oauth_* + signature appended), headers: {} }
   */
  applyAuth(url: URL): Promise<{ url: URL; headers: Record<string, string> }>;
}
