import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const accessToken = request.cookies.get('google_access_token')?.value;
    const userInfoCookie = request.cookies.get('google_user_info')?.value;

    if (!accessToken || !userInfoCookie) {
      return NextResponse.json({
        success: true,
        authenticated: false,
        user: null,
      });
    }

    const userInfo = JSON.parse(userInfoCookie);

    return NextResponse.json({
      success: true,
      authenticated: true,
      user: {
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture,
      },
    });
  } catch (error) {
    console.error('Error checking OAuth status:', error);
    return NextResponse.json({
      success: true,
      authenticated: false,
      user: null,
    });
  }
}
