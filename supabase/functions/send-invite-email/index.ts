import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const FROM = 'Misu <onboarding@resend.dev>';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type' } });
  }

  try {
    const { invitedEmail, companyName, invitedByName } = await req.json();

    if (!invitedEmail || !companyName) {
      return new Response(JSON.stringify({ error: 'missing params' }), { status: 400 });
    }

    const html = `
<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Invito Misu</title>
</head>
<body style="margin:0;padding:0;background:#F0F4F8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F0F4F8;padding:40px 0;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

        <!-- Header blu -->
        <tr>
          <td style="background:#0c2d75;padding:36px 40px 28px;text-align:center;">
            <div style="font-size:42px;font-weight:900;color:#FFC107;letter-spacing:1px;">Misu</div>
            <div style="font-size:13px;color:rgba(255,255,255,0.6);margin-top:4px;letter-spacing:0.5px;">Gestione rilievi infissi</div>
          </td>
        </tr>

        <!-- Corpo -->
        <tr>
          <td style="padding:36px 40px 20px;">
            <p style="margin:0 0 16px;font-size:22px;font-weight:800;color:#0c2d75;">Sei stato invitato!</p>
            <p style="margin:0 0 20px;font-size:15px;color:#444;line-height:1.6;">
              ${invitedByName ? `<strong>${invitedByName}</strong> ti ha invitato` : 'Hai ricevuto un invito'} ad unirti all'azienda
              <strong style="color:#0c2d75;">${companyName}</strong> su Misu.
            </p>
            <p style="margin:0 0 28px;font-size:14px;color:#666;line-height:1.6;">
              Scarica l'app, registrati con questa email e accedi ai rilievi condivisi dell'azienda.
            </p>

            <!-- Badge azienda -->
            <div style="background:#F0F4F8;border-radius:12px;padding:16px 20px;margin-bottom:28px;border-left:4px solid #FFC107;">
              <div style="font-size:11px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Azienda</div>
              <div style="font-size:17px;font-weight:800;color:#0c2d75;">${companyName}</div>
            </div>

            <p style="margin:0;font-size:13px;color:#999;line-height:1.6;">
              Se non ti aspettavi questo messaggio, puoi ignorarlo in sicurezza.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#F7FAFD;padding:20px 40px;border-top:1px solid #E8EDF5;">
            <p style="margin:0;font-size:11px;color:#bbb;text-align:center;">
              Misu — App per rilievi infissi &nbsp;|&nbsp; Questo messaggio è stato inviato automaticamente, non rispondere.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM,
        to:   invitedEmail,
        subject: `Sei stato invitato su Misu — ${companyName}`,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('Resend error:', err);
      return new Response(JSON.stringify({ error: err }), { status: 500 });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });

  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});
