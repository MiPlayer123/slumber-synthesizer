import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus, Brain } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DreamWellnessScore } from "@/types/statistics";

interface WellnessScoreCardProps {
  wellness: DreamWellnessScore;
  className?: string;
}

export const WellnessScoreCard = ({
  wellness,
  className,
}: WellnessScoreCardProps) => {
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 dark:text-green-400";
    if (score >= 60) return "text-yellow-600 dark:text-yellow-400";
    if (score >= 40) return "text-orange-600 dark:text-orange-400";
    return "text-red-600 dark:text-red-400";
  };

  const getTrendIcon = (trend: number) => {
    if (trend > 5)
      return (
        <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
      );
    if (trend < -5)
      return (
        <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />
      );
    return <Minus className="w-4 h-4 text-gray-600 dark:text-gray-400" />;
  };

  const circleCircumference = 2 * Math.PI * 45; // radius = 45
  const strokeDasharray = circleCircumference;
  const strokeDashoffset =
    circleCircumference - (wellness.overall / 100) * circleCircumference;

  return (
    <Card
      className={`bg-gradient-to-br from-purple-100/50 to-blue-100/50 dark:from-purple-900/20 dark:to-blue-900/20 border-purple-200/50 dark:border-purple-500/20 ${className}`}
    >
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg text-gray-900 dark:text-white">
          <Brain className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          Dream Wellness Score
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Wellness Score Circle */}
        <div className="flex items-center justify-center">
          <div className="relative w-32 h-32">
            <svg
              className="w-32 h-32 transform -rotate-90"
              viewBox="0 0 100 100"
            >
              {/* Background circle */}
              <circle
                cx="50"
                cy="50"
                r="45"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className="text-gray-300 dark:text-gray-700"
              />
              {/* Progress circle */}
              <motion.circle
                cx="50"
                cy="50"
                r="45"
                stroke="url(#wellness-gradient)"
                strokeWidth="8"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={strokeDasharray}
                initial={{ strokeDashoffset: circleCircumference }}
                animate={{ strokeDashoffset }}
                transition={{ duration: 1.5, ease: "easeOut" }}
              />
              <defs>
                <linearGradient
                  id="wellness-gradient"
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="100%"
                >
                  <stop
                    offset="0%"
                    className={`stop-color-[var(--gradient-start)]`}
                  />
                  <stop
                    offset="100%"
                    className={`stop-color-[var(--gradient-end)]`}
                  />
                </linearGradient>
              </defs>
            </svg>

            {/* Score text in center */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <motion.span
                className={`text-3xl font-bold ${getScoreColor(wellness.overall)}`}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5, type: "spring" }}
              >
                {wellness.overall}
              </motion.span>
              <span className="text-xs text-gray-600 dark:text-gray-400">
                out of 100
              </span>
            </div>
          </div>
        </div>

        {/* Trend Indicator */}
        <div className="flex items-center justify-center gap-2 text-sm">
          {getTrendIcon(wellness.trends.weekly)}
          <span className="text-gray-700 dark:text-gray-300">
            {Math.abs(wellness.trends.weekly)}% vs last week
          </span>
        </div>

        {/* Breakdown Scores */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <div
              className={`text-lg font-semibold ${getScoreColor(wellness.emotional)}`}
            >
              {wellness.emotional}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              Emotional
            </div>
          </div>
          <div>
            <div
              className={`text-lg font-semibold ${getScoreColor(wellness.consistency)}`}
            >
              {wellness.consistency}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              Consistency
            </div>
          </div>
          <div>
            <div
              className={`text-lg font-semibold ${getScoreColor(wellness.quality)}`}
            >
              {wellness.quality}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              Quality
            </div>
          </div>
        </div>

        {/* Explanation Section */}
        <div className="mt-4 p-3 bg-gray-50/50 dark:bg-gray-800/30 rounded-lg border border-gray-200/50 dark:border-gray-600/30">
          <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
            <div className="font-medium text-gray-800 dark:text-gray-200 mb-2">
              How Your Wellness Score is Calculated:
            </div>

            <div>
              <span className="font-medium text-purple-600 dark:text-purple-400">
                Emotional (40%):
              </span>
              <span className="ml-1">
                Balance of positive emotions and emotional intensity in your
                dreams
              </span>
            </div>

            <div>
              <span className="font-medium text-blue-600 dark:text-blue-400">
                Consistency (30%):
              </span>
              <span className="ml-1">
                Regular dream journaling habits and sleep pattern stability
              </span>
            </div>

            <div>
              <span className="font-medium text-green-600 dark:text-green-400">
                Quality (30%):
              </span>
              <span className="ml-1">
                Dream recall, detail richness, and lucidity experiences
              </span>
            </div>

            <div className="mt-3 pt-2 border-t border-gray-200/50 dark:border-gray-600/30">
              <div className="text-xs text-gray-500 dark:text-gray-500">
                <strong>Score Ranges:</strong> 80+ Excellent • 60-79 Good •
                40-59 Fair • Below 40 Needs Attention
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
