import React,{useEffect,useMemo,useRef,useState} from 'react';
import{createRoot}from'react-dom/client';
import ReactMarkdown from'react-markdown';
import remarkGfm from'remark-gfm';
import{Home,Sparkles,GraduationCap,Users,Orbit,ShieldCheck,Settings,HelpCircle,Mic,Camera,Paperclip,MonitorUp,ArrowUp,ArrowLeft,MessageCircle,Code2,BookOpen,CalendarDays,Bell,BrainCircuit,Globe2,Palette,LockKeyhole,History,ChevronRight,ChevronDown,Menu,X,Volume2,Pause,Square,Plus,ScanLine,Copy,ThumbsUp,RotateCcw,ImageIcon,Play,GitFork,CheckCircle2}from'lucide-react';
import'./styles.css';
import{buildDownload,extractBuildDocument}from'./buildArtifact.js';
import{createZeroCreditCreativeBrief,shouldUseZeroCreditFallback}from'./creativeFallback.js';
import{analyseLocalImage,createZeroCreditVisionSummary,shouldUseZeroCreditVisionFallback}from'./visionFallback.js';
import{readVoiceSettings,writeVoiceSettings}from'./voiceSettings.js';
import{FUTURE_PROJECTS,continueFutureProject,readFutureLabState,remixFutureProject,writeFutureLabState}from'./futureLab.js';


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
function AnswerPanel({answer,onClose,onFollowUp,onRetry,voiceSettings,availableVoices}){
  const[copied,setCopied]=useState(false);
  const[helpful,setHelpful]=useState(false);
  const[previewOpen,setPreviewOpen]=useState(false);
  const[speechState,setSpeechState]=useState('idle');
  const speechChunkRef=useRef(0);
  const speechRunRef=useRef(0);
  const speechSupported=typeof window!=='undefined'&&'speechSynthesis'in window;
  const speechText=[answer.title,answer.body,...(answer.points||[])].filter(Boolean).join('. ').replace(/[#*_`>|[\]()~-]/g,' ');
  const previewDocument=useMemo(()=>answer.mode==='Build'?extractBuildDocument(answer.body):'',[answer.body,answer.mode]);

  useEffect(()=>()=>{if(speechSupported)window.speechSynthesis.cancel()},[speechSupported]);

  const copy=async()=>{try{await navigator.clipboard.writeText([answer.title,answer.body,...(answer.points||[])].filter(Boolean).join('\n\n'));setCopied(true);setTimeout(()=>setCopied(false),1600)}catch{setCopied(false)}};
  const speechChunks=speechText.match(/.{1,220}(?:[.!?](?=\s|$)|\s|$)/g)||[speechText];
  const speakChunk=(chunkIndex=0)=>{
    const start=Math.max(0,Math.min(chunkIndex,speechChunks.length-1));
    const run=++speechRunRef.current;
    window.speechSynthesis.cancel();
    const utterance=new SpeechSynthesisUtterance(speechChunks[start]);
    const selectedVoice=availableVoices.find(voice=>voice.voiceURI===voiceSettings.voiceURI);
    if(selectedVoice)utterance.voice=selectedVoice;
    utterance.lang=selectedVoice?.lang||'en-ZA';
    utterance.rate=voiceSettings.rate;
    utterance.pitch=voiceSettings.pitch;
    utterance.onstart=()=>{if(run===speechRunRef.current){speechChunkRef.current=start;setSpeechState('speaking')}};
    utterance.onend=()=>{if(run!==speechRunRef.current)return;if(start+1<speechChunks.length){speechChunkRef.current=start+1;speakChunk(start+1)}else{speechChunkRef.current=0;setSpeechState('idle')}};
    utterance.onerror=()=>{if(run===speechRunRef.current)setSpeechState('idle')};
    window.speechSynthesis.speak(utterance);
  };
  useEffect(()=>{
    if(!speechSupported||!answer.live||!voiceSettings.autoRead)return;
    const timer=window.setTimeout(()=>speakChunk(0),120);
    return()=>window.clearTimeout(timer);
  },[]);
  const readAloud=()=>{
    if(!speechSupported)return;
    if(speechState==='paused')return speakChunk(speechChunkRef.current);
    speechChunkRef.current=0;
    speakChunk(0);
  };
  const pauseSpeech=()=>{speechRunRef.current+=1;window.speechSynthesis.cancel();setSpeechState('paused')};
  const stopSpeech=()=>{speechRunRef.current+=1;speechChunkRef.current=0;window.speechSynthesis.cancel();setSpeechState('idle')};
  const close=()=>{stopSpeech();onClose()};
  const download=()=>{
    const artifact=buildDownload(answer.body);
    const url=URL.createObjectURL(new Blob([artifact.content],{type:artifact.type}));
    const anchor=window.document.createElement('a');
    anchor.href=url;
    anchor.download=artifact.filename;
    window.document.body.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  };

  return <section className="answer" aria-live="polite"><div className="answer-top"><div className="answer-mark">{answer.imageUrl?<Palette/>:<BrainCircuit/>}</div><div><span className="demo-label">ELL-EX CORE · {answer.label||(answer.live?'LIVE AI':'DEMO MODE')}</span><h2>{answer.title}</h2></div><button className="answer-close" onClick={close} aria-label="Close answer"><X/></button></div>{answer.imageUrl&&<img className="generated-image" src={answer.imageUrl} alt={answer.prompt||'Image created by ELL-EX'}/>}<RichText>{answer.body}</RichText>{answer.points?.length>0&&<ul>{answer.points.map(point=><li key={point}>{point}</li>)}</ul>}{answer.complete===false&&<div className="completion-note" role="status"><span>This answer reached its length limit.</span><button onClick={()=>onFollowUp('Continue the previous response from exactly where it stopped. Do not repeat completed content.')}><RotateCcw/>Continue response</button></div>}<div className="answer-actions">{answer.imageUrl?<a href={answer.imageUrl} download="ell-ex-creation.jpg"><MonitorUp/>Download</a>:<button onClick={copy}><Copy/>{copied?'Copied':'Copy'}</button>}{answer.mode==='Build'&&<button onClick={download}><MonitorUp/>Download build</button>}{previewDocument&&<button onClick={()=>setPreviewOpen(true)}><Code2/>Preview build</button>}{speechSupported&&<button onClick={readAloud} aria-label={speechState==='paused'?'Resume reading':'Read answer aloud'}><Volume2/>{speechState==='paused'?'Resume':speechState==='speaking'?'Reading…':'Read aloud'}</button>}{speechState==='speaking'&&<button onClick={pauseSpeech} aria-label="Pause reading"><Pause/>Pause</button>}{speechState!=='idle'&&<button onClick={stopSpeech} aria-label="Stop reading"><Square/>Stop</button>}<button className={helpful?'helpful active':''} onClick={()=>setHelpful(true)} aria-pressed={helpful}><ThumbsUp/>{helpful?'Thanks!':'Helpful'}</button><button onClick={onRetry}><RotateCcw/>Try again</button></div>{helpful&&<span className="feedback-confirmation" role="status">Marked as helpful.</span>}{answer.suggestions?.length>0&&<div className="suggestions"><span>Continue with</span>{answer.suggestions.map(item=><button key={item} onClick={()=>onFollowUp(item)}>{item}<ChevronRight/></button>)}</div>}{previewOpen&&<div className="build-preview" role="dialog" aria-modal="true" aria-label="ELL-EX build preview"><div><b>Build preview</b><button onClick={()=>setPreviewOpen(false)} aria-label="Close build preview"><X/></button></div><iframe title="ELL-EX generated build" sandbox="allow-scripts" srcDoc={previewDocument}/></div>}</section>
}
function Composer({mode,setMode,voiceSettings,availableVoices}){
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

  const inspectPhotoLocally=async dataUrl=>{
    const source=await loadImage(dataUrl);
    const canvas=window.document.createElement('canvas');
    canvas.width=32;
    canvas.height=32;
    const context=canvas.getContext('2d',{alpha:false,willReadFrequently:true});
    if(!context)return null;
    context.fillStyle='#fff';
    context.fillRect(0,0,canvas.width,canvas.height);
    context.drawImage(source,0,0,canvas.width,canvas.height);
    return analyseLocalImage(
      source.naturalWidth||source.width,
      source.naturalHeight||source.height,
      context.getImageData(0,0,canvas.width,canvas.height).data
    );
  };

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
      let localDetails=null;
      try{localDetails=await inspectPhotoLocally(dataUrl)}catch{}
      setPhoto({name:file.name||'Camera photo',dataUrl,localDetails});
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
        if(isImage&&shouldUseZeroCreditFallback(data.code)){
          setMessages(current=>[...current,{id,question:clean,mode,answer:createZeroCreditCreativeBrief(clean,data.code)}]);
          return;
        }
        if(isVision&&shouldUseZeroCreditVisionFallback(data.code)){
          setMessages(current=>[...current,{id,question:clean||'Analyse this image',mode,answer:createZeroCreditVisionSummary(clean,photo,data.code)}]);
          return;
        }
        const message=response.status===413
          ?'That photo is too large to send. ELL-EX compressed it, but the upload still exceeded the service limit.'
          :response.status===429
          ?'ELL-EX is receiving many requests. Please wait a moment and try again.'
          :data.error||'The AI service is temporarily unavailable.';
        throw new Error(message);
      }
      setMessages(current=>[...current,{
        id,
        question:clean||(isVision?'Analyse this image':'Summarize this document'),
        document:attachedDocument,
        mode,
        answer:{title:isVision?'ELL-EX Vision response':'ELL-EX Intelligence response',body:cleanText(data.text),points:[],suggestions:[],live:true,label:isVision?'VISION AI':'LIVE AI',mode,complete:data.complete}
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
      <AnswerPanel answer={message.answer} onClose={()=>removeMessage(message.id)} onRetry={()=>run(message.question,message.id,message.document)} onFollowUp={run} {...{voiceSettings,availableVoices}}/>
    </React.Fragment>)}
    {loading&&<div className="thinking"><BrainCircuit/><div><b>{mode==='Create'?'ELL-EX is creating your image':'Intelligence Core is thinking'}</b><span>{mode==='Create'?'This can take a little longer…':'Using this conversation to prepare the next response…'}</span></div><i/><i/><i/></div>}
    <div className="modes">{modes.map(([n,d,I])=><button key={n} className={mode===n?'selected':''} onClick={()=>setMode(n)}><I/><span><b>{n}</b><small>{d}</small></span></button>)}</div>
  </>
}
function Agents(){return <section className="section"><div className="section-head"><div><Users/><h2>Your Intelligence Team</h2><span>Specialists assemble for every goal</span></div><button>Manage agents <ChevronRight/></button></div><div className="agents"><article><div className="agent-icon ell"><img src="/ell-ex-logo.png"/></div><div><b>ELL-EX Core</b><span><i/> Orchestrating</span><p>Understands your goal and brings the right minds together.</p></div></article><article><div className="agent-icon">E</div><div><b>ELL-EX</b><span><i/> Building</span><p>Turns ideas into products, code, media and automations.</p></div></article><article><div className="agent-icon sage">S</div><div><b>Sage</b><span><i/> Learning</span><p>Adapts explanations to your language, level and pace.</p></div></article></div></section>}
function ProjectIcon({project}){return <div className={`orb ${project.kind}`}>{project.kind==='city'?'◒':project.kind==='app'?<Code2/>:<Globe2/>}</div>}
function ProgressMeter({progress,label}){return <div className="project-meter" role="progressbar" aria-label={label} aria-valuemin="0" aria-valuemax="100" aria-valuenow={progress}><i style={{width:`${progress}%`}}/></div>}
function Lab({futureLabState,onOpen,onViewAll}){return <section className="section lab"><div className="section-head"><div><Sparkles/><h2>Future Lab</h2><span>Ideas becoming real</span></div><button onClick={onViewAll}>View all <ChevronRight/></button></div><div className="projects">{FUTURE_PROJECTS.map(project=>{const progress=futureLabState.progress[project.id];const hasRemix=Boolean(futureLabState.remixes[project.id]);return <button type="button" className="project-card" key={project.id} onClick={()=>onOpen(project.id)} aria-label={`Open ${project.title}`}><ProjectIcon project={project}/><span className="project-card-copy"><b>{project.title}</b><small>{project.summary}</small><span>{progress}% {project.progressVerb}{hasRemix?' · My remix ready':''}</span><ProgressMeter progress={progress} label={`${project.title} ${progress}% complete`}/></span><ChevronRight className="project-chevron"/></button>})}</div></section>}
function FutureProject({projectId,futureLabState,setFutureLabState,onBack,onNotice}){
  const[copy,setCopy]=useState('original');
  const project=FUTURE_PROJECTS.find(item=>item.id===projectId);
  if(!project)return null;
  const remix=futureLabState.remixes[project.id];
  const progress=copy==='remix'?(remix?.progress??0):futureLabState.progress[project.id];
  const stepIndex=Math.min(project.nextSteps.length-1,Math.floor(progress/34));
  const nextStep=progress>=100?'Project complete — ready to share':project.nextSteps[stepIndex];
  const continueProject=()=>{
    setFutureLabState(current=>continueFutureProject(current,project.id,copy));
    onNotice(`${copy==='remix'?'My remix':project.title} saved on this device.`);
  };
  const remixProject=()=>{
    setFutureLabState(current=>remixFutureProject(current,project.id));
    setCopy('remix');
    onNotice('Your personal remix is ready. The original was kept unchanged.');
  };
  return <section className="future-project-page"><button className="project-back" onClick={onBack}><ArrowLeft/>Future Lab</button><div className="project-hero"><ProjectIcon project={project}/><div><span className="project-kicker">{copy==='remix'?'MY PERSONAL REMIX':'FUTURE LAB PROJECT'}</span><h1>{project.title}</h1><p>{project.summary}</p></div></div><p className="project-description">{project.description}</p>{remix&&<div className="project-copy-tabs" role="group" aria-label="Project copy"><button className={copy==='original'?'active':''} onClick={()=>setCopy('original')}>Original</button><button className={copy==='remix'?'active':''} onClick={()=>setCopy('remix')}>My remix</button></div>}<div className="project-workspace"><div className="project-progress-row"><div><span>{copy==='remix'?'My remix progress':'Current progress'}</span><strong>{progress}%</strong></div><ProgressMeter progress={progress} label={`${copy==='remix'?'My remix':project.title} ${progress}% complete`}/><small><CheckCircle2/>Saved on this device</small></div><div className="project-next"><span>NEXT STEP</span><h2>{nextStep}</h2><p>{progress>=100?'You can keep this project as a finished concept or create a fresh remix.':'Continue to move this project forward by one focused checkpoint.'}</p></div></div><div className="project-actions"><button className="project-continue" onClick={continueProject} disabled={progress>=100}><Play/>{progress>=100?'Project complete':'Continue project'}</button><button className="project-remix" onClick={remixProject}><GitFork/>{remix?'Open my remix':'Remix this project'}</button></div>{remix&&copy==='original'&&<p className="remix-note">Your personal remix is separate and currently {remix.progress}% complete.</p>}</section>
}
function Core({tab,setTab}){return <aside className="core"><div className="core-title"><BrainCircuit/><div><h2>Intelligence Core</h2><p>Your controls. Your intelligence.</p></div></div><div className="tabs">{['Capabilities','Privacy','Memory'].map(t=><button className={tab===t?'active':''} onClick={()=>setTab(t)}>{t}</button>)}</div>{tab==='Capabilities'&&<div className="abilities">{abilities.map(([n,d,I,c])=><button key={n}><span className={c}><I/></span><div><b>{n}</b><small>{d}</small></div><ChevronRight/></button>)}</div>}{tab==='Privacy'&&<div className="panel-copy"><ShieldCheck/><h3>You own your data</h3><p>Choose what ELL-EX can see, remember, and use. Private mode keeps sessions temporary.</p><button>Review privacy controls</button></div>}{tab==='Memory'&&<div className="panel-copy"><BrainCircuit/><h3>Memory with permission</h3><p>ELL-EX builds a useful map of your goals and preferences only when you approve it.</p><button>Open memory map</button></div>}<div className="activity"><div><History/><h3>Recent activity</h3></div>{['Started Community Connect','ELL-EX created 3 app screens','Saved learning plan to Vault'].map((x,i)=><p key={x}><i/>{x}<small>{i+2}m</small></p>)}</div></aside>}
function VoiceSettings({voiceSettings,setVoiceSettings,availableVoices}){
  const[voiceMenuOpen,setVoiceMenuOpen]=useState(false);
  const speechSupported=typeof window!=='undefined'&&'speechSynthesis'in window;
  const selectedVoice=availableVoices.find(voice=>voice.voiceURI===voiceSettings.voiceURI);
  const update=change=>setVoiceSettings(current=>({...current,...change}));
  const chooseVoice=voiceURI=>{
    setVoiceMenuOpen(false);
    update({voiceURI});
  };
  const previewVoice=()=>{
    if(!speechSupported)return;
    window.speechSynthesis.cancel();
    const utterance=new SpeechSynthesisUtterance('Hello, I am ELL-EX. This is your selected voice.');
    if(selectedVoice)utterance.voice=selectedVoice;
    utterance.lang=selectedVoice?.lang||'en-ZA';
    utterance.rate=voiceSettings.rate;
    utterance.pitch=voiceSettings.pitch;
    window.speechSynthesis.speak(utterance);
  };

  return <div className="voice-settings-card"><div className="settings-card-title"><Volume2/><div><h2>Voice</h2><p>Choose how ELL-EX reads answers aloud on this device.</p></div></div>{speechSupported?<><div className="setting-field"><span>Voice</span><div className="voice-picker"><button type="button" className="voice-picker-button" aria-haspopup="listbox" aria-expanded={voiceMenuOpen} onClick={()=>setVoiceMenuOpen(open=>!open)}><span>{selectedVoice?`${selectedVoice.name} (${selectedVoice.lang})`:'Automatic (device default)'}</span><ChevronDown/></button>{voiceMenuOpen&&<div className="voice-options" role="listbox" aria-label="Voice"><button type="button" role="option" aria-selected={!voiceSettings.voiceURI} className={!voiceSettings.voiceURI?'selected':''} onClick={()=>chooseVoice('')}>Automatic (device default)</button>{availableVoices.map((voice,index)=><button type="button" role="option" aria-selected={voiceSettings.voiceURI===voice.voiceURI} className={voiceSettings.voiceURI===voice.voiceURI?'selected':''} key={`${voice.voiceURI}-${voice.lang}-${index}`} onClick={()=>chooseVoice(voice.voiceURI)}>{voice.name} ({voice.lang})</button>)}</div>}</div></div><label className="setting-field"><span>Speed <output>{voiceSettings.rate.toFixed(1)}×</output></span><input type="range" min="0.7" max="1.4" step="0.1" value={voiceSettings.rate} onChange={event=>update({rate:Number(event.target.value)})}/></label><label className="setting-field"><span>Pitch <output>{voiceSettings.pitch.toFixed(1)}</output></span><input type="range" min="0.7" max="1.3" step="0.1" value={voiceSettings.pitch} onChange={event=>update({pitch:Number(event.target.value)})}/></label><label className="setting-toggle"><span><b>Read new answers automatically</b><small>Off by default. You can still use Read aloud anytime.</small></span><input type="checkbox" checked={voiceSettings.autoRead} onChange={event=>update({autoRead:event.target.checked})}/></label><button className="voice-test" onClick={previewVoice}><Volume2/>Test this voice</button><p className="voice-note">Voice choices come from your phone or browser and stay on this device. Personal voice cloning is not enabled.</p></>:<p className="voice-unavailable">Voice playback is not supported in this browser.</p>}</div>
}
function UtilityPage({type,memory,setMemory,privateMode,setPrivate,onHome,voiceSettings,setVoiceSettings,availableVoices}){if(type==='Settings')return <section className="utility-page settings-page"><div className="settings-heading"><Settings/><div><h1>Settings</h1><p>Control the ELL-EX experience on this device.</p></div></div><VoiceSettings {...{voiceSettings,setVoiceSettings,availableVoices}}/><div className="device-settings"><button onClick={()=>setMemory(!memory)}>Memory: {memory?'On':'Off'}</button><button onClick={()=>setPrivate(!privateMode)}>Private mode: {privateMode?'On':'Off'}</button><button className="secondary" onClick={onHome}>Return home</button></div></section>;return <section className="placeholder utility-page"><HelpCircle/><h1>Help</h1><p>Type a request, choose a mode, or attach a supported photo or document. For scanned PDFs, use a clear photo until OCR is added.</p><button onClick={onHome}>Return home</button></section>}
function Vault({vaultFile,setVaultFile,onHome}){return <section className="placeholder"><LockKeyhole/><h1>Private Vault</h1><p>Choose a file to prepare it on this device.</p><input id="vault-file" type="file" hidden onChange={e=>setVaultFile(e.target.files?.[0]?.name||'')}/><button onClick={()=>window.document.getElementById('vault-file').click()}><Paperclip/> Choose file</button>{vaultFile&&<div className="vault-status" role="status"><b>{vaultFile}</b><span>Selected successfully. Permanent encrypted storage is not connected yet, so ELL-EX has not uploaded this file.</span></div>}<button className="secondary" onClick={onHome}>Return home</button></section>}
function App(){
  const[active,setActive]=useState('Home');
  const[mode,setMode]=useState('Ask');
  const[open,setOpen]=useState(false);
  const[tab,setTab]=useState('Capabilities');
  const[memory,setMemory]=useState(true);
  const[privateMode,setPrivate]=useState(true);
  const[vaultFile,setVaultFile]=useState('');
  const[notice,setNotice]=useState('');
  const[voiceSettings,setVoiceSettings]=useState(readVoiceSettings);
  const[availableVoices,setAvailableVoices]=useState([]);
  const[futureLabState,setFutureLabState]=useState(readFutureLabState);
  const[selectedProjectId,setSelectedProjectId]=useState('');

  useEffect(()=>{if(active==='Create'||active==='Learn')setMode(active)},[active]);
  useEffect(()=>{if(!notice)return;const timer=setTimeout(()=>setNotice(''),2600);return()=>clearTimeout(timer)},[notice]);
  useEffect(()=>{writeVoiceSettings(voiceSettings)},[voiceSettings]);
  useEffect(()=>{writeFutureLabState(futureLabState)},[futureLabState]);
  useEffect(()=>{
    if(!('speechSynthesis'in window))return;
    const refreshVoices=()=>setAvailableVoices(window.speechSynthesis.getVoices().slice().sort((a,b)=>a.name.localeCompare(b.name)));
    refreshVoices();
    window.speechSynthesis.addEventListener('voiceschanged',refreshVoices);
    return()=>window.speechSynthesis.removeEventListener('voiceschanged',refreshVoices);
  },[]);

  const navigate=target=>{
    setActive(target);
    setSelectedProjectId('');
    setOpen(false);
    window.requestAnimationFrame(()=>window.scrollTo({top:0,behavior:'smooth'}));
  };
  const openProject=projectId=>{
    setSelectedProjectId(projectId);
    window.requestAnimationFrame(()=>window.scrollTo({top:0,behavior:'smooth'}));
  };
  const labProps={futureLabState,onOpen:openProject,onViewAll:()=>navigate('Worlds')};

  return <div className="app"><Sidebar active={active} setActive={navigate} open={open} setOpen={setOpen}/><main><Header menu={()=>setOpen(true)} onNotify={()=>setNotice('You’re all caught up — no new notifications.')} {...{setPrivate,privateMode,memory,setMemory}}/>{notice&&<div className="app-notice" role="status">{notice}</div>}<div className="content"><div className="workspace">{!selectedProjectId&&!['Vault','Settings','Help'].includes(active)&&<Composer {...{mode,setMode,voiceSettings,availableVoices}}/>}{selectedProjectId?<FutureProject projectId={selectedProjectId} {...{futureLabState,setFutureLabState}} onBack={()=>setSelectedProjectId('')} onNotice={setNotice}/>:active==='Home'?<><Agents/><Lab {...labProps}/></>:active==='Agents'?<Agents/>:active==='Worlds'?<Lab {...labProps}/>:(active==='Create'||active==='Learn')?null:active==='Vault'?<Vault {...{vaultFile,setVaultFile}} onHome={()=>navigate('Home')}/>:<UtilityPage type={active} {...{memory,setMemory,privateMode,setPrivate,voiceSettings,setVoiceSettings,availableVoices}} onHome={()=>navigate('Home')}/>}</div><Core {...{tab,setTab}}/></div><nav className="bottom">{nav.slice(0,5).map(([n,I])=><button key={n} className={active===n&&!selectedProjectId?'active':''} onClick={()=>navigate(n)}><I/><span>{n}</span></button>)}</nav></main></div>
}
createRoot(document.getElementById('root')).render(<App/>);
