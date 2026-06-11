CREATE OR REPLACE FUNCTION public.decide_account_access_request(_request_id uuid, _decision text, _note text DEFAULT NULL)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_req public.account_access_requests%ROWTYPE; v_role public.app_role; v_count int; v_status text;
BEGIN
  SELECT * INTO v_req FROM public.account_access_requests WHERE id = _request_id FOR UPDATE;
  IF NOT FOUND OR v_req.status <> 'pending' THEN RAISE EXCEPTION 'Žádost není otevřená'; END IF;
  v_role := public.get_user_role(auth.uid());
  IF v_role NOT IN ('rektor'::public.app_role, 'spravce'::public.app_role) THEN RAISE EXCEPTION 'Přístup odepřen'; END IF;
  IF v_role = 'spravce'::public.app_role AND v_req.requested_by = auth.uid() THEN RAISE EXCEPTION 'Správce nemůže schválit vlastní žádost'; END IF;
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
REVOKE ALL ON FUNCTION public.decide_account_access_request(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.decide_account_access_request(uuid, text, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.update_user_wall_with_access(_target_user_id uuid, _bio text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_old text;
BEGIN
  IF NOT public.has_account_access(auth.uid(), _target_user_id, 'wall') THEN RAISE EXCEPTION 'Zeď není odemčena platným kódem'; END IF;
  IF char_length(coalesce(_bio,'')) > 5000 THEN RAISE EXCEPTION 'Text zdi je příliš dlouhý'; END IF;
  SELECT bio INTO v_old FROM public.profiles WHERE user_id=_target_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Uživatel nenalezen'; END IF;
  UPDATE public.profiles SET bio=nullif(btrim(_bio),''), updated_at=now() WHERE user_id=_target_user_id;
  INSERT INTO public.audit_log(user_id, action, entity_type, entity_id, details) VALUES
    (auth.uid(), 'wall.update', 'profile', _target_user_id, jsonb_build_object('target_user_id', _target_user_id, 'from', v_old, 'to', nullif(btrim(_bio),''), 'min_role', 'spravce'));
END $$;
REVOKE ALL ON FUNCTION public.update_user_wall_with_access(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_user_wall_with_access(uuid, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.close_mediation_with_resolution(_mediation_id uuid, _resolution text, _add_to_notes boolean DEFAULT false)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_med public.mediations_v2%ROWTYPE;
BEGIN
  IF NOT (public.has_role(auth.uid(),'rektor'::public.app_role) OR public.has_role(auth.uid(),'spravce'::public.app_role)) THEN RAISE EXCEPTION 'Přístup odepřen'; END IF;
  IF char_length(btrim(coalesce(_resolution,''))) < 5 OR char_length(_resolution) > 5000 THEN RAISE EXCEPTION 'Výstup musí mít 5 až 5000 znaků'; END IF;
  SELECT * INTO v_med FROM public.mediations_v2 WHERE id=_mediation_id FOR UPDATE;
  IF NOT FOUND OR v_med.status NOT IN ('open','requested') THEN RAISE EXCEPTION 'Mezirozpravu nelze uzavřít'; END IF;
  UPDATE public.mediations_v2 SET status='closed', resolution=btrim(_resolution), resolved_by=auth.uid(), resolved_at=now(), resolution_added_to_notes=_add_to_notes, updated_at=now() WHERE id=_mediation_id;
  IF _add_to_notes THEN
    INSERT INTO public.user_notes(target_user_id,author_id,occurred_at,public_description,private_description,punishment)
    VALUES(v_med.subject_user_id,auth.uid(),now(),NULL,'Výstup mezirozpravy MED-' || upper(substr(v_med.id::text,1,8)) || ': ' || btrim(_resolution),NULL);
  END IF;
  INSERT INTO public.audit_log(user_id, action, entity_type, entity_id, details) VALUES
    (auth.uid(),'mediation.close','mediations_v2',v_med.id,jsonb_build_object('target_user_id',v_med.subject_user_id,'resolution',btrim(_resolution),'added_to_notes',_add_to_notes,'status',jsonb_build_object('from',v_med.status,'to','closed'),'min_role','spravce'));
END $$;
REVOKE ALL ON FUNCTION public.close_mediation_with_resolution(uuid, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.close_mediation_with_resolution(uuid, text, boolean) TO authenticated, service_role;