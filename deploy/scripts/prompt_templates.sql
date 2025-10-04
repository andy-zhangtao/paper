-- Prompt templates schema additions for Paper AI (PostgreSQL)

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'prompt_template_scope') THEN
        CREATE TYPE prompt_template_scope AS ENUM ('system', 'user');
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS prompt_stages (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(40) NOT NULL UNIQUE,
    display_name VARCHAR(80) NOT NULL,
    description TEXT,
    order_index SMALLINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS prompt_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scope prompt_template_scope NOT NULL DEFAULT 'system',
    stage_id BIGINT NOT NULL REFERENCES prompt_stages(id) ON DELETE CASCADE,
    language_code VARCHAR(8) NOT NULL DEFAULT 'zh-CN',
    title VARCHAR(120) NOT NULL,
    content TEXT NOT NULL,
    variables JSONB NOT NULL DEFAULT '{}'::jsonb,
    owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT prompt_templates_scope_owner_chk CHECK (
        (scope = 'system' AND owner_user_id IS NULL) OR
        (scope = 'user' AND owner_user_id IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_prompt_templates_stage_scope ON prompt_templates(stage_id, scope);
CREATE INDEX IF NOT EXISTS idx_prompt_templates_owner ON prompt_templates(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_prompt_templates_active ON prompt_templates(is_active);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'update_prompt_stages_updated_at'
    ) THEN
        CREATE TRIGGER update_prompt_stages_updated_at
            BEFORE UPDATE ON prompt_stages
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'update_prompt_templates_updated_at'
    ) THEN
        CREATE TRIGGER update_prompt_templates_updated_at
            BEFORE UPDATE ON prompt_templates
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END;
$$ LANGUAGE plpgsql;
