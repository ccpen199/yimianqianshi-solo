#!/usr/bin/env python3
"""
Probe the macOS Accessibility tree for a visible Trae window.

This script does not paste or click. It optionally raises the matched window
and writes a bounded AX tree report for designing the serial UI Operator.
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
import time
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[3]
OUT_ROOT = REPO_ROOT / "docs/data/generated/automation_probe"


APPLESCRIPT = r'''
using terms from application "System Events"
on safeText(v)
  try
    set t to v as text
    set t to my replaceText(t, linefeed, " ")
    set t to my replaceText(t, return, " ")
    if length of t > 120 then set t to text 1 thru 120 of t
    return t
  on error
    return ""
  end try
end safeText

on replaceText(theText, searchString, replacementString)
  set AppleScript's text item delimiters to searchString
  set textItems to text items of theText
  set AppleScript's text item delimiters to replacementString
  set joinedText to textItems as text
  set AppleScript's text item delimiters to ""
  return joinedText
end replaceText

on elementSummary(e)
  set roleText to ""
  set subroleText to ""
  set nameText to ""
  set descText to ""
  set valueText to ""
  set enabledText to ""
  try
    set roleText to role of e as text
  end try
  try
    set subroleText to subrole of e as text
  end try
  try
    set nameText to my safeText(name of e)
  end try
  try
    set descText to my safeText(description of e)
  end try
  try
    set valueText to my safeText(value of e)
  end try
  try
    set enabledText to enabled of e as text
  end try
  return "role=" & roleText & " subrole=" & subroleText & " name=" & nameText & " desc=" & descText & " value=" & valueText & " enabled=" & enabledText
end elementSummary

on dumpElement(e, depth, maxDepth, maxLines)
  global outputLines, lineCount
  if (lineCount is greater than maxLines) or (lineCount is equal to maxLines) then return
  set indentText to ""
  repeat depth times
    set indentText to indentText & "  "
  end repeat
  set end of outputLines to indentText & my elementSummary(e)
  set lineCount to lineCount + 1
  if (depth is greater than maxDepth) or (depth is equal to maxDepth) then return
  try
    set childItems to UI elements of e
    set childCount to count of childItems
    if childCount > 40 then set childCount to 40
    repeat with i from 1 to childCount
      my dumpElement(item i of childItems, depth + 1, maxDepth, maxLines)
      if (lineCount is greater than maxLines) or (lineCount is equal to maxLines) then exit repeat
    end repeat
  end try
end dumpElement

on run argv
  set targetOrder to item 1 of argv
  set maxDepth to item 2 of argv as integer
  set maxLines to item 3 of argv as integer
  set shouldFocus to item 4 of argv
  global outputLines, lineCount
  set outputLines to {}
  set lineCount to 0
  set matchedName to ""

  tell application "System Events"
    repeat with processName in {"Electron", "Trae CN"}
      if exists process processName then
        tell process processName
          repeat with w in windows
            try
              set windowName to name of w as text
              if windowName contains targetOrder then
                set matchedName to windowName
                if shouldFocus is "focus" then
                  set frontmost to true
                  perform action "AXRaise" of w
                  delay 0.2
                end if
                set end of outputLines to "WINDOW=" & windowName
                my dumpElement(w, 0, maxDepth, maxLines)
                exit repeat
              end if
            end try
          end repeat
        end tell
      end if
      if matchedName is not "" then exit repeat
    end repeat
  end tell

  if matchedName is "" then
    return "MATCHED=false"
  end if
  set AppleScript's text item delimiters to linefeed
  set joinedText to outputLines as text
  set AppleScript's text item delimiters to ""
  return "MATCHED=true" & linefeed & joinedText
end run
end using terms from
'''


def run_probe(order: str, group: str, max_depth: int, max_lines: int, focus: bool) -> dict:
    out_dir = OUT_ROOT / (group or "custom-orders")
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / f"{order}-ax-tree.txt"
    cmd = [
        "osascript",
        "-",
        order,
        str(max(1, min(max_depth, 12))),
        str(max(20, min(max_lines, 1200))),
        "focus" if focus else "nofocus",
    ]
    completed = subprocess.run(cmd, input=APPLESCRIPT, text=True, capture_output=True, check=False, timeout=30)
    text = (completed.stdout or "").strip()
    if completed.returncode != 0:
        text = (completed.stderr or text or "osascript failed").strip()
    out_path.write_text(text)
    return {
        "ok": completed.returncode == 0 and "MATCHED=true" in text,
        "order": order,
        "group": group,
        "focused": bool(focus),
        "path": str(out_path),
        "matched": "MATCHED=true" in text,
        "lineCount": len(text.splitlines()) if text else 0,
        "preview": "\n".join(text.splitlines()[:80]),
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--group", default="custom-orders")
    parser.add_argument("--order", required=True)
    parser.add_argument("--max-depth", type=int, default=7)
    parser.add_argument("--max-lines", type=int, default=500)
    parser.add_argument("--focus", action="store_true")
    args = parser.parse_args()
    if sys.platform != "darwin":
        raise SystemExit("AX probe currently requires macOS")
    result = run_probe(args.order, args.group, args.max_depth, args.max_lines, args.focus)
    result["generatedAt"] = time.strftime("%Y-%m-%d %H:%M:%S")
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
