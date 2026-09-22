import { useEffect, useState } from 'react';

/** Re-renders every `ms` so "Today / Tomorrow" labels stay correct while the app is open. */
export function useNow(ms = 60_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}
