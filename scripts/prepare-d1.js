import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const defaultWranglerPath = path.resolve(__dirname, '../wrangler.toml');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function cleanDatabaseId(id) {
  if (id === null || id === undefined) return null;
  if (typeof id !== 'string') id = String(id);
  // Trim whitespace and strip all enclosing quotes
  const trimmed = id.trim().replace(/^["']+|["']+$/g, '').trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function isValidUuid(id) {
  const cleaned = cleanDatabaseId(id);
  return cleaned ? UUID_REGEX.test(cleaned) : false;
}

export function isPlaceholder(id) {
  const cleaned = cleanDatabaseId(id);
  if (!cleaned) return true;
  if (!isValidUuid(cleaned)) return true;
  const lower = cleaned.toLowerCase();
  return (
    lower === 'lenz-db-local' ||
    lower === '00000000-0000-0000-0000-000000000000' ||
    lower.includes('placeholder') ||
    lower.includes('local') ||
    lower.includes('paste') ||
    lower.includes('todo') ||
    (cleaned.startsWith('<') && cleaned.endsWith('>'))
  );
}

export function syncD1Config(customWranglerPath, envVar) {
  const targetPath = customWranglerPath || defaultWranglerPath;
  const candidateEnv = envVar !== undefined 
    ? envVar 
    : (process.env.D1_DATABASE_ID || process.env.CLOUDFLARE_D1_DATABASE_ID || process.env.DATABASE_ID || process.env.CLOUDFLARE_DATABASE_ID);

  if (!fs.existsSync(targetPath)) {
    return { success: false, reason: 'file_not_found' };
  }

  let content = fs.readFileSync(targetPath, 'utf-8');
  const filename = path.basename(targetPath);
  const cleanId = cleanDatabaseId(candidateEnv);

  if (cleanId) {
    if (!isValidUuid(cleanId)) {
      console.warn(`\n⚠️  [prepare-d1] WARNING: Provided database ID '${cleanId}' does not match standard UUID format (8-4-4-4-12 hex).`);
    }

    console.log(`[prepare-d1] Setting D1 database ID in ${filename}: ${cleanId}`);

    // Check if database_id line exists (active or commented out)
    const activeDbIdRegex = /^[ \t]*database_id[ \t]*=[ \t]*[^\r\n]*/m;
    const commentedDbIdRegex = /^[ \t]*#[ \t]*database_id[ \t]*=[ \t]*[^\r\n]*/m;

    if (activeDbIdRegex.test(content)) {
      content = content.replace(activeDbIdRegex, `database_id = "${cleanId}"`);
    } else if (commentedDbIdRegex.test(content)) {
      content = content.replace(commentedDbIdRegex, `database_id = "${cleanId}"`);
    } else {
      // Find [[d1_databases]] section and append database_id after database_name
      const d1SectionRegex = /(\[\[d1_databases\]\][\s\S]*?database_name[ \t]*=[ \t]*["'][^"'\n]*["'])/;
      if (d1SectionRegex.test(content)) {
        content = content.replace(d1SectionRegex, `$1\ndatabase_id = "${cleanId}"`);
      } else {
        content += `\n[[d1_databases]]\nbinding = "DB"\ndatabase_name = "lenz-db"\ndatabase_id = "${cleanId}"\n`;
      }
    }

    fs.writeFileSync(targetPath, content, 'utf-8');
    console.log(`[prepare-d1] Successfully updated database_id in ${filename}`);
    return { success: true, updated: true, databaseId: cleanId, reason: 'env_var' };
  }

  // No environment variable provided; inspect existing wrangler.toml content
  const activeMatch = content.match(/^[ \t]*database_id[ \t]*=[ \t]*([^\r\n]*)/m);
  if (activeMatch) {
    let raw = activeMatch[1].trim();
    const quoted = raw.match(/^([\"'])(.*?)\1/);
    const existingVal = cleanDatabaseId(quoted ? quoted[2] : raw.split('#')[0]);

    if (isPlaceholder(existingVal)) {
      // Remove or comment out placeholder so Wrangler does not pass dummy/empty to Cloudflare API
      console.log(`[prepare-d1] Detected placeholder database_id = "${existingVal || ''}" in ${filename}.`);
      console.log(`[prepare-d1] Commenting out placeholder to prevent Cloudflare deployment error 10021...`);
      content = content.replace(
        /^[ \t]*database_id[ \t]*=[ \t]*[^\r\n]*/m,
        '# database_id = "" # Set via D1_DATABASE_ID env var or paste D1 UUID. When omitted, Wrangler resolves "lenz-db" or inherits dashboard bindings.'
      );
      fs.writeFileSync(targetPath, content, 'utf-8');
      console.log(`[prepare-d1] Placeholder safely commented out in ${filename}.`);
      return { success: true, updated: true, databaseId: null, reason: 'placeholder_commented' };
    } else {
      console.log(`[prepare-d1] Using existing database_id from ${filename}: ${existingVal}`);
      return { success: true, updated: false, databaseId: existingVal, reason: 'existing_valid' };
    }
  }

  console.log(`[prepare-d1] No database_id configured in ${filename}. Wrangler will auto-resolve 'lenz-db' or inherit dashboard bindings.`);
  return { success: true, updated: false, databaseId: null, reason: 'omitted' };
}

// Run directly if executed as a CLI script
if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  syncD1Config();
}
