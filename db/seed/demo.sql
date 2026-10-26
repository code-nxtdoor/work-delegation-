-- Demo data: real team members for the US Federal Market team.
-- Loaded only when SEED_DEMO=true and the people table is empty.

INSERT INTO people(email, name, role, is_lead, is_engineer, availability, last_checkin, goals, onboarded) VALUES
 ('keylia.carter@ibm.com',      'Keylia Carter',      'Engagement lead',   true,  false, 3, now(),                    '',                                                                    true),
 ('agborntui.bate@ibm.com',     'Charles Bate',       'Engagement lead',   true,  false, 3, now(),                    '',                                                                    true),
 ('joe.camera@ibm.com',         'Joe Camera',         'Manager',           true,  false, 3, now(),                    '',                                                                    true),
 ('alisa.vinogradova@ibm.com',  'Alisa Vinogradova',  'Strategy designer', false, true,  4, now()-interval '2 days',  'Lead strategy design on a federal agentic AI engagement.',            true),
 ('anisha.parida@ibm.com',      'Anisha Parida',       'Platform engineer', false, true,  3, now()-interval '4 days',  'Own the full platform stack on an agentic deployment end to end.',   true),
 ('ashley.burbano@ibm.com',     'Ashley Burbano',      'Strategy designer', false, true,  4, now()-interval '1 day',   'Run executive design-thinking sessions for federal clients.',         true),
 ('ashley.kim@ibm.com',         'Ashley Kim',          'Strategy designer', false, true,  3, now()-interval '6 days',  'Develop a specialty in agentic AI strategy for federal use cases.',   true),
 ('celia.diaz@ibm.com',         'Celia Diaz',          'Strategy designer', false, true,  5, now()-interval '2 days',  'Get placed as a lead designer on an agentic AI project.',             true),
 ('griffin.tsang@ibm.com',      'Griffin Tsang',       'Strategy designer', false, true,  2, now()-interval '9 days',  'Build deeper technical fluency alongside strategy skills.',           true),
 ('ling.wang@ibm.com',          'Ling Wang',           'Platform engineer', false, true,  4, now()-interval '3 days',  'Mentor junior engineers on OpenShift and Terraform.',                 true),
 ('lucas.ligenza@ibm.com',      'Lucas Ligenza',       'AI engineer',       false, true,  2, now()-interval '5 days',  'Move toward a technical lead role on agentic engagements.',           true),
 ('marc.wangel@ibm.com',        'Marc Wangel',         'Solution architect',false, true,  3, now()-interval '7 days',  'Shape solution architecture for federal agentic AI programs.',        true),
 ('maya.nagiub@ibm.com',        'Maya Nagiub',         'AI engineer',       false, true,  4, now()-interval '2 days',  'Specialize in agent evaluation and guardrails.',                      true),
 ('michelle.shin@ibm.com',      'Michelle Shin',       'Strategy designer', false, true,  3, now()-interval '8 days',  'Lead a full design sprint on a federal engagement.',                  true),
 ('munachiso.ugwuanyi@ibm.com', 'Munachiso Ugwuanyi',  'Platform engineer', false, true,  3, now()-interval '1 day',   'Get hands-on with agentic AI deployments on OpenShift.',             true),
 ('patrice.johnson@ibm.com',    'Patrice Johnson',     'Engagement lead',   false, false, 3, now()-interval '1 day',   '',                                                                    false),
 ('robert.campbell@ibm.com',    'Robert Campbell',     'Solution architect',false, true,  3, now()-interval '10 days', 'Lead quantum-safe architecture work for federal clients.',            true),
 ('shawn.kenney@ibm.com',       'Shawn Kenney',        'Strategy designer', false, true,  4, now()-interval '3 days',  'Own discovery and design thinking for federal market engagements.',  true);

