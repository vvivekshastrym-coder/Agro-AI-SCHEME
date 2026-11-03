import http from "node:http";
import {
  AuthorizedShareCreateSchema,
  CropRecordCreateSchema,
  FarmExpenseEntrySchema,
  FarmerProfileUpdateSchema,
  LoginSchema,
  PhoneOtpRequestSchema,
  PhoneOtpVerifySchema,
  PlotCreateSchema,
  SignupSchema,
  StaffInvitationAcceptSchema,
  StaffInvitationCreateSchema,
  SupportedLanguageEnum,
} from "@agro/shared";
import {
  AgroPlatformService,
  AuthorizationError,
  KARNATAKA_LOCATIONS,
  ValidationError,
} from "./platform.service.js";
import { redactPii, verifyAccessJwt } from "./security.js";

// ============================================================================
// HTTP API Server with Security Headers, Rate Limiting, Validation, OpenAPI
// ============================================================================

export function createApiServer(platform = new AgroPlatformService()) {
  const rateLimitBuckets = new Map<
    string,
    { count: number; windowResetMs: number }
  >();

  function checkRateLimit(ip: string, limit = 120, windowMs = 60_000): boolean {
    const now = Date.now();
    const bucket = rateLimitBuckets.get(ip);
    if (!bucket || bucket.windowResetMs < now) {
      rateLimitBuckets.set(ip, { count: 1, windowResetMs: now + windowMs });
      return true;
    }
    bucket.count += 1;
    return bucket.count <= limit;
  }

  function applySecurityHeaders(res: http.ServerResponse, origin?: string) {
    const allowedOrigins = platform.config.CORS_ORIGINS.split(",").map((s) =>
      s.trim()
    );
    const matchedOrigin =
      origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0]!;
    res.setHeader("Access-Control-Allow-Origin", matchedOrigin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET,POST,PUT,DELETE,OPTIONS"
    );
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type,Authorization,X-CSRF-Token"
    );
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; frame-ancestors 'none'"
    );
  }

  async function readJsonBody(req: http.IncomingMessage): Promise<unknown> {
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const raw = Buffer.concat(chunks).toString("utf8");
    if (!raw) return {};
    return JSON.parse(raw);
  }

  function sendJson(
    res: http.ServerResponse,
    statusCode: number,
    payload: unknown
  ) {
    res.statusCode = statusCode;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify(payload));
  }

  function extractBearerUser(req: http.IncomingMessage): {
    userId: string;
    roles: string[];
  } {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new AuthorizationError("Missing Bearer token", 401);
    }
    const token = authHeader.slice("Bearer ".length).trim();
    const decoded = verifyAccessJwt(token, platform.config.JWT_ACCESS_SECRET);
    if (!decoded) {
      throw new AuthorizationError("Invalid or expired access token", 401);
    }
    return { userId: decoded.sub, roles: decoded.roles };
  }

  const server = http.createServer(async (req, res) => {
    const ip = req.socket.remoteAddress ?? "127.0.0.1";
    applySecurityHeaders(res, req.headers.origin);

    if (req.method === "OPTIONS") {
      res.statusCode = 204;
      res.end();
      return;
    }

    if (!checkRateLimit(ip)) {
      sendJson(res, 429, { error: "Too many requests, please try again later" });
      return;
    }

    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
    const pathname = url.pathname;

    try {
      // Phase 0: Health & Readiness & OpenAPI Docs
      if (req.method === "GET" && pathname === "/health") {
        sendJson(res, 200, {
          status: "ok",
          service: "@agro/api",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (req.method === "GET" && pathname === "/ready") {
        sendJson(res, 200, {
          status: "ready",
          database: "connected",
          adapters: {
            sms: platform.config.SMS_PROVIDER,
            email: platform.config.EMAIL_PROVIDER,
            llm: platform.config.LLM_PROVIDER,
            stt: platform.config.STT_PROVIDER,
            isMock: true,
          },
        });
        return;
      }

      if (req.method === "GET" && pathname === "/docs") {
        sendJson(res, 200, {
          openapi: "3.1.0",
          info: {
            title: "Agro AI Scheme API",
            version: "0.1.0",
            description:
              "Farmer-first government scheme intelligence, deterministic rules engine, and benefit passport API",
          },
          paths: {
            "/health": { get: { summary: "Liveness check" } },
            "/ready": { get: { summary: "Readiness check" } },
            "/api/v1/auth/signup": { post: { summary: "Farmer email signup" } },
            "/api/v1/auth/login": { post: { summary: "Email + password login" } },
            "/api/v1/auth/otp/request": { post: { summary: "Phone OTP request" } },
            "/api/v1/auth/otp/verify": { post: { summary: "Phone OTP verify" } },
            "/api/v1/farmers/:id/passport": {
              get: { summary: "Get Farmer Benefit Passport" },
            },
            "/api/v1/farmers/:id/schemes/match": {
              get: { summary: "Evaluate published schemes deterministically" },
            },
          },
        });
        return;
      }

      // Reference Locations (Karnataka District/Taluk/Village)
      if (req.method === "GET" && pathname === "/api/v1/reference/locations") {
        sendJson(res, 200, {
          isDemoReference: true,
          locations: KARNATAKA_LOCATIONS,
        });
        return;
      }

      // Mandi Market Prices (Server-side Agmarknet / data.gov.in adapter)
      if (req.method === "GET" && pathname === "/api/v1/mandi/prices") {
        const district = url.searchParams.get("district") ?? "Mysore";
        const commodity = url.searchParams.get("commodity") ?? "Ragi";
        const out = await platform.fetchMandiPrices(district, commodity);
        sendJson(res, 200, out);
        return;
      }

      // Phase 1: Auth Routes
      if (req.method === "POST" && pathname === "/api/v1/auth/signup") {
        const body = SignupSchema.parse(await readJsonBody(req));
        const out = await platform.signupFarmer(body, ip);
        sendJson(res, 201, out);
        return;
      }

      if (req.method === "POST" && pathname === "/api/v1/auth/verify-email") {
        const body = (await readJsonBody(req)) as { token?: string };
        const out = platform.verifyEmail(String(body.token ?? ""));
        sendJson(res, 200, out);
        return;
      }

      if (req.method === "POST" && pathname === "/api/v1/auth/login") {
        const body = LoginSchema.parse(await readJsonBody(req));
        const out = platform.loginWithEmail({
          ...body,
          userAgent: req.headers["user-agent"],
          ipAddress: ip,
        });
        res.setHeader(
          "Set-Cookie",
          `agro_rt=${out.refreshToken}; HttpOnly; Path=/; SameSite=Lax`
        );
        sendJson(res, 200, out);
        return;
      }

      if (req.method === "POST" && pathname === "/api/v1/auth/refresh") {
        const body = (await readJsonBody(req)) as { refreshToken?: string };
        const out = platform.rotateRefreshToken(
          String(body.refreshToken ?? ""),
          req.headers["user-agent"],
          ip
        );
        sendJson(res, 200, out);
        return;
      }

      if (req.method === "POST" && pathname === "/api/v1/auth/otp/request") {
        const body = PhoneOtpRequestSchema.parse(await readJsonBody(req));
        const out = await platform.requestPhoneOtp(
          body.phone,
          body.preferredLanguage
        );
        sendJson(res, 200, out);
        return;
      }

      if (req.method === "POST" && pathname === "/api/v1/auth/otp/verify") {
        const body = PhoneOtpVerifySchema.parse(await readJsonBody(req));
        const out = platform.verifyPhoneOtpAndLogin({
          phone: body.phone,
          otp: body.otp,
          fullName: body.fullName,
          ipAddress: ip,
        });
        sendJson(res, 200, out);
        return;
      }

      if (req.method === "GET" && pathname === "/api/v1/auth/sessions") {
        const { userId } = extractBearerUser(req);
        const sessions = platform.listActiveSessions(userId);
        sendJson(res, 200, { sessions });
        return;
      }

      const revokeSessionMatch = pathname.match(
        /^\/api\/v1\/auth\/sessions\/([^/]+)\/revoke$/
      );
      if (revokeSessionMatch && req.method === "POST") {
        const { userId } = extractBearerUser(req);
        platform.revokeSession(userId, revokeSessionMatch[1]!);
        sendJson(res, 200, { revoked: true });
        return;
      }

      if (
        req.method === "POST" &&
        pathname === "/api/v1/auth/account/delete-request"
      ) {
        const { userId } = extractBearerUser(req);
        const out = platform.requestAccountDeletion(userId);
        sendJson(res, 200, out);
        return;
      }

      if (req.method === "POST" && pathname === "/api/v1/auth/logout") {
        const { userId } = extractBearerUser(req);
        const active = platform.listActiveSessions(userId);
        for (const s of active) {
          platform.revokeSession(userId, s.id);
        }
        sendJson(res, 200, { loggedOut: true, revokedCount: active.length });
        return;
      }

      if (req.method === "POST" && pathname === "/api/v1/auth/invitations") {
        const { userId } = extractBearerUser(req);
        const body = StaffInvitationCreateSchema.parse(await readJsonBody(req));
        const out = platform.createStaffInvitation(userId, body);
        sendJson(res, 201, out);
        return;
      }

      if (
        req.method === "POST" &&
        pathname === "/api/v1/auth/invitations/accept"
      ) {
        const body = StaffInvitationAcceptSchema.parse(await readJsonBody(req));
        const out = platform.acceptStaffInvitation(body);
        sendJson(res, 201, out);
        return;
      }

      // Phase 2: Farmer Benefit Passport, Plots, Crops, Authorized Shares
      const passportMatch = pathname.match(
        /^\/api\/v1\/farmers\/([^/]+)\/passport$/
      );
      if (passportMatch) {
        const { userId } = extractBearerUser(req);
        const targetFarmerId = passportMatch[1]!;
        if (req.method === "GET") {
          const out = platform.getFarmerPassport(userId, targetFarmerId);
          sendJson(res, 200, out);
          return;
        }
        if (req.method === "PUT") {
          const body = FarmerProfileUpdateSchema.parse(await readJsonBody(req));
          const out = platform.updateFarmerProfile(userId, targetFarmerId, body);
          sendJson(res, 200, out);
          return;
        }
      }

      const expModeMatch = pathname.match(
        /^\/api\/v1\/farmers\/([^/]+)\/experience-mode$/
      );
      if (expModeMatch && req.method === "PUT") {
        const { userId } = extractBearerUser(req);
        const targetFarmerId = expModeMatch[1]!;
        const body = (await readJsonBody(req)) as {
          experienceMode?: "AI_PREDICTION" | "NORMAL_APP";
        };
        const out = platform.updateExperienceMode(
          userId,
          targetFarmerId,
          body.experienceMode as "AI_PREDICTION" | "NORMAL_APP"
        );
        sendJson(res, 200, out);
        return;
      }

      const intelSummaryMatch = pathname.match(
        /^\/api\/v1\/farmers\/([^/]+)\/intelligence-summary$/
      );
      if (intelSummaryMatch && req.method === "GET") {
        const { userId } = extractBearerUser(req);
        const targetFarmerId = intelSummaryMatch[1]!;
        const langParam = (url.searchParams.get("lang") ?? "kn") as
          | "kn"
          | "en"
          | "hi";
        const out = await platform.getAgriculturalIntelligenceSummary(
          userId,
          targetFarmerId,
          langParam
        );
        sendJson(res, 200, out);
        return;
      }

      const plotsMatch = pathname.match(/^\/api\/v1\/farmers\/([^/]+)\/plots$/);
      if (plotsMatch && req.method === "POST") {
        const { userId } = extractBearerUser(req);
        const targetFarmerId = plotsMatch[1]!;
        const body = PlotCreateSchema.parse(await readJsonBody(req));
        const out = platform.addFarmPlot(userId, targetFarmerId, body);
        sendJson(res, 201, out);
        return;
      }

      const cropsMatch = pathname.match(/^\/api\/v1\/farmers\/([^/]+)\/crops$/);
      if (cropsMatch && req.method === "POST") {
        const { userId } = extractBearerUser(req);
        const targetFarmerId = cropsMatch[1]!;
        const body = CropRecordCreateSchema.parse(await readJsonBody(req));
        const out = platform.addCropRecord(userId, targetFarmerId, body);
        sendJson(res, 201, out);
        return;
      }

      const sharesMatch = pathname.match(
        /^\/api\/v1\/farmers\/([^/]+)\/shares$/
      );
      if (sharesMatch && req.method === "POST") {
        const { userId } = extractBearerUser(req);
        const targetFarmerId = sharesMatch[1]!;
        if (userId !== targetFarmerId) {
          throw new AuthorizationError("Only the farmer can grant shares", 403);
        }
        const raw = (await readJsonBody(req)) as {
          granteeUserId: string;
          granteeRole: "FAMILY_HELPER" | "CSC_OPERATOR";
          scopes: string[];
          expiresInDays?: number;
          purpose: string;
        };
        const parsed = AuthorizedShareCreateSchema.parse({
          granteeEmailOrPhone: raw.granteeUserId,
          granteeRole: raw.granteeRole,
          scopes: raw.scopes,
          expiresInDays: raw.expiresInDays ?? 30,
          purpose: raw.purpose,
        });
        const out = platform.grantAuthorizedShare(
          userId,
          raw.granteeUserId,
          parsed
        );
        sendJson(res, 201, out);
        return;
      }

      // Phase 3: Scheme Matcher, What-If Simulator, Reviewer Governance
      const matchRoute = pathname.match(
        /^\/api\/v1\/farmers\/([^/]+)\/schemes\/match$/
      );
      if (matchRoute && req.method === "GET") {
        const { userId } = extractBearerUser(req);
        const targetFarmerId = matchRoute[1]!;
        const lang = SupportedLanguageEnum.catch("kn").parse(
          url.searchParams.get("lang") ?? "kn"
        );
        const out = await platform.evaluateSchemesForFarmer(
          userId,
          targetFarmerId,
          lang
        );
        sendJson(res, 200, { matches: out });
        return;
      }

      const whatIfRoute = pathname.match(
        /^\/api\/v1\/farmers\/([^/]+)\/schemes\/what-if$/
      );
      if (whatIfRoute && req.method === "POST") {
        const { userId } = extractBearerUser(req);
        const targetFarmerId = whatIfRoute[1]!;
        const body = (await readJsonBody(req)) as {
          overrideFacts?: Record<string, unknown>;
        };
        const out = platform.simulateWhatIfEligibility(
          userId,
          targetFarmerId,
          (body.overrideFacts ?? {}) as Record<string, string | number | boolean>
        );
        sendJson(res, 200, { simulations: out });
        return;
      }

      if (req.method === "GET" && pathname === "/api/v1/schemes/catalogue") {
        sendJson(res, 200, {
          schemes: platform.listAllSchemeVersions(),
        });
        return;
      }

      if (req.method === "POST" && pathname === "/api/v1/auth/demo-session") {
        const body = (await readJsonBody(req)) as {
          role?: "FARMER" | "CSC_OPERATOR" | "SCHEME_REVIEWER" | "PLATFORM_ADMIN";
        };
        const validRoles = [
          "FARMER",
          "CSC_OPERATOR",
          "SCHEME_REVIEWER",
          "PLATFORM_ADMIN",
        ] as const;
        const role = validRoles.includes(body.role as (typeof validRoles)[number])
          ? (body.role as (typeof validRoles)[number])
          : "FARMER";
        const out = platform.getOrCreateDemoSession(role);
        sendJson(res, 200, out);
        return;
      }

      // Reviewer Maker-Checker Scheme Routes
      if (req.method === "POST" && pathname === "/api/v1/schemes/drafts") {
        const { userId } = extractBearerUser(req);
        const body = (await readJsonBody(req)) as Parameters<
          typeof platform.createSchemeDraft
        >[1];
        const out = platform.createSchemeDraft(userId, body);
        sendJson(res, 201, out);
        return;
      }

      const publishMatch = pathname.match(
        /^\/api\/v1\/schemes\/([^/]+)\/publish$/
      );
      if (publishMatch && req.method === "POST") {
        const { userId } = extractBearerUser(req);
        const schemeVersionId = publishMatch[1]!;
        const out = platform.approveAndPublishSchemeVersion(
          userId,
          schemeVersionId
        );
        sendJson(res, 200, out);
        return;
      }

      // Phase 4: Crop Insurance & Claim Rescue Room Routes
      const claimsRoute = pathname.match(
        /^\/api\/v1\/farmers\/([^/]+)\/claims$/
      );
      if (claimsRoute) {
        const { userId } = extractBearerUser(req);
        const targetFarmerId = claimsRoute[1]!;
        if (req.method === "GET") {
          const out = platform.listFarmerClaims(userId, targetFarmerId);
          sendJson(res, 200, out);
          return;
        }
        if (req.method === "POST") {
          const body = (await readJsonBody(req)) as Parameters<
            typeof platform.createCropLossClaim
          >[2];
          const out = platform.createCropLossClaim(
            userId,
            targetFarmerId,
            body
          );
          sendJson(res, 201, out);
          return;
        }
      }

      const claimEvidenceRoute = pathname.match(
        /^\/api\/v1\/farmers\/([^/]+)\/claims\/([^/]+)\/evidence$/
      );
      if (claimEvidenceRoute && req.method === "POST") {
        const { userId } = extractBearerUser(req);
        const targetFarmerId = claimEvidenceRoute[1]!;
        const claimId = claimEvidenceRoute[2]!;
        const body = (await readJsonBody(req)) as Parameters<
          typeof platform.addClaimEvidencePhoto
        >[3];
        const out = platform.addClaimEvidencePhoto(
          userId,
          targetFarmerId,
          claimId,
          body
        );
        sendJson(res, 200, out);
        return;
      }

      const claimSubmitRoute = pathname.match(
        /^\/api\/v1\/farmers\/([^/]+)\/claims\/([^/]+)\/submit$/
      );
      if (claimSubmitRoute && req.method === "POST") {
        const { userId } = extractBearerUser(req);
        const targetFarmerId = claimSubmitRoute[1]!;
        const claimId = claimSubmitRoute[2]!;
        const body = (await readJsonBody(req)) as Parameters<
          typeof platform.submitClaimPackage
        >[3];
        const out = platform.submitClaimPackage(
          userId,
          targetFarmerId,
          claimId,
          body ?? {}
        );
        sendJson(res, 200, out);
        return;
      }

      // Phase 5: Document X-Ray, Rejection Repair Studio & Scam Shield
      const docXrayRoute = pathname.match(
        /^\/api\/v1\/farmers\/([^/]+)\/documents\/xray$/
      );
      if (docXrayRoute && req.method === "POST") {
        const { userId } = extractBearerUser(req);
        const targetFarmerId = docXrayRoute[1]!;
        const body = (await readJsonBody(req)) as Parameters<
          typeof platform.runDocumentXRayForFarmer
        >[2];
        const out = platform.runDocumentXRayForFarmer(
          userId,
          targetFarmerId,
          body
        );
        sendJson(res, 200, out);
        return;
      }

      const rejectionRoute = pathname.match(
        /^\/api\/v1\/farmers\/([^/]+)\/rejections\/analyze$/
      );
      if (rejectionRoute && req.method === "POST") {
        const { userId } = extractBearerUser(req);
        const targetFarmerId = rejectionRoute[1]!;
        const body = (await readJsonBody(req)) as { noticeText?: string };
        const out = platform.analyzeRejectionNotice(
          userId,
          targetFarmerId,
          String(body.noticeText ?? "")
        );
        sendJson(res, 200, out);
        return;
      }

      if (req.method === "POST" && pathname === "/api/v1/scam-shield/inspect") {
        let actorId: string | null = null;
        try {
          actorId = extractBearerUser(req).userId;
        } catch {
          actorId = null;
        }
        const body = (await readJsonBody(req)) as {
          message?: string;
          fileName?: string;
        };
        const out = platform.inspectAndReportScam(
          actorId,
          String(body.message ?? ""),
          body.fileName
        );
        sendJson(res, 200, out);
        return;
      }

      // Phase 6: Money Trail, Benefit Gap & Expense Ledger
      const benefitsRoute = pathname.match(
        /^\/api\/v1\/farmers\/([^/]+)\/benefits$/
      );
      if (benefitsRoute && req.method === "GET") {
        const { userId } = extractBearerUser(req);
        const targetFarmerId = benefitsRoute[1]!;
        const out = platform.getFarmerBenefitsAndLedger(userId, targetFarmerId);
        sendJson(res, 200, out);
        return;
      }

      const expensesRoute = pathname.match(
        /^\/api\/v1\/farmers\/([^/]+)\/expenses$/
      );
      if (expensesRoute && req.method === "POST") {
        const { userId } = extractBearerUser(req);
        const targetFarmerId = expensesRoute[1]!;
        const body = FarmExpenseEntrySchema.parse(await readJsonBody(req));
        const out = platform.addFarmExpense(userId, targetFarmerId, body);
        sendJson(res, 201, out);
        return;
      }

      // Phase 7: CSC Appointment Tokens, CSC Operator Workspace & WhatsApp Webhook
      const cscTokensRoute = pathname.match(
        /^\/api\/v1\/farmers\/([^/]+)\/csc-tokens$/
      );
      if (cscTokensRoute) {
        const { userId } = extractBearerUser(req);
        const targetFarmerId = cscTokensRoute[1]!;
        if (req.method === "GET") {
          const out = platform.listFarmerCscTokens(userId, targetFarmerId);
          sendJson(res, 200, { tokens: out });
          return;
        }
        if (req.method === "POST") {
          const body = (await readJsonBody(req)) as {
            centreName?: string;
            purpose?: string;
            checklistItems?: string[];
          };
          const out = platform.createCscVisitToken(userId, targetFarmerId, {
            centreName:
              body.centreName ??
              "Raitha Samparka Kendra / CSC — H.D. Kote (Mysuru)",
            purpose:
              body.purpose ??
              "RTC Pahani Verification & Micro-Irrigation Application",
            checklistItems: body.checklistItems,
          });
          sendJson(res, 201, out);
          return;
        }
      }

      if (req.method === "GET" && pathname === "/api/v1/csc/workspace") {
        const { userId } = extractBearerUser(req);
        const out = platform.getCscOperatorWorkspace(userId);
        sendJson(res, 200, out);
        return;
      }

      if (pathname === "/api/v1/whatsapp/webhook") {
        if (req.method === "GET") {
          const mode = url.searchParams.get("hub.mode");
          const token = url.searchParams.get("hub.verify_token");
          const challenge = url.searchParams.get("hub.challenge") ?? "";
          if (
            mode === "subscribe" &&
            token === platform.config.WHATSAPP_VERIFY_TOKEN
          ) {
            res.statusCode = 200;
            res.setHeader("Content-Type", "text/plain; charset=utf-8");
            res.end(challenge);
            return;
          }
          sendJson(res, 403, { error: "Invalid WhatsApp verify token" });
          return;
        }
        if (req.method === "POST") {
          const chunks: Buffer[] = [];
          for await (const chunk of req) {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          }
          const rawBody = Buffer.concat(chunks).toString("utf8");
          const sig = req.headers["x-hub-signature-256"] as string | undefined;
          if (!platform.verifyWhatsAppSignature(rawBody, sig)) {
            sendJson(res, 401, { error: "Invalid X-Hub-Signature-256" });
            return;
          }
          const parsed = JSON.parse(rawBody || "{}") as {
            wamid?: string;
            fromPhone?: string;
            text?: string;
          };
          const out = platform.handleWhatsAppInbound({
            wamid: parsed.wamid ?? `wamid_${Date.now()}`,
            fromPhone: parsed.fromPhone ?? "+919876543210",
            text: parsed.text ?? "MENU",
          });
          sendJson(res, 200, out);
          return;
        }
      }

      if (req.method === "POST" && pathname === "/api/v1/whatsapp/simulate") {
        platform.assertDemoAllowed("whatsapp/simulate");
        const body = (await readJsonBody(req)) as {
          wamid?: string;
          fromPhone?: string;
          text?: string;
          farmerId?: string;
          lastCustomerMessageHoursAgo?: number;
        };
        const out = platform.handleWhatsAppInbound({
          wamid: body.wamid ?? `wamid_sim_${Date.now()}`,
          fromPhone: body.fromPhone ?? "+919876543210",
          text: body.text ?? "MENU",
          farmerIdOptional: body.farmerId,
          lastCustomerMessageHoursAgo: body.lastCustomerMessageHoursAgo,
        });
        sendJson(res, 200, out);
        return;
      }

      if (req.method === "POST" && pathname === "/api/v1/whatsapp/send-report") {
        const body = (await readJsonBody(req)) as {
          phone?: string;
          reportText?: string;
          mediaUrl?: string;
          userId?: string;
        };
        const out = await platform.sendWhatsAppReport({
          userId: body.userId,
          phone: body.phone ?? "",
          reportText: body.reportText ?? "",
          mediaUrl: body.mediaUrl,
        });
        sendJson(res, 200, out);
        return;
      }

      if (req.method === "GET" && pathname === "/api/v1/whatsapp/status") {
        sendJson(res, 200, {
          twilioConfigured: platform.twilioWhatsAppProvider.isConfigured(),
          fromNumber: platform.config.TWILIO_WHATSAPP_FROM,
          directLinkEnabled: true,
        });
        return;
      }

      if (req.method === "POST" && pathname === "/api/v1/admin/backup") {
        const { userId } = extractBearerUser(req);
        const out = platform.createVerifiedBackupSnapshot(userId);
        sendJson(res, 200, out);
        return;
      }

      if (req.method === "POST" && pathname === "/api/v1/admin/restore") {
        const { userId } = extractBearerUser(req);
        const body = (await readJsonBody(req)) as {
          sha256Checksum: string;
          dataJson: string;
        };
        const out = platform.restoreVerifiedBackupSnapshot(userId, body);
        sendJson(res, 200, out);
        return;
      }

      // Phase 8: Admin Overview & Audit Logs
      if (req.method === "GET" && pathname === "/api/v1/admin/overview") {
        const { userId } = extractBearerUser(req);
        const out = platform.getAdminOverview(userId);
        sendJson(res, 200, out);
        return;
      }

      if (req.method === "POST" && pathname === "/api/v1/voice/speak-to-fill") {
        const { userId } = extractBearerUser(req);
        platform.requireUser(userId);
        const body = (await readJsonBody(req)) as {
          fieldHint?: string;
          language?: "kn" | "en" | "hi";
        };
        const out = await platform.sttProvider.transcribeVoiceStub(
          body.fieldHint ?? "plotName",
          body.language ?? "kn"
        );
        sendJson(res, 200, out);
        return;
      }

      if (req.method === "GET" && pathname === "/api/v1/admin/audit-logs") {
        const { userId } = extractBearerUser(req);
        const logs = platform.getAuditLogs(userId);
        sendJson(res, 200, { auditLogs: redactPii(logs) });
        return;
      }

      // Integration Status Endpoint (Public/Staff Read)
      if (req.method === "GET" && pathname === "/api/v1/integrations/status") {
        sendJson(res, 200, platform.getIntegrationsStatus());
        return;
      }

      // ============================================================================
      // Enterprise Multi-Portal Endpoints: Super Admin, Employee/CSC, Bank Partner
      // ============================================================================

      if (req.method === "GET" && pathname === "/api/v1/admin/dashboard") {
        sendJson(res, 200, platform.enterprise.getSuperAdminDashboard());
        return;
      }

      if (req.method === "GET" && pathname === "/api/v1/admin/farmers") {
        sendJson(res, 200, {
          farmers: Array.from(platform.enterprise.farmers.values()),
        });
        return;
      }

      if (req.method === "POST" && pathname === "/api/v1/admin/farmers") {
        const body = (await readJsonBody(req)) as any;
        const farmer = platform.enterprise.registerFarmer("super-admin", body);
        sendJson(res, 201, { farmer });
        return;
      }

      if (req.method === "GET" && pathname === "/api/v1/admin/employees") {
        sendJson(res, 200, {
          employees: Array.from(platform.enterprise.employees.values()),
        });
        return;
      }

      if (req.method === "POST" && pathname === "/api/v1/admin/employees") {
        const body = (await readJsonBody(req)) as any;
        const id = `emp-${Date.now().toString(36)}`;
        const emp = {
          id,
          name: String(body.name || "Staff Member"),
          email: String(body.email || `${id}@agroaischeme.in`),
          role: body.role || "EMPLOYEE",
          cscCentreId: body.cscCentreId || "csc-ka-mys-01",
          status: "ACTIVE" as const,
          createdAt: new Date().toISOString(),
        };
        platform.enterprise.employees.set(id, emp);
        sendJson(res, 201, { employee: emp });
        return;
      }

      if (req.method === "GET" && pathname === "/api/v1/admin/csc-centres") {
        sendJson(res, 200, {
          cscCentres: Array.from(platform.enterprise.cscCentres.values()),
        });
        return;
      }

      if (req.method === "POST" && pathname === "/api/v1/admin/csc-centres") {
        const body = (await readJsonBody(req)) as any;
        const id = `csc-${Date.now().toString(36)}`;
        const centre = {
          id,
          code: body.code || `CSC-${id.toUpperCase()}`,
          name: body.name || "Gram One / CSC Centre",
          districtCode: body.districtCode || "KA-MYS",
          talukCode: body.talukCode || "KA-MYS-HDK",
          managerId: body.managerId || null,
          contactPhone: body.contactPhone || "+918212000000",
          status: "ACTIVE" as const,
          createdAt: new Date().toISOString(),
        };
        platform.enterprise.cscCentres.set(id, centre);
        sendJson(res, 201, { cscCentre: centre });
        return;
      }

      if (req.method === "GET" && pathname === "/api/v1/admin/schemes") {
        sendJson(res, 200, {
          schemes: Array.from(platform.enterprise.schemes.values()),
        });
        return;
      }

      if (req.method === "GET" && pathname === "/api/v1/admin/applications") {
        sendJson(res, 200, {
          applications: Array.from(platform.enterprise.applications.values()),
        });
        return;
      }

      if (req.method === "GET" && pathname === "/api/v1/admin/bank-partners") {
        sendJson(res, 200, {
          bankPartners: Array.from(platform.enterprise.bankPartners.values()),
        });
        return;
      }

      if (req.method === "GET" && pathname === "/api/v1/admin/integrations/health") {
        sendJson(res, 200, {
          integrations: platform.enterprise.getIntegrationHealth(),
        });
        return;
      }

      // Employee / CSC Portal APIs
      if (req.method === "GET" && pathname === "/api/v1/employee/dashboard") {
        const empId = url.searchParams.get("employeeId") || undefined;
        sendJson(res, 200, platform.enterprise.getEmployeeDashboard(empId));
        return;
      }

      if (req.method === "POST" && pathname === "/api/v1/employee/farmers/register") {
        const body = (await readJsonBody(req)) as any;
        const farmer = platform.enterprise.registerFarmer(
          body.actorId || "emp-lead-01",
          body
        );
        sendJson(res, 201, { farmer });
        return;
      }

      if (req.method === "POST" && pathname === "/api/v1/employee/applications/create") {
        const body = (await readJsonBody(req)) as any;
        const app = platform.enterprise.createApplication(
          body.actorId || "emp-lead-01",
          body.actorRole || "EMPLOYEE",
          body.actorName || "Suresh Patil",
          body
        );
        sendJson(res, 201, { application: app });
        return;
      }

      if (req.method === "POST" && pathname === "/api/v1/employee/applications/transition") {
        const body = (await readJsonBody(req)) as any;
        const app = platform.enterprise.transitionApplicationStatus(
          body.actorId || "emp-lead-01",
          body.actorRole || "EMPLOYEE",
          body.actorName || "Suresh Patil",
          body
        );
        sendJson(res, 200, { application: app });
        return;
      }

      if (req.method === "POST" && pathname === "/api/v1/employee/applications/handoff") {
        const body = (await readJsonBody(req)) as any;
        const app = platform.enterprise.recordPortalHandoff(
          body.actorId || "emp-lead-01",
          body.actorRole || "EMPLOYEE",
          body.actorName || "Suresh Patil",
          body
        );
        sendJson(res, 200, { application: app });
        return;
      }

      // Bank Partner Portal APIs
      if (req.method === "GET" && pathname === "/api/v1/bank/dashboard") {
        const bankId = url.searchParams.get("bankId") || undefined;
        sendJson(res, 200, platform.enterprise.getBankDashboard(bankId));
        return;
      }

      if (req.method === "POST" && pathname === "/api/v1/bank/applications/decision") {
        const body = (await readJsonBody(req)) as any;
        const app = platform.enterprise.recordBankDecision(
          body.actorId || "bank-mgr-01",
          "BANK_PARTNER",
          body.bankName || "SBI Relationship Manager",
          body
        );
        sendJson(res, 200, { application: app });
        return;
      }

      // Scheme Rollback Route
      const rollbackRoute = pathname.match(
        /^\/api\/v1\/schemes\/([^/]+)\/rollback$/
      );
      if (rollbackRoute && req.method === "POST") {
        const { userId } = extractBearerUser(req);
        const schemeCode = rollbackRoute[1]!;
        const body = (await readJsonBody(req)) as { targetVersionNumber?: number };
        const out = platform.rollbackSchemeToVersion(
          userId,
          schemeCode,
          Number(body.targetVersionNumber ?? 1)
        );
        sendJson(res, 200, out);
        return;
      }

      // Deadline Guardian Preferences, Quiet Hours, Opt-Out & Evaluation
      const remindersRoute = pathname.match(
        /^\/api\/v1\/farmers\/([^/]+)\/reminders$/
      );
      if (remindersRoute) {
        const { userId } = extractBearerUser(req);
        const targetFarmerId = remindersRoute[1]!;
        if (req.method === "GET") {
          const out = platform.getOrUpdateReminderPreferences(
            userId,
            targetFarmerId
          );
          sendJson(res, 200, out);
          return;
        }
        if (req.method === "PUT") {
          const body = (await readJsonBody(req)) as Parameters<
            typeof platform.getOrUpdateReminderPreferences
          >[2];
          const out = platform.getOrUpdateReminderPreferences(
            userId,
            targetFarmerId,
            body
          );
          sendJson(res, 200, out);
          return;
        }
      }

      const remindersEvalRoute = pathname.match(
        /^\/api\/v1\/farmers\/([^/]+)\/reminders\/evaluate$/
      );
      if (remindersEvalRoute && req.method === "POST") {
        const { userId } = extractBearerUser(req);
        const targetFarmerId = remindersEvalRoute[1]!;
        const body = (await readJsonBody(req)) as { simulatedHourIst?: number };
        const out = platform.triggerDeadlineGuardianEvaluation(
          userId,
          targetFarmerId,
          body.simulatedHourIst ?? 14
        );
        sendJson(res, 200, out);
        return;
      }

      // Status Tracker & Manual/CSC Case History Routes
      const casesRoute = pathname.match(
        /^\/api\/v1\/farmers\/([^/]+)\/cases$/
      );
      if (casesRoute) {
        const { userId } = extractBearerUser(req);
        const targetFarmerId = casesRoute[1]!;
        if (req.method === "GET") {
          const out = platform.listStatusTrackingCases(userId, targetFarmerId);
          sendJson(res, 200, { cases: out });
          return;
        }
        if (req.method === "POST") {
          const body = (await readJsonBody(req)) as Parameters<
            typeof platform.createStatusTrackingCase
          >[2];
          const out = platform.createStatusTrackingCase(
            userId,
            targetFarmerId,
            body
          );
          sendJson(res, 201, out);
          return;
        }
      }

      const caseStatusUpdateRoute = pathname.match(
        /^\/api\/v1\/farmers\/([^/]+)\/cases\/([^/]+)\/status$/
      );
      if (caseStatusUpdateRoute && req.method === "POST") {
        const { userId } = extractBearerUser(req);
        const targetFarmerId = caseStatusUpdateRoute[1]!;
        const caseId = caseStatusUpdateRoute[2]!;
        const body = (await readJsonBody(req)) as Parameters<
          typeof platform.updateStatusTrackingCaseManually
        >[3];
        const out = platform.updateStatusTrackingCaseManually(
          userId,
          targetFarmerId,
          caseId,
          body
        );
        sendJson(res, 200, out);
        return;
      }

      // Consent-Gated Private Document Vault & Signed Expiring Links
      const docVaultRoute = pathname.match(
        /^\/api\/v1\/farmers\/([^/]+)\/documents\/vault$/
      );
      if (docVaultRoute) {
        const { userId } = extractBearerUser(req);
        const targetFarmerId = docVaultRoute[1]!;
        if (req.method === "GET") {
          const out = platform.listPrivateDocuments(userId, targetFarmerId);
          sendJson(res, 200, { documents: out });
          return;
        }
        if (req.method === "POST") {
          const body = (await readJsonBody(req)) as Parameters<
            typeof platform.uploadConsentGatedDocument
          >[2];
          const out = platform.uploadConsentGatedDocument(
            userId,
            targetFarmerId,
            body
          );
          sendJson(res, 201, out);
          return;
        }
      }

      const privateDocReadRoute = pathname.match(
        /^\/api\/v1\/documents\/private\/([^/]+)$/
      );
      if (privateDocReadRoute && req.method === "GET") {
        const docId = privateDocReadRoute[1]!;
        const signedToken = url.searchParams.get("token") ?? "";
        const out = platform.verifyAndReadPrivateDocument(docId, signedToken);
        sendJson(res, 200, { document: out, verifiedBySignedLink: true });
        return;
      }

      // Voice-First Agro GPT Assistant (Server-Side OpenAI + Confirmation Gate)
      const assistantChatRoute = pathname.match(
        /^\/api\/v1\/farmers\/([^/]+)\/assistant\/chat$/
      );
      if (assistantChatRoute && req.method === "POST") {
        const { userId } = extractBearerUser(req);
        const targetFarmerId = assistantChatRoute[1]!;
        const body = (await readJsonBody(req)) as {
          message?: string;
          language?: "kn" | "en" | "hi";
          inputMode?: "VOICE" | "TEXT";
        };
        const out = await platform.chatWithAgroGpt(userId, targetFarmerId, {
          message: String(body.message ?? ""),
          language: body.language ?? "kn",
          inputMode: body.inputMode ?? "TEXT",
        });
        sendJson(res, 200, out);
        return;
      }

      const assistantConfirmRoute = pathname.match(
        /^\/api\/v1\/farmers\/([^/]+)\/assistant\/confirm$/
      );
      if (assistantConfirmRoute && req.method === "POST") {
        const { userId } = extractBearerUser(req);
        const targetFarmerId = assistantConfirmRoute[1]!;
        const body = (await readJsonBody(req)) as {
          confirmationToken?: string;
        };
        const out = platform.confirmAgroGptAction(
          userId,
          targetFarmerId,
          String(body.confirmationToken ?? "")
        );
        sendJson(res, 200, out);
        return;
      }

      sendJson(res, 404, { error: "Not found" });
    } catch (err) {
      if (err instanceof AuthorizationError) {
        sendJson(res, err.statusCode, { error: err.message });
        return;
      }
      if (err instanceof ValidationError) {
        sendJson(res, err.statusCode, { error: err.message });
        return;
      }
      if (err && typeof err === "object" && "issues" in err) {
        sendJson(res, 400, {
          error: "Validation failed",
          details: (err as { issues: unknown }).issues,
        });
        return;
      }
      sendJson(res, 500, { error: "Internal server error" });
    }
  });

  return { server, platform };
}
