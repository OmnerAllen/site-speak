-- Seed data for company, employees, projects, stages, employee_project assignments,
-- and sample stage_equipment, stage_material, and work_log entries.
-- Run after: seed_supplier.sql, seed_equipment.sql, seed_material.sql

-- Company
INSERT INTO company (name, address) VALUES
  ('Summit Builders LLC', '1250 East Main Street, Provo, UT 84606');

-- Employees
INSERT INTO employee (company_id, name, type) VALUES
  ((SELECT id FROM company WHERE name = 'Summit Builders LLC'), 'Jake Morrison', 'admin'),
  ((SELECT id FROM company WHERE name = 'Summit Builders LLC'), 'Luis Herrera', 'worker'),
  ((SELECT id FROM company WHERE name = 'Summit Builders LLC'), 'Brenna Caldwell', 'worker'),
  ((SELECT id FROM company WHERE name = 'Summit Builders LLC'), 'Tyler Ngoy', 'worker'),
  ((SELECT id FROM company WHERE name = 'Summit Builders LLC'), 'Sam Whitaker', 'worker'),
  ((SELECT id FROM company WHERE name = 'Summit Builders LLC'), 'Diana Reyes', 'worker'),
  ((SELECT id FROM company WHERE name = 'Summit Builders LLC'), 'Marcus Webb', 'worker'),
  ((SELECT id FROM company WHERE name = 'Summit Builders LLC'), 'Kelsey Park', 'worker');

-- Projects (lat/lon geocoded for Utah Valley sample addresses)
INSERT INTO project (company_id, name, address, latitude, longitude) VALUES
  ((SELECT id FROM company WHERE name = 'Summit Builders LLC'), 'Highland Estates Remodel', '482 North 1200 East, Lehi, UT 84043', 40.4058, -111.8508),
  ((SELECT id FROM company WHERE name = 'Summit Builders LLC'), 'Riverside Office Build-Out', '210 West River Road, Spanish Fork, UT 84660', 40.1050, -111.6539),
  ((SELECT id FROM company WHERE name = 'Summit Builders LLC'), 'Cedar Hills Custom Home', '9871 Canyon Road, Cedar Hills, UT 84062', 40.4147, -111.7535),
  ((SELECT id FROM company WHERE name = 'Summit Builders LLC'), 'Downtown Orem Renovation', '55 East Center Street, Orem, UT 84057', 40.2969, -111.6946);

-- Stages for each project (all four stages per project)
INSERT INTO stage (project_id, name) VALUES
  ((SELECT id FROM project WHERE name = 'Highland Estates Remodel'), 'demo'),
  ((SELECT id FROM project WHERE name = 'Highland Estates Remodel'), 'prep'),
  ((SELECT id FROM project WHERE name = 'Highland Estates Remodel'), 'build/install'),
  ((SELECT id FROM project WHERE name = 'Highland Estates Remodel'), 'qa'),
  ((SELECT id FROM project WHERE name = 'Riverside Office Build-Out'), 'demo'),
  ((SELECT id FROM project WHERE name = 'Riverside Office Build-Out'), 'prep'),
  ((SELECT id FROM project WHERE name = 'Riverside Office Build-Out'), 'build/install'),
  ((SELECT id FROM project WHERE name = 'Riverside Office Build-Out'), 'qa'),
  ((SELECT id FROM project WHERE name = 'Cedar Hills Custom Home'), 'demo'),
  ((SELECT id FROM project WHERE name = 'Cedar Hills Custom Home'), 'prep'),
  ((SELECT id FROM project WHERE name = 'Cedar Hills Custom Home'), 'build/install'),
  ((SELECT id FROM project WHERE name = 'Cedar Hills Custom Home'), 'qa'),
  ((SELECT id FROM project WHERE name = 'Downtown Orem Renovation'), 'demo'),
  ((SELECT id FROM project WHERE name = 'Downtown Orem Renovation'), 'prep'),
  ((SELECT id FROM project WHERE name = 'Downtown Orem Renovation'), 'build/install'),
  ((SELECT id FROM project WHERE name = 'Downtown Orem Renovation'), 'qa');

