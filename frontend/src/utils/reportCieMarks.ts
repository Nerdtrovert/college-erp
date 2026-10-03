export const formatCieMarkOutOf50 = (
  score: number | null | undefined,
  maxScore: number | null | undefined,
): string => {
  if (score === null || score === undefined || maxScore === null || maxScore === undefined || maxScore <= 0) {
    return '-';
  }

  return ((score / maxScore) * 50).toFixed(1);
};
