const { Client } = require('pg');
const c = new Client({ connectionString: process.env.NEW_DATABASE_URL, ssl: { rejectUnauthorized: false } });
(async () => {
  await c.connect();
  await c.query('set search_path to public, extensions, auth');
  const q = async (label, sql) => { const r = await c.query(sql); console.log(label.padEnd(48), JSON.stringify(r.rows[0])); };

  console.log('--- AUTH / LOGIN ---');
  await q('auth.users / identities count', "select (select count(*) from auth.users) users, (select count(*) from auth.identities) identities");
  await q('users WITHOUT an identity (should be 0)', "select count(*) n from auth.users u where not exists (select 1 from auth.identities i where i.user_id=u.id)");
  await q('passwords valid for temp pw (should = users)', "select count(*) n from auth.users where encrypted_password = crypt('ChangeMe!2026', encrypted_password)");
  await q('email NOT confirmed (should be 0)', "select count(*) n from auth.users where email is not null and email_confirmed_at is null");
  await q('public.users vs auth.users id match', "select count(*) n from public.users p join auth.users a on a.id=p.id");

  console.log('\n--- FOREIGN-KEY ORPHANS (all should be 0) ---');
  await q('businesses w/ bad user_id', "select count(*) n from businesses b where b.user_id is not null and not exists(select 1 from users u where u.id=b.user_id)");
  await q('deliveries w/ bad business_id', "select count(*) n from deliveries d where d.business_id is not null and not exists(select 1 from businesses b where b.id=d.business_id)");
  await q('deliveries w/ bad rider', "select count(*) n from deliveries d where d.assigned_rider_id is not null and not exists(select 1 from users u where u.id=d.assigned_rider_id)");
  await q('delivery_events w/ bad delivery', "select count(*) n from delivery_events e where not exists(select 1 from deliveries d where d.id=e.delivery_id)");
  await q('charges w/ bad delivery/business', "select count(*) n from charges c where (c.delivery_id is not null and not exists(select 1 from deliveries d where d.id=c.delivery_id)) or (c.business_id is not null and not exists(select 1 from businesses b where b.id=c.business_id))");
  await q('expenses w/ bad category', "select count(*) n from expenses e where e.category_id is not null and not exists(select 1 from expense_categories x where x.id=e.category_id)");
  await q('user_permissions w/ bad user', "select count(*) n from user_permissions p where not exists(select 1 from users u where u.id=p.user_id)");

  await c.end();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
