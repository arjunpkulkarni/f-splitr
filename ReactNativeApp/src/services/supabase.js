import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://jxujkkpborfuqdqzthms.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4dWpra3Bib3JmdXFkcXp0aG1zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5MTA0NDMsImV4cCI6MjA5MTQ4NjQ0M30.zWda_-uNxRUH6nuYjiWJvZLtrHglOI13Ksfnva56ets';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
