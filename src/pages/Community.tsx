
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Dream, Profile } from "@/lib/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const Community = () => {
  // Fetch public dreams with their authors
  const { data: publicDreams, isLoading } = useQuery({
    queryKey: ['public-dreams'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dreams')
        .select(`
          *,
          profiles!dreams_user_id_fkey(username, avatar_url)
        `)
        .eq('is_public', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as (Dream & { profiles: Pick<Profile, 'username' | 'avatar_url'> })[];
    },
  });

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold text-dream-600 mb-8 animate-fade-in">Dream Community</h1>
      <div className="grid gap-6 animate-slide-up">
        {isLoading ? (
          <Card className="p-8">
            <p className="text-muted-foreground">Loading dreams...</p>
          </Card>
        ) : publicDreams?.length === 0 ? (
          <Card className="p-8">
            <p className="text-muted-foreground">No public dreams found.</p>
          </Card>
        ) : (
          publicDreams?.map((dream) => (
            <Card key={dream.id} className="animate-fade-in">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{dream.title}</CardTitle>
                    <CardDescription>
                      Shared by {dream.profiles.username} • {new Date(dream.created_at).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="secondary">{dream.category}</Badge>
                    <Badge variant="outline">{dream.emotion}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dream.image_url && (
                    <div className="relative w-full h-64 rounded-lg overflow-hidden">
                      <img
                        src={dream.image_url}
                        alt={dream.title}
                        className="object-cover w-full h-full"
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    <p className="whitespace-pre-wrap text-muted-foreground">{dream.description}</p>
                    {dream.enhanced_description && (
                      <div className="mt-4 p-4 bg-muted rounded-lg">
                        <p className="text-sm italic text-muted-foreground">
                          {dream.enhanced_description}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default Community;
