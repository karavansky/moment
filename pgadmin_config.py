# pgAdmin configuration for reverse proxy at /pgadmin/

# Set the URL prefix for pgAdmin
SCRIPT_NAME = '/pgadmin'

# Trust proxy headers
PROXY_X_FOR_COUNT = 1
PROXY_X_PROTO_COUNT = 1
PROXY_X_HOST_COUNT = 1

# Security settings
X_FRAME_OPTIONS = 'SAMEORIGIN'
ENHANCED_COOKIE_PROTECTION = False

# Session cookie settings for reverse proxy
SESSION_COOKIE_NAME = 'pgadmin4_session'
SESSION_COOKIE_PATH = '/pgadmin/'
SESSION_COOKIE_SAMESITE = 'Lax'
SESSION_COOKIE_SECURE = True

# CSRF settings
WTF_CSRF_ENABLED = True
WTF_CSRF_TIME_LIMIT = None
