ALTER TABLE `session` ADD `bootstrap` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `user` ADD `bootstrap_completed` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `user` ADD `bootstrap_registration_session` text;
--> statement-breakpoint
UPDATE user SET bootstrap_completed=1 WHERE EXISTS (SELECT 1 FROM passkey WHERE user_id=user.id);
--> statement-breakpoint
CREATE TRIGGER auth_bootstrap_complete AFTER INSERT ON passkey BEGIN
  UPDATE user SET bootstrap_completed=1 WHERE id=NEW.user_id;
END;
