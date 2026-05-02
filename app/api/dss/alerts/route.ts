import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const alerts = await prisma.alert.findMany({
      where: {
        isResolved: false,
        alertType: { in: ["EXPIRY_LIQUIDATION", "STOCKOUT_RISK"] },
      },
      include: {
        medicine: { select: { name: true, category: true, unitPrice: true, sku: true } },
      },
      orderBy: [{ severity: "asc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({
      alerts,
      summary: {
        total: alerts.length,
        expiry: alerts.filter((a) => a.alertType === "EXPIRY_LIQUIDATION").length,
        stockout: alerts.filter((a) => a.alertType === "STOCKOUT_RISK").length,
        critical: alerts.filter((a) => a.severity === "CRITICAL").length,
        high: alerts.filter((a) => a.severity === "HIGH").length,
      },
    });
  } catch (err: any) {
    console.error("[DSS Alerts GET Error]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { alertId } = await req.json();
    if (!alertId) {
      return NextResponse.json({ error: "alertId is required" }, { status: 400 });
    }
    await prisma.alert.update({
      where: { id: alertId },
      data: { isResolved: true, resolvedAt: new Date() },
    });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[DSS Alerts PATCH Error]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}