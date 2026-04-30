-- 0001_initial.sql - Schema completo PostgreSQL - Plano de Ação v3.0, Modelo 1 (Relacional), Formato A (Agrupado por Tema)

-- 1. EXTENSÕES NECESSÁRIAS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TIPOS ENUM
CREATE TYPE user_role_enum AS ENUM ('super_admin', 'admin', 'manager', 'collaborator', 'viewer');
CREATE TYPE client_type_enum AS ENUM ('pf', 'pj');
CREATE TYPE post_status_enum AS ENUM ('draft', 'published', 'archived');
CREATE TYPE finance_type_enum AS ENUM ('income', 'expense', 'transfer');
CREATE TYPE task_status_enum AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');
CREATE TYPE event_type_enum AS ENUM ('meeting', 'call', 'deadline', 'other');
CREATE TYPE case_status_enum AS ENUM ('open', 'analyzing', 'closed', 'suspended');
CREATE TYPE interaction_type_enum AS ENUM ('email', 'phone', 'meeting', 'other');
CREATE TYPE alert_type_enum AS ENUM ('email', 'sms', 'push');
CREATE TYPE dou_status_enum AS ENUM ('processed', 'pending', 'error');
CREATE TYPE log_level_enum AS ENUM ('info', 'warn', 'error', 'debug');

-- 3. TEM A: ORGANIZAÇÕES E CONFIGURAÇÕES BASE
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    cnpj VARCHAR(18),
    email VARCHAR(255),
    phone VARCHAR(20),
    address JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL
);

CREATE UNIQUE INDEX idx_organizations_cnpj_unique ON organizations (cnpj) WHERE deleted_at IS NULL;
CREATE INDEX idx_organizations_deleted ON organizations (deleted_at) WHERE deleted_at IS NULL;

