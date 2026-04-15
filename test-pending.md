# Session Fix

Added null check for user.session before accessing token.
Prevents crash on expired sessions.
