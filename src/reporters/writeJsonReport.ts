import * as fs from 'fs';
import * as path from 'path';
import { AuditResult } from '../types';
import { scoreLabel, scoreColor } from '../scoring/calculateHealthScore';

export function writeJsonReport(result: AuditResult, outputPath: string): void {
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf-8');
}

export function writeHtmlReport(result: AuditResult, outputPath: string, targetDir: string): void {
  const score = result.healthScore;
  const label = scoreLabel(score);
  const color = scoreColor(score);
  const scoreHex = color === 'green' ? '#22c55e' : color === 'yellow' ? '#f59e0b' : '#ef4444';
  const { scoreBreakdown: bd, summary } = result;

  const adoptionPct = summary.adoptionPercent;

  // Score breakdown rows
  const breakdownRows = [
    { label: 'DS adoption',        contribution: bd.adoptionContribution,    penalty: bd.adoptionPenalty,    weight: 40 },
    { label: 'Duplicate penalty',  contribution: bd.duplicateContribution,   penalty: bd.duplicatePenalty,   weight: 20 },
    { label: 'Token compliance',   contribution: bd.tokenContribution,       penalty: bd.tokenPenalty,       weight: 20 },
    { label: 'Inline style usage', contribution: bd.inlineStyleContribution, penalty: bd.inlineStylePenalty, weight: 20 },
  ].map(r => `
    <tr>
      <td>${r.label}</td>
      <td style="text-align:right;font-weight:700">${r.contribution}/${r.weight}</td>
      <td style="text-align:right;color:${r.penalty > 0 ? '#ef4444' : '#22c55e'}">${r.penalty > 0 ? `-${r.penalty}` : '—'}</td>
    </tr>`).join('');

  // Summary table
  const levelColor = (l: string) =>
    l === 'None' || l === 'Low' ? '#22c55e' : l === 'Moderate' ? '#f59e0b' : '#ef4444';

  const isDriftSense = result.dsDetectionMode === 'driftsense';
  const summaryRows = [
    { label: 'DS Adoption',          value: `${summary.adoptionPercent}%`,        color: adoptionPct >= 70 ? '#22c55e' : adoptionPct >= 40 ? '#f59e0b' : '#ef4444' },
    { label: 'Duplicate Families',   value: String(summary.duplicateFamilyCount), color: summary.duplicateFamilyCount === 0 ? '#22c55e' : summary.duplicateFamilyCount <= 2 ? '#f59e0b' : '#ef4444' },
    { label: 'Inline Style Usage',   value: summary.inlineStyleLevel,             color: levelColor(summary.inlineStyleLevel) },
    { label: 'Token Violations',     value: summary.tokenViolationLevel,          color: levelColor(summary.tokenViolationLevel) },
    { label: 'Discovery Mode',       value: isDriftSense ? 'DriftSense' : 'Standard', color: isDriftSense ? '#f59e0b' : '#64748b' },
  ].map(r => `
    <tr>
      <td>${r.label}</td>
      <td style="text-align:right;font-weight:700;color:${r.color}">${r.value}</td>
    </tr>`).join('');

  // Duplicate findings
  const confColor = (c: string) => c === 'high' ? '#22c55e' : c === 'medium' ? '#f59e0b' : '#6b7280';
  const confDots  = (c: string) => c === 'high' ? '●●●' : c === 'medium' ? '●●○' : '●○○';

  const dupRows = result.duplicateFindings.map((d) => {
    const badgeColor = d.severity === 'high' ? '#ef4444' : d.severity === 'medium' ? '#f59e0b' : '#6b7280';
    const compList = d.components.map((c) => {
      const rel = path.relative(targetDir, c.filePath);
      const kindHtml = c.kind === 'wrapper' && c.wraps
        ? `<span class="kind-badge wrapper">wrapper → ${c.wraps}</span>`
        : c.kind === 'feature-composed'
        ? `<span class="kind-badge feature-composed">feature-composed</span>`
        : `<span class="kind-badge standalone">standalone</span>`;
      return `<div class="comp-row">${rel} ${kindHtml}</div>`;
    }).join('');

    const exampleMatch = d.reason.match(/e\.g\. ([A-Z][A-Za-z]+)/);
    const exampleStr = exampleMatch ? ` (e.g. ${exampleMatch[1]})` : '';
    const excludedHtml = d.featureComponentsExcluded > 0
      ? `<div class="dup-excluded">ℹ ${d.featureComponentsExcluded} feature-specific component${d.featureComponentsExcluded > 1 ? 's' : ''}${exampleStr} excluded — not counted as primitives</div>`
      : '';

    return `
      <div class="dup-card">
        <div class="dup-header">
          <span class="badge" style="background:${badgeColor}">${d.severity.toUpperCase()}</span>
          <strong>${d.family} family</strong>
          <span class="conf" style="color:${confColor(d.confidence)}">${confDots(d.confidence)} Confidence: ${d.confidence}</span>
        </div>
        <div class="comp-list">${compList}</div>
        ${excludedHtml}
        <div class="dup-reason"><strong>Reason:</strong> ${d.reason}</div>
        <div class="dup-why"><strong>Why it matters:</strong> ${d.whyItMatters}</div>
      </div>`;
  }).join('');

  // Style items
  const styleItems = [
    { label: 'Inline style props', value: result.inlineStyleCount, threshold: 5, why: 'Inline styles bypass design system tokens, causing spacing and color inconsistency across teams.' },
    { label: 'MUI sx overrides',   value: result.sxOverrideCount,  threshold: 5, why: 'Frequent sx overrides can indicate heavy local customization. Review whether these styles align with approved tokens and intended component usage.' },
    { label: 'Hardcoded colors',   value: result.hardcodedColorCount, threshold: 3, why: 'Hardcoded hex values break theme consistency and make global color changes much harder.' },
    { label: 'Hardcoded spacing',  value: result.hardcodedSpacingCount, threshold: 5, why: 'Raw pixel values ignore the spacing scale and cause subtle misalignment across the UI.' },
  ].map(item => {
    const c = item.value === 0 ? '#22c55e' : item.value <= item.threshold ? '#f59e0b' : '#ef4444';
    const icon = item.value === 0 ? '✓' : item.value <= item.threshold ? '⚠' : '✗';
    return `
      <tr>
        <td><span style="color:${c}">${icon}</span> ${item.label}</td>
        <td style="text-align:right;font-weight:700;color:${c}">${item.value}</td>
        <td class="why-cell">${item.value > item.threshold ? item.why : ''}</td>
      </tr>`;
  }).join('');

  // Approved imports
  const approvedRows = Object.entries(result.approvedImportCounts)
    .sort(([, a], [, b]) => b - a).slice(0, 12)
    .map(([k, v]) => `<tr><td>${k}</td><td class="count good">${v}</td></tr>`).join('');

  const localRows = Object.entries(result.localUiImportCounts)
    .sort(([, a], [, b]) => b - a).slice(0, 12)
    .map(([k, v]) => `<tr><td>${k}</td><td class="count warn">${v}</td></tr>`).join('');

  const recItems = result.recommendations
    .map((r, i) => `<li><span class="rec-num">${i + 1}</span>${r}</li>`).join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Design System Audit Report</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #e2e8f0; line-height: 1.6; }
    .page { max-width: 1100px; margin: 0 auto; padding: 2rem 1.5rem; }
    header { display: flex; align-items: center; justify-content: space-between; padding: 2rem 0 1.5rem; border-bottom: 1px solid #1e293b; margin-bottom: 2rem; }
    header h1 { font-size: 1.5rem; font-weight: 700; color: #f8fafc; }
    header .meta { color: #64748b; font-size: 0.875rem; margin-top: 0.25rem; }

    /* Score hero */
    .score-hero { background: #1e293b; border-radius: 16px; padding: 2rem; display: flex; align-items: center; gap: 2rem; margin-bottom: 1.5rem; }
    .score-circle { width: 110px; height: 110px; border-radius: 50%; background: conic-gradient(${scoreHex} ${score * 3.6}deg, #334155 0deg); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .score-inner { width: 80px; height: 80px; border-radius: 50%; background: #1e293b; display: flex; flex-direction: column; align-items: center; justify-content: center; }
    .score-number { font-size: 1.75rem; font-weight: 800; color: ${scoreHex}; line-height: 1; }
    .score-max { font-size: 0.7rem; color: #64748b; }
    .score-label { font-size: 2rem; font-weight: 700; color: ${scoreHex}; }
    .score-desc { color: #94a3b8; font-size: 0.875rem; margin-top: 0.25rem; }

    /* Two-col layout for score + summary */
    .top-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 1.5rem; }

    /* Section card */
    .section { background: #1e293b; border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem; }
    .section h2 { font-size: 1rem; font-weight: 600; color: #f8fafc; margin-bottom: 1.25rem; }
    .section-label { font-size: 0.75rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600; margin-bottom: 0.75rem; }

    /* Tables */
    table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
    th { text-align: left; padding: 0.4rem 0.75rem; color: #64748b; font-weight: 500; border-bottom: 1px solid #334155; font-size: 0.75rem; text-transform: uppercase; }
    td { padding: 0.55rem 0.75rem; border-bottom: 1px solid #1e293b; vertical-align: top; }
    tr:last-child td { border-bottom: none; }
    .count { text-align: right; font-weight: 700; font-family: monospace; }
    .good { color: #22c55e; } .warn { color: #f59e0b; } .bad { color: #ef4444; }
    .why-cell { color: #64748b; font-size: 0.8rem; max-width: 340px; }

    /* Duplicate cards */
    .dup-card { background: #0f172a; border: 1px solid #334155; border-radius: 10px; padding: 1.25rem; margin-bottom: 1rem; }
    .dup-card:last-child { margin-bottom: 0; }
    .dup-header { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.75rem; flex-wrap: wrap; }
    .badge { padding: 0.15rem 0.5rem; border-radius: 4px; font-size: 0.7rem; font-weight: 700; color: #fff; }
    .conf { font-size: 0.8rem; margin-left: auto; }
    .comp-list { margin: 0.5rem 0 0.75rem; display: flex; flex-direction: column; gap: 0.35rem; }
    .comp-row { font-family: monospace; font-size: 0.8rem; color: #94a3b8; display: flex; align-items: center; gap: 0.5rem; }
    .kind-badge { font-size: 0.7rem; font-family: sans-serif; font-weight: 600; padding: 0.1rem 0.4rem; border-radius: 4px; white-space: nowrap; }
    .kind-badge.wrapper          { background: #1d4ed820; color: #60a5fa; border: 1px solid #1d4ed8; }
    .kind-badge.standalone       { background: #7f1d1d20; color: #fca5a5; border: 1px solid #7f1d1d; }
    .kind-badge.feature-composed { background: #4c1d9520; color: #a78bfa; border: 1px solid #4c1d95; }
    .dup-reason { font-size: 0.8rem; color: #94a3b8; margin-bottom: 0.5rem; }
    .dup-why { font-size: 0.8rem; color: #64748b; font-style: italic; border-top: 1px solid #1e293b; padding-top: 0.5rem; margin-top: 0.5rem; line-height: 1.5; }
    .dup-excluded { font-size: 0.75rem; font-style: italic; color: #64748b; margin-top: 0.35rem; }
    .kind-legend { display: flex; flex-direction: column; gap: 0.4rem; margin-bottom: 1.25rem; padding: 0.875rem 1rem; background: #0f172a; border-radius: 8px; border: 1px solid #1e293b; }
    .kind-legend-subtitle { font-size: 0.85rem; color: #94a3b8; margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
    .kind-legend-title { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.06em; color: #475569; font-weight: 600; margin-bottom: 0.25rem; }
    .kind-legend-row { display: flex; align-items: baseline; gap: 0.6rem; font-size: 0.8rem; }
    .kind-legend-row .kind-badge { flex-shrink: 0; }
    .kind-legend-row span { color: #64748b; }

    /* Recommendations */
    .rec-list { list-style: none; display: flex; flex-direction: column; gap: 0.75rem; }
    .rec-list li { display: flex; gap: 0.75rem; align-items: flex-start; color: #cbd5e1; font-size: 0.9rem; }
    .rec-num { background: #3b82f6; color: #fff; font-size: 0.75rem; font-weight: 700; width: 1.5rem; height: 1.5rem; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 0.1rem; }
    .empty { color: #475569; font-style: italic; text-align: center; padding: 1.25rem; }
    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
    .col-label { font-size: 0.8rem; font-weight: 600; margin-bottom: 0.75rem; }
    footer { text-align: center; color: #334155; font-size: 0.8rem; margin-top: 3rem; padding-top: 1.5rem; border-top: 1px solid #1e293b; }
    .top-issue { display: flex; align-items: flex-start; gap: 0.5rem; margin-top: 0.75rem; padding: 0.75rem; background: #0f172a; border-radius: 8px; font-size: 0.875rem; }
  </style>
</head>
<body>
<div class="page">
  <header>
    <div>
      <h1>🔍 Design System Audit</h1>
      <div class="meta">${path.resolve(targetDir)} &nbsp;·&nbsp; ${result.scannedFiles} files &nbsp;·&nbsp; ${new Date().toLocaleDateString()}${result.dsDetectionMode === 'driftsense' ? ' &nbsp;·&nbsp; DriftSense discovery' : ''}</div>
    </div>
  </header>

  <div class="score-hero">
    <div class="score-circle">
      <div class="score-inner">
        <div class="score-number">${score}</div>
        <div class="score-max">/100</div>
      </div>
    </div>
    <div>
      <div class="score-label">${label}</div>
      <div class="score-desc">Design System Health Score</div>
    </div>
  </div>

  <div class="top-grid">
    <!-- Audit Summary -->
    <div class="section">
      <h2>📋 Audit Summary</h2>
      <table>
        <tbody>${summaryRows}</tbody>
      </table>
      <div class="top-issue">
        <span style="color:#f59e0b">⚑</span>
        <span style="color:#94a3b8">${summary.topIssue}</span>
      </div>
    </div>

    <!-- Score Breakdown -->
    <div class="section">
      <h2>📊 Score Breakdown</h2>
      <table>
        <thead><tr><th>Dimension</th><th style="text-align:right">Points</th><th style="text-align:right">Lost</th></tr></thead>
        <tbody>${breakdownRows}</tbody>
      </table>
    </div>
  </div>

  <!-- Recommendations -->
  <div class="section">
    <h2>💡 Recommendations</h2>
    ${result.recommendations.length > 0
      ? `<ul class="rec-list">${recItems}</ul>`
      : '<p class="empty">No critical recommendations — design system looks healthy!</p>'}
  </div>

  <!-- Duplicate Components -->
  <div class="section">
    <h2>🔁 Potential Duplicate Components</h2>
    ${result.duplicateFindings.length > 0 ? `
    <div class="kind-legend">
      <div class="kind-legend-subtitle">Components are classified as: <span class="kind-badge standalone">standalone</span> &middot; <span class="kind-badge wrapper">wrapper</span> &middot; <span class="kind-badge feature-composed">feature-composed</span></div>
      <div class="kind-legend-title">Component classification</div>
      <div class="kind-legend-row"><span class="kind-badge standalone">standalone</span><span>Implements UI behavior independently, with no approved DS primitive underneath it.</span></div>
      <div class="kind-legend-row"><span class="kind-badge wrapper">wrapper</span><span>Wraps an approved DS primitive and mainly adds styling or minor behavior.</span></div>
      <div class="kind-legend-row"><span class="kind-badge feature-composed">feature-composed</span><span>Built on DS primitives but represents a product interaction, not a reusable UI element.</span></div>
    </div>
    ${dupRows}` : '<p class="empty">No significant duplicate component families detected.</p>'}
  </div>

  <!-- Style Violations -->
  <div class="section">
    <h2>🎨 Style Overrides &amp; Token Violations</h2>
    <table>
      <thead><tr><th>Check</th><th style="text-align:right">Count</th><th>Why it matters</th></tr></thead>
      <tbody>${styleItems}</tbody>
    </table>
  </div>

  <!-- Import Usage -->
  <div class="section">
    <h2>📦 Import Usage</h2>
    <div class="two-col">
      <div>
        <div class="col-label good">✓ Approved Imports</div>
        ${approvedRows
          ? `<table><thead><tr><th>Source</th><th style="text-align:right">Uses</th></tr></thead><tbody>${approvedRows}</tbody></table>`
          : '<p class="empty">None found</p>'}
      </div>
      <div>
        <div class="col-label warn">⚠ Local UI Imports</div>
        ${localRows
          ? `<table><thead><tr><th>Component</th><th style="text-align:right">Uses</th></tr></thead><tbody>${localRows}</tbody></table>`
          : '<p class="empty">None found</p>'}
      </div>
    </div>
  </div>

  <footer>Generated by ui-drift v0.1</footer>
</div>
</body>
</html>`;

  fs.writeFileSync(outputPath, html, 'utf-8');
}
