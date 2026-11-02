import { differenceInCalendarDays, parseISO, startOfToday } from 'date-fns';

// Default weights for the priority score. They add up to 1.
// Change these values to make the scheduler favour one factor over another.
export const DEFAULT_WEIGHTS = {
  urgency: 0.35,
  preparation: 0.3,
  difficulty: 0.2,
  chapters: 0.15,
};

// Lower preparation means a higher score, because the subject needs more work
const PREPARATION_SCORE = {
  'Not Started': 1,
  Beginner: 0.75,
  Intermediate: 0.45,
  'Well Prepared': 0.15,
};

const DIFFICULTY_SCORE = { Easy: 0.33, Medium: 0.66, Hard: 1 };

// Exams this many days away or further get the lowest urgency score
const URGENCY_HORIZON_DAYS = 60;

// Returns a map of subject id to priority score (roughly 0 to 1.2)
export function calculatePriorityScores(subjects, weights = DEFAULT_WEIGHTS) {
  const totalWeight = weights.urgency + weights.preparation + weights.difficulty + weights.chapters;
  const maxChapters = Math.max(1, ...subjects.map((s) => s.chapters_count));
  const today = startOfToday();
  const scores = {};

  for (const subject of subjects) {
    const daysLeft = Math.max(0, differenceInCalendarDays(parseISO(subject.exam_date), today));

    const urgency = 1 - Math.min(daysLeft, URGENCY_HORIZON_DAYS) / URGENCY_HORIZON_DAYS;
    const preparation = PREPARATION_SCORE[subject.preparation_level] ?? 1;
    const difficulty = DIFFICULTY_SCORE[subject.difficulty] ?? DIFFICULTY_SCORE.Medium;
    const chapters = subject.chapters_count / maxChapters;

    const base =
      (weights.urgency * urgency +
        weights.preparation * preparation +
        weights.difficulty * difficulty +
        weights.chapters * chapters) /
      totalWeight;

    // Personal priority scales the score from 0.8x (priority 1) to 1.2x (priority 5)
    const personalMultiplier = 0.8 + 0.4 * ((subject.priority - 1) / 4);

    scores[subject.id] = base * personalMultiplier;
  }

  return scores;
}