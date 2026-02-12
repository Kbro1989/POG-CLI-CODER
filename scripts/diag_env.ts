import * as dotenv from 'dotenv';
dotenv.config();

console.log('--- Env Diagnostic ---');
console.log('CLOUDFLARE_ACCOUNT_ID:', process.env.CLOUDFLARE_ACCOUNT_ID ? 'LOADED' : 'MISSING');
if (process.env.CLOUDFLARE_ACCOUNT_ID) {
    console.log('ID Length:', process.env.CLOUDFLARE_ACCOUNT_ID.length);
    console.log('Starts with:', process.env.CLOUDFLARE_ACCOUNT_ID.substring(0, 4));
}
console.log('CLOUDFLARE_API_TOKEN:', process.env.CLOUDFLARE_API_TOKEN ? 'LOADED' : 'MISSING (Check if commented out)');
console.log('CLOUDFLARE_API_KEY:', process.env.CLOUDFLARE_API_KEY ? 'LOADED' : 'MISSING');
console.log('CLOUDFLARE_GATEWAY_URL:', process.env.CLOUDFLARE_GATEWAY_URL ? 'LOADED' : 'MISSING');

if (process.env.CLOUDFLARE_GATEWAY_URL) {
    console.log('Gateway URL:', process.env.CLOUDFLARE_GATEWAY_URL);
}