-- Skills: (email, skill, rating, kind, badge, evidence, confirmed)
WITH s(email, skill, rating, kind, badge, evidence, confirmed) AS (VALUES
 -- Alisa Vinogradova
 ('alisa.vinogradova@ibm.com', 'Client workshops',  5, 'client',   NULL, 'Led strategy sessions for three federal agency engagements',     true),
 ('alisa.vinogradova@ibm.com', 'Agentic AI',        3, 'learning', 'L2', 'Completed the Agentic AI L2 badge',                             true),
 ('alisa.vinogradova@ibm.com', 'Python',            2, 'learning', 'L2', 'Completed Python for AI L2',                                    false),
 -- Anisha Parida
 ('anisha.parida@ibm.com',     'OpenShift',         4, 'client',   NULL, 'Managed cluster upgrades across two federal engagements',        true),
 ('anisha.parida@ibm.com',     'Terraform',         4, 'client',   NULL, 'Wrote IaC modules for landing zone deployments',                 true),
 ('anisha.parida@ibm.com',     'Kubernetes',        3, 'client',   NULL, 'Cluster ops on federal platform engagements',                    true),
 ('anisha.parida@ibm.com',     'Agentic AI',        2, 'learning', 'L2', 'Completed the L2 badge',                                        false),
 -- Ashley Burbano
 ('ashley.burbano@ibm.com',    'Client workshops',  5, 'client',   NULL, 'Led six design-thinking sessions for federal clients',           true),
 ('ashley.burbano@ibm.com',    'Agentic AI',        3, 'client',   NULL, 'Scoped use cases for a federal AI assistant engagement',         true),
 ('ashley.burbano@ibm.com',    'React',             2, 'learning', NULL, 'Internal side project for dashboard prototyping',                false),
 -- Ashley Kim
 ('ashley.kim@ibm.com',        'Client workshops',  4, 'client',   NULL, 'Facilitated discovery workshops on two federal programs',        true),
 ('ashley.kim@ibm.com',        'Agentic AI',        3, 'learning', 'L3', 'Completed the Agentic AI L3 badge',                             true),
 -- Celia Diaz
 ('celia.diaz@ibm.com',        'Client workshops',  5, 'client',   NULL, 'Ran executive sessions for a large federal agency client',       true),
 ('celia.diaz@ibm.com',        'Agentic AI',        2, 'learning', 'L2', 'Completed the L2 badge',                                        false),
 -- Griffin Tsang
 ('griffin.tsang@ibm.com',     'Client workshops',  4, 'client',   NULL, 'Co-led design sprints on a federal modernization program',       true),
 ('griffin.tsang@ibm.com',     'Python',            2, 'learning', 'L2', 'Completed Python for AI L2',                                    false),
 -- Ling Wang
 ('ling.wang@ibm.com',         'OpenShift',         5, 'client',   NULL, 'Owns the shared platform environment across three engagements',  true),
 ('ling.wang@ibm.com',         'Kubernetes',        5, 'client',   NULL, 'Runs cluster ops for federal platform work',                     true),
 ('ling.wang@ibm.com',         'Terraform',         4, 'client',   NULL, 'IaC for multiple federal landing zones',                        true),
 ('ling.wang@ibm.com',         'Agentic AI',        2, 'learning', 'L2', 'Completed the L2 badge',                                        false),
 -- Lucas Ligenza
 ('lucas.ligenza@ibm.com',     'Agentic AI',        5, 'client',   NULL, 'Built the tool-calling layer for a federal claims agent',        true),
 ('lucas.ligenza@ibm.com',     'Python',            5, 'client',   NULL, 'Core contributor on three agent codebases',                      true),
 ('lucas.ligenza@ibm.com',     'RAG',               4, 'client',   NULL, 'Built retrieval pipeline for a federal risk use case',           true),
 ('lucas.ligenza@ibm.com',     'watsonx Orchestrate',3,'client',   NULL, 'Configured Orchestrate skills for a federal HR assistant',       true),
 ('lucas.ligenza@ibm.com',     'Client workshops',  3, 'client',   NULL, 'Ran two discovery sessions with agency stakeholders',            false),
 -- Marc Wangel
 ('marc.wangel@ibm.com',       'Agentic AI',        4, 'client',   NULL, 'Architected end-to-end agentic AI solution for federal client',  true),
 ('marc.wangel@ibm.com',       'Client workshops',  4, 'client',   NULL, 'Led solution architecture workshops with senior stakeholders',   true),
 ('marc.wangel@ibm.com',       'OpenShift',         3, 'client',   NULL, 'Oversaw platform architecture for a federal deployment',         true),
 -- Maya Nagiub
 ('maya.nagiub@ibm.com',       'Agentic AI',        4, 'client',   NULL, 'Built evaluation suite for a federal agentic AI pilot',          true),
 ('maya.nagiub@ibm.com',       'RAG',               3, 'client',   NULL, 'Retrieval tuning on a federal risk use case',                    true),
 ('maya.nagiub@ibm.com',       'Python',            4, 'client',   NULL, 'Agent eval harness and automation scripts',                      true),
 ('maya.nagiub@ibm.com',       'Prompt engineering',4, 'client',   NULL, 'Prompt library for a federal ops copilot PoC',                   false),
 -- Michelle Shin
 ('michelle.shin@ibm.com',     'Client workshops',  4, 'client',   NULL, 'Ran design sprints on a federal modernization engagement',       true),
 ('michelle.shin@ibm.com',     'Agentic AI',        2, 'learning', 'L2', 'Completed the L2 badge',                                        false),
 -- Munachiso Ugwuanyi
 ('munachiso.ugwuanyi@ibm.com','OpenShift',         3, 'client',   NULL, 'Deployed apps to OpenShift on a federal engagement',             true),
 ('munachiso.ugwuanyi@ibm.com','Python',            3, 'client',   NULL, 'Automation and test scripts for platform work',                  true),
 ('munachiso.ugwuanyi@ibm.com','Agentic AI',        2, 'learning', 'L2', 'Completed the L2 badge',                                        false),
 -- Robert Campbell
 ('robert.campbell@ibm.com',   'OpenShift',         4, 'client',   NULL, 'Architected quantum-safe deployment on OpenShift',               true),
 ('robert.campbell@ibm.com',   'Terraform',         3, 'client',   NULL, 'IaC for quantum-safe project infrastructure',                    true),
 ('robert.campbell@ibm.com',   'Agentic AI',        2, 'learning', 'L2', 'Completed the L2 badge',                                        false),
 -- Shawn Kenney
 ('shawn.kenney@ibm.com',      'Client workshops',  5, 'client',   NULL, 'Led discovery and design thinking for federal engagements',      true),
 ('shawn.kenney@ibm.com',      'Agentic AI',        3, 'client',   NULL, 'Scoped agentic use cases for a federal agency',                  true),
 ('shawn.kenney@ibm.com',      'watsonx Orchestrate',2,'learning', 'L2', 'Completed the L2 badge',                                        false)
)
INSERT INTO person_skills(person_id, skill, rating, kind, badge, evidence, confirmed_by, confirmed_at)
SELECT p.id, s.skill, s.rating, s.kind, s.badge, s.evidence,
       CASE WHEN s.confirmed THEN (SELECT id FROM people WHERE email='agborntui.bate@ibm.com') END,
       CASE WHEN s.confirmed THEN now() END
