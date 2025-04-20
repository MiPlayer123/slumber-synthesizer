-- Complete Schema for Rem (formerly Slumber Synthesizer)

-- Enums
CREATE TYPE public.dream_category AS ENUM (
    'nightmare',
    'lucid',
    'recurring',
    'prophetic',
    'normal'
);

CREATE TYPE public.dream_emotion AS ENUM (
    'joy',
    'fear',
    'confusion',
    'anxiety',
    'peace',
    'excitement',
    'sadness',
    'neutral'
);

CREATE TYPE public.dream_type AS ENUM (
    'recurring nightmare',
    'positive',
    'lucid'
);

-- Profiles table (User)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    email TEXT UNIQUE,
    password_hash TEXT,
    full_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    website TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Dreams table
CREATE TABLE public.dreams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    enhanced_description TEXT,
    category public.dream_category DEFAULT 'normal'::public.dream_category NOT NULL,
    emotion public.dream_emotion DEFAULT 'neutral'::public.dream_emotion NOT NULL,
    dream_type public.dream_type,
    is_public BOOLEAN DEFAULT false NOT NULL,
    visibility TEXT NOT NULL DEFAULT 'private',
    view_count INTEGER NOT NULL DEFAULT 0,
    likes_count INTEGER NOT NULL DEFAULT 0,
    image_url TEXT,
    dream_date DATE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT dreams_visibility_check CHECK (visibility IN ('public', 'friends_only', 'private'))
);

-- Dream Media table
CREATE TABLE public.dream_media (
    media_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dream_id UUID NOT NULL REFERENCES public.dreams(id) ON DELETE CASCADE,
    media_type TEXT NOT NULL,
    media_url TEXT NOT NULL,
    metadata JSONB NULL,
    uploaded_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT dream_media_type_check CHECK (media_type IN ('audio', 'video', 'image', 'text'))
);

-- Dream analyses table
CREATE TABLE public.dream_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dream_id UUID NOT NULL REFERENCES public.dreams(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL,
    themes TEXT[] NOT NULL,
    symbols TEXT[] NOT NULL,
    emotions TEXT[] NOT NULL,
    interpretation TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tags table
CREATE TABLE public.tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Dream tags junction table
CREATE TABLE public.dream_tags (
    dream_id UUID NOT NULL REFERENCES public.dreams(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
    PRIMARY KEY (dream_id, tag_id)
);

-- Comments table
CREATE TABLE public.comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dream_id UUID NOT NULL REFERENCES public.dreams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    parent_comment_id UUID NULL REFERENCES public.comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    likes_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Likes/reactions table
CREATE TABLE public.likes (
    dream_id UUID NOT NULL REFERENCES public.dreams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL DEFAULT 'dream',
    reaction_type TEXT NOT NULL DEFAULT 'like',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (dream_id, user_id),
    CONSTRAINT likes_reaction_check CHECK (reaction_type IN ('like', 'love', 'laugh', 'angry')),
    CONSTRAINT likes_entity_check CHECK (entity_type IN ('dream', 'comment'))
);

-- Share table
CREATE TABLE public.share (
    share_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dream_id UUID NOT NULL REFERENCES public.dreams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    shared_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    message TEXT NULL
);

-- Sleep tracking table
CREATE TABLE public.sleep_tracking (
    sleep_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    sleep_date DATE NOT NULL,
    sleep_start TIMESTAMPTZ NOT NULL,
    sleep_end TIMESTAMPTZ NOT NULL,
    sleep_duration INTEGER NOT NULL, -- stored in minutes
    notes TEXT NULL
);

-- Friendship table
CREATE TABLE public.friendship (
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    friend_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (user_id, friend_user_id),
    CONSTRAINT friendship_status_check CHECK (status IN ('pending', 'accepted', 'blocked'))
);

-- Views
CREATE VIEW public.combined_dreams_view AS
SELECT 
    p.username,
    d.title AS dream_title,
    d.description AS dream_description,
    da.interpretation AS dream_analysis,
    da.rating,
    da.themes,
    da.symbols,
    da.emotions,
    d.created_at AS dream_created_at,
    d.dream_type,
    d.visibility,
    d.view_count,
    d.likes_count,
    d.dream_date
FROM 
    public.dreams d
    JOIN public.profiles p ON d.user_id = p.id
    LEFT JOIN public.dream_analyses da ON d.id = da.dream_id;

CREATE VIEW public.extended_dreams_view AS
SELECT 
    d.id AS dream_id,
    d.user_id,
    p.username,
    p.avatar_url,
    d.title,
    d.description,
    d.dream_type,
    d.category,
    d.emotion,
    d.visibility,
    d.is_public,
    d.view_count,
    d.likes_count,
    d.image_url,
    d.dream_date,
    d.created_at,
    d.updated_at,
    (SELECT COUNT(*) FROM public.comments c WHERE c.dream_id = d.id) AS comments_count
FROM 
    public.dreams d
    JOIN public.profiles p ON d.user_id = p.id;
