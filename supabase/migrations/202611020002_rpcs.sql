begin;

create function private.authorize_mutation() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_instructor() then raise exception 'INSTRUCTOR_REQUIRED'; end if;
  perform 1 from private.mutation_lock where id for update;
end;
$$;

-- Whole-draft replacement is atomic. IDs can change while drafting; submitted
-- surveys can never enter this path. Positions come from array order.
create function public.save_survey_draft(p_survey_id uuid, p_title text, p_description text, p_questions jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid := p_survey_id; v_question jsonb; v_choice jsonb;
  v_qid uuid; v_position integer := 0; v_cposition integer; v_status text;
begin
  perform private.authorize_mutation();
  if jsonb_typeof(p_questions) is distinct from 'array' then raise exception 'INVALID_QUESTIONS'; end if;
  if jsonb_array_length(p_questions) > 100 then raise exception 'TOO_MANY_QUESTIONS'; end if;
  if v_id is null then
    insert into public.surveys(title, description) values (p_title, p_description) returning id into v_id;
  else
    select status into v_status from public.surveys where id = v_id for update;
    if not found then raise exception 'SURVEY_NOT_FOUND'; end if;
    if v_status <> 'draft' or exists(select 1 from public.responses where survey_id = v_id) then raise exception 'SURVEY_NOT_EDITABLE'; end if;
    update public.surveys set title = p_title, description = p_description where id = v_id;
    delete from public.questions where survey_id = v_id;
  end if;
  for v_question in select value from jsonb_array_elements(p_questions) loop
    v_position := v_position + 1;
    insert into public.questions(survey_id, question_text, question_type, position)
    values (v_id, v_question->>'question_text', v_question->>'question_type', v_position) returning id into v_qid;
    if jsonb_typeof(v_question->'choices') is distinct from 'array' then raise exception 'INVALID_CHOICES'; end if;
    if jsonb_array_length(v_question->'choices') not between 2 and 20 then raise exception 'INVALID_CHOICES'; end if;
    if v_question->>'question_type' = 'true_false' and v_question->'choices' <> '["True","False"]'::jsonb then raise exception 'INVALID_TRUE_FALSE'; end if;
    v_cposition := 0;
    for v_choice in select value from jsonb_array_elements(v_question->'choices') loop
      if jsonb_typeof(v_choice) <> 'string' then raise exception 'INVALID_CHOICE'; end if;
      v_cposition := v_cposition + 1;
      insert into public.choices(question_id, choice_text, position) values (v_qid, v_choice #>> '{}', v_cposition);
    end loop;
  end loop;
  return v_id;
end;
$$;

create function public.activate_survey(p_survey_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_survey public.surveys;
begin
  perform private.authorize_mutation();
  select * into v_survey from public.surveys where id = p_survey_id for update;
  if not found then raise exception 'SURVEY_NOT_FOUND'; end if;
  if v_survey.status not in ('draft','active') then raise exception 'INVALID_SURVEY_STATE'; end if;
  if not exists(select 1 from public.questions where survey_id = p_survey_id) then raise exception 'SURVEY_HAS_NO_QUESTIONS'; end if;
  if exists(select 1 from public.questions q where q.survey_id = p_survey_id and
    (select count(*) from public.choices c where c.question_id = q.id) < 2) then raise exception 'INVALID_CHOICES'; end if;
  -- All instructor mutations acquire the singleton lock first. Active submissions
  -- hold a shared survey-row lock; this update waits for them before closing.
  update public.surveys set status = 'closed' where status = 'active' and id <> p_survey_id;
  update public.surveys set status = 'active', public_slug = coalesce(public_slug, gen_random_uuid()::text)
  where id = p_survey_id returning * into v_survey;
  return jsonb_build_object('id', v_survey.id, 'status', v_survey.status, 'public_slug', v_survey.public_slug);
end;
$$;

create function public.close_survey(p_survey_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.authorize_mutation();
  update public.surveys set status = 'closed' where id = p_survey_id and status = 'active';
  if not found then raise exception 'SURVEY_NOT_ACTIVE'; end if;
end;
$$;

create function public.archive_survey(p_survey_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.authorize_mutation();
  update public.surveys set status = 'archived' where id = p_survey_id and status in ('draft','closed');
  if not found then raise exception 'INVALID_SURVEY_STATE'; end if;
end;
$$;

create function public.delete_survey(p_survey_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.authorize_mutation();
  delete from public.surveys where id = p_survey_id and status <> 'active';
  if not found then raise exception 'INVALID_SURVEY_STATE'; end if;
end;
$$;

create function public.duplicate_survey(p_survey_id uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_survey public.surveys; v_questions jsonb;
begin
  perform private.authorize_mutation();
  select * into v_survey from public.surveys where id = p_survey_id;
  if not found then raise exception 'SURVEY_NOT_FOUND'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('question_text', q.question_text, 'question_type', q.question_type,
    'choices', (select jsonb_agg(c.choice_text order by c.position) from public.choices c where c.question_id = q.id)) order by q.position), '[]'::jsonb)
  into v_questions from public.questions q where q.survey_id = p_survey_id;
  return public.save_survey_draft(null, left('Copy of ' || v_survey.title, 200), v_survey.description, v_questions);
end;
$$;

create function public.get_public_survey(p_slug text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_survey public.surveys; v_questions jsonb;
begin
  select * into v_survey from public.surveys where public_slug = p_slug;
  if not found then return jsonb_build_object('state', 'not_found'); end if;
  if v_survey.status <> 'active' then return jsonb_build_object('state', 'closed'); end if;
  select jsonb_agg(jsonb_build_object('id', q.id, 'question_text', q.question_text, 'question_type', q.question_type, 'position', q.position,
    'choices', (select jsonb_agg(jsonb_build_object('id', c.id, 'choice_text', c.choice_text, 'position', c.position) order by c.position) from public.choices c where c.question_id = q.id)) order by q.position)
  into v_questions from public.questions q where q.survey_id = v_survey.id;
  return jsonb_build_object('state', 'active', 'survey', jsonb_build_object('id', v_survey.id, 'title', v_survey.title, 'description', v_survey.description), 'questions', v_questions);
end;
$$;

create function public.submit_survey_response(p_survey_id uuid, p_anonymous_token uuid, p_answers jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_status text; v_response uuid; v_answer jsonb; v_question uuid; v_choice uuid; v_count integer;
begin
  -- Shared locks allow concurrent students but conflict with close/activation/delete.
  select status into v_status from public.surveys where id = p_survey_id for share;
  if not found or v_status <> 'active' then raise exception 'SURVEY_NOT_ACTIVE'; end if;
  if p_anonymous_token is null then raise exception 'INVALID_TOKEN'; end if;
  if jsonb_typeof(p_answers) is distinct from 'array' then raise exception 'INVALID_ANSWERS'; end if;
  select count(*) into v_count from public.questions where survey_id = p_survey_id;
  if v_count = 0 or jsonb_array_length(p_answers) <> v_count then raise exception 'MISSING_REQUIRED_ANSWER'; end if;
  if exists(select 1 from public.responses where survey_id = p_survey_id and anonymous_token = p_anonymous_token) then raise exception 'DUPLICATE_RESPONSE'; end if;
  insert into public.responses(survey_id, anonymous_token) values(p_survey_id, p_anonymous_token) returning id into v_response;
  for v_answer in select value from jsonb_array_elements(p_answers) loop
    if jsonb_typeof(v_answer) <> 'object' then raise exception 'INVALID_ANSWER'; end if;
    begin
      v_question := (v_answer->>'question_id')::uuid;
      v_choice := (v_answer->>'choice_id')::uuid;
    exception when invalid_text_representation then raise exception 'INVALID_ANSWER'; end;
    if not exists(select 1 from public.questions where id = v_question and survey_id = p_survey_id) then raise exception 'INVALID_QUESTION'; end if;
    if not exists(select 1 from public.choices where id = v_choice and question_id = v_question) then raise exception 'INVALID_CHOICE'; end if;
    if exists(select 1 from public.answers where response_id = v_response and question_id = v_question) then raise exception 'DUPLICATE_QUESTION'; end if;
    insert into public.answers(response_id, survey_id, question_id, choice_id) values(v_response, p_survey_id, v_question, v_choice);
  end loop;
  return jsonb_build_object('success', true, 'response_id', v_response);
exception when unique_violation then raise exception 'DUPLICATE_RESPONSE';
end;
$$;

create function public.get_survey_results(p_survey_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_total bigint; v_questions jsonb;
begin
  if not public.is_instructor() then raise exception 'INSTRUCTOR_REQUIRED'; end if;
  if not exists(select 1 from public.surveys where id = p_survey_id) then raise exception 'SURVEY_NOT_FOUND'; end if;
  select count(*) into v_total from public.responses where survey_id = p_survey_id;
  select coalesce(jsonb_agg(jsonb_build_object('question_id', q.id, 'question_text', q.question_text, 'position', q.position,
    'response_count', (select count(*) from public.answers a where a.question_id = q.id),
    'choices', (select jsonb_agg(jsonb_build_object('choice_id', c.id, 'choice_text', c.choice_text, 'position', c.position,
      'count', (select count(*) from public.answers a where a.choice_id = c.id),
      'percentage', case when v_total = 0 then 0 else round(100.0 * (select count(*) from public.answers a where a.choice_id = c.id) / v_total, 1) end)
      order by c.position) from public.choices c where c.question_id = q.id)) order by q.position), '[]'::jsonb)
  into v_questions from public.questions q where q.survey_id = p_survey_id;
  return jsonb_build_object('survey_id', p_survey_id, 'response_count', v_total, 'questions', v_questions);
end;
$$;

revoke all on function private.authorize_mutation() from public, anon, authenticated;
revoke all on function public.save_survey_draft(uuid,text,text,jsonb), public.activate_survey(uuid), public.close_survey(uuid),
 public.archive_survey(uuid), public.delete_survey(uuid), public.duplicate_survey(uuid), public.get_survey_results(uuid),
 public.get_public_survey(text), public.submit_survey_response(uuid,uuid,jsonb) from public, anon, authenticated;
grant execute on function public.save_survey_draft(uuid,text,text,jsonb), public.activate_survey(uuid), public.close_survey(uuid),
 public.archive_survey(uuid), public.delete_survey(uuid), public.duplicate_survey(uuid), public.get_survey_results(uuid) to authenticated;
grant execute on function public.get_public_survey(text), public.submit_survey_response(uuid,uuid,jsonb) to anon, authenticated;

commit;
