import {
  Brain,
  Star,
  Tag,
  Heart,
  Flame,
  Activity,
  BarChart3,
} from "lucide-react";
import React from "react";
import type { Dream, DreamAnalysis } from "@/lib/types";
import type {
  DreamWellnessScore,
  Achievement,
  StatisticKPI,
  PatternInsight,
  DreamCalendarEntry,
} from "@/types/statistics";

// Function to get React icons for KPIs
const getKPIIcon = (type: string) => {
  switch (type) {
    case "wellness":
      return React.createElement(Brain, { className: "w-5 h-5" });
    case "total":
      return React.createElement(BarChart3, { className: "w-5 h-5" });
    case "rating":
      return React.createElement(Star, { className: "w-5 h-5" });
    case "category":
      return React.createElement(Tag, { className: "w-5 h-5" });
    case "emotion":
      return React.createElement(Heart, { className: "w-5 h-5" });
    case "streak":
      return React.createElement(Flame, { className: "w-5 h-5" });
    default:
      return React.createElement(Activity, { className: "w-5 h-5" });
  }
};

export const calculateWellnessScore = (
  dreams: Dream[],
  analyses: DreamAnalysis[],
): DreamWellnessScore => {
  if (!dreams.length) {
    return {
      overall: 0,
      emotional: 0,
      consistency: 0,
      quality: 0,
      trends: { weekly: 0, monthly: 0 },
    };
  }

  // Calculate emotional wellness (based on positive emotions vs negative)
  const positiveEmotions = ["joy", "peace", "excitement"];
  const negativeEmotions = ["fear", "anxiety", "sadness"];

  const emotionalData = dreams.map((dream) => {
    if (positiveEmotions.includes(dream.emotion)) return 1;
    if (negativeEmotions.includes(dream.emotion)) return -1;
    return 0;
  });

  const emotionalAvg =
    emotionalData.reduce((sum, val) => sum + val, 0) / emotionalData.length;
  const emotional = Math.max(0, Math.min(100, (emotionalAvg + 1) * 50));

  // Calculate consistency (dream frequency)
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const recentDreams = dreams.filter(
    (dream) => new Date(dream.created_at) >= thirtyDaysAgo,
  );
  const consistency = Math.min(100, (recentDreams.length / 30) * 100);

  // Calculate quality (based on analysis ratings)
  const quality = analyses.length
    ? (analyses.reduce((sum, analysis) => sum + analysis.rating, 0) /
        analyses.length) *
      20
    : 50;

  // Calculate trends
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const lastWeekDreams = dreams.filter(
    (dream) => new Date(dream.created_at) >= sevenDaysAgo,
  ).length;
  const previousWeekDreams = dreams.filter((dream) => {
    const date = new Date(dream.created_at);
    return date >= fourteenDaysAgo && date < sevenDaysAgo;
  }).length;

  const weeklyTrend = previousWeekDreams
    ? ((lastWeekDreams - previousWeekDreams) / previousWeekDreams) * 100
    : lastWeekDreams > 0
      ? 100
      : 0;

  const overall = (emotional + consistency + quality) / 3;

  return {
    overall: Math.round(overall),
    emotional: Math.round(emotional),
    consistency: Math.round(consistency),
    quality: Math.round(quality),
    trends: {
      weekly: Math.round(weeklyTrend),
      monthly: Math.round(consistency), // Simplified for now
    },
  };
};

