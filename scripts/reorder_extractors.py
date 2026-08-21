#!/usr/bin/env python3
"""Reorder: move extractors BEFORE confirmImport in useMediaLibrary.ts"""

path = '/home/z/my-project/src/hooks/useMediaLibrary.ts'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# The confirmImport block
confirm_import_start = '  // ════════════════════════════════════════════════════════════\n  // CONFIRM IMPORT'
confirm_import_end = '  }, [pendingImport, registerUrl])\n\n  // ── Background duration extractor for songs ──'

# The extractors block (both extractors)
extractors_start = '  // ── Background duration extractor for songs ──'
extractors_end = '  // ── Cancel import — discard pending files ──'

ci_start_idx = content.find(confirm_import_start)
ci_end_idx = content.find(confirm_import_end)
ex_start_idx = content.find(extractors_start)
ex_end_idx = content.find(extractors_end)

if any(idx == -1 for idx in [ci_start_idx, ci_end_idx, ex_start_idx, ex_end_idx]):
    print(f"ERROR: markers not found. ci_start={ci_start_idx}, ci_end={ci_end_idx}, ex_start={ex_start_idx}, ex_end={ex_end_idx}")
    exit(1)

# Extract blocks
confirm_import_block = content[ci_start_idx:ci_end_idx + len('  }, [pendingImport, registerUrl])')]
extractors_block = content[ex_start_idx:ex_end_idx]

# Reconstruct: extractors first, then confirmImport
# Original: [before_ci] [confirmImport] [extractors] [cancel_import_onwards]
# New:      [before_ci] [extractors]   [confirmImport with updated deps] [cancel_import_onwards]

# Update confirmImport deps to include extractors
confirm_import_block_updated = confirm_import_block.replace(
    '  }, [pendingImport, registerUrl])',
    '  }, [pendingImport, registerUrl, extractSongDurationInBackground, extractVideoMetadataInBackground])'
)

# Build new content
before_ci = content[:ci_start_idx]
after_extractors = content[ex_end_idx:]  # starts at "// ── Cancel import"

new_content = before_ci + extractors_block + '\n\n' + confirm_import_block_updated + '\n\n' + after_extractors

with open(path, 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Reordered successfully")
print(f"Old length: {len(content)}")
print(f"New length: {len(new_content)}")
