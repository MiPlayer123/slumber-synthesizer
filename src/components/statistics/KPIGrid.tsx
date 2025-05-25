import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { StatisticKPI } from "@/types/statistics";

interface KPIGridProps {
  kpis: StatisticKPI[];
  className?: string;
}

export const KPIGrid = ({ kpis, className }: KPIGridProps) => {
  const getColorClasses = (color: string) => {
    const colorMap = {
      purple:
        "from-purple-100/70 to-purple-200/70 dark:from-purple-500/20 dark:to-purple-600/20 border-purple-300/50 dark:border-purple-500/30 text-purple-700 dark:text-purple-400",
      blue: "from-blue-100/70 to-blue-200/70 dark:from-blue-500/20 dark:to-blue-600/20 border-blue-300/50 dark:border-blue-500/30 text-blue-700 dark:text-blue-400",
      green:
        "from-green-100/70 to-green-200/70 dark:from-green-500/20 dark:to-green-600/20 border-green-300/50 dark:border-green-500/30 text-green-700 dark:text-green-400",
      orange:
        "from-orange-100/70 to-orange-200/70 dark:from-orange-500/20 dark:to-orange-600/20 border-orange-300/50 dark:border-orange-500/30 text-orange-700 dark:text-orange-400",
      pink: "from-pink-100/70 to-pink-200/70 dark:from-pink-500/20 dark:to-pink-600/20 border-pink-300/50 dark:border-pink-500/30 text-pink-700 dark:text-pink-400",
      red: "from-red-100/70 to-red-200/70 dark:from-red-500/20 dark:to-red-600/20 border-red-300/50 dark:border-red-500/30 text-red-700 dark:text-red-400",
    };
    return colorMap[color as keyof typeof colorMap] || colorMap.blue;
  };

  const getTrendIcon = (direction: "up" | "down" | "stable") => {
    switch (direction) {
      case "up":
        return (
          <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
        );
      case "down":
        return (
          <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />
        );
      default:
        return <Minus className="w-4 h-4 text-gray-600 dark:text-gray-400" />;
    }
  };

  return (
    <div
      className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 ${className}`}
    >
      {kpis.map((kpi, index) => {
        const colorClasses = getColorClasses(kpi.color || "blue");
        const [gradientFrom, gradientTo, , , textColor] =
          colorClasses.split(" ");

        return (
          <motion.div
            key={kpi.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card
              className={`bg-gradient-to-br ${gradientFrom} ${gradientTo} ${colorClasses.split(" ").slice(2, -1).join(" ")} border transition-all duration-300 hover:scale-105 h-32`}
            >
              <CardContent className="p-4 h-full flex flex-col justify-between">
                <div className="space-y-3">
                  {/* Icon and Title */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="flex-shrink-0">{kpi.icon}</div>
                      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 leading-tight">
                        {kpi.title}
                      </h3>
                    </div>
                  </div>

                  {/* Value and Description */}
                  <div className="space-y-1">
                    <motion.div
                      className={`text-2xl font-bold ${textColor} leading-none`}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: index * 0.1 + 0.3, type: "spring" }}
                    >
                      {kpi.value}
                    </motion.div>
                    {kpi.description && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 leading-tight">
                        {kpi.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Trend */}
                {kpi.trend && (
                  <div className="flex items-center gap-1 text-xs mt-auto">
                    {getTrendIcon(kpi.trend.direction)}
                    <span
                      className={`${
                        kpi.trend.direction === "up"
                          ? "text-green-600 dark:text-green-400"
                          : kpi.trend.direction === "down"
                            ? "text-red-600 dark:text-red-400"
                            : "text-gray-600 dark:text-gray-400"
                      }`}
                    >
                      {kpi.trend.percentage}%
                    </span>
                    <span className="text-gray-600 dark:text-gray-500">
                      {kpi.trend.period}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
};
