-- Add a dedicated scanner role for designated staff who mark attendance.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users
  ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'student', 'scanner'));