"""新闻AI接线；IO与发布由T13注入。"""

from .enrich import EnrichmentResult, Fallback, Headline, enrich_edition

__all__ = ["EnrichmentResult", "Fallback", "Headline", "enrich_edition"]
