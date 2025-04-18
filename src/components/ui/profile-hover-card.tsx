import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Calendar, PenLine } from "lucide-react"
import { supabase } from '@/integrations/supabase/client'
import { Loader2 } from "lucide-react"
import { Profile } from '@/lib/types'

type ProfileHoverCardProps = {
  username: string;
  children: React.ReactNode;
}

export function ProfileHoverCard({ username, children }: ProfileHoverCardProps) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [stats, setStats] = useState<{ dreamCount: number }>({ dreamCount: 0 })
  const [loading, setLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    if (!username || !isOpen) return
    
    const fetchProfileData = async () => {
      setLoading(true)
      try {
        // Fetch profile data
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('username', username)
          .single()
          
        if (profileError) throw profileError
        
        if (profileData) {
          setProfile(profileData)
          
          // Fetch public dream count
          const { count, error: countError } = await supabase
            .from('dreams')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', profileData.id)
            .eq('is_public', true)
            
          if (countError) throw countError
          
          setStats({ dreamCount: count || 0 })
        }
      } catch (error) {
        console.error('Error fetching profile hover data:', error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchProfileData()
  }, [username, isOpen])
  
  const handleProfileClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    navigate(`/profile/${username}`)
    setIsOpen(false)
  }
  
  return (
    <HoverCard openDelay={300} closeDelay={200} onOpenChange={setIsOpen}>
      <HoverCardTrigger asChild>
        {children}
      </HoverCardTrigger>
      <HoverCardContent className="w-72" align="start">
        {loading ? (
          <div className="flex justify-center items-center h-20">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : profile ? (
          <div className="flex flex-col gap-3">
            <div className="flex gap-4 items-center">
              <Avatar className="h-12 w-12">
                {profile.avatar_url ? (
                  <AvatarImage src={profile.avatar_url} alt={profile.username} />
                ) : (
                  <AvatarFallback>{profile.username.charAt(0).toUpperCase()}</AvatarFallback>
                )}
              </Avatar>
              <div>
                <h4 className="text-lg font-semibold">{profile.username}</h4>
                <div className="flex items-center text-xs text-muted-foreground gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>Joined {new Date(profile.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
            
            {profile.bio && (
              <p className="text-sm text-muted-foreground line-clamp-2">{profile.bio}</p>
            )}
            
            <div className="flex gap-3 text-sm">
              <div className="flex items-center gap-1">
                <PenLine className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{stats.dreamCount} {stats.dreamCount === 1 ? 'dream' : 'dreams'} shared</span>
              </div>
            </div>
            
            <button
              onClick={handleProfileClick}
              className="text-sm text-primary hover:underline text-left"
            >
              View full profile
            </button>
          </div>
        ) : (
          <div className="text-center py-2">
            <p className="text-sm text-muted-foreground">Profile not found</p>
          </div>
        )}
      </HoverCardContent>
    </HoverCard>
  )
} 