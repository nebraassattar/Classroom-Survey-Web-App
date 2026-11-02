-- Run after migration + instructor provisioning, with no live classroom collection.
-- Fixtures (and any lifecycle changes) roll back. This is not an HTTP/Auth test.
begin;
create temporary table test_context (instructor uuid, survey uuid, slug text, payload jsonb);
insert into test_context(instructor) select user_id from private.instructors order by created_at limit 1;
do $$ begin
  if not exists(select 1 from test_context) then raise exception 'Provision an instructor first'; end if;
end $$;
grant select, update on test_context to authenticated, anon;
select set_config('request.jwt.claim.sub', (select instructor::text from test_context), true);
set local role authenticated;
do $$
declare v_id uuid; v_active jsonb; v_public jsonb;
begin
  if not public.is_instructor() then raise exception 'Instructor authorization failed'; end if;
  v_id := public.save_survey_draft(null, 'Rollback-only smoke test', null,
    '[{"question_text":"Smoke test?","question_type":"true_false","choices":["True","False"]}]'::jsonb);
  v_active := public.activate_survey(v_id);
  v_public := public.get_public_survey(v_active->>'public_slug');
  update test_context set survey = v_id, slug = v_active->>'public_slug', payload =
    jsonb_build_array(jsonb_build_object('question_id', v_public#>>'{questions,0,id}', 'choice_id', v_public#>>'{questions,0,choices,0,id}'));
end $$;
set local role anon;
select set_config('request.jwt.claim.sub', '', true);
do $$
declare v_context record; v_token uuid := gen_random_uuid(); v_denied boolean := false;
begin
  select * into v_context from test_context;
  if public.get_public_survey(v_context.slug)->>'state' <> 'active' then raise exception 'Public read failed'; end if;
  begin perform 1 from public.responses; exception when insufficient_privilege then v_denied := true; end;
  if not v_denied then raise exception 'Anonymous response reads allowed'; end if;
  v_denied := false;
  begin delete from public.surveys where id = v_context.survey; exception when insufficient_privilege then v_denied := true; end;
  if not v_denied then raise exception 'Anonymous mutation allowed'; end if;
  perform public.submit_survey_response(v_context.survey, v_token, v_context.payload);
  v_denied := false;
  begin perform public.submit_survey_response(v_context.survey, v_token, v_context.payload);
  exception when raise_exception then
    if sqlerrm <> 'DUPLICATE_RESPONSE' then raise; end if;
    v_denied := true;
  end;
  if not v_denied then raise exception 'Duplicate accepted'; end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub', (select instructor::text from test_context), true);
set local role authenticated;
do $$
declare v_id uuid := (select survey from test_context);
begin
  if (public.get_survey_results(v_id)->>'response_count')::int <> 1 then raise exception 'Wrong stored count'; end if;
  perform public.close_survey(v_id);
end $$;
select set_config('request.jwt.claim.sub', gen_random_uuid()::text, true);
do $$
declare v_denied boolean := false;
begin
  if public.is_instructor() then raise exception 'Unexpected membership'; end if;
  if exists(select 1 from public.responses) then raise exception 'Non-instructor read responses'; end if;
  begin perform public.get_survey_results((select survey from test_context));
  exception when raise_exception then
    if sqlerrm <> 'INSTRUCTOR_REQUIRED' then raise; end if;
    v_denied := true;
  end;
  if not v_denied then raise exception 'Non-instructor results allowed'; end if;
end $$;
set local role anon;
select set_config('request.jwt.claim.sub', '', true);
do $$
declare v_context record; v_denied boolean := false;
begin
  select * into v_context from test_context;
  if public.get_public_survey(v_context.slug)->>'state' <> 'closed' then raise exception 'Closed content exposed'; end if;
  begin perform public.submit_survey_response(v_context.survey, gen_random_uuid(), v_context.payload);
  exception when raise_exception then
    if sqlerrm <> 'SURVEY_NOT_ACTIVE' then raise; end if;
    v_denied := true;
  end;
  if not v_denied then raise exception 'Closed submission accepted'; end if;
  raise notice 'PASS: database smoke checks; fixtures roll back.';
end $$;
rollback;
