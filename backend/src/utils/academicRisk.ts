type RiskSubjectType = 'STANDALONE' | 'INTEGRATED';

export const isSubjectAtRisk = (
  subjectType: RiskSubjectType,
  bestCieAverage: number | null,
  labScore: number | null,
): boolean => {
  const lowCieScore = bestCieAverage !== null && (
    subjectType === 'STANDALONE'
      ? bestCieAverage * 0.5 < 13
      : bestCieAverage * 0.3 < 13
  );

  return lowCieScore || (subjectType === 'INTEGRATED' && labScore !== null && labScore < 12);
};
