-- Seed data for the equipment table
-- Generated from equipment_price_list.csv + generate_geo_seeds.py

INSERT INTO equipment (name, cost_per_day, cost_half_day, rental_supplier_id) VALUES
  ('Mini Excavator (3.5 Ton)', 385.00, 245.00, (SELECT id FROM supplier WHERE name = 'Ace Rents (Provo)' AND deleted_at IS NULL LIMIT 1)),
  ('Skid Steer (Tracked)', 340.00, 215.00, (SELECT id FROM supplier WHERE name = 'United Rentals (Provo)' AND deleted_at IS NULL LIMIT 1)),
  ('Telehandler (5500lb Reach)', 550.00, 360.00, (SELECT id FROM supplier WHERE name = 'Sunbelt Rentals (Lindon)' AND deleted_at IS NULL LIMIT 1)),
  ('Concrete Boom Pump (38M)', 950.00, 600.00, (SELECT id FROM supplier WHERE name = 'United Rentals (Provo)' AND deleted_at IS NULL LIMIT 1)),
  ('Ride-on Power Trowel', 220.00, 145.00, (SELECT id FROM supplier WHERE name = 'Ace Rents (Spanish Fork)' AND deleted_at IS NULL LIMIT 1)),
  ('Towable Generator (20kW)', 195.00, 120.00, (SELECT id FROM supplier WHERE name = 'Sunbelt Rentals (Orem)' AND deleted_at IS NULL LIMIT 1)),
  ('Vibratory Soil Compactor', 295.00, 185.00, (SELECT id FROM supplier WHERE name = 'United Rentals (Provo)' AND deleted_at IS NULL LIMIT 1)),
  ('Mini Skid Steer (Bobcat MT85)', 260.00, 185.00, (SELECT id FROM supplier WHERE name = 'Ace Rents (Provo)' AND deleted_at IS NULL LIMIT 1)),
  ('Scissor Lift (26ft Electric)', 155.00, 95.00, (SELECT id FROM supplier WHERE name = 'Sunbelt Rentals (Lindon)' AND deleted_at IS NULL LIMIT 1)),
  ('Dump Trailer (14ft)', 150.00, 95.00, (SELECT id FROM supplier WHERE name = 'Ace Rents (Spanish Fork)' AND deleted_at IS NULL LIMIT 1));
