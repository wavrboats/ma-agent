// A rule-based test run of the whole pipeline (stages 01–12) for assets saved on the device. It needs no
// API key and no database: it reads only the intake fields and the pasted document details, so it can
// show how a full run flows. It does no research, so every finding stays UNVERIFIED, buyers are buyer
// types plus names that appear in the owner's own material, and it never stands in for the Claude agents.

import { getGate, getStage, getWorkstreamGroup, pipelineStages } from '@/lib/pipeline';
import type { GateCode, StageCode } from '@/lib/pipeline';
import type { AgentFinding, AgentRisk, AgentRunState, GateRecommendation, MissingDocument } from '@/lib/agents/types';
import { buildChecklists } from '@/lib/test-run-checklists';
import type { Checklist, ChecklistInput } from '@/lib/test-run-checklists';

type Fields = Record<string, string>;

export type GateDecision = { decision: 'APPROVED' | 'REJECTED'; decidedBy: string; decidedAt: string };

export type BuyerLead = {
  id: string;
  name: string;
  kind: 'Buyer type' | 'Named lead from owner material';
  fit: number;
  rationale: string;
  approach: string;
};

// What a stage produced besides findings: lists, drafts and plans shown on the result page.
export type StageOutput = { title: string; items: string[] };

export type TestRunState = AgentRunState & {
  buyers: BuyerLead[];
  outputs: Partial<Record<StageCode, StageOutput[]>>;
  outcome?: { headline: string; points: string[] };
  // The workstreams behind each bubble and how far each got.
  checklists: Partial<Record<StageCode, Checklist>>;
};

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
const TECHNICAL = /elevator|lift|utilit|electric|gas\b|water|parking|garage|floor|terrace|finish|staircase|roof|mep|structure|façade|facade|balcon|area/i;
const LOCATION = /minute|walk|drive|near|close to|\bkm\b|metre|meter|\b\d+\s?m away|nile|square|embass|hotel|museum|tower|road|street|corniche|expat|foreigner|neighbo|district/i;
const MONEY = /egp|usd|\$|€|£|price|rent\b|rents|revenue|income|ebitda|profit|cost|occupancy|adr\b|per night|per month|per year|million|thousand/i;

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

// Buyer types and the words in the material that make each one a fit.
const BUYER_TYPES: { name: string; signals: RegExp; approach: string }[] = [
  {
    name: 'Serviced-apartment and hotel-apartment operators',
    signals: /hotel apartment|serviced|hospitality|short.?term|expat|foreigner|prototype/gi,
    approach: 'Sale or long lease of the building with the conversion plan, or a management contract with the owner.',
  },
  {
    name: 'Local residential developers',
    signals: /residential|apartments?\b|floor plans?|plan proposal|conversion|units?\b/gi,
    approach: 'Sale of the building as is, for them to convert and sell units.',
  },
  {
    name: 'High-net-worth individuals and family offices',
    signals: /prestig|luxur|nile view|garden city|heritage|historic/gi,
    approach: 'Whole-building purchase as a prime Cairo holding, through private banks and brokers.',
  },
  {
    name: 'Embassies and international organisations (staff housing)',
    signals: /embass(y|ies)|diplomat\w*|ambassador|consulate/gi,
    approach: 'Purchase or long lease of floors for staff housing; procurement runs through each mission.',
  },
  {
    name: 'Corporate housing providers for expatriates',
    signals: /expat|foreigner|long.?term residency|intermediate|corporate housing/gi,
    approach: 'Master lease of units for relocating staff.',
  },
  {
    name: 'Real estate investment funds (local and regional)',
    signals: /investment|yield|income|tenant|lease|operator|hotel apartment/gi,
    approach: 'Sale with an operator or lease in place; they need rent and cost figures first.',
  },
  {
    name: 'Strategic industrial buyers in the same sector',
    signals: /factory|industrial|plant|production|machinery|capacity/gi,
    approach: 'Sale of the plant to a producer in the same or an adjacent sector.',
  },
  {
    name: 'Office and retail investors',
    signals: /\boffice|retail|commercial|\bshops?\b|\bmall\b|showroom/gi,
    approach: 'Sale or lease of the commercial space.',
  },
];

