-- Seed roles and permissions for RBAC
-- Run after: 3-seed_basic.sql

-- Roles
INSERT INTO role (name) VALUES
  ('admin'),
  ('worker');

-- Permissions
INSERT INTO permission (name) VALUES
  ('companies:read'),
  ('companies:write'),
  ('projects:read'),
  ('projects:write'),
  ('employees:read'),
  ('employees:write'),
  ('worklogs:read'),
  ('worklogs:write'),
  ('materials:read'),
  ('materials:write'),
  ('equipment:read'),
  ('equipment:write'),
  ('stages:read'),
  ('stages:write');

-- Admin gets all permissions
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM role r
CROSS JOIN permission p
WHERE r.name = 'admin';

-- Worker gets read access to most things, plus write on worklogs
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM role r
CROSS JOIN permission p
WHERE r.name = 'worker'
  AND p.name IN (
    'companies:read',
    'projects:read',
    'employees:read',
    'worklogs:read',
    'worklogs:write',
    'materials:read',
    'equipment:read',
    'stages:read'
  );
