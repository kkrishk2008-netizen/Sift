/* Run with:  npx tsx scripts/test-logic.ts  — exercises the pure logic without a device. */
import { localExtract, parseWhen } from '../src/services/ai/localExtractor';
import { normalizeItems, parseLooseJson } from '../src/services/ai/normalize';
import { DEMO_TEXTS, demoPoster, buildDemoTasks } from '../src/constants/demoData';
import { computePriority } from '../src/utils/priority';
import { formatWhen, formatDeadline } from '../src/utils/date';
import type { Source } from '../src/types';

const NOW = new Date(process.env.TEST_NOW ?? Date.now());
let failures = 0;
function check(name: string, cond: boolean, extra = '') {
  if (!cond) failures++;
  console.log(`${cond ? '  ✔' : '  ✘ FAIL'} ${name}${extra ? ` — ${extra}` : ''}`);
}
function run(label: string, text: string, source: Source) {
  const raw = localExtract(text, source, NOW);
  const items = normalizeItems(raw, { source, originalFallback: text, now: NOW });
  console.log(`\n■ ${label}  (now = ${NOW.toString().slice(0, 21)})`);
  for (const i of items) {
    console.log(
      `   [${i.type}/${i.priority}] ${i.title} | ${formatWhen(i, NOW) ?? 'no date'}` +
        `${i.deadline ? ` | deadline: ${formatDeadline(i, NOW)}` : ''}` +
        `${i.venue ? ` | @${i.venue}` : ''}${i.people.length ? ` | people: ${i.people.join(',')}` : ''}` +
        `${i.links.length ? ` | links: ${i.links.join(',')}` : ''}`,
    );
  }
  return items;
}

// ---- Scenario 2: voice
let it = run('Hinglish voice note', DEMO_TEXTS.voice, 'voice');
check('voice → 3 items', it.length === 3, String(it.length));
check('assignment: Submit assignment, tomorrow 17:00, high', /^Submit assignment/i.test(it[0]?.title ?? '') && it[0].time === '17:00' && it[0].priority === 'high');
check('PPT: Send PPT to Ravi (no date)', /Send PPT to Ravi/i.test(it[1]?.title ?? '') && it[1].date === null && it[1].priority === 'medium');
check('meeting: event on Friday', it[2]?.type === 'event' && it[2].date !== null);

// ---- Spec Hinglish with professor
it = run('Voice (professor version)', 'Kal 5 baje assignment submit karna hai, aur Rohit ko project ka PPT bhejna hai, aur Friday ko sir ke saath meeting hai.', 'voice');
check('3 items', it.length === 3);
check('Send project PPT to Rohit', /Send project PPT to Rohit/i.test(it[1]?.title ?? ''));
check('Meeting with professor', /Meeting with professor/i.test(it[2]?.title ?? ''));

// ---- Scenario 3: WhatsApp
it = run('WhatsApp chaos', DEMO_TEXTS.whatsapp, 'message');
check('whatsapp → 1 item', it.length === 1, String(it.length));
check('task on tomorrow 10:00, venue Seminar Hall, high', it[0]?.type === 'task' && it[0].time === '10:00' && /Seminar Hall/i.test(it[0].venue ?? '') && it[0].priority === 'high');
check('mentions ID card in description', /ID card/i.test(it[0]?.description ?? ''));

// ---- GDSC poster
it = run('GDSC text poster', DEMO_TEXTS.gdsc, 'image');
check('gdsc → 1 event', it.length === 1 && it[0].type === 'event');
check('title GDSC Workshop', /GDSC Workshop/i.test(it[0]?.title ?? ''), it[0]?.title);
check('16:00, Seminar Hall, has registration deadline', it[0]?.time === '16:00' && /Seminar Hall/i.test(it[0].venue ?? '') && !!it[0].deadline);

// ---- Scenario 1: hackathon poster
const poster = demoPoster(NOW);
it = run('Hackathon poster', poster.text, 'image');
check('poster → 1 event, 18:00, Innovation Lab, high', it.length === 1 && it[0].type === 'event' && it[0].time === '18:00' && /Innovation Lab/i.test(it[0].venue ?? '') && it[0].priority === 'high', `${it[0]?.priority}`);
check('poster deadline present', !!it[0]?.deadline);

// ---- Extra demos
it = run('Two tasks (DS assignment)', DEMO_TEXTS.hinglishTwo, 'message');
check('2 tasks', it.length === 2 && it.every((x) => x.type === 'task'));
check('Submit DS assignment', /Submit DS assignment/i.test(it[0]?.title ?? ''));
check('Send code to Ravi', /Send code to Ravi/i.test(it[1]?.title ?? ''));

