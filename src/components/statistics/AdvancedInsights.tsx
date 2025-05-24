import { motion } from "framer-motion";
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Brain,
  TrendingUp,
  Target,
  Lightbulb,
  Calendar,
  Heart,
  Shield,
  Zap,
  Clock,
  Star,
} from "lucide-react";
import type { Dream, DreamAnalysis } from "@/lib/types";

interface PredictiveInsight {
  type: "prediction" | "recommendation" | "warning" | "opportunity";
  title: string;
  description: string;
  confidence: number;
  timeframe: string;
  actionable: string[];
  impact: "high" | "medium" | "low";
}

interface PersonalizedGoal {
  id: string;
  title: string;
  description: string;
  progress: number;
  target: number;
  timeRemaining: string;
  suggestions: string[];
  category: "lucid" | "wellness" | "consistency" | "quality";
}

interface AdvancedInsightsProps {
  dreams: Dream[];
  analyses: DreamAnalysis[];
  className?: string;
}

export const AdvancedInsights = ({
  dreams,
  analyses,
  className,
}: AdvancedInsightsProps) => {
  const [activeInsightTab, setActiveInsightTab] = useState("predictions");

  // Generate predictive insights using advanced algorithms
  const predictiveInsights = useMemo((): PredictiveInsight[] => {
    if (!dreams.length || !analyses.length) return [];

    const insights: PredictiveInsight[] = [];
    const now = new Date();

    // Analyze recent trends (last 30 days)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const recentDreams = dreams.filter(
      (d) => new Date(d.created_at) >= thirtyDaysAgo,
    );
    const recentAnalyses = analyses.filter((a) => {
      const dreamDate = dreams.find((d) => d.id === a.dream_id)?.created_at;
      return dreamDate && new Date(dreamDate) >= thirtyDaysAgo;
    });

    // Lucid dreaming progression prediction
    const lucidDreams = dreams.filter((d) => d.category === "lucid");
    const recentLucidCount = recentDreams.filter(
      (d) => d.category === "lucid",
    ).length;

    if (lucidDreams.length >= 2) {
      const lucidTrend = recentLucidCount / Math.max(1, recentDreams.length);

      if (lucidTrend > 0.2) {
        insights.push({
          type: "opportunity",
          title: "Lucid Dreaming Mastery Approaching",
          description: `Your lucid dream frequency has increased ${Math.round(lucidTrend * 100)}% this month. You're entering a high-awareness phase.`,
          confidence: 0.85,
          timeframe: "Next 2 weeks",
          actionable: [
            "Practice reality checks every 2 hours",
            "Keep a dream journal by your bed",
            "Try the MILD technique before sleep",
            "Maintain consistent sleep schedule",
          ],
          impact: "high",
        });
      }
    }

    // Nightmare pattern warning
    const nightmares = recentDreams.filter((d) => d.category === "nightmare");
    const stressEmotions = recentDreams.filter((d) =>
      ["anxiety", "fear", "sadness"].includes(d.emotion),
    ).length;

    if (nightmares.length >= 3 || stressEmotions >= 5) {
      insights.push({
        type: "warning",
        title: "Elevated Stress Indicators Detected",
        description: `Recent dreams show ${nightmares.length} nightmares and ${stressEmotions} stress-related emotions. This suggests heightened stress levels.`,
        confidence: 0.9,
        timeframe: "Next 1-2 weeks",
        actionable: [
          "Practice relaxation techniques before bed",
          "Consider meditation or mindfulness",
          "Reduce screen time 1 hour before sleep",
          "Speak with a healthcare provider if persistent",
        ],
        impact: "high",
      });
    }

    // Dream quality improvement prediction
    const avgRating = recentAnalyses.length
      ? recentAnalyses.reduce((sum, a) => sum + a.rating, 0) /
        recentAnalyses.length
      : 0;

    if (avgRating > 3.5) {
      insights.push({
        type: "prediction",
        title: "Dream Recall Enhancement Phase",
        description: `Your dream quality scores average ${avgRating.toFixed(1)}/5. You're entering a period of enhanced dream recall and vividness.`,
        confidence: 0.75,
        timeframe: "Next 3 weeks",
        actionable: [
          "Document dreams immediately upon waking",
          "Note recurring symbols and themes",
          "Experiment with dream incubation techniques",
        ],
        impact: "medium",
      });
    }

    // Symbol evolution prediction
    const symbolEvolution = analyses.slice(-10).flatMap((a) => a.symbols || []);
    const symbolCounts = symbolEvolution.reduce(
      (acc, symbol) => {
        acc[symbol] = (acc[symbol] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const emergingSymbol = Object.entries(symbolCounts)
      .filter(([, count]) => count >= 3)
      .sort(([, a], [, b]) => b - a)[0];

    if (emergingSymbol) {
      insights.push({
        type: "recommendation",
        title: `Emerging Symbol: "${emergingSymbol[0]}"`,
        description: `The symbol "${emergingSymbol[0]}" has appeared ${emergingSymbol[1]} times recently. Your subconscious is emphasizing this element.`,
        confidence: 0.7,
        timeframe: "Ongoing",
        actionable: [
          `Research the symbolic meaning of "${emergingSymbol[0]}"`,
          "Reflect on what this symbol represents in your life",
          "Consider how it relates to current life situations",
        ],
        impact: "medium",
      });
    }

    return insights;
  }, [dreams, analyses]);

  // Generate personalized goals
  const personalizedGoals = useMemo((): PersonalizedGoal[] => {
    const goals: PersonalizedGoal[] = [];
    const totalDreams = dreams.length;
    const lucidDreams = dreams.filter((d) => d.category === "lucid").length;
    const analyzedDreams = analyses.length;

    // Lucid dreaming goal
    if (lucidDreams < 10) {
      goals.push({
        id: "lucid-mastery",
        title: "Lucid Dream Explorer",
        description:
          "Achieve 10 lucid dreams to unlock advanced consciousness skills",
        progress: lucidDreams,
        target: 10,
        timeRemaining: "Estimated 2-4 months",
        suggestions: [
          "Practice reality checks throughout the day",
          "Use lucid dreaming apps for reminders",
          "Try the wake-back-to-bed technique",
        ],
        category: "lucid",
      });
    }

    // Consistency goal
    const last30Days = dreams.filter((d) => {
      const dreamDate = new Date(d.created_at);
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      return dreamDate >= thirtyDaysAgo;
    }).length;

    if (last30Days < 20) {
      goals.push({
        id: "consistency-champion",
        title: "Dream Consistency Champion",
        description:
          "Record 20 dreams in 30 days for optimal pattern recognition",
        progress: last30Days,
        target: 20,
        timeRemaining: "Complete within this month",
        suggestions: [
          "Set a bedside journal for immediate recording",
          "Use voice memos for quick capture",
          "Record even fragment memories",
        ],
        category: "consistency",
      });
    }

    // Analysis goal
    const analysisRatio =
      totalDreams > 0 ? (analyzedDreams / totalDreams) * 100 : 0;
    if (analysisRatio < 80) {
      goals.push({
        id: "insight-seeker",
        title: "Dream Insight Seeker",
        description:
          "Analyze 80% of your dreams for maximum self-understanding",
        progress: Math.round(analysisRatio),
        target: 80,
        timeRemaining: "Ongoing improvement",
        suggestions: [
          "Prioritize analysis for vivid or emotional dreams",
          "Use AI analysis for quick insights",
          "Focus on recurring themes and symbols",
        ],
        category: "quality",
      });
    }

    return goals;
  }, [dreams, analyses]);

  // Wellness recommendations based on recent patterns
  const wellnessRecommendations = useMemo(() => {
    const recommendations = [];
    const recentDreams = dreams.slice(-14); // Last 14 dreams

    const emotionCounts = recentDreams.reduce(
      (acc, dream) => {
        acc[dream.emotion] = (acc[dream.emotion] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const dominantEmotion = Object.entries(emotionCounts).sort(
      ([, a], [, b]) => b - a,
    )[0];

    if (dominantEmotion) {
      const [emotion, count] = dominantEmotion;
      const percentage = Math.round((count / recentDreams.length) * 100);

      if (["anxiety", "fear", "sadness"].includes(emotion) && percentage > 40) {
        recommendations.push({
          type: "wellness",
          title: "Stress Management Focus",
          description: `${percentage}% of recent dreams show ${emotion}. Consider stress reduction techniques.`,
          icon: Shield,
          color: "text-red-400",
          actions: [
            "Practice deep breathing",
            "Try progressive muscle relaxation",
            "Consider counseling",
          ],
        });
      } else if (
        ["joy", "peace", "excitement"].includes(emotion) &&
        percentage > 50
      ) {
        recommendations.push({
          type: "wellness",
          title: "Positive Mental State",
          description: `${percentage}% of recent dreams are positive. Your mental wellness is strong.`,
          icon: Heart,
          color: "text-green-400",
          actions: [
            "Maintain current lifestyle",
            "Share techniques with others",
            "Continue good sleep hygiene",
          ],
        });
      }
    }

    return recommendations;
  }, [dreams]);

  if (!dreams.length || !analyses.length) {
    return (
      <Card
        className={`bg-gradient-to-br from-indigo-100/50 to-purple-100/50 dark:from-indigo-900/20 dark:to-purple-900/20 border-indigo-200/50 dark:border-indigo-500/20 ${className}`}
      >
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg text-gray-900 dark:text-white">
            <Brain className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Advanced AI Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-gray-600 dark:text-gray-400">
            <Brain className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">Building your profile...</p>
            <p className="text-sm">
              Record more dreams and analyses to unlock advanced AI insights,
              predictions, and personalized coaching!
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={`bg-gradient-to-br from-indigo-100/50 to-purple-100/50 dark:from-indigo-900/20 dark:to-purple-900/20 border-indigo-200/50 dark:border-indigo-500/20 ${className}`}
    >
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg text-gray-900 dark:text-white">
          <Brain className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          Advanced AI Insights
          <Badge
            variant="secondary"
            className="ml-auto bg-indigo-200/50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300"
          >
            AI Powered
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeInsightTab} onValueChange={setActiveInsightTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="predictions" className="text-xs">
              Predictions
            </TabsTrigger>
            <TabsTrigger value="goals" className="text-xs">
              Goals
            </TabsTrigger>
            <TabsTrigger value="wellness" className="text-xs">
              Wellness
            </TabsTrigger>
          </TabsList>

          {/* Predictions Tab */}
          <TabsContent value="predictions" className="space-y-4 mt-4">
            {predictiveInsights.map((insight, index) => {
              const getInsightIcon = () => {
                switch (insight.type) {
                  case "prediction":
                    return (
                      <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    );
                  case "opportunity":
                    return (
                      <Star className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                    );
                  case "warning":
                    return (
                      <Shield className="w-5 h-5 text-red-600 dark:text-red-400" />
                    );
                  case "recommendation":
                    return (
                      <Lightbulb className="w-5 h-5 text-green-600 dark:text-green-400" />
                    );
                  default:
                    return (
                      <Brain className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    );
                }
              };

              const getInsightColor = () => {
                switch (insight.type) {
                  case "prediction":
                    return "from-blue-100/70 to-blue-200/70 dark:from-blue-500/20 dark:to-blue-600/20 border-blue-300/50 dark:border-blue-500/30";
                  case "opportunity":
                    return "from-yellow-100/70 to-yellow-200/70 dark:from-yellow-500/20 dark:to-yellow-600/20 border-yellow-300/50 dark:border-yellow-500/30";
                  case "warning":
                    return "from-red-100/70 to-red-200/70 dark:from-red-500/20 dark:to-red-600/20 border-red-300/50 dark:border-red-500/30";
                  case "recommendation":
                    return "from-green-100/70 to-green-200/70 dark:from-green-500/20 dark:to-green-600/20 border-green-300/50 dark:border-green-500/30";
                  default:
                    return "from-gray-100/70 to-gray-200/70 dark:from-gray-500/20 dark:to-gray-600/20 border-gray-300/50 dark:border-gray-500/30";
                }
              };

              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`p-4 rounded-lg border bg-gradient-to-br ${getInsightColor()}`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        {getInsightIcon()}
                        <div>
                          <h3 className="font-medium text-gray-900 dark:text-white">
                            {insight.title}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge
                              variant="outline"
                              className="text-xs capitalize"
                            >
                              {insight.type}
                            </Badge>
                            <span className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {insight.timeframe}
                            </span>
                          </div>
                        </div>
                      </div>
                      <Badge
                        variant="secondary"
                        className={`text-xs ${
                          insight.impact === "high"
                            ? "bg-red-200/50 dark:bg-red-500/20 text-red-700 dark:text-red-300"
                            : insight.impact === "medium"
                              ? "bg-yellow-200/50 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-300"
                              : "bg-green-200/50 dark:bg-green-500/20 text-green-700 dark:text-green-300"
                        }`}
                      >
                        {insight.impact} impact
                      </Badge>
                    </div>

                    <p className="text-gray-700 dark:text-gray-300 text-sm">
                      {insight.description}
                    </p>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-600 dark:text-gray-400">
                          AI Confidence
                        </span>
                        <span className="text-gray-700 dark:text-gray-300">
                          {Math.round(insight.confidence * 100)}%
                        </span>
                      </div>
                      <Progress
                        value={insight.confidence * 100}
                        className="h-1"
                      />
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
                        <Target className="w-3 h-3" />
                        Recommended Actions:
                      </h4>
                      <ul className="space-y-1">
                        {insight.actionable.map((action, i) => (
                          <li
                            key={i}
                            className="text-xs text-gray-600 dark:text-gray-400 flex items-start gap-2"
                          >
                            <span className="text-indigo-600 dark:text-indigo-400 mt-1">
                              •
                            </span>
                            {action}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </motion.div>
              );
            })}

            {predictiveInsights.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Keep recording dreams to generate AI predictions!</p>
              </div>
            )}
          </TabsContent>

          {/* Goals Tab */}
          <TabsContent value="goals" className="space-y-4 mt-4">
            {personalizedGoals.map((goal, index) => {
              const getCategoryIcon = () => {
                switch (goal.category) {
                  case "lucid":
                    return <Zap className="w-4 h-4 text-yellow-400" />;
                  case "consistency":
                    return <Calendar className="w-4 h-4 text-blue-400" />;
                  case "quality":
                    return <Star className="w-4 h-4 text-purple-400" />;
                  case "wellness":
                    return <Heart className="w-4 h-4 text-green-400" />;
                  default:
                    return <Target className="w-4 h-4 text-gray-400" />;
                }
              };

              const progressPercentage = (goal.progress / goal.target) * 100;

              return (
                <motion.div
                  key={goal.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="p-4 rounded-lg border border-gray-600/30 bg-gray-800/30"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        {getCategoryIcon()}
                        <div>
                          <h3 className="font-medium text-white">
                            {goal.title}
                          </h3>
                          <p className="text-sm text-gray-400">
                            {goal.description}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {goal.progress}/{goal.target}
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Progress</span>
                        <span className="text-gray-300">
                          {Math.round(progressPercentage)}%
                        </span>
                      </div>
                      <Progress value={progressPercentage} className="h-2" />
                      <p className="text-xs text-gray-500">
                        {goal.timeRemaining}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-gray-300">
                        Suggestions:
                      </h4>
                      <ul className="space-y-1">
                        {goal.suggestions.map((suggestion, i) => (
                          <li
                            key={i}
                            className="text-xs text-gray-400 flex items-start gap-2"
                          >
                            <span className="text-indigo-400 mt-1">•</span>
                            {suggestion}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </motion.div>
              );
            })}

            {personalizedGoals.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                <Target className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>
                  All goals completed! New challenges will appear as you
                  progress.
                </p>
              </div>
            )}
          </TabsContent>

          {/* Wellness Tab */}
          <TabsContent value="wellness" className="space-y-4 mt-4">
            {wellnessRecommendations.map((rec, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-4 rounded-lg border border-gray-600/30 bg-gray-800/30"
              >
                <div className="flex items-start gap-3">
                  <rec.icon className={`w-5 h-5 ${rec.color} mt-0.5`} />
                  <div className="flex-1">
                    <h3 className="font-medium text-white mb-1">{rec.title}</h3>
                    <p className="text-sm text-gray-400 mb-3">
                      {rec.description}
                    </p>
                    <div className="space-y-1">
                      {rec.actions.map((action, i) => (
                        <p
                          key={i}
                          className="text-xs text-gray-500 flex items-center gap-2"
                        >
                          <span className="text-indigo-400">•</span>
                          {action}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}

            {wellnessRecommendations.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                <Heart className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Your dream wellness patterns look balanced!</p>
                <p className="text-sm mt-1">
                  Continue recording to get personalized wellness insights.
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
