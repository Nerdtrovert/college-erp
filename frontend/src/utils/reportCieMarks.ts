export const formatCieMarkOutOf50 = (
  score: number | null | undefined,
  maxScore: number | null | undefined,
): string => {
  if (score === null || score === undefined || maxScore === null || maxScore === undefined || maxScore <= 0) {
    return '-';
  }

  return ((score / maxScore) * 50).toFixed(1);
};

export const getCieMarkColorClass = (score: string): string => {
  const numericScore = Number(score);
  if (!Number.isFinite(numericScore)) {
    return 'bg-gray-100 text-gray-600';
  }

  if (numericScore > 35) {
    return 'bg-green-100 text-green-800';
  }

  if (numericScore >= 21) {
    return 'bg-yellow-100 text-yellow-800';
  }

  return 'bg-red-100 text-red-800';
};
