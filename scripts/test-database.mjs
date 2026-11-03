import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { PGlite } from '@electric-sql/pglite'

// Real embedded PostgreSQL. Auth fixtures model Supabase's roles/auth.uid();
// they do not test Supabase Auth, PostgREST, network access or concurrent sessions.
const db = new PGlite()
const instructor = randomUUID()
const outsider = randomUUID()
let checks = 0
const sql = (query, params = []) => db.query(query, params)
const value = async (query, params = []) =>
  (await sql(query, params)).rows[0].value
async function expectError(query, params, message) {
  await assert.rejects(() => sql(query, params), message)
  checks++
}
async function role(name, user = '') {
  await db.exec('reset role')
  await sql("select set_config('request.jwt.claim.sub', $1, false)", [user])
  await db.exec(`set role ${name}`)
}
const questions = [
  {
    question_text: 'Select one',
    question_type: 'multiple_choice',
    choices: ['First', 'Second'],
  },
  {
    question_text: 'Is this true?',
    question_type: 'true_false',
    choices: ['True', 'False'],
  },
]
async function save(title = 'Database test', qs = questions, id = null) {
  return value('select public.save_survey_draft($1,$2,$3,$4::jsonb) as value', [
    id,
    title,
    'Test fixture',
    JSON.stringify(qs),
  ])
}
const activate = (id) =>
  value('select public.activate_survey($1) as value', [id])
const readPublic = (slug) =>
  value('select public.get_public_survey($1) as value', [slug])
const submitSql =
  'select public.submit_survey_response($1,$2,$3::jsonb) as value'
const submit = (id, token, answers) =>
  value(submitSql, [id, token, JSON.stringify(answers)])
const results = (id) =>
  value('select public.get_survey_results($1) as value', [id])
const answerPayload = (survey) =>
  survey.questions.map((q) => ({
    question_id: q.id,
    choice_id: q.choices[0].id,
  }))

