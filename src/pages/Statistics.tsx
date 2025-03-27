import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
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
  ScatterChart,
  Scatter,
  ZAxis,
  CartesianGrid,
} from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarIcon, CloudIcon, MoonIcon, StarIcon, BrainIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Dream, DreamAnalysis } from "@/lib/types";

const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEEAD', '#D4A5A5', '#9A8C98', '#C9CBA3'];

const Statistics = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  // Redirect if not authenticated
  if (!user) {
    toast({
      variant: "destructive",
      title: "Authentication required",
      description: "Please log in to view your dream statistics.",
    });
    return <Navigate to="/auth" replace />;
  }

  // Fetch dreams
  const { data: dreams, isLoading: dreamsLoading } = useQuery({
    queryKey: ['dreams', user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dreams')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      return data as Dream[];
    },
  });

  // Fetch dream analyses
  const { data: analyses, isLoading: analysesLoading } = useQuery({
    queryKey: ['dream-analyses', user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dream_analyses')
        .select('*')
        .in('dream_id', dreams?.map(d => d.id) || []);

      if (error) throw error;
      return data as DreamAnalysis[];
    },
    enabled: !!dreams && dreams.length > 0,
  });

  const isLoading = dreamsLoading || analysesLoading;

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <p className="text-center text-muted-foreground">Loading statistics...</p>
      </div>
    );
  }

  // Calculate statistics
  const totalDreams = dreams?.length || 0;
  const totalAnalyses = analyses?.length || 0;
  
  // Category distribution
  const categoryData = dreams?.reduce((acc, dream) => {
    acc[dream.category] = (acc[dream.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const categoryChartData = Object.entries(categoryData || {}).map(([name, value]) => ({
    name,
    value,
    percentage: ((value / totalDreams) * 100).toFixed(1),
  }));

  // Emotion distribution
  const emotionData = dreams?.reduce((acc, dream) => {
    acc[dream.emotion] = (acc[dream.emotion] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const emotionChartData = Object.entries(emotionData || {}).map(([name, value]) => ({
    name,
    value,
    percentage: ((value / totalDreams) * 100).toFixed(1),
  }));

  // Dreams over time (last 30 days)
  const last30Days = Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - i);
    return date.toISOString().split('T')[0];
  }).reverse();

  const dreamsOverTime = last30Days.map(date => {
    const count = dreams?.filter(dream => 
      dream.created_at.split('T')[0] === date
    ).length || 0;
    
    return {
      date,
      count,
      displayDate: new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    };
  });

  // Categories over time
  const categoriesOverTime = last30Days.map(date => {
    const dayDreams = dreams?.filter(dream => dream.created_at.split('T')[0] === date) || [];
    
    const result: Record<string, any> = { date };
    
    ['nightmare', 'lucid', 'recurring', 'prophetic', 'normal'].forEach(category => {
      result[category] = dayDreams.filter(dream => dream.category === category).length;
    });
    
    return result;
  });

  // Extract themes and symbols from analyses
  const allThemes = analyses?.flatMap(analysis => analysis.themes || []) || [];
  const allSymbols = analyses?.flatMap(analysis => analysis.symbols || []) || [];
  const allEmotions = analyses?.flatMap(analysis => analysis.emotions || []) || [];

  // Count themes and symbols frequency
  const themesFrequency = allThemes.reduce((acc, theme) => {
    acc[theme] = (acc[theme] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const symbolsFrequency = allSymbols.reduce((acc, symbol) => {
    acc[symbol] = (acc[symbol] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const emotionsFromAnalyses = allEmotions.reduce((acc, emotion) => {
    acc[emotion] = (acc[emotion] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Sort and get top themes and symbols
  const topThemes = Object.entries(themesFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, value]) => ({ name, value, percentage: ((value / allThemes.length) * 100).toFixed(1) }));

  const topSymbols = Object.entries(symbolsFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, value]) => ({ name, value, percentage: ((value / allSymbols.length) * 100).toFixed(1) }));

  // Correlation between emotions and categories
  const emotionCategoryMatrix: Record<string, Record<string, number>> = {};
  
  dreams?.forEach(dream => {
    if (!emotionCategoryMatrix[dream.emotion]) {
      emotionCategoryMatrix[dream.emotion] = {};
    }
    emotionCategoryMatrix[dream.emotion][dream.category] = 
      (emotionCategoryMatrix[dream.emotion][dream.category] || 0) + 1;
  });

  const emotionCategoryCorrelation = Object.entries(emotionCategoryMatrix).flatMap(([emotion, categories]) => 
    Object.entries(categories).map(([category, count]) => ({
      emotion,
      category,
      count,
    }))
  );

  // Dream ratings distribution
  const ratingsDistribution = analyses?.reduce((acc, analysis) => {
    acc[analysis.rating] = (acc[analysis.rating] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);

  const ratingsData = Object.entries(ratingsDistribution || {})
    .map(([rating, count]) => ({ rating: Number(rating), count }))
    .sort((a, b) => a.rating - b.rating);

  // Time patterns - what time of day are dreams recorded
  const timePatterns = dreams?.reduce((acc, dream) => {
    const hour = new Date(dream.created_at).getHours();
    let timeOfDay = 'morning';
    
    if (hour >= 12 && hour < 17) timeOfDay = 'afternoon';
    else if (hour >= 17 && hour < 21) timeOfDay = 'evening';
    else if (hour >= 21 || hour < 6) timeOfDay = 'night';
    
    acc[timeOfDay] = (acc[timeOfDay] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const timePatternsData = Object.entries(timePatterns || {}).map(([name, value]) => ({
    name,
    value,
    percentage: ((value / totalDreams) * 100).toFixed(1),
  }));

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-4xl font-bold mb-6">Dream Statistics</h1>
      
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="patterns">Patterns & Trends</TabsTrigger>
          <TabsTrigger value="themes">Themes & Symbols</TabsTrigger>
          <TabsTrigger value="emotions">Emotions</TabsTrigger>
          <TabsTrigger value="advanced">Advanced Analysis</TabsTrigger>
        </TabsList>
        
        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  <CloudIcon className="w-4 h-4" /> Total Dreams
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{totalDreams}</p>
                <p className="text-muted-foreground text-sm">dreams recorded</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  <MoonIcon className="w-4 h-4" /> Analyzed Dreams
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{totalAnalyses}</p>
                <p className="text-muted-foreground text-sm">dreams analyzed</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  <StarIcon className="w-4 h-4" /> Most Common Category
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold capitalize">{categoryChartData[0]?.name || 'N/A'}</p>
                <p className="text-muted-foreground text-sm">
                  {categoryChartData[0]?.percentage || 0}% of dreams
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  <BrainIcon className="w-4 h-4" /> Dominant Emotion
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold capitalize">{emotionChartData[0]?.name || 'N/A'}</p>
                <p className="text-muted-foreground text-sm">
                  {emotionChartData[0]?.percentage || 0}% of dreams
                </p>
              </CardContent>
            </Card>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Dreams Over Time</CardTitle>
                <CardDescription>Past 30 days</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dreamsOverTime}>
                    <defs>
                      <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4ECDC4" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#4ECDC4" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="displayDate" 
                      tick={{ fontSize: 12 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis allowDecimals={false} />
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                    <Tooltip
                      labelFormatter={(value) => `Date: ${value}`}
                      formatter={(value: number) => [`${value} dreams`, 'Count']}
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
              <CardHeader>
                <CardTitle>Dream Categories Distribution</CardTitle>
                <CardDescription>Types of dreams recorded</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
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
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value, name) => [`${value} dreams (${categoryChartData.find(item => item.name === name)?.percentage || 0}%)`, name]} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* PATTERNS & TRENDS TAB */}
        <TabsContent value="patterns" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Dream Categories Over Time</CardTitle>
                <CardDescription>How different dream types change over time</CardDescription>
              </CardHeader>
              <CardContent className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={categoriesOverTime}>
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }}
                      interval="preserveStartEnd"
                      tickFormatter={(value) => new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    />
                    <YAxis allowDecimals={false} />
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                    <Tooltip 
                      labelFormatter={(value) => new Date(value).toLocaleDateString()}
                      formatter={(value: number, name: string) => [`${value} dreams`, name]}
                    />
                    <Legend verticalAlign="top" height={36} />
                    <Line type="monotone" dataKey="nightmare" stroke="#FF6B6B" dot={false} />
                    <Line type="monotone" dataKey="lucid" stroke="#4ECDC4" dot={false} />
                    <Line type="monotone" dataKey="recurring" stroke="#45B7D1" dot={false} />
                    <Line type="monotone" dataKey="prophetic" stroke="#D4A5A5" dot={false} />
                    <Line type="monotone" dataKey="normal" stroke="#9A8C98" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Time of Recording</CardTitle>
                <CardDescription>When you usually record your dreams</CardDescription>
              </CardHeader>
              <CardContent className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={timePatternsData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }) => 
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                    >
                      {timePatternsData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value, name) => [`${value} dreams (${timePatternsData.find(item => item.name === name)?.percentage || 0}%)`, name]} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Dream Rating Distribution</CardTitle>
                <CardDescription>How you rate your dreams</CardDescription>
              </CardHeader>
              <CardContent className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ratingsData}>
                    <XAxis dataKey="rating" />
                    <YAxis allowDecimals={false} />
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                    <Tooltip 
                      formatter={(value: number) => [`${value} dreams`, 'Count']}
                    />
                    <Bar dataKey="count" fill="#45B7D1" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Emotion-Category Correlation</CardTitle>
                <CardDescription>How emotions correlate with dream types</CardDescription>
              </CardHeader>
              <CardContent className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="emotion" 
                      name="Emotion" 
                      allowDuplicatedCategory={false} 
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis 
                      dataKey="category" 
                      name="Category" 
                      allowDuplicatedCategory={false}
                      tick={{ fontSize: 12 }}
                    />
                    <ZAxis 
                      dataKey="count" 
                      range={[20, 500]} 
                      name="Frequency" 
                    />
                    <Tooltip 
                      cursor={{ strokeDasharray: '3 3' }}
                      formatter={(value, name) => [name === 'Frequency' ? `${value} dreams` : value, name]}
                    />
                    <Scatter 
                      data={emotionCategoryCorrelation} 
                      fill="#8884d8"
                    />
                  </ScatterChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* THEMES & SYMBOLS TAB */}
        <TabsContent value="themes" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Top Recurring Themes</CardTitle>
                <CardDescription>Most common themes in your dreams</CardDescription>
              </CardHeader>
              <CardContent className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={topThemes} 
                    layout="vertical"
                    margin={{ left: 120 }}
                  >
                    <XAxis type="number" />
                    <YAxis 
                      type="category" 
                      dataKey="name" 
                      tick={{ fontSize: 12 }}
                      width={120}
                    />
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.3} />
                    <Tooltip 
                      formatter={(value: number, name, props) => {
                        const item = props.payload;
                        return [`${value} occurrences (${item.percentage}%)`, 'Frequency'];
                      }}
                    />
                    <Bar dataKey="value" fill="#4ECDC4" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Top Recurring Symbols</CardTitle>
                <CardDescription>Most common symbols in your dreams</CardDescription>
              </CardHeader>
              <CardContent className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={topSymbols} 
                    layout="vertical"
                    margin={{ left: 120 }}
                  >
                    <XAxis type="number" />
                    <YAxis 
                      type="category" 
                      dataKey="name" 
                      tick={{ fontSize: 12 }}
                      width={120}
                    />
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.3} />
                    <Tooltip 
                      formatter={(value: number, name, props) => {
                        const item = props.payload;
                        return [`${value} occurrences (${item.percentage}%)`, 'Frequency'];
                      }}
                    />
                    <Bar dataKey="value" fill="#FF6B6B" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Theme Tags Cloud</CardTitle>
                <CardDescription>Visual representation of recurring themes</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-32">
                  <div className="flex flex-wrap gap-2">
                    {topThemes.map((theme, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="text-sm py-1 px-2"
                        style={{ 
                          fontSize: `${Math.max(0.8, Math.min(1.5, (theme.value / (topThemes[0]?.value || 1)) * 1.5))}rem`,
                          opacity: Math.max(0.6, theme.value / (topThemes[0]?.value || 1))
                        }}
                      >
                        {theme.name} ({theme.value})
                      </Badge>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* EMOTIONS TAB */}
        <TabsContent value="emotions" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Emotions Distribution</CardTitle>
                <CardDescription>How your dreams make you feel</CardDescription>
              </CardHeader>
              <CardContent className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={emotionChartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }) => 
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                    >
                      {emotionChartData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value, name) => [`${value} dreams (${emotionChartData.find(item => item.name === name)?.percentage || 0}%)`, name]} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Emotion Radar</CardTitle>
                <CardDescription>Distribution of emotions across dreams</CardDescription>
              </CardHeader>
              <CardContent className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart outerRadius={90} data={emotionChartData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="name" />
                    <PolarRadiusAxis angle={30} domain={[0, 'auto']} />
                    <Radar name="Emotions" dataKey="value" stroke="#FF6B6B" fill="#FF6B6B" fillOpacity={0.6} />
                    <Tooltip formatter={(value: number, name, props) => {
                      const item = props.payload;
                      return [`${value} dreams (${item.percentage}%)`, item.name];
                    }} />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* ADVANCED ANALYSIS TAB */}
        <TabsContent value="advanced" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Emotional Trends Over Time</CardTitle>
                <CardDescription>How your emotions evolve with time</CardDescription>
              </CardHeader>
              <CardContent className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dreamsOverTime}>
                    <XAxis 
                      dataKey="displayDate" 
                      tick={{ fontSize: 12 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis />
                    <CartesianGrid strokeDasharray="3 3" />
                    <Tooltip labelFormatter={(value) => `Date: ${value}`} />
                    <Line type="monotone" dataKey="count" stroke="#8884d8" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Dream-to-Dream Pattern Analysis</CardTitle>
                <CardDescription>See how your dream patterns evolve between entries</CardDescription>
              </CardHeader>
              <CardContent className="h-[350px] flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <p>Analysis in development</p>
                  <p className="text-sm">We're working on advanced pattern recognition between dreams.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Statistics;
