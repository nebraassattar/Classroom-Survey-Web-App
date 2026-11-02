begin;

-- Private authorization metadata is never exposed through the Data API.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create table private.instructors (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table private.instructors enable row level security;
-- Serialize instructor mutations; students only lock the survey they submit to.
create table private.mutation_lock (id boolean primary key default true check (id));
insert into private.mutation_lock values (true);
alter table private.mutation_lock enable row level security;

create function public.is_instructor() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from private.instructors where user_id = auth.uid());
$$;
revoke all on function public.is_instructor() from public, anon, authenticated;
grant execute on function public.is_instructor() to authenticated;

create table public.surveys (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(btrim(title)) between 1 and 200),
  description text check (length(description) <= 4000),
  status text not null default 'draft' check (status in ('draft','active','closed','archived')),
  public_slug text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status <> 'active' or public_slug is not null)
);
create unique index only_one_active_survey on public.surveys (status) where status = 'active';
create index surveys_created_at_idx on public.surveys(created_at desc);
create index surveys_status_idx on public.surveys(status);
create table public.questions (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references public.surveys(id) on delete cascade,
  question_text text not null check (length(btrim(question_text)) between 1 and 2000),
  question_type text not null check (question_type in ('multiple_choice','true_false')),
  position integer not null check (position > 0),
  created_at timestamptz not null default now(),
  unique(survey_id, position) deferrable initially deferred,
  unique(id, survey_id)
);
create table public.choices (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  choice_text text not null check (length(btrim(choice_text)) between 1 and 1000),
  position integer not null check (position > 0),
  created_at timestamptz not null default now(),
  unique(question_id, position) deferrable initially deferred,
  unique(id, question_id)
);
create table public.responses (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references public.surveys(id) on delete cascade,
  anonymous_token uuid not null,
  submitted_at timestamptz not null default now(),
  unique(survey_id, anonymous_token),
  unique(id, survey_id)
);
create index responses_submitted_at_idx on public.responses(submitted_at);
create table public.answers (
  id uuid primary key default gen_random_uuid(),
  response_id uuid not null,
  survey_id uuid not null,
  question_id uuid not null,
  choice_id uuid not null,
  text_answer text check (text_answer is null),
  created_at timestamptz not null default now(),
  unique(response_id, question_id),
  foreign key (response_id, survey_id) references public.responses(id, survey_id) on delete cascade,
  foreign key (question_id, survey_id) references public.questions(id, survey_id) on delete cascade,
  foreign key (choice_id, question_id) references public.choices(id, question_id) on delete cascade
);
create index answers_question_id_idx on public.answers(question_id);
create index answers_choice_id_idx on public.answers(choice_id);

create function private.touch_survey() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger surveys_updated_at before update on public.surveys
for each row execute function private.touch_survey();

alter table public.surveys enable row level security;
alter table public.questions enable row level security;
alter table public.choices enable row level security;
alter table public.responses enable row level security;
alter table public.answers enable row level security;

-- Reset Supabase default grants; writes are available only via guarded RPCs.
revoke all on public.surveys, public.questions, public.choices, public.responses, public.answers from public, anon, authenticated;
revoke all on private.instructors, private.mutation_lock from public, anon, authenticated;
revoke all on function private.touch_survey() from public, anon, authenticated;
grant select on public.surveys, public.questions, public.choices to anon, authenticated;
grant select on public.responses, public.answers to authenticated;

create policy public_active_surveys on public.surveys for select to anon, authenticated using (status = 'active');
create policy instructor_surveys on public.surveys for select to authenticated using ((select public.is_instructor()));
create policy public_active_questions on public.questions for select to anon, authenticated using (
  exists(select 1 from public.surveys s where s.id = survey_id and s.status = 'active')
);
create policy instructor_questions on public.questions for select to authenticated using ((select public.is_instructor()));
create policy public_active_choices on public.choices for select to anon, authenticated using (
  exists(select 1 from public.questions q join public.surveys s on s.id = q.survey_id where q.id = question_id and s.status = 'active')
);
create policy instructor_choices on public.choices for select to authenticated using ((select public.is_instructor()));
create policy instructor_responses on public.responses for select to authenticated using ((select public.is_instructor()));
create policy instructor_answers on public.answers for select to authenticated using ((select public.is_instructor()));

commit;