type Section = { heading: string; lines: string[] };

// An all-caps line, ignoring a trailing note in brackets: "HOTELS NEARBY (shown on the map)".
const isHeading = (line: string) => {
  const core = line.replace(/\s*\(.*\)\s*$/, '');
  return core.length > 0 && core.length < 90 && /[A-Z]/.test(core) && core === core.toUpperCase();
};

// Editorial notes and source lines that do not belong in a teaser.
const NOT_FOR_TEASER = /^source:|^note:|as written|not clear|needs checking/i;

// Splits pasted text into headed sections of bullet points or sentences.
function sections(text: string): Section[] {
  const result: Section[] = [{ heading: 'General', lines: [] }];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || /^\(.*\)$/.test(line)) continue;
    const bullet = line.match(/^[-•*]\s*(.+)$/);
    if (bullet) {
      result[result.length - 1].lines.push(bullet[1]);
    } else if (isHeading(line)) {
      result.push({ heading: line.replace(/\s*\(.*\)\s*$/, ''), lines: [] });
    } else {
      result[result.length - 1].lines.push(line);
    }
  }
  return result.filter((section) => section.lines.length > 0);
}

const areas = (line: string) =>
  Array.from(line.matchAll(/(\d[\d,]*(?:\.\d+)?)\s*(?:m²|m2|sqm|square met)/gi), (m) => Number(m[1].replace(/,/g, '')));
const firstNumber = (line: string | undefined) => Number(line?.match(/(\d[\d,]*(?:\.\d+)?)/)?.[1]?.replace(/,/g, '') ?? NaN);
const fmt = (value: number) => Math.round(value).toLocaleString('en-US');
const shorten = (text: string, max = 80) => (text.length > max ? `${text.slice(0, max - 3)}…` : text);
const isMissingHeading = (heading: string) => /^NOT IN|MISSING|NOT STATED/i.test(heading);

