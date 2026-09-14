import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { posts } from "@/lib/site-content";
export function generateStaticParams(){return posts.map(p=>({slug:p.slug}));}
export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{const {slug}=await params;const p=posts.find(p=>p.slug===slug);return {title:p?`${p.title} — KunoWorld Journal`:'Story not found — KunoWorld',description:p?.description};}
export default async function Article({params}:{params:Promise<{slug:string}>}){const {slug}=await params;const p=posts.find(p=>p.slug===slug);if(!p)notFound();return <><header className="article-header"><Link href="/blog" className="article-back"><ArrowLeft size={14}/> Back to the journal</Link><span className="section-kicker">{p.category}</span><h1>{p.title}</h1><p>{p.description}</p><div className="article-meta"><span>KunoWorld editorial</span><span>{p.read}</span></div></header><div className="article-cover"><img src={p.image} alt={p.title}/></div><article className="article-content">{p.sections.map(s=><section key={s.heading}><h2>{s.heading}</h2>{s.paragraphs.map((text,i)=><p key={i}>{text}</p>)}</section>)}<div className="article-end"><a href="/studio" className="ocean-button button-dark">Try it in the studio <ArrowUpRight size={16}/></a><Link href="/blog" className="text-link">More from the journal <ArrowUpRight size={15}/></Link></div></article></>}
