begin;

-- STABLE functions use the calling statement's snapshot for every read.
-- Return IDs once and map choices in the browser, excluding browser tokens.
create function public.get_survey_export(p_survey_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_survey public.surveys; v_questions jsonb; v_responses jsonb;
begin
  if not public.is_instructor() then raise exception 'INSTRUCTOR_REQUIRED'; end if;
  select * into v_survey from public.surveys where id = p_survey_id;
  if not found then raise exception 'SURVEY_NOT_FOUND'; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', q.id, 'question_text', q.question_text, 'position', q.position,
    'choices', (select coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'choice_text', c.choice_text, 'position', c.position) order by c.position), '[]'::jsonb)
      from public.choices c where c.question_id = q.id)
  ) order by q.position), '[]'::jsonb)
  into v_questions from public.questions q where q.survey_id = p_survey_id;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', r.id, 'submitted_at', r.submitted_at,
    'answers', (select coalesce(jsonb_agg(jsonb_build_object('question_id', a.question_id, 'choice_id', a.choice_id) order by a.question_id), '[]'::jsonb)
      from public.answers a where a.response_id = r.id)
  ) order by r.submitted_at, r.id), '[]'::jsonb)
  into v_responses from public.responses r where r.survey_id = p_survey_id;
  return jsonb_build_object(
    'survey', jsonb_build_object('id', v_survey.id, 'title', v_survey.title, 'description', v_survey.description,
      'status', v_survey.status, 'created_at', v_survey.created_at, 'public_slug', v_survey.public_slug),
    'questions', v_questions, 'responses', v_responses
  );
end;
$$;
revoke all on function public.get_survey_export(uuid) from public, anon, authenticated;
grant execute on function public.get_survey_export(uuid) to authenticated;

commit;
