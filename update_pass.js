require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcrypt');

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const hash = await bcrypt.hash('admin123', 10);
  const { data, error } = await supabase
    .from('employees')
    .update({ password_hash: hash })
    .eq('employee_code', 'ADMIN01')
    .select();

  console.log(error ? error : data);
}
main();
