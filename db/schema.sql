CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE properties (
  id TEXT PRIMARY KEY,
  address TEXT NOT NULL,
  town TEXT NOT NULL,
  block TEXT NOT NULL,
  flat_type TEXT NOT NULL,
  floor_area_sqm NUMERIC NOT NULL,
  storey_midpoint NUMERIC NOT NULL,
  remaining_lease_years NUMERIC NOT NULL,
  lease_commence_year INT NOT NULL,
  geom GEOGRAPHY(POINT, 4326) NOT NULL
);

CREATE TABLE listings (
  id TEXT PRIMARY KEY,
  property_id TEXT,
  portal TEXT NOT NULL,
  address TEXT NOT NULL,
  asking_price NUMERIC NOT NULL,
  original_asking_price NUMERIC NOT NULL,
  days_on_market INT NOT NULL,
  relist_count INT NOT NULL,
  cea_agent_id TEXT,
  image_hash TEXT,
  extracted_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE transactions (
  id TEXT PRIMARY KEY,
  town TEXT NOT NULL,
  block TEXT NOT NULL,
  flat_type TEXT NOT NULL,
  floor_area_sqm NUMERIC NOT NULL,
  remaining_lease_years NUMERIC NOT NULL,
  resale_price NUMERIC NOT NULL,
  month DATE NOT NULL,
  geom GEOGRAPHY(POINT, 4326) NOT NULL
);

CREATE TABLE estate_signals (
  id TEXT PRIMARY KEY,
  town TEXT NOT NULL,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  impact_score NUMERIC NOT NULL,
  summary TEXT NOT NULL,
  effective_date DATE NOT NULL
);