export const calculateAchievements = (
  dreams: Dream[],
  analyses: DreamAnalysis[],
): Achievement[] => {
  // Helper function to find when an achievement was likely unlocked
  const findUnlockDate = (
    condition: () => boolean,
    checkType: "dream" | "analysis" | "streak",
    targetCount?: number,
  ): string | undefined => {
    if (!condition()) return undefined;

    if (checkType === "dream" && targetCount) {
      // Sort dreams by date and find when we hit the target
      const sortedDreams = [...dreams].sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );
      return sortedDreams[Math.min(targetCount - 1, sortedDreams.length - 1)]
        ?.created_at;
    } else if (checkType === "analysis" && targetCount) {
      // Sort analyses by dream creation date
      const sortedAnalyses = [...analyses]
        .map((analysis) => {
          const dream = dreams.find((d) => d.id === analysis.dream_id);
          return { ...analysis, dreamDate: dream?.created_at };
        })
        .filter((a) => a.dreamDate)
        .sort(
          (a, b) =>
            new Date(a.dreamDate!).getTime() - new Date(b.dreamDate!).getTime(),
        );

      return sortedAnalyses[
        Math.min(targetCount - 1, sortedAnalyses.length - 1)
      ]?.dreamDate;
    } else if (checkType === "streak") {
      // For streaks, return the most recent dream date if we have a current streak
      const sortedDreams = [...dreams].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
      return sortedDreams[0]?.created_at;
    }

    // Fallback: return the earliest dream date
    const sortedDreams = [...dreams].sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
    return sortedDreams[0]?.created_at;
  };

  // Calculate achievement data
  const lucidCount = dreams.filter((d) => d.category === "lucid").length;
  const currentStreak = calculateStreakDays(dreams);
  const uniqueSymbolsCount = getUniqueSymbols(analyses).length;
  const nightmareCount = dreams.filter(
    (d) => d.category === "nightmare",
  ).length;
  const propheticCount = dreams.filter(
    (d) => d.category === "prophetic",
  ).length;
  const highRatingAnalyses = analyses.filter((a) => a.rating >= 4).length;
  const uniqueEmotions = [...new Set(dreams.map((d) => d.emotion))].length;

  const achievements: Achievement[] = [
    {
      id: "first_dream",
      title: "Dream Keeper",
      description: "Record your first dream",
      icon: "🌙",
      unlocked: dreams.length > 0,
      unlockedAt: findUnlockDate(() => dreams.length > 0, "dream", 1),
    },
    {
      id: "week_streak",
      title: "Dream Warrior",
      description: "Record dreams for 7 consecutive days",
      icon: "🔥",
      unlocked: currentStreak >= 7,
      unlockedAt: findUnlockDate(() => currentStreak >= 7, "streak"),
      progress: currentStreak,
      maxProgress: 7,
    },
    {
      id: "month_streak",
      title: "Dream Master",
      description: "Record dreams for 30 consecutive days",
      icon: "🏆",
      unlocked: currentStreak >= 30,
      unlockedAt: findUnlockDate(() => currentStreak >= 30, "streak"),
      progress: currentStreak,
      maxProgress: 30,
    },
    {
      id: "lucid_explorer",
      title: "Lucid Explorer",
      description: "Record 5 lucid dreams",
      icon: "✨",
      unlocked: lucidCount >= 5,
      unlockedAt: findUnlockDate(() => lucidCount >= 5, "dream", 5),
      progress: lucidCount,
      maxProgress: 5,
    },
    {
      id: "deep_thinker",
      title: "Deep Thinker",
      description: "Get 10 dream analyses",
      icon: "🧠",
      unlocked: analyses.length >= 10,
      unlockedAt: findUnlockDate(() => analyses.length >= 10, "analysis", 10),
      progress: analyses.length,
      maxProgress: 10,
    },
    {
      id: "symbol_seeker",
      title: "Symbol Seeker",
      description: "Discover 20 unique symbols",
      icon: "🔍",
      unlocked: uniqueSymbolsCount >= 20,
      unlockedAt: findUnlockDate(
        () => uniqueSymbolsCount >= 20,
        "analysis",
        20,
      ),
      progress: uniqueSymbolsCount,
      maxProgress: 20,
    },
    {
      id: "quality_analyst",
      title: "Quality Analyst",
      description: "Get 5 high-quality dream analyses (4+ stars)",
      icon: "⭐",
      unlocked: highRatingAnalyses >= 5,
      unlockedAt: findUnlockDate(() => highRatingAnalyses >= 5, "analysis", 5),
      progress: highRatingAnalyses,
      maxProgress: 5,
    },
    {
      id: "emotion_explorer",
      title: "Emotion Explorer",
      description: "Experience 5 different emotions in dreams",
      icon: "❤️",
      unlocked: uniqueEmotions >= 5,
      unlockedAt: findUnlockDate(() => uniqueEmotions >= 5, "dream"),
      progress: uniqueEmotions,
      maxProgress: 5,
    },
    {
      id: "nightmare_survivor",
      title: "Nightmare Survivor",
      description: "Face and record 3 nightmares",
      icon: "👹",
      unlocked: nightmareCount >= 3,
      unlockedAt: findUnlockDate(() => nightmareCount >= 3, "dream"),
      progress: nightmareCount,
      maxProgress: 3,
    },
    {
      id: "prophet_dreamer",
      title: "Prophet Dreamer",
      description: "Record 2 prophetic dreams",
      icon: "🔮",
      unlocked: propheticCount >= 2,
      unlockedAt: findUnlockDate(() => propheticCount >= 2, "dream"),
      progress: propheticCount,
      maxProgress: 2,
    },
  ];

  return achievements;
};

