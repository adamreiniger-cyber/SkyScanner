/** The redesign's priority screens, in priority order (see CLAUDE.md). */
export const SCREENS = [
  { id: 'targets', label: 'Targets', blurb: 'Tonight’s best targets and the details for each one.' },
  { id: 'location', label: 'Location', blurb: 'Where you’re observing from.' },
  { id: 'sky', label: 'Sky', blurb: 'Sky brightness, moonlight and date & time.' },
  { id: 'equipment', label: 'Equipment', blurb: 'Your telescope, binoculars and filters.' },
] as const

export type ScreenId = (typeof SCREENS)[number]['id']
