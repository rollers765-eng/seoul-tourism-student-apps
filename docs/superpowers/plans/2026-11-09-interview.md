# Seoul Tourism Interview Game Implementation Plan

Goal: build a separate mobile-friendly Three.js interview world using the existing eight questions; preserve the original site.

Architecture: a static GitHub Pages app; local interview state with speech recognition and synthesis; optional independently configured shared presence and moderated gratitude data. Never simulate remote data as live.

1. Test question selection: first question always 1, four unique from 2–8, first default 60 seconds, others 90.
2. Build accessible responsive lobby, department rooms, NPC, movement and interview panels; verify keyboard and touch.
3. Implement speech and timer with explicit microphone activation, graceful fallback and editable local transcript.
4. Provide separate cafe and clearly disclose when shared service is not configured. Implement server-side secured posting and teacher moderation only with a confirmed backend.
5. Verify in mobile and desktop, compare the visual reference and publish only after shared features and safeguards are ready.
