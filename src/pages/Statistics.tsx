import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
  AreaChart,
  Area,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  CartesianGrid,
} from "recharts";

import type { Dream, DreamAnalysis } from "@/lib/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useMemo } from "react";
import React from "react";
import { Helmet } from "react-helmet-async";

// Import new modular components
import { WellnessScoreCard } from "@/components/statistics/WellnessScoreCard";
import { AchievementsGrid } from "@/components/statistics/AchievementsGrid";
import { KPIGrid } from "@/components/statistics/KPIGrid";
import { DreamCalendarHeatmap } from "@/components/statistics/DreamCalendarHeatmap";
import { PatternInsights } from "@/components/statistics/PatternInsights";

// Import new advanced components
import { SymbolNetworkGraph } from "@/components/statistics/SymbolNetworkGraph";
import { AdvancedInsights } from "@/components/statistics/AdvancedInsights";

// Import calculation utilities
import {
  calculateWellnessScore,
  calculateAchievements,
  calculateKPIs,
  generateDreamCalendar,
  generatePatternInsights,
} from "@/utils/statisticsCalculators";

import { motion } from "framer-motion";
import {
  TrendingUp,
  Calendar,
  Target,
  Hash,
  Heart,
  Sparkles,
  Lightbulb,
  Star,
} from "lucide-react";

const COLORS = [
  "#FF6B6B",
  "#4ECDC4",
  "#45B7D1",
  "#96CEB4",
  "#FFEEAD",
  "#D4A5A5",
  "#9A8C98",
  "#C9CBA3",
];

