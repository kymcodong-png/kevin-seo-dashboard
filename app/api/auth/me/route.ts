import { currentAccess } from "../../../lib/collaborator-auth";
export async function GET() { const access = await currentAccess(); return access ? Response.json({ access }) : Response.json({ access: null }, { status: 401 }); }
