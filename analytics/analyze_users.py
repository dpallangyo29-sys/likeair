"""Create aggregate LikeAir usage reports from Supabase interactions.

Required environment variables:
  SUPABASE_URL (or VITE_SUPABASE_URL)
  SUPABASE_SERVICE_ROLE_KEY

Run from the repository root:
  python analytics/analyze_users.py --days 30
"""

from __future__ import annotations

import argparse
import json
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pandas as pd
from dotenv import load_dotenv
from supabase import create_client


def main() -> None:
    parser = argparse.ArgumentParser(description="Summarize LikeAir interactions.")
    parser.add_argument("--days", type=int, default=30, help="Number of days to analyze")
    parser.add_argument("--output", default="analytics/output", help="Report output directory")
    args = parser.parse_args()

    load_dotenv()
    url = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL")
    service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not service_key:
        raise SystemExit(
            "Set SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY first."
        )
    if args.days < 1:
        raise SystemExit("--days must be at least 1.")

    since = datetime.now(timezone.utc) - timedelta(days=args.days)
    client = create_client(url, service_key)
    response = (
        client.table("interactions")
        .select("event, item_type, category, weight, created_at, user_id, session_id")
        .gte("created_at", since.isoformat())
        .limit(100000)
        .execute()
    )

    rows = response.data or []
    frame = pd.DataFrame(rows)
    output_dir = Path(args.output)
    output_dir.mkdir(parents=True, exist_ok=True)

    if frame.empty:
        summary = {"period_days": args.days, "interaction_count": 0}
        (output_dir / "summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
        print(json.dumps(summary, indent=2))
        return

    frame["created_at"] = pd.to_datetime(frame["created_at"], utc=True)
    frame["day"] = frame["created_at"].dt.date.astype(str)
    frame["actor_id"] = frame["user_id"].fillna(frame["session_id"])

    event_counts = frame.groupby("event").size().sort_values(ascending=False)
    category_counts = (
        frame.dropna(subset=["category"])
        .groupby("category")
        .agg(interactions=("event", "size"), total_weight=("weight", "sum"))
        .sort_values("total_weight", ascending=False)
    )
    daily_counts = frame.groupby("day").size().rename("interactions")

    event_counts.rename("interactions").to_csv(output_dir / "events.csv")
    category_counts.to_csv(output_dir / "categories.csv")
    daily_counts.to_csv(output_dir / "daily.csv")

    summary = {
        "period_days": args.days,
        "interaction_count": int(len(frame)),
        "unique_users_or_sessions": int(frame["actor_id"].nunique()),
        "unique_authenticated_users": int(frame["user_id"].dropna().nunique()),
        "top_events": event_counts.head(10).to_dict(),
        "top_categories": category_counts.head(10)["interactions"].to_dict(),
    }
    (output_dir / "summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
