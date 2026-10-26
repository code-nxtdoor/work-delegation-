-- Reference data the dashboard needs in every environment.
-- Edit these to match Squad 3's real skill catalog, product types and roles.

INSERT INTO skills(name, learning_path) VALUES
  ('Agentic AI','Agentic AI L3 badge'),
  ('watsonx Orchestrate','watsonx Orchestrate L3 badge'),
  ('RAG','RAG patterns L2 badge'),
  ('Python','Python for AI L2'),
  ('Prompt engineering','Prompt engineering L2 badge'),
  ('Data engineering','watsonx.data L3 badge'),
  ('OpenShift','OpenShift L3 badge'),
  ('Kubernetes','Kubernetes L2 badge'),
  ('Terraform','Terraform on IBM Cloud L2'),
  ('Code Engine','Code Engine L2 badge'),
  ('React','Carbon + React L2'),
  ('Client workshops','Design thinking practitioner')
ON CONFLICT (name) DO NOTHING;

INSERT INTO product_types(name) VALUES
  ('Agentic AI'),('Data & RAG'),('Platform / DevOps'),('App modernization')
ON CONFLICT DO NOTHING;

INSERT INTO product_type_skills(product_type, skill) VALUES
  ('Agentic AI','Agentic AI'),('Agentic AI','watsonx Orchestrate'),('Agentic AI','Python'),('Agentic AI','Client workshops'),
  ('Data & RAG','RAG'),('Data & RAG','Data engineering'),('Data & RAG','Python'),
  ('Platform / DevOps','OpenShift'),('Platform / DevOps','Kubernetes'),('Platform / DevOps','Terraform'),
  ('App modernization','React'),('App modernization','Code Engine'),('App modernization','Kubernetes')
ON CONFLICT DO NOTHING;

INSERT INTO roles(name) VALUES
  ('Engagement lead'),('AI engineer'),('Platform engineer'),('Data engineer'),
  ('Solution engineer'),('Front-end engineer'),('Associate engineer'),
  ('Strategy designer'),('Solution architect'),('Manager')
ON CONFLICT DO NOTHING;

INSERT INTO role_requirements(role, skill, min_rating) VALUES
  ('AI engineer','Agentic AI',4),('AI engineer','Python',4),('AI engineer','RAG',3),
  ('Platform engineer','OpenShift',4),('Platform engineer','Terraform',3),('Platform engineer','Kubernetes',3),
  ('Data engineer','Data engineering',4),('Data engineer','RAG',3),('Data engineer','Python',3),
  ('Solution engineer','Client workshops',4),('Solution engineer','Agentic AI',3),
  ('Front-end engineer','React',4),('Front-end engineer','Code Engine',2),
  ('Associate engineer','Python',3),('Associate engineer','Agentic AI',2)
ON CONFLICT DO NOTHING;