FROM s JOIN people p ON p.email = s.email;

-- Growth areas
WITH g(email, skill) AS (VALUES
 ('alisa.vinogradova@ibm.com',  'Agentic AI'),
 ('alisa.vinogradova@ibm.com',  'watsonx Orchestrate'),
 ('anisha.parida@ibm.com',      'Agentic AI'),
 ('ashley.burbano@ibm.com',     'watsonx Orchestrate'),
 ('ashley.kim@ibm.com',         'watsonx Orchestrate'),
 ('celia.diaz@ibm.com',         'Agentic AI'),
 ('griffin.tsang@ibm.com',      'Agentic AI'),
 ('ling.wang@ibm.com',          'Agentic AI'),
 ('lucas.ligenza@ibm.com',      'Client workshops'),
 ('marc.wangel@ibm.com',        'RAG'),
 ('maya.nagiub@ibm.com',        'watsonx Orchestrate'),
 ('michelle.shin@ibm.com',      'Agentic AI'),
 ('munachiso.ugwuanyi@ibm.com', 'Agentic AI'),
 ('munachiso.ugwuanyi@ibm.com', 'RAG'),
 ('robert.campbell@ibm.com',    'Agentic AI'),
 ('shawn.kenney@ibm.com',       'watsonx Orchestrate')
)
INSERT INTO person_growth(person_id, skill)
SELECT p.id, g.skill FROM g JOIN people p ON p.email = g.email;

-- Product interests
WITH i(email, pt) AS (VALUES
 ('alisa.vinogradova@ibm.com',  'Agentic AI'),
 ('anisha.parida@ibm.com',      'Platform / DevOps'),
 ('anisha.parida@ibm.com',      'Agentic AI'),
 ('ashley.burbano@ibm.com',     'Agentic AI'),
 ('ashley.kim@ibm.com',         'Agentic AI'),
 ('celia.diaz@ibm.com',         'Agentic AI'),
 ('celia.diaz@ibm.com',         'App modernization'),
 ('griffin.tsang@ibm.com',      'Agentic AI'),
 ('griffin.tsang@ibm.com',      'App modernization'),
 ('ling.wang@ibm.com',          'Platform / DevOps'),
 ('lucas.ligenza@ibm.com',      'Agentic AI'),
 ('lucas.ligenza@ibm.com',      'Data & RAG'),
 ('marc.wangel@ibm.com',        'Agentic AI'),
 ('marc.wangel@ibm.com',        'Platform / DevOps'),
 ('maya.nagiub@ibm.com',        'Agentic AI'),
 ('maya.nagiub@ibm.com',        'Data & RAG'),
 ('michelle.shin@ibm.com',      'Agentic AI'),
 ('munachiso.ugwuanyi@ibm.com', 'Platform / DevOps'),
 ('munachiso.ugwuanyi@ibm.com', 'Agentic AI'),
 ('robert.campbell@ibm.com',    'Platform / DevOps'),
 ('shawn.kenney@ibm.com',       'Agentic AI'),
 ('shawn.kenney@ibm.com',       'App modernization')
)
INSERT INTO person_interests(person_id, product_type)
SELECT p.id, i.pt FROM i JOIN people p ON p.email = i.email;

