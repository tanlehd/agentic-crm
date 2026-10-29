import {mkdir} from 'node:fs/promises';

// Select a new evidence directory without overwriting earlier cutover rounds.
export async function mainEvidenceDirectory() {
 const path=process.env.CHAT_MAIN_EVIDENCE_DIR??'artifacts/chat-extraction/t09-20261027-02';
 if(!/^artifacts\/chat-extraction\/t09-[a-zA-Z0-9-]+$/.test(path))throw Error('MAIN_EVIDENCE_PATH_INVALID');
 await mkdir(path,{recursive:true});return path;
}
