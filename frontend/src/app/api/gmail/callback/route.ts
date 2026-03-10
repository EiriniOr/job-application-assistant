import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { exchangeCodeForTokens } from "@/lib/gmail";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(`${origin}/applications?gmail=error`);
  }

  try {
    const tokens = await exchangeCodeForTokens(code);

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (toSet) =>
            toSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            ),
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.redirect(`${origin}/login`);

    const tokenExpiry = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
    await supabase.from("gmail_integrations").upsert(
      {
        user_id: user.id,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expiry: tokenExpiry,
      },
      { onConflict: "user_id" }
    );

    return NextResponse.redirect(`${origin}/applications?gmail=connected`);
  } catch (e) {
    console.error("Gmail callback error:", e);
    return NextResponse.redirect(`${origin}/applications?gmail=error`);
  }
}
