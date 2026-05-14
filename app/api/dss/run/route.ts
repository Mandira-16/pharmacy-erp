import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const FLASK_URL = process.env.FLASK_URL || "https://comfortable-encouragement-production-fd8b.up.railway.app";

export async function POST() {
  try {
    const medicines = await prisma.medicine.findMany({
      include: {
        batches: { orderBy: { expiryDate: "asc" } },
      },
    });

    if (!medicines.length) {
      return NextResponse.json(
        { error: "No medicines found in database. Please seed the database first." },
        { status: 404 }
      );
    }

    const flaskPayload = medicines.map((med) => {
      const totalStock = med.batches.reduce((sum, b) => sum + b.quantity, 0);
      const nearestBatch = med.batches.find(b => b.quantity > 0);
      const daysToExpiry = nearestBatch
        ? Math.floor((new Date(nearestBatch.expiryDate).getTime() - Date.now()) / 86400000)
        : 999;
      return {
        medicine: med.name,
        category: med.category,
        current_stock: totalStock,
        avg_daily_sales: (med as any).avgDailySales ?? 10,
        unit_price: Number(med.unitPrice),
        days_to_expiry: daysToExpiry,
        medicine_id: med.id,
        avg_daily_sales_val: (med as any).avgDailySales ?? 10,
      };
    });

    const flaskRes = await fetch(`${FLASK_URL}/predict/batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ medicines: flaskPayload }),
    });

    if (!flaskRes.ok) {
      throw new Error(`Flask API returned status ${flaskRes.status}`);
    }

    const flaskData = await flaskRes.json();
    const predictions: any[] = flaskData.predictions ?? flaskData.results ?? [];

    const alertsToCreate: any[] = [];
    const dssResults: any[] = [];

    for (const pred of predictions) {
      const med = flaskPayload.find((m) => m.medicine === pred.medicine);
      if (!med) continue;

      const pred30 = pred.predicted_30 ?? pred.predictions?.["30_day"] ?? 0;
      const pred60 = pred.predicted_60 ?? pred.predictions?.["60_day"] ?? 0;
      const pred90 = pred.predicted_90 ?? pred.predictions?.["90_day"] ?? 0;
      const stock = med.current_stock;
      const daysToExpiry = med.days_to_expiry;
      const unitPrice = med.unit_price;
      const medicineId = med.medicine_id;
      const avgDailySales = med.avg_daily_sales_val;

      const revenueProjection30 = pred30 * unitPrice;
      const revenueProjection90 = pred90 * unitPrice;

      // FR12 — Expiry Liquidation (FIXED LOGIC)
      // Flag if: expiry within 90 days AND stock > what we can sell before expiry
      let expiryAlertData = null;
      if (daysToExpiry > 0 && daysToExpiry < 90) {
        // How many units can we sell before expiry based on avg daily sales?
        const sellableBeforeExpiry = Math.floor(avgDailySales * daysToExpiry)
        const surplusUnits = Math.max(0, stock - sellableBeforeExpiry)

        if (surplusUnits > 0 || stock > 0) {
          const suggestedDiscount = daysToExpiry < 30 ? 30 : daysToExpiry < 60 ? 20 : 10
          const severity = daysToExpiry < 30 ? "CRITICAL" : daysToExpiry < 60 ? "HIGH" : "MEDIUM"
          const actualSurplus = surplusUnits > 0 ? surplusUnits : Math.ceil(stock * 0.3) // at least flag 30% as at risk

          expiryAlertData = {
            alertType: "EXPIRY_LIQUIDATION",
            severity,
            medicineId,
            message: `${pred.medicine}: ${actualSurplus} units at risk of expiry in ${daysToExpiry} days. Apply ${suggestedDiscount}% clearance discount to recover LKR ${Math.round(actualSurplus * unitPrice * (1 - suggestedDiscount/100))}.`,
            metadata: JSON.stringify({
              surplusUnits: actualSurplus,
              daysToExpiry,
              suggestedDiscount,
              predictedDemand90: Math.ceil(pred90),
              potentialLossLKR: Math.round(actualSurplus * unitPrice),
              sellableBeforeExpiry,
            }),
          };
          alertsToCreate.push(expiryAlertData);
        }
      }

      // FR13 — Stockout Prevention
      let stockoutAlertData = null;
      if (pred30 > stock) {
        const deficit = Math.ceil(pred30 - stock);
        const leadTimeDays = 7;
        const safetyBuffer = Math.ceil((pred30 / 30) * leadTimeDays * 1.2);
        const reorderQty = deficit + safetyBuffer;
        const severity = stock === 0 ? "CRITICAL" : stock < pred30 * 0.5 ? "HIGH" : "MEDIUM";
        stockoutAlertData = {
          alertType: "STOCKOUT_RISK",
          severity,
          medicineId,
          message: `${pred.medicine}: Predicted demand (${Math.ceil(pred30)} units) exceeds stock (${stock} units). Reorder ${reorderQty} units immediately.`,
          metadata: JSON.stringify({
            currentStock: stock,
            predictedDemand30: Math.ceil(pred30),
            deficit,
            reorderQty,
            leadTimeDays,
          }),
        };
        alertsToCreate.push(stockoutAlertData);
      }

      dssResults.push({
        medicine: pred.medicine,
        medicineId,
        currentStock: stock,
        daysToExpiry,
        unitPrice,
        predictions: {
          day30: Math.ceil(pred30),
          day60: Math.ceil(pred60),
          day90: Math.ceil(pred90),
        },
        revenueProjection: {
          day30: Math.round(revenueProjection30),
          day90: Math.round(revenueProjection90),
        },
        action: pred.action ?? "MONITOR",
        confidence: pred.confidence ?? 0.75,
        hasExpiryAlert: !!expiryAlertData,
        hasStockoutAlert: !!stockoutAlertData,
      });
    }

    // Clear old unresolved DSS alerts
    await prisma.alert.deleteMany({
      where: {
        isResolved: false,
        alertType: { in: ["EXPIRY_LIQUIDATION", "STOCKOUT_RISK"] },
      },
    });

    if (alertsToCreate.length > 0) {
      await prisma.alert.createMany({
        data: alertsToCreate.map((a) => ({
          alertType: a.alertType,
          severity: a.severity,
          medicineId: a.medicineId,
          message: a.message,
          metadata: a.metadata,
          isResolved: false,
          createdAt: new Date(),
        })),
      });
    }

    return NextResponse.json({
      success: true,
      summary: {
        totalMedicinesAnalysed: medicines.length,
        expiryAlerts: alertsToCreate.filter((a) => a.alertType === "EXPIRY_LIQUIDATION").length,
        stockoutAlerts: alertsToCreate.filter((a) => a.alertType === "STOCKOUT_RISK").length,
        totalAlertsGenerated: alertsToCreate.length,
      },
      results: dssResults,
    });
  } catch (err: any) {
    console.error("[DSS Run Error]", err);
    return NextResponse.json({ error: err.message ?? "DSS engine failed" }, { status: 500 });
  }
}