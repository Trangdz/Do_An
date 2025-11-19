-- SQL script to clean Chainlink transaction queue
-- Run this in PostgreSQL to delete pending transactions

-- Delete all unstarted and in-progress transactions
DELETE FROM eth_txes WHERE state IN ('unstarted', 'in_progress');

-- Optional: Delete all transactions older than 24 hours
-- DELETE FROM eth_txes WHERE created_at < NOW() - INTERVAL '24 hours';

-- Optional: Delete all failed transactions
-- DELETE FROM eth_txes WHERE state = 'fatal_error';

-- Show remaining transactions count
SELECT state, COUNT(*) as count FROM eth_txes GROUP BY state;




