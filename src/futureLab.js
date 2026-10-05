export const FUTURE_PROJECTS=[
  {
    id:'sustainable-city',
    title:'Sustainable City World',
    summary:'Simulate a greener tomorrow',
    description:'Shape a living city model where transport, energy, water, and neighbourhood choices can be explored safely.',
    kind:'city',
    defaultProgress:42,
    progressVerb:'mapped',
    nextSteps:['Map clean transport routes','Balance energy and water systems','Run the first city simulation']
  },
  {
    id:'community-connect',
    title:'Community Connect',
    summary:'Building your first prototype',
    description:'Create a simple mobile service that helps neighbours discover local support, opportunities, and trusted community updates.',
    kind:'app',
    defaultProgress:58,
    progressVerb:'built',
    nextSteps:['Review the seven prototype screens','Connect the request and response flow','Prepare a community test']
  },
  {
    id:'language-journey',
    title:'Language Journey',
    summary:'Adaptive Setswana · English tutor',
    description:'Build a friendly learning journey that adapts each short lesson to the learner’s language, confidence, and pace.',
    kind:'learn',
    defaultProgress:34,
    progressVerb:'learned',
    nextSteps:['Complete the next practical lesson','Practise with a short conversation','Review the learning checkpoint']
  }
];

const STORAGE_KEY='ell-ex.future-lab.v1';
const clamp=value=>{
  const number=Number(value);
  return Number.isFinite(number)?Math.min(100,Math.max(0,Math.round(number))):0;
};
const defaults=()=>({
  progress:Object.fromEntries(FUTURE_PROJECTS.map(project=>[project.id,project.defaultProgress])),
  remixes:{}
});

export const DEFAULT_FUTURE_LAB_STATE=defaults();

export function normalizeFutureLabState(value={}){
  const state=defaults();
  for(const project of FUTURE_PROJECTS){
    const saved=value?.progress?.[project.id];
    if(saved!==undefined&&saved!==null&&saved!=='')state.progress[project.id]=clamp(saved);
    const remix=value?.remixes?.[project.id];
    if(remix&&typeof remix==='object')state.remixes[project.id]={progress:clamp(remix.progress)};
  }
  return state;
}

export function readFutureLabState(storage=globalThis.localStorage){
  try{
    const saved=storage?.getItem(STORAGE_KEY);
    return saved?normalizeFutureLabState(JSON.parse(saved)):defaults();
  }catch{
    return defaults();
  }
}

export function writeFutureLabState(state,storage=globalThis.localStorage){
  try{
    storage?.setItem(STORAGE_KEY,JSON.stringify(normalizeFutureLabState(state)));
    return true;
  }catch{
    return false;
  }
}

export function continueFutureProject(state,projectId,copy='original',amount=8){
  const next=normalizeFutureLabState(state);
  if(!FUTURE_PROJECTS.some(project=>project.id===projectId))return next;
  if(copy==='remix'){
    const current=next.remixes[projectId]?.progress??0;
    next.remixes[projectId]={progress:clamp(current+amount)};
  }else{
    next.progress[projectId]=clamp(next.progress[projectId]+amount);
  }
  return next;
}

export function remixFutureProject(state,projectId){
  const next=normalizeFutureLabState(state);
  if(FUTURE_PROJECTS.some(project=>project.id===projectId)&&!next.remixes[projectId]){
    next.remixes[projectId]={progress:0};
  }
  return next;
}
