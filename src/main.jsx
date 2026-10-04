import React,{useEffect,useRef,useState} from 'react';
import{createRoot}from'react-dom/client';
import ReactMarkdown from'react-markdown';
import remarkGfm from'remark-gfm';
import{Home,Sparkles,GraduationCap,Users,Orbit,ShieldCheck,Settings,HelpCircle,Mic,Camera,Paperclip,MonitorUp,ArrowUp,MessageCircle,Code2,BookOpen,CalendarDays,Bell,BrainCircuit,Globe2,Palette,LockKeyhole,History,ChevronRight,Menu,X,Volume2,Pause,Square,Plus,ScanLine,Copy,ThumbsUp,RotateCcw,ImageIcon}from'lucide-react';
import'./styles.css';


const nav=[['Home',Home],['Create',Sparkles],['Learn',GraduationCap],['Agents',Users],['Worlds',Orbit],['Vault',ShieldCheck]];
const modes=[['Ask','Get clear answers',MessageCircle],['Create','Make images & media',Palette],['Build','Turn ideas into apps',Code2],['Learn','Your adaptive tutor',BookOpen],['Plan','Goals into action',CalendarDays]];
const abilities=[['Multimodal Live','Text · Voice · Vision · Screen',Volume2,'blue'],['Agent Studio','Specialists working together',Users,'gold'],['Instant Builder','Apps, sites and automations',Code2,'violet'],['Future Worlds','Simulate ideas safely',Globe2,'green'],['Verified Lens','Sources and confidence checks',ShieldCheck,'gold'],['Private Vault','Encrypted memories and files',LockKeyhole,'blue']];
const starters=['Design an app for my community','Teach me anything with visuals','Turn my idea into a business plan'];

function Logo({compact=false}){return <div className="brand"><img src="/ell-ex-logo.png" alt="ELL-EX"/><div className={compact?'hide-mobile':''}><b>ELL-EX</b><span>Imagine it. Build it. Live it.</span></div></div>}
function Sidebar({active,setActive,open,setOpen}){return <aside className={open?'sidebar open':'sidebar'}><button className="close" onClick={()=>setOpen(false)}><X/></button><Logo/>
  <nav>{nav.map(([n,I])=><button key={n} className={active===n?'active':''} onClick={()=>{setActive(n);setOpen(false)}}><I/><span>{n}</span></button>)}</nav>
  <div className="side-foot"><button onClick={()=>{setActive('Settings');setOpen(false)}}><Settings/>Settings</button><button onClick={()=>{setActive('Help');setOpen(false)}}><HelpCircle/>Help</button><div className="sync"><MonitorUp/><b>Everywhere with you</b><span><i/> This device is connected</span></div></div></aside>}
