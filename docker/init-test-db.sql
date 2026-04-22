-- Creates the test database alongside the dev database in the same PostgreSQL instance.
-- This script runs automatically on first container start (via docker-entrypoint-initdb.d).
CREATE DATABASE sporty_test;
CREATE DATABASE sporty_e2e;
