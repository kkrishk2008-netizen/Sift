import type { Priority, Task } from '../types';
import { addDays, formatTime, MONTH_LONG, pad2, toYMD } from '../utils/date';
import { uuid } from '../utils/id';

/** Sample inputs for the three hackathon scenarios (and a few extras). */
export const DEMO_TEXTS = {
  // Scenario 3: chaotic WhatsApp message
  whatsapp:
    'Guys reminder!!!\nTomorrow 10 AM everyone submit the project report.\nAlso bring your ID card.\nVenue: Seminar Hall.',
  // Scenario 2: messy Hinglish voice note (also the offline "transcript")
  voice: 'Kal 5 baje assignment submit karna hai, Ravi ko PPT bhejna hai, aur Friday ko project meeting hai.',
  gdsc: 'Google Developer Student Club workshop\nFriday, 4 PM\nSeminar Hall\nRegister before Thursday',
  hinglishTwo: 'Kal 5 baje DS assignment submit karna hai.\nRavi ko code bhi bhejna hai.',
  meeting: 'Team meeting moved to Monday 11 AM.\nBring project prototype.',
  malayalam: 'Naale project review undu',
} as const;

/** Scenario 1: the hackathon poster. Dates are relative to "now" so the demo never goes stale. */
export function demoPoster(now: Date): { text: string; dayLabel: string; time: string } {
  const d = addDays(now, 6);
  const dayLabel = `${d.getDate()} ${MONTH_LONG[d.getMonth()]}`;
  return {
    dayLabel,
    time: '6 PM',
    text: `Hackathon 2026\nRegistration closes ${dayLabel}\nVenue: Innovation Lab\n6 PM`,
  };
}

interface SeedInput {
  type: Task['type'];
  title: string;
  description: string;
  date: Date;
  time: string;
  deadline?: boolean;
  venue?: string | null;
  priority: Priority;
  source: Task['source'];
  people?: string[];
  links?: string[];
  original: string;
}

/** A realistic, always-fresh inbox: URGENT / TODAY / UPCOMING all populated. */
export function buildDemoTasks(now: Date, userId: string | null): Task[] {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const h = now.getHours();
  const dueTime = h < 15 ? '17:00' : h < 22 ? '23:00' : '23:59';
  const meetingTime = h < 12 ? '14:30' : h < 21 ? '21:30' : '23:30';

  const seeds: SeedInput[] = [
    {
      type: 'task', title: 'Submit AI Lab Record', priority: 'urgent', source: 'message',
      description: 'Bring the signed record to Lab 204.', date: today, time: dueTime, deadline: true,
      venue: 'Lab 204', people: ['Anitha Ma’am'],
      original: 'AI lab record submission today by 5. Bring the signed record to Lab 204.',
    },
    {
      type: 'task', title: 'Register for Hackathon 2026', priority: 'urgent', source: 'image',
      description: 'Registration closes today. Team of 3–4, ID card mandatory.', date: today, time: '23:59', deadline: true,
      venue: 'Innovation Lab', links: ['https://hack2026.example.in/register'],
      original: 'Hackathon 2026 — registration closes today',
    },
    {
      type: 'event', title: 'Team meeting', priority: 'high', source: 'message',
      description: 'Bring the project prototype.', date: today, time: meetingTime,
      venue: 'Project Room', people: ['Rohit', 'Meera'],
      original: 'Team meeting today. Bring project prototype.',
    },
    {
      type: 'task', title: 'Send project PPT to Rohit', priority: 'high', source: 'voice',
      description: 'Rohit ko project ka PPT bhejna hai.', date: today, time: '23:59', deadline: true, people: ['Rohit'],
      original: 'Rohit ko project ka PPT bhejna hai',
    },
    {
      type: 'event', title: 'Project review', priority: 'medium', source: 'voice',
      description: 'Naale project review undu (Malayalam). Final demo walkthrough.', date: addDays(today, 3), time: '10:00',
      venue: 'Seminar Hall', people: ['Professor'],
      original: 'Friday ko sir ke saath project review hai',
    },
    {
      type: 'event', title: 'GDSC Workshop', priority: 'high', source: 'image',
      description: 'Register before the day prior. Laptop required.', date: addDays(today, 5), time: '16:00', deadline: false,
      venue: 'Seminar Hall', people: [],
      original: 'Google Developer Student Club workshop\nFriday, 4 PM\nSeminar Hall\nRegister before Thursday',
    },
    {
      type: 'note', title: 'Club event brainstorm', priority: 'low', source: 'message',
      description: 'Ideas: open-mic night, code-golf contest, alumni Q&A.', date: addDays(today, 8), time: '17:30',
      people: ['Kavya'], original: 'club event ideas — open mic, code golf, alumni Q&A',
    },
  ];

  const stamp = now.toISOString();
  return seeds.map((s, i) => {
    const ymd = toYMD(s.date);
    const deadlineIso = s.deadline
      ? (() => {
          const [hh, mm] = s.time.split(':').map(Number);
          const d = new Date(s.date);
          d.setHours(hh, mm, 0, 0);
          return d.toISOString();
        })()
      : null;
    return {
      id: uuid(),
      user_id: userId,
      type: s.type,
      title: s.title,
      description: s.description,
      date: ymd,
      time: `${pad2(+s.time.split(':')[0])}:${pad2(+s.time.split(':')[1])}`,
      deadline: deadlineIso,
      venue: s.venue ?? null,
      priority: s.priority,
      status: 'open' as const,
      source: s.source,
      original_text: s.original,
      people: s.people ?? [],
      links: s.links ?? [],
      confidence: 0.9,
      created_at: new Date(now.getTime() - (seeds.length - i) * 60_000).toISOString(),
      updated_at: stamp,
      calendar_event_id: null,
    };
  });
}

export const formatSeedTime = formatTime;
