export interface DreamWellnessScore {
  overall: number;
  emotional: number;
  consistency: number;
  quality: number;
  trends: {
    weekly: number;
    monthly: number;
  };
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: string;
  progress?: number;
  maxProgress?: number;
}

export interface StatisticKPI {
  title: string;
  value: string | number;
  trend?: {
    direction: "up" | "down" | "stable";
    percentage: number;
    period: string;
  };
  icon?: React.ReactNode;
  color?: string;
}

export interface ChartDataPoint {
  name: string;
  value: number;
  percentage?: number;
  color?: string;
}

export interface TimeSeriesData {
  date: string;
  displayDate: string;
  count: number;
  [key: string]: string | number;
}

export interface SymbolFrequency {
  name: string;
  count: number;
  percentage: number;
  firstSeen: string;
  lastSeen: string;
  emotionCorrelation: Record<string, number>;
}

export interface ThemeEvolution {
  theme: string;
  timeline: Array<{
    month: string;
    count: number;
    intensity: number;
  }>;
}

export interface DreamCalendarEntry {
  date: string;
  count: number;
  dominantEmotion: string;
  dominantCategory: string;
  qualityScore: number;
}

export interface PatternInsight {
  type: "trend" | "cycle" | "anomaly" | "correlation";
  title: string;
  description: string;
  confidence: number;
  actionable?: string;
}

export interface CommunityComparison {
  metric: string;
  userValue: number;
  communityAverage: number;
  percentile: number;
  sampleSize: number;
}

export interface StatisticsData {
  wellness: DreamWellnessScore;
  achievements: Achievement[];
  kpis: StatisticKPI[];
  insights: PatternInsight[];
  community?: CommunityComparison[];
}
