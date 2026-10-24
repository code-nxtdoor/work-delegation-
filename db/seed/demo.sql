-- Demo data: real team members for the US Federal Market team.
-- Loaded only when SEED_DEMO=true and the people table is empty.

INSERT INTO people(email, name, role, is_lead, is_engineer, availability, last_checkin, goals, onboarded) VALUES
 ('keylia.carter@ibm.com',   'Keylia Carter',       'Engagement lead',   true,  false, 3, now(), '', true),
 ('charles@ibm.com',         'Charles',             'Engagement lead',   true,  false, 3, now(), '', true),
 ('joe.camera@ibm.com',      'Joe Camera',          'Engagement lead',   true,  false, 3, now(), '', true),
 ('agborntui.bate@ibm.com',  'Agborntui Bate',      'Platform engineer', false, true,  3, now()-interval '1 day',  '', false),
 ('alisa.vinogradova@ibm.com','Alisa Vinogradova',  'Strategy designer', false, true,  3, now()-interval '1 day',  '', false),
 ('anisha.parida@ibm.com',   'Anisha Parida',       'Platform engineer', false, true,  3, now()-interval '1 day',  '', false),
 ('ashley.burbano@ibm.com',  'Ashley Burbano',      'Strategy designer', false, true,  3, now()-interval '1 day',  '', false),
 ('ashley.kim@ibm.com',      'Ashley Kim',          'Strategy designer', false, true,  3, now()-interval '1 day',  '', false),
 ('celia.diaz@ibm.com',      'Celia Diaz',          'Strategy designer', false, true,  3, now()-interval '1 day',  '', false),
 ('griffin.tsang@ibm.com',   'Griffin Tsang',       'Strategy designer', false, true,  3, now()-interval '1 day',  '', false),
 ('ling.wang@ibm.com',       'Ling Wang',           'Platform engineer', false, true,  3, now()-interval '1 day',  '', false),
 ('lucas.ligenza@ibm.com',   'Lucas Ligenza',       'AI engineer',       false, true,  3, now()-interval '1 day',  '', false),
 ('marc.wangel@ibm.com',     'Marc Wangel',         'Solution architect',false, true,  3, now()-interval '1 day',  '', false),
 ('maya.nagiub@ibm.com',     'Maya Nagiub',         'AI engineer',       false, true,  3, now()-interval '1 day',  '', false),
 ('michelle.shin@ibm.com',   'Michelle Shin',       'Strategy designer', false, true,  3, now()-interval '1 day',  '', false),
 ('ceasar.ugwuanyi@ibm.com', 'Ceasar Ugwuanyi',     'Platform engineer',       false, true,  3, now()-interval '1 day',  '', false),
 ('patrice.johnson@ibm.com', 'Patrice Johnson',     'Engagement lead',   false,  false, 3, now()-interval '1 day',  '', false),
 ('robert.campbell@ibm.com', 'Robert Campbell',     'Solution architect',false, true,  3, now()-interval '1 day',  '', false),
 ('shawn.kenney@ibm.com',    'Shawn Kenney',        'Strategy designer', false, true,  3, now()-interval '1 day',  '', false);

INSERT INTO sync_events(kind, message, created_at) VALUES
 ('sync','Demo data loaded. Connect Monday in .env to sync the real board.', now() - interval '1 minute');
