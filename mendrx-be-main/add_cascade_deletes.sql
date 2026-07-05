-- Drop existing foreign key constraints
ALTER TABLE report DROP CONSTRAINT fkqarlq4giti1m00opijlrn8ch0;
ALTER TABLE snd_plan DROP CONSTRAINT fkq5ijhe2ehvo6o4839q49b41mn;
ALTER TABLE diet_plan DROP CONSTRAINT fkm7d54fb7plwf921rxvvam6ori;
ALTER TABLE day_plan DROP CONSTRAINT fkg2cl850qv1q5xq2ehb0ckhf77;
ALTER TABLE supplement DROP CONSTRAINT fk2q3ntyqu6465xhaxjqkffiix4;
ALTER TABLE companion_daily_log DROP CONSTRAINT companion_daily_log_client_id_fkey;

-- Recreate constraints with ON DELETE CASCADE
ALTER TABLE report ADD CONSTRAINT fkqarlq4giti1m00opijlrn8ch0 FOREIGN KEY (client_id) REFERENCES client(id) ON DELETE CASCADE;
ALTER TABLE snd_plan ADD CONSTRAINT fkq5ijhe2ehvo6o4839q49b41mn FOREIGN KEY (report_id) REFERENCES report(id) ON DELETE CASCADE;
ALTER TABLE diet_plan ADD CONSTRAINT fkm7d54fb7plwf921rxvvam6ori FOREIGN KEY (snd_plan_id) REFERENCES snd_plan(id) ON DELETE CASCADE;
ALTER TABLE day_plan ADD CONSTRAINT fkg2cl850qv1q5xq2ehb0ckhf77 FOREIGN KEY (diet_plan_version_id) REFERENCES diet_plan(id) ON DELETE CASCADE;
ALTER TABLE supplement ADD CONSTRAINT fk2q3ntyqu6465xhaxjqkffiix4 FOREIGN KEY (snd_plan_id) REFERENCES snd_plan(id) ON DELETE CASCADE;
ALTER TABLE companion_daily_log ADD CONSTRAINT companion_daily_log_client_id_fkey FOREIGN KEY (client_id) REFERENCES client(id) ON DELETE CASCADE;
