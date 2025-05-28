"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Share2,
  Heart,
  MessageSquare,
  MoreHorizontal,
  Globe,
  Users,
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
      likes: 33,
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
      likes: 17,
      comments: 1,
      image:
        "https://jduzfrjhxfxiyajvpkus.supabase.co/storage/v1/object/public/dream-images/e1ecc69f-f653-4cba-99f8-40d8703600ac_1745519582495.png",
      date: "2 days ago",
      commentPreview: {
        user: "popp11",
        text: "oh wow! the broken cage thing feels like such a metaphor for trying to care for something when you don't have all the right tools or circumstances. but the bird still trusted you and went in anyway 🥺 that's actually really beautiful",
        timeAgo: "6h",
      },
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
      likes: 31,
      comments: 0,
      image:
        "https://jduzfrjhxfxiyajvpkus.supabase.co/storage/v1/object/public/dream-images/6b4cb86e-fdd6-48d3-a00a-9a24fdae0b94_1744838570182.png",
      date: "April 16, 2025",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="relative bg-gradient-to-br from-slate-900/95 via-indigo-900/20 to-slate-900/95 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
    >
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            rotate: [0, 3, 0],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "linear",
          }}
          className="absolute -top-32 -right-32 w-96 h-96 bg-gradient-to-br from-cyan-500/15 to-teal-500/15 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, -2, 0],
          }}
          transition={{
            duration: 30,
            repeat: Infinity,
            ease: "linear",
          }}
          className="absolute -bottom-32 -left-32 w-80 h-80 bg-gradient-to-tr from-teal-500/15 to-green-500/15 rounded-full blur-3xl"
        />
      </div>

      <div className="relative z-10 p-4 sm:p-6 lg:p-8 xl:p-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col gap-4 mb-6 sm:mb-8"
        >
          {/* Title and Icon Row */}
          <div className="flex items-center gap-3 sm:gap-4">
            <motion.div
              whileHover={{ scale: 1.05, rotate: 5 }}
              className="bg-gradient-to-br from-cyan-500/30 to-teal-500/30 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl backdrop-blur-sm border border-white/10"
            >
              <Users className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 text-cyan-300" />
            </motion.div>
            <div className="flex-1">
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-white via-cyan-200 to-teal-200 bg-clip-text text-transparent">
                Dream Community
              </h2>
              <p className="text-white/60 text-xs sm:text-sm mt-0.5 sm:mt-1">
                Connect with fellow dreamers
              </p>
            </div>
          </div>

          {/* Share Dream Button */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full sm:w-auto sm:self-start"
          >
            <Button
              size="sm"
              className="w-full sm:w-auto h-10 sm:h-9 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white shadow-lg shadow-cyan-500/20 border-0 rounded-xl text-sm font-medium"
            >
              <Share2 className="w-4 h-4 mr-2" />
              <span>Share Dream</span>
            </Button>
          </motion.div>
        </motion.div>

        {/* Navigation Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex gap-1 sm:gap-2 p-1.5 sm:p-2 bg-white/5 backdrop-blur-sm rounded-xl sm:rounded-2xl border border-white/10 mb-6 sm:mb-8"
        >
          {[
            {
              id: "community",
              label: "Community Dreams",
              shortLabel: "Community",
              icon: Globe,
              gradient: "from-cyan-500 to-teal-500",
            },
            {
              id: "following",
              label: "Following",
              shortLabel: "Following",
              icon: Heart,
              gradient: "from-teal-500 to-green-500",
            },
          ].map((tab) => (
            <motion.button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 lg:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-medium transition-all duration-300 flex-1 sm:flex-initial text-sm sm:text-base ${
                activeTab === tab.id
                  ? `bg-gradient-to-r ${tab.gradient} text-white shadow-lg shadow-cyan-500/20`
                  : "text-white/60 hover:text-white/90 hover:bg-white/5"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="hidden xs:inline sm:hidden lg:inline">
                {tab.shortLabel}
              </span>
              <span className="hidden sm:inline lg:hidden">{tab.label}</span>
            </motion.button>
          ))}
        </motion.div>

        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="space-y-6"
          >
            {sharedDreams.map((dream, index) => (
              <DreamCard key={dream.id} dream={dream} index={index} />
            ))}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function DreamCard({ dream, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      whileHover={{ y: -2, scale: 1.01 }}
      className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden hover:border-white/20 transition-all duration-300 shadow-lg hover:shadow-xl"
    >
      <div className="flex flex-col lg:flex-row">
        {/* Image Section */}
        <div className="lg:w-1/3 h-48 lg:h-auto relative overflow-hidden">
          <motion.img
            src={dream.image || "/placeholder.svg"}
            alt={dream.title}
            className="w-full h-full object-cover"
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.3 }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
        </div>

        {/* Content Section */}
        <div className="p-6 lg:w-2/3 flex flex-col justify-between">
          {/* User Info */}
          <div className="flex items-center gap-3 mb-4">
            <motion.div
              className="w-10 h-10 rounded-full bg-gradient-to-r from-cyan-500 to-teal-500 flex items-center justify-center text-white font-bold shadow-lg"
              whileHover={{ scale: 1.1, rotate: 5 }}
            >
              {dream.user.avatar}
            </motion.div>
            <div>
              <span className="text-white font-medium">{dream.user.name}</span>
              <p className="text-white/60 text-xs">{dream.date}</p>
            </div>
          </div>

          {/* Dream Content */}
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-white mb-3 leading-tight">
              {dream.title}
            </h3>
            <p className="text-white/70 text-sm mb-4 line-clamp-3 leading-relaxed">
              {dream.excerpt}
            </p>

            {/* Tags */}
            <div className="flex flex-wrap gap-2 mb-4">
              {dream.tags.map((tag, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  whileHover={{ scale: 1.05 }}
                  className="text-xs px-3 py-1.5 rounded-full bg-gradient-to-r from-cyan-500/20 to-teal-500/20 text-cyan-200 border border-cyan-500/30 backdrop-blur-sm"
                >
                  #{tag}
                </motion.span>
              ))}
            </div>

            {/* Comment Preview */}
            {dream.commentPreview && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-gradient-to-r from-white/5 to-white/10 backdrop-blur-sm rounded-xl p-4 mb-4 border border-white/10"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold">
                    {dream.commentPreview.user.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-white/70 text-sm font-medium">
                    {dream.commentPreview.user}
                  </span>
                  <span className="text-white/40 text-xs">
                    • {dream.commentPreview.timeAgo}
                  </span>
                </div>
                <p className="text-white/80 text-sm leading-relaxed">
                  {dream.commentPreview.text}
                </p>
              </motion.div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-6">
            <motion.div className="flex items-center gap-2 text-sm text-white/60 cursor-default">
              <Heart className="w-4 h-4" fill="none" />
              <span className="font-medium">{dream.likes}</span>
            </motion.div>

            <motion.button
              className="flex items-center gap-2 text-sm text-white/60 hover:text-cyan-400 transition-all duration-200"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <MessageSquare className="w-4 h-4" />
              <span className="font-medium">{dream.comments}</span>
            </motion.button>

            <motion.button
              className="ml-auto text-white/60 hover:text-white/90 transition-all duration-200 p-2 rounded-lg hover:bg-white/10"
              whileHover={{ scale: 1.05, rotate: 90 }}
              whileTap={{ scale: 0.95 }}
            >
              <MoreHorizontal className="w-4 h-4" />
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
