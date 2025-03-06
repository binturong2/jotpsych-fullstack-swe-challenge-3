# Changelog

## 2025-03-06

### Added
- Created CLAUDE.md with development guidelines, build commands, and code style information
- Added custom CSS animations for loading indicator
- Created comprehensive .gitignore file

### Fixed
- Fixed audio recorder timer bug:
  - Timer now properly increments during recording
  - Recording automatically stops after reaching maximum limit (10 seconds)
  - Fixed button text to show correct remaining time
  - Used useCallback for stable stopRecording function

### Improved
- Added loading indicator for audio transcription process:
  - Shows when transcription processing begins
  - Displays while waiting for the transcription result
  - Gracefully transitions when the transcription completes
  - Disables recording controls during transcription