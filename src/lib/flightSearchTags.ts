// Catalog of search tags for the flights advanced search (`q` parameter).
// Mirrors the field registry in ninerlog-api internal/flightsearch/fields.go —
// keep the two in sync when flight fields change. Tag descriptions live in the
// flights i18n namespace under `searchTags.<name>`.

export type SearchTagType = 'text' | 'duration' | 'int' | 'number' | 'bool' | 'date' | 'clock';

export interface SearchTag {
  /** Canonical tag name (camelCase, as documented in the API). */
  name: string;
  aliases?: string[];
  type: SearchTagType;
  /** Example completion shown in the suggestion dropdown. */
  example: string;
}

export const SEARCH_TAGS: SearchTag[] = [
  { name: 'date', type: 'date', example: 'date:2026-05' },
  { name: 'aircraftReg', aliases: ['reg', 'registration', 'aircraft'], type: 'text', example: 'reg:D-EFGH' },
  { name: 'aircraftType', aliases: ['type', 'model'], type: 'text', example: 'type:C172' },
  { name: 'departureIcao', aliases: ['departure', 'from', 'dep'], type: 'text', example: 'from:EDDF' },
  { name: 'arrivalIcao', aliases: ['arrival', 'to', 'arr'], type: 'text', example: 'to:EDDH' },
  { name: 'route', type: 'text', example: 'route:EDFE' },
  { name: 'remarks', aliases: ['comments'], type: 'text', example: 'remarks:checkride' },
  { name: 'offBlockTime', aliases: ['offBlock'], type: 'clock', example: 'offBlock>06:00' },
  { name: 'onBlockTime', aliases: ['onBlock'], type: 'clock', example: 'onBlock<18:00' },
  { name: 'departureTime', aliases: ['takeoffTime'], type: 'clock', example: 'departureTime>06:00' },
  { name: 'arrivalTime', aliases: ['landingTime'], type: 'clock', example: 'arrivalTime<20:00' },
  { name: 'totalTime', aliases: ['total'], type: 'duration', example: 'totalTime>1:30' },
  { name: 'picTime', type: 'duration', example: 'picTime>0' },
  { name: 'dualTime', type: 'duration', example: 'dualTime>0' },
  { name: 'nightTime', aliases: ['night'], type: 'duration', example: 'night>0' },
  { name: 'ifrTime', aliases: ['ifr'], type: 'duration', example: 'ifr>0' },
  { name: 'soloTime', aliases: ['solo'], type: 'duration', example: 'solo>0' },
  { name: 'crossCountryTime', aliases: ['xc', 'crossCountry'], type: 'duration', example: 'xc>50' },
  { name: 'sicTime', type: 'duration', example: 'sicTime>0' },
  { name: 'dualGivenTime', aliases: ['dualGiven'], type: 'duration', example: 'dualGiven>0' },
  { name: 'simulatedFlightTime', aliases: ['simTime'], type: 'duration', example: 'simTime>0' },
  { name: 'groundTrainingTime', type: 'duration', example: 'groundTrainingTime>0' },
  { name: 'actualInstrumentTime', type: 'duration', example: 'actualInstrumentTime>0' },
  { name: 'simulatedInstrumentTime', aliases: ['hoodTime'], type: 'duration', example: 'hoodTime>0' },
  { name: 'multiPilotTime', type: 'duration', example: 'multiPilotTime>0' },
  { name: 'landings', type: 'int', example: 'landings>=3' },
  { name: 'landingsDay', type: 'int', example: 'landingsDay>0' },
  { name: 'landingsNight', type: 'int', example: 'landingsNight>0' },
  { name: 'takeoffsDay', type: 'int', example: 'takeoffsDay>0' },
  { name: 'takeoffsNight', type: 'int', example: 'takeoffsNight>0' },
  { name: 'holds', type: 'int', example: 'holds>0' },
  { name: 'approaches', type: 'int', example: 'approaches>0' },
  { name: 'approachType', type: 'text', example: 'approachType:ILS' },
  { name: 'distance', type: 'number', example: 'distance>100' },
  { name: 'isPic', type: 'bool', example: 'isPic:true' },
  { name: 'isDual', type: 'bool', example: 'isDual:true' },
  { name: 'isIpc', aliases: ['ipc'], type: 'bool', example: 'ipc:true' },
  { name: 'isFlightReview', aliases: ['flightReview', 'bfr'], type: 'bool', example: 'bfr:true' },
  { name: 'isProficiencyCheck', aliases: ['proficiencyCheck'], type: 'bool', example: 'proficiencyCheck:true' },
  { name: 'signed', type: 'bool', example: 'signed:true' },
  { name: 'instructorName', aliases: ['instructor'], type: 'text', example: 'instructor:Smith' },
  { name: 'instructorComments', type: 'text', example: 'instructorComments:solo' },
  { name: 'picName', type: 'text', example: 'picName:Smith' },
  { name: 'crew', type: 'text', example: 'crew:"John Doe"' },
  { name: 'fstdType', aliases: ['fstd'], type: 'text', example: 'fstd:FNPT' },
  { name: 'endorsements', type: 'text', example: 'endorsements:solo' },
  { name: 'launchMethod', aliases: ['launch'], type: 'text', example: 'launch:winch' },
  { name: 'createdAt', type: 'date', example: 'createdAt>2026-01-01' },
  { name: 'updatedAt', type: 'date', example: 'updatedAt>2026-01-01' },
];

/** Operators each tag type supports, for the help panel. */
export const OPERATORS_BY_TYPE: Record<SearchTagType, string> = {
  text: ':  =  !=',
  duration: ':  =  !=  >  >=  <  <=',
  int: ':  =  !=  >  >=  <  <=',
  number: ':  =  !=  >  >=  <  <=',
  bool: ':  =  !=',
  date: ':  =  !=  >  >=  <  <=',
  clock: ':  =  !=  >  >=  <  <=',
};

/**
 * Suggest tags matching a partly-typed word. Prefix matches on the canonical
 * name rank first, then prefix matches on an alias, then substring matches.
 */
export function suggestTags(word: string, limit = 8): SearchTag[] {
  const w = word.toLowerCase();
  if (!w) return [];
  const namePrefix: SearchTag[] = [];
  const aliasPrefix: SearchTag[] = [];
  const substring: SearchTag[] = [];
  for (const tag of SEARCH_TAGS) {
    const names = [tag.name, ...(tag.aliases ?? [])].map((n) => n.toLowerCase());
    if (names[0].startsWith(w)) {
      namePrefix.push(tag);
    } else if (names.some((n) => n.startsWith(w))) {
      aliasPrefix.push(tag);
    } else if (names.some((n) => n.includes(w))) {
      substring.push(tag);
    }
  }
  return [...namePrefix, ...aliasPrefix, ...substring].slice(0, limit);
}
