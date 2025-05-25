import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Trophy } from "lucide-react";
import type { Achievement } from "@/types/statistics";

interface AchievementsGridProps {
  achievements: Achievement[];
  className?: string;
}

export const AchievementsGrid = ({
  achievements,
  className,
}: AchievementsGridProps) => {
  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  return (
    <Card
      className={`bg-gradient-to-br from-amber-100/50 to-orange-100/50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-200/50 dark:border-amber-500/20 ${className}`}
    >
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg text-gray-900 dark:text-white">
          <Trophy className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          Achievements
          <Badge variant="secondary" className="ml-auto">
            {unlockedCount}/{achievements.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {achievements.map((achievement, index) => (
            <motion.div
              key={achievement.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`relative p-4 rounded-lg border transition-all duration-300 hover:scale-105 ${
                achievement.unlocked
                  ? "bg-gradient-to-br from-amber-200/30 to-yellow-200/30 dark:from-amber-500/20 dark:to-yellow-500/20 border-amber-400/60 dark:border-amber-400/40 shadow-md"
                  : "bg-gray-100/50 dark:bg-gray-800/50 border-gray-300/50 dark:border-gray-600/30 hover:bg-gray-200/50 dark:hover:bg-gray-700/50"
              }`}
            >
              {/* Achievement Icon */}
              <div className="flex items-center gap-3 mb-2">
                <motion.div
                  className={`text-2xl ${achievement.unlocked ? "filter-none" : "grayscale"}`}
                  animate={achievement.unlocked ? { scale: [1, 1.1, 1] } : {}}
                  transition={{ duration: 0.5 }}
                >
                  {achievement.icon}
                </motion.div>
                <div className="flex-1 min-w-0">
                  <h3
                    className={`font-medium text-sm ${
                      achievement.unlocked
                        ? "text-gray-900 dark:text-white"
                        : "text-gray-600 dark:text-gray-400"
                    }`}
                  >
                    {achievement.title}
                  </h3>
                  <p
                    className={`text-xs ${
                      achievement.unlocked
                        ? "text-gray-700 dark:text-gray-300"
                        : "text-gray-500 dark:text-gray-500"
                    }`}
                  >
                    {achievement.description}
                  </p>
                </div>
              </div>

              {/* Progress Bar (if applicable) */}
              {achievement.maxProgress && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600 dark:text-gray-400">
                      Progress
                    </span>
                    <span
                      className={`font-medium ${
                        achievement.unlocked
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-gray-700 dark:text-gray-300"
                      }`}
                    >
                      {achievement.progress || 0}/{achievement.maxProgress}
                      {achievement.unlocked && " ✓"}
                    </span>
                  </div>
                  <Progress
                    value={Math.min(
                      ((achievement.progress || 0) / achievement.maxProgress) *
                        100,
                      100,
                    )}
                    className={`h-2 ${
                      achievement.unlocked
                        ? "[&>*]:bg-amber-500 dark:[&>*]:bg-amber-400"
                        : ""
                    }`}
                  />
                  {achievement.unlocked &&
                    achievement.progress &&
                    achievement.progress > achievement.maxProgress && (
                      <div className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                        🎉 Goal exceeded!
                      </div>
                    )}
                </div>
              )}

              {/* Unlock Date */}
              {achievement.unlocked && achievement.unlockedAt && (
                <div className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                  Unlocked{" "}
                  {new Date(achievement.unlockedAt).toLocaleDateString()}
                </div>
              )}

              {/* Unlock Effect */}
              {achievement.unlocked && (
                <>
                  <motion.div
                    className="absolute inset-0 rounded-lg border-2 border-amber-400/70 dark:border-amber-300/70"
                    initial={{ opacity: 0, scale: 1.05 }}
                    animate={{
                      opacity: [0, 0.6, 0],
                      scale: [1.05, 1.02, 1.05],
                      boxShadow: [
                        "0 0 0px rgba(251, 191, 36, 0)",
                        "0 0 20px rgba(251, 191, 36, 0.3)",
                        "0 0 0px rgba(251, 191, 36, 0)",
                      ],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      repeatDelay: 2,
                    }}
                  />
                  {/* Achievement unlocked badge */}
                  <div className="absolute -top-2 -right-2 bg-amber-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg">
                    ✓
                  </div>
                </>
              )}
            </motion.div>
          ))}
        </div>

        {/* Overall Progress */}
        <div className="mt-4 pt-4 border-t border-gray-300/50 dark:border-gray-600/30">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-600 dark:text-gray-400">
              Overall Progress
            </span>
            <span className="text-gray-700 dark:text-gray-300">
              {Math.round((unlockedCount / achievements.length) * 100)}%
            </span>
          </div>
          <Progress
            value={(unlockedCount / achievements.length) * 100}
            className="h-2"
          />
        </div>
      </CardContent>
    </Card>
  );
};
