# IT Operations Dashboard - Deployment Guide

## Table of Contents
1. [Introduction](#introduction)
2. [System Requirements](#system-requirements)
3. [Development Environment Setup](#development-environment-setup)
4. [Production Environment Setup](#production-environment-setup)
5. [Deployment Options](#deployment-options)
6. [Environment Configuration](#environment-configuration)
7. [Build Process](#build-process)
8. [Backup and Restore](#backup-and-restore)
9. [Monitoring and Maintenance](#monitoring-and-maintenance)
10. [Troubleshooting](#troubleshooting)
11. [Security Considerations](#security-considerations)

## Introduction

This guide provides detailed instructions for deploying the IT Operations Dashboard in both development and production environments. The application is a client-side React application built with Vite, which can be deployed to various hosting platforms.

## System Requirements

### Minimum Requirements

- **Node.js**: v18.0.0 or higher
- **npm**: v8.0.0 or higher
- **Memory**: 2GB RAM minimum (4GB recommended)
- **Storage**: 1GB available disk space
- **Browser**: Chrome 80+, Firefox 80+, Edge 80+, Safari 14+

### Development Environment

- **Operating System**: Windows 10/11, macOS 10.15+, or Linux
- **IDE**: Visual Studio Code (recommended)
- **Git**: For version control

### Production Environment

- **Web Server**: Nginx, Apache, or any static file server
- **HTTPS**: SSL certificate for secure connections
- **CDN**: Optional but recommended for improved performance

## Development Environment Setup

### Initial Setup

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd it-operations-dashboard
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create environment files:
   
   Create a `.env.development` file:
   ```
   VITE_APP_ENV=development
   VITE_APP_TITLE="IT Operations Dashboard (Development)"
   VITE_OPENAI_API_KEY=your_openai_api_key
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Access the application:
   Open your browser and navigate to `http://localhost:5173`

### Development Scripts

- `npm run dev`: Start development server
- `npm run dev:prod`: Start development server with production environment
- `npm run build`: Build for production
- `npm run build:dev`: Build for development
- `npm run lint`: Run ESLint
- `npm run preview`: Preview production build locally
- `npm run backup`: Create a backup of the application
- `npm run restore`: Restore from a backup

## Production Environment Setup

### Building for Production

1. Create environment file:
   
   Create a `.env.production` file:
   ```
   VITE_APP_ENV=production
   VITE_APP_TITLE="IT Operations Dashboard"
   VITE_OPENAI_API_KEY=your_openai_api_key
   ```

2. Build the application:
   ```bash
   npm run build
   ```

3. The build output will be in the `dist` directory, which can be deployed to any static hosting service.

### Serving the Production Build Locally

To test the production build locally:

```bash
npm run preview
```

This will serve the production build at `http://localhost:4173`

## Deployment Options

### Option 1: Static Hosting Services

#### Netlify

1. Install Netlify CLI:
   ```bash
   npm install -g netlify-cli
   ```

2. Login to Netlify:
   ```bash
   netlify login
   ```

3. Initialize Netlify site:
   ```bash
   netlify init
   ```

4. Deploy to Netlify:
   ```bash
   netlify deploy --prod
   ```

#### Vercel

1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Login to Vercel:
   ```bash
   vercel login
   ```

3. Deploy to Vercel:
   ```bash
   vercel --prod
   ```

### Option 2: Traditional Web Servers

#### Nginx

1. Build the application:
   ```bash
   npm run build
   ```

2. Copy the contents of the `dist` directory to your Nginx server's web root.

3. Configure Nginx:
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       root /path/to/dist;
       index index.html;
       
       location / {
           try_files $uri $uri/ /index.html;
       }
       
       # Cache static assets
       location ~* \.(js|css|png|jpg|jpeg|gif|ico)$ {
           expires 30d;
           add_header Cache-Control "public, no-transform";
       }
   }
   ```

4. Restart Nginx:
   ```bash
   sudo systemctl restart nginx
   ```

#### Apache

1. Build the application:
   ```bash
   npm run build
   ```

2. Copy the contents of the `dist` directory to your Apache server's web root.

3. Create or modify `.htaccess` file:
   ```apache
   <IfModule mod_rewrite.c>
     RewriteEngine On
     RewriteBase /
     RewriteRule ^index\.html$ - [L]
     RewriteCond %{REQUEST_FILENAME} !-f
     RewriteCond %{REQUEST_FILENAME} !-d
     RewriteRule . /index.html [L]
   </IfModule>
   
   # Cache static assets
   <IfModule mod_expires.c>
     ExpiresActive On
     ExpiresByType text/css "access plus 1 month"
     ExpiresByType application/javascript "access plus 1 month"
     ExpiresByType image/jpeg "access plus 1 month"
     ExpiresByType image/png "access plus 1 month"
     ExpiresByType image/svg+xml "access plus 1 month"
   </IfModule>
   ```

4. Restart Apache:
   ```bash
   sudo systemctl restart apache2
   ```

### Option 3: Docker Deployment

1. Create a `Dockerfile`:
   ```dockerfile
   FROM node:18-alpine as build
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci
   COPY . .
   RUN npm run build

   FROM nginx:alpine
   COPY --from=build /app/dist /usr/share/nginx/html
   COPY nginx.conf /etc/nginx/conf.d/default.conf
   EXPOSE 80
   CMD ["nginx", "-g", "daemon off;"]
   ```

2. Create `nginx.conf`:
   ```nginx
   server {
       listen 80;
       server_name localhost;
       root /usr/share/nginx/html;
       index index.html;
       
       location / {
           try_files $uri $uri/ /index.html;
       }
       
       location ~* \.(js|css|png|jpg|jpeg|gif|ico)$ {
           expires 30d;
           add_header Cache-Control "public, no-transform";
       }
   }
   ```

3. Build the Docker image:
   ```bash
   docker build -t it-operations-dashboard .
   ```

4. Run the Docker container:
   ```bash
   docker run -p 80:80 it-operations-dashboard
   ```

## Environment Configuration

### Environment Variables

The application uses the following environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_APP_ENV` | Environment name | `development` |
| `VITE_APP_TITLE` | Application title | `IT Operations Dashboard` |
| `VITE_OPENAI_API_KEY` | OpenAI API key | - |

### Environment Files

- `.env.development`: Development environment variables
- `.env.production`: Production environment variables

### Handling Sensitive Data

For production deployments, consider:

1. Using environment variable injection from your hosting platform
2. Using a secrets management service
3. Implementing a backend proxy for API calls to avoid exposing API keys in the frontend

## Build Process

### Standard Build

```bash
npm run build
```

This creates an optimized production build in the `dist` directory.

### Development Build

```bash
npm run build:dev
```

This creates a development build with source maps and less optimization.

### Build Output

The build process generates:

- HTML files
- JavaScript bundles (with code splitting)
- CSS files
- Static assets (images, fonts, etc.)

### Build Customization

To customize the build process, modify `vite.config.ts`:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    minify: 'terser',
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          charts: ['recharts'],
          utils: ['date-fns']
        }
      }
    }
  },
  server: {
    port: process.env.VITE_APP_ENV === 'development' ? 5173 : 5174,
  },
});
```

## Backup and Restore

### Creating Backups

To create a backup of the application:

```bash
npm run backup
```

This creates a ZIP file in the `backups` directory containing all application files.

### Listing Available Backups

To list available backups:

```bash
npm run restore
```

### Restoring from Backup

To restore from a specific backup:

```bash
npm run restore backup-v1-2025-03-29T12-43-46.zip
```

After restoration, reinstall dependencies:

```bash
npm install
```

## Monitoring and Maintenance

### Performance Monitoring

For production deployments, consider implementing:

1. **Web Vitals Monitoring**: Track Core Web Vitals metrics
2. **Error Tracking**: Implement error tracking with services like Sentry
3. **Usage Analytics**: Add Google Analytics or similar service

### Regular Maintenance

1. **Dependency Updates**: Regularly update dependencies
   ```bash
   npm outdated
   npm update
   ```

2. **Security Audits**: Run security audits
   ```bash
   npm audit
   npm audit fix
   ```

3. **Backups**: Create regular backups
   ```bash
   npm run backup
   ```

## Troubleshooting

### Common Issues

#### Build Failures

**Issue**: Build fails with dependency errors
**Solution**: 
```bash
rm -rf node_modules
npm cache clean --force
npm install
```

#### Runtime Errors

**Issue**: "Failed to fetch" errors when using OpenAI API
**Solution**: Check your API key and ensure it has the necessary permissions

**Issue**: Charts not rendering correctly
**Solution**: Ensure you have sufficient data for the selected filters

#### Performance Issues

**Issue**: Slow performance with large datasets
**Solution**: 
- Limit the number of records processed
- Implement pagination for large data tables
- Optimize component rendering with memoization

### Logs and Debugging

In development mode, use browser developer tools:
- Console for JavaScript errors
- Network tab for API calls
- Performance tab for rendering issues

## Security Considerations

### Frontend Security

1. **API Key Protection**: 
   - Use environment variables for API keys
   - Consider implementing a backend proxy for API calls

2. **Content Security Policy**:
   Add a CSP header to your web server configuration:
   ```
   Content-Security-Policy: default-src 'self'; script-src 'self'; connect-src 'self' https://api.openai.com; img-src 'self' data: https://images.unsplash.com;
   ```

3. **HTTPS**:
   Always serve the application over HTTPS in production.

### Authentication Security

The current implementation uses a simple username/password authentication. For production, consider:

1. Implementing JWT-based authentication
2. Using OAuth 2.0 with an identity provider
3. Adding multi-factor authentication
4. Implementing proper session management

### Data Security

1. **Data Handling**:
   - Minimize sensitive data collection
   - Implement proper data validation
   - Consider data encryption for sensitive information

2. **OpenAI API Usage**:
   - Be mindful of what data is sent to the OpenAI API
   - Anonymize or redact sensitive information before sending
   - Review OpenAI's data usage policies