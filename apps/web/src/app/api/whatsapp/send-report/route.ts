import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      phone?: string;
      reportText?: string;
      mediaUrl?: string;
    };
    const cleanPhone =
      (body?.phone || "").replace(/\D/g, "").slice(-10) || "9876543210";
    const reportText =
      body?.reportText || "Agro AI Scheme Farmer Advisory Report";
    const toFormatted = `whatsapp:+91${cleanPhone}`;
    const directWhatsAppUrl = `https://api.whatsapp.com/send?phone=91${cleanPhone}&text=${encodeURIComponent(
      reportText
    )}`;

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber =
      process.env.TWILIO_WHATSAPP_FROM || "whatsapp:+14155238886";

    if (!accountSid || !authToken) {
      return NextResponse.json({
        messageSid: `SM_sim_${Date.now()}_${cleanPhone}`,
        status: "mock_delivered",
        isMock: true,
        provider: "mock_direct",
        to: toFormatted,
        from: fromNumber,
        sentAt: new Date().toISOString(),
        directWhatsAppUrl,
        notice:
          "Twilio credentials not configured in environment. Direct WhatsApp link ready.",
      });
    }

    const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const basicAuth = Buffer.from(`${accountSid}:${authToken}`).toString(
      "base64"
    );

    const formData = new URLSearchParams();
    formData.append("From", fromNumber);
    formData.append("To", toFormatted);
    formData.append("Body", reportText);
    if (body?.mediaUrl) {
      formData.append("MediaUrl", body.mediaUrl);
    }

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json(
        {
          messageSid: `SM_failed_${Date.now()}`,
          status: "failed",
          isMock: false,
          provider: "twilio",
          to: toFormatted,
          from: fromNumber,
          error: errText,
          directWhatsAppUrl,
        },
        { status: 502 }
      );
    }

    const data = (await res.json()) as any;
    return NextResponse.json({
      messageSid: data.sid || `SM_${Date.now()}`,
      status: data.status || "queued",
      isMock: false,
      provider: "twilio",
      to: toFormatted,
      from: fromNumber,
      sentAt: new Date().toISOString(),
      directWhatsAppUrl,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to process WhatsApp request" },
      { status: 500 }
    );
  }
}
