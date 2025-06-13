# IT Operations Dashboard - Database Schema Design

## Introduction

While the current implementation of the IT Operations Dashboard uses client-side file processing without a persistent database, this document outlines a recommended database schema for future implementations that may require persistent storage.

## Database Technology Recommendations

For a production implementation with persistent storage, we recommend:

1. **Primary Option**: PostgreSQL with Supabase
   - Excellent performance for analytical queries
   - Built-in authentication and authorization
   - Real-time capabilities
   - Scalable and reliable

2. **Alternative Options**:
   - MySQL/MariaDB: Good general-purpose relational database
   - MongoDB: If a document-oriented approach is preferred
   - SQLite: For lightweight deployments

## Schema Design

### Core Tables

#### `users` Table

Stores user authentication and profile information.

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'analyst', 'viewer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policy for users to read their own data
CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  USING (auth.uid() = id);

-- Create policy for users to update their own data
CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  USING (auth.uid() = id);
```

#### `incidents` Table

Stores incident data imported from external systems.

```sql
CREATE TABLE incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_number TEXT UNIQUE NOT NULL,
  opened_at TIMESTAMPTZ NOT NULL,
  short_description TEXT NOT NULL,
  caller TEXT,
  priority TEXT,
  state TEXT,
  category TEXT,
  subcategory TEXT,
  assignment_group TEXT,
  assigned_to TEXT,
  updated_at TIMESTAMPTZ,
  updated_by TEXT,
  business_impact TEXT,
  response_time INTEGER,
  location TEXT,
  comments_and_work_notes TEXT,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  imported_by UUID REFERENCES users(id)
);

-- Create indexes for common queries
CREATE INDEX idx_incidents_opened_at ON incidents(opened_at);
CREATE INDEX idx_incidents_priority ON incidents(priority);
CREATE INDEX idx_incidents_state ON incidents(state);
CREATE INDEX idx_incidents_category ON incidents(category);
CREATE INDEX idx_incidents_assignment_group ON incidents(assignment_group);

-- Enable Row Level Security
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to read incidents
CREATE POLICY "Authenticated users can read incidents"
  ON incidents
  FOR SELECT
  TO authenticated
  USING (true);
```

#### `requests` Table

Stores service request data imported from external systems.

```sql
CREATE TABLE requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_number TEXT UNIQUE NOT NULL,
  opened_at TIMESTAMPTZ NOT NULL,
  short_description TEXT NOT NULL,
  request_item TEXT,
  requested_for_name TEXT,
  priority TEXT,
  state TEXT,
  assignment_group TEXT,
  assigned_to TEXT,
  updated_at TIMESTAMPTZ,
  updated_by TEXT,
  comments_and_work_notes TEXT,
  business_impact TEXT,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  imported_by UUID REFERENCES users(id)
);

-- Create indexes for common queries
CREATE INDEX idx_requests_opened_at ON requests(opened_at);
CREATE INDEX idx_requests_priority ON requests(priority);
CREATE INDEX idx_requests_state ON requests(state);
CREATE INDEX idx_requests_request_item ON requests(request_item);
CREATE INDEX idx_requests_assignment_group ON requests(assignment_group);

-- Enable Row Level Security
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to read requests
CREATE POLICY "Authenticated users can read requests"
  ON requests
  FOR SELECT
  TO authenticated
  USING (true);
