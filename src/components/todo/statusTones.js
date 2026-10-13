// Durum renkleri — tepsi ve çekmece (`TodoStatusTiles`) ile KPI çubuğu (`TodoKpiBar`) aynı tonu taşır.
// Bileşen dosyasından sabit ihraç edilmez (fast refresh), bu yüzden ayrı modül.
export const STATUS_TONES = {
  overdue: {
    chip: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    value: "text-amber-600 dark:text-amber-400",
  },
  important: { chip: "bg-brand/10 text-brand", value: "text-foreground" },
  planned: { chip: "bg-sky-500/15 text-sky-600 dark:text-sky-400", value: "text-foreground" },
  done: {
    chip: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    value: "text-foreground",
  },
}

/** İleri tarihli açık işler, en yakını önce (Planlanan). */
export function plannedTasks(tasks, today) {
  return tasks
    .filter((x) => !x.done && x.dueKey && x.dueKey > today)
    .sort((a, b) => (a.dueKey < b.dueKey ? -1 : 1))
}