-- Projects
INSERT INTO projects(monday_item_id, name, client, product_type, status, seat_cap, interest_closes_at) VALUES
 (5521, 'Federal claims triage agent',   'Dept. of Veterans Affairs',    'Agentic AI',      'progress', 4, NULL),
 (5530, 'HR assistant rollout',          'Dept. of Labor',               'Agentic AI',      'progress', 4, NULL),
 (5544, 'Supplier risk RAG',             'Dept. of Defense',             'Data & RAG',      'progress', 3, NULL),
 (5402, 'Data lakehouse pilot',          'Dept. of Transportation',      'Data & RAG',      'hold',     3, NULL),
 (5489, 'Agency portal modernization',   'Dept. of Homeland Security',   'App modernization','progress',3, NULL),
 (5455, 'Ops copilot PoC',              'Dept. of Energy',              'Agentic AI',      'hold',     3, NULL),
 (5610, 'Contract review agent',         'Dept. of Justice',             'Agentic AI',      'new',      3, now() + interval '14 hours');

INSERT INTO project_skills(project_id, skill)
SELECT pr.id, pts.skill FROM projects pr
JOIN product_type_skills pts ON pts.product_type = pr.product_type;

-- Assignments
WITH a(item, email, kind) AS (VALUES
 (5521, 'lucas.ligenza@ibm.com',     'resource'),
 (5521, 'maya.nagiub@ibm.com',       'resource'),
 (5521, 'ling.wang@ibm.com',         'resource'),
 (5521, 'marc.wangel@ibm.com',       'resource'),
 (5530, 'lucas.ligenza@ibm.com',     'resource'),
 (5530, 'ashley.burbano@ibm.com',    'resource'),
 (5530, 'ling.wang@ibm.com',         'resource'),
 (5544, 'lucas.ligenza@ibm.com',     'resource'),
 (5544, 'munachiso.ugwuanyi@ibm.com','resource'),
 (5544, 'maya.nagiub@ibm.com',       'shadow'),
 (5402, 'anisha.parida@ibm.com',     'resource'),
 (5402, 'ling.wang@ibm.com',         'resource'),
 (5489, 'munachiso.ugwuanyi@ibm.com','resource'),
 (5489, 'shawn.kenney@ibm.com',      'shadow'),
 (5489, 'ashley.kim@ibm.com',        'shadow'),
 (5455, 'maya.nagiub@ibm.com',       'resource'),
 (5455, 'alisa.vinogradova@ibm.com', 'resource')
)
INSERT INTO assignments(project_id, person_id, kind, source)
SELECT pr.id, p.id, a.kind, 'monday'
FROM a
JOIN projects pr ON pr.monday_item_id = a.item
JOIN people p ON p.email = a.email;

-- Raised hands on the new contract review agent
WITH h(email) AS (VALUES
 ('celia.diaz@ibm.com'),
 ('maya.nagiub@ibm.com'),
 ('lucas.ligenza@ibm.com'),
 ('griffin.tsang@ibm.com'),
 ('munachiso.ugwuanyi@ibm.com')
)
INSERT INTO project_interest(project_id, person_id)
SELECT (SELECT id FROM projects WHERE monday_item_id = 5610), p.id
FROM h JOIN people p ON p.email = h.email;

INSERT INTO sync_events(kind, message, created_at) VALUES
 ('write-back', 'People column updated on Federal claims triage agent (+ Maya Nagiub).', now() - interval '3 hours'),
 ('webhook',    'Item created: Contract review agent. Posted to engineers with a 24-hour interest window.', now() - interval '2 hours'),
 ('webhook',    'Status changed: Data lakehouse pilot → On hold.', now() - interval '26 minutes'),
 ('sync',       'Demo data loaded. Connect Monday in .env to sync the real board.', now() - interval '4 minutes');
