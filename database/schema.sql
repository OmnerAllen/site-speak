-- Database schema derived from domain-design.mmd
-- Supports: Company, Employees, Projects, Suppliers, Stages, Equipment, Materials, WorkLog

-- Enable UUID extension (PostgreSQL)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Companies
CREATE TABLE company (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    address VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Employees (belongs to Company)
CREATE TABLE employee (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES company(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('admin', 'worker')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Suppliers (independent table)
CREATE TABLE supplier (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    address VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Projects (belongs to Company)
CREATE TABLE project (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES company(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    address VARCHAR(255) NOT NULL,
    overview TEXT NOT NULL DEFAULT '',
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Employee-Project assignment (many-to-many: employees work on projects)
CREATE TABLE employee_project (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employee(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES project(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Stages (belongs to Project)
CREATE TABLE stage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES project(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL CHECK (name IN ('demo', 'prep', 'build/install', 'qa')),
    details TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    planned_start DATE,
    planned_end DATE,
    CONSTRAINT chk_stage_planned_order CHECK (
        planned_start IS NULL OR planned_end IS NULL OR planned_start <= planned_end
    ),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Equipment (global or company level, independent of Stage)
CREATE TABLE equipment (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    cost_per_day DECIMAL(10, 2),
    cost_half_day DECIMAL(10, 2),
    rental_supplier_id UUID REFERENCES supplier(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Materials (from price list, independent of Stage)
CREATE TABLE material (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_name VARCHAR(255) NOT NULL,
    supplier_id UUID REFERENCES supplier(id) ON DELETE SET NULL,
    unit VARCHAR(50),
    product_type VARCHAR(100),
    price_per_unit DECIMAL(10, 2),
    currency VARCHAR(10),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Stage-Equipment association
CREATE TABLE stage_equipment (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stage_id UUID NOT NULL REFERENCES stage(id) ON DELETE CASCADE,
    equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
    half_day_bool BOOLEAN DEFAULT False, 
    date_of_use DATE NOT NULL,
    deleted_at TIMESTAMPTZ
);

-- Stage-Materials association
CREATE TABLE stage_material (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stage_id UUID NOT NULL REFERENCES stage(id) ON DELETE CASCADE,
    material_id UUID NOT NULL REFERENCES material(id) ON DELETE CASCADE,
    quantity DECIMAL(10, 2) DEFAULT 1,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Work log (Employee logs time on Project)
CREATE TABLE work_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employee(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES project(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Auth / RBAC tables

CREATE TABLE "user" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    keycloak_sub VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    employee_id UUID REFERENCES employee(id),
    company_id UUID REFERENCES company(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE role (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE permission (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE user_role (
    user_id UUID REFERENCES "user"(id) ON DELETE CASCADE,
    role_id UUID REFERENCES role(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

CREATE TABLE role_permission (
    role_id UUID REFERENCES role(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES permission(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- Indexes for common lookups
CREATE INDEX idx_employee_company ON employee(company_id);
CREATE INDEX idx_project_company ON project(company_id);
CREATE INDEX idx_stage_project ON stage(project_id);
CREATE UNIQUE INDEX uq_stage_project_name_active ON stage(project_id, name) WHERE deleted_at IS NULL;
CREATE INDEX idx_stage_equipment_stage ON stage_equipment(stage_id);
CREATE INDEX idx_stage_material_stage ON stage_material(stage_id);
CREATE INDEX idx_equipment_rental_supplier ON equipment(rental_supplier_id);
CREATE INDEX idx_work_log_employee ON work_log(employee_id);
CREATE INDEX idx_work_log_project ON work_log(project_id);
CREATE INDEX idx_work_log_started_at ON work_log(started_at);
CREATE INDEX idx_employee_project_employee ON employee_project(employee_id);
CREATE INDEX idx_employee_project_project ON employee_project(project_id);
CREATE INDEX idx_user_keycloak_sub ON "user"(keycloak_sub);
CREATE INDEX idx_user_email ON "user"(email);
CREATE INDEX idx_user_employee ON "user"(employee_id);
