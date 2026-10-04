export const DEFAULT_VOICE_SETTINGS={voiceURI:'',rate:1,pitch:1,autoRead:false};

const clamp=(value,min,max,fallback)=>{
  if(value===null||value===undefined||value==='')return fallback;
  const number=Number(value);
  return Number.isFinite(number)?Math.min(max,Math.max(min,number)):fallback;
};

export function normalizeVoiceSettings(value={}){
  return{
    voiceURI:typeof value.voiceURI==='string'?value.voiceURI:'',
    rate:clamp(value.rate,.7,1.4,DEFAULT_VOICE_SETTINGS.rate),
    pitch:clamp(value.pitch,.7,1.3,DEFAULT_VOICE_SETTINGS.pitch),
    autoRead:value.autoRead===true
  };
}

export function readVoiceSettings(storage=globalThis.localStorage){
  try{
    const saved=storage?.getItem('ell-ex.voice-settings.v1');
    return saved?normalizeVoiceSettings(JSON.parse(saved)):{...DEFAULT_VOICE_SETTINGS};
  }catch{
    return{...DEFAULT_VOICE_SETTINGS};
  }
}

export function writeVoiceSettings(settings,storage=globalThis.localStorage){
  try{
    storage?.setItem('ell-ex.voice-settings.v1',JSON.stringify(normalizeVoiceSettings(settings)));
    return true;
  }catch{
    return false;
  }
}