try {
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    grant usage on schema public to anon, authenticated;
    create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
  `)
  const migrationDir = new URL('../supabase/migrations/', import.meta.url)
  for (const file of (await readdir(migrationDir))
    .filter((name) => name.endsWith('.sql'))
    .sort()) {
    await db.exec(await readFile(new URL(file, migrationDir), 'utf8'))
    console.log(`Applied ${file}`)
  }
  await sql('insert into auth.users values ($1),($2)', [instructor, outsider])
  await sql('insert into private.instructors(user_id) values ($1)', [
    instructor,
  ])
  await role('authenticated', instructor)
  assert.equal(await value('select public.is_instructor() as value'), true)
  checks++
  const first = await save()
  const second = await save('Second survey')
  const empty = await save('Empty draft', [])
  const originalIds = (
    await sql(
      'select id from public.questions where survey_id=$1 order by position',
      [first],
    )
  ).rows
  await save('Reordered draft', [questions[1], questions[0]], first)
  assert.deepEqual(
    (
      await sql(
        'select question_type,position from public.questions where survey_id=$1 order by position',
        [first],
      )
    ).rows,
    [
      { question_type: 'true_false', position: 1 },
      { question_type: 'multiple_choice', position: 2 },
    ],
  )
  checks++
  assert.notDeepEqual(
    (
      await sql(
        'select id from public.questions where survey_id=$1 order by position',
        [first],
      )
    ).rows,
    originalIds,
  )
  checks++
  await expectError(
    'select public.save_survey_draft($1,$2,null,$3)',
    [
      first,
      'Must roll back',
      JSON.stringify([
        questions[0],
        { ...questions[1], choices: ['Yes', 'No'] },
      ]),
    ],
    /INVALID_TRUE_FALSE/,
  )
  assert.equal(
    await value('select title as value from public.surveys where id=$1', [
      first,
    ]),
    'Reordered draft',
  )
  checks++
  assert.deepEqual(
    (
      await sql(
        'select question_type,position from public.questions where survey_id=$1 order by position',
        [first],
      )
    ).rows,
    [
      { question_type: 'true_false', position: 1 },
      { question_type: 'multiple_choice', position: 2 },
    ],
  )
  checks++
  await save('Database test', questions, first)
  assert.equal(
    await value('select count(*)::int as value from public.surveys'),
    3,
  )
  checks++
  await expectError(
    'select public.activate_survey($1)',
    [empty],
    /SURVEY_HAS_NO_QUESTIONS/,
  )
  const active = await activate(first)
  const published = await readPublic(active.public_slug)
  assert.equal(published.questions.length, 2)
  checks++
  assert.deepEqual(
    published.questions.map((q) => q.position),
    [1, 2],
  )
  checks++
  assert.deepEqual(
    published.questions[1].choices.map((c) => c.choice_text),
    ['True', 'False'],
  )
  checks++
  assert.equal((await results(first)).response_count, 0)
  checks++
  await expectError(
    'select public.save_survey_draft($1,$2,$3,$4)',
    [first, 'Edit active', null, '[]'],
    /SURVEY_NOT_EDITABLE/,
  )
  await expectError(
    'select public.save_survey_draft(null,$1,null,$2)',
    ['Bad TF', JSON.stringify([{ ...questions[1], choices: ['Yes', 'No'] }])],
    /INVALID_TRUE_FALSE/,
  )
  assert.equal(
    await value('select count(*)::int as value from public.surveys'),
    3,
  )
  checks++

  await role('anon')
  assert.equal(
    await value('select count(*)::int as value from public.surveys'),
    1,
  )
  checks++
  assert.equal(
    await value('select count(*)::int as value from public.questions'),
    2,
  )
  checks++
  assert.equal(
    await value('select count(*)::int as value from public.choices'),
    4,
  )
  checks++
  for (const table of ['responses', 'answers'])
    await expectError(`select * from public.${table}`, [], /permission denied/)
  for (const table of [
    'surveys',
    'questions',
    'choices',
    'responses',
    'answers',
  ]) {
    await expectError(`delete from public.${table}`, [], /permission denied/)
    await expectError(
      `insert into public.${table} default values`,
      [],
      /permission denied/,
    )
    await expectError(
      `update public.${table} set id = id`,
      [],
      /permission denied/,
    )
  }
  await expectError(
    'select public.activate_survey($1)',
    [second],
    /permission denied/,
  )
  await expectError(
    'select public.get_survey_results($1)',
    [first],
    /permission denied/,
  )
  await expectError(
    'select * from private.instructors',
    [],
    /permission denied/,
  )
  const payload = answerPayload(published)
  const token = randomUUID()
  assert.equal((await submit(first, token, payload)).success, true)
  checks++
  await expectError(
    submitSql,
    [first, token, JSON.stringify(payload)],
    /DUPLICATE_RESPONSE/,
  )
  await expectError(
    submitSql,
    [first, null, JSON.stringify(payload)],
    /INVALID_TOKEN/,
  )
  await expectError(submitSql, [first, randomUUID(), '{}'], /INVALID_ANSWERS/)
  await expectError(
    submitSql,
    [first, randomUUID(), '[]'],
    /MISSING_REQUIRED_ANSWER/,
  )
  await expectError(
    submitSql,
    [first, randomUUID(), JSON.stringify([...payload, payload[0]])],
    /MISSING_REQUIRED_ANSWER/,
  )
  await expectError(
    submitSql,
    [first, randomUUID(), JSON.stringify([payload[0], payload[0]])],
    /DUPLICATE_QUESTION/,
  )
  await expectError(
    submitSql,
    [
      first,
      randomUUID(),
      JSON.stringify([
        payload[0],
        { ...payload[1], question_id: randomUUID() },
      ]),
    ],
    /INVALID_QUESTION/,
  )
  await expectError(
    submitSql,
    [
      first,
      randomUUID(),
      JSON.stringify([
        payload[0],
        { ...payload[1], choice_id: payload[0].choice_id },
      ]),
    ],
    /INVALID_CHOICE/,
  )
  await expectError(
    submitSql,
    [
      first,
      randomUUID(),
      JSON.stringify([payload[0], { ...payload[1], choice_id: 'bad' }]),
    ],
    /INVALID_ANSWER/,
  )
  await expectError(
    submitSql,
    [first, randomUUID(), JSON.stringify([payload[0], null])],
    /INVALID_ANSWER/,
  )
  assert.deepEqual(await readPublic('unknown'), { state: 'not_found' })
  checks++

  await role('authenticated', outsider)
  assert.equal(await value('select public.is_instructor() as value'), false)
  checks++
  assert.equal(
    await value('select count(*)::int as value from public.responses'),
    0,
  )
  checks++
  assert.equal(
    await value('select count(*)::int as value from public.answers'),
    0,
  )
  checks++
  for (const rpc of [
    'activate_survey',
    'close_survey',
    'archive_survey',
    'delete_survey',
    'duplicate_survey',
    'get_survey_results',
  ]) {
    await expectError(
      `select public.${rpc}($1)`,
      [first],
      /INSTRUCTOR_REQUIRED/,
    )
  }
  await expectError(
    'select public.save_survey_draft(null,$1,null,$2)',
    ['Unauthorized', '[]'],
    /INSTRUCTOR_REQUIRED/,
  )
  await expectError(
    'insert into private.instructors(user_id) values ($1)',
    [outsider],
    /permission denied/,
  )
  await expectError(
    'update public.surveys set title = $1 where id = $2',
    ['Tampered', first],
    /permission denied/,
  )

  await role('authenticated', instructor)
  const result = await results(first)
  assert.equal(result.response_count, 1)
  checks++
  assert.equal(
    await value('select count(*)::int as value from public.answers'),
    2,
  )
  checks++
  assert.deepEqual(
    result.questions[0].choices.map((c) => [c.count, c.percentage]),
    [
      [1, 100],
      [0, 0],
    ],
  )
  checks++
  const copy = await value('select public.duplicate_survey($1) as value', [
    first,
  ])
  assert.equal((await results(copy)).response_count, 0)
  checks++
  assert.equal(
    await value(
      'select count(*)::int as value from public.questions where survey_id=$1',
      [copy],
    ),
    2,
  )
  checks++
  const next = await activate(second)
  assert.equal(
    await value(
      "select count(*)::int as value from public.surveys where status='active'",
    ),
    1,
  )
  checks++
  assert.equal(
    await value('select status as value from public.surveys where id=$1', [
      first,
    ]),
    'closed',
  )
  checks++
  await expectError(
    'select public.save_survey_draft($1,$2,null,$3)',
    [first, 'Historical edit', '[]'],
    /SURVEY_NOT_EDITABLE/,
  )
  await expectError(
    'select public.activate_survey($1)',
    [first],
    /INVALID_SURVEY_STATE/,
  )
  await sql('select public.archive_survey($1)', [first])
  assert.equal((await results(first)).response_count, 1)
  checks++
  await sql('select public.close_survey($1)', [second])
  await role('anon')
  assert.deepEqual(await readPublic(active.public_slug), { state: 'closed' })
  checks++
  assert.deepEqual(await readPublic(next.public_slug), { state: 'closed' })
  checks++
  await expectError(
    submitSql,
    [first, randomUUID(), JSON.stringify(payload)],
    /SURVEY_NOT_ACTIVE/,
  )
  assert.equal(
    await value('select count(*)::int as value from public.questions'),
    0,
  )
  checks++
  await role('authenticated', instructor)
  await sql('select public.delete_survey($1)', [first])
  assert.equal(
    await value('select count(*)::int as value from public.responses'),
    0,
  )
  checks++
  assert.equal(
    await value('select count(*)::int as value from public.answers'),
    0,
  )
  checks++

  // Privileged fixture checks demonstrate constraints independent of RPC guards.
  await role('postgres')
  await sql(
    "update public.surveys set status='active', public_slug=gen_random_uuid()::text where id=$1",
    [second],
  )
  await expectError(
    "update public.surveys set status='active', public_slug=gen_random_uuid()::text where id=$1",
    [copy],
    /only_one_active_survey/,
  )
  await expectError(
    "insert into public.questions(survey_id,question_text,question_type,position) values($1,'x','multiple_choice',0)",
    [copy],
    /check constraint/,
  )
  const responseId = await value(
    'insert into public.responses(survey_id,anonymous_token) values($1,$2) returning id as value',
    [second, randomUUID()],
  )
  const wrongQuestion = await value(
    'select id as value from public.questions where survey_id=$1 limit 1',
    [copy],
  )
  const wrongChoice = await value(
    'select id as value from public.choices where question_id=$1 limit 1',
    [wrongQuestion],
  )
  await expectError(
    'insert into public.answers(response_id,survey_id,question_id,choice_id) values($1,$2,$3,$4)',
    [responseId, second, wrongQuestion, wrongChoice],
    /foreign key constraint/,
  )
  const beforeSmoke = (
    await sql('select id,status from public.surveys order by id')
  ).rows
  await db.exec(
    await readFile(
      new URL('../supabase/tests/hosted-smoke.sql', import.meta.url),
      'utf8',
    ),
  )
  assert.deepEqual(
    (await sql('select id,status from public.surveys order by id')).rows,
    beforeSmoke,
  )
  checks++
  console.log(
    'Hosted smoke script also executes and rolls back successfully in embedded PostgreSQL.',
  )
  console.log(
    `PASS: ${checks} database assertions (embedded PostgreSQL). Hosted Auth/API and concurrent-session verification remain pending.`,
  )
} finally {
  await db.close()
}