export function runTestPipeline(
  assetId: string,
  fields: Fields,
  savedAt: string,
  decisions: Partial<Record<GateCode, GateDecision>> = {},
): TestRunState {
  const now = () => new Date().toISOString();
  const date = savedAt.slice(0, 10);
  const source = `intake://${assetId}`;
  const details = fields.documentDetails ?? '';
  const detailLines = details.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const allText = [...FIELD_LABELS.map(([key]) => fields[key] ?? ''), details].join('\n');
  const parsed = sections(details);
  const missingSection = parsed.find((section) => isMissingHeading(section.heading))?.lines ?? [];
  const usable = (line: string) => !missingSection.some((missing) => line.includes(missing));
  const factLines = parsed
    .filter((section) => !isMissingHeading(section.heading))
    .flatMap((section) => section.lines.map((line) => ({ heading: section.heading, line })));

  const state: TestRunState = {
    assetId,
    status: 'RUNNING',
    currentStage: 'INTAKE',
    stages: {},
    findings: [],
    risks: [],
    missingDocuments: [],
    gates: {},
    log: [{ at: now(), message: 'Test run started (rules only, no AI)' }],
    buyers: [],
    outputs: {},
    checklists: {},
    updatedAt: now(),
  };
  const checklistInput: ChecklistInput = {
    fields,
    facts: factLines.map(({ line }) => line),
    isTradeAsset: /factory|industrial|plant|production|machinery|manufactur/i.test(allText),
    hasUnitMix: false,
  };

  const addFinding = (stage: StageCode, workstream: string, title: string, text: string, value: string | null, confidence: number) => {
    const finding: AgentFinding = {
      id: `F-${String(state.findings.length + 1).padStart(3, '0')}`,
      stage,
      agent: getStage(stage).agent,
      workstream,
      title: shorten(title),
      text,
      value,
      sourceName: 'Owner intake and pasted document details',
      sourceUrl: source,
      date,
      confidence,
      owner: getStage(stage).agent,
      status: 'UNVERIFIED',
      sourceSeen: true,
    };
    state.findings.push(finding);
  };
  const addRisk = (stage: StageCode, workstream: string, title: string, severity: AgentRisk['severity'], description: string, mitigation: string) =>
    state.risks.push({ id: `R-${String(state.risks.length + 1).padStart(3, '0')}`, stage, workstream, title, severity, description, mitigation });
  const requestDocument = (stage: StageCode, workstream: string, document: string, reason: string, likelyHolder: string) => {
    if (state.missingDocuments.some((doc) => doc.document === document)) return;
    const doc: MissingDocument = { id: `D-${String(state.missingDocuments.length + 1).padStart(3, '0')}`, stage, workstream, document, reason, likelyHolder };
    state.missingDocuments.push(doc);
  };
  const output = (stage: StageCode, title: string, items: string[]) => {
    if (items.length > 0) (state.outputs[stage] ??= []).push({ title, items });
  };
  const complete = (stage: StageCode, summary: string) => {
    state.currentStage = stage;
    state.stages[stage] = { status: 'COMPLETED', summary };
    state.log.push({ at: now(), stage, message: `${getStage(stage).agent} (test) finished` });
  };

  // Records the gate recommendation; returns true when the run may continue past it. A gate without a
  // human approver passes on APPROVE; every other gate waits for a decision.
  const passGate = (code: GateCode, recommendation: GateRecommendation, rationale: string): boolean => {
    const gate = getGate(code);
    const decided = decisions[code];
    if (!gate.humanApproval && recommendation === 'APPROVE') {
      state.gates[code] = { recommendation, rationale, decision: 'APPROVED', decidedBy: 'Orchestrator (test run)', decidedAt: now() };
      state.log.push({ at: now(), stage: gate.afterStage, message: `${code} ${gate.title}: approved by the orchestrator` });
      return true;
    }
    if (!decided) {
      state.gates[code] = { recommendation, rationale };
      state.status = 'AWAITING_APPROVAL';
      state.log.push({ at: now(), stage: gate.afterStage, message: `Waiting for ${gate.approverRole} to decide ${code} ${gate.title}` });
      return false;
    }
    state.gates[code] = { recommendation, rationale, ...decided };
    const against = decided.decision === 'APPROVED' && recommendation !== 'APPROVE' ? ` (against a ${recommendation} recommendation)` : '';
    state.log.push({ at: decided.decidedAt, stage: gate.afterStage, message: `${code} ${gate.title}: ${decided.decision.toLowerCase()} by ${decided.decidedBy}${against}` });
    if (decided.decision === 'REJECTED') {
      state.status = 'STOPPED';
      return false;
    }
    return true;
  };

  // ---------- 01 INTAKE ----------
  for (const [key, label] of FIELD_LABELS) {
    const value = fields[key];
    if (isBlank(value)) {
      addFinding('INTAKE', 'Intake record', `${label} not provided`, `The intake record does not state the ${label.toLowerCase()}.`, null, 1);
      if (key !== 'name') requestDocument('INTAKE', 'Intake record', `${label} from the owner`, 'Missing from the intake record', 'Owner');
    } else {
      addFinding('INTAKE', 'Intake record', label, `${label} as stated by the owner.`, value.trim(), 0.6);
    }
  }
  for (const { heading, line } of factLines) addFinding('INTAKE', heading, line, line, null, 0.5);
  for (const line of missingSection) requestDocument('INTAKE', 'Document details', line, 'The owner material says this is not included', 'Owner');
  for (const [document, reason, holder] of CORE_DOCUMENTS) requestDocument('INTAKE', 'Core documents', document, reason, holder);
  complete('INTAKE', `Recorded every intake field and ${factLines.length} facts from the pasted details, all unverified. Requested ${state.missingDocuments.length} documents.`);

  // ---------- 02 SCREEN ----------
  const fitsMandate = MANDATE.test([fields.assetClass, fields.industry, fields.description, details].join(' '));
  addFinding(
    'SCREEN',
    'Mandate fit',
    fitsMandate ? 'Asset type is within the mandate' : 'Asset type could not be matched to the mandate',
    fitsMandate ? 'The asset matches the asset types the platform takes on.' : 'The material does not name a factory, property, hospitality, land or corporate asset.',
    fitsMandate ? 'In mandate' : null,
    fitsMandate ? 0.7 : 0.3,
  );
  const redFlagLines = allText.split(/\r?\n/).filter((line) => RED_FLAGS.test(line) && usable(line));
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

  // Floor areas: the stated total, each floor's area and how many typical floors there are.
  const total = firstNumber(detailLines.find((line) => /total building area/i.test(line)));
  const floorArea = (pattern: RegExp) => areas(detailLines.find((line) => pattern.test(line) && /area/i.test(line)) ?? '')[0] ?? 0;
  const ground = floorArea(/ground floor/i);
  const mezzanine = floorArea(/mezzanine/i);
  const typical = floorArea(/typical floor/i);
  const typicalCount = Number(details.match(/(\d+)\s+typical floors/i)?.[1] ?? 0);
  const listedFloors = [ground, mezzanine, typical].filter((value) => value > 0);
  const builtUp = ground + mezzanine + (typicalCount > 0 ? typical * typicalCount : typical);
  if (total > 0 && builtUp > total) {
    addRisk(
      'SCREEN',
      'Data consistency',
      'Area figures do not add up',
      'MEDIUM',
      `The stated total building area (${fmt(total)}) is less than the floors added together (${listedFloors.map(fmt).join(' + ')}${typicalCount ? `, with ${typicalCount} typical floors` : ''} = about ${fmt(builtUp)} m²).`,
      'Confirm the plot area and the built-up area from the building licence or a survey.',
    );
  }
  if (isBlank(fields.askingPrice)) {
    addRisk('SCREEN', 'Commercial', 'No asking price', 'LOW', 'No price was given, so the commercial case cannot be screened yet.', 'Ask the owner for a price expectation.');
  }
  const screenRecommendation: GateRecommendation = fitsMandate && redFlagLines.length === 0 ? 'APPROVE' : 'HOLD';
  complete('SCREEN', `${fitsMandate ? 'The asset fits the mandate.' : 'The asset type could not be matched to the mandate.'} ${state.risks.length} issues found in the owner material. No web research was done in this test run.`);
  const g0Rationale =
    screenRecommendation === 'APPROVE'
      ? 'The asset type fits the mandate and the owner material shows no disqualifying red flag.'
      : 'Hold until the asset type is clear and the possible red flags are explained.';
  if (!passGate('G0', screenRecommendation, g0Rationale)) return finish(state, checklistInput);

  // ---------- 03 VERIFY ----------
  const ddWorkstreams = getWorkstreamGroup('DUE_DILIGENCE').workstreams.slice(0, 6);
  let covered = 0;
  DD_CHECKS.forEach(([name, pattern, document, holder], index) => {
    const mention = detailLines.find((line) => pattern.test(line) && usable(line));
    if (mention) {
      covered += 1;
      addFinding('VERIFY', ddWorkstreams[index] ?? name, `${name}: mentioned in owner material`, mention.replace(/^[-•*]\s*/, ''), null, 0.3);
    }
    requestDocument('VERIFY', ddWorkstreams[index] ?? name, document, `Needed to verify ${name.toLowerCase()}`, holder);
  });
  addRisk(
    'VERIFY',
    'Legal entity / ownership',
    'Ownership and title not verified',
    'HIGH',
    'No registry extract, title deed or ownership document has been provided, so who can sell the asset is unknown.',
    'Obtain the title deed and a registry search before relying on any other work.',
  );
  complete(
    'VERIFY',
    `${covered === 0 ? 'None of the legal and ownership checks is covered by the material' : `${covered} of ${DD_CHECKS.length} legal checks are mentioned in the material, none verified`}. Ownership and title need registry documents.`,
  );
  if (!passGate('G1', 'HOLD', 'Ownership, title and encumbrances cannot be confirmed from the owner material alone. Hold until the requested registry documents arrive.')) {
    return finish(state, checklistInput);
  }

  // ---------- 04 ASSESS ----------
  const technical = factLines.filter(({ heading, line }) => heading !== 'General' && TECHNICAL.test(line) && !LOCATION.test(line) && usable(line));
  for (const { heading, line } of technical) addFinding('ASSESS', heading, line, line, null, 0.5);
  if (builtUp > 0) {
    addFinding(
      'ASSESS',
      'Capacity / areas',
      'Built-up area estimated from the floor areas',
      `${listedFloors.map(fmt).join(' + ')}${typicalCount ? ` with ${typicalCount} typical floors` : ''} gives about ${fmt(builtUp)} m² built up, excluding the roof and parking.`,
      `${fmt(builtUp)} m²`,
      0.4,
    );
  }
  requestDocument('ASSESS', 'Site visit / independent verification', 'Site inspection and structural survey', 'Condition, age and safety are unknown without a visit', 'Engineer');
  requestDocument('ASSESS', 'Utilities / infrastructure', 'Condition report on electrical, gas, water and elevators (MEP)', 'Utilities are claimed but not inspected', 'Engineer / utility companies');
  requestDocument('ASSESS', 'Environmental / wastewater', 'Environmental and fire-safety compliance certificates', 'No ESG or safety information in the material', 'Owner / civil defence');
  if (!/built in|construction year|year built|\b(19|20)\d{2}\b/i.test(details)) {
    addRisk('ASSESS', 'Machinery / condition / age', 'Building age and condition unknown', 'MEDIUM', 'The material gives no construction year or condition report.', 'Get the construction year from the licence and commission a structural survey.');
  }
  output('ASSESS', 'Technical facts claimed in the material', technical.map(({ line }) => line));
  complete('ASSESS', `${technical.length} technical facts recorded from the material${builtUp ? `; built-up area about ${fmt(builtUp)} m²` : ''}. Condition, age and safety need a site inspection.`);

  // ---------- 05 MARKET ----------
  // Location sections count whole, so names without a location word (a hotel's name) are kept.
  const demand = factLines.filter(
    ({ heading, line }) => heading !== 'General' && (LOCATION.test(line) || /LOCATION|SITE ANALYSIS|HOTEL|EMBASS|ACCESS|LANDMARK|EXPAT|FOREIGN/.test(heading)) && usable(line),
  );
  for (const { heading, line } of demand) addFinding('MARKET', heading, line, line, null, 0.5);
  requestDocument('MARKET', 'Local selling prices / quotes', 'Recent sale prices per m² for comparable buildings in the area', 'Needed to size the market and value the asset', 'Brokers / research');
  requestDocument('MARKET', 'Market growth / scenarios', 'Rents and occupancy for serviced and furnished apartments nearby', 'Needed for an income-based case', 'Operators / brokers');
  output('MARKET', 'Market data still needed', ['Comparable sale prices per m²', 'Furnished and serviced-apartment rents and occupancy', 'New supply planned nearby', 'Demand from embassies, expats and visitors']);
  complete('MARKET', `${demand.length} location and demand facts recorded. No market prices, rents or occupancy figures were provided, so the market is not sized.`);

  // ---------- 06 MODEL ----------
  const moneyLines = factLines.filter(({ line }) => MONEY.test(line) && usable(line));
  for (const { line } of moneyLines) addFinding('MODEL', 'Historical financial reconstruction', line, line, null, 0.4);
  if (moneyLines.length === 0) {
    addFinding('MODEL', 'Historical financial reconstruction', 'No financial figures provided', 'The material has no revenue, rent, cost or price figures.', null, 1);
  }
  requestDocument('MODEL', 'Historical financial reconstruction', 'Rent roll or income statement for the last 3 years', 'Needed to model income', 'Owner / accountant');
  requestDocument('MODEL', 'Working capital / debt bridge', 'Operating costs, service charges and any debt on the asset', 'Needed for the cash-flow and debt bridge', 'Owner');
  requestDocument('MODEL', 'Restart capex / repair budget', 'Conversion or refurbishment budget for the proposed plan', 'Needed to model the conversion case', 'Engineer / contractor');
  complete(
    'MODEL',
    moneyLines.length > 0
      ? `${moneyLines.length} financial figures found; not enough for a full model.`
      : 'No financial figures were provided, so nothing can be modelled yet. Unknown is not zero: no figure has been assumed.',
  );
  if (!passGate('G2', 'HOLD', 'Commercial viability cannot be shown without income, cost and market figures. Hold until the rent roll and market data arrive.')) {
    return finish(state, checklistInput);
  }

  // ---------- 07 VALUE ----------
  const proposal = parsed.find((section) => /PROPOSAL|UNIT MIX/i.test(section.heading));
  const unitSizes = proposal
    ? proposal.lines.flatMap((line) => Array.from(line.matchAll(/\b(\d{2,3})\b/g), (m) => Number(m[1]))).filter((size) => size >= 20 && size <= 400)
    : [];
  checklistInput.hasUnitMix = unitSizes.length > 0;
  const valueItems: string[] = [];
  if (builtUp > 0) valueItems.push(`Built-up area: about ${fmt(builtUp)} m² (from the owner's floor areas, unverified).`);
  if (unitSizes.length > 0) {
    const perFloor = unitSizes.reduce((sum, size) => sum + size, 0);
    const mix = `Proposed unit mix per typical floor: ${unitSizes.length} sized units (${unitSizes.join(', ')} m²), about ${fmt(perFloor)} m² saleable.`;
    const across = typicalCount ? `Across ${typicalCount} typical floors: about ${unitSizes.length * typicalCount} units and ${fmt(perFloor * typicalCount)} m² saleable.` : '';
    valueItems.push(mix, ...(across ? [across] : []));
    addFinding('VALUE', 'Production + price scenarios', 'Proposed unit mix', [mix, across].filter(Boolean).join(' '), `${unitSizes.length} units per floor`, 0.4);
  }
  valueItems.push('Value: unknown. No price per m², rent or occupancy was provided, so no figure is given.');
  output('VALUE', 'What can be measured now', valueItems);
  output('VALUE', 'Valuation methods to use once data arrives', [
    'Comparable sales: price per m² of similar nearby buildings × built-up area.',
    'Income approach: units × nightly or monthly rate × occupancy, less operating costs, capitalised.',
    'Conversion (residual) approach: value of the converted units less conversion cost and developer margin.',
    'Downside: land value of the plot.',
  ]);
  requestDocument('VALUE', 'Land + machinery appraisal', 'Independent valuation by a licensed appraiser', 'A valuation must be signed off before G3', 'Licensed appraiser');
  complete('VALUE', 'Areas and the proposed unit mix are measured; no value can be given without price or rent data.');
  if (!passGate('G3', 'HOLD', 'There is no valuation to approve: price, rent and cost inputs are missing. Hold until an appraiser or the market data provides them.')) {
    return finish(state, checklistInput);
  }

  // ---------- 08 STRATEGY ----------
  const hasConversion = /hotel apartment|plan proposal|conversion|prototype/i.test(details);
  const nearEmbassies = /embass|diplomat/i.test(details);
  const strategies = [
    'Sell the building as is: fastest, but the price reflects the buyer doing the conversion.',
    ...(hasConversion
      ? [
          'Partner with a serviced-apartment operator to convert to hotel apartments, then sell or keep for income (the plan in the material).',
          'Convert and sell units individually: highest gross value, longest timeline and most execution risk.',
        ]
      : []),
    ...(nearEmbassies ? ['Long lease of floors to embassies or international organisations for staff housing.'] : []),
    'Joint venture: the owner contributes the building, a partner funds the conversion, profits are shared.',
  ];
  const recommended = hasConversion
    ? 'Approach serviced-apartment operators and developers with the conversion plan, while keeping a sale-as-is option open.'
    : 'Market the building for sale as is to the buyer types below.';
  output('STRATEGY', 'Exit options', strategies);
  output('STRATEGY', 'Recommendation', [recommended, 'This depends on G1–G3: ownership, viability and value are still open.']);
  addFinding('STRATEGY', 'Exit / reposition / JV', 'Recommended route', recommended, null, 0.4);
  complete('STRATEGY', recommended);

  // ---------- 09 BUYERS ----------
  const types = BUYER_TYPES.map((type) => ({ ...type, hits: Array.from(new Set((allText.match(type.signals) ?? []).map((hit) => hit.toLowerCase()))) }))
    .filter((type) => type.hits.length > 0)
    .sort((a, b) => b.hits.length - a.hits.length);
  const addBuyer = (buyer: Omit<BuyerLead, 'id'>) => state.buyers.push({ id: `B-${String(state.buyers.length + 1).padStart(2, '0')}`, ...buyer });
  for (const type of types) {
    addBuyer({ name: type.name, kind: 'Buyer type', fit: Math.min(5, type.hits.length), rationale: `Matches in the material: ${type.hits.slice(0, 5).join(', ')}.`, approach: type.approach });
  }
  const leadsUnder = (pattern: RegExp) => parsed.filter((section) => pattern.test(section.heading)).flatMap((section) => section.lines);
  const hotelLeads = leadsUnder(/HOTEL/i);
  const embassyLeads = leadsUnder(/EMBASS/i);
  for (const name of hotelLeads) {
    addBuyer({
      name,
      kind: 'Named lead from owner material',
      fit: 3,
      rationale: 'A hotel the material lists near the building. A nearby operator may want serviced apartments or extra rooms; not verified.',
      approach: "Contact the owner or operator's development team after G4, under an NDA.",
    });
  }
  for (const name of embassyLeads) {
    addBuyer({
      name,
      kind: 'Named lead from owner material',
      fit: 2,
      rationale: 'A mission the material lists near the building. It may need staff housing; not verified.',
      approach: "Contact the mission's administration or facilities office after G4.",
    });
  }
  output('BUYERS', 'How the list was made', [
    'Buyer types are ranked by how many facts in the material point to them.',
    'Named leads are only names that appear in the owner material. No company was researched or contacted.',
    'The real Buyer Agent will research actual buyers, their ability to pay and their decision makers.',
  ]);
  complete('BUYERS', `${types.length} buyer types and ${hotelLeads.length + embassyLeads.length} named leads from the material. None verified or contacted.`);
  const g4Recommendation: GateRecommendation = state.buyers.length > 0 ? 'APPROVE' : 'HOLD';
  const g4Rationale =
    state.buyers.length > 0
      ? 'The shortlist is ready for review. Approving lets outreach be planned; nobody is contacted in a test run.'
      : 'No buyer types could be matched from the material.';
  if (!passGate('G4', g4Recommendation, g4Rationale)) return finish(state, checklistInput);

  // ---------- 10 MATERIALS ----------
  const highlights = [...demand.slice(0, 4), ...technical.slice(0, 6)]
    .map(({ line }) => line)
    .filter((line) => !NOT_FOR_TEASER.test(line) && !/total building area/i.test(line))
    .slice(0, 8);
  output('MATERIALS', 'Teaser (draft, anonymous)', [
    `${fields.assetClass || 'Property'} in ${[fields.city, fields.country].filter(Boolean).join(', ') || 'a prime location'}${builtUp ? `, about ${fmt(builtUp)} m² built up` : ''}.`,
    ...highlights,
    'Every fact above comes from the owner and is subject to due diligence.',
  ]);
  output('MATERIALS', 'Information memorandum (CIM) outline', [
    'Executive summary and investment highlights',
    'Location and access',
    'Building, floor plans and technical condition',
    hasConversion ? 'Conversion plan and unit mix' : 'Current use and options',
    'Market and demand',
    'Financial information (pending)',
    'Legal status and title (pending)',
    'Process and contacts',
  ]);
  output('MATERIALS', 'Data room index', ['Provided: owner presentation, pasted details and attachments', ...state.missingDocuments.map((doc) => `Missing: ${doc.document}`)]);
  complete('MATERIALS', 'Teaser draft, CIM outline and data room index prepared. The teaser leaves out the name and uses only owner-provided facts.');

  // ---------- 11 OUTREACH ----------
  output(
    'OUTREACH',
    'Outreach plan (nobody is contacted in a test run)',
    state.buyers.slice(0, 8).map((buyer, index) => `${index + 1}. ${buyer.name}: teaser, then NDA, then CIM. ${buyer.approach}`),
  );
  output('OUTREACH', 'Tracking stages', ['Contacted', 'NDA signed', 'CIM sent', 'Site visit', 'Indicative offer']);
  complete('OUTREACH', `Outreach planned for ${Math.min(8, state.buyers.length)} buyers in priority order. No contact is made in a test run.`);

  // ---------- 12 EXECUTE ----------
  output('EXECUTE', 'Closing checklist', [
    'Indicative offers (IOIs) received and compared',
    'Letter of intent and exclusivity agreed',
    'Confirmatory due diligence by the buyer',
    'Sale and purchase agreement (SPA) negotiated',
    'Approvals: owner, lenders, authorities',
    'Payment and registration of the transfer',
    'Handover',
  ]);
  complete('EXECUTE', 'Closing steps listed. No offers exist in a test run, so there are no terms to approve.');
  if (!passGate('G5', 'HOLD', 'There are no binding terms to approve: no offers have been received.')) return finish(state, checklistInput);

  state.status = 'STOPPED';
  state.log.push({ at: now(), stage: 'EXECUTE', message: 'Test run complete' });
  return finish(state, checklistInput);
}

