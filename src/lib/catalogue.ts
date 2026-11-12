/**
 * The target catalogue. Names, descriptions, finding tips and filter advice
 * live here, not in components. Adding a target means adding one entry.
 *
 * RA is in hours and Dec in degrees (J2000). Planets have a `body` instead and
 * are positioned by astronomy-engine for each moment.
 */
export type TargetKind =
  | 'emission-nebula'
  | 'reflection-nebula'
  | 'planetary-nebula'
  | 'supernova-remnant'
  | 'galaxy'
  | 'open-cluster'
  | 'globular-cluster'
  | 'double-star'
  | 'planet'
  | 'moon'
  | 'sun'

export type Target = {
  id: string
  name: string
  /** Catalogue designation shown above the name, e.g. "M42". */
  designation?: string
  kind: TargetKind
  constellation: string
  ra?: number
  dec?: number
  body?: 'Jupiter' | 'Saturn' | 'Mars' | 'Venus' | 'Moon' | 'Sun'
  magnitude?: number
  /** Apparent size in arcminutes: [long axis, short axis]. */
  size?: [number, number]
  distance?: string
  /** Wikipedia article title, used for the summary and the link. */
  wiki: string
  /** Name Stellarium Web and AstroBin understand. */
  searchName: string
  description: string
  findingTip: string
  /** Extra imaging advice specific to this target. */
  imagingNote?: string
  /** Double stars only. */
  double?: { separation: number; magnitudes: [number, number]; colours?: string }
}

/** Kinds that glow in narrow emission lines, so light-pollution and narrowband filters help. */
export const NARROWBAND_KINDS: ReadonlySet<TargetKind> = new Set([
  'emission-nebula',
  'planetary-nebula',
  'supernova-remnant',
])

export const KIND_LABEL: Record<TargetKind, string> = {
  'emission-nebula': 'Emission nebula',
  'reflection-nebula': 'Reflection nebula',
  'planetary-nebula': 'Planetary nebula',
  'supernova-remnant': 'Supernova remnant',
  galaxy: 'Galaxy',
  'open-cluster': 'Open cluster',
  'globular-cluster': 'Globular cluster',
  'double-star': 'Double star',
  planet: 'Planet',
  moon: 'Earth’s moon',
  sun: 'Our star',
}

/** Targets in the daytime sky, scored on altitude and cloud while the Sun is up. */
export const isDaytime = (kind: TargetKind) => kind === 'sun'

const hms = (h: number, m: number, s = 0) => h + m / 60 + s / 3600
const dms = (d: number, m: number) => (d < 0 || Object.is(d, -0) ? -1 : 1) * (Math.abs(d) + m / 60)

