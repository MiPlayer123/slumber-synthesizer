import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "lucide-react";
import type { DreamCalendarEntry } from "@/types/statistics";

interface DreamCalendarHeatmapProps {
  data: DreamCalendarEntry[];
  className?: string;
}

export const DreamCalendarHeatmap = ({
  data,
  className,
}: DreamCalendarHeatmapProps) => {
  const getEmotionColor = (emotion: string, count: number) => {
    if (count === 0) return "bg-gray-200/50 dark:bg-gray-800/50";

    const emotionColors = {
      joy: "bg-yellow-500/60",
      peace: "bg-green-500/60",
      excitement: "bg-orange-500/60",
      neutral: "bg-blue-500/60",
      confusion: "bg-purple-500/60",
      anxiety: "bg-red-500/60",
      fear: "bg-red-600/60",
      sadness: "bg-indigo-500/60",
    };

    return (
      emotionColors[emotion as keyof typeof emotionColors] || "bg-gray-500/60"
    );
  };

  const getIntensity = (count: number) => {
    if (count === 0) return 0.2;
    if (count === 1) return 0.4;
    if (count === 2) return 0.6;
    if (count === 3) return 0.8;
    return 1.0;
  };

  // Group data by weeks
  const weeks: DreamCalendarEntry[][] = [];
  const startDate = new Date(data[0]?.date);
  const firstDayOfWeek = startDate.getDay();

  // Add empty days at the beginning if needed
  const paddedData = [...Array(firstDayOfWeek).fill(null), ...data];

  // Group into weeks of 7 days
  for (let i = 0; i < paddedData.length; i += 7) {
    weeks.push(paddedData.slice(i, i + 7));
  }

  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const dayNames = ["S", "M", "T", "W", "T", "F", "S"];

  return (
    <Card
      className={`bg-gradient-to-br from-slate-100/50 to-gray-100/50 dark:from-slate-900/20 dark:to-gray-800/20 border-slate-200/50 dark:border-slate-500/20 ${className}`}
    >
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg text-gray-900 dark:text-white">
          <Calendar className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          Dream Activity Calendar
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Month Labels */}
          <div className="grid grid-cols-12 gap-1 text-xs text-gray-600 dark:text-gray-400">
            {monthNames.map((month) => (
              <div key={month} className="text-center">
                {month}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="space-y-1">
            {/* Day Labels */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {dayNames.map((day) => (
                <div
                  key={day}
                  className="text-xs text-gray-600 dark:text-gray-400 text-center w-3 h-3 flex items-center justify-center"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Weeks */}
            <div className="space-y-1">
              {weeks.map((week, weekIndex) => (
                <div key={weekIndex} className="grid grid-cols-7 gap-1">
                  {week.map((day, dayIndex) => {
                    if (!day) {
                      return (
                        <div key={`empty-${dayIndex}`} className="w-3 h-3" />
                      );
                    }

                    const date = new Date(day.date);
                    const colorClass = getEmotionColor(
                      day.dominantEmotion,
                      day.count,
                    );
                    const opacity = getIntensity(day.count);

                    return (
                      <motion.div
                        key={day.date}
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{
                          delay: (weekIndex * 7 + dayIndex) * 0.01,
                        }}
                        className={`w-3 h-3 rounded-sm cursor-pointer transition-all duration-200 hover:scale-110 group relative ${colorClass}`}
                        style={{ opacity }}
                        title={`${date.toLocaleDateString()}: ${day.count} dreams (${day.dominantEmotion})`}
                      >
                        {/* Tooltip */}
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900/95 dark:bg-black/90 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-10">
                          <div className="font-medium">
                            {date.toLocaleDateString()}
                          </div>
                          <div>
                            {day.count} {day.count === 1 ? "dream" : "dreams"}
                          </div>
                          <div className="capitalize">
                            {day.dominantEmotion} emotion
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-300/50 dark:border-gray-600/30">
            <div className="text-xs text-gray-600 dark:text-gray-400">Less</div>
            <div className="flex items-center gap-1">
              {[0, 1, 2, 3, 4].map((level) => (
                <div
                  key={level}
                  className="w-3 h-3 rounded-sm bg-blue-500"
                  style={{ opacity: level === 0 ? 0.2 : level * 0.25 }}
                />
              ))}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">More</div>
          </div>

          {/* Emotion Legend */}
          <div className="pt-2">
            <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
              Emotion Colors:
            </div>
            <div className="grid grid-cols-4 gap-2 text-xs">
              {[
                { emotion: "joy", color: "bg-yellow-500", label: "Joy" },
                { emotion: "peace", color: "bg-green-500", label: "Peace" },
                { emotion: "anxiety", color: "bg-red-500", label: "Anxiety" },
                { emotion: "neutral", color: "bg-blue-500", label: "Neutral" },
              ].map(({ emotion, color, label }) => (
                <div key={emotion} className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-sm ${color}`} />
                  <span className="text-gray-700 dark:text-gray-300">
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
