import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  AreaChart,
  Area
} from "recharts";
import { 
  MoonIcon, 
  CalendarIcon, 
  ClockIcon, 
  BrainIcon,
  TagIcon,
  HeartIcon,
  TrendingUpIcon,
  FilterIcon,
  AlertTriangleIcon,
  StarIcon,
  CloudIcon,
  SunIcon,
  BedIcon,
  InfoIcon
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useNavigate } from "react-router-dom";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
  CardFooter 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Mock data - this would come from your API in a real app
const mockDreamData = {
  totalDreams: 124,
  daysLogged: 87,
  totalTags: 312,
  avgDreamsPerWeek: 3.4,
  avgLucidity: 42,
  lastMonthCount: 18,
  monthlyGrowth: 24,
  
  dreamsOverTime: [
    { month: 'Jan', count: 8 },
    { month: 'Feb', count: 12 },
    { month: 'Mar', count: 9 },
    { month: 'Apr', count: 15 },
    { month: 'May', count: 11 },
    { month: 'Jun', count: 13 },
    { month: 'Jul', count: 17 },
    { month: 'Aug', count: 18 },
    { month: 'Sep', count: 21 },
  ],
  
  tagDistribution: [
    { name: 'Flying', value: 28 },
    { name: 'Water', value: 22 },
    { name: 'Chase', value: 17 },
    { name: 'Family', value: 15 },
    { name: 'Falling', value: 12 },
    { name: 'School', value: 10 },
    { name: 'Work', value: 9 },
    { name: 'Animals', value: 7 },
  ],
  
  emotionBreakdown: [
    { name: 'Joy', value: 35 },
    { name: 'Fear', value: 25 },
    { name: 'Surprise', value: 18 },
    { name: 'Sadness', value: 12 },
    { name: 'Anger', value: 8 },
    { name: 'Disgust', value: 2 },
  ],
  
  dreamsByTimeOfDay: [
    { time: 'Early Morning (4-6AM)', count: 52 },
    { time: 'Morning (6-9AM)', count: 38 },
    { time: 'Late Morning (9-12PM)', count: 12 },
    { time: 'Afternoon (12-5PM)', count: 5 },
    { time: 'Evening (5-9PM)', count: 2 },
    { time: 'Night (9PM-4AM)', count: 15 },
  ],
  
  lucidityTrend: [
    { month: 'Jan', score: 15 },
    { month: 'Feb', score: 22 },
    { month: 'Mar', score: 28 },
    { month: 'Apr', score: 32 },
    { month: 'May', score: 37 },
    { month: 'Jun', score: 42 },
    { month: 'Jul', score: 48 },
    { month: 'Aug', score: 53 },
    { month: 'Sep', score: 58 },
  ],
  
  recallQuality: [
    { month: 'Jan', value: 30 },
    { month: 'Feb', value: 35 },
    { month: 'Mar', value: 38 },
    { month: 'Apr', value: 42 },
    { month: 'May', value: 45 },
    { month: 'Jun', value: 50 },
    { month: 'Jul', value: 55 },
    { month: 'Aug', value: 62 },
    { month: 'Sep', value: 68 },
  ],
  
  tagCorrelations: [
    { subject: 'Flying', A: 65, fullMark: 100 },
    { subject: 'Lucidity', A: 78, fullMark: 100 },
    { subject: 'Joy', A: 72, fullMark: 100 },
    { subject: 'Vivid', A: 80, fullMark: 100 },
    { subject: 'Freedom', A: 68, fullMark: 100 },
    { subject: 'Nature', A: 45, fullMark: 100 },
  ],
  
  tagFrequencyByMonth: [
    { month: 'Apr', Flying: 4, Water: 2, Chase: 1, Family: 3, Falling: 2 },
    { month: 'May', Flying: 3, Water: 4, Chase: 2, Family: 1, Falling: 1 },
    { month: 'Jun', Flying: 5, Water: 3, Chase: 3, Family: 2, Falling: 0 },
    { month: 'Jul', Flying: 7, Water: 5, Chase: 4, Family: 1, Falling: 3 },
    { month: 'Aug', Flying: 6, Water: 4, Chase: 3, Family: 4, Falling: 2 },
    { month: 'Sep', Flying: 7, Water: 6, Chase: 5, Family: 3, Falling: 4 },
  ],
  
  popularTags: [
    "flying", "water", "chase", "family", "falling", "school", "work", 
    "animals", "childhood", "nature", "space", "celebrity", "romantic", 
    "food", "travel", "supernatural", "lucid", "nightmare"
  ],
  
  dreamsDayOfWeek: [
    { day: 'Mon', count: 15 },
    { day: 'Tue', count: 18 },
    { day: 'Wed', count: 12 },
    { day: 'Thu', count: 22 },
    { day: 'Fri', count: 21 },
    { day: 'Sat', count: 26 },
    { day: 'Sun', count: 10 },
  ],
  
  emotionsByMonth: [
    { month: 'Apr', Joy: 8, Fear: 4, Surprise: 3, Sadness: 2 },
    { month: 'May', Joy: 7, Fear: 5, Surprise: 4, Sadness: 3 },
    { month: 'Jun', Joy: 9, Fear: 3, Surprise: 5, Sadness: 1 },
    { month: 'Jul', Joy: 8, Fear: 6, Surprise: 2, Sadness: 4 },
    { month: 'Aug', Joy: 10, Fear: 5, Surprise: 4, Sadness: 2 },
    { month: 'Sep', Joy: 12, Fear: 4, Surprise: 6, Sadness: 1 },
  ],
  
  sleepQualityCorrelation: [
    { quality: 'Poor', lucidity: 15, recall: 20, emotionalIntensity: 60 },
    { quality: 'Fair', lucidity: 30, recall: 35, emotionalIntensity: 50 },
    { quality: 'Good', lucidity: 50, recall: 65, emotionalIntensity: 40 },
    { quality: 'Excellent', lucidity: 75, recall: 85, emotionalIntensity: 30 },
  ],
  
  insightsSuggestions: [
    "Your flying dreams often correlate with periods of increased confidence in your waking life",
    "Dreams featuring water appear more frequently during times of emotional change",
    "Chase dreams tend to occur more often during periods of work-related stress",
    "Your dream recall quality has improved by 56% since you started journaling",
    "Dreams with family members are most vivid during weekends",
    "You experience more lucid dreams after days with regular meditation",
    "Nightmare frequency decreases significantly when you avoid screen time before bed",
    "Your most creative dream ideas occur during REM periods between 4-6 AM"
  ]
};

