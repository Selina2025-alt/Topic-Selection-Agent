import type { MonitoringDatabase } from "@/lib/db/database";

export function ensureMonitoringSchema(database: MonitoringDatabase) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS keyword_targets (
      id TEXT PRIMARY KEY,
      category_id TEXT NOT NULL,
      keyword TEXT NOT NULL,
      platform_ids TEXT NOT NULL,
      created_at TEXT NOT NULL,
      last_run_at TEXT,
      last_run_status TEXT NOT NULL DEFAULT 'idle',
      last_result_count INTEGER NOT NULL DEFAULT 0
    );

    CREATE UNIQUE INDEX IF NOT EXISTS keyword_targets_category_keyword_idx
      ON keyword_targets (category_id, keyword);

    CREATE TABLE IF NOT EXISTS sync_runs (
      id TEXT PRIMARY KEY,
      category_id TEXT NOT NULL,
      keyword_target_id TEXT NOT NULL,
      platform_id TEXT NOT NULL,
      status TEXT NOT NULL,
      result_count INTEGER NOT NULL DEFAULT 0,
      error_message TEXT,
      started_at TEXT NOT NULL,
      finished_at TEXT
    );

    CREATE INDEX IF NOT EXISTS sync_runs_lookup_idx
      ON sync_runs (category_id, keyword_target_id, platform_id, started_at DESC);

    CREATE TABLE IF NOT EXISTS collected_contents (
      platform_id TEXT NOT NULL,
      content_id TEXT NOT NULL,
      category_id TEXT NOT NULL,
      keyword_target_id TEXT NOT NULL,
      sync_run_id TEXT,
      title TEXT NOT NULL,
      summary TEXT,
      author_name TEXT NOT NULL,
      author_id TEXT,
      published_at TEXT NOT NULL,
      publish_timestamp INTEGER NOT NULL DEFAULT 0,
      read_count INTEGER,
      like_count INTEGER,
      comment_count INTEGER,
      article_url TEXT,
      avatar TEXT,
      is_original INTEGER,
      keyword TEXT,
      raw_order_index INTEGER,
      source_payload TEXT,
      last_collected_at TEXT NOT NULL,
      PRIMARY KEY (platform_id, content_id, keyword_target_id)
    );

    CREATE INDEX IF NOT EXISTS collected_contents_lookup_idx
      ON collected_contents (category_id, keyword_target_id, platform_id, publish_timestamp DESC);

    CREATE TABLE IF NOT EXISTS search_queries (
      id TEXT PRIMARY KEY,
      category_id TEXT NOT NULL,
      keyword_target_id TEXT,
      keyword TEXT NOT NULL,
      platform_scope TEXT NOT NULL,
      trigger_type TEXT NOT NULL,
      status TEXT NOT NULL,
      fetched_count INTEGER NOT NULL DEFAULT 0,
      capped_count INTEGER NOT NULL DEFAULT 0,
      started_at TEXT NOT NULL,
      finished_at TEXT,
      error_message TEXT
    );

    CREATE INDEX IF NOT EXISTS search_queries_lookup_idx
      ON search_queries (category_id, started_at DESC);

    CREATE TABLE IF NOT EXISTS search_query_contents (
      search_query_id TEXT NOT NULL,
      category_id TEXT NOT NULL,
      keyword_target_id TEXT,
      platform_id TEXT NOT NULL,
      content_id TEXT NOT NULL,
      title TEXT NOT NULL,
      summary TEXT,
      author_name TEXT NOT NULL,
      author_id TEXT,
      published_at TEXT NOT NULL,
      publish_timestamp INTEGER NOT NULL DEFAULT 0,
      read_count INTEGER,
      like_count INTEGER,
      comment_count INTEGER,
      article_url TEXT,
      avatar TEXT,
      is_original INTEGER,
      keyword TEXT,
      raw_order_index INTEGER,
      source_payload TEXT,
      last_collected_at TEXT NOT NULL,
      PRIMARY KEY (search_query_id, platform_id, content_id)
    );

    CREATE INDEX IF NOT EXISTS search_query_contents_lookup_idx
      ON search_query_contents (search_query_id, platform_id, publish_timestamp DESC);

    CREATE TABLE IF NOT EXISTS analysis_snapshots (
      id TEXT PRIMARY KEY,
      search_query_id TEXT NOT NULL,
      category_id TEXT NOT NULL,
      keyword TEXT NOT NULL,
      generated_at TEXT NOT NULL,
      hot_summary TEXT NOT NULL,
      focus_summary TEXT NOT NULL,
      pattern_summary TEXT NOT NULL,
      insight_summary TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS analysis_snapshots_lookup_idx
      ON analysis_snapshots (search_query_id, generated_at DESC);

    CREATE TABLE IF NOT EXISTS analysis_topics (
      id TEXT PRIMARY KEY,
      snapshot_id TEXT NOT NULL,
      title TEXT NOT NULL,
      intro TEXT NOT NULL,
      why_now TEXT NOT NULL,
      hook TEXT NOT NULL,
      growth TEXT NOT NULL,
      support_content_ids TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS analysis_topics_lookup_idx
      ON analysis_topics (snapshot_id);

    CREATE TABLE IF NOT EXISTS analysis_settings (
      singleton_key TEXT PRIMARY KEY,
      enabled INTEGER NOT NULL,
      time TEXT NOT NULL,
      provider TEXT NOT NULL,
      model TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS analysis_evidence_items (
      id TEXT PRIMARY KEY,
      snapshot_id TEXT NOT NULL,
      content_id TEXT NOT NULL,
      keyword TEXT NOT NULL,
      platform_id TEXT NOT NULL,
      title TEXT NOT NULL,
      brief_summary TEXT NOT NULL,
      key_facts_json TEXT NOT NULL,
      keywords_json TEXT NOT NULL,
      highlights_json TEXT NOT NULL,
      attention_signals_json TEXT NOT NULL,
      topic_angles_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS analysis_evidence_items_snapshot_idx
      ON analysis_evidence_items (snapshot_id);

    INSERT INTO search_query_contents (
      search_query_id,
      category_id,
      keyword_target_id,
      platform_id,
      content_id,
      title,
      summary,
      author_name,
      author_id,
      published_at,
      publish_timestamp,
      read_count,
      like_count,
      comment_count,
      article_url,
      avatar,
      is_original,
      keyword,
      raw_order_index,
      source_payload,
      last_collected_at
    )
    SELECT
      sq.id,
      cc.category_id,
      cc.keyword_target_id,
      cc.platform_id,
      cc.content_id,
      cc.title,
      cc.summary,
      cc.author_name,
      cc.author_id,
      cc.published_at,
      cc.publish_timestamp,
      cc.read_count,
      cc.like_count,
      cc.comment_count,
      cc.article_url,
      cc.avatar,
      cc.is_original,
      cc.keyword,
      cc.raw_order_index,
      cc.source_payload,
      cc.last_collected_at
    FROM collected_contents cc
    INNER JOIN search_queries sq
      ON sq.id = 'query-' || cc.sync_run_id
    LEFT JOIN search_query_contents archived
      ON archived.search_query_id = sq.id
      AND archived.platform_id = cc.platform_id
      AND archived.content_id = cc.content_id
    WHERE cc.sync_run_id IS NOT NULL
      AND archived.search_query_id IS NULL;
  `);
}
