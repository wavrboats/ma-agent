// The workstream checklist behind each bubble of the test run: every workstream of the stage's group
// (for example the 15 due diligence workstreams) with what the test run could say about it.

import { getWorkstreamGroup, pipelineStages } from '@/lib/pipeline';
import type { StageCode, WorkstreamGroupId } from '@/lib/pipeline';
import type { AgentRunState } from '@/lib/agents/types';

export type ChecklistStatus = 'covered' | 'produced' | 'needs-data' | 'not-applicable' | 'not-reached';

export type ChecklistItem = {
  number: number;
  name: string;
  // The agent whose stage owns this workstream.
  stage: StageCode;
  status: ChecklistStatus;
  note: string;
};

export type Checklist = { title: string; items: ChecklistItem[] };

type Rule = {
  // Owning stage within the group.
  stage: StageCode;
  // Words in the owner's material that cover the workstream.
  evidence?: RegExp;
  // The test run itself produces this workstream's output once its stage has run.
  produced?: string;
  // Only relevant to factories and traded goods.
  tradeOnly?: boolean;
  // What is needed when nothing covers it.
  needs: string;
};

const GROUP_RULES: Record<WorkstreamGroupId, Rule[]> = {
  DUE_DILIGENCE: [
    { stage: 'VERIFY', evidence: /\bowner(ship)?\b|owned by|commercial regist/i, needs: 'Commercial register extract and proof of ownership' },
    { stage: 'VERIFY', evidence: /title|deed|tenure|freehold|leasehold/i, needs: 'Title deed from the real estate registry' },
    { stage: 'VERIFY', evidence: /mortgag|lien|pledge|encumb/i, needs: 'Encumbrance certificate' },
    { stage: 'VERIFY', evidence: /permit|licen[cs]e|zoning/i, needs: 'Building permit and occupancy certificate' },
    { stage: 'VERIFY', evidence: /litigation|dispute|lawsuit|court/i, needs: 'Litigation search' },
    { stage: 'VERIFY', evidence: /\btax\b|regulator/i, needs: 'Property tax receipts' },
    { stage: 'VERIFY', evidence: /financial statement|balance sheet|\bdebt\b|loan/i, needs: 'Financial statements and debt schedule' },
    { stage: 'VERIFY', evidence: /revenue|tenant|lease agreement|contract|rent roll/i, needs: 'Leases or customer contracts' },
    { stage: 'ASSESS', evidence: /condition|year built|construction year|finish|staircase|machinery/i, needs: 'Construction year and a condition survey' },
    { stage: 'ASSESS', evidence: /floor area|area of|typical floors|\d+\s*units|capacity|occupancy/i, needs: 'Floor areas and current use' },
    { stage: 'ASSESS', evidence: /electric|\bgas\b|water|utilit|elevator/i, needs: 'Utility and elevator condition report' },
    { stage: 'ASSESS', evidence: /environment|wastewater|sewage|\besg\b/i, needs: 'Environmental compliance certificate' },
    { stage: 'ASSESS', evidence: /\bstaff\b|employee|workforce|labou?r/i, needs: 'Staff list and employment liabilities' },
    { stage: 'ASSESS', evidence: /insurance|fire|safety|civil defen/i, needs: 'Insurance policy and fire-safety certificate' },
    { stage: 'ASSESS', evidence: /site visit|inspection|survey/i, needs: 'Site inspection by an engineer' },
  ],
  MARKET_RESEARCH: [
    { stage: 'MARKET', evidence: /hs code|market definition|segment/i, tradeOnly: true, needs: 'HS codes for the products' },
    { stage: 'MARKET', evidence: /natural|synthetic/i, tradeOnly: true, needs: 'Product segment split' },
    { stage: 'MARKET', evidence: /wet blue|crust|raw hide/i, tradeOnly: true, needs: 'Product stage split' },
    { stage: 'MARKET', evidence: /end.?use|residential and diplomatic|hospitality|hotel apartment/i, needs: 'End users of the asset' },
    { stage: 'MARKET', evidence: /\btam\b|market size/i, needs: 'Local market size' },
    { stage: 'MARKET', evidence: /global market/i, needs: 'Global market trends' },
    { stage: 'MARKET', evidence: /\bdemand\b/i, needs: 'Demand volume and value' },
    { stage: 'MARKET', evidence: /supply|new development|capacity/i, needs: 'Existing and planned supply' },
    { stage: 'MARKET', evidence: /import/i, tradeOnly: true, needs: 'Import statistics' },
    { stage: 'MARKET', evidence: /export/i, tradeOnly: true, needs: 'Export statistics' },
    { stage: 'MARKET', evidence: /supplier/i, tradeOnly: true, needs: 'Import suppliers' },
    { stage: 'MARKET', evidence: /export destination/i, tradeOnly: true, needs: 'Export destinations' },
    { stage: 'MARKET', evidence: /unit value/i, tradeOnly: true, needs: 'Unit values by HS code' },
    { stage: 'MARKET', evidence: /\bprice|egp|per m²|per m2/i, needs: 'Local sale prices and rents' },
    { stage: 'MARKET', evidence: /benchmark/i, tradeOnly: true, needs: 'Global benchmark prices' },
    { stage: 'MARKET', evidence: /freight|tariff/i, tradeOnly: true, needs: 'Freight and tariffs' },
    { stage: 'MARKET', evidence: /trade agreement/i, tradeOnly: true, needs: 'Trade agreements' },
    { stage: 'MARKET', evidence: /\bcosts?\b|service charge/i, needs: 'Operating and utility costs' },
    { stage: 'MARKET', evidence: /zamalek|maadi|dokki|district|neighbo|cluster|garden city/i, needs: 'Comparable locations' },
    { stage: 'MARKET', evidence: /competitor|hotel|four seasons|kempinski|intercontinental/i, needs: 'Competing properties' },
    { stage: 'MARKET', evidence: /\brooms\b|competitor capacity/i, needs: 'Competitor capacity' },
    { stage: 'MARKET', evidence: /market share/i, needs: 'Verified market shares' },
    { stage: 'MARKET', evidence: /expat|foreigner|embass|diplomat|tourist/i, needs: 'Target occupiers' },
    { stage: 'MARKET', evidence: /short.?term|long.?term|residency|procure/i, needs: 'How occupiers rent or buy' },
    { stage: 'MARKET', evidence: /certif|specification/i, tradeOnly: true, needs: 'Technical specs and certifications' },
    { stage: 'MARKET', evidence: /growth|trend/i, needs: 'Market growth' },
    { stage: 'MARKET', evidence: /substitut|threat/i, needs: 'Substitutes and threats' },
    { stage: 'MARKET', evidence: /regulat|heritage|zoning/i, needs: 'Regulatory constraints' },
    { stage: 'MARKET', evidence: /minute|drive|walk|road|street|corniche|square/i, needs: 'Access and transport' },
    { stage: 'MARKET', evidence: /white space|opportunit|\bgap\b/i, needs: 'Gaps in the market' },
  ],
  ECONOMICS_VALUE_EXIT: [
    { stage: 'MODEL', evidence: /egp|usd|revenue|income|\brent\b|occupancy/i, needs: 'Rent roll or income statement' },
    { stage: 'MODEL', evidence: /ebitda|profit/i, needs: 'Profit figures' },
    { stage: 'MODEL', evidence: /\bdebt\b|working capital/i, needs: 'Debt and working capital' },
    { stage: 'MODEL', evidence: /capex|refurb|budget|conversion cost/i, needs: 'Conversion or repair budget' },
    { stage: 'MODEL', evidence: /per night|\badr\b|rent per|per unit/i, needs: 'Rates per unit' },
    { stage: 'VALUE', produced: 'Unit mix and built-up area measured from your material', needs: 'Unit mix and pricing' },
    { stage: 'VALUE', needs: 'Cash-flow figures for a DCF' },
    { stage: 'VALUE', evidence: /comparable|sold for|transaction/i, needs: 'Comparable sales' },
    { stage: 'VALUE', evidence: /apprais|valuation|land value/i, needs: 'Independent appraisal' },
    { stage: 'VALUE', needs: 'Land value for the downside case' },
    { stage: 'STRATEGY', needs: 'Cost of building a comparable asset' },
    { stage: 'STRATEGY', needs: 'Buyer savings from buying instead of building' },
    { stage: 'STRATEGY', produced: 'Sale options listed; legal structure still unknown', needs: 'Legal structure of the owner' },
    { stage: 'STRATEGY', produced: 'Exit options compared, including JV and lease', needs: 'Exit options' },
    { stage: 'STRATEGY', needs: 'A price range for management to approve' },
  ],
  BUYER_TO_CLOSING: [
    { stage: 'BUYERS', produced: 'Buyer types ranked from your material', needs: 'Buyer universe' },
    { stage: 'BUYERS', produced: 'Buyers split into types', needs: 'Buyer types' },
    { stage: 'BUYERS', tradeOnly: true, needs: 'Import dependence of buyers' },
    { stage: 'BUYERS', produced: 'An approach written for each buyer type', needs: 'Fit with each buyer' },
    { stage: 'BUYERS', tradeOnly: true, needs: "Buyers' production sites" },
    { stage: 'BUYERS', needs: "Research on each buyer's ability to pay" },
    { stage: 'BUYERS', needs: "Research on each buyer's past deals" },
    { stage: 'BUYERS', produced: 'Ranked by the facts that point to each buyer', needs: 'Ranking' },
    { stage: 'BUYERS', needs: 'Names of decision makers (research)' },
    { stage: 'MATERIALS', produced: 'Teaser draft and CIM outline prepared', needs: 'Teaser and CIM' },
    { stage: 'MATERIALS', produced: 'Data room index prepared', needs: 'Data room' },
    { stage: 'OUTREACH', produced: 'Outreach plan and tracking stages prepared', needs: 'Outreach plan' },
    { stage: 'EXECUTE', needs: 'Indicative offers from buyers' },
    { stage: 'EXECUTE', needs: 'A letter of intent' },
    { stage: 'EXECUTE', produced: 'Closing checklist prepared; no terms yet', needs: 'Closing checklist' },
  ],
};