```

#### `imports` Table

Tracks data import history.

```sql
CREATE TABLE imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  record_count INTEGER NOT NULL,
  import_type TEXT NOT NULL CHECK (import_type IN ('incidents', 'requests')),
  status TEXT NOT NULL CHECK (status IN ('success', 'partial', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES users(id)
);

-- Enable Row Level Security
ALTER TABLE imports ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to read imports
CREATE POLICY "Authenticated users can read imports"
  ON imports
  FOR SELECT
  TO authenticated
  USING (true);
```

### Supporting Tables

#### `categories` Table

Stores standardized categories for incidents and requests.

```sql
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  parent_id UUID REFERENCES categories(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to read categories
CREATE POLICY "Authenticated users can read categories"
  ON categories
  FOR SELECT
  TO authenticated
  USING (true);
```

#### `assignment_groups` Table

Stores standardized assignment groups.

```sql
CREATE TABLE assignment_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  manager TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE assignment_groups ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to read assignment groups
CREATE POLICY "Authenticated users can read assignment groups"
  ON assignment_groups
  FOR SELECT
  TO authenticated
  USING (true);
```

#### `locations` Table

Stores standardized locations.

```sql
CREATE TABLE locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to read locations
CREATE POLICY "Authenticated users can read locations"
  ON locations
  FOR SELECT
  TO authenticated
  USING (true);
```

#### `shifts` Table

Stores work shift configurations.

```sql
CREATE TABLE shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to read shifts
CREATE POLICY "Authenticated users can read shifts"
  ON shifts
  FOR SELECT
  TO authenticated
  USING (true);
```

### Analysis Tables

#### `ai_analyses` Table

Stores results from AI analysis for future reference.

```sql
CREATE TABLE ai_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_type TEXT NOT NULL CHECK (analysis_type IN ('incident', 'request')),
  data_range_start TIMESTAMPTZ NOT NULL,
  data_range_end TIMESTAMPTZ NOT NULL,
  record_count INTEGER NOT NULL,
  analysis_result JSONB NOT NULL,
  confidence_score NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES users(id)
);

-- Enable Row Level Security
ALTER TABLE ai_analyses ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to read AI analyses
CREATE POLICY "Authenticated users can read AI analyses"
  ON ai_analyses
  FOR SELECT
  TO authenticated
  USING (true);
```

#### `saved_views` Table

Stores user-defined dashboard views and filters.

```sql
CREATE TABLE saved_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  view_type TEXT NOT NULL CHECK (view_type IN ('incident', 'request')),
  filters JSONB NOT NULL,
  layout JSONB,
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES users(id)
);

-- Enable Row Level Security
ALTER TABLE saved_views ENABLE ROW LEVEL SECURITY;

-- Create policy for users to read their own views
CREATE POLICY "Users can read own saved views"
  ON saved_views
  FOR SELECT
  USING (auth.uid() = created_by OR is_public = true);

-- Create policy for users to update their own views
CREATE POLICY "Users can update own saved views"
  ON saved_views
  FOR UPDATE
  USING (auth.uid() = created_by);
```

## Views

### `vw_incident_metrics`

A view that pre-calculates common incident metrics.

```sql
CREATE VIEW vw_incident_metrics AS
SELECT
  date_trunc('month', opened_at) AS month,
  priority,
  category,
  assignment_group,
  state,
  COUNT(*) AS incident_count,
  AVG(EXTRACT(EPOCH FROM (updated_at - opened_at))/3600) AS avg_resolution_hours
FROM incidents
GROUP BY 
  date_trunc('month', opened_at),
  priority,
  category,
  assignment_group,
  state;
```

### `vw_request_metrics`

A view that pre-calculates common request metrics.

```sql
CREATE VIEW vw_request_metrics AS
SELECT
  date_trunc('month', opened_at) AS month,
  priority,
  request_item,
  assignment_group,
  state,
  COUNT(*) AS request_count,
  AVG(EXTRACT(EPOCH FROM (updated_at - opened_at))/3600) AS avg_completion_hours
FROM requests
GROUP BY 
  date_trunc('month', opened_at),
  priority,
  request_item,
  assignment_group,
  state;
```

### `vw_sla_compliance`

A view that calculates SLA compliance.

```sql
CREATE VIEW vw_sla_compliance AS
SELECT
  date_trunc('month', i.opened_at) AS month,
  i.priority,
  COUNT(*) AS total_incidents,
  SUM(CASE
    WHEN i.priority = 'P1' AND EXTRACT(EPOCH FROM (i.updated_at - i.opened_at))/3600 <= 1 THEN 1
    WHEN i.priority = 'P2' AND EXTRACT(EPOCH FROM (i.updated_at - i.opened_at))/3600 <= 4 THEN 1
    WHEN i.priority = 'P3' AND EXTRACT(EPOCH FROM (i.updated_at - i.opened_at))/3600 <= 36 THEN 1
    WHEN i.priority = 'P4' AND EXTRACT(EPOCH FROM (i.updated_at - i.opened_at))/3600 <= 72 THEN 1
    ELSE 0
  END) AS within_sla,
  SUM(CASE
    WHEN i.priority = 'P1' AND EXTRACT(EPOCH FROM (i.updated_at - i.opened_at))/3600 > 1 THEN 1
    WHEN i.priority = 'P2' AND EXTRACT(EPOCH FROM (i.updated_at - i.opened_at))/3600 > 4 THEN 1
    WHEN i.priority = 'P3' AND EXTRACT(EPOCH FROM (i.updated_at - i.opened_at))/3600 > 36 THEN 1
    WHEN i.priority = 'P4' AND EXTRACT(EPOCH FROM (i.updated_at - i.opened_at))/3600 > 72 THEN 1
    ELSE 0
  END) AS outside_sla
