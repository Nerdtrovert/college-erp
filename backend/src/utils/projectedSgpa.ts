interface AssessmentMark {
  type: string;
  score: number | null;
}

interface SubjectAssessments {
  type: 'STANDALONE' | 'INTEGRATED';
  marks: AssessmentMark[];
}

export const calculateProjectedSgpa = (subjects: SubjectAssessments[]): string => {
  let totalScored = 0;
  let totalMax = 0;

  subjects.forEach(({ type, marks }) => {
    const cieScores = ['cie1', 'cie2', 'cie3']
      .map((markType) => marks.find((mark) => mark.type === markType)?.score)
      .filter((score): score is number => score !== null && score !== undefined)
      .sort((a, b) => b - a)
      .slice(0, 2);

    const assessments = [
      {
        score: cieScores.length > 0
          ? cieScores.reduce((sum, score) => sum + score, 0) / cieScores.length * (type === 'STANDALONE' ? 0.5 : 0.3)
          : null,
        max: type === 'STANDALONE' ? 25 : 15,
      },
    ];

    if (type === 'STANDALONE') {
      assessments.push({
        score: marks.find((mark) => mark.type === 'assignment')?.score ?? null,
        max: 25,
      });
    } else {
      const assignmentScores = ['assignment1', 'assignment2']
        .map((markType) => marks.find((mark) => mark.type === markType)?.score)
        .filter((score): score is number => score !== null && score !== undefined);
      assessments.push({
        score: assignmentScores.length > 0
          ? assignmentScores.reduce((sum, score) => sum + score, 0) / assignmentScores.length
          : null,
        max: 10,
      });
      assessments.push({
        score: marks.find((mark) => mark.type === 'lab')?.score ?? null,
        max: 25,
      });
    }

    assessments.forEach(({ score, max }) => {
      if (score !== null) {
        totalScored += score;
        totalMax += max;
      }
    });
  });

  if (totalMax === 0) return '0.0';
  const averagePct = Math.round((totalScored / totalMax) * 100);
  return (averagePct / 10 + 0.8).toFixed(1);
};