const Statistics = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch dreams - moved before early return
  const { data: dreams, isLoading: dreamsLoading } = useQuery({
    queryKey: ["dreams", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("dreams")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Dream[];
    },
    enabled: !!user?.id,
  });

  // Fetch dream analyses - moved before early return
  const { data: analyses, isLoading: analysesLoading } = useQuery({
    queryKey: ["dream-analyses", user?.id, dreams?.map((d) => d.id)],
    queryFn: async () => {
      if (!user?.id || !dreams || dreams.length === 0) return [];
      const dreamIds = dreams.map((d) => d.id);
      const { data, error } = await supabase
        .from("dream_analyses")
        .select("*")
        .in("dream_id", dreamIds);

      if (error) throw error;
      return data as DreamAnalysis[];
    },
    enabled: !!user?.id && !!dreams && dreams.length > 0,
  });

  // Calculate enhanced statistics using utility functions - moved before early return
  const statisticsData = useMemo(() => {
    if (!dreams || !analyses) {
      return {
        wellness: {
          overall: 0,
          emotional: 0,
          consistency: 0,
          quality: 0,
          trends: { weekly: 0, monthly: 0 },
        },
        achievements: [],
        kpis: [],
        insights: [],
        calendar: [],
      };
    }

    const wellness = calculateWellnessScore(dreams, analyses);
    const achievements = calculateAchievements(dreams, analyses);
    const kpis = calculateKPIs(dreams, analyses, wellness);
    const calendar = generateDreamCalendar(dreams);
    const insights = generatePatternInsights(dreams, analyses);

    return {
      wellness,
      achievements,
      kpis,
      insights,
      calendar,
    };
  }, [dreams, analyses]);

  // Redirect if not authenticated
  if (!user) {
    toast({
      variant: "destructive",
      title: "Authentication required",
      description: "Please log in to view your dream statistics.",
    });
    return <Navigate to="/auth" replace />;
  }

  const isLoading = dreamsLoading || analysesLoading;

  // Legacy calculations for existing charts (keeping your original logic)
  const totalDreams = dreams?.length || 0;

  // Category distribution
  const categoryData = dreams?.reduce(
    (acc, dream) => {
      acc[dream.category] = (acc[dream.category] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const categoryChartData = Object.entries(categoryData || {}).map(
    ([name, value]) => ({
      name,
      value,
      percentage: ((value / totalDreams) * 100).toFixed(1),
    }),
  );

  // Emotion distribution
  const emotionData = dreams?.reduce(
    (acc, dream) => {
      acc[dream.emotion] = (acc[dream.emotion] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const emotionChartData = Object.entries(emotionData || {}).map(
    ([name, value]) => ({
      name,
      value,
      percentage: ((value / totalDreams) * 100).toFixed(1),
    }),
  );

  // Dreams over time (last 30 days)
  const last30Days = Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - i);
    return date.toISOString().split("T")[0];
  }).reverse();

  const dreamsOverTime = last30Days.map((date) => {
    const count =
      dreams?.filter((dream) => dream.created_at.split("T")[0] === date)
        .length || 0;

    return {
      date,
      count,
      displayDate: new Date(date).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
    };
  });

  // Categories over time
  const categoriesOverTime = last30Days.map((date) => {
    const dayDreams =
      dreams?.filter((dream) => dream.created_at.split("T")[0] === date) || [];

    const result: Record<string, any> = { date };

    ["nightmare", "lucid", "recurring", "prophetic", "normal"].forEach(
      (category) => {
        result[category] = dayDreams.filter(
          (dream) => dream.category === category,
        ).length;
      },
    );

    return result;
  });

  // Extract themes and symbols from analyses
  const allThemes =
    analyses?.flatMap((analysis) => analysis.themes || []) || [];
  const allSymbols =
    analyses?.flatMap((analysis) => analysis.symbols || []) || [];

  // Count themes and symbols frequency
  const themesFrequency = allThemes.reduce(
    (acc, theme) => {
      acc[theme] = (acc[theme] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const symbolsFrequency = allSymbols.reduce(
    (acc, symbol) => {
      acc[symbol] = (acc[symbol] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  // Sort and get top themes and symbols
  const topThemes = Object.entries(themesFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, value]) => ({
      name,
      value,
      percentage: ((value / allThemes.length) * 100).toFixed(1),
    }));

  const topSymbols = Object.entries(symbolsFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, value]) => ({
      name,
      value,
      percentage: ((value / allSymbols.length) * 100).toFixed(1),
    }));

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-muted-foreground">
            Loading your dream analytics...
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Rem</title>
      </Helmet>
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-3xl md:text-4xl font-bold mb-6 text-purple-600 dark:text-purple-400">
          Dream Analytics Dashboard
        </h1>

        {/* Tab navigation for desktop, hidden on mobile */}
        <div className="hidden md:block mb-6">
          <div className="flex w-full rounded-md bg-muted p-1">
            <button
              onClick={() => setActiveTab("overview")}
              className={`flex-1 rounded-sm py-2 text-sm font-medium transition-all duration-300 focus:outline-none focus-visible:ring-0 focus:ring-0 outline-none ${
                activeTab === "overview"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab("wellness")}
              className={`flex-1 rounded-sm py-2 text-sm font-medium transition-all duration-300 focus:outline-none focus-visible:ring-0 focus:ring-0 outline-none ${
                activeTab === "wellness"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Wellness & Insights
            </button>
            <button
              onClick={() => setActiveTab("insights")}
              className={`flex-1 rounded-sm py-2 text-sm font-medium transition-all duration-300 focus:outline-none focus-visible:ring-0 focus:ring-0 outline-none ${
                activeTab === "insights"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Patterns & Insights
            </button>
            <button
              onClick={() => setActiveTab("calendar")}
              className={`flex-1 rounded-sm py-2 text-sm font-medium transition-all duration-300 focus:outline-none focus-visible:ring-0 focus:ring-0 outline-none ${
                activeTab === "calendar"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Calendar View
            </button>
            <button
              onClick={() => setActiveTab("advanced")}
              className={`flex-1 rounded-sm py-2 text-sm font-medium transition-all duration-300 focus:outline-none focus-visible:ring-0 focus:ring-0 outline-none ${
                activeTab === "advanced"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Advanced AI
            </button>
          </div>
        </div>

        {/* Dropdown navigation for mobile, hidden on desktop */}
        <div className="md:hidden mb-6">
          <Select value={activeTab} onValueChange={setActiveTab}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select View" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="overview">Overview</SelectItem>
              <SelectItem value="wellness">Wellness & Insights</SelectItem>
              <SelectItem value="insights">Patterns & Insights</SelectItem>
              <SelectItem value="calendar">Calendar View</SelectItem>
              <SelectItem value="advanced">Advanced AI</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* OVERVIEW TAB - Enhanced with new components */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* KPI Grid */}
            <KPIGrid kpis={statisticsData.kpis} />

            {/* Main Overview Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="px-3 md:px-6 py-4 md:py-6">
                  <CardTitle className="text-base md:text-lg">
                    Dreams Over Time
                  </CardTitle>
                  <CardDescription>Past 30 days</CardDescription>
                </CardHeader>
                <CardContent className="h-[250px] md:h-[300px] px-2 md:px-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dreamsOverTime}>
                      <defs>
                        <linearGradient
                          id="colorCount"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#4ECDC4"
                            stopOpacity={0.8}
                          />
                          <stop
                            offset="95%"
                            stopColor="#4ECDC4"
                            stopOpacity={0.1}
                          />
                        </linearGradient>
                      </defs>
                      <XAxis
                        dataKey="displayDate"
                        tick={{ fontSize: 10, fill: "currentColor" }}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fontSize: 10, fill: "currentColor" }}
                      />
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        opacity={0.3}
                        className="stroke-gray-300 dark:stroke-gray-600"
                      />
                      <Tooltip
                        labelFormatter={(value) => `Date: ${value}`}
                        formatter={(value: number) => [
                          `${value} dreams`,
                          "Count",
                        ]}
                        contentStyle={{
                          backgroundColor: "hsl(var(--background))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "6px",
                          color: "hsl(var(--foreground))",
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="count"
                        stroke="#4ECDC4"
                        fillOpacity={1}
                        fill="url(#colorCount)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="px-3 md:px-6 py-4 md:py-6">
                  <CardTitle className="text-base md:text-lg">
                    Dream Categories Distribution
                  </CardTitle>
                  <CardDescription>Types of dreams recorded</CardDescription>
                </CardHeader>
                <CardContent className="h-[250px] md:h-[300px] px-2 md:px-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryChartData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ name, percent }) =>
                          `${name} ${(percent * 100).toFixed(0)}%`
                        }
                      >
                        {categoryChartData.map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value, name) => [
                          `${value} dreams (${categoryChartData.find((item) => item.name === name)?.percentage || 0}%)`,
                          name,
                        ]}
                        contentStyle={{
                          backgroundColor: "hsl(var(--background))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "6px",
                          color: "hsl(var(--foreground))",
                        }}
                      />
                      <Legend
                        wrapperStyle={{
                          fontSize: "10px",
                          color: "currentColor",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* WELLNESS & INSIGHTS TAB - New enhanced tab */}
        {activeTab === "wellness" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Wellness Score - takes 1 column */}
              <WellnessScoreCard wellness={statisticsData.wellness} />

              {/* Achievements - takes 2 columns */}
              <div className="lg:col-span-2">
                <AchievementsGrid achievements={statisticsData.achievements} />
              </div>
            </div>

            {/* Pattern Insights */}
            <PatternInsights insights={statisticsData.insights} />
          </div>
        )}

        {/* PATTERNS & INSIGHTS TAB */}
        {activeTab === "insights" && (
          <div className="space-y-6">
            {/* Quick Insights Summary - moved to top */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="bg-gradient-to-br from-indigo-100/50 to-cyan-100/50 dark:from-indigo-900/20 dark:to-cyan-900/20 border-indigo-200/50 dark:border-indigo-500/20">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg text-gray-900 dark:text-white">
                    <Lightbulb className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    Pattern Insights Summary
                  </CardTitle>
                  <CardDescription className="text-gray-600 dark:text-gray-400">
                    Key insights from your dream patterns
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-lg bg-gray-100/70 dark:bg-gray-800/30 border border-gray-200/50 dark:border-gray-600/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Star className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Most Active Theme
                        </span>
                      </div>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {topThemes[0]?.name || "N/A"}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {topThemes[0]?.value || 0} occurrences
                      </p>
                    </div>

                    <div className="p-4 rounded-lg bg-gray-100/70 dark:bg-gray-800/30 border border-gray-200/50 dark:border-gray-600/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Dominant Symbol
                        </span>
                      </div>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {topSymbols[0]?.name || "N/A"}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {topSymbols[0]?.value || 0} appearances
                      </p>
                    </div>

                    <div className="p-4 rounded-lg bg-gray-100/70 dark:bg-gray-800/30 border border-gray-200/50 dark:border-gray-600/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Heart className="w-4 h-4 text-pink-600 dark:text-pink-400" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Primary Emotion
                        </span>
                      </div>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {emotionChartData[0]?.name || "N/A"}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {emotionChartData[0]?.percentage || 0}% of dreams
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Recurring Patterns Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-2 mb-4">
                <Target className="w-5 h-5 text-green-600 dark:text-green-400" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Recurring Patterns
                </h2>
              </div>

              {/* Themes and Symbols Row */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6">
                <Card className="bg-gradient-to-br from-green-50/80 to-emerald-50/80 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200/50 dark:border-green-500/20">
                  <CardHeader className="pb-3 px-3 md:px-6 py-3 md:py-4">
                    <CardTitle className="flex items-center gap-2 text-base md:text-lg text-gray-900 dark:text-white">
                      <Hash className="w-4 h-4 md:w-5 md:h-5 text-green-600 dark:text-green-400" />
                      Top Recurring Themes
                    </CardTitle>
                    <CardDescription className="text-sm text-gray-600 dark:text-gray-400">
                      Most frequent themes across your dreams
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="h-[250px] md:h-[300px] px-1 md:px-6">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={topThemes}
                        layout="vertical"
                        margin={{ left: 5, right: 10, top: 5, bottom: 5 }}
                      >
                        <XAxis
                          type="number"
                          tick={{ fontSize: 9, fill: "currentColor" }}
                        />
                        <YAxis
                          type="category"
                          dataKey="name"
                          tick={{ fontSize: 9, fill: "currentColor" }}
                          width={100}
                        />
                        <CartesianGrid
                          strokeDasharray="3 3"
                          horizontal={false}
                          opacity={0.3}
                          className="stroke-gray-300 dark:stroke-gray-600"
                        />
                        <Tooltip
                          formatter={(value: number, name, props) => {
                            const item = props.payload;
                            return [
                              `${value} occurrences (${item.percentage}%)`,
                              "Frequency",
                            ];
                          }}
                          contentStyle={{
                            backgroundColor: "hsl(var(--background))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "6px",
                            fontSize: "12px",
                            color: "hsl(var(--foreground))",
                          }}
                        />
                        <Bar
                          dataKey="value"
                          fill="#4ECDC4"
                          radius={[0, 4, 4, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-purple-50/80 to-pink-50/80 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200/50 dark:border-purple-500/20">
                  <CardHeader className="pb-3 px-3 md:px-6 py-3 md:py-4">
                    <CardTitle className="flex items-center gap-2 text-base md:text-lg text-gray-900 dark:text-white">
                      <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-purple-600 dark:text-purple-400" />
                      Top Recurring Symbols
                    </CardTitle>
                    <CardDescription className="text-sm text-gray-600 dark:text-gray-400">
                      Most significant symbols in your dreams
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="h-[250px] md:h-[300px] px-1 md:px-6">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={topSymbols}
                        layout="vertical"
                        margin={{ left: 5, right: 10, top: 5, bottom: 5 }}
                      >
                        <XAxis
                          type="number"
                          tick={{ fontSize: 9, fill: "currentColor" }}
                        />
                        <YAxis
                          type="category"
                          dataKey="name"
                          tick={{ fontSize: 9, fill: "currentColor" }}
                          width={100}
                        />
                        <CartesianGrid
                          strokeDasharray="3 3"
                          horizontal={false}
                          opacity={0.3}
                          className="stroke-gray-300 dark:stroke-gray-600"
                        />
                        <Tooltip
                          formatter={(value: number, name, props) => {
                            const item = props.payload;
                            return [
                              `${value} occurrences (${item.percentage}%)`,
                              "Frequency",
                            ];
                          }}
                          contentStyle={{
                            backgroundColor: "hsl(var(--background))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "6px",
                            fontSize: "12px",
                            color: "hsl(var(--foreground))",
                          }}
                        />
                        <Bar
                          dataKey="value"
                          fill="#FF6B6B"
                          radius={[0, 4, 4, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </motion.div>

            {/* Temporal Trends & Emotional Patterns Side-by-Side */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Trends & Emotional Patterns
                </h2>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6">
                {/* Temporal Trends */}
                <Card className="bg-gradient-to-br from-blue-50/80 to-purple-50/80 dark:from-blue-900/20 dark:to-purple-900/20 border-blue-200/50 dark:border-blue-500/20">
                  <CardHeader className="pb-3 px-3 md:px-6 py-3 md:py-4">
                    <CardTitle className="flex items-center gap-2 text-base md:text-lg text-gray-900 dark:text-white">
                      <Calendar className="w-4 h-4 md:w-5 md:h-5 text-blue-600 dark:text-blue-400" />
                      Dream Categories Over Time
                    </CardTitle>
                    <CardDescription className="text-sm text-gray-600 dark:text-gray-400">
                      How different dream types evolve across time
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="h-[300px] md:h-[350px] px-1 md:px-6">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={categoriesOverTime}
                        margin={{ left: 10, right: 10, top: 20, bottom: 5 }}
                      >
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 9, fill: "currentColor" }}
                          interval="preserveStartEnd"
                          tickFormatter={(value) =>
                            new Date(value).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                            })
                          }
                        />
                        <YAxis
                          allowDecimals={false}
                          tick={{ fontSize: 9, fill: "currentColor" }}
                        />
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                          opacity={0.3}
                          className="stroke-gray-300 dark:stroke-gray-600"
                        />
                        <Tooltip
                          labelFormatter={(value) =>
                            new Date(value).toLocaleDateString()
                          }
                          formatter={(value: number, name: string) => [
                            `${value} dreams`,
                            name,
                          ]}
                          contentStyle={{
                            backgroundColor: "hsl(var(--background))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "6px",
                            fontSize: "12px",
                            color: "hsl(var(--foreground))",
                          }}
                        />
                        <Legend
                          verticalAlign="top"
                          height={20}
                          wrapperStyle={{
                            fontSize: "10px",
                            color: "currentColor",
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="nightmare"
                          stroke="#FF6B6B"
                          dot={false}
                          strokeWidth={2}
                        />
                        <Line
                          type="monotone"
                          dataKey="lucid"
                          stroke="#4ECDC4"
                          dot={false}
                          strokeWidth={2}
                        />
                        <Line
                          type="monotone"
                          dataKey="recurring"
                          stroke="#45B7D1"
                          dot={false}
                          strokeWidth={2}
                        />
                        <Line
                          type="monotone"
                          dataKey="prophetic"
                          stroke="#D4A5A5"
                          dot={false}
                          strokeWidth={2}
                        />
                        <Line
                          type="monotone"
                          dataKey="normal"
                          stroke="#9A8C98"
                          dot={false}
                          strokeWidth={2}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Emotion Radar Chart */}
                <Card className="bg-gradient-to-br from-pink-50/80 to-rose-50/80 dark:from-pink-900/20 dark:to-rose-900/20 border-pink-200/50 dark:border-pink-500/20">
                  <CardHeader className="pb-3 px-3 md:px-6 py-3 md:py-4">
                    <CardTitle className="flex items-center gap-2 text-base md:text-lg text-gray-900 dark:text-white">
                      <Heart className="w-4 h-4 md:w-5 md:h-5 text-pink-600 dark:text-pink-400" />
                      Emotion Distribution Radar
                    </CardTitle>
                    <CardDescription className="text-sm text-gray-600 dark:text-gray-400">
                      Comprehensive view of your emotional patterns
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="h-[300px] md:h-[350px] px-1 md:px-6">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart outerRadius={100} data={emotionChartData}>
                        <PolarGrid
                          gridType="polygon"
                          className="stroke-gray-300 dark:stroke-gray-600"
                        />
                        <PolarAngleAxis
                          dataKey="name"
                          tick={{ fontSize: 10, fill: "currentColor" }}
                        />
                        <PolarRadiusAxis
                          angle={30}
                          domain={[0, "auto"]}
                          tick={{ fontSize: 8, fill: "currentColor" }}
                        />
                        <Radar
                          name="Dreams"
                          dataKey="value"
                          stroke="#FF6B6B"
                          fill="#FF6B6B"
                          fillOpacity={0.3}
                          strokeWidth={2}
                        />
                        <Tooltip
                          formatter={(value: number, name, props) => {
                            const item = props.payload;
                            return [
                              `${value} dreams (${item.percentage}%)`,
                              item.name,
                            ];
                          }}
                          contentStyle={{
                            backgroundColor: "hsl(var(--background))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "6px",
                            fontSize: "12px",
                            color: "hsl(var(--foreground))",
                          }}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          </div>
        )}

        {/* CALENDAR VIEW TAB - New enhanced calendar */}
        {activeTab === "calendar" && (
          <div className="space-y-6">
            <DreamCalendarHeatmap data={statisticsData.calendar} />

            {/* Additional calendar insights */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Weekly Patterns</CardTitle>
                  <CardDescription>
                    Dream frequency by day of the week
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        {
                          day: "Sun",
                          count:
                            dreams?.filter(
                              (d) => new Date(d.created_at).getDay() === 0,
                            ).length || 0,
                        },
                        {
                          day: "Mon",
                          count:
                            dreams?.filter(
                              (d) => new Date(d.created_at).getDay() === 1,
                            ).length || 0,
                        },
                        {
                          day: "Tue",
                          count:
                            dreams?.filter(
                              (d) => new Date(d.created_at).getDay() === 2,
                            ).length || 0,
                        },
                        {
                          day: "Wed",
                          count:
                            dreams?.filter(
                              (d) => new Date(d.created_at).getDay() === 3,
                            ).length || 0,
                        },
                        {
                          day: "Thu",
                          count:
                            dreams?.filter(
                              (d) => new Date(d.created_at).getDay() === 4,
                            ).length || 0,
                        },
                        {
                          day: "Fri",
                          count:
                            dreams?.filter(
                              (d) => new Date(d.created_at).getDay() === 5,
                            ).length || 0,
                        },
                        {
                          day: "Sat",
                          count:
                            dreams?.filter(
                              (d) => new Date(d.created_at).getDay() === 6,
                            ).length || 0,
                        },
                      ]}
                    >
                      <XAxis
                        dataKey="day"
                        tick={{ fontSize: 10, fill: "currentColor" }}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fontSize: 10, fill: "currentColor" }}
                      />
                      <CartesianGrid
                        strokeDasharray="3 3"
                        opacity={0.3}
                        className="stroke-gray-300 dark:stroke-gray-600"
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--background))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "6px",
                          color: "hsl(var(--foreground))",
                        }}
                      />
                      <Bar dataKey="count" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Monthly Trends</CardTitle>
                  <CardDescription>
                    Dream activity over the past year
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={Array.from({ length: 12 }, (_, i) => {
                        const month = new Date();
                        month.setMonth(month.getMonth() - (11 - i));
                        const monthStr = month.toISOString().slice(0, 7);
                        return {
                          month: month.toLocaleDateString(undefined, {
                            month: "short",
                          }),
                          count:
                            dreams?.filter(
                              (d) => d.created_at.slice(0, 7) === monthStr,
                            ).length || 0,
                        };
                      })}
                    >
                      <XAxis
                        dataKey="month"
                        tick={{ fontSize: 10, fill: "currentColor" }}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fontSize: 10, fill: "currentColor" }}
                      />
                      <CartesianGrid
                        strokeDasharray="3 3"
                        opacity={0.3}
                        className="stroke-gray-300 dark:stroke-gray-600"
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--background))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "6px",
                          color: "hsl(var(--foreground))",
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="count"
                        stroke="#82ca9d"
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* ADVANCED AI TAB - New impressive advanced features */}
        {activeTab === "advanced" && (
          <div className="space-y-6">
            {/* Advanced AI Insights */}
            <AdvancedInsights dreams={dreams || []} analyses={analyses || []} />

            {/* Symbol Network Graph */}
            <SymbolNetworkGraph analyses={analyses || []} />
          </div>
        )}
      </div>
    </>
  );
};

export default Statistics;
