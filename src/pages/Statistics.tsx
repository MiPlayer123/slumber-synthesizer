
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
} from "recharts";
import type { Dream } from "@/lib/types";

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

  const { data: dreams, isLoading } = useQuery({
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

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <p className="text-center text-muted-foreground">Loading statistics...</p>
      </div>
    );
  }

  // Calculate statistics
  const totalDreams = dreams?.length || 0;
  
  // Category distribution
  const categoryData = dreams?.reduce((acc, dream) => {
    acc[dream.category] = (acc[dream.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const categoryChartData = Object.entries(categoryData || {}).map(([name, value]) => ({
    name,
    value,
  }));

  // Emotion distribution
  const emotionData = dreams?.reduce((acc, dream) => {
    acc[dream.emotion] = (acc[dream.emotion] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const emotionChartData = Object.entries(emotionData || {}).map(([name, value]) => ({
    name,
    value,
  }));

  // Dreams over time (last 7 days)
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - i);
    return date.toISOString().split('T')[0];
  }).reverse();

  const dreamsOverTime = last7Days.map(date => ({
    date,
    count: dreams?.filter(dream => 
      dream.created_at.split('T')[0] === date
    ).length || 0,
  }));

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold mb-8">Dream Statistics</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Total Dreams Card */}
        <Card>
          <CardHeader>
            <CardTitle>Total Dreams</CardTitle>
            <CardDescription>Number of dreams recorded</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{totalDreams}</p>
          </CardContent>
        </Card>

        {/* Dreams Over Time */}
        <Card>
          <CardHeader>
            <CardTitle>Dreams Over Time</CardTitle>
            <CardDescription>Last 7 days</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dreamsOverTime}>
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(value) => new Date(value).toLocaleDateString(undefined, { weekday: 'short' })}
                />
                <YAxis allowDecimals={false} />
                <Tooltip 
                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                  formatter={(value: number) => [`${value} dreams`, 'Count']}
                />
                <Bar dataKey="count" fill="#4ECDC4" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Dream Categories */}
        <Card>
          <CardHeader>
            <CardTitle>Dream Categories</CardTitle>
            <CardDescription>Distribution of dream types</CardDescription>
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
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Dream Emotions */}
        <Card>
          <CardHeader>
            <CardTitle>Dream Emotions</CardTitle>
            <CardDescription>Emotional distribution in dreams</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
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
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Statistics;
