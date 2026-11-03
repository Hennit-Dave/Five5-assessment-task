import { execSync } from 'node:child_process';
import fs from 'node:fs';

const OUT_FILE = 'task-03-client-validation/evidence/16-direct-request-command-and-response.txt';

// Direct Request 1: Invalid formats and values
const cmd1 = 'curl -i -X POST http://localhost:3000/auth/signup -H "Content-Type: application/x-www-form-urlencoded" --data "name=A&email=not-an-email&password=short"';
const output1 = execSync(cmd1).toString();

// Direct Request 2: Completely empty mandatory fields and missing terms
const cmd2 = 'curl -i -X POST http://localhost:3000/auth/signup -H "Content-Type: application/x-www-form-urlencoded" --data "name=&email=&password="';
const output2 = execSync(cmd2).toString();

const content = `# Evidence 16 — Direct Request Commands and Responses (Bypassing Browser Validation)
# Task 3, Step 8: Attack Around the Form (Direct Endpoint Requests)
# Target: Nit's Cut Prototype Server (http://localhost:3000/auth/signup)
# Date: 2026-11-03

================================================================================
REQUEST 1: INVALID VALUES & FORMATS (NAME < 2, MALFORMED EMAIL, PASSWORD < 15)
================================================================================

--- 1A. EXACT COMMAND EXECUTED ---
${cmd1}

--- 1B. EXACT SERVER RESPONSE RECEIVED (HEADERS & BODY) ---
${output1}

================================================================================
REQUEST 2: COMPLETELY EMPTY MANDATORY FIELDS (EMPTY NAME, EMPTY EMAIL, EMPTY PASSWORD)
================================================================================

--- 2A. EXACT COMMAND EXECUTED ---
${cmd2}

--- 2B. EXACT SERVER RESPONSE RECEIVED (HEADERS & BODY) ---
${output2}

================================================================================
TECHNICAL SUMMARY & OBSERVATIONS
================================================================================
1. Request 1 (Structurally Invalid Values):
   - Command: curl -i -X POST http://localhost:3000/auth/signup -H "Content-Type: application/x-www-form-urlencoded" --data "name=A&email=not-an-email&password=short"
   - Server Response Status: HTTP/1.1 200 OK
   - What it demonstrated: Bypasses the 2-character name rule, the email regex rule, the 15-character password rule, and terms agreement. The server echoes "Name submitted: A", "Email submitted: not-an-email", and "Terms accepted: No".

2. Request 2 (Completely Empty Mandatory Fields):
   - Command: curl -i -X POST http://localhost:3000/auth/signup -H "Content-Type: application/x-www-form-urlencoded" --data "name=&email=&password="
   - Server Response Status: HTTP/1.1 200 OK
   - What it demonstrated: Bypasses mandatory/required field checks completely. The server renders the result view without error; name and email are blank strings, and terms defaults to "No".

3. Meaning of HTTP 200 in the Prototype:
   - HTTP 200 OK here indicates only that the Express server route successfully received the POST request and rendered its HTML template view ('auth-result.ejs').
   - It does NOT indicate that an account was created, saved to a database, or that a user session was established (no database write or session middleware exists in this prototype).
`;

fs.writeFileSync(OUT_FILE, content);
console.log(`Successfully generated updated ${OUT_FILE}`);