-- Employee-Project assignments
INSERT INTO employee_project (employee_id, project_id) VALUES
  ((SELECT id FROM employee WHERE name = 'Jake Morrison'), (SELECT id FROM project WHERE name = 'Highland Estates Remodel')),
  ((SELECT id FROM employee WHERE name = 'Luis Herrera'), (SELECT id FROM project WHERE name = 'Highland Estates Remodel')),
  ((SELECT id FROM employee WHERE name = 'Brenna Caldwell'), (SELECT id FROM project WHERE name = 'Highland Estates Remodel')),
  ((SELECT id FROM employee WHERE name = 'Tyler Ngoy'), (SELECT id FROM project WHERE name = 'Riverside Office Build-Out')),
  ((SELECT id FROM employee WHERE name = 'Sam Whitaker'), (SELECT id FROM project WHERE name = 'Riverside Office Build-Out')),
  ((SELECT id FROM employee WHERE name = 'Jake Morrison'), (SELECT id FROM project WHERE name = 'Riverside Office Build-Out')),
  ((SELECT id FROM employee WHERE name = 'Diana Reyes'), (SELECT id FROM project WHERE name = 'Cedar Hills Custom Home')),
  ((SELECT id FROM employee WHERE name = 'Marcus Webb'), (SELECT id FROM project WHERE name = 'Cedar Hills Custom Home')),
  ((SELECT id FROM employee WHERE name = 'Kelsey Park'), (SELECT id FROM project WHERE name = 'Cedar Hills Custom Home')),
  ((SELECT id FROM employee WHERE name = 'Jake Morrison'), (SELECT id FROM project WHERE name = 'Downtown Orem Renovation')),
  ((SELECT id FROM employee WHERE name = 'Sam Whitaker'), (SELECT id FROM project WHERE name = 'Downtown Orem Renovation')),
  ((SELECT id FROM employee WHERE name = 'Diana Reyes'), (SELECT id FROM project WHERE name = 'Downtown Orem Renovation'));

-- Sample stage_equipment usage
INSERT INTO stage_equipment (stage_id, equipment_id, half_day_bool, date_of_use) VALUES
  ((SELECT id FROM stage WHERE project_id = (SELECT id FROM project WHERE name = 'Highland Estates Remodel') AND name = 'demo'),
   (SELECT id FROM equipment WHERE name = 'Mini Excavator (3.5 Ton)'), false, '2026-04-07'),
  ((SELECT id FROM stage WHERE project_id = (SELECT id FROM project WHERE name = 'Highland Estates Remodel') AND name = 'demo'),
   (SELECT id FROM equipment WHERE name = 'Dump Trailer (14ft)'), false, '2026-04-07'),
  ((SELECT id FROM stage WHERE project_id = (SELECT id FROM project WHERE name = 'Highland Estates Remodel') AND name = 'prep'),
   (SELECT id FROM equipment WHERE name = 'Vibratory Soil Compactor'), true, '2026-04-14'),
  ((SELECT id FROM stage WHERE project_id = (SELECT id FROM project WHERE name = 'Cedar Hills Custom Home') AND name = 'build/install'),
   (SELECT id FROM equipment WHERE name = 'Concrete Boom Pump (38M)'), false, '2026-05-01'),
  ((SELECT id FROM stage WHERE project_id = (SELECT id FROM project WHERE name = 'Cedar Hills Custom Home') AND name = 'build/install'),
   (SELECT id FROM equipment WHERE name = 'Scissor Lift (26ft Electric)'), true, '2026-05-02'),
  ((SELECT id FROM stage WHERE project_id = (SELECT id FROM project WHERE name = 'Downtown Orem Renovation') AND name = 'demo'),
   (SELECT id FROM equipment WHERE name = 'Skid Steer (Tracked)'), false, '2026-04-21');

-- Sample stage_material usage
INSERT INTO stage_material (stage_id, material_id, quantity) VALUES
  ((SELECT id FROM stage WHERE project_id = (SELECT id FROM project WHERE name = 'Highland Estates Remodel') AND name = 'build/install'),
   (SELECT id FROM material WHERE product_name = 'Hammer' LIMIT 1), 4),
  ((SELECT id FROM stage WHERE project_id = (SELECT id FROM project WHERE name = 'Highland Estates Remodel') AND name = 'build/install'),
   (SELECT id FROM material WHERE product_name = '3000 PSI Standard Ready-Mix' LIMIT 1), 12),
  ((SELECT id FROM stage WHERE project_id = (SELECT id FROM project WHERE name = 'Highland Estates Remodel') AND name = 'prep'),
   (SELECT id FROM material WHERE product_name = 'Red Brick' LIMIT 1), 500),
  ((SELECT id FROM stage WHERE project_id = (SELECT id FROM project WHERE name = 'Cedar Hills Custom Home') AND name = 'build/install'),
   (SELECT id FROM material WHERE product_name = 'Wall Paint' LIMIT 1), 8),
  ((SELECT id FROM stage WHERE project_id = (SELECT id FROM project WHERE name = 'Cedar Hills Custom Home') AND name = 'build/install'),
   (SELECT id FROM material WHERE product_name = 'Ceramic Tile' LIMIT 1), 25),
  ((SELECT id FROM stage WHERE project_id = (SELECT id FROM project WHERE name = 'Downtown Orem Renovation') AND name = 'build/install'),
   (SELECT id FROM material WHERE product_name = 'Gypsum Board' LIMIT 1), 40),
  ((SELECT id FROM stage WHERE project_id = (SELECT id FROM project WHERE name = 'Downtown Orem Renovation') AND name = 'build/install'),
   (SELECT id FROM material WHERE product_name = 'PVC Pipe' LIMIT 1), 30);