const STAGE_GROUP: Partial<Record<StageCode, WorkstreamGroupId>> = {
  VERIFY: 'DUE_DILIGENCE',
  ASSESS: 'DUE_DILIGENCE',
  MARKET: 'MARKET_RESEARCH',
  MODEL: 'ECONOMICS_VALUE_EXIT',
  VALUE: 'ECONOMICS_VALUE_EXIT',
  STRATEGY: 'ECONOMICS_VALUE_EXIT',
  BUYERS: 'BUYER_TO_CLOSING',
  MATERIALS: 'BUYER_TO_CLOSING',
  OUTREACH: 'BUYER_TO_CLOSING',
  EXECUTE: 'BUYER_TO_CLOSING',
};

export type ChecklistInput = {
  fields: Record<string, string>;
  // Fact lines from the pasted details, excluding the "not included" section.
  facts: string[];
  isTradeAsset: boolean;
  hasUnitMix: boolean;
};

const isBlank = (value: string | undefined) => !value || /^\s*(not stated|unknown|n\/a|-)?\s*$/i.test(value);

export function buildChecklists(state: AgentRunState, input: ChecklistInput): Partial<Record<StageCode, Checklist>> {
  const ran = (stage: StageCode) => state.stages[stage]?.status === 'COMPLETED';
  const result: Partial<Record<StageCode, Checklist>> = {};

  // Intake: the fields of the intake record.
  const fieldNames: [string, string][] = [
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
    ['documentDetails', 'Document details'],
  ];
  result.INTAKE = {
    title: `Intake record: ${fieldNames.length} items`,
    items: fieldNames.map(([key, name], index) => ({
      number: index + 1,
      name,
      stage: 'INTAKE',
      status: !ran('INTAKE') ? 'not-reached' : isBlank(input.fields[key]) ? 'needs-data' : 'covered',
      note: isBlank(input.fields[key]) ? 'Not provided' : key === 'documentDetails' ? `${input.facts.length} facts` : input.fields[key].slice(0, 80),
    })),
  };

  // Screening: the checks the Screening Agent ran and what they found.
  const risk = (title: RegExp) => state.risks.find((item) => item.stage === 'SCREEN' && title.test(item.title));
  const screenChecks: [string, ChecklistStatus, string][] = [
    ['Mandate fit', state.findings.some((f) => f.stage === 'SCREEN' && f.value === 'In mandate') ? 'covered' : 'needs-data', 'Asset type checked against the mandate'],
    ['Legal red flags', risk(/red flag/i) ? 'needs-data' : 'covered', risk(/red flag/i) ? 'Red flag found; see risks' : 'None found in your material'],
    ['Seller identity', risk(/placeholder/i) ? 'needs-data' : 'covered', risk(/placeholder/i) ? 'Contact details are template text' : 'Contact details look real'],
    ['Data consistency', risk(/do not add up/i) ? 'needs-data' : 'covered', risk(/do not add up/i) ? 'Area figures do not add up' : 'No conflicts found'],
    ['Price expectation', risk(/asking price/i) ? 'needs-data' : 'covered', risk(/asking price/i) ? 'No asking price' : 'Asking price given'],
  ];
  result.SCREEN = {
    title: `Screening checks: ${screenChecks.length} items`,
    items: screenChecks.map(([name, status, note], index) => ({
      number: index + 1,
      name,
      stage: 'SCREEN',
      status: ran('SCREEN') ? status : 'not-reached',
      note,
    })),
  };

  // The four workstream groups, shown on every stage that belongs to them.
  for (const [stage, groupId] of Object.entries(STAGE_GROUP) as [StageCode, WorkstreamGroupId][]) {
    const group = getWorkstreamGroup(groupId);
    const rules = GROUP_RULES[groupId];
    result[stage] = {
      title: `${group.label}: ${group.workstreams.length} workstreams`,
      items: group.workstreams.map((name, index) => {
        const rule = rules[index];
        const base = { number: index + 1, name, stage: rule.stage };
        if (!ran(rule.stage)) return { ...base, status: 'not-reached' as const, note: `Waiting for the ${pipelineStages.find((s) => s.code === rule.stage)?.agent}` };
        if (rule.tradeOnly && !input.isTradeAsset) return { ...base, status: 'not-applicable' as const, note: 'Applies to factories and traded goods' };
        const evidence = rule.evidence ? input.facts.find((line) => rule.evidence!.test(line)) : undefined;
        if (evidence) return { ...base, status: 'covered' as const, note: evidence.length > 90 ? `${evidence.slice(0, 87)}…` : evidence };
        if (rule.produced && !(rule.stage === 'VALUE' && index === 5 && !input.hasUnitMix)) {
          return { ...base, status: 'produced' as const, note: rule.produced };
        }
        return { ...base, status: 'needs-data' as const, note: `Needs: ${rule.needs}` };
      }),
    };
  }
  return result;
}
