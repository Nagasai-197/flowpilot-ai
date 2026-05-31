export interface ScoringFactor {
  weight: number; // decimal between 0.0 and 1.0
  description: string;
}

export interface AnalyticsConfig {
  scoring: {
    factors: {
      taskCompletion: ScoringFactor;
      habitCheckIn: ScoringFactor;
      focusTime: ScoringFactor;
      plannerAdherence: ScoringFactor;
    };
    thresholds: {
      highProductivity: number; // e.g. 80
      moderateProductivity: number; // e.g. 50
    };
  };
}

export const analyticsConfig: AnalyticsConfig = {
  scoring: {
    factors: {
      taskCompletion: {
        weight: 0.6,
        description: 'Percentage of completed tasks in the last 7 days (60% weight)',
      },
      habitCheckIn: {
        weight: 0.4,
        description: 'Percentage of completed habits in the last 7 days (40% weight)',
      },
      focusTime: {
        weight: 0.0, // Future addition: 0.0 weight implies it does not affect scores yet
        description: 'Ratio of deep work hours relative to target focus duration',
      },
      plannerAdherence: {
        weight: 0.0, // Future addition: 0.0 weight implies it does not affect scores yet
        description: 'Percentage of scheduled planner focus blocks successfully executed',
      },
    },
    thresholds: {
      highProductivity: 80,
      moderateProductivity: 50,
    },
  },
};
