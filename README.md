# coruna-extractor
Small project to extract Coruña info from BOE and BORME

## CORS Configuration

This project uses a CORS proxy to bypass CORS restrictions when fetching data from the BOE API on GitHub Pages.

### How it works

Since GitHub Pages only serves static files, we can't run a server-side proxy. Instead, the project uses a public CORS proxy service to make cross-origin requests.

### Configuring the CORS Proxy

Edit `script.js` and choose one of these options:

1. **AllOrigins (default)**: `https://api.allorigins.win/raw?url=`
   - Free and reliable
   - Currently active

2. **CORS Proxy.io**: `https://corsproxy.io/?`
   - Alternative option
   - Uncomment to use

3. **No Proxy**: Set `CORS_PROXY = ""`
   - Try this first if the API supports CORS
   - Direct requests (fastest if supported)

### Alternative Solutions

If public proxies don't work or you need more control:

- **Netlify/Vercel**: Deploy with serverless functions as a proxy
- **Cloudflare Workers**: Create a CORS proxy worker
- **GitHub Actions**: Set up a scheduled job to fetch and cache data

### Testing

1. Open the browser console (F12)
2. Select a date and click "Store Date"
3. Check the network tab for CORS errors
4. If you see CORS errors, try a different proxy option
