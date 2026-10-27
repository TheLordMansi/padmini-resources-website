#!/usr/bin/env python3
"""Merge new product photos into image-slots.state.json"""
import json, sys, os

# Find the files
new_file = None
state_file = None

# Look for new-photo-slots.json (uploaded)
for root, dirs, files in os.walk("/mnt/user-data/uploads"):
    for f in files:
        if "new-photo-slots" in f:
            new_file = os.path.join(root, f)
            break

# Look for image-slots.state.json in project
for root, dirs, files in os.walk("."):
    for f in files:
        if f == "image-slots.state.json":
            state_file = os.path.join(root, f)
            break

if not new_file:
    print("ERROR: new-photo-slots.json not found in uploads")
    sys.exit(1)
if not state_file:
    print("ERROR: image-slots.state.json not found in project")
    sys.exit(1)

print(f"New photos: {new_file}")
print(f"State file: {state_file}")

# Read both
with open(new_file) as f:
    new_slots = json.load(f)
with open(state_file) as f:
    existing = json.load(f)

before = len(existing)
print(f"\nBefore: {before} slots")
print(f"New photos to add: {len(new_slots)} slots")

# Merge (new overwrites existing for same keys)
existing.update(new_slots)

after = len(existing)
print(f"After: {after} slots")
print(f"Added: {after - before} new, overwrote: {len(new_slots) - (after - before)} existing")

# Save
with open(state_file, "w") as f:
    json.dump(existing, f)

print(f"\n✓ Saved to {state_file}")
print(f"  File size: {os.path.getsize(state_file) // 1024}KB")

# List what was added
print("\nSlots updated:")
for slot_id in sorted(new_slots.keys()):
    print(f"  ✓ {slot_id}")
