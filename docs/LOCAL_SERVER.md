# Running Local Server on Port 5174

This guide explains how to start the development server on port 5174 instead of the default port 5173.

## Quick Start

### Option 1: Command Line Override (Recommended)
```bash
npm run dev -- --port 5174
```

This temporarily overrides the port without modifying configuration files.

### Option 2: Modify Vite Configuration
Edit `vite.config.js`:

```javascript
import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: '0.0.0.0', // Allow testing from mobile devices on local network
    port: 5174        // Changed from 5173 to 5174
  }
});
```

Then start the server normally:
```bash
npm run dev
```

### Option 3: Environment Variable
```bash
VITE_PORT=5174 npm run dev
```

**Note:** This requires modifying `vite.config.js` to read the environment variable:

```javascript
import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: process.env.VITE_PORT || 5173
  }
});
```

---

## Accessing the Server

### Local Desktop
```
http://localhost:5174
```

### Mobile on Local Network
Replace `<your-ip>` with your computer's IP address:
```
http://<your-ip>:5174
```

**Find your IP address:**
```bash
# macOS/Linux
ifconfig | grep "inet "

# Windows
ipconfig
```

---

## Troubleshooting

### Port Already in Use
If port 5174 is already in use, you'll see an error like:
```
Port 5174 is in use, trying 5175...
```

Choose from:
1. Stop the process using port 5174
2. Use a different port: `npm run dev -- --port 5175`
3. Check what's using the port:
   ```bash
   # macOS/Linux
   lsof -i :5174
   
   # Windows
   netstat -ano | findstr :5174
   ```

### Firewall Issues
Make sure your firewall allows connections on port 5174:
- **macOS:** Check System Preferences → Security & Privacy → Firewall
- **Windows:** Check Windows Defender Firewall settings
- **Linux:** Check iptables or ufw rules

### Mobile Can't Connect
- Ensure both devices are on the same Wi-Fi network
- Double-check the IP address (use actual IP, not localhost)
- Disable VPN if issues persist
- Check if firewall blocks incoming connections

---

## Reverting to Port 5173

### If Using Option 1 (Command Override)
Simply run without the `--port` flag:
```bash
npm run dev
```

### If Using Option 2 (Modified Config)
Change `vite.config.js` back:
```javascript
port: 5173  // Default
```

### If Using Option 3 (Environment Variable)
Run without the environment variable:
```bash
npm run dev  # Uses VITE_PORT from vite.config.js (default 5173)
```

---

## Recommended Workflow

For consistent port usage across team members, **Option 2** (modifying `vite.config.js`) is best if 5174 is required. However, if you only occasionally need port 5174, use **Option 1** for convenience.

To avoid accidental commits of configuration changes, consider adding port overrides to `.env.local`:
```bash
# Create .env.local (not tracked by git)
VITE_PORT=5174
```

Then update `vite.config.js`:
```javascript
import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: process.env.VITE_PORT || 5173
  }
});
```

Now `npm run dev` will use the port from `.env.local` automatically.
