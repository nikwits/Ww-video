// Transcribe audio or video with OpenAI Whisper.
// node transcribe.mjs <file> [--format text|srt|vtt|json] [--model whisper-1] [--language en] [--prompt "..."]
// Needs OPENAI_API_KEY. Writes the transcript to out/transcripts/<name>.<ext>.
import { readFile, writeFile, mkdir, stat, rm } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import ffmpeg from 'ffmpeg-static';

const MAX_BYTES = 25 * 1024 * 1024;
const ACCEPTED = new Set(['.flac', '.m4a', '.mp3', '.mp4', '.mpeg', '.mpga', '.oga', '.ogg', '.wav', '.webm']);
const EXT = { text: 'txt', srt: 'srt', vtt: 'vtt', json: 'json', verbose_json: 'json' };

const args = process.argv.slice(2);
const input = args.find((a, i) => !a.startsWith('--') && !args[i - 1]?.startsWith('--'));
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
const format = opt('format', 'srt');
const model = opt('model', 'whisper-1');
const language = opt('language');
const prompt = opt('prompt', 'Wits + Watts, AI consultancy, Proof Score, baseline.');

if (!input) {
  console.error('Usage: node transcribe.mjs <file> [--format text|srt|vtt|json] [--model whisper-1] [--language en]');
  process.exit(1);
}
if (!process.env.OPENAI_API_KEY) {
  console.error('Missing OPENAI_API_KEY. Get one at https://platform.openai.com/api-keys and run:\n  export OPENAI_API_KEY=sk-...');
  process.exit(1);
}
if (!EXT[format]) {
  console.error(`Unknown --format ${format}. Use text, srt, vtt or json.`);
  process.exit(1);
}

// Whisper takes files up to 25MB in a handful of formats. Anything else, or anything
// bigger, gets squeezed to mono 64kbps MP3 first (about 50 minutes fits under the cap).
let file = input;
let temp;
const size = (await stat(input)).size;
if (size > MAX_BYTES || !ACCEPTED.has(extname(input).toLowerCase())) {
  temp = join(tmpdir(), `whisper-${process.pid}.mp3`);
  console.log(`Extracting audio from ${basename(input)}...`);
  const r = spawnSync(ffmpeg, ['-loglevel', 'error', '-y', '-i', input, '-vn', '-ac', '1', '-ar', '16000', '-b:a', '64k', temp], { stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status ?? 1);
  if ((await stat(temp)).size > MAX_BYTES) {
    console.error('Audio is still over 25MB (roughly 50+ minutes). Split it into shorter files first.');
    await rm(temp, { force: true });
    process.exit(1);
  }
  file = temp;
}

const form = new FormData();
form.append('file', new Blob([await readFile(file)]), basename(file));
form.append('model', model);
form.append('response_format', format);
if (language) form.append('language', language);
if (prompt) form.append('prompt', prompt);

console.log(`Sending to ${model}...`);
const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
  method: 'POST',
  headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
  body: form,
});
if (temp) await rm(temp, { force: true });

const body = await res.text();
if (!res.ok) {
  console.error(`OpenAI returned ${res.status}: ${body}`);
  process.exit(1);
}

await mkdir('out/transcripts', { recursive: true });
const out = join('out/transcripts', `${basename(input, extname(input))}.${EXT[format]}`);
await writeFile(out, body);
console.log(`Wrote ${out}`);
