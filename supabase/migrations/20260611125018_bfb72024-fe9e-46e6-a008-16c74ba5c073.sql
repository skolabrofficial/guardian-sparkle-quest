CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

ALTER TABLE public.mediations_v2
  ADD COLUMN IF NOT EXISTS resolution text,
  ADD COLUMN IF NOT EXISTS resolved_by uuid,
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz,
  ADD COLUMN IF NOT EXISTS resolution_added_to_notes boolean NOT NULL DEFAULT false;

CREATE TABLE public.account_access_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id uuid NOT NULL,
  requested_by uuid NOT NULL,
  scope text NOT NULL CHECK (scope IN ('wall','searches','account_actions','all')),
  reason text NOT NULL CHECK (char_length(btrim(reason)) BETWEEN 5 AND 1000),
  code_hash text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','used','revoked')),
  created_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz,
  used_at timestamptz,
  revoked_at timestamptz,
  revoked_by uuid
);
GRANT SELECT ON public.account_access_requests TO authenticated;
GRANT ALL ON public.account_access_requests TO service_role;
ALTER TABLE public.account_access_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff view relevant access requests" ON public.account_access_requests FOR SELECT TO authenticated USING (
  requested_by = auth.uid() OR public.has_role(auth.uid(), 'rektor'::public.app_role) OR public.has_role(auth.uid(), 'spravce'::public.app_role)
);

CREATE TABLE public.account_access_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.account_access_requests(id) ON DELETE CASCADE,
  approver_id uuid NOT NULL,
  decision text NOT NULL CHECK (decision IN ('approved','rejected')),
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (request_id, approver_id)
);
GRANT SELECT ON public.account_access_approvals TO authenticated;
GRANT ALL ON public.account_access_approvals TO service_role;
ALTER TABLE public.account_access_approvals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff view access approvals" ON public.account_access_approvals FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.account_access_requests r WHERE r.id = request_id AND (r.requested_by = auth.uid() OR public.has_role(auth.uid(), 'rektor'::public.app_role) OR public.has_role(auth.uid(), 'spravce'::public.app_role)))
);

CREATE TABLE public.account_access_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL UNIQUE REFERENCES public.account_access_requests(id) ON DELETE CASCADE,
  target_user_id uuid NOT NULL,
  grantee_id uuid NOT NULL,
  scope text NOT NULL CHECK (scope IN ('wall','searches','account_actions','all')),
  granted_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  revoked_by uuid
);
GRANT SELECT ON public.account_access_grants TO authenticated;
GRANT ALL ON public.account_access_grants TO service_role;
ALTER TABLE public.account_access_grants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff view relevant access grants" ON public.account_access_grants FOR SELECT TO authenticated USING (
  grantee_id = auth.uid() OR public.has_role(auth.uid(), 'rektor'::public.app_role) OR public.has_role(auth.uid(), 'spravce'::public.app_role)
);

CREATE TABLE public.user_search_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  query text NOT NULL CHECK (char_length(query) BETWEEN 1 AND 500),
  context text NOT NULL DEFAULT 'global' CHECK (char_length(context) BETWEEN 1 AND 80),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.user_search_history TO authenticated;
GRANT ALL ON public.user_search_history TO service_role;
ALTER TABLE public.user_search_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users create own search history" ON public.user_search_history FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users view own search history" ON public.user_search_history FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Authorized staff view search history" ON public.user_search_history FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.account_access_grants g WHERE g.target_user_id = user_search_history.user_id AND g.grantee_id = auth.uid() AND g.revoked_at IS NULL AND g.scope IN ('searches','all'))
);
CREATE POLICY "Users delete own search history" ON public.user_search_history FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_account_access(_staff_id uuid, _target_user_id uuid, _scope text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.account_access_grants g
    WHERE g.grantee_id = _staff_id AND g.target_user_id = _target_user_id
      AND g.revoked_at IS NULL AND (g.scope = _scope OR g.scope = 'all')
  )
$$;
GRANT EXECUTE ON FUNCTION public.has_account_access(uuid, uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.create_account_access_request(_target_user_id uuid, _scope text, _reason text)
RETURNS TABLE(request_id uuid, access_code text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE v_code text; v_id uuid;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'rektor'::public.app_role) OR public.has_role(auth.uid(), 'spravce'::public.app_role)) THEN RAISE EXCEPTION 'Přístup odepřen'; END IF;
  IF _scope NOT IN ('wall','searches','account_actions','all') OR char_length(btrim(_reason)) < 5 THEN RAISE EXCEPTION 'Neplatný rozsah nebo důvod'; END IF;
  v_code := upper(substr(encode(gen_random_bytes(8), 'hex'), 1, 12));
  INSERT INTO public.account_access_requests(target_user_id, requested_by, scope, reason, code_hash)
  VALUES (_target_user_id, auth.uid(), _scope, btrim(_reason), encode(digest(v_code, 'sha256'), 'hex')) RETURNING id INTO v_id;
  INSERT INTO public.audit_log(user_id, action, entity_type, entity_id, details) VALUES
    (auth.uid(), 'account_access.request', 'profile', _target_user_id, jsonb_build_object('request_id', v_id, 'scope', _scope, 'reason', btrim(_reason), 'target_user_id', _target_user_id, 'min_role', 'spravce'));
  RETURN QUERY SELECT v_id, v_code;