export const CATALOGUE: Target[] = [
  {
    id: 'm42',
    name: 'Orion Nebula',
    designation: 'M42',
    kind: 'emission-nebula',
    constellation: 'Orion',
    ra: hms(5, 35, 17),
    dec: dms(-5, 23),
    magnitude: 4.0,
    size: [85, 60],
    distance: '1,340 light years',
    wiki: 'Orion Nebula',
    searchName: 'M42',
    description:
      'A huge cloud of glowing hydrogen where new stars are forming, lit by the young Trapezium stars at its heart. It is the closest large star-forming region to Earth.',
    findingTip:
      'Find the three stars of Orion’s Belt, then look just below them for the short line of stars that makes his Sword. The fuzzy middle “star” of the Sword is the nebula.',
    imagingNote:
      'The bright core burns out quickly, so keep subs short. A 2-panel mosaic also catches the Running Man Nebula just to the north.',
  },
  {
    id: 'm45',
    name: 'Pleiades',
    designation: 'M45',
    kind: 'open-cluster',
    constellation: 'Taurus',
    ra: hms(3, 47, 24),
    dec: dms(24, 7),
    magnitude: 1.6,
    size: [110, 110],
    distance: '444 light years',
    wiki: 'Pleiades',
    searchName: 'M45',
    description:
      'The Seven Sisters: a cluster of hot blue stars, wrapped in faint blue dust that reflects their light.',
    findingTip:
      'Follow Orion’s Belt up and to the right, past the orange star Aldebaran. The small, tight dipper of stars beyond it is the Pleiades.',
    imagingNote: 'Long total exposure brings out the blue reflection nebula around the stars.',
  },
  {
    id: 'm31',
    name: 'Andromeda Galaxy',
    designation: 'M31',
    kind: 'galaxy',
    constellation: 'Andromeda',
    ra: hms(0, 42, 44),
    dec: dms(41, 16),
    magnitude: 3.4,
    size: [178, 63],
    distance: '2.5 million light years',
    wiki: 'Andromeda Galaxy',
    searchName: 'M31',
    description:
      'The nearest large spiral galaxy to the Milky Way and the most distant thing you can see with the naked eye.',
    findingTip:
      'From the corner of the Great Square of Pegasus, hop two stars along the line of Andromeda, then turn north two more. The galaxy is a soft oval glow there.',
  },
  {
    id: 'double-cluster',
    name: 'Double Cluster',
    designation: 'NGC 869 / 884',
    kind: 'open-cluster',
    constellation: 'Perseus',
    ra: hms(2, 20, 0),
    dec: dms(57, 8),
    magnitude: 3.7,
    size: [60, 30],
    distance: '7,500 light years',
    wiki: 'Double Cluster',
    searchName: 'NGC 869',
    description: 'Two rich star clusters side by side, sprinkled with a few red supergiants.',
    findingTip:
      'Look between the W of Cassiopeia and the bright star Mirfak in Perseus. In binoculars it shows as two knots of stars.',
  },
  {
    id: 'm33',
    name: 'Triangulum Galaxy',
    designation: 'M33',
    kind: 'galaxy',
    constellation: 'Triangulum',
    ra: hms(1, 33, 51),
    dec: dms(30, 39),
    magnitude: 5.7,
    size: [70, 40],
    distance: '2.7 million light years',
    wiki: 'Triangulum Galaxy',
    searchName: 'M33',
    description: 'A face-on spiral galaxy, large but faint, with pink star-forming regions in its arms.',
    findingTip:
      'It sits on the opposite side of the star Mirach from the Andromeda Galaxy, about the same distance away. It needs a dark sky.',
  },
  {
    id: 'm1',
    name: 'Crab Nebula',
    designation: 'M1',
    kind: 'supernova-remnant',
    constellation: 'Taurus',
    ra: hms(5, 34, 32),
    dec: dms(22, 1),
    magnitude: 8.4,
    size: [7, 5],
    distance: '6,500 light years',
    wiki: 'Crab Nebula',
    searchName: 'M1',
    description:
      'The wreck of a star that exploded in 1054, seen and recorded by astronomers in China. A spinning pulsar sits at its centre.',
    findingTip: 'Start at Zeta Tauri, the tip of the bull’s southern horn. The nebula is about one degree to the north-west.',
  },
  {
    id: 'm27',
    name: 'Dumbbell Nebula',
    designation: 'M27',
    kind: 'planetary-nebula',
    constellation: 'Vulpecula',
    ra: hms(19, 59, 36),
    dec: dms(22, 43),
    magnitude: 7.5,
    size: [8, 5.6],
    distance: '1,360 light years',
    wiki: 'Dumbbell Nebula',
    searchName: 'M27',
    description: 'A bright planetary nebula: the shell of gas thrown off by a dying Sun-like star.',
    findingTip:
      'Find the little arrow of Sagitta, between Altair and Albireo. Follow the arrow’s tip north by about three degrees.',
  },
  {
    id: 'm57',
    name: 'Ring Nebula',
    designation: 'M57',
    kind: 'planetary-nebula',
    constellation: 'Lyra',
    ra: hms(18, 53, 35),
    dec: dms(33, 2),
    magnitude: 8.8,
    size: [1.4, 1],
    distance: '2,600 light years',
    wiki: 'Ring Nebula',
    searchName: 'M57',
    description: 'A small smoke ring of glowing gas around a dying star.',
    findingTip: 'It lies between Sheliak and Sulafat, the two stars at the bottom of Lyra’s parallelogram, south of Vega.',
    imagingNote: 'It is tiny, so a longer focal length gives a much better view than a wide-field scope.',
  },
  {
    id: 'm13',
    name: 'Hercules Cluster',
    designation: 'M13',
    kind: 'globular-cluster',
    constellation: 'Hercules',
    ra: hms(16, 41, 41),
    dec: dms(36, 28),
    magnitude: 5.8,
    size: [20, 20],
    distance: '22,200 light years',
    wiki: 'Messier 13',
    searchName: 'M13',
    description: 'A ball of several hundred thousand ancient stars, the finest globular cluster in northern skies.',
    findingTip:
      'Find the Keystone, the four-star box in Hercules. The cluster is two-thirds of the way up its western side.',
  },
  {
    id: 'm81',
    name: 'Bode’s Galaxy',
    designation: 'M81',
    kind: 'galaxy',
    constellation: 'Ursa Major',
    ra: hms(9, 55, 33),
    dec: dms(69, 4),
    magnitude: 6.9,
    size: [27, 14],
    distance: '12 million light years',
    wiki: 'Messier 81',
    searchName: 'M81',
    description: 'A bright spiral galaxy, paired in the same view with the cigar-shaped M82.',
    findingTip: 'Draw a line from Phecda through Dubhe in the Plough and carry on about the same distance again.',
  },
  {
    id: 'm51',
    name: 'Whirlpool Galaxy',
    designation: 'M51',
    kind: 'galaxy',
    constellation: 'Canes Venatici',
    ra: hms(13, 29, 53),
    dec: dms(47, 12),
    magnitude: 8.4,
    size: [11, 7],
    distance: 'about 30 million light years',
    wiki: 'Whirlpool Galaxy',
    searchName: 'M51',
    description: 'A face-on spiral galaxy pulling at a smaller companion galaxy at the end of one arm.',
    findingTip: 'Start at Alkaid, the end star of the Plough’s handle, and move about 3.5 degrees south-west.',
  },
  {
    id: 'ngc7000',
    name: 'North America Nebula',
    designation: 'NGC 7000',
    kind: 'emission-nebula',
    constellation: 'Cygnus',
    ra: hms(20, 59, 17),
    dec: dms(44, 31),
    magnitude: 4,
    size: [120, 100],
    distance: '2,200 light years',
    wiki: 'North America Nebula',
    searchName: 'NGC 7000',
    description: 'A large cloud of glowing hydrogen whose shape looks like the North American continent.',
    findingTip: 'It sits just east of Deneb, the bright star at the tail of Cygnus. It is too large and faint to see well by eye.',
    imagingNote: 'Bigger than most smart-scope fields, so try a mosaic or frame the “Gulf of Mexico” region.',
  },
  {
    id: 'm8',
    name: 'Lagoon Nebula',
    designation: 'M8',
    kind: 'emission-nebula',
    constellation: 'Sagittarius',
    ra: hms(18, 3, 37),
    dec: dms(-24, 23),
    magnitude: 6,
    size: [90, 40],
    distance: '4,100 light years',
    wiki: 'Lagoon Nebula',
    searchName: 'M8',
    description: 'A big star-forming cloud with a dark lane of dust across it, like a lagoon.',
    findingTip: 'Above the spout of the Sagittarius “teapot”. From the UK it stays low in the south.',
  },
  {
    id: 'albireo',
    name: 'Albireo',
    designation: 'Beta Cygni',
    kind: 'double-star',
    constellation: 'Cygnus',
    ra: hms(19, 30, 43),
    dec: dms(27, 58),
    magnitude: 3.1,
    distance: '430 light years',
    wiki: 'Albireo',
    searchName: 'Albireo',
    description: 'A favourite double star with a striking colour contrast: a golden star and a blue one.',
    findingTip: 'It is the star at the head of the Swan, at the foot of the Northern Cross.',
    double: { separation: 34.6, magnitudes: [3.1, 5.1], colours: 'Gold and blue' },
  },
  {
    id: 'mizar',
    name: 'Mizar and Alcor',
    designation: 'Zeta Ursae Majoris',
    kind: 'double-star',
    constellation: 'Ursa Major',
    ra: hms(13, 23, 56),
    dec: dms(54, 55),
    magnitude: 2.2,
    distance: '83 light years',
    wiki: 'Mizar and Alcor',
    searchName: 'Mizar',
    description: 'A naked-eye pair in the Plough’s handle. A telescope splits Mizar itself into two more stars.',
    findingTip: 'The middle star of the Plough’s handle. Alcor is the faint star right beside it.',
    double: { separation: 14.4, magnitudes: [2.2, 3.9], colours: 'Both white' },
  },
  {
    id: 'jupiter',
    name: 'Jupiter',
    kind: 'planet',
    constellation: '',
    body: 'Jupiter',
    wiki: 'Jupiter',
    searchName: 'Jupiter',
    description: 'The largest planet, with cloud belts, the Great Red Spot and four bright moons that change position nightly.',
    findingTip: 'The brightest star-like point in its part of the sky, with a steady, unflickering light.',
    imagingNote: 'Planets want short video frames and high magnification, not long deep-sky subs.',
  },
  {
    id: 'saturn',
    name: 'Saturn',
    kind: 'planet',
    constellation: '',
    body: 'Saturn',
    wiki: 'Saturn',
    searchName: 'Saturn',
    description: 'The ringed planet. Even a small telescope shows the rings and its largest moon, Titan.',
    findingTip: 'A steady yellowish point, brighter than the stars around it.',
    imagingNote: 'Planets want short video frames and high magnification, not long deep-sky subs.',
  },
  {
    id: 'moon',
    name: 'The Moon',
    kind: 'moon',
    constellation: '',
    body: 'Moon',
    size: [31, 31],
    distance: '384,400 km',
    wiki: 'Moon',
    searchName: 'Moon',
    description:
      'Our nearest neighbour, covered in craters, mountain ranges and dark lava plains. Its face changes every night as the phase moves on.',
    findingTip:
      'Easy to spot. Look along the terminator, the line between light and shadow, where low sunlight makes craters and mountains stand out.',
    imagingNote:
      'The Moon is bright, so short exposures are enough and there’s no need for long stacks. At the eyepiece, a Moon filter or polariser takes the glare off.',
  },
  {
    id: 'sun',
    name: 'The Sun',
    kind: 'sun',
    constellation: '',
    body: 'Sun',
    size: [32, 32],
    distance: '150 million km',
    wiki: 'Sun',
    searchName: 'Sun',
    description:
      'Our own star. Through a proper solar filter you can watch sunspots come and go, and follow them as the Sun rotates from day to day.',
    findingTip:
      'Never look through the scope or finder to aim it. Watch the scope’s shadow on the ground instead: when the shadow of the tube is smallest and roundest, it’s pointing at the Sun.',
  },
]

export function findTarget(id: string): Target | undefined {
  return CATALOGUE.find((t) => t.id === id)
}
