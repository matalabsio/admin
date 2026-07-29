import { proxyToBackend } from "@/lib/api-proxy";

type Ctx = { params: Promise<{ slug?: string[] }> };

async function forward(req: Request, slug: string[] | undefined) {
  const tail = slug?.length ? slug.join("/") : "";
  const path = tail ? `/admin/${tail}` : "/admin";
  return proxyToBackend(req, path);
}

export async function GET(req: Request, ctx: Ctx) {
  const { slug } = await ctx.params;
  return forward(req, slug);
}

export async function POST(req: Request, ctx: Ctx) {
  const { slug } = await ctx.params;
  return forward(req, slug);
}

export async function PATCH(req: Request, ctx: Ctx) {
  const { slug } = await ctx.params;
  return forward(req, slug);
}

export async function PUT(req: Request, ctx: Ctx) {
  const { slug } = await ctx.params;
  return forward(req, slug);
}

export async function DELETE(req: Request, ctx: Ctx) {
  const { slug } = await ctx.params;
  return forward(req, slug);
}
