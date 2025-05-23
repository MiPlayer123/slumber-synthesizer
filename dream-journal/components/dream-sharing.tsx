"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Share2,
  Heart,
  MessageSquare,
  MoreHorizontal,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export function DreamSharing() {
  const [activeTab, setActiveTab] = useState("community");

  const sharedDreams = [
    {
      id: 1,
      user: {
        name: "augustus",
        avatar: "A",
      },
      title: "Going on a hike with Steven",
      excerpt:
        "I had a dream where Steven woke me up and then we went on a hike. That was it. I think...",
      tags: ["normal", "confusion"],
      likes: 1,
      comments: 1,
      image: "/placeholder.svg?height=300&width=400",
    },
    {
      id: 2,
      user: {
        name: "Dreamer92",
        avatar: "D",
      },
      title: "Hawk in Harlem",
      excerpt:
        "I was in a room filled with friends smoking weed. The room was filled with smoke. I felt...",
      tags: ["lucid", "excitement"],
      likes: 2,
      comments: 1,
      image: "/placeholder.svg?height=300&width=400",
    },
    {
      id: 3,
      user: {
        name: "Dreamer92",
        avatar: "D",
      },
      title: "Abandoned",
      excerpt:
        "I was 15 when I was sent there... But in this dream I looked like a toddler. My new home...",
      tags: ["lucid", "sadness"],
      likes: 2,
      comments: 0,
      image: "/placeholder.svg?height=300&width=400",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden"
    >
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Dream Community</h2>
          <Button
            size="sm"
            className="bg-gradient-to-r from-purple-500 to-blue-500 text-white"
          >
            <Share2 className="w-4 h-4 mr-2" />
            Share Dream
          </Button>
        </div>

        <div className="flex overflow-x-auto gap-2 pb-4 mb-6">
          <button
            onClick={() => setActiveTab("community")}
            className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-colors ${
              activeTab === "community"
                ? "bg-white/10 text-white"
                : "text-white/60 hover:text-white/80"
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>Community Dreams</span>
          </button>
          <button
            onClick={() => setActiveTab("following")}
            className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-colors ${
              activeTab === "following"
                ? "bg-white/10 text-white"
                : "text-white/60 hover:text-white/80"
            }`}
          >
            <Heart className="w-4 h-4" />
            <span>Following</span>
          </button>
        </div>

        <div className="space-y-4">
          {sharedDreams.map((dream, index) => (
            <DreamCard key={dream.id} dream={dream} index={index} />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function DreamCard({ dream, index }) {
  const [liked, setLiked] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="bg-black/20 border border-white/10 rounded-lg overflow-hidden"
    >
      <div className="flex flex-col md:flex-row">
        <div className="md:w-1/3 h-48 md:h-auto relative">
          <img
            src={dream.image || "/placeholder.svg"}
            alt={dream.title}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="p-4 md:w-2/3">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center text-black font-bold">
              {dream.user.avatar}
            </div>
            <span className="text-sm">{dream.user.name}</span>
          </div>

          <h3 className="text-xl font-medium mb-2">{dream.title}</h3>
          <p className="text-white/70 text-sm mb-4">{dream.excerpt}</p>

          <div className="flex flex-wrap gap-2 mb-4">
            {dream.tags.map((tag, i) => (
              <span
                key={i}
                className="text-xs px-2 py-1 rounded-full bg-white/10 text-white/70"
              >
                #{tag}
              </span>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <button
              className={`flex items-center gap-1 text-sm ${liked ? "text-red-400" : "text-white/60 hover:text-white/80"}`}
              onClick={() => setLiked(!liked)}
            >
              <Heart
                className="w-4 h-4"
                fill={liked ? "currentColor" : "none"}
              />
              <span>{liked ? dream.likes + 1 : dream.likes}</span>
            </button>
            <button className="flex items-center gap-1 text-sm text-white/60 hover:text-white/80">
              <MessageSquare className="w-4 h-4" />
              <span>{dream.comments}</span>
            </button>
            <button className="ml-auto text-white/60 hover:text-white/80">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
