-- FTS5由自定义迁移创建；Drizzle尚不声明虚拟表。业务任务写入后索引自动同步。
CREATE VIRTUAL TABLE articles_fts USING fts5(title, summary, content='articles', content_rowid='rowid');
--> statement-breakpoint
CREATE TRIGGER articles_fts_insert AFTER INSERT ON articles BEGIN
  INSERT INTO articles_fts(rowid, title, summary) VALUES (new.rowid, new.title, new.summary);
END;
--> statement-breakpoint
CREATE TRIGGER articles_fts_delete AFTER DELETE ON articles BEGIN
  INSERT INTO articles_fts(articles_fts, rowid, title, summary) VALUES ('delete', old.rowid, old.title, old.summary);
END;
--> statement-breakpoint
CREATE TRIGGER articles_fts_update AFTER UPDATE ON articles BEGIN
  INSERT INTO articles_fts(articles_fts, rowid, title, summary) VALUES ('delete', old.rowid, old.title, old.summary);
  INSERT INTO articles_fts(rowid, title, summary) VALUES (new.rowid, new.title, new.summary);
END;
--> statement-breakpoint
CREATE VIRTUAL TABLE papers_fts USING fts5(id UNINDEXED, title, title_zh, one_sentence, concepts);
--> statement-breakpoint
CREATE TRIGGER papers_fts_insert AFTER INSERT ON papers BEGIN
  INSERT INTO papers_fts(id,title,title_zh,one_sentence,concepts) VALUES(new.id,json_extract(new.doc,'$.meta.title'),json_extract(new.doc,'$.meta.titleZh'),json_extract(new.doc,'$.guide.oneSentence'),(SELECT group_concat(json_extract(value,'$.name'),' ') FROM json_each(new.doc,'$.structure.concepts')));
END;
--> statement-breakpoint
CREATE TRIGGER papers_fts_delete AFTER DELETE ON papers BEGIN
  DELETE FROM papers_fts WHERE id=old.id;
END;
--> statement-breakpoint
CREATE TRIGGER papers_fts_update AFTER UPDATE ON papers BEGIN
  DELETE FROM papers_fts WHERE id=old.id;
  INSERT INTO papers_fts(id,title,title_zh,one_sentence,concepts) VALUES(new.id,json_extract(new.doc,'$.meta.title'),json_extract(new.doc,'$.meta.titleZh'),json_extract(new.doc,'$.guide.oneSentence'),(SELECT group_concat(json_extract(value,'$.name'),' ') FROM json_each(new.doc,'$.structure.concepts')));
END;
