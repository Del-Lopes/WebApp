-- Implementação de Auto-Aceite para Edição de Licenças
-- Aplica políticas de RLS e triggers de segurança para permitir que usuários editem suas próprias contas MT5
-- Mantendo o status 'approved' caso a licença já estivesse aprovada.

-- 1. Helper function para checar se o usuário é admin
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Função de Trigger para proteger campos sensíveis
-- Garante que o usuário comum não mude o status para 'approved' ou altere a expiração
CREATE OR REPLACE FUNCTION public.protect_license_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    -- Impedir auto-aprovação (mudar de qualquer status para 'approved')
    IF NEW.status = 'approved' AND OLD.status <> 'approved' THEN
      RAISE EXCEPTION 'Apenas administradores podem aprovar licenças.';
    END IF;

    -- Impedir alteração de validade
    IF NEW.expires_at IS DISTINCT FROM OLD.expires_at THEN
      RAISE EXCEPTION 'Apenas administradores podem alterar a data de expiração.';
    END IF;

    -- Impedir transferência de licença para outro usuário
    IF NEW.user_id <> OLD.user_id THEN
      RAISE EXCEPTION 'Não é permitido transferir licenças entre usuários.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Aplicar Trigger em todas as tabelas de licença
DO $$ 
DECLARE
  t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY['license_requests', 'license_requests_snowball', 'license_requests_boletapro', 'license_requests_fxsquad'])
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS tr_protect_license_fields ON public.%I', t);
    EXECUTE format('CREATE TRIGGER tr_protect_license_fields BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE PROCEDURE public.protect_license_fields()', t);
  END LOOP;
END $$;

-- 4. Habilitar política de UPDATE para os donos das licenças
DO $$ 
DECLARE
  t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY['license_requests', 'license_requests_snowball', 'license_requests_boletapro', 'license_requests_fxsquad'])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Users can update own license requests" ON public.%I', t);
    EXECUTE format('CREATE POLICY "Users can update own license requests" ON public.%I FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)', t);
  END LOOP;
END $$;
