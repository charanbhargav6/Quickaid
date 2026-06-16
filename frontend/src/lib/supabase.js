import { createBrowserClient } from '@supabase/ssr'

let browserClient = null;

export const createClient = () => {
  if (!browserClient) {
    browserClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
  }
  return browserClient;
}

// Proxy to ensure we use the same single SSR-compatible client everywhere 
// without instantiating a separate localStorage-based client.
export const supabase = new Proxy({}, {
  get: function(target, prop) {
    const client = createClient();
    const value = client[prop];
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  }
});
