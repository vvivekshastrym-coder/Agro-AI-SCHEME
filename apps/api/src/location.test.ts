import { describe, it, expect, beforeEach } from "vitest";
import { AgroLocationService, calculateHaversineKm } from "./location.service";

describe("AgroLocationService — Live Location, Smart GPS & Audit Tests", () => {
  let locationService: AgroLocationService;

  beforeEach(() => {
    locationService = new AgroLocationService();
  });

  it("calculates accurate Haversine distance between two coordinates", () => {
    // H.D. Kote town (11.9834, 76.3262) to Hampapura (12.0833, 76.3500) is approx ~11.4 km
    const dist = calculateHaversineKm(11.9834, 76.3262, 12.0833, 76.35);
    expect(dist).toBeGreaterThan(10);
    expect(dist).toBeLessThan(13);
  });

  it("reverse geocodes coordinates to village, taluk, district, and PIN code", async () => {
    // Near Hampapura, H.D. Kote
    const resolved = await locationService.reverseGeocode(12.0835, 76.3502);
    expect(resolved.village).toBe("Hampapura");
    expect(resolved.taluk).toBe("H.D. Kote");
    expect(resolved.district).toBe("Mysuru");
    expect(resolved.state).toBe("Karnataka");
    expect(resolved.pincode).toBe("571125");
    expect(resolved.formattedAddress).toContain("Hampapura");
  });

  it("finds nearby CSC centres and bank branches sorted by distance in km", () => {
    // From Hampapura
    const nearby = locationService.getNearbyServices(12.0833, 76.35, 40);
    expect(nearby.length).toBeGreaterThanOrEqual(3);

    // Canara Bank Hampapura should be the closest (within 1km)
    expect(nearby[0].name).toContain("Canara Bank");
    expect(nearby[0].distanceKm).toBeLessThan(1.5);

    // Verify distance sorting
    for (let i = 1; i < nearby.length; i++) {
      expect(nearby[i].distanceKm).toBeGreaterThanOrEqual(nearby[i - 1].distanceKm);
    }
  });

  it("creates voluntary live location sharing session with expiry and audit trail", () => {
    const session = locationService.createSharingSession({
      farmerId: "farmer-ka-mys-01",
      farmerName: "Ningappa Gowda",
      farmerMobile: "+91 98450 12345",
      assignedEmployeeId: "emp-csc-01",
      assignedEmployeeName: "Siddesh N.",
      durationMinutes: 30,
      initialCoordinates: {
        latitude: 12.0833,
        longitude: 76.35,
        accuracyMeters: 4.2,
        timestampIso: new Date().toISOString(),
      },
    });

    expect(session.sessionId).toMatch(/^loc-/);
    expect(session.status).toBe("ACTIVE");
    expect(session.durationMinutes).toBe(30);
    expect(session.accessAuditLog.length).toBe(1);
    expect(session.accessAuditLog[0].accessedByName).toContain("Consent Recorded");

    // Check retrieval
    const fetched = locationService.getSession(session.sessionId, {
      employeeId: "emp-csc-01",
      employeeName: "Siddesh N.",
    });
    expect(fetched).not.toBeNull();
    expect(fetched?.accessAuditLog.length).toBe(2);
  });

  it("updates coordinates during active session, updates audit log, and allows immediate revocation", () => {
    const session = locationService.createSharingSession({
      farmerId: "farmer-01",
      farmerName: "Ramesh",
      farmerMobile: "+91 98451 98451",
      durationMinutes: 15,
    });

    const updateRes = locationService.updateLiveCoordinates(session.sessionId, {
      latitude: 12.085,
      longitude: 76.352,
      accuracyMeters: 3.5,
      timestampIso: new Date().toISOString(),
    });

    expect(updateRes.success).toBe(true);
    expect(updateRes.session?.currentCoordinates?.latitude).toBe(12.085);

    // Revoke
    const revokeRes = locationService.revokeSharingSession(session.sessionId, "farmer-01");
    expect(revokeRes.success).toBe(true);
    expect(revokeRes.session?.status).toBe("REVOKED");

    // Updating a revoked session must fail
    const postRevokeUpdate = locationService.updateLiveCoordinates(session.sessionId, {
      latitude: 12.086,
      longitude: 76.353,
      timestampIso: new Date().toISOString(),
    });
    expect(postRevokeUpdate.success).toBe(false);
  });

  it("stores and separates agricultural farm locations from mobile GPS location", () => {
    const farmerId = "farmer-ka-test-01";
    const farm = locationService.saveFarmLocation(farmerId, {
      plotName: "South Field Sugarcane",
      surveyNumber: "88/1B",
      coordinates: {
        latitude: 11.985,
        longitude: 76.327,
        accuracyMeters: 2.0,
        timestampIso: new Date().toISOString(),
      },
      resolvedAddress: {
        village: "H.D. Kote Rural",
        taluk: "H.D. Kote",
        district: "Mysuru",
        state: "Karnataka",
        pincode: "571114",
        formattedAddress: "Survey 88/1B, H.D. Kote Rural, Mysuru",
        source: "GPS_REVERSE_GEOCODED",
      },
      areaHectares: 2.5,
      cropCode: "SUGARCANE",
      isPrimary: true,
    });

    expect(farm.id).toMatch(/^farm-loc-/);
    const saved = locationService.getFarmLocations(farmerId);
    expect(saved.length).toBe(1);
    expect(saved[0].surveyNumber).toBe("88/1B");
    expect(saved[0].cropCode).toBe("SUGARCANE");
  });
});