CREATE TABLE settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    key TEXT NOT NULL,
    value JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL
);
CREATE UNIQUE INDEX idx_settings_org_key_unique ON settings (organization_id, key) WHERE deleted_at IS NULL;
CREATE INDEX idx_settings_org_deleted ON settings (organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_settings_value_gin ON settings USING GIN (value) WHERE deleted_at IS NULL;

-- 4. TEMA: USUÁRIOS, COLABORADORES E CLIENTES
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash TEXT NOT NULL,
    role user_role_enum NOT NULL DEFAULT 'viewer',
    phone VARCHAR(20),
    avatar_url TEXT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL,
    CHECK (active = (deleted_at IS NULL))
);
CREATE UNIQUE INDEX idx_users_email_unique ON users (email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_org_deleted ON users (organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_role_deleted ON users (role) WHERE deleted_at IS NULL;

CREATE TABLE collaborators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    role TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL
);
CREATE INDEX idx_collaborators_org_deleted ON collaborators (organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_collaborators_user_deleted ON collaborators (user_id) WHERE deleted_at IS NULL;

CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    cpf_cnpj VARCHAR(18) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    type client_type_enum NOT NULL DEFAULT 'pf',
    address JSONB,
    notes JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL
);
CREATE UNIQUE INDEX idx_clients_cpf_cnpj_unique ON clients (cpf_cnpj) WHERE deleted_at IS NULL;
CREATE INDEX idx_clients_org_deleted ON clients (organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_clients_address_gin ON clients USING GIN (address) WHERE deleted_at IS NULL;
CREATE INDEX idx_clients_notes_gin ON clients USING GIN (notes) WHERE deleted_at IS NULL;

CREATE TABLE client_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    category TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL
);
CREATE INDEX idx_client_documents_client_deleted ON client_documents (client_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_client_documents_metadata_gin ON client_documents USING GIN (metadata) WHERE deleted_at IS NULL;

-- 5. TEMA: CONTEÚDO
CREATE TABLE posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    content JSONB NOT NULL,
    status post_status_enum NOT NULL DEFAULT 'draft',
    published_at TIMESTAMPTZ,
    tags JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL
);
CREATE INDEX idx_posts_org_user_deleted ON posts (organization_id, user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_posts_status_deleted ON posts (status) WHERE deleted_at IS NULL;
CREATE INDEX idx_posts_content_gin ON posts USING GIN (content) WHERE deleted_at IS NULL;
CREATE INDEX idx_posts_tags_gin ON posts USING GIN (tags) WHERE deleted_at IS NULL;

CREATE TABLE knowledge_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content JSONB NOT NULL,
    type TEXT,
    tags JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL
);
CREATE INDEX idx_knowledge_items_org_deleted ON knowledge_items (organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_knowledge_items_content_gin ON knowledge_items USING GIN (content) WHERE deleted_at IS NULL;
CREATE INDEX idx_knowledge_items_tags_gin ON knowledge_items USING GIN (tags) WHERE deleted_at IS NULL;

-- 6. TEMA: FINANÇAS
CREATE TABLE finances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    type finance_type_enum NOT NULL,
    category TEXT,
    amount NUMERIC(15,2) NOT NULL CHECK (amount >= 0),
    description TEXT,
    transaction_date TIMESTAMPTZ DEFAULT NOW(),
    reference_id UUID,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL
);
CREATE INDEX idx_finances_org_type_deleted ON finances (organization_id, type) WHERE deleted_at IS NULL;
CREATE INDEX idx_finances_date_deleted ON finances (transaction_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_finances_metadata_gin ON finances USING GIN (metadata) WHERE deleted_at IS NULL;

-- 7. TEMA: AGENDA, TAREFAS E KANBAN
CREATE TABLE agenda_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    type event_type_enum DEFAULT 'other',
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ,
    recurrence TEXT,
    attendees JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL,
    CHECK (end_at IS NULL OR end_at > start_at)
);
CREATE INDEX idx_agenda_events_org_user_deleted ON agenda_events (organization_id, user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_agenda_events_start_deleted ON agenda_events (start_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_agenda_events_attendees_gin ON agenda_events USING GIN (attendees) WHERE deleted_at IS NULL;

CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- assignee
    title TEXT NOT NULL,
    description TEXT,
    status task_status_enum DEFAULT 'pending',
    priority INTEGER CHECK (priority BETWEEN 1 AND 5) DEFAULT 3,
    due_date TIMESTAMPTZ,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL
);
CREATE INDEX idx_tasks_org_status_deleted ON tasks (organization_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_due_deleted ON tasks (due_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_metadata_gin ON tasks USING GIN (metadata) WHERE deleted_at IS NULL;

CREATE TABLE kanban_boards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL
);
CREATE INDEX idx_kanban_boards_org_deleted ON kanban_boards (organization_id) WHERE deleted_at IS NULL;

CREATE TABLE kanban_columns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    board_id UUID NOT NULL REFERENCES kanban_boards(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    position INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL
);
CREATE UNIQUE INDEX idx_kanban_columns_board_pos_unique ON kanban_columns (board_id, position) WHERE deleted_at IS NULL;
CREATE INDEX idx_kanban_columns_board_deleted ON kanban_columns (board_id) WHERE deleted_at IS NULL;

-- 8. TEMA: CASOS LEGAIS
CREATE TABLE legal_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    number VARCHAR(100) NOT NULL,
    title TEXT NOT NULL,
    status case_status_enum DEFAULT 'open',
    court TEXT,
    judge TEXT,
    start_date TIMESTAMPTZ,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL
);
CREATE UNIQUE INDEX idx_legal_cases_number_unique ON legal_cases (number) WHERE deleted_at IS NULL;
CREATE INDEX idx_legal_cases_org_client_deleted ON legal_cases (organization_id, client_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_legal_cases_status_deleted ON legal_cases (status) WHERE deleted_at IS NULL;
CREATE INDEX idx_legal_cases_metadata_gin ON legal_cases USING GIN (metadata) WHERE deleted_at IS NULL;

CREATE TABLE case_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES legal_cases(id) ON DELETE CASCADE,
    movement_date TIMESTAMPTZ DEFAULT NOW(),
    type TEXT,
    description TEXT,
    document_url TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL
);
CREATE INDEX idx_case_movements_case_deleted ON case_movements (case_id, movement_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_case_movements_metadata_gin ON case_movements USING GIN (metadata) WHERE deleted_at IS NULL;

CREATE TABLE case_estimates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES legal_cases(id) ON DELETE CASCADE,
    estimated_cost NUMERIC(12,2),
    estimated_time INTERVAL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL
);
CREATE INDEX idx_case_estimates_case_deleted ON case_estimates (case_id) WHERE deleted_at IS NULL;

CREATE TABLE case_labels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES legal_cases(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    color VARCHAR(7),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL
);
CREATE INDEX idx_case_labels_case_deleted ON case_labels (case_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_case_labels_label ON case_labels (label) WHERE deleted_at IS NULL;

-- 9. TEMA: GAZETAS E PUBLICACÕES DOU
CREATE TABLE gazettes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    uf VARCHAR(2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL
);
CREATE INDEX idx_gazettes_org_deleted ON gazettes (organization_id) WHERE deleted_at IS NULL;

CREATE TABLE gazette_publications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gazette_id UUID NOT NULL REFERENCES gazettes(id) ON DELETE CASCADE,
    edition_date DATE NOT NULL,
    file_url TEXT,
    content JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL
);
CREATE INDEX idx_gazette_publications_gazette_date_deleted ON gazette_publications (gazette_id, edition_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_gazette_publications_content_gin ON gazette_publications USING GIN (content) WHERE deleted_at IS NULL;

CREATE TABLE publicacoes_dou (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    dou_date DATE NOT NULL,
    title TEXT,
    content JSONB,
    dou_type TEXT,
    file_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL
);
CREATE INDEX idx_publicacoes_dou_org_date_deleted ON publicacoes_dou (organization_id, dou_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_publicacoes_dou_content_gin ON publicacoes_dou USING GIN (content) WHERE deleted_at IS NULL;

CREATE TABLE termos_monitorados (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    termo TEXT NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL
);
CREATE INDEX idx_termos_monitorados_org_deleted ON termos_monitorados (organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_termos_monitorados_termo ON termos_monitorados (termo) WHERE deleted_at IS NULL;

CREATE TABLE ocorrencias_dou (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    termo_id UUID NOT NULL REFERENCES termos_monitorados(id) ON DELETE CASCADE,
    publicacao_id UUID REFERENCES publicacoes_dou(id) ON DELETE SET NULL,
    dou_date DATE,
    content JSONB,
    relevance NUMERIC(3,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL
);
CREATE INDEX idx_ocorrencias_dou_termo_deleted ON ocorrencias_dou (termo_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_ocorrencias_dou_content_gin ON ocorrencias_dou USING GIN (content) WHERE deleted_at IS NULL;

-- 10. TEMA: CONFIGURAÇÕES DE ALERTA E FILAS
CREATE TABLE configuracoes_alerta (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    termo_id UUID REFERENCES termos_monitorados(id) ON DELETE CASCADE,
    type alert_type_enum NOT NULL,
    frequency TEXT,
    recipients JSONB,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL
);
CREATE INDEX idx_configuracoes_alerta_org_deleted ON configuracoes_alerta (organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_configuracoes_alerta_recipients_gin ON configuracoes_alerta USING GIN (recipients) WHERE deleted_at IS NULL;

CREATE TABLE dou_search_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query TEXT NOT NULL,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    results JSONB,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL
);
CREATE INDEX idx_dou_search_cache_query_org ON dou_search_cache (query, organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_dou_search_cache_expires ON dou_search_cache (expires_at) WHERE deleted_at IS NULL AND expires_at > NOW();
CREATE INDEX idx_dou_search_cache_results_gin ON dou_search_cache USING GIN (results) WHERE deleted_at IS NULL;

CREATE TABLE dou_reprocessing_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    publicacao_id UUID REFERENCES publicacoes_dou(id) ON DELETE CASCADE,
    status dou_status_enum DEFAULT 'pending',
    error_msg TEXT,
    retries INTEGER DEFAULT 0 CHECK (retries >= 0),
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL
);
CREATE INDEX idx_dou_reprocessing_status_deleted ON dou_reprocessing_queue (status) WHERE deleted_at IS NULL;
CREATE INDEX idx_dou_reprocessing_metadata_gin ON dou_reprocessing_queue USING GIN (metadata) WHERE deleted_at IS NULL;

CREATE TABLE logs_processamento (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    queue_id UUID REFERENCES dou_reprocessing_queue(id) ON DELETE SET NULL,
    level log_level_enum DEFAULT 'info',
    message TEXT NOT NULL,
    data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL
);
CREATE INDEX idx_logs_processamento_queue_deleted ON logs_processamento (queue_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_logs_processamento_level_deleted ON logs_processamento (level) WHERE deleted_at IS NULL;
CREATE INDEX idx_logs_processamento_data_gin ON logs_processamento USING GIN (data) WHERE deleted_at IS NULL;

-- 11. TEMA: CRM E COMUNICAÇÕES
CREATE TABLE crm_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    type interaction_type_enum NOT NULL,
    notes TEXT,
    date TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL
);
CREATE INDEX idx_crm_interactions_org_client_deleted ON crm_interactions (organization_id, client_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_crm_interactions_date_deleted ON crm_interactions (date) WHERE deleted_at IS NULL;
CREATE INDEX idx_crm_interactions_metadata_gin ON crm_interactions USING GIN (metadata) WHERE deleted_at IS NULL;

CREATE TABLE communication_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    subject TEXT,
    body JSONB,
    type TEXT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL
);
CREATE UNIQUE INDEX idx_communication_templates_org_name_unique ON communication_templates (organization_id, name) WHERE deleted_at IS NULL;
CREATE INDEX idx_communication_templates_org_deleted ON communication_templates (organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_communication_templates_body_gin ON communication_templates USING GIN (body) WHERE deleted_at IS NULL;

CREATE TABLE pje_communications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES legal_cases(id) ON DELETE CASCADE,
    type TEXT,
    date TIMESTAMPTZ DEFAULT NOW(),
    content JSONB,
    status TEXT DEFAULT 'sent',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL
);
CREATE INDEX idx_pje_communications_case_deleted ON pje_communications (case_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_pje_communications_content_gin ON pje_communications USING GIN (content) WHERE deleted_at IS NULL;

CREATE TABLE email_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    to_email VARCHAR(255) NOT NULL,
    subject TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    sent_at TIMESTAMPTZ,
    error TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL
);
CREATE INDEX idx_email_logs_org_status_deleted ON email_logs (organization_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_email_logs_metadata_gin ON email_logs USING GIN (metadata) WHERE deleted_at IS NULL;

-- 12. TEMA: LOGS E AUDITORIA
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL
);
CREATE INDEX idx_audit_logs_org_action_deleted ON audit_logs (organization_id, action) WHERE deleted_at IS NULL;
CREATE INDEX idx_audit_logs_entity_deleted ON audit_logs (entity_type, entity_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_audit_logs_old_gin ON audit_logs USING GIN (old_values) WHERE deleted_at IS NULL;
CREATE INDEX idx_audit_logs_new_gin ON audit_logs USING GIN (new_values) WHERE deleted_at IS NULL;

CREATE TABLE system_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    level log_level_enum NOT NULL,
    message TEXT NOT NULL,
    context JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL
);
CREATE INDEX idx_system_logs_org_level_deleted ON system_logs (organization_id, level) WHERE deleted_at IS NULL;
CREATE INDEX idx_system_logs_context_gin ON system_logs USING GIN (context) WHERE deleted_at IS NULL;

-- 13. TEMA: BUSCAS E NOTIFICAÇÕES
CREATE TABLE searches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    query TEXT NOT NULL,
    type TEXT,
    results JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL
);
CREATE INDEX idx_searches_org_user_query_deleted ON searches (organization_id, user_id, query) WHERE deleted_at IS NULL;
CREATE INDEX idx_searches_results_gin ON searches USING GIN (results) WHERE deleted_at IS NULL;

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT,
    type TEXT,
    read_at TIMESTAMPTZ NULL,
    data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL
);
CREATE INDEX idx_notifications_user_read_deleted ON notifications (user_id, read_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_notifications_data_gin ON notifications USING GIN (data) WHERE deleted_at IS NULL;

-- FIM DO SCHEMA
-- Comentários: Todas as tabelas possuem soft delete (deleted_at). Queries devem filtrar WHERE deleted_at IS NULL.
-- Índices parciais otimizam performance para registros ativos.
-- FKs com CASCADE para dados dependentes.
-- JSONB com GIN para buscas eficientes.