-- UrbanWatch AI Supabase Database Schema

-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create detections table
CREATE TABLE IF NOT EXISTS public.detections (
    id TEXT PRIMARY KEY,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    polygon JSONB NOT NULL DEFAULT '[]'::jsonb,
    area TEXT NOT NULL,
    confidence NUMERIC NOT NULL DEFAULT 0,
    risk TEXT NOT NULL DEFAULT 'Medium',
    date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT 'Pending Inspection',
    is_demo BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create inspections table
CREATE TABLE IF NOT EXISTS public.inspections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    detection_id TEXT NOT NULL REFERENCES public.detections(id) ON DELETE CASCADE,
    officer TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pending',
    notes TEXT,
    inspection_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_detections_is_demo ON public.detections(is_demo);
CREATE INDEX IF NOT EXISTS idx_detections_risk ON public.detections(risk);
CREATE INDEX IF NOT EXISTS idx_inspections_detection_id ON public.inspections(detection_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.detections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;

-- Allow public read/write access for demo/hackathon deployment
CREATE POLICY "Allow public read detections" ON public.detections
    FOR SELECT USING (true);

CREATE POLICY "Allow public insert/update detections" ON public.detections
    FOR ALL USING (true);

CREATE POLICY "Allow public read inspections" ON public.inspections
    FOR SELECT USING (true);

CREATE POLICY "Allow public insert/update inspections" ON public.inspections
    FOR ALL USING (true);
