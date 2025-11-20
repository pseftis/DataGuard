"use client";

import { useEffect, useMemo, useState } from "react";

type DataCategory =
  | "Email"
  | "Phone"
  | "Location"
  | "Browsing History"
  | "Payments"
  | "Contacts";

type ConsentLevel = "full" | "limited" | "deny";

interface ConsentRule {
  category: DataCategory;
  level: ConsentLevel;
}

interface PartnerConsent {
  id: string;
  partnerName: string;
  partnerType: string;
  description: string;
  riskScore: number; // 0-100
  rules: ConsentRule[];
  lastUpdated: string;
}

const DATA_CATEGORIES: DataCategory[] = [
  "Email",
  "Phone",
  "Location",
  "Browsing History",
  "Payments",
  "Contacts",
];

const PARTNER_TEMPLATES: Array<Pick<
  PartnerConsent,
  "partnerName" | "partnerType" | "description"
>> = [
  {
    partnerName: "ShopSphere",
    partnerType: "E‑commerce analytics",
    description:
      "Tracks purchases and on-site activity to improve recommendations and marketing campaigns.",
  },
  {
    partnerName: "MoveSense",
    partnerType: "Location intelligence",
    description:
      "Uses precise location pings to personalize offers from nearby merchants.",
  },
  {
    partnerName: "AdLoom",
    partnerType: "Ad network",
    description:
      "Runs retargeting ads across the web based on browsing and purchase history.",
  },
];

const STORAGE_KEY = "hushvault:partner-consents:v1";

function loadFromStorage(): PartnerConsent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as PartnerConsent[];
  } catch {
    return [];
  }
}

function saveToStorage(value: PartnerConsent[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // ignore
  }
}

function computeRiskScore(rules: ConsentRule[]): number {
  // Lightweight, rule-based "risk engine" instead of a real LLM.
  // In the README we describe how this could be swapped with an OpenAI / LLM call.
  let score = 20;

  for (const rule of rules) {
    if (rule.level === "full") {
      if (rule.category === "Payments" || rule.category === "Browsing History") {
        score += 25;
      } else if (rule.category === "Location" || rule.category === "Contacts") {
        score += 18;
      } else {
        score += 10;
      }
    } else if (rule.level === "limited") {
      score += 5;
    }
  }

  if (rules.every((r) => r.level === "deny")) {
    score = 5;
  }

  return Math.min(100, Math.max(0, score));
}

function summarizeRisk(score: number): string {
  if (score <= 20) return "Very Low — minimal personal data shared.";
  if (score <= 40)
    return "Low — only non-sensitive or partially anonymized data is shared.";
  if (score <= 65)
    return "Medium — trade-off between personalization and privacy.";
  if (score <= 85)
    return "High — partner has wide visibility into your personal footprint.";
  return "Critical — this partner can reconstruct a detailed profile about you.";
}

function id() {
  return Math.random().toString(36).slice(2);
}