export const calculateStreakDays = (dreams: Dream[]): number => {
  if (!dreams.length) return 0;

  const sortedDreams = dreams
    .map((dream) => new Date(dream.created_at).toDateString())
    .sort()
    .reduce((unique: string[], date) => {
      if (!unique.includes(date)) unique.push(date);
      return unique;
    }, []);

  let streak = 0;
  const today = new Date();

  for (let i = 0; i < 365; i++) {
    const checkDate = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
    const dateString = checkDate.toDateString();

    if (sortedDreams.includes(dateString)) {
      streak++;
    } else if (streak > 0) {
      break;
    }
  }

  return streak;
};

export const getUniqueSymbols = (analyses: DreamAnalysis[]): string[] => {
  const allSymbols = analyses.flatMap((analysis) => analysis.symbols || []);
  return [...new Set(allSymbols)];
};

export const calculateKPIs = (
  dreams: Dream[],
  analyses: DreamAnalysis[],
  wellness: DreamWellnessScore,
): StatisticKPI[] => {
  const avgRating = analyses.length
    ? analyses.reduce((sum, a) => sum + a.rating, 0) / analyses.length
    : 0;

  const mostCommonCategory = Object.entries(
    dreams.reduce(
      (acc, dream) => {
        acc[dream.category] = (acc[dream.category] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    ),
  ).sort(([, a], [, b]) => b - a)[0];

  const mostCommonEmotion = Object.entries(
    dreams.reduce(
      (acc, dream) => {
        acc[dream.emotion] = (acc[dream.emotion] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    ),
  ).sort(([, a], [, b]) => b - a)[0];

  return [
    {
      title: "Dream Wellness Score",
      value: wellness.overall,
      description: "overall mental wellness",
      icon: getKPIIcon("wellness"),
      trend: {
        direction:
          wellness.trends.weekly > 0
            ? "up"
            : wellness.trends.weekly < 0
              ? "down"
              : "stable",
        percentage: Math.abs(wellness.trends.weekly),
        period: "vs last week",
      },
      color: "purple",
    },
    {
      title: "Total Dreams",
      value: dreams.length,
      description: "dreams recorded",
      icon: getKPIIcon("total"),
      color: "blue",
    },
    {
      title: "Avg Dream Rating",
      value: avgRating.toFixed(1),
      description: "out of 5 stars",
      icon: getKPIIcon("rating"),
      color: "green",
    },
    {
      title: "Most Common Type",
      value: mostCommonCategory?.[0] || "N/A",
      description: `${mostCommonCategory ? Math.round((mostCommonCategory[1] / dreams.length) * 100) : 0}% of dreams`,
      icon: getKPIIcon("category"),
      color: "orange",
    },
    {
      title: "Dominant Emotion",
      value: mostCommonEmotion?.[0] || "N/A",
      description: `${mostCommonEmotion ? Math.round((mostCommonEmotion[1] / dreams.length) * 100) : 0}% of dreams`,
      icon: getKPIIcon("emotion"),
      color: "pink",
    },
    {
      title: "Current Streak",
      value: `${calculateStreakDays(dreams)} days`,
      description: "consecutive recording",
      icon: getKPIIcon("streak"),
      color: "red",
    },
  ];
};

export const generateDreamCalendar = (
  dreams: Dream[],
): DreamCalendarEntry[] => {
  const last90Days = Array.from({ length: 90 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - i);
    return date.toISOString().split("T")[0];
  }).reverse();

  return last90Days.map((date) => {
    const dayDreams = dreams.filter(
      (dream) => dream.created_at.split("T")[0] === date,
    );

    if (!dayDreams.length) {
      return {
        date,
        count: 0,
        dominantEmotion: "neutral",
        dominantCategory: "normal",
        qualityScore: 0,
      };
    }

    // Get most frequent emotion and category
    const emotions = dayDreams.map((d) => d.emotion);
    const categories = dayDreams.map((d) => d.category);

    const dominantEmotion = getMostFrequent(emotions);
    const dominantCategory = getMostFrequent(categories);

    return {
      date,
      count: dayDreams.length,
      dominantEmotion,
      dominantCategory,
      qualityScore: dayDreams.length, // Simplified quality score
    };
  });
};

export const generatePatternInsights = (
  dreams: Dream[],
  analyses: DreamAnalysis[],
): PatternInsight[] => {
  const insights: PatternInsight[] = [];

  // Lucid dreaming trend
  const lucidDreams = dreams.filter((d) => d.category === "lucid");
  if (lucidDreams.length >= 3) {
    const recentLucid = lucidDreams.filter(
      (d) =>
        new Date(d.created_at) >=
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    );

    if (recentLucid.length >= 2) {
      insights.push({
        type: "trend",
        title: "Increasing Lucid Dream Frequency",
        description: `You've had ${recentLucid.length} lucid dreams this month, showing improvement in awareness.`,
        confidence: 0.8,
        actionable:
          "Consider keeping a reality check routine to maintain this progress.",
      });
    }
  }

  // Nightmare pattern
  const nightmares = dreams.filter((d) => d.category === "nightmare");
  if (nightmares.length >= 5) {
    const recentNightmares = nightmares.filter(
      (d) =>
        new Date(d.created_at) >=
        new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    );

    if (recentNightmares.length >= 3) {
      insights.push({
        type: "anomaly",
        title: "Increased Nightmare Activity",
        description: "You've experienced more nightmares recently than usual.",
        confidence: 0.9,
        actionable:
          "Consider stress management techniques or speak with a healthcare provider.",
      });
    }
  }

  // Symbol pattern
  const allSymbols = analyses.flatMap((a) => a.symbols || []);
  const symbolCounts = allSymbols.reduce(
    (acc, symbol) => {
      acc[symbol] = (acc[symbol] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const topSymbol = Object.entries(symbolCounts).sort(
    ([, a], [, b]) => b - a,
  )[0];
  if (topSymbol && topSymbol[1] >= 5) {
    insights.push({
      type: "correlation",
      title: `Recurring Symbol: ${topSymbol[0]}`,
      description: `The symbol "${topSymbol[0]}" appears in ${topSymbol[1]} of your dreams.`,
      confidence: 0.7,
      actionable:
        "This symbol might represent something important in your subconscious.",
    });
  }

  return insights;
};

const getMostFrequent = <T>(arr: T[]): T => {
  const counts = arr.reduce(
    (acc, item) => {
      acc[item as string] = (acc[item as string] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return Object.entries(counts).sort(([, a], [, b]) => b - a)[0]?.[0] as T;
};