FROM incidents i
WHERE i.updated_at IS NOT NULL
GROUP BY
  date_trunc('month', i.opened_at),
  i.priority;
```

## Functions and Procedures

### `fn_get_shift`

Function to determine the shift based on a timestamp.

```sql
CREATE OR REPLACE FUNCTION fn_get_shift(timestamp_param TIMESTAMPTZ)
RETURNS TEXT AS $$
DECLARE
  hour_of_day INTEGER;
  shift_name TEXT;
BEGIN
  hour_of_day := EXTRACT(HOUR FROM timestamp_param);
  
  IF hour_of_day >= 6 AND hour_of_day < 14 THEN
    shift_name := 'MORNING';
  ELSIF hour_of_day >= 14 AND hour_of_day < 22 THEN
    shift_name := 'AFTERNOON';
  ELSE
    shift_name := 'NIGHT';
  END IF;
  
  RETURN shift_name;
END;
$$ LANGUAGE plpgsql;
```

### `fn_normalize_priority`

Function to normalize priority values.

```sql
CREATE OR REPLACE FUNCTION fn_normalize_priority(priority_param TEXT)
RETURNS TEXT AS $$
DECLARE
  normalized_priority TEXT;
BEGIN
  IF priority_param IS NULL OR priority_param = '' THEN
    RETURN 'Não definido';
  END IF;
  
  -- Convert to lowercase for case-insensitive comparison
  priority_param := LOWER(priority_param);
  
  -- P1/Critical
  IF priority_param = 'p1' OR 
     priority_param = '1' OR 
     priority_param = 'priority 1' OR 
     priority_param = 'critical' OR 
     priority_param = 'crítico' OR
     priority_param LIKE 'p1 -%' OR
     priority_param LIKE 'p1-%' OR
     priority_param LIKE '1 -%' OR
     priority_param LIKE '1-%' OR
     priority_param LIKE '%critical%' OR
     priority_param LIKE '%crítico%' THEN
    normalized_priority := 'P1';
  
  -- P2/High
  ELSIF priority_param = 'p2' OR 
        priority_param = '2' OR 
        priority_param = 'priority 2' OR 
        priority_param = 'high' OR 
        priority_param = 'alta' OR
        priority_param LIKE 'p2 -%' OR
        priority_param LIKE 'p2-%' OR
        priority_param LIKE '2 -%' OR
        priority_param LIKE '2-%' OR
        priority_param LIKE '%high priority%' OR
        priority_param LIKE '%alta prioridade%' THEN
    normalized_priority := 'P2';
  
  -- P3/Medium
  ELSIF priority_param = 'p3' OR 
        priority_param = '3' OR 
        priority_param = 'priority 3' OR 
        priority_param = 'medium' OR 
        priority_param = 'média' OR
        priority_param LIKE 'p3 -%' OR
        priority_param LIKE 'p3-%' OR
        priority_param LIKE '3 -%' OR
        priority_param LIKE '3-%' OR
        priority_param LIKE '%medium priority%' OR
        priority_param LIKE '%média prioridade%' THEN
    normalized_priority := 'P3';
  
  -- P4/Low
  ELSIF priority_param = 'p4' OR 
        priority_param = '4' OR 
        priority_param = 'priority 4' OR 
        priority_param = 'low' OR 
        priority_param = 'baixa' OR
        priority_param LIKE 'p4 -%' OR
        priority_param LIKE 'p4-%' OR
        priority_param LIKE '4 -%' OR
        priority_param LIKE '4-%' OR
        priority_param LIKE '%low priority%' OR
        priority_param LIKE '%baixa prioridade%' THEN
    normalized_priority := 'P4';
  
  ELSE
    normalized_priority := 'Não definido';
  END IF;
  
  RETURN normalized_priority;
END;
$$ LANGUAGE plpgsql;
```

## Indexes and Performance Optimization

### Key Indexes

```sql
-- Incident indexes for common queries
CREATE INDEX idx_incidents_opened_at ON incidents(opened_at);
CREATE INDEX idx_incidents_priority ON incidents(priority);
CREATE INDEX idx_incidents_state ON incidents(state);
CREATE INDEX idx_incidents_category ON incidents(category);
CREATE INDEX idx_incidents_assignment_group ON incidents(assignment_group);
CREATE INDEX idx_incidents_caller ON incidents(caller);