function Header({menu,setPrivate,privateMode,memory,setMemory,onNotify}){return <header><button className="menu" onClick={menu}><Menu/></button><div className="mobile-logo"><Logo compact/></div><div className="search"><Sparkles/><span>Search your ELL-EX universe…</span></div><button className={memory?'status on':'status'} onClick={()=>setMemory(!memory)}><BrainCircuit/><span><b>Memory {memory?'On':'Off'}</b><small>{memory?'Personalized for you':'Nothing retained'}</small></span></button><button className={privateMode?'status private':'status'} onClick={()=>setPrivate(!privateMode)}><ShieldCheck/><span><b>Private {privateMode?'On':'Off'}</b><small>Your data stays yours</small></span></button><button className="icon" onClick={onNotify} aria-label="Notifications"><Bell/></button><img className="avatar" src="/ell-ex-logo.png" alt="ELL-EX"/></header>}
function demoAnswer(question,mode){const q=question.toLowerCase();if(q.includes('what can')||q.includes('help'))return{title:'Your idea, coordinated from one place',body:'ELL-EX can help you explore questions, shape creative concepts, plan projects, learn step by step, and turn ideas into build-ready action plans. The Intelligence Core selects the right specialist mode for each goal.',points:['Ask for clear explanations and practical next steps','Create concepts for brands, images, stories, and campaigns','Build structured plans for apps, websites, and businesses'],suggestions:['Plan my next project','Show me the Create tools','How does the Intelligence Team work?']};if(q.includes('business')||q.includes('money'))return{title:'Let’s turn the idea into a practical plan',body:'I can help organise the concept into a customer problem, solution, simple offer, launch steps, and ways to test demand before spending heavily.',points:['Define who the product helps','Create a small first version','Test it with real potential users'],suggestions:['Create a one-page business plan','Help me identify customers','Build a 30-day launch plan']};if(q.includes('app')||q.includes('website')||mode==='Build')return{title:'Your build team is ready',body:'ELL-EX can translate your idea into screens, features, user journeys, technical requirements, and an ordered development plan.',points:['Clarify the core user problem','Choose the smallest useful feature set','Create the screen and development roadmap'],suggestions:['Design the first screen','List the MVP features','Create a development roadmap']};if(mode==='Learn')return{title:'Adaptive learning path created',body:`I can break “${question}” into short lessons, examples, practice questions, and a progress plan that adapts to your pace.`,points:['Start with the key idea','Learn through a worked example','Check understanding with a short challenge'],suggestions:['Start lesson one','Explain it more simply','Give me a practice question']};if(mode==='Create')return{title:'Creative direction prepared',body:`For “${question}”, I can develop a focused concept, visual direction, message, and production checklist.`,points:['Choose one strong creative idea','Set the visual and writing style','Prepare the assets and final output'],suggestions:['Give me three concepts','Choose a visual style','Write the final creative brief']};return{title:'Intelligence Core has mapped your request',body:`I understand that you want help with “${question}”. I can clarify the goal, organise the work, and guide you through the next best actions.`,points:['Confirm the result you want','Break it into achievable steps','Begin with the highest-impact task'],suggestions:['Make a step-by-step plan','What should I do first?','Show me three approaches']}}
function cleanText(value=''){return value.replace(/<br\s*\/?>/gi,'\n').replace(/\n{3,}/g,'\n\n').trim()}
function RichText({children}){return <div className="answer-body"><ReactMarkdown remarkPlugins={[remarkGfm]}>{children||''}</ReactMarkdown></div>}
function AnswerPanel({answer,onClose,onFollowUp,onRetry}){
  const[copied,setCopied]=useState(false);
  const[speechState,setSpeechState]=useState('idle');
  const speechPositionRef=useRef(0);
  const speechRunRef=useRef(0);
  const speechSupported=typeof window!=='undefined'&&'speechSynthesis'in window;
  const speechText=[answer.title,answer.body,...(answer.points||[])].filter(Boolean).join('. ').replace(/[#*_`>|[\]()~-]/g,' ');

  useEffect(()=>()=>{if(speechSupported)window.speechSynthesis.cancel()},[speechSupported]);

  const copy=async()=>{try{await navigator.clipboard.writeText([answer.title,answer.body,...(answer.points||[])].filter(Boolean).join('\n\n'));setCopied(true);setTimeout(()=>setCopied(false),1600)}catch{setCopied(false)}};
  const speakFrom=(position=0)=>{
    const start=Math.max(0,Math.min(position,speechText.length));
    const run=++speechRunRef.current;
    window.speechSynthesis.cancel();
    const utterance=new SpeechSynthesisUtterance(speechText.slice(start));
    utterance.lang='en-ZA';
    utterance.rate=1;
    utterance.onstart=()=>{if(run===speechRunRef.current)setSpeechState('speaking')};
    utterance.onboundary=event=>{if(run===speechRunRef.current&&typeof event.charIndex==='number')speechPositionRef.current=start+event.charIndex};
    utterance.onend=()=>{if(run===speechRunRef.current){speechPositionRef.current=0;setSpeechState('idle')}};
    utterance.onerror=()=>{if(run===speechRunRef.current)setSpeechState('idle')};
    window.speechSynthesis.speak(utterance);
  };
  const readAloud=()=>{
    if(!speechSupported)return;
    if(speechState==='paused')return speakFrom(speechPositionRef.current);
    speechPositionRef.current=0;
    speakFrom(0);
  };
  const pauseSpeech=()=>{speechRunRef.current+=1;window.speechSynthesis.cancel();setSpeechState('paused')};
  const stopSpeech=()=>{speechRunRef.current+=1;speechPositionRef.current=0;window.speechSynthesis.cancel();setSpeechState('idle')};
  const close=()=>{stopSpeech();onClose()};

  return <section className="answer" aria-live="polite"><div className="answer-top"><div className="answer-mark">{answer.imageUrl?<Palette/>:<BrainCircuit/>}</div><div><span className="demo-label">ELL-EX CORE · {answer.label||(answer.live?'LIVE AI':'DEMO MODE')}</span><h2>{answer.title}</h2></div><button className="answer-close" onClick={close} aria-label="Close answer"><X/></button></div>{answer.imageUrl&&<img className="generated-image" src={answer.imageUrl} alt={answer.prompt||'Image created by ELL-EX'}/>}<RichText>{answer.body}</RichText>{answer.points?.length>0&&<ul>{answer.points.map(point=><li key={point}>{point}</li>)}</ul>}<div className="answer-actions">{answer.imageUrl?<a href={answer.imageUrl} download="ell-ex-creation.jpg"><MonitorUp/>Download</a>:<button onClick={copy}><Copy/>{copied?'Copied':'Copy'}</button>}{speechSupported&&<button onClick={readAloud} aria-label={speechState==='paused'?'Resume reading':'Read answer aloud'}><Volume2/>{speechState==='paused'?'Resume':speechState==='speaking'?'Reading…':'Read aloud'}</button>}{speechState==='speaking'&&<button onClick={pauseSpeech} aria-label="Pause reading"><Pause/>Pause</button>}{speechState!=='idle'&&<button onClick={stopSpeech} aria-label="Stop reading"><Square/>Stop</button>}<button><ThumbsUp/>Helpful</button><button onClick={onRetry}><RotateCcw/>Try again</button></div>{answer.suggestions?.length>0&&<div className="suggestions"><span>Continue with</span>{answer.suggestions.map(item=><button key={item} onClick={()=>onFollowUp(item)}>{item}<ChevronRight/></button>)}</div>}</section>
}
function Composer({mode,setMode}){
  const[text,setText]=useState('');
  const[loading,setLoading]=useState(false);
  const[messages,setMessages]=useState([]);
  const[listening,setListening]=useState(false);
  const[voiceError,setVoiceError]=useState('');
  const[photo,setPhoto]=useState(null);
  const[photoError,setPhotoError]=useState('');
  const[document,setDocument]=useState(null);
  const[documentLoading,setDocumentLoading]=useState(false);
  const[documentError,setDocumentError]=useState('');
  const recognitionRef=useRef(null);
  const cameraRef=useRef(null);
  const photoRef=useRef(null);
  const fileRef=useRef(null);

  useEffect(()=>()=>recognitionRef.current?.abort(),[]);

  const readAsDataUrl=file=>new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=()=>resolve(reader.result);
    reader.onerror=()=>reject(new Error('ELL-EX could not read that photo.'));
    reader.readAsDataURL(file);
  });

  const loadImage=src=>new Promise((resolve,reject)=>{
    const image=new Image();
    image.onload=()=>resolve(image);
    image.onerror=()=>reject(new Error('This photo format is not supported by your browser.'));
    image.src=src;
  });

  const preparePhoto=async file=>{
    const direct=await readAsDataUrl(file);
    // Keep small, already-compatible photos untouched. This avoids Android
    // browser decoder failures and preserves image quality.
    if(typeof direct==='string'&&direct.length<3_200_000)return direct;

    const source=await loadImage(direct);
    let width=source.naturalWidth||source.width;
    let height=source.naturalHeight||source.height;
    const maxDimension=1600;
    const scale=Math.min(1,maxDimension/Math.max(width,height));
    width=Math.max(1,Math.round(width*scale));
    height=Math.max(1,Math.round(height*scale));

    const canvas=window.document.createElement('canvas');
    canvas.width=width;
    canvas.height=height;
    const context=canvas.getContext('2d',{alpha:false});
    if(!context)throw new Error('Image processing is unavailable in this browser.');
    context.fillStyle='#fff';
    context.fillRect(0,0,width,height);
    context.drawImage(source,0,0,width,height);

    let quality=.82;
    let encoded=canvas.toDataURL('image/jpeg',quality);
    while(encoded.length>3_800_000&&quality>.48){
      quality-=.1;
      encoded=canvas.toDataURL('image/jpeg',quality);
    }
    if(encoded.length>3_800_000)throw new Error('That photo is still too large after compression. Choose a smaller photo.');
    return encoded;
  };

  const toggleVoice=()=>{
    setVoiceError('');
    if(listening){
      recognitionRef.current?.stop();
      return;
    }

    const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SpeechRecognition){
      setVoiceError('Voice input is not supported in this browser. Please open ELL-EX in Chrome.');
      return;
    }

    const recognition=new SpeechRecognition();
    recognition.lang='en-ZA';
    recognition.interimResults=true;
    recognition.continuous=false;
    recognition.maxAlternatives=1;
    recognitionRef.current=recognition;

    recognition.onstart=()=>setListening(true);
    recognition.onresult=event=>{
      let transcript='';
      for(let i=event.resultIndex;i<event.results.length;i++)transcript+=event.results[i][0].transcript;
      setText(transcript.trim());
    };
    recognition.onerror=event=>{
      const message=event.error==='not-allowed'||event.error==='service-not-allowed'
        ?'Microphone permission was blocked. Allow microphone access for this site and try again.'
        :event.error==='no-speech'
          ?'I did not hear anything. Tap the microphone and speak again.'
          :'Voice input could not start. Please try again.';
      setVoiceError(message);
      setListening(false);
    };
    recognition.onend=()=>setListening(false);

    try{recognition.start()}catch{setListening(false)}
  };

  const selectPhoto=async file=>{
    setPhotoError('');
    if(!file)return;
    setDocument(null);
    if(!(file.type||'').startsWith('image/')){setPhotoError('Please choose an image file.');return}
    if(file.size>12*1024*1024){setPhotoError('That image is too large. Please choose one under 12 MB.');return}
    try{
      const dataUrl=await preparePhoto(file);
      setPhoto({name:file.name||'Camera photo',dataUrl});
    }catch(error){
      setPhotoError(error.message||'ELL-EX could not process that photo. Try a JPG, PNG, or WebP image.');
    }
  };

  const selectDocument=async file=>{
    setDocumentError('');
    if(!file)return;
    const extension=file.name.toLowerCase().split('.').pop();
    if(!['pdf','docx','txt','md'].includes(extension)){
      setDocumentError('Choose a PDF, DOCX, TXT, or MD document.');return;
    }
    if(file.size>3*1024*1024){
      setDocumentError('Choose a document under 3 MB.');return;
    }
    setPhoto(null);
    setDocumentLoading(true);
    try{
      let content='';
      if(extension==='txt'||extension==='md')content=await file.text();
      else if(extension==='docx'){
        const mammoth=await import('mammoth/mammoth.browser');
        const result=await mammoth.extractRawText({arrayBuffer:await file.arrayBuffer()});
        content=result.value;
      }else{
        const pdfjs=await import('pdfjs-dist');
        const worker=await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
        pdfjs.GlobalWorkerOptions.workerSrc=worker.default;
        const pdf=await pdfjs.getDocument({data:await file.arrayBuffer()}).promise;
        const pages=[];
        for(let pageNumber=1;pageNumber<=pdf.numPages;pageNumber++){
          const page=await pdf.getPage(pageNumber);
          const textContent=await page.getTextContent();
          pages.push(textContent.items.map(item=>item.str||'').join(' '));
          if(pages.join('\n').length>12000)break;
        }
        content=pages.join('\n');
      }
      if(!content.trim())throw new Error('No readable text was found. Scanned PDFs need OCR.');
      if(content.length>12000)throw new Error('This document has too much text. Please use one under 12,000 characters.');
      setDocument({name:file.name,text:content.trim()});
    }catch(error){setDocumentError(error.message||'Could not read this document.');}
    finally{setDocumentLoading(false)}
  };

  const run=async(rawQuestion,retryId=null,retryDocument=null)=>{
    const clean=rawQuestion.trim();
    const attachedDocument=retryDocument||document;
    if((!clean&&!photo&&!attachedDocument)||loading||documentLoading)return;

    const history=messages
      .filter(message=>message.id!==retryId&&message.answer?.live)
      .slice(-4)
      .map(message=>`User: ${message.question}\nELL-EX: ${message.answer.body}`)
      .join('\n\n');
    const contextualQuestion=(history?`${history}\n\nUser: ${clean}`:clean).slice(-3000);
    const id=retryId||`${Date.now()}-${Math.random()}`;

    setLoading(true);
    setText('');
    if(retryId)setMessages(current=>current.filter(message=>message.id!==retryId));

    try{
      const isImage=mode==='Create'&&!photo&&!attachedDocument;
      const isVision=Boolean(photo);
      const response=await fetch(isVision?'/api/vision':isImage?'/api/image':'/api/chat',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify(isVision?{question:clean||'Describe this image clearly and identify any useful details.',image:photo.dataUrl}:isImage?{prompt:clean}:{question:contextualQuestion||'Summarize this document.',mode,document:attachedDocument?.text,documentName:attachedDocument?.name})
      });
      if(isImage&&response.ok){
        const imageUrl=URL.createObjectURL(await response.blob());
        setMessages(current=>[...current,{id,question:clean,mode,answer:{title:'Your image is ready',body:'Created from your description.',imageUrl,prompt:clean,points:[],suggestions:[],live:true,label:'IMAGE AI'}}]);
        return;
      }
      const data=await response.json().catch(()=>({}));
      if(!response.ok){
        const message=response.status===413
          ?'That photo is too large to send. ELL-EX compressed it, but the upload still exceeded the service limit.'
          :response.status===429
          ?'ELL-EX is receiving many requests. Please wait a moment and try again.'
          :response.status===503
            ?'ELL-EX AI is not configured yet. Check the HF_TOKEN environment variable.'
            :data.error||'The AI service is temporarily unavailable.';
        throw new Error(message);
      }
      setMessages(current=>[...current,{
        id,
        question:clean||(isVision?'Analyse this image':'Summarize this document'),
        document:attachedDocument,
        mode,
        answer:{title:isVision?'ELL-EX Vision response':'ELL-EX Intelligence response',body:cleanText(data.text),points:[],suggestions:[],live:true,label:isVision?'VISION AI':'LIVE AI'}
      }]);
      if(isVision)setPhoto(null);
      if(attachedDocument)setDocument(null);
    }catch(error){
      setMessages(current=>[...current,{
        id,
        question:clean||'Summarize this document',
        document:attachedDocument,
        mode,
        answer:{title:'ELL-EX could not complete that request',body:error.message||'Please try again.',points:[],suggestions:[],live:false,label:'CONNECTION ERROR'}
      }]);
    }finally{
      setLoading(false);
    }
  };

  const send=()=>run(text);
  const removeMessage=id=>setMessages(current=>current.filter(message=>message.id!==id));
  const newChat=()=>{recognitionRef.current?.abort();setListening(false);setVoiceError('');setPhotoError('');setDocumentError('');setDocument(null);setPhoto(null);setMessages([]);setText('')};

  return <>
    <section className="hero"><p>Good day, Creator</p><h1>What will we <em>create</em> today?</h1><span>One intelligence. Every possibility.</span></section>
    <section className="composer">{photo&&<div className="photo-preview"><img src={photo.dataUrl} alt="Selected for ELL-EX Vision"/><div><ImageIcon/><span>{photo.name}</span></div><button onClick={()=>setPhoto(null)} aria-label="Remove selected image"><X/></button></div>}{document&&<div className="document-preview"><span>📄 {document.name}</span><button onClick={()=>setDocument(null)} aria-label="Remove selected document"><X/></button></div>}<textarea value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()}}} placeholder={photo?'Ask ELL-EX about this image…':listening?'Listening… speak now':'Ask ELL-EX anything — type, speak, show, or drop it here…'}/><input ref={cameraRef} className="file-input" type="file" accept="image/*" capture="environment" onChange={e=>{selectPhoto(e.target.files?.[0]);e.target.value=''}}/><input ref={photoRef} className="file-input" type="file" accept="image/*" onChange={e=>{selectPhoto(e.target.files?.[0]);e.target.value=''}}/><input ref={fileRef} className="file-input" type="file" accept=".pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown" onChange={e=>{selectDocument(e.target.files?.[0]);e.target.value=''}}/><div className="tools"><button title="Add" onClick={()=>photoRef.current?.click()}><Plus/></button><button className={listening?'voice listening':'voice'} onClick={toggleVoice} aria-label={listening?'Stop listening':'Start voice input'} aria-pressed={listening}><Mic/>{listening?'Listening':'Voice'}</button><button className={photo?'camera active':'camera'} onClick={()=>cameraRef.current?.click()}><Camera/>Camera</button><button onClick={()=>fileRef.current?.click()}><Paperclip/>Files</button><button className="desktop"><MonitorUp/>Live screen</button><div className="spacer"/><ScanLine className="pulse"/><button className="send" onClick={send} aria-label="Send" disabled={loading||documentLoading||(!text.trim()&&!photo&&!document)}><ArrowUp/></button></div></section>
    {(voiceError||photoError||documentError)&&<div className="voice-error" role="alert">{voiceError||photoError||documentError}</div>}
    {messages.length>0&&<div className="answer-actions"><button onClick={newChat}><Plus/>New chat</button></div>}
    {messages.map(message=><React.Fragment key={message.id}>
      <section className="answer"><div className="answer-top"><div className="answer-mark"><MessageCircle/></div><div><span className="demo-label">YOU · {message.mode.toUpperCase()}</span><h2>{message.question}</h2></div></div></section>
      <AnswerPanel answer={message.answer} onClose={()=>removeMessage(message.id)} onRetry={()=>run(message.question,message.id,message.document)} onFollowUp={run}/>
    </React.Fragment>)}
    {loading&&<div className="thinking"><BrainCircuit/><div><b>{mode==='Create'?'ELL-EX is creating your image':'Intelligence Core is thinking'}</b><span>{mode==='Create'?'This can take a little longer…':'Using this conversation to prepare the next response…'}</span></div><i/><i/><i/></div>}
    <div className="modes">{modes.map(([n,d,I])=><button key={n} className={mode===n?'selected':''} onClick={()=>setMode(n)}><I/><span><b>{n}</b><small>{d}</small></span></button>)}</div>
  </>
}
function Agents(){return <section className="section"><div className="section-head"><div><Users/><h2>Your Intelligence Team</h2><span>Specialists assemble for every goal</span></div><button>Manage agents <ChevronRight/></button></div><div className="agents"><article><div className="agent-icon ell"><img src="/ell-ex-logo.png"/></div><div><b>ELL-EX Core</b><span><i/> Orchestrating</span><p>Understands your goal and brings the right minds together.</p></div></article><article><div className="agent-icon">E</div><div><b>ELL-EX</b><span><i/> Building</span><p>Turns ideas into products, code, media and automations.</p></div></article><article><div className="agent-icon sage">S</div><div><b>Sage</b><span><i/> Learning</span><p>Adapts explanations to your language, level and pace.</p></div></article></div></section>}
function Lab(){return <section className="section lab"><div className="section-head"><div><Sparkles/><h2>Future Lab</h2><span>Ideas becoming real</span></div><button>View all <ChevronRight/></button></div><div className="projects"><article><div className="orb city">◒</div><div><b>Sustainable City World</b><p>Simulate a greener tomorrow</p><span>42% mapped</span></div></article><article><div className="orb app"><Code2/></div><div><b>Community Connect</b><p>Building your first prototype</p><span>7 screens ready</span></div></article><article><div className="orb learn"><Globe2/></div><div><b>Language Journey</b><p>Adaptive Setswana · English tutor</p><span>Next lesson ready</span></div></article></div></section>}
function Core({tab,setTab}){return <aside className="core"><div className="core-title"><BrainCircuit/><div><h2>Intelligence Core</h2><p>Your controls. Your intelligence.</p></div></div><div className="tabs">{['Capabilities','Privacy','Memory'].map(t=><button className={tab===t?'active':''} onClick={()=>setTab(t)}>{t}</button>)}</div>{tab==='Capabilities'&&<div className="abilities">{abilities.map(([n,d,I,c])=><button key={n}><span className={c}><I/></span><div><b>{n}</b><small>{d}</small></div><ChevronRight/></button>)}</div>}{tab==='Privacy'&&<div className="panel-copy"><ShieldCheck/><h3>You own your data</h3><p>Choose what ELL-EX can see, remember, and use. Private mode keeps sessions temporary.</p><button>Review privacy controls</button></div>}{tab==='Memory'&&<div className="panel-copy"><BrainCircuit/><h3>Memory with permission</h3><p>ELL-EX builds a useful map of your goals and preferences only when you approve it.</p><button>Open memory map</button></div>}<div className="activity"><div><History/><h3>Recent activity</h3></div>{['Started Community Connect','ELL-EX created 3 app screens','Saved learning plan to Vault'].map((x,i)=><p key={x}><i/>{x}<small>{i+2}m</small></p>)}</div></aside>}
function UtilityPage({type,memory,setMemory,privateMode,setPrivate,onHome}){if(type==='Settings')return <section className="placeholder utility-page"><Settings/><h1>Settings</h1><p>Control the ELL-EX experience on this device.</p><button onClick={()=>setMemory(!memory)}>Memory: {memory?'On':'Off'}</button><button onClick={()=>setPrivate(!privateMode)}>Private mode: {privateMode?'On':'Off'}</button><button className="secondary" onClick={onHome}>Return home</button></section>;return <section className="placeholder utility-page"><HelpCircle/><h1>Help</h1><p>Type a request, choose a mode, or attach a supported photo or document. For scanned PDFs, use a clear photo until OCR is added.</p><button onClick={onHome}>Return home</button></section>}
function Vault({vaultFile,setVaultFile,onHome}){return <section className="placeholder"><LockKeyhole/><h1>Private Vault</h1><p>Choose a file to prepare it on this device.</p><input id="vault-file" type="file" hidden onChange={e=>setVaultFile(e.target.files?.[0]?.name||'')}/><button onClick={()=>window.document.getElementById('vault-file').click()}><Paperclip/> Choose file</button>{vaultFile&&<div className="vault-status" role="status"><b>{vaultFile}</b><span>Selected successfully. Permanent encrypted storage is not connected yet, so ELL-EX has not uploaded this file.</span></div>}<button className="secondary" onClick={onHome}>Return home</button></section>}
function App(){const[active,setActive]=useState('Home');const[mode,setMode]=useState('Ask');const[open,setOpen]=useState(false);const[tab,setTab]=useState('Capabilities');const[memory,setMemory]=useState(true);const[privateMode,setPrivate]=useState(true);const[vaultFile,setVaultFile]=useState('');const[notice,setNotice]=useState('');useEffect(()=>{if(active==='Create'||active==='Learn')setMode(active)},[active]);useEffect(()=>{if(!notice)return;const timer=setTimeout(()=>setNotice(''),2600);return()=>clearTimeout(timer)},[notice]);const home=()=>setActive('Home');return <div className="app"><Sidebar {...{active,setActive,open,setOpen}}/><main><Header menu={()=>setOpen(true)} onNotify={()=>setNotice('You’re all caught up — no new notifications.')} {...{setPrivate,privateMode,memory,setMemory}}/>{notice&&<div className="app-notice" role="status">{notice}</div>}<div className="content"><div className="workspace">{!['Vault','Settings','Help'].includes(active)&&<Composer {...{mode,setMode}}/>}{active==='Home'?<><Agents/><Lab/></>:active==='Agents'?<Agents/>:active==='Worlds'?<Lab/>:(active==='Create'||active==='Learn')?null:active==='Vault'?<Vault {...{vaultFile,setVaultFile}} onHome={home}/>:<UtilityPage type={active} {...{memory,setMemory,privateMode,setPrivate}} onHome={home}/>}</div><Core {...{tab,setTab}}/></div><nav className="bottom">{nav.slice(0,5).map(([n,I])=><button key={n} className={active===n?'active':''} onClick={()=>setActive(n)}><I/><span>{n}</span></button>)}</nav></main></div>}
createRoot(document.getElementById('root')).render(<App/>);
