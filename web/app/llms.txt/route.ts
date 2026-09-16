// kunoworld.com/llms.txt: the llmstxt.org index of KunoWorld for language models (lib/llms.ts).
import { llmsTxt } from "@/lib/llms";

export const dynamic = "force-static";

export function GET() {
  return new Response(llmsTxt(), { headers: { "Content-Type": "text/markdown; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