// Adds the end-of-run outcome summary.
function finish(state: TestRunState, checklistInput: ChecklistInput): TestRunState {
  const highRisks = state.risks.filter((risk) => risk.severity === 'HIGH' || risk.severity === 'CRITICAL');
  const reached = pipelineStages.filter((stage) => state.stages[stage.code]?.status === 'COMPLETED').length;
  const typeNames = state.buyers.filter((buyer) => buyer.kind === 'Buyer type').slice(0, 3).map((buyer) => buyer.name);
  const named = state.buyers.filter((buyer) => buyer.kind === 'Named lead from owner material').length;
  const strategy = state.outputs.STRATEGY?.find((item) => item.title === 'Recommendation')?.items[0];
  const complete = reached === pipelineStages.length && state.gates.G5?.decision === 'APPROVED';
  state.outcome = {
    headline: complete
      ? 'All 12 stages ran. The buyer list and plan are ready; ownership, value and terms are still unverified.'
      : `${reached} of ${pipelineStages.length} stages ran. ${state.status === 'AWAITING_APPROVAL' ? 'Waiting for a gate decision to continue.' : 'The run stopped.'}`,
    points: [
      ...(typeNames.length > 0 ? [`Most likely buyers: ${typeNames.join('; ')}.`] : []),
      ...(named > 0 ? [`${named} named leads taken from the owner material (nearby hotels and embassies).`] : []),
      ...(strategy ? [`Strategy: ${strategy}`] : []),
      `${highRisks.length} high risks and ${state.missingDocuments.length} missing documents.`,
      'Value: unknown until price, rent or cost data is provided.',
    ],
  };
  state.checklists = buildChecklists(state, checklistInput);
  state.updatedAt = new Date().toISOString();
  return state;
}
