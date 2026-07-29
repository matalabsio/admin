import { proxyAuthRequest } from "@/lib/auth-proxy";

type Params = { params: Promise<{ path: string[] }> };

async function handle(req: Request, { params }: Params) {
  const { path } = await params;
  return proxyAuthRequest(req, path);
}

export const GET = handle;
export const POST = handle;
export const PATCH = handle;