// Color palettes
const COLORS = ['#8b5cf6', '#6366f1', '#a78bfa', '#818cf8', '#c4b5fd', '#a5b4fc', '#ddd6fe', '#e0e7ff'];
const EMOTION_COLORS = {
  Joy: '#9333ea',
  Fear: '#4f46e5',
  Surprise: '#8b5cf6',
  Sadness: '#4338ca',
  Anger: '#6d28d9',
  Disgust: '#5b21b6'
};

// Helper function to filter data by selected tag
const filterDataByTag = (data, tag) => {
  // In a real app, this would filter the data based on the selected tag
  // For now, we'll just return the same data
  return data;
};

const Statistics = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState("6month");
  const [selectedTag, setSelectedTag] = useState("all");
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    document.title = "Rem | Dream Statistics";
  }, []);

  // Animation variants
  const fadeIn = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5 }
  };

  const staggerContainer = {
    animate: { transition: { staggerChildren: 0.1 } }
  };

  // Fetch user's dreams data with React Query
  const { data: dreamsData, isLoading } = useQuery({
    queryKey: ['dreams-stats', user?.id, timeRange],
    queryFn: async () => {
      if (!user) {
        // Return mock data for non-authenticated users
        return mockDreamData;
      }

      // In a real app, this would fetch from your API or database
      // For now, we'll use mock data but pretend we're filtering by timeRange
      return mockDreamData;
    },
    enabled: true, // Always enabled to show demo data
  });

  // Derived statistics
  const allTags = dreamsData?.tagDistribution.map(tag => tag.name) || [];
  const filteredData = selectedTag === "all" 
    ? dreamsData 
    : filterDataByTag(dreamsData, selectedTag);

  // Handle tag selection
  const handleTagChange = (tag) => {
    setSelectedTag(tag);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-950/90 via-purple-900/80 to-indigo-950/90 text-white">
      <div className="container mx-auto px-4 py-12">
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="max-w-7xl mx-auto"
        >
          {/* Header and intro */}
          <motion.div variants={fadeIn} className="mb-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
              <div>
                <h1 className="text-4xl font-bold text-purple-100 mb-2">Dream Insights</h1>
                <p className="text-purple-300">Discover patterns and trends in your dream journal</p>
              </div>
              
              {!isAuthenticated && (
                <Button 
                  onClick={() => navigate("/auth")}
                  className="mt-4 md:mt-0 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700"
                >
                  Sign In for Personal Stats
                </Button>
              )}
            </div>
            
            {!isAuthenticated && (
              <motion.div 
                variants={fadeIn}
                className="bg-indigo-900/50 border border-purple-500/30 p-4 rounded-lg text-purple-200 mb-6"
              >
                <p className="flex items-center gap-2">
                  <InfoIcon size={18} className="text-purple-300" />
                  Currently viewing demo data. Sign in to see your personal dream statistics.
                </p>
              </motion.div>
            )}
          </motion.div>

          {/* Filter Controls */}
          <motion.div 
            variants={fadeIn} 
            className="mb-8 p-6 rounded-xl bg-indigo-950/50 border border-purple-500/20 backdrop-blur-sm flex flex-col lg:flex-row gap-4 justify-between items-center"
          >
            <div className="flex items-center gap-2">
              <FilterIcon className="text-purple-300" />
              <h3 className="text-lg font-medium text-purple-100">Filter Insights</h3>
            </div>
            <div className="flex flex-wrap gap-4">
              <Select 
                value={timeRange} 
                onValueChange={setTimeRange} 
              >
                <SelectTrigger className="w-[180px] bg-indigo-900/50 border-purple-500/30 text-purple-100">
                  <SelectValue placeholder="Time Range" />
                </SelectTrigger>
                <SelectContent className="bg-indigo-900 border-purple-500/30">
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="year">Past Year</SelectItem>
                  <SelectItem value="6month">Past 6 Months</SelectItem>
                  <SelectItem value="month">Past Month</SelectItem>
                  <SelectItem value="week">Past Week</SelectItem>
                </SelectContent>
              </Select>
              
              <Select 
                value={selectedTag}
                onValueChange={handleTagChange}
              >
                <SelectTrigger className="w-[180px] bg-indigo-900/50 border-purple-500/30 text-purple-100">
                  <SelectValue placeholder="Filter by Tag" />
                </SelectTrigger>
                <SelectContent className="bg-indigo-900 border-purple-500/30 max-h-[300px]">
                  <SelectItem value="all">All Tags</SelectItem>
                  {allTags.map((tag) => (
                    <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </motion.div>

          {/* Tabs Navigation */}
          <motion.div variants={fadeIn} className="mb-8">
            <Tabs defaultValue="overview" className="w-full" onValueChange={setActiveTab}>
              <TabsList className="w-full justify-start overflow-x-auto bg-indigo-950/50 border border-purple-500/20">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="tags">Tag Analysis</TabsTrigger>
                <TabsTrigger value="emotions">Emotional Patterns</TabsTrigger>
                <TabsTrigger value="time">Temporal Patterns</TabsTrigger>
                <TabsTrigger value="insights">AI Insights</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="mt-6">
                {/* Stats Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                  <motion.div variants={fadeIn} className="bg-gradient-to-br from-purple-800/20 to-indigo-900/20 p-5 rounded-xl border border-purple-500/20 backdrop-blur-sm">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-purple-300 text-sm font-medium">Total Dreams</p>
                        <h3 className="text-3xl font-bold text-purple-100 mt-1">{filteredData.totalDreams}</h3>
                      </div>
                      <div className="p-2 bg-purple-500/20 rounded-lg">
                        <MoonIcon className="h-5 w-5 text-purple-300" />
                      </div>
                    </div>
                    <p className="text-purple-400 text-sm mt-2">Across {filteredData.daysLogged} days</p>
                  </motion.div>

                  <motion.div variants={fadeIn} className="bg-gradient-to-br from-purple-800/20 to-indigo-900/20 p-5 rounded-xl border border-purple-500/20 backdrop-blur-sm">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-purple-300 text-sm font-medium">Dreams Per Week</p>
                        <h3 className="text-3xl font-bold text-purple-100 mt-1">{filteredData.avgDreamsPerWeek}</h3>
                      </div>
                      <div className="p-2 bg-purple-500/20 rounded-lg">
                        <CalendarIcon className="h-5 w-5 text-purple-300" />
                      </div>
                    </div>
                    <p className="text-green-400 text-sm mt-2">↑ {filteredData.monthlyGrowth}% vs last month</p>
                  </motion.div>

                  <motion.div variants={fadeIn} className="bg-gradient-to-br from-purple-800/20 to-indigo-900/20 p-5 rounded-xl border border-purple-500/20 backdrop-blur-sm">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-purple-300 text-sm font-medium">Unique Tags</p>
                        <h3 className="text-3xl font-bold text-purple-100 mt-1">{filteredData.totalTags}</h3>
                      </div>
                      <div className="p-2 bg-purple-500/20 rounded-lg">
                        <TagIcon className="h-5 w-5 text-purple-300" />
                      </div>
                    </div>
                    <p className="text-purple-400 text-sm mt-2">Tags per dream: 2.5 avg</p>
                  </motion.div>

                  <motion.div variants={fadeIn} className="bg-gradient-to-br from-purple-800/20 to-indigo-900/20 p-5 rounded-xl border border-purple-500/20 backdrop-blur-sm">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-purple-300 text-sm font-medium">Avg. Lucidity</p>
                        <h3 className="text-3xl font-bold text-purple-100 mt-1">{filteredData.avgLucidity}%</h3>
                      </div>
                      <div className="p-2 bg-purple-500/20 rounded-lg">
                        <BrainIcon className="h-5 w-5 text-purple-300" />
                      </div>
                    </div>
                    <div className="mt-2">
                      <Progress value={filteredData.avgLucidity} className="h-1 bg-purple-900/50" />
                    </div>
                  </motion.div>
                </div>

                {/* Main Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                  <motion.div variants={fadeIn} className="bg-indigo-950/50 border border-purple-500/20 p-6 rounded-xl backdrop-blur-sm">
                    <h3 className="text-lg font-medium text-purple-100 mb-4">Dreams Over Time</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={filteredData.dreamsOverTime}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#4c1d95" />
                        <XAxis dataKey="month" stroke="#a78bfa" />
                        <YAxis stroke="#a78bfa" />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#312e81', 
                            borderColor: '#8b5cf6',
                            color: '#e0e7ff'
                          }} 
                        />
                        <Line 
                          type="monotone" 
                          dataKey="count" 
                          name="Dreams"
                          stroke="#8b5cf6"
                          strokeWidth={2} 
                          activeDot={{ r: 8, fill: '#6d28d9' }} 
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </motion.div>

                  <motion.div variants={fadeIn} className="bg-indigo-950/50 border border-purple-500/20 p-6 rounded-xl backdrop-blur-sm">
                    <h3 className="text-lg font-medium text-purple-100 mb-4">Top Dream Tags</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={filteredData.tagDistribution}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {filteredData.tagDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ 
                            backgroundColor: '#312e81', 
                            borderColor: '#8b5cf6',
                            color: '#e0e7ff'
                          }}
                          formatter={(value, name) => [`${value} dreams`, name]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </motion.div>
                </div>

                {/* Progress Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <motion.div variants={fadeIn} className="bg-indigo-950/50 border border-purple-500/20 p-6 rounded-xl backdrop-blur-sm">
                    <h3 className="text-lg font-medium text-purple-100 mb-4">Dream Recall Quality Progress</h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <AreaChart data={filteredData.recallQuality}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#4c1d95" />
                        <XAxis dataKey="month" stroke="#a78bfa" />
                        <YAxis stroke="#a78bfa" />
                        <Tooltip
                          contentStyle={{ 
                            backgroundColor: '#312e81', 
                            borderColor: '#8b5cf6',
                            color: '#e0e7ff'
                          }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="value" 
                          name="Recall Quality"
                          stroke="#7c3aed" 
                          strokeWidth={2}
                          fill="url(#recallGradient)"
                        />
                        <defs>
                          <linearGradient id="recallGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#7c3aed" stopOpacity={0.2}/>
                          </linearGradient>
                        </defs>
                      </AreaChart>
                    </ResponsiveContainer>
                  </motion.div>

                  <motion.div variants={fadeIn} className="bg-indigo-950/50 border border-purple-500/20 p-6 rounded-xl backdrop-blur-sm">
                    <h3 className="text-lg font-medium text-purple-100 mb-4">Dreams by Day of Week</h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={filteredData.dreamsDayOfWeek}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#4c1d95" />
                        <XAxis dataKey="day" stroke="#a78bfa" />
                        <YAxis stroke="#a78bfa" />
                        <Tooltip
                          contentStyle={{ 
                            backgroundColor: '#312e81', 
                            borderColor: '#8b5cf6',
                            color: '#e0e7ff'
                          }}
                          formatter={(value, name) => [`${value} dreams`, 'Count']}
                        />
                        <Bar dataKey="count" name="Dreams" radius={[4, 4, 0, 0]}>
                          {filteredData.dreamsDayOfWeek.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </motion.div>
                </div>
              </TabsContent>

              {/* Tag Analysis Tab */}
              <TabsContent value="tags" className="mt-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                  <motion.div variants={fadeIn} className="bg-indigo-950/50 border border-purple-500/20 p-6 rounded-xl backdrop-blur-sm lg:col-span-2">
                    <h3 className="text-lg font-medium text-purple-100 mb-4">Popular Tags Cloud</h3>
                    <div className="flex flex-wrap gap-2">
                      {filteredData.popularTags.map((tag, index) => {
                        // Randomize sizes a bit for visual interest
                        const size = Math.floor(Math.random() * 3); // 0, 1, 2
                        const sizeClass = size === 0 ? "text-sm" : size === 1 ? "text-base" : "text-lg";
                        
                        return (
                          <Badge 
                            key={tag} 
                            className={`bg-purple-800/40 hover:bg-purple-700/60 text-purple-200 cursor-pointer ${sizeClass}`}
                            onClick={() => handleTagChange(tag)}
                          >
                            {tag}
                          </Badge>
                        );
                      })}
                    </div>
                  </motion.div>

                  <motion.div variants={fadeIn} className="bg-indigo-950/50 border border-purple-500/20 p-6 rounded-xl backdrop-blur-sm">
                    <h3 className="text-lg font-medium text-purple-100 mb-4">Tag Frequency Over Time</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={filteredData.tagFrequencyByMonth}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#4c1d95" />
                        <XAxis dataKey="month" stroke="#a78bfa" />
                        <YAxis stroke="#a78bfa" />
                        <Tooltip
                          contentStyle={{ 
                            backgroundColor: '#312e81', 
                            borderColor: '#8b5cf6',
                            color: '#e0e7ff'
                          }}
                        />
                        <Legend />
                        <Line type="monotone" dataKey="Flying" stroke="#8b5cf6" strokeWidth={2} />
                        <Line type="monotone" dataKey="Water" stroke="#6366f1" strokeWidth={2} />
                        <Line type="monotone" dataKey="Chase" stroke="#a78bfa" strokeWidth={2} />
                        <Line type="monotone" dataKey="Family" stroke="#818cf8" strokeWidth={2} />
                        <Line type="monotone" dataKey="Falling" stroke="#c4b5fd" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </motion.div>

                  <motion.div variants={fadeIn} className="bg-indigo-950/50 border border-purple-500/20 p-6 rounded-xl backdrop-blur-sm">
                    <h3 className="text-lg font-medium text-purple-100 mb-4">"Flying" Dream Correlations</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={filteredData.tagCorrelations}>
                        <PolarGrid stroke="#4c1d95" />
                        <PolarAngleAxis dataKey="subject" stroke="#a78bfa" />
                        <PolarRadiusAxis stroke="#a78bfa" />
                        <Radar 
                          name="Correlation" 
                          dataKey="A" 
                          stroke="#8b5cf6" 
                          fill="#8b5cf6" 
                          fillOpacity={0.6} 
                        />
                        <Tooltip
                          contentStyle={{ 
                            backgroundColor: '#312e81', 
                            borderColor: '#8b5cf6',
                            color: '#e0e7ff'
                          }}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </motion.div>
                </div>

                <motion.div variants={fadeIn} className="bg-indigo-950/50 border border-purple-500/20 p-6 rounded-xl backdrop-blur-sm mb-8">
                  <h3 className="text-lg font-medium text-purple-100 mb-4">Tag Co-occurrence</h3>
                  <p className="text-purple-300 mb-6">Tags that frequently appear together in your dreams</p>
                  
                  <div className="space-y-4">
                    <div className="p-3 bg-indigo-900/40 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-purple-700">flying</Badge>
                        <span className="text-purple-300">+</span>
                        <Badge className="bg-purple-700">freedom</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={78} className="h-1.5 w-24 bg-purple-900/50" />
                        <span className="text-purple-200 font-medium whitespace-nowrap">78% co-occurrence</span>
                      </div>
                    </div>
                    
                    <div className="p-3 bg-indigo-900/40 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-purple-700">water</Badge>
                        <span className="text-purple-300">+</span>
                        <Badge className="bg-purple-700">emotions</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={65} className="h-1.5 w-24 bg-purple-900/50" />
                        <span className="text-purple-200 font-medium whitespace-nowrap">65% co-occurrence</span>
                      </div>
                    </div>
                    
                    <div className="p-3 bg-indigo-900/40 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-purple-700">chase</Badge>
                        <span className="text-purple-300">+</span>
                        <Badge className="bg-purple-700">fear</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={59} className="h-1.5 w-24 bg-purple-900/50" />
                        <span className="text-purple-200 font-medium whitespace-nowrap">59% co-occurrence</span>
                      </div>
                    </div>
                    
                    <div className="p-3 bg-indigo-900/40 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-purple-700">family</Badge>
                        <span className="text-purple-300">+</span>
                        <Badge className="bg-purple-700">childhood</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={52} className="h-1.5 w-24 bg-purple-900/50" />
                        <span className="text-purple-200 font-medium whitespace-nowrap">52% co-occurrence</span>
                      </div>
                    </div>
                    
                    <div className="p-3 bg-indigo-900/40 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-purple-700">lucid</Badge>
                        <span className="text-purple-300">+</span>
                        <Badge className="bg-purple-700">control</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={48} className="h-1.5 w-24 bg-purple-900/50" />
                        <span className="text-purple-200 font-medium whitespace-nowrap">48% co-occurrence</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
                
                <motion.div variants={fadeIn} className="bg-indigo-950/50 border border-purple-500/20 p-6 rounded-xl backdrop-blur-sm">
                  <h3 className="text-lg font-medium text-purple-100 mb-4">Unique Tag Combinations</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="p-4 border border-purple-500/20 rounded-lg bg-indigo-900/30">
                      <div className="flex flex-wrap gap-2 mb-3">
                        <Badge className="bg-purple-700">flying</Badge>
                        <Badge className="bg-purple-700">lucid</Badge>
                        <Badge className="bg-purple-700">control</Badge>
                      </div>
                      <p className="text-sm text-purple-300">Appeared in 12 dreams</p>
                    </div>
                    
                    <div className="p-4 border border-purple-500/20 rounded-lg bg-indigo-900/30">
                      <div className="flex flex-wrap gap-2 mb-3">
                        <Badge className="bg-purple-700">water</Badge>
                        <Badge className="bg-purple-700">submerged</Badge>
                        <Badge className="bg-purple-700">breathing</Badge>
                      </div>
                      <p className="text-sm text-purple-300">Appeared in 8 dreams</p>
                    </div>
                    
                    <div className="p-4 border border-purple-500/20 rounded-lg bg-indigo-900/30">
                      <div className="flex flex-wrap gap-2 mb-3">
                        <Badge className="bg-purple-700">chase</Badge>
                        <Badge className="bg-purple-700">fear</Badge>
                        <Badge className="bg-purple-700">running</Badge>
                      </div>
                      <p className="text-sm text-purple-300">Appeared in 10 dreams</p>
                    </div>
                    
                    <div className="p-4 border border-purple-500/20 rounded-lg bg-indigo-900/30">
                      <div className="flex flex-wrap gap-2 mb-3">
                        <Badge className="bg-purple-700">family</Badge>
                        <Badge className="bg-purple-700">childhood</Badge>
                        <Badge className="bg-purple-700">home</Badge>
                      </div>
                      <p className="text-sm text-purple-300">Appeared in 7 dreams</p>
                    </div>
                    
                    <div className="p-4 border border-purple-500/20 rounded-lg bg-indigo-900/30">
                      <div className="flex flex-wrap gap-2 mb-3">
                        <Badge className="bg-purple-700">school</Badge>
                        <Badge className="bg-purple-700">exam</Badge>
                        <Badge className="bg-purple-700">stress</Badge>
                      </div>
                      <p className="text-sm text-purple-300">Appeared in 9 dreams</p>
                    </div>
                    
                    <div className="p-4 border border-purple-500/20 rounded-lg bg-indigo-900/30">
                      <div className="flex flex-wrap gap-2 mb-3">
                        <Badge className="bg-purple-700">work</Badge>
                        <Badge className="bg-purple-700">deadline</Badge>
                        <Badge className="bg-purple-700">pressure</Badge>
                      </div>
                      <p className="text-sm text-purple-300">Appeared in 6 dreams</p>
                    </div>
                  </div>
                </motion.div>
              </TabsContent>

              {/* Emotional Patterns Tab */}
              <TabsContent value="emotions" className="mt-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                  <motion.div variants={fadeIn} className="bg-indigo-950/50 border border-purple-500/20 p-6 rounded-xl backdrop-blur-sm">
                    <h3 className="text-lg font-medium text-purple-100 mb-4">Emotion Breakdown</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={filteredData.emotionBreakdown}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {filteredData.emotionBreakdown.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={EMOTION_COLORS[entry.name]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ 
                            backgroundColor: '#312e81', 
                            borderColor: '#8b5cf6',
                            color: '#e0e7ff'
                          }}
                          formatter={(value, name) => [`${value} dreams`, name]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </motion.div>

                  <motion.div variants={fadeIn} className="bg-indigo-950/50 border border-purple-500/20 p-6 rounded-xl backdrop-blur-sm">
                    <h3 className="text-lg font-medium text-purple-100 mb-4">Emotions Over Time</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={filteredData.emotionsByMonth}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#4c1d95" />
                        <XAxis dataKey="month" stroke="#a78bfa" />
                        <YAxis stroke="#a78bfa" />
                        <Tooltip
                          contentStyle={{ 
                            backgroundColor: '#312e81', 
                            borderColor: '#8b5cf6',
                            color: '#e0e7ff'
                          }}
                        />
                        <Legend />
                        <Line type="monotone" dataKey="Joy" stroke="#9333ea" strokeWidth={2} />
                        <Line type="monotone" dataKey="Fear" stroke="#4f46e5" strokeWidth={2} />
                        <Line type="monotone" dataKey="Surprise" stroke="#8b5cf6" strokeWidth={2} />
                        <Line type="monotone" dataKey="Sadness" stroke="#4338ca" strokeWidth={2} />
                        <Line type="monotone" dataKey="Anger" stroke="#6d28d9" strokeWidth={2} />
                        <Line type="monotone" dataKey="Disgust" stroke="#5b21b6" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </motion.div>
                </div>
              </TabsContent>

              {/* Temporal Patterns Tab */}
              <TabsContent value="time" className="mt-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                  <motion.div variants={fadeIn} className="bg-indigo-950/50 border border-purple-500/20 p-6 rounded-xl backdrop-blur-sm">
                    <h3 className="text-lg font-medium text-purple-100 mb-4">Dreams by Time of Day</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={filteredData.dreamsByTimeOfDay}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#4c1d95" />
                        <XAxis dataKey="time" stroke="#a78bfa" />
                        <YAxis stroke="#a78bfa" />
                        <Tooltip
                          contentStyle={{ 
                            backgroundColor: '#312e81', 
                            borderColor: '#8b5cf6',
                            color: '#e0e7ff'
                          }}
                          formatter={(value, name) => [`${value} dreams`, 'Count']}
                        />
                        <Bar dataKey="count" name="Dreams" radius={[4, 4, 0, 0]}>
                          {filteredData.dreamsByTimeOfDay.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </motion.div>

                  <motion.div variants={fadeIn} className="bg-indigo-950/50 border border-purple-500/20 p-6 rounded-xl backdrop-blur-sm">
                    <h3 className="text-lg font-medium text-purple-100 mb-4">Lucidity Trend</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={filteredData.lucidityTrend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#4c1d95" />
                        <XAxis dataKey="month" stroke="#a78bfa" />
                        <YAxis stroke="#a78bfa" />
                        <Tooltip
                          contentStyle={{ 
                            backgroundColor: '#312e81', 
                            borderColor: '#8b5cf6',
                            color: '#e0e7ff'
                          }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="score" 
                          name="Lucidity"
                          stroke="#8b5cf6"
                          strokeWidth={2} 
                          activeDot={{ r: 8, fill: '#6d28d9' }} 
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </motion.div>
                </div>
              </TabsContent>

              {/* AI Insights Tab */}
              <TabsContent value="insights" className="mt-6">
                <motion.div variants={fadeIn} className="bg-indigo-950/50 border border-purple-500/20 p-6 rounded-xl backdrop-blur-sm mb-8">
                  <h3 className="text-lg font-medium text-purple-100 mb-4">AI-Generated Insights</h3>
                  <ul className="list-disc list-inside text-purple-300 space-y-2">
                    {filteredData.insightsSuggestions.map((insight, index) => (
                      <li key={index}>{insight}</li>
                    ))}
                  </ul>
                </motion.div>

                <motion.div variants={fadeIn} className="bg-indigo-950/50 border border-purple-500/20 p-6 rounded-xl backdrop-blur-sm">
                  <h3 className="text-lg font-medium text-purple-100 mb-4">Sleep Quality Correlation</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={filteredData.sleepQualityCorrelation}>
                      <PolarGrid stroke="#4c1d95" />
                      <PolarAngleAxis dataKey="quality" stroke="#a78bfa" />
                      <PolarRadiusAxis stroke="#a78bfa" />
                      <Radar 
                        name="Lucidity" 
                        dataKey="lucidity" 
                        stroke="#8b5cf6" 
                        fill="#8b5cf6" 
                        fillOpacity={0.6} 
                      />
                      <Radar 
                        name="Recall" 
                        dataKey="recall" 
                        stroke="#6366f1" 
                        fill="#6366f1" 
                        fillOpacity={0.6} 
                      />
                      <Radar 
                        name="Emotional Intensity" 
                        dataKey="emotionalIntensity" 
                        stroke="#a78bfa" 
                        fill="#a78bfa" 
                        fillOpacity={0.6} 
                      />
                      <Tooltip
                        contentStyle={{ 
                          backgroundColor: '#312e81', 
                          borderColor: '#8b5cf6',
                          color: '#e0e7ff'
                        }}
                      />
                      <Legend />
                    </RadarChart>
                  </ResponsiveContainer>
                </motion.div>
              </TabsContent>
            </Tabs>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default Statistics;
