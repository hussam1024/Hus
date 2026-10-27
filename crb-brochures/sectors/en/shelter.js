// English text for the Shelter & Non-Food Items brochure (merged over ../shelter.js).
module.exports = {
  name: 'Shelter & Non-Food Items', file: 'CRB-Shelter-NFI-EN',
  en: 'المأوى والمواد غير الغذائية',
  cover: { h1: 'Shelter', h1Size: '32pt', h2: '&amp; Non-Food Items', h2Size: '19pt' },
  back: {
    text: 'We work within the humanitarian coordination system for shelter, in partnership with local, regional and international donors and organizations.',
    roles: [
      { title: 'Technical Working Group – Shelter Cluster', desc: 'Technical contribution to developing common tools' },
      { title: 'UN OCHA and the Humanitarian Clusters', desc: 'Active participation in clusters and technical committees' },
    ],
  },
  story: {
    headline: 'A Sustainable Home Restores Stability for Ali and His Family in Marib’s Camps',
    paras: [
      'In a displacement camp in Marib Governorate, Ali—a man with a mobility disability—lived with his family of six in a worn-out tent that offered barely any protection from the bitter winter cold or the intense summer heat.',
      'In response to his situation and similar cases, the Coalition of Relief and Building (CRB) provided a sustainable housing unit with two rooms, a bathroom and a kitchen, built of brick and reinforced concrete and adapted to the needs of persons with disabilities, funded by the World Assembly of Muslim Youth (WAMY).',
    ],
    quotes: [
      { text: 'I went through hard times. The bitter winter cold got into my bones, and before going to sleep I had to put on all my heavy clothes.', size: null },
      { text: 'My life changed completely after moving into this house. It feels like a dream I never want to wake up from. I no longer suffer from the cold or the intense heat, and today I feel safe and settled with my family.', size: null, cite: 'Ali, a beneficiary – Marib' },
    ],
  },
  overview: {
    title: 'Shelter &amp; Non-Food<br>Items (S/NFI)', kicker: 'A Decade of Emergency and Sustainable Shelter',
    intro: 'Over the past decade, the Coalition of Relief and Building (CRB) has provided shelter support to the most vulnerable groups affected by humanitarian crises, through emergency and sustainable shelter projects that protect families and strengthen their stability, with a focus on persons with special needs and fragile communities.',
    stats: [{ label: 'Permanent Housing Units' }, { label: 'Years of Giving' }],
    photo: { cap: 'Housing units for persons with special needs' },
  },
  programs: [{ name: 'Emergency Shelter' }, { name: 'Sustainable Shelter' }],
  middle: {
    blocks: [{
      title: 'Emergency Shelter Projects', sub: 'Urgent solutions that preserve protection and dignity',
      text: 'As part of its emergency humanitarian response, CRB carried out numerous interventions providing temporary solutions for vulnerable and displaced families, ensuring protection and dignity in times of crisis. These include distributing emergency shelter items and providing basic shelter tools in displacement sites and the hardest-hit areas.',
      items: [
        { name: 'Emergency shelter item distribution', note: 'Shelter kits for affected families' },
        { name: 'Establishing temporary camps' },
      ],
    }],
    grid: { items: [{ cap: 'Establishing emergency camps' }, { cap: 'Shelter kit distribution' }, { cap: 'Emergency shelter' }] },
  },
  left: {
    blocks: [{
      title: 'Sustainable Shelter Projects', sub: 'From relief to sustainable development',
      text: 'CRB implemented sustainable housing projects, including permanent housing units and fully serviced villages for the most vulnerable families and persons with special needs, to strengthen livelihood stability and economically empower breadwinners.',
      items: [
        { name: '79 housing units', note: 'For persons with special needs' },
        { name: 'Model residential villages', note: '254 housing units' },
      ],
    }],
    grid: { items: [{ cap: 'Aerial view of the housing complex' }, { cap: 'Residential villages' }, { cap: 'Homes for persons with special needs' }] },
    sdg: { text: 'Permanent housing that strengthens stability for the most vulnerable families.' },
  },
};
