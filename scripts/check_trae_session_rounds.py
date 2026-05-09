#!/usr/bin/env python3
import json
import sys
from pathlib import Path


def main():
  repo_root = Path(__file__).resolve().parents[1]
  sys.path.insert(0, str(repo_root / 'solo-coder' / 'workbench'))

  import serve_workbench as sw

  assert sw._object_id_time_text('69f66aa685d83e4a45ef891b') == '2026/5/3 00:20:38', 'task message ObjectId time should be canonical'

  def fake_recent(limit=80):
    base = Path('/Users/chen/Library/Application Support/Trae CN/logs/20260501T175543')
    return (
      [str(base / 'Modular' / 'ai-agent_0_1777650945170_stdout.log')],
      [str(base / 'window25' / 'renderer.1.log')],
    )

  original_recent = sw._recent_trae_log_files
  sw._recent_trae_log_files = fake_recent
  try:
    payload = sw.extract_trae_session_rounds('xm-12176', include_trace=True)
  finally:
    sw._recent_trae_log_files = original_recent

  rendered = json.dumps(payload, ensure_ascii=False)
  assert 'missing_trace' not in rendered, 'missing_trace still present in rendered session rounds'
  rows = payload.get('rows') or []
  assert rows and all(row.get('sessionId') == row.get('logTrace') for row in rows), 'row sessionId should expose the full Trae trace'
  assert rows and all(row.get('rawSessionId') == payload.get('sessionId') for row in rows), 'row rawSessionId should keep the raw 24-char session id'
  assert rows[0].get('logTrace', '').startswith('.3792634309254663:74aca34252350a889b6a226186e0ba7e_'), 'first row trace did not resolve'
  assert '69f6682c85d83e4a45ef86e0' in rows[1].get('logTrace', ''), 'second row still uses the wrong task message id'
  assert rows[2].get('logTrace', '').startswith('.3792634309254663:38417f56103f6eda2ff53f2d07ca7b1e_'), 'third row trace did not resolve'
  assert '69f66bb685d83e4a45ef8a53.69f66bb5827ee74b6d1987bf' in rows[2].get('logTrace', ''), 'third row still uses another round message id'

  stale_rows = [{
    'sessionId': rows[1].get('logTrace', ''),
    'logTrace': rows[2].get('logTrace', ''),
    'conversation': rows[2].get('conversation', ''),
  }]
  normalized = sw.normalize_trae_session_rows(stale_rows)
  assert normalized[0]['sessionId'] == rows[2].get('logTrace'), 'stale row sessionId should normalize to the canonical full trace'
  assert normalized[0]['rawSessionId'] == payload.get('sessionId'), 'stale row rawSessionId should keep the raw session id'
  assert normalized[0]['logTrace'] == rows[2].get('logTrace'), 'row logTrace should keep the canonical trace'
  print('OK')


if __name__ == '__main__':
  main()
