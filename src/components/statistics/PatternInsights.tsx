import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Lightbulb,
  TrendingUp,
  RotateCcw,
  AlertTriangle,
  Activity,
} from "lucide-react";
import type { PatternInsight } from "@/types/statistics";

interface PatternInsightsProps {
  insights: PatternInsight[];
  className?: string;
}

export const PatternInsights = ({
  insights,
  className,
}: PatternInsightsProps) => {
  const getInsightIcon = (type: PatternInsight["type"]) => {
    switch (type) {
      case "trend":
        return <TrendingUp className="w-5 h-5 text-blue-400" />;
      case "cycle":
        return <RotateCcw className="w-5 h-5 text-green-400" />;
      case "anomaly":
        return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
      case "correlation":
        return <Activity className="w-5 h-5 text-purple-400" />;
      default:
        return <Lightbulb className="w-5 h-5 text-gray-400" />;
    }
  };

  const getInsightColor = (type: PatternInsight["type"]) => {
    switch (type) {
      case "trend":
        return "from-blue-500/20 to-blue-600/20 border-blue-500/30";
      case "cycle":
        return "from-green-500/20 to-green-600/20 border-green-500/30";
      case "anomaly":
        return "from-yellow-500/20 to-yellow-600/20 border-yellow-500/30";
      case "correlation":
        return "from-purple-500/20 to-purple-600/20 border-purple-500/30";
      default:
        return "from-gray-500/20 to-gray-600/20 border-gray-500/30";
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8)
      return "bg-green-500/20 text-green-400 border-green-500/30";
    if (confidence >= 0.6)
      return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    return "bg-red-500/20 text-red-400 border-red-500/30";
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return "High";
    if (confidence >= 0.6) return "Medium";
    return "Low";
  };

  if (insights.length === 0) {
    return (
      <Card
        className={`bg-gradient-to-br from-gray-900/20 to-slate-800/20 border-gray-500/20 ${className}`}
      >
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Lightbulb className="w-5 h-5 text-gray-400" />
            Pattern Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-400">
            <Lightbulb className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Keep recording dreams to discover patterns!</p>
            <p className="text-sm mt-1">
              AI insights will appear as you build your dream journal.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={`bg-gradient-to-br from-indigo-900/20 to-purple-900/20 border-indigo-500/20 ${className}`}
    >
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Lightbulb className="w-5 h-5 text-indigo-400" />
          Pattern Insights
          <Badge variant="secondary" className="ml-auto">
            {insights.length} {insights.length === 1 ? "insight" : "insights"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {insights.map((insight, index) => (
            <motion.div
              key={`${insight.type}-${index}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`p-4 rounded-lg border bg-gradient-to-br ${getInsightColor(insight.type)}`}
            >
              <div className="space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {getInsightIcon(insight.type)}
                    <div>
                      <h3 className="font-medium text-white">
                        {insight.title}
                      </h3>
                      <Badge
                        variant="outline"
                        className={`text-xs mt-1 ${getConfidenceColor(insight.confidence)}`}
                      >
                        {getConfidenceLabel(insight.confidence)} confidence
                      </Badge>
                    </div>
                  </div>
                  <Badge variant="secondary" className="capitalize text-xs">
                    {insight.type}
                  </Badge>
                </div>

                {/* Description */}
                <p className="text-gray-300 text-sm leading-relaxed">
                  {insight.description}
                </p>

                {/* Actionable Recommendation */}
                {insight.actionable && (
                  <div className="mt-3 p-3 bg-white/5 rounded-md border border-white/10">
                    <div className="flex items-start gap-2">
                      <Lightbulb className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="text-xs font-medium text-yellow-400 mb-1">
                          Recommendation
                        </div>
                        <p className="text-xs text-gray-300">
                          {insight.actionable}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Confidence Bar */}
                <div className="pt-2">
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>Confidence Level</span>
                    <span>{Math.round(insight.confidence * 100)}%</span>
                  </div>
                  <div className="w-full bg-gray-700/50 rounded-full h-1.5">
                    <motion.div
                      className={`h-1.5 rounded-full ${
                        insight.confidence >= 0.8
                          ? "bg-green-500"
                          : insight.confidence >= 0.6
                            ? "bg-yellow-500"
                            : "bg-red-500"
                      }`}
                      initial={{ width: 0 }}
                      animate={{ width: `${insight.confidence * 100}%` }}
                      transition={{ delay: index * 0.1 + 0.3, duration: 0.8 }}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Call to Action */}
        <div className="mt-6 p-4 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-lg border border-indigo-500/20">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-500/20 rounded-full flex items-center justify-center">
              <Lightbulb className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-medium text-white">
                Want deeper insights?
              </h4>
              <p className="text-xs text-gray-400">
                Keep recording dreams regularly to unlock more detailed pattern
                analysis.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
