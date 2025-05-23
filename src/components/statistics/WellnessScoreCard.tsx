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
    if (score >= 80) return "text-green-400";
    if (score >= 60) return "text-yellow-400";
    if (score >= 40) return "text-orange-400";
    return "text-red-400";
  };

  const getTrendIcon = (trend: number) => {
    if (trend > 5) return <TrendingUp className="w-4 h-4 text-green-400" />;
    if (trend < -5) return <TrendingDown className="w-4 h-4 text-red-400" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  const circleCircumference = 2 * Math.PI * 45; // radius = 45
  const strokeDasharray = circleCircumference;
  const strokeDashoffset =
    circleCircumference - (wellness.overall / 100) * circleCircumference;

  return (
    <Card
      className={`bg-gradient-to-br from-purple-900/20 to-blue-900/20 border-purple-500/20 ${className}`}
    >
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Brain className="w-5 h-5 text-purple-400" />
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
                className="text-gray-700"
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
              <span className="text-xs text-gray-400">out of 100</span>
            </div>
          </div>
        </div>

        {/* Trend Indicator */}
        <div className="flex items-center justify-center gap-2 text-sm">
          {getTrendIcon(wellness.trends.weekly)}
          <span className="text-gray-300">
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
            <div className="text-xs text-gray-400">Emotional</div>
          </div>
          <div>
            <div
              className={`text-lg font-semibold ${getScoreColor(wellness.consistency)}`}
            >
              {wellness.consistency}
            </div>
            <div className="text-xs text-gray-400">Consistency</div>
          </div>
          <div>
            <div
              className={`text-lg font-semibold ${getScoreColor(wellness.quality)}`}
            >
              {wellness.quality}
            </div>
            <div className="text-xs text-gray-400">Quality</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