END $$;
GRANT EXECUTE ON FUNCTION public.create_account_access_request(uuid, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.decide_account_access_request(_request_id uuid, _decision text, _note text DEFAULT NULL)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_req public.account_access_requests%ROWTYPE; v_role public.app_role; v_count int; v_status text;
BEGIN
  SELECT * INTO v_req FROM public.account_access_requests WHERE id = _request_id FOR UPDATE;
  IF NOT FOUND OR v_req.status <> 'pending' THEN RAISE EXCEPTION 'Žádost není otevřená'; END IF;
  v_role := public.get_user_role(auth.uid());
  IF v_role NOT IN ('rektor'::public.app_role, 'spravce'::public.app_role) THEN RAISE EXCEPTION 'Přístup odepřen'; END IF;
  IF _decision NOT IN ('approved','rejected') THEN RAISE EXCEPTION 'Neplatné rozhodnutí'; END IF;
  INSERT INTO public.account_access_approvals(request_id, approver_id, decision, note) VALUES (_request_id, auth.uid(), _decision, nullif(btrim(_note),''));
  IF _decision = 'rejected' THEN
    UPDATE public.account_access_requests SET status='rejected' WHERE id=_request_id; v_status := 'rejected';
  ELSIF v_role = 'rektor'::public.app_role THEN
    UPDATE public.account_access_requests SET status='approved', approved_at=now() WHERE id=_request_id; v_status := 'approved';
  ELSE
    SELECT count(DISTINCT a.approver_id) INTO v_count FROM public.account_access_approvals a JOIN public.user_roles ur ON ur.user_id=a.approver_id AND ur.role='spravce' WHERE a.request_id=_request_id AND a.decision='approved';
    IF v_count >= 2 THEN UPDATE public.account_access_requests SET status='approved', approved_at=now() WHERE id=_request_id; v_status := 'approved'; ELSE v_status := 'pending'; END IF;
  END IF;
  INSERT INTO public.audit_log(user_id, action, entity_type, entity_id, details) VALUES
    (auth.uid(), 'account_access.' || _decision, 'profile', v_req.target_user_id, jsonb_build_object('request_id', _request_id, 'scope', v_req.scope, 'status', v_status, 'target_user_id', v_req.target_user_id, 'min_role', CASE WHEN v_role='rektor' THEN 'rektor' ELSE 'spravce' END));
  RETURN v_status;
END $$;
GRANT EXECUTE ON FUNCTION public.decide_account_access_request(uuid, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.redeem_account_access_code(_request_id uuid, _code text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE v_req public.account_access_requests%ROWTYPE; v_grant uuid;
BEGIN
  SELECT * INTO v_req FROM public.account_access_requests WHERE id=_request_id FOR UPDATE;
  IF NOT FOUND OR v_req.requested_by <> auth.uid() OR v_req.status <> 'approved' THEN RAISE EXCEPTION 'Kód zatím nelze použít'; END IF;
  IF encode(digest(upper(btrim(_code)), 'sha256'), 'hex') <> v_req.code_hash THEN RAISE EXCEPTION 'Neplatný kód'; END IF;
  INSERT INTO public.account_access_grants(request_id,target_user_id,grantee_id,scope) VALUES(v_req.id,v_req.target_user_id,auth.uid(),v_req.scope) RETURNING id INTO v_grant;
  UPDATE public.account_access_requests SET status='used', used_at=now() WHERE id=v_req.id;
  INSERT INTO public.audit_log(user_id, action, entity_type, entity_id, details) VALUES
    (auth.uid(), 'account_access.unlocked', 'profile', v_req.target_user_id, jsonb_build_object('request_id', v_req.id, 'scope', v_req.scope, 'target_user_id', v_req.target_user_id, 'min_role', 'spravce'));
  RETURN v_grant;
END $$;
GRANT EXECUTE ON FUNCTION public.redeem_account_access_code(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.revoke_account_access(_grant_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_grant public.account_access_grants%ROWTYPE;
BEGIN
  SELECT * INTO v_grant FROM public.account_access_grants WHERE id=_grant_id AND revoked_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Aktivní přístup nenalezen'; END IF;
  IF NOT (v_grant.grantee_id=auth.uid() OR public.has_role(auth.uid(),'rektor'::public.app_role) OR public.has_role(auth.uid(),'spravce'::public.app_role)) THEN RAISE EXCEPTION 'Přístup odepřen'; END IF;
  UPDATE public.account_access_grants SET revoked_at=now(), revoked_by=auth.uid() WHERE id=_grant_id;
  UPDATE public.account_access_requests SET status='revoked', revoked_at=now(), revoked_by=auth.uid() WHERE id=v_grant.request_id;
  INSERT INTO public.audit_log(user_id, action, entity_type, entity_id, details) VALUES
    (auth.uid(), 'account_access.revoked', 'profile', v_grant.target_user_id, jsonb_build_object('grant_id', v_grant.id, 'scope', v_grant.scope, 'target_user_id', v_grant.target_user_id, 'min_role', 'spravce'));
END $$;
GRANT EXECUTE ON FUNCTION public.revoke_account_access(uuid) TO authenticated;