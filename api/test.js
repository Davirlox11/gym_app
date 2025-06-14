// Test endpoint to verify API functionality
export default function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.status(200).json({
    status: 'API working',
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    deployment: 'vercel'
  });
}