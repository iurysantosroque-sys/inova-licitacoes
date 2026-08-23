import { createClient } from '@supabase/supabase-js';

// Mantém compatibilidade com o app existente sem depender de CDN no navegador.
window.supabase = { createClient };

await import('./app.js');
