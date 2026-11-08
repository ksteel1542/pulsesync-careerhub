/**
 * Score a multiple-choice quiz.
 * @param {{ passMark: number, questions: { id, text, options, correct, points }[] }} quiz
 * @param {Record<string, 'A'|'B'|'C'|'D'>} answers  questionId -> chosen letter
 */
export function scoreQuiz(quiz, answers) {
  const breakdown = quiz.questions.map((q) => {
    const selected = answers[q.id] ?? null;
    return {
      id: q.id,
      text: q.text,
      options: q.options,
      selected,
      correct: q.correct,
      points: q.points,
      isCorrect: selected === q.correct,
    };
  });

  const totalPoints = breakdown.reduce((sum, b) => sum + b.points, 0);
  const earnedPoints = breakdown.reduce((sum, b) => sum + (b.isCorrect ? b.points : 0), 0);
  const percentage = totalPoints ? Math.round((earnedPoints / totalPoints) * 1000) / 10 : 0;
  const correctCount = breakdown.filter((b) => b.isCorrect).length;

  return {
    earnedPoints,
    totalPoints,
    percentage,
    passed: percentage >= quiz.passMark,
    correctCount,
    incorrectCount: breakdown.length - correctCount,
    breakdown,
  };
}
