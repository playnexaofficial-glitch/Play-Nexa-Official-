#!/usr/bin/env python3
"""Replace the broken video picker functions in useMediaLibrary.ts with preview-modal versions."""

import re

path = '/home/z/my-project/src/hooks/useMediaLibrary.ts'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Find the start of "WEB FILE PICKER — Video Files" section
# and end at "GET PLAYABLE URL" section
start_marker = '  // ════════════════════════════════════════════════════════════\n  // WEB FILE PICKER — Video Files'
end_marker = '  // ════════════════════════════════════════════════════════════\n  // GET PLAYABLE URL — Re-create object URL from stored File if needed'

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx == -1:
    print("ERROR: start marker not found")
    exit(1)
if end_idx == -1:
    print("ERROR: end marker not found")
    exit(1)

new_section = """  // ════════════════════════════════════════════════════════════
  // WEB FILE PICKER — Video Files (opens preview modal)
  // Picker → user selects → preview modal opens → user clicks Import All
  // ════════════════════════════════════════════════════════════

  const pickVideoFiles = useCallback(() => {
    if (isNative) return

    const input = document.createElement('input')
    input.type = 'file'
    input.multiple = true
    input.accept = 'video/*'

    input.onchange = (e: Event) => {
      const target = e.target as HTMLInputElement
      const fileList = Array.from(target.files || [])
      if (fileList.length === 0) return

      const videoFiles = fileList.filter(f => isValidVideoExt(getFileExtension(f.name)))
      if (videoFiles.length === 0) return

      setPendingImport({ files: videoFiles, type: 'video' })
    }

    document.body.appendChild(input)
    input.click()
    document.body.removeChild(input)
  }, [isNative])

  // ════════════════════════════════════════════════════════════
  // WEB FOLDER PICKER — Video (opens preview modal)
  // ════════════════════════════════════════════════════════════

  const pickVideoFolder = useCallback(() => {
    if (isNative) return

    const input = document.createElement('input')
    input.type = 'file'
    input.multiple = true
    input.accept = 'video/*'
    // @ts-ignore — webkitdirectory is non-standard but widely supported
    input.webkitdirectory = true
    // @ts-ignore
    input.directory = true

    input.onchange = (e: Event) => {
      const target = e.target as HTMLInputElement
      const fileList = Array.from(target.files || [])
      if (fileList.length === 0) return

      const videoFiles = fileList.filter(f => isValidVideoExt(getFileExtension(f.name)))
      if (videoFiles.length === 0) return

      setPendingImport({ files: videoFiles, type: 'video' })
    }

    document.body.appendChild(input)
    input.click()
    document.body.removeChild(input)
  }, [isNative])

"""

new_content = content[:start_idx] + new_section + content[end_idx:]

with open(path, 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Video picker functions replaced successfully")
print(f"Old length: {len(content)}")
print(f"New length: {len(new_content)}")
