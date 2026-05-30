ALTER TABLE characters ADD COLUMN hidden_message_count INTEGER DEFAULT 0;
ALTER TABLE characters ADD COLUMN context_cutoff_message_id INTEGER;
