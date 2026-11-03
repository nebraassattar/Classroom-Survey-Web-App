-- Read-only evidence queries. Run one SELECT at a time in Supabase SQL Editor.
-- Replace the survey UUID with the non-personal test survey used for screenshots.
-- Privileged SQL Editor reads demonstrate storage, not RLS authorization.
select tablename, rowsecurity as rls_enabled
from pg_tables
where schemaname = 'public'
  and tablename in ('surveys', 'questions', 'choices', 'responses', 'answers')
order by tablename;

select s.title, q.position, q.question_text
from public.surveys s
join public.questions q on q.survey_id = s.id
where s.id = '4e07512a-0ba5-4824-a0ad-1fcfe5920dc4'
order by q.position;

-- Deliberately omit anonymous_token and all Auth information.
select r.submitted_at, q.position as question, c.choice_text as answer
from public.responses r
join public.answers a on a.response_id = r.id
join public.questions q on q.id = a.question_id
join public.choices c on c.id = a.choice_id
where r.survey_id = '4e07512a-0ba5-4824-a0ad-1fcfe5920dc4'
order by r.submitted_at, q.position;