it = run('Meeting moved + bring', DEMO_TEXTS.meeting, 'message');
check('event + task', it.length === 2 && it[0].type === 'event' && it[1].type === 'task');
check('event Monday 11:00', it[0]?.time === '11:00');
check('bring prototype inherits date/time', /Bring project prototype/i.test(it[1]?.title ?? '') && it[1].time === '11:00');

it = run('Malayalam', DEMO_TEXTS.malayalam, 'voice');
check('Project review event tomorrow', it.length === 1 && /Project review/i.test(it[0]?.title ?? '') && it[0].type === 'event');

it = run('Tamil/Telugu/Kannada cues', 'Naalai project review irukku. Repu lab record submit karna hai. nale exam ide', 'message');
check('3 items', it.length === 3, String(it.length));

it = run('Devanagari/Malayalam script date words', 'कल assignment submit karna hai\nനാളെ 5 മണി meeting', 'message');
check('parses कल', it.length >= 1 && it[0].date !== null);
check('Malayalam "5 മണി" → 17:00', it[1]?.time === '17:00', `${it[1]?.title} ${it[1]?.time}`);

it = run('Explicit date + link', 'Submit the scholarship form by 25/12 5 pm https://scholarships.gov.in/apply. It is urgent', 'message');
check('date parsed & link captured', it.length >= 1 && it[0].date?.endsWith('-12-25') === true);
check('trailing "It is urgent" is not its own item and raises priority', it.length === 1 && ['medium','high','urgent'].includes(it[0].priority), `${it.length} items, ${it[0]?.priority}`);

it = run('No dates at all', 'buy milk', 'manual');
check('undated → medium/low', it.length === 1 && ['low', 'medium'].includes(it[0].priority));

// ---- parseWhen edge cases
const w1 = parseWhen('meeting at 5', NOW);
check('"at 5" → 17:00', w1.time === '17:00');
const w2 = parseWhen('shaam ko 7 baje', NOW);
check('"shaam ko 7 baje" → 19:00', w2.time === '19:00');
const w3 = parseWhen('subah 9 baje', NOW);
check('"subah 9 baje" → 09:00', w3.time === '09:00');
const w4 = parseWhen('class at 12:30 pm', NOW);
check('"12:30 pm" → 12:30', w4.time === '12:30');
const w5 = parseWhen('submit on 2026-11-02', NOW);
check('ISO date', w5.date?.getMonth() === 10 && w5.date?.getDate() === 2);

// ---- priority engine
const P = (d: string | null, t: string | null, text = '', type: 'task' | 'event' | 'note' = 'task') =>
  computePriority({ type, date: d, time: t, deadline: null, text, now: new Date(2026, 8, 19, 10, 0) });
check('today 17:00 no words → high (7h left)', P('2026-09-19', '17:00') === 'high');
check('today + urgent word → urgent', P('2026-09-19', '17:00', 'urgent') === 'urgent');
check('today in 2h → urgent', P('2026-09-19', '12:00') === 'urgent');
check('tomorrow → high', P('2026-09-20', '10:00') === 'high');
check('4 days → medium', P('2026-09-23', null) === 'medium');
check('4 days + registration → high', P('2026-09-23', null, 'registration closes') === 'high');
check('30 days → low', P('2026-10-20', null) === 'low');
check('overdue task → urgent', P('2026-09-15', null) === 'urgent');
check('past event → low', P('2026-09-15', null, '', 'event') === 'low');
check('no date task → medium', P(null, null) === 'medium');
check('no date note → low', P(null, null, '', 'note') === 'low');

// ---- normalizer robustness
check('malformed JSON text throws', (() => { try { parseLooseJson('not json at all'); return false; } catch { return true; } })());
check('fenced JSON parses', (parseLooseJson('```json\n{"items":[{"title":"x"}]}\n```') as any).items.length === 1);
check('garbage items throw no_actions', (() => { try { normalizeItems({ items: [{ nope: 1 }] }, { source: 'message', originalFallback: '' }); return false; } catch (e: any) { return e.code === 'no_actions'; } })());
check('bad date/time coerced to null', (() => { const r = normalizeItems({ items: [{ title: 'A', date: '2026-13-45', time: '99:99', type: 'weird' }] }, { source: 'voice', originalFallback: 'x' }); return r[0].date === null && r[0].time === null && r[0].type === 'task'; })());

// ---- demo seed
const seed = buildDemoTasks(NOW, null);
check('demo seed has urgent + today + upcoming', seed.some((t) => t.priority === 'urgent') && seed.length >= 6);

console.log(failures ? `\n${failures} check(s) FAILED` : '\nAll checks passed ✔');
process.exit(failures ? 1 : 0);
