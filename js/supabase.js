import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = "https://bxkrbzbzpwsomtyapwch.supabase.co";
const supabaseKey = "sb_publishable_rjekJoEhwCMSwpmgw2-k6g_Fg29-X_x";

export const supabase = createClient(supabaseUrl, supabaseKey);