export default function HomePage() {
  const [consents, setConsents] = useState<PartnerConsent[]>([]);
  const [selectedPartnerIndex, setSelectedPartnerIndex] = useState(0);
  const [partnerName, setPartnerName] = useState(
    PARTNER_TEMPLATES[0]?.partnerName ?? "",
  );
  const [partnerType, setPartnerType] = useState(
    PARTNER_TEMPLATES[0]?.partnerType ?? "",
  );
  const [partnerDescription, setPartnerDescription] = useState(
    PARTNER_TEMPLATES[0]?.description ?? "",
  );
  const [ruleDraft, setRuleDraft] = useState<ConsentRule[]>(() =>
    DATA_CATEGORIES.map((c) => ({ category: c, level: "limited" })),
  );

  useEffect(() => {
    const restored = loadFromStorage();
    if (restored.length) {
      setConsents(restored);
    } else {
      const initialRules: ConsentRule[] = DATA_CATEGORIES.map((c) => ({
        category: c,
        level: c === "Payments" || c === "Browsing History" ? "deny" : "limited",
      }));
      const initial: PartnerConsent[] = PARTNER_TEMPLATES.map((tpl, index) => ({
        id: id(),
        partnerName: tpl.partnerName,
        partnerType: tpl.partnerType,
        description: tpl.description,
        rules: index === 2 ? initialRules.map((r) => ({ ...r, level: "full" })) : initialRules,
        riskScore: computeRiskScore(initialRules),
        lastUpdated: new Date().toISOString(),
      }));
      setConsents(initial);
      saveToStorage(initial);
    }
  }, []);

  const metrics = useMemo(() => {
    if (!consents.length) {
      return {
        partners: 0,
        avgRisk: 0,
        fullAccessRules: 0,
        denyRules: 0,
      };
    }
    let totalRisk = 0;
    let fullAccessRules = 0;
    let denyRules = 0;
    for (const c of consents) {
      totalRisk += c.riskScore;
      for (const r of c.rules) {
        if (r.level === "full") fullAccessRules += 1;
        if (r.level === "deny") denyRules += 1;
      }
    }
    return {
      partners: consents.length,
      avgRisk: Math.round(totalRisk / consents.length),
      fullAccessRules,
      denyRules,
    };
  }, [consents]);

  const currentRiskScore = useMemo(
    () => computeRiskScore(ruleDraft),
    [ruleDraft],
  );

  function levelLabel(level: ConsentLevel): string {
    if (level === "full") return "Full access";
    if (level === "limited") return "Limited";
    return "Denied";
  }

  function updateRule(category: DataCategory, level: ConsentLevel) {
    setRuleDraft((prev) =>
      prev.map((r) => (r.category === category ? { ...r, level } : r)),
    );
  }

  function onTemplateChange(index: number) {
    setSelectedPartnerIndex(index);
    const tpl = PARTNER_TEMPLATES[index];
    if (!tpl) return;
    setPartnerName(tpl.partnerName);
    setPartnerType(tpl.partnerType);
    setPartnerDescription(tpl.description);
  }

  function persistDraft() {
    const riskScore = computeRiskScore(ruleDraft);
    const entry: PartnerConsent = {
      id: id(),
      partnerName,
      partnerType,
      description: partnerDescription,
      rules: ruleDraft,
      riskScore,
      lastUpdated: new Date().toISOString(),
    };
    setConsents((prev) => {
      const next = [entry, ...prev];
      saveToStorage(next);
      return next;
    });
  }

  function togglePartnerConsentRow(partnerId: string, category: DataCategory) {
    setConsents((prev) => {
      const next = prev.map((partner) => {
        if (partner.id !== partnerId) return partner;
        const rules = partner.rules.map((rule) => {
          if (rule.category !== category) return rule;
          const nextLevel: ConsentLevel =
            rule.level === "deny"
              ? "limited"
              : rule.level === "limited"
              ? "full"
              : "deny";
          return { ...rule, level: nextLevel };
        });
        return {
          ...partner,
          rules,
          riskScore: computeRiskScore(rules),
          lastUpdated: new Date().toISOString(),
        };
      });
      saveToStorage(next);
      return next;
    });
  }

  return (
    <div className="dashboard-grid">
      <section className="card">
        <div className="card-title">Design a safe data‑sharing contract</div>
        <div className="card-subtitle">
          Choose what each partner can see. The rule engine estimates the
          privacy risk in real time.
        </div>

        <div className="pill-row">
          <span className="data-badge">
            <span className="data-badge-pill" />
            Live risk model
          </span>
          <span className="pill">Next.js 14 (App Router)</span>
          <span className="pill">TypeScript</span>
          <span className="pill pill-muted">Rule‑based "AI" engine</span>
        </div>

        <div className="field-row">
          <label className="label">Start from example partner</label>
          <select
            className="select"
            value={selectedPartnerIndex}
            onChange={(e) => onTemplateChange(Number(e.target.value))}
          >
            {PARTNER_TEMPLATES.map((tpl, idx) => (
              <option key={tpl.partnerName} value={idx}>
                {tpl.partnerName} — {tpl.partnerType}
              </option>
            ))}
          </select>
        </div>

        <div className="field-row">
          <label className="label">Partner name</label>
          <input
            className="input"
            value={partnerName}
            onChange={(e) => setPartnerName(e.target.value)}
            placeholder="e.g. MerchantX, HealthY"
          />
        </div>

        <div className="field-row">
          <label className="label">What does this partner do?</label>
          <input
            className="input"
            value={partnerType}
            onChange={(e) => setPartnerType(e.target.value)}
            placeholder="e.g. Marketing automation, fraud detection"
          />
        </div>

        <div className="field-row">
          <label className="label">Short description</label>
          <textarea
            className="textarea"
            value={partnerDescription}
            onChange={(e) => setPartnerDescription(e.target.value)}
            placeholder="Describe how this partner uses user data."
          />
        </div>

        <div className="field-row">
          <label className="label">Per‑category consent rules</label>
          <div className="scroll-y">
            {DATA_CATEGORIES.map((cat) => {
              const rule = ruleDraft.find((r) => r.category === cat)!;
              return (
                <div
                  key={cat}
                  className="consent-row"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0.35rem 0.6rem",
                    marginBottom: "0.25rem",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: "0.78rem",
                        fontWeight: 500,
                        marginBottom: 2,
                      }}
                    >
                      {cat}
                    </div>
                    <div style={{ fontSize: "0.7rem", color: "#9ca3af" }}>
                      {rule.level === "deny"
                        ? "No access to this category."
                        : rule.level === "limited"
                        ? "Shared in a coarse or anonymized form."
                        : "Partner sees full, raw data in this category."}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button
                      className="btn-secondary btn"
                      type="button"
                      style={{ padding: "0.25rem 0.65rem", fontSize: "0.72rem" }}
                      onClick={() =>
                        updateRule(
                          cat,
                          rule.level === "deny"
                            ? "limited"
                            : rule.level === "limited"
                            ? "full"
                            : "deny",
                        )
                      }
                    >
                      {levelLabel(rule.level)}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="metric-row">
          <div className="metric">
            <span className="metric-label">Estimated risk</span>
            <span className="metric-value">{currentRiskScore}/100</span>
            <span
              className={`metric-trend ${
                currentRiskScore > 65
                  ? "negative"
                  : currentRiskScore <= 40
                  ? "positive"
                  : ""
              }`}
            >
              {summarizeRisk(currentRiskScore)}
            </span>
          </div>
          <div className="metric">
            <span className="metric-label">Sharing intensity</span>
            <span className="metric-value">
              {
                ruleDraft.filter((r) => r.level === "full" || r.level === "limited")
                  .length
              }{" "}
              / {DATA_CATEGORIES.length} categories
            </span>
            <span className="metric-trend">
              {ruleDraft.filter((r) => r.level === "deny").length} categories fully
              locked down
            </span>
          </div>
        </div>

        <div className="btn-row">
          <button
            className="btn"
            type="button"
            onClick={persistDraft}
            disabled={!partnerName.trim()}
          >
            Save as policy
          </button>
          <button
            className="btn btn-secondary"
            type="button"
            onClick={() =>
              setRuleDraft(
                DATA_CATEGORIES.map((c) => ({
                  category: c,
                  level: "deny",
                })),
              )
            }
          >
            Deny all
          </button>
        </div>
      </section>

      <section className="card">
        <div className="card-title">Active data‑sharing policies</div>
        <div className="card-subtitle">
          A compact view of every partner, its consent rules, and estimated
          privacy risk.
        </div>

        <div className="metric-row">
          <div className="metric">
            <span className="metric-label">Partners</span>
            <span className="metric-value">{metrics.partners}</span>
          </div>
          <div className="metric">
            <span className="metric-label">Average risk</span>
            <span className="metric-value">{metrics.avgRisk}/100</span>
          </div>
          <div className="metric">
            <span className="metric-label">Full‑access rules</span>
            <span className="metric-value">{metrics.fullAccessRules}</span>
          </div>
          <div className="metric">
            <span className="metric-label">Denied rules</span>
            <span className="metric-value">{metrics.denyRules}</span>
          </div>
        </div>

        <div className="scroll-y">
          {consents.map((partner) => (
            <div
              key={partner.id}
              className="consent-row"
              style={{
                padding: "0.45rem 0.55rem",
                marginBottom: "0.35rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: 8,
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      marginBottom: 2,
                    }}
                  >
                    {partner.partnerName}
                  </div>
                  <div
                    style={{
                      fontSize: "0.7rem",
                      color: "#9ca3af",
                      marginBottom: 4,
                    }}
                  >
                    {partner.partnerType}
                  </div>
                  <div style={{ fontSize: "0.7rem", color: "#9ca3af" }}>
                    {partner.description}
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-end",
                    gap: 2,
                  }}
                >
                  <span
                    className={`consent-chip ${
                      partner.riskScore >= 70
                        ? "deny"
                        : partner.riskScore <= 35
                        ? ""
                        : ""
                    }`}
                  >
                    Risk: {partner.riskScore}/100
                  </span>
                  <span style={{ fontSize: "0.65rem", color: "#6b7280" }}>
                    Updated{" "}
                    {new Date(partner.lastUpdated).toLocaleTimeString("en-IN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>

              <div
                style={{
                  marginTop: 8,
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 6,
                }}
              >
                {partner.rules.map((rule) => (
                  <button
                    key={rule.category}
                    type="button"
                    className="btn-secondary"
                    style={{
                      borderRadius: 999,
                      padding: "0.2rem 0.5rem",
                      fontSize: "0.65rem",
                      border: "1px solid rgba(75,85,99,0.9)",
                      background:
                        rule.level === "deny"
                          ? "rgba(239,68,68,0.12)"
                          : rule.level === "full"
                          ? "rgba(34,197,94,0.12)"
                          : "rgba(55,65,81,0.8)",
                    }}
                    onClick={() =>
                      togglePartnerConsentRow(partner.id, rule.category)
                    }
                  >
                    {rule.category}: {levelLabel(rule.level)}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {!consents.length && (
            <div
              style={{
                fontSize: "0.8rem",
                color: "#6b7280",
                paddingTop: 4,
              }}
            >
              No policies yet. Configure a partner on the left and click
              &quot;Save as policy&quot;.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}


