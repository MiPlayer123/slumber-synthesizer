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
        "from-purple-500/20 to-purple-600/20 border-purple-500/30 text-purple-400",
      blue: "from-blue-500/20 to-blue-600/20 border-blue-500/30 text-blue-400",
      green:
        "from-green-500/20 to-green-600/20 border-green-500/30 text-green-400",
      orange:
        "from-orange-500/20 to-orange-600/20 border-orange-500/30 text-orange-400",
      pink: "from-pink-500/20 to-pink-600/20 border-pink-500/30 text-pink-400",
      red: "from-red-500/20 to-red-600/20 border-red-500/30 text-red-400",
    };
    return colorMap[color as keyof typeof colorMap] || colorMap.blue;
  };

  const getTrendIcon = (direction: "up" | "down" | "stable") => {
    switch (direction) {
      case "up":
        return <TrendingUp className="w-4 h-4 text-green-400" />;
      case "down":
        return <TrendingDown className="w-4 h-4 text-red-400" />;
      default:
        return <Minus className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div
      className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 ${className}`}
    >
      {kpis.map((kpi, index) => {
        const colorClasses = getColorClasses(kpi.color || "blue");

        return (
          <motion.div
            key={kpi.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card
              className={`bg-gradient-to-br ${colorClasses.split(" ").slice(0, 2).join(" ")} border transition-all duration-300 hover:scale-105`}
            >
              <CardContent className="p-4">
                <div className="space-y-2">
                  {/* Icon and Title */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {kpi.icon}
                      <h3 className="text-xs font-medium text-gray-300 truncate">
                        {kpi.title}
                      </h3>
                    </div>
                  </div>

                  {/* Value */}
                  <motion.div
                    className={`text-2xl font-bold ${colorClasses.split(" ").slice(-1)[0]}`}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: index * 0.1 + 0.3, type: "spring" }}
                  >
                    {kpi.value}
                  </motion.div>

                  {/* Trend */}
                  {kpi.trend && (
                    <div className="flex items-center gap-1 text-xs">
                      {getTrendIcon(kpi.trend.direction)}
                      <span
                        className={`${
                          kpi.trend.direction === "up"
                            ? "text-green-400"
                            : kpi.trend.direction === "down"
                              ? "text-red-400"
                              : "text-gray-400"
                        }`}
                      >
                        {kpi.trend.percentage}%
                      </span>
                      <span className="text-gray-500">{kpi.trend.period}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
};
