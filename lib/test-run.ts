// A rule-based test run of the first pipeline stages (Intake, Screening, DD) for assets saved on the
// device. It needs no API key and no database: it reads only the intake fields and the pasted document
// details, so it can show how a run flows. It does no research, so every finding stays UNVERIFIED,
// and it never stands in for the Claude agents.

import { getStage, getWorkstreamGroup } from '@/lib/pipeline';
import type { StageCode } from '@/lib/pipeline';
import type { AgentFinding, AgentRisk, AgentRunState, MissingDocument } from '@/lib/agents/types';

type Fields = Record<string, string>;

const FIELD_LABELS: [string, string][] = [
  ['name', 'Asset name'],
  ['assetClass', 'Asset class'],
  ['country', 'Country'],
  ['city', 'City'],
  ['address', 'Address / location'],
  ['industry', 'Industry'],
  ['operatingStatus', 'Operating status'],
  ['transactionType', 'Transaction type'],
  ['askingPrice', 'Asking price'],
  ['description', 'Description'],
  ['ownerObjective', 'Owner objective'],
];

const isBlank = (value: string | undefined) => !value || /^\s*(not stated|unknown|n\/a|-)?\s*$/i.test(value);

const MANDATE = /factory|industrial|plant|warehouse|logistics|commercial|office|retail|residential|real estate|hotel|hospitality|apartment|building|land|plot|corporate|company/i;
const RED_FLAGS = /dispute|litigation|lawsuit|court case|seiz|sanction|demolition order|violation|illegal|unlicensed|unlicenced|foreclos|bankrupt/i;
const PLACEHOLDER = /reallygreatsite|123 anywhere|123-456-7890|lorem ipsum|your company name/i;

// The legal and ownership workstreams the DD Agent covers, with words that show the material mentions them.
const DD_CHECKS: [string, RegExp, string, string][] = [
  ['Legal entity / ownership', /\bowner(ship)?\b|owned by|company|entity|commercial regist/i, 'Commercial register extract and proof of ownership', 'Owner / commercial registry'],
  ['Title deeds / land tenure', /title|deed|registered|freehold|leasehold|tenure/i, 'Title deed from the real estate registry (Shahr Aqari)', 'Owner / real estate registry'],
  ['Liens / mortgages / pledges', /mortgag|lien|pledge|encumb|charge/i, 'Encumbrance certificate showing mortgages, liens and pledges', 'Real estate registry / lender'],
  ['Permits / zoning / licenses', /permit|licen[cs]e|zoning|building licen|occupancy/i, 'Building permit, occupancy certificate and zoning approval', 'Owner / local district authority'],
  ['Litigation / disputes', /litigation|dispute|lawsuit|court/i, 'Litigation search against the owner and the property', 'Lawyer / courts'],
  ['Tax / regulatory exposure', /\btax|property tax|regulator|compliance/i, 'Real estate tax receipts and any regulatory notices', 'Owner / tax authority'],
];

const CORE_DOCUMENTS: [string, string, string][] = [
  ['Proof of ownership', 'Establishes who can sell the asset', 'Owner'],
  ['Title deed', 'Confirms legal title and boundaries', 'Owner / real estate registry'],
  ['Latest financial statements or rent roll', 'Needed for any valuation', 'Owner / accountant'],
  ['Permits and licences', 'Confirms the building is legal to use as intended', 'Owner / local authority'],
];

type Section = { heading: string; lines: string[] };

const intakeSummary = (findings: AgentFinding[], missingDocuments: MissingDocument[]) =>
  `Recorded every intake field and ${findings.filter((f) => f.stage === 'INTAKE' && f.workstream !== 'Intake record').length} facts from the pasted details, all unverified. Requested ${missingDocuments.filter((d) => d.stage === 'INTAKE').length} documents.`;

// Splits pasted text into headed sections of bullet points or sentences.
function sections(text: string): Section[] {
  const result: Section[] = [{ heading: 'General', lines: [] }];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || /^\(.*\)$/.test(line)) continue;
    const bullet = line.match(/^[-•*]\s*(.+)$/);
    if (bullet) {
      result[result.length - 1].lines.push(bullet[1]);
    } else if (line === line.toUpperCase() && /[A-Z]/.test(line) && line.length < 90) {
      result.push({ heading: line.replace(/\s*\(.*\)\s*$/, ''), lines: [] });
    } else {
      result[result.length - 1].lines.push(line);
    }
  }
  return result.filter((section) => section.lines.length > 0);
}

const numbers = (line: string) => Array.from(line.matchAll(/(\d[\d,]*(?:\.\d+)?)\s*(?:m²|m2|sqm|square met)/gi), (m) => Number(m[1].replace(/,/g, '')));

