import test from'node:test';
import assert from'node:assert/strict';
import{readFile}from'node:fs/promises';
import{DEFAULT_VOICE_SETTINGS,normalizeVoiceSettings,readVoiceSettings,writeVoiceSettings}from'../src/voiceSettings.js';

test('normalizes and safely clamps voice preferences',()=>{
  assert.deepEqual(normalizeVoiceSettings({voiceURI:'device-voice',rate:9,pitch:0,autoRead:true}),{
    voiceURI:'device-voice',rate:1.4,pitch:.7,autoRead:true
  });
  assert.deepEqual(normalizeVoiceSettings({rate:'bad',pitch:null,autoRead:'yes'}),DEFAULT_VOICE_SETTINGS);
});

test('reads and writes voice preferences using device storage',()=>{
  const values=new Map();
  const storage={getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value)};
  assert.equal(writeVoiceSettings({voiceURI:'voice-1',rate:1.2,pitch:.9,autoRead:true},storage),true);
  assert.deepEqual(readVoiceSettings(storage),{voiceURI:'voice-1',rate:1.2,pitch:.9,autoRead:true});
});

test('falls back safely when stored data is invalid',()=>{
  const storage={getItem:()=>'{broken',setItem:()=>{throw new Error('blocked')}};
  assert.deepEqual(readVoiceSettings(storage),DEFAULT_VOICE_SETTINGS);
  assert.equal(writeVoiceSettings(DEFAULT_VOICE_SETTINGS,storage),false);
});

test('uses an in-app voice picker instead of the Android native select',async()=>{
  const source=await readFile(new URL('../src/main.jsx',import.meta.url),'utf8');
  assert.match(source,/className="voice-picker-button"/);
  assert.match(source,/role="listbox"/);
  assert.doesNotMatch(source,/<select[^>]*voiceSettings\.voiceURI/);
});

test('does not return the storage result as a React effect cleanup',async()=>{
  const source=await readFile(new URL('../src/main.jsx',import.meta.url),'utf8');
  assert.match(source,/useEffect\(\(\)=>\{writeVoiceSettings\(voiceSettings\)\},\[voiceSettings\]\);/);
  assert.doesNotMatch(source,/useEffect\(\(\)=>writeVoiceSettings\(voiceSettings\)/);
});
