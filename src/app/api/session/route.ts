import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const { branchId } = await req.json();
    
    if (!branchId) {
      return NextResponse.json({ error: 'Missing branchId' }, { status: 400 });
    }

    const cookieStore = await cookies();
    
    // Set an HTTP-only cookie that expires in 2 hours
    cookieStore.set('session_branch_id', branchId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 2, // 2 hours
      path: '/',
    });

    return NextResponse.json({ success: true, branchId });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  const cookieStore = await cookies();
  const branchId = cookieStore.get('session_branch_id')?.value;
  
  return NextResponse.json({ branchId: branchId || null });
}