// decidedG0 is the CEO's decision when Screening recommended HOLD; the run waits for it before DD.
export function runTestPipeline(
  assetId: string,
  fields: Fields,
  savedAt: string,
  decidedG0?: { decision: 'APPROVED' | 'REJECTED'; decidedBy: string },
): AgentRunState {
  const date = savedAt.slice(0, 10);
  const source = `intake://${assetId}`;
  const details = fields.documentDetails ?? '';
  const allText = [...FIELD_LABELS.map(([key]) => fields[key] ?? ''), details].join('\n');
  const findings: AgentFinding[] = [];
  const risks: AgentRisk[] = [];
  const missingDocuments: MissingDocument[] = [];
  const log: AgentRunState['log'] = [{ at: new Date().toISOString(), message: 'Test run started (rules only, no AI)' }];

  const addFinding = (stage: StageCode, workstream: string, title: string, text: string, value: string | null, confidence: number) =>
    findings.push({
      id: `F-${String(findings.length + 1).padStart(3, '0')}`,
      stage,
      agent: getStage(stage).agent,
      workstream,
      title,
      text,
      value,
      sourceName: 'Owner intake and pasted document details',
      sourceUrl: source,
      date,
      confidence,
      owner: getStage(stage).agent,
      status: 'UNVERIFIED',
      sourceSeen: true,
    });
  const addRisk = (stage: StageCode, workstream: string, title: string, severity: AgentRisk['severity'], description: string, mitigation: string) =>
    risks.push({ id: `R-${String(risks.length + 1).padStart(3, '0')}`, stage, workstream, title, severity, description, mitigation });
  const requestDocument = (stage: StageCode, workstream: string, document: string, reason: string, likelyHolder: string) => {
    if (missingDocuments.some((doc) => doc.document === document)) return;
    missingDocuments.push({ id: `D-${String(missingDocuments.length + 1).padStart(3, '0')}`, stage, workstream, document, reason, likelyHolder });
  };

  // 01 Intake: one finding per field and per fact in the pasted details.
  for (const [key, label] of FIELD_LABELS) {
    const value = fields[key];
    if (isBlank(value)) {
      addFinding('INTAKE', 'Intake record', `${label} not provided`, `The intake record does not state the ${label.toLowerCase()}.`, null, 1);
      if (key !== 'name') requestDocument('INTAKE', 'Intake record', `${label} from the owner`, `Missing from the intake record`, 'Owner');
    } else {
      addFinding('INTAKE', 'Intake record', label, `${label} as stated by the owner.`, value.trim(), 0.6);
    }
  }
  let missingSection: string[] = [];
  for (const section of sections(details)) {
    if (/^NOT IN|MISSING|NOT STATED/i.test(section.heading)) {
      missingSection = section.lines;
      continue;
    }
    for (const line of section.lines) {
      addFinding('INTAKE', section.heading, line.length > 80 ? `${line.slice(0, 77)}…` : line, line, null, 0.5);
    }
  }
  for (const line of missingSection) {
    requestDocument('INTAKE', 'Document details', line, 'The owner material says this is not included', 'Owner');
  }
  for (const [document, reason, holder] of CORE_DOCUMENTS) requestDocument('INTAKE', 'Core documents', document, reason, holder);
  log.push({ at: new Date().toISOString(), stage: 'INTAKE', message: `Intake Agent (test) recorded ${findings.length} findings` });

  // 02 Screening: mandate fit and red flags in the owner's own material.
  const classText = [fields.assetClass, fields.industry, fields.description].join(' ');
  const fitsMandate = MANDATE.test(classText);
  addFinding(
    'SCREEN',
    'Mandate fit',
    fitsMandate ? 'Asset type is within the mandate' : 'Asset type could not be matched to the mandate',
    fitsMandate
      ? 'The asset class and description match the asset types the platform takes on.'
      : 'The asset class and description do not name a factory, property, hospitality, land or corporate asset.',
    fitsMandate ? 'In mandate' : null,
    fitsMandate ? 0.7 : 0.3,
  );

  const redFlagLines = allText.split(/\r?\n/).filter((line) => RED_FLAGS.test(line) && !missingSection.some((missing) => line.includes(missing)));
  for (const line of redFlagLines) {
    addRisk('SCREEN', 'Legal red flags', 'Possible legal red flag in owner material', 'HIGH', line.trim(), 'Ask the owner and a lawyer to explain it before due diligence.');
  }
  if (PLACEHOLDER.test(details)) {
    addRisk(
      'SCREEN',
      'Reputation',
      'Marketing material contains placeholder contact details',
      'MEDIUM',
      'The contact details in the material are template text, so the seller or agent cannot be identified from it.',
      "Get the seller's or agent's real name and contact details before any outreach.",
    );
  }

  // Floors that add up to more than the stated total building area suggest the total is mislabelled.
  const totalLine = details.split(/\r?\n/).find((line) => /total building area/i.test(line));
  const total = Number(totalLine?.match(/(\d[\d,]*(?:\.\d+)?)/)?.[1]?.replace(/,/g, ''));
  const floorAreas = Array.from(
    new Set(
      details
        .split(/\r?\n/)
        .filter((line) => /floor/i.test(line) && /area/i.test(line) && !/total building area/i.test(line))
        .flatMap(numbers),
    ),
  );
  const floorSum = floorAreas.reduce((sum, area) => sum + area, 0);
  if (total > 0 && floorSum > total) {
    addRisk(
      'SCREEN',
      'Data consistency',
      'Area figures do not add up',
      'MEDIUM',
      `The stated total building area (${total}) is less than the floor areas listed added together (${floorAreas.join(' + ')} = ${floorSum} m², before counting repeated floors).`,
      'Confirm the plot area and the built-up area from the building licence or a survey.',
    );
  }
  if (isBlank(fields.askingPrice)) {
    addRisk('SCREEN', 'Commercial', 'No asking price', 'LOW', 'No price was given, so the commercial case cannot be screened yet.', 'Ask the owner for a price expectation.');
  }

  const screenRecommendation = fitsMandate && redFlagLines.length === 0 ? 'APPROVE' : 'HOLD';
  log.push({ at: new Date().toISOString(), stage: 'SCREEN', message: `Screening Agent (test) recommends ${screenRecommendation} on G0` });

  const screenSummary = `${fitsMandate ? 'The asset fits the mandate.' : 'The asset type could not be matched to the mandate.'} ${risks.length} issues found in the owner material. No web research was done in this test run.`;
  const g0Rationale =
    screenRecommendation === 'APPROVE'
      ? 'The asset type fits the mandate and the owner material shows no disqualifying red flag.'
      : 'Hold until the asset type is clear and the possible red flags are explained.';
  const g0Decision =
    screenRecommendation === 'APPROVE'
      ? { decision: 'APPROVED' as const, decidedBy: 'Orchestrator (test run)', decidedAt: new Date().toISOString() }
      : decidedG0
        ? { ...decidedG0, decidedAt: new Date().toISOString() }
        : {};

  // Screening said HOLD and nobody has decided G0 yet, or the CEO rejected it: the run stops here.
  if (screenRecommendation === 'HOLD' && decidedG0?.decision !== 'APPROVED') {
    log.push({
      at: new Date().toISOString(),
      stage: 'SCREEN',
      message: decidedG0 ? `G0 Mandate accepted: rejected by ${decidedG0.decidedBy}` : 'Waiting for the CEO to decide G0 Mandate accepted',
    });
    return {
      assetId,
      status: decidedG0 ? 'STOPPED' : 'AWAITING_APPROVAL',
      currentStage: 'SCREEN',
      stages: {
        INTAKE: { status: 'COMPLETED', summary: intakeSummary(findings, missingDocuments) },
        SCREEN: { status: 'COMPLETED', summary: screenSummary },
      },
      findings,
      risks,
      missingDocuments,
      gates: { G0: { recommendation: screenRecommendation, rationale: g0Rationale, ...g0Decision } },
      log,
      updatedAt: new Date().toISOString(),
    };
  }
  if (decidedG0) log.push({ at: new Date().toISOString(), stage: 'SCREEN', message: `G0 Mandate accepted: approved by ${decidedG0.decidedBy}` });

  // 03 DD: which legal workstreams the material covers. Nothing can be verified without registry searches.
  const workstreams = getWorkstreamGroup('DUE_DILIGENCE').workstreams.slice(0, 6);
  let covered = 0;
  DD_CHECKS.forEach(([name, pattern, document, holder], index) => {
    const mention = details.split(/\r?\n/).find((line) => pattern.test(line) && !missingSection.some((missing) => line.includes(missing)));
    if (mention) {
      covered += 1;
      addFinding('VERIFY', workstreams[index] ?? name, `${name}: mentioned in owner material`, mention.replace(/^[-•*]\s*/, ''), null, 0.3);
    }
    requestDocument('VERIFY', workstreams[index] ?? name, document, `Needed to verify ${name.toLowerCase()}`, holder);
  });
  addRisk(
    'VERIFY',
    'Legal entity / ownership',
    'Ownership and title not verified',
    'HIGH',
    'No registry extract, title deed or ownership document has been provided, so who can sell the asset is unknown.',
    'Obtain the title deed and a registry search before relying on any other work.',
  );
  log.push({ at: new Date().toISOString(), stage: 'VERIFY', message: `DD Agent (test) found ${covered} of ${DD_CHECKS.length} legal workstreams mentioned` });
  log.push({ at: new Date().toISOString(), stage: 'VERIFY', message: 'Waiting for Legal to decide G1 Identity & ownership verified' });

  return {
    assetId,
    status: 'AWAITING_APPROVAL',
    currentStage: 'VERIFY',
    stages: {
      INTAKE: { status: 'COMPLETED', summary: intakeSummary(findings, missingDocuments) },
      SCREEN: { status: 'COMPLETED', summary: screenSummary },
      VERIFY: {
        status: 'COMPLETED',
        summary: `${covered} of ${DD_CHECKS.length} legal workstreams are mentioned in the material, none verified. Ownership and title need registry documents before G1.`,
      },
    },
    findings,
    risks,
    missingDocuments,
    gates: {
      G0: { recommendation: screenRecommendation, rationale: g0Rationale, ...g0Decision },
      G1: {
        recommendation: 'HOLD',
        rationale: 'Ownership, title and encumbrances cannot be confirmed from the owner material alone. Hold until the requested registry documents arrive.',
      },
    },
    log,
    updatedAt: new Date().toISOString(),
  };
}