-- Request indexes for common queries
CREATE INDEX idx_requests_opened_at ON requests(opened_at);
CREATE INDEX idx_requests_priority ON requests(priority);
CREATE INDEX idx_requests_state ON requests(state);
CREATE INDEX idx_requests_request_item ON requests(request_item);
CREATE INDEX idx_requests_requested_for_name ON requests(requested_for_name);
CREATE INDEX idx_requests_assignment_group ON requests(assignment_group);
```

### Partitioning Strategy

For large datasets, consider partitioning the incidents and requests tables by date:

```sql
-- Example of partitioning incidents by month
CREATE TABLE incidents (
  id UUID NOT NULL,
  incident_number TEXT NOT NULL,
  opened_at TIMESTAMPTZ NOT NULL,
  -- other columns
  PRIMARY KEY (id, opened_at)
) PARTITION BY RANGE (opened_at);

-- Create partitions for each month
CREATE TABLE incidents_y2025m01 PARTITION OF incidents
  FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE TABLE incidents_y2025m02 PARTITION OF incidents
  FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');

-- And so on for other months
```

## Data Migration

### Import Procedure

Procedure for importing data from external systems:

```sql
CREATE OR REPLACE PROCEDURE import_incidents(
  file_data JSONB,
  import_id UUID
)
LANGUAGE plpgsql
AS $$
DECLARE
  incident JSONB;
  incident_id UUID;
  success_count INTEGER := 0;
  error_count INTEGER := 0;
BEGIN
  -- Process each incident in the file
  FOR incident IN SELECT * FROM jsonb_array_elements(file_data)
  LOOP
    BEGIN
      -- Generate a new UUID for the incident
      incident_id := gen_random_uuid();
      
      -- Insert the incident
      INSERT INTO incidents (
        id,
        incident_number,
        opened_at,
        short_description,
        caller,
        priority,
        state,
        category,
        subcategory,
        assignment_group,
        assigned_to,
        updated_at,
        updated_by,
        business_impact,
        response_time,
        location,
        comments_and_work_notes,
        imported_at,
        imported_by
      ) VALUES (
        incident_id,
        incident->>'Number',
        (incident->>'Opened')::TIMESTAMPTZ,
        incident->>'ShortDescription',
        incident->>'Caller',
        incident->>'Priority',
        incident->>'State',
        incident->>'Category',
        incident->>'Subcategory',
        incident->>'AssignmentGroup',
        incident->>'AssignedTo',
        NULLIF(incident->>'Updated', '')::TIMESTAMPTZ,
        incident->>'UpdatedBy',
        incident->>'BusinessImpact',
        NULLIF(incident->>'ResponseTime', '')::INTEGER,
        incident->>'Location',
        incident->>'CommentsAndWorkNotes',
        now(),
        auth.uid()
      );
      
      success_count := success_count + 1;
    EXCEPTION WHEN OTHERS THEN
      -- Log the error and continue
      error_count := error_count + 1;
    END;
  END LOOP;
  
  -- Update the import record
  UPDATE imports
  SET 
    record_count = success_count,
    status = CASE 
      WHEN error_count = 0 THEN 'success'
      WHEN success_count > 0 THEN 'partial'
      ELSE 'failed'
    END,
    error_message = CASE 
      WHEN error_count > 0 THEN format('Failed to import %s records', error_count)
      ELSE NULL
    END
  WHERE id = import_id;
  
  COMMIT;
END;
$$;
```

## Security Considerations

### Row Level Security

The schema implements Row Level Security (RLS) to ensure data access control:

```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_views ENABLE ROW LEVEL SECURITY;

-- Create appropriate policies for each table
CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Authenticated users can read incidents"
  ON incidents
  FOR SELECT
  TO authenticated
  USING (true);

-- Additional policies for other tables...
```

### Data Encryption

For sensitive data, consider using encryption:

```sql
-- Example of storing encrypted comments
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Function to encrypt sensitive data
CREATE OR REPLACE FUNCTION encrypt_sensitive_data(data TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN pgp_sym_encrypt(
    data,
    current_setting('app.encryption_key')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decrypt sensitive data
CREATE OR REPLACE FUNCTION decrypt_sensitive_data(encrypted_data TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN pgp_sym_decrypt(
    encrypted_data,
    current_setting('app.encryption_key')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Scaling Considerations

For large-scale deployments, consider:

1. **Table Partitioning**: Partition large tables by date
2. **Read Replicas**: Set up read replicas for reporting queries
3. **Materialized Views**: Create materialized views for common analytics queries
4. **Query Optimization**: Optimize complex queries with proper indexing
5. **Connection Pooling**: Implement connection pooling for better resource utilization
6. **Caching**: Implement application-level caching for frequently accessed data