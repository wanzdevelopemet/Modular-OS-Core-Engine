# ==============================================================================
# Isolated Production Container for HelloWorld Starter Module (Modular-OS)
# ==============================================================================
FROM nginx:alpine

# Copy built optimized frontend assets into Nginx static web root
COPY modules/helloworld-module/frontend/dist /usr/share/nginx/html

# Expose isolated port 4003
EXPOSE 4003

# Configure Nginx to listen on port 4003 and handle SPA routing
RUN echo 'server { \
    listen 4003; \
    server_name localhost; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html; \
        try_files $uri $uri/ /index.html; \
        add_header Access-Control-Allow-Origin *; \
    } \
}' > /etc/nginx/conf.d/default.conf

CMD ["nginx", "-g", "daemon off;"]

