/**
 * Augment the Response interface so that response.json() defaults to Promise<any> (or generic Promise<T>),
 * preserving compatibility between Cloudflare Workers types and browser DOM fetch callers.
 */
interface Response {
  json<T = any>(): Promise<T>;
}
