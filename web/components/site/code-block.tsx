"use client";
import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { sdkCode, pythonCode } from "@/lib/site-content";
export function CodeBlock({code}:{code:string}) {
 const [status,setStatus]=useState("Copy");const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current);},[]);
 async function copy(){try{await navigator.clipboard.writeText(code);setStatus("Copied");}catch{setStatus("Select code to copy");}if(timer.current)clearTimeout(timer.current);timer.current=setTimeout(()=>setStatus("Copy"),2500);}
 return <div className="code-block"><button className="copy-code" onClick={copy} aria-label="Copy code">{status==="Copied"?<Check size={13}/>:<Copy size={13}/>}<span aria-live="polite">{status}</span></button><pre tabIndex={0}><code>{code}</code></pre></div>;
}
export function SDKExample(){return <Tabs defaultValue="javascript" className="dev-code"><TabsList aria-label="SDK language"><TabsTrigger value="javascript">JavaScript</TabsTrigger><TabsTrigger value="python">Python</TabsTrigger></TabsList><TabsContent value="javascript"><CodeBlock code={sdkCode}/></TabsContent><TabsContent value="python"><CodeBlock code={pythonCode}/></TabsContent></Tabs>}
