-- Database schema derived from domain-design.mmd
-- Supports: Company, Employees, Projects, Suppliers, Stages, Equipment, Materials, WorkLog

-- Enable UUID extension (PostgreSQL)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Companies
CREATE TABLE company (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
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

-- Suppliers (belongs to Company)
CREATE TABLE supplier (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES company(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Projects (belongs to Company)
CREATE TABLE project (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES company(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Employee-Project assignment (many-to-many: employees work on projects)
CREATE TABLE employee_project (
    employee_id UUID NOT NULL REFERENCES employee(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES project(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (employee_id, project_id),
    deleted_at TIMESTAMPTZ
);

-- Stages (belongs to Project)
CREATE TABLE stage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES project(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Equipment (global or company level, independent of Stage)
CREATE TABLE equipment (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Materials (from price list, independent of Stage)
CREATE TABLE material (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_name VARCHAR(255) NOT NULL,
    brand VARCHAR(255),
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
    stage_id UUID NOT NULL REFERENCES stage(id) ON DELETE CASCADE,
    equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
    quantity DECIMAL(10, 2) DEFAULT 1,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (stage_id, equipment_id),
    deleted_at TIMESTAMPTZ
);

-- Stage-Materials association
CREATE TABLE stage_material (
    stage_id UUID NOT NULL REFERENCES stage(id) ON DELETE CASCADE,
    material_id UUID NOT NULL REFERENCES material(id) ON DELETE CASCADE,
    quantity DECIMAL(10, 2) DEFAULT 1,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (stage_id, material_id),
    deleted_at TIMESTAMPTZ
);

-- Work log (Employee logs time on Project)
CREATE TABLE work_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employee(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES project(id) ON DELETE CASCADE,
    logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    hours DECIMAL(10, 2),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Indexes for common lookups
CREATE INDEX idx_employee_company ON employee(company_id);
CREATE INDEX idx_project_company ON project(company_id);
CREATE INDEX idx_supplier_company ON supplier(company_id);
CREATE INDEX idx_stage_project ON stage(project_id);
CREATE INDEX idx_stage_equipment_stage ON stage_equipment(stage_id);
CREATE INDEX idx_stage_material_stage ON stage_material(stage_id);
CREATE INDEX idx_work_log_employee ON work_log(employee_id);
CREATE INDEX idx_work_log_project ON work_log(project_id);
CREATE INDEX idx_work_log_logged_at ON work_log(logged_at);
CREATE INDEX idx_employee_project_employee ON employee_project(employee_id);
CREATE INDEX idx_employee_project_project ON employee_project(project_id);
