import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.6/+esm';

// Mantém compatibilidade com o app existente sem depender de CDN no navegador.
window.supabase = { createClient };

await import('./app.js');
