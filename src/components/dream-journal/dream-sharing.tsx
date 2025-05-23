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
      title: "Waking up",
      excerpt:
        "I set my alarm for 6:00 am and the woke up 2 minutes before it. However, I still heard an alarm go off at 6 even though I was holding my phone. I then woke up to my phone ringing. I set 7 alarms on my phone and I only full shut off my phone by the 4th.",
      tags: ["normal", "confusion"],
      likes: 1,
      comments: 0,
      image:
        "https://jduzfrjhxfxiyajvpkus.supabase.co/storage/v1/object/public/dream-images/39337da5-1b4d-4802-9424-06d5a17895c4_1747156281069.png",
      date: "May 13, 2025",
    },
    {
      id: 2,
      user: {
        name: "dennissaturn(dennis)350",
        avatar: "D",
      },
      title: "The bird cage",
      excerpt:
        "Came back from vacation with the mother of my baby half-sister. My tablet was suddenly full of undelete able widgets with pictures of myself taking up a lot of screens. And my encyclopedia book was destroyed. There was sugar in it which made larges holes in the book. I was very disappointed by it but I didn't want to confront the mother of my half-sister. My stepdad kept teasing me but I kept falling for it getting triggered. I then got a bird and a small cage but the cage I got second hand from an old lady was incomplete. Parts were missing and the further I got to setting it up the more it seemed to be damaged and incomplete. During setting up the cage the bird did get into the cage now and then, like a good and sweet bird.",
      tags: ["normal", "family"],
      likes: 4,
      comments: 0,
      image:
        "https://jduzfrjhxfxiyajvpkus.supabase.co/storage/v1/object/public/dream-images/e1ecc69f-f653-4cba-99f8-40d8703600ac_1745519582495.png",
      date: "2 days ago",
    },
    {
      id: 3,
      user: {
        name: "Samay",
        avatar: "S",
      },
      title: "Bathhouse Chicken",
      excerpt:
        "Was in lecture hall like bathhouse NYC (a sauna and cold plunge place) and ate chicken for the first time and it was fire",
      tags: ["normal", "neutral"],
      likes: 1,
      comments: 0,
      image:
        "https://jduzfrjhxfxiyajvpkus.supabase.co/storage/v1/object/public/dream-images/6b4cb86e-fdd6-48d3-a00a-9a24fdae0b94_1744838570182.png",
      date: "April 16, 2025",
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
